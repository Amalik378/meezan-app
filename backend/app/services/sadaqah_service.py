import uuid
from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sadaqah import SadaqahRecord
from app.schemas.sadaqah import (
    MonthlyGivingSummary,
    SadaqahCreate,
    SadaqahResponse,
    SadaqahSummaryResponse,
    SadaqahUpdate,
)


class SadaqahService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def add(self, user_id: str, payload: SadaqahCreate) -> SadaqahResponse:
        record = SadaqahRecord(
            user_id=uuid.UUID(user_id),
            amount_gbp=payload.amount_gbp,
            charity_name=payload.charity_name,
            sadaqah_type=payload.sadaqah_type,
            donation_date=payload.donation_date,
            notes=payload.notes,
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return SadaqahResponse.model_validate(record)

    async def list_records(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> list[SadaqahResponse]:
        offset = (page - 1) * page_size
        result = await self.db.execute(
            select(SadaqahRecord)
            .where(SadaqahRecord.user_id == uuid.UUID(user_id))
            .order_by(SadaqahRecord.donation_date.desc())
            .limit(page_size)
            .offset(offset)
        )
        return [SadaqahResponse.model_validate(r) for r in result.scalars().all()]

    async def update(
        self, user_id: str, record_id: str, payload: SadaqahUpdate
    ) -> SadaqahResponse:
        record = await self._get_owned(user_id, record_id)

        if payload.amount_gbp is not None:
            record.amount_gbp = payload.amount_gbp
        if payload.charity_name is not None:
            record.charity_name = payload.charity_name
        if payload.sadaqah_type is not None:
            record.sadaqah_type = payload.sadaqah_type
        if payload.donation_date is not None:
            record.donation_date = payload.donation_date
        if payload.notes is not None:
            record.notes = payload.notes

        await self.db.commit()
        await self.db.refresh(record)
        return SadaqahResponse.model_validate(record)

    async def delete(self, user_id: str, record_id: str) -> None:
        record = await self._get_owned(user_id, record_id)
        await self.db.delete(record)
        await self.db.commit()

    async def get_summary(self, user_id: str) -> SadaqahSummaryResponse:
        uid = uuid.UUID(user_id)
        now = datetime.now(UTC)

        all_records_result = await self.db.execute(
            select(SadaqahRecord).where(SadaqahRecord.user_id == uid)
        )
        all_records = list(all_records_result.scalars().all())

        total_given = sum(float(r.amount_gbp) for r in all_records)
        total_count = len(all_records)

        this_year = sum(
            float(r.amount_gbp) for r in all_records if r.donation_date.year == now.year
        )
        this_month = sum(
            float(r.amount_gbp)
            for r in all_records
            if r.donation_date.year == now.year and r.donation_date.month == now.month
        )

        by_type: dict[str, float] = defaultdict(float)
        for r in all_records:
            by_type[r.sadaqah_type] += float(r.amount_gbp)

        # Monthly breakdown for the chart
        monthly: dict[str, dict] = defaultdict(lambda: {"total": 0.0, "count": 0})
        for r in all_records:
            key = r.donation_date.strftime("%Y-%m")
            monthly[key]["total"] += float(r.amount_gbp)
            monthly[key]["count"] += 1

        monthly_breakdown = [
            MonthlyGivingSummary(
                month=month,
                total_gbp=round(data["total"], 2),
                count=data["count"],
            )
            for month, data in sorted(monthly.items())
        ]

        return SadaqahSummaryResponse(
            total_given_gbp=round(total_given, 2),
            total_donations=total_count,
            this_year_gbp=round(this_year, 2),
            this_month_gbp=round(this_month, 2),
            by_type={k: round(v, 2) for k, v in by_type.items()},
            monthly_breakdown=monthly_breakdown,
        )

    async def _get_owned(self, user_id: str, record_id: str) -> SadaqahRecord:
        result = await self.db.execute(
            select(SadaqahRecord).where(
                SadaqahRecord.id == uuid.UUID(record_id),
                SadaqahRecord.user_id == uuid.UUID(user_id),
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise ValueError(f"Sadaqah record {record_id} not found.")
        return record
