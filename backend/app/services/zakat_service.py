"""
ZakatService — core Zakat calculation engine.

Islamic rules implemented:
  - Zakat rate: 2.5% (rub' al-'ushr)
  - Nisab: minimum threshold before Zakat is due
      Gold:   87.48g  (approx. 3 troy oz)
      Silver: 612.36g (approx. 19.7 troy oz)
  - Hawl: assets must be held for one complete lunar year (≈354.37 days)
  - Zakatable assets: cash, gold, silver, stocks (market value),
      business inventory, money owed to you (receivables)
  - Non-zakatable: primary residence, personal-use property,
      personal vehicles, household items
  - Deductions: debts due within the current lunar year are subtracted

Madhab differences handled:
  - Hanafi: uses silver Nisab by default (lower threshold → more Muslims pay)
  - Shafi/Maliki/Hanbali: gold Nisab is typically recommended
"""

import logging
import uuid
from collections import defaultdict
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import UserProfile
from app.models.zakat import ZakatAsset, ZakatRecord
from app.schemas.zakat import (
    AssetBreakdownItem,
    ZakatAssetCreate,
    ZakatAssetResponse,
    ZakatAssetUpdate,
    ZakatCalculationResponse,
    ZakatRecordResponse,
)
from app.services.nisab_service import NisabService

logger = logging.getLogger(__name__)

ZAKAT_RATE = 0.025
HAWL_DAYS = 354.37  # One lunar year in solar days

# Assets subject to Zakat at the standard 2.5% rate
ZAKATABLE_TYPES = {
    "cash",
    "gold",
    "silver",
    "stocks",
    "business_inventory",
    "receivables",
}

# Debts due within the Hawl are deducted from the zakatable total
DEDUCTIBLE_TYPES = {"debts"}


def _hawl_complete(hawl_start_date: date, as_of: date) -> bool:
    """Returns True if the asset has been held for at least one lunar year."""
    delta = (as_of - hawl_start_date).days
    return delta >= HAWL_DAYS


def _get_hijri_year() -> str:
    """
    Approximate current Hijri year.
    Formula: Hijri year ≈ (Gregorian year − 622) × (33/32)
    """
    gregorian_year = datetime.now(UTC).year
    hijri_year = round((gregorian_year - 622) * (33 / 32))
    return f"{hijri_year} AH"


class ZakatService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _ensure_profile(self, user_id: str) -> None:
        """Create user_profiles row if it doesn't exist. Idempotent."""
        stmt = (
            pg_insert(UserProfile)
            .values(id=uuid.UUID(user_id), madhab="hanafi", nisab_type="silver")
            .on_conflict_do_nothing(index_elements=["id"])
        )
        await self.db.execute(stmt)
        await self.db.flush()

    # ── Asset CRUD ─────────────────────────────────────────────────────────────

    async def add_asset(
        self, user_id: str, payload: ZakatAssetCreate
    ) -> ZakatAssetResponse:
        await self._ensure_profile(user_id)
        asset = ZakatAsset(
            user_id=uuid.UUID(user_id),
            asset_type=payload.asset_type,
            description=payload.description,
            value_gbp=payload.value_gbp,
            hawl_start_date=payload.hawl_start_date,
        )
        self.db.add(asset)
        await self.db.commit()
        await self.db.refresh(asset)
        return ZakatAssetResponse.model_validate(asset)

    async def get_assets(self, user_id: str) -> list[ZakatAssetResponse]:
        result = await self.db.execute(
            select(ZakatAsset)
            .where(
                ZakatAsset.user_id == uuid.UUID(user_id),
                ZakatAsset.is_active.is_(True),
            )
            .order_by(ZakatAsset.asset_type, ZakatAsset.created_at)
        )
        assets = result.scalars().all()
        return [ZakatAssetResponse.model_validate(a) for a in assets]

    async def update_asset(
        self, user_id: str, asset_id: str, payload: ZakatAssetUpdate
    ) -> ZakatAssetResponse:
        asset = await self._get_owned_asset(user_id, asset_id)

        if payload.description is not None:
            asset.description = payload.description
        if payload.value_gbp is not None:
            asset.value_gbp = payload.value_gbp
        if payload.hawl_start_date is not None:
            asset.hawl_start_date = payload.hawl_start_date

        await self.db.commit()
        await self.db.refresh(asset)
        return ZakatAssetResponse.model_validate(asset)

    async def delete_asset(self, user_id: str, asset_id: str) -> None:
        asset = await self._get_owned_asset(user_id, asset_id)
        asset.is_active = False
        await self.db.commit()

    # ── Zakat Calculation ──────────────────────────────────────────────────────

    async def calculate(
        self, user_id: str, nisab_type: str = "silver"
    ) -> ZakatCalculationResponse:
        """
        Preview the Zakat calculation for the user's current assets.
        Does NOT persist a record — use finalise() for that.
        """
        await self._ensure_profile(user_id)
        assets = await self._get_active_assets(user_id)
        nisab = await NisabService(self.db).get_current_nisab()

        nisab_value = (
            nisab.nisab_silver_gbp if nisab_type == "silver" else nisab.nisab_gold_gbp
        )

        today = date.today()
        total_zakatable = 0.0
        total_deductions = 0.0
        assets_below_hawl: list[str] = []
        type_totals: dict[str, dict] = defaultdict(
            lambda: {"value": 0.0, "count": 0, "zakatable": False}
        )

        for asset in assets:
            is_zakatable_type = asset.asset_type in ZAKATABLE_TYPES
            is_deductible_type = asset.asset_type in DEDUCTIBLE_TYPES
            hawl_done = _hawl_complete(asset.hawl_start_date, today)

            asset_value = float(asset.value_gbp)
            type_totals[asset.asset_type]["zakatable"] = is_zakatable_type
            type_totals[asset.asset_type]["count"] += 1
            type_totals[asset.asset_type]["value"] += asset_value

            if is_zakatable_type and hawl_done:
                total_zakatable += asset_value
            elif is_zakatable_type and not hawl_done:
                assets_below_hawl.append(str(asset.id))
            elif is_deductible_type:
                # Debts due within the Hawl reduce zakatable wealth
                total_deductions += asset_value

        net_zakatable = max(0.0, total_zakatable - total_deductions)
        meets_nisab = net_zakatable >= nisab_value
        zakat_due = round(net_zakatable * ZAKAT_RATE, 2) if meets_nisab else 0.0

        breakdown = [
            AssetBreakdownItem(
                asset_type=k,
                total_value_gbp=round(v["value"], 2),
                is_zakatable=v["zakatable"],
                count=v["count"],
            )
            for k, v in type_totals.items()
        ]

        return ZakatCalculationResponse(
            total_assets_gbp=round(total_zakatable, 2),
            total_deductions_gbp=round(total_deductions, 2),
            net_zakatable_gbp=round(net_zakatable, 2),
            nisab_value_gbp=round(nisab_value, 2),
            nisab_type=nisab_type,
            meets_nisab=meets_nisab,
            zakat_due_gbp=zakat_due,
            assets_below_hawl=assets_below_hawl,
            breakdown=breakdown,
        )

    async def finalise(
        self, user_id: str, nisab_type: str = "silver"
    ) -> ZakatRecordResponse:
        """
        Run the calculation and persist an immutable ZakatRecord.
        This is the user's official annual Zakat record.
        """
        calc = await self.calculate(user_id, nisab_type)

        record = ZakatRecord(
            user_id=uuid.UUID(user_id),
            calculation_date=date.today(),
            hijri_year=_get_hijri_year(),
            total_assets_gbp=calc.total_assets_gbp,
            total_deductions_gbp=calc.total_deductions_gbp,
            net_zakatable_gbp=calc.net_zakatable_gbp,
            nisab_value_gbp=calc.nisab_value_gbp,
            nisab_type_used=calc.nisab_type,
            zakat_due_gbp=calc.zakat_due_gbp,
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)

        logger.info(
            "Zakat record created for user %s: £%.2f due",
            user_id,
            record.zakat_due_gbp,
        )
        return ZakatRecordResponse.model_validate(record)

    async def get_records(self, user_id: str) -> list[ZakatRecordResponse]:
        result = await self.db.execute(
            select(ZakatRecord)
            .where(ZakatRecord.user_id == uuid.UUID(user_id))
            .order_by(ZakatRecord.calculation_date.desc())
        )
        records = result.scalars().all()
        return [ZakatRecordResponse.model_validate(r) for r in records]

    async def get_record_by_id(self, user_id: str, record_id: str) -> ZakatRecordResponse:
        from fastapi import HTTPException
        result = await self.db.execute(
            select(ZakatRecord)
            .where(
                ZakatRecord.id == uuid.UUID(record_id),
                ZakatRecord.user_id == uuid.UUID(user_id),
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise HTTPException(status_code=404, detail="Record not found")
        return ZakatRecordResponse.model_validate(record)

    # ── Helpers ────────────────────────────────────────────────────────────────

    async def _get_active_assets(self, user_id: str) -> list[ZakatAsset]:
        result = await self.db.execute(
            select(ZakatAsset).where(
                ZakatAsset.user_id == uuid.UUID(user_id),
                ZakatAsset.is_active.is_(True),
            )
        )
        return list(result.scalars().all())

    async def _get_owned_asset(self, user_id: str, asset_id: str) -> ZakatAsset:
        result = await self.db.execute(
            select(ZakatAsset).where(
                ZakatAsset.id == uuid.UUID(asset_id),
                ZakatAsset.user_id == uuid.UUID(user_id),
                ZakatAsset.is_active.is_(True),
            )
        )
        asset = result.scalar_one_or_none()
        if asset is None:
            raise ValueError(f"Asset {asset_id} not found.")
        return asset
