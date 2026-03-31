import uuid
from datetime import UTC, date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ZakatAsset(Base):
    """
    Represents a single zakatable asset owned by a user.
    Assets are snapshotted at Zakat calculation time into ZakatRecord.
    """

    __tablename__ = "zakat_assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    asset_type: Mapped[str] = mapped_column(
        String(30),
        comment=(
            "cash | gold | silver | stocks | business_inventory "
            "| receivables | property"
        ),
    )
    description: Mapped[str] = mapped_column(String(200))
    # Stored in GBP for consistency; conversion done at input time
    value_gbp: Mapped[float] = mapped_column(Numeric(14, 2))
    # Date the user acquired / first held this asset (Hawl start)
    hawl_start_date: Mapped[date] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(UTC),
    )


class ZakatRecord(Base):
    """
    Immutable snapshot of a completed Zakat calculation.
    Created when the user finalises their annual Zakat.
    """

    __tablename__ = "zakat_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    calculation_date: Mapped[date] = mapped_column(Date)
    hijri_year: Mapped[str | None] = mapped_column(
        String(10), comment="e.g. 1447 AH"
    )
    total_assets_gbp: Mapped[float] = mapped_column(Numeric(14, 2))
    total_deductions_gbp: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    net_zakatable_gbp: Mapped[float] = mapped_column(Numeric(14, 2))
    nisab_value_gbp: Mapped[float] = mapped_column(Numeric(14, 2))
    nisab_type_used: Mapped[str] = mapped_column(String(10))
    zakat_due_gbp: Mapped[float] = mapped_column(Numeric(14, 2))
    # Asset breakdown stored as JSON for the PDF report
    asset_breakdown: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), comment="Serialised asset snapshot for the report"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
