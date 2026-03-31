import uuid
from datetime import UTC, date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SadaqahRecord(Base):
    """A single charitable donation logged by the user."""

    __tablename__ = "sadaqah_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    amount_gbp: Mapped[float] = mapped_column(Numeric(10, 2))
    charity_name: Mapped[str] = mapped_column(String(150))
    sadaqah_type: Mapped[str] = mapped_column(
        String(30),
        comment="sadaqah | lillah | fidya | kaffarah | aqiqah | zakat_ul_fitr",
    )
    donation_date: Mapped[date] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(UTC),
    )
