import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ScreeningResult(Base):
    """
    Cached Shariah compliance result for a stock ticker.
    Refreshed weekly by the Celery worker.
    Not user-specific — shared cache across all users.
    """

    __tablename__ = "screening_results"

    ticker: Mapped[str] = mapped_column(String(12), primary_key=True)
    company_name: Mapped[str] = mapped_column(String(200))
    sector: Mapped[str | None] = mapped_column(String(100))
    exchange: Mapped[str | None] = mapped_column(String(20))

    # Screen results
    business_screen_pass: Mapped[bool] = mapped_column(Boolean)
    debt_ratio_pass: Mapped[bool] = mapped_column(Boolean)
    interest_income_pass: Mapped[bool] = mapped_column(Boolean)  # securities screen
    receivables_pass: Mapped[bool] = mapped_column(Boolean)      # revenue purity screen

    # Zoya-derived compliance score (0–100)
    compliance_score: Mapped[int] = mapped_column(Integer)

    # Financial ratios from Zoya (column names kept for backwards compat, semantics updated)
    debt_to_market_cap_ratio: Mapped[float | None] = mapped_column(
        Numeric(6, 4), name="debt_to_assets_ratio"
    )
    securities_to_market_cap_ratio: Mapped[float | None] = mapped_column(
        Numeric(6, 4), name="interest_to_revenue_ratio"
    )
    compliant_revenue_pct: Mapped[float | None] = mapped_column(
        Numeric(6, 4), name="receivables_to_assets_ratio"
    )

    # Human-readable reasons for failure
    fail_reasons: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class WatchlistItem(Base):
    """A stock that a user has saved to their watchlist."""

    __tablename__ = "watchlist_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    ticker: Mapped[str] = mapped_column(String(12))
    company_name: Mapped[str] = mapped_column(String(200))
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
