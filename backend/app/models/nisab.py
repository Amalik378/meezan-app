import uuid
from datetime import datetime

from sqlalchemy import DateTime, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NisabPrice(Base):
    """
    Daily cache of gold/silver spot prices and derived Nisab thresholds.
    Refreshed by the Celery worker every 24 hours.
    """

    __tablename__ = "nisab_prices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # GBP per troy ounce
    gold_price_per_gram_gbp: Mapped[float] = mapped_column(Numeric(10, 4))
    silver_price_per_gram_gbp: Mapped[float] = mapped_column(Numeric(10, 4))

    # Nisab thresholds (AAOIFI standard)
    # Gold Nisab  = 87.48g × gold price
    # Silver Nisab = 612.36g × silver price
    nisab_gold_gbp: Mapped[float] = mapped_column(Numeric(10, 2))
    nisab_silver_gbp: Mapped[float] = mapped_column(Numeric(10, 2))

    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
