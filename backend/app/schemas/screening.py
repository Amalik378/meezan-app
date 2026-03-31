import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ScreeningResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticker: str
    company_name: str
    sector: str | None
    exchange: str | None
    compliance_score: int = Field(..., ge=0, le=100)
    business_screen_pass: bool
    debt_ratio_pass: bool
    interest_income_pass: bool   # securities-to-market-cap screen
    receivables_pass: bool       # revenue purity screen
    debt_to_market_cap_ratio: float | None
    securities_to_market_cap_ratio: float | None
    compliant_revenue_pct: float | None
    fail_reasons: list[str]
    last_updated: datetime

    @property
    def is_compliant(self) -> bool:
        return (
            self.business_screen_pass
            and self.debt_ratio_pass
            and self.interest_income_pass
            and self.receivables_pass
        )


class WatchlistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticker: str
    company_name: str
    added_at: datetime
    # Joined from screening_results — may be None if not yet screened
    screening: ScreeningResultResponse | None = None


class WatchlistAddRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=12)
