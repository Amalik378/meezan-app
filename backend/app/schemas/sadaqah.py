import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

SadaqahType = Literal[
    "sadaqah",
    "lillah",
    "fidya",
    "kaffarah",
    "aqiqah",
    "zakat_ul_fitr",
]


class SadaqahCreate(BaseModel):
    amount_gbp: float = Field(..., gt=0)
    charity_name: str = Field(..., min_length=1, max_length=150)
    sadaqah_type: SadaqahType = "sadaqah"
    donation_date: date
    notes: str | None = Field(None, max_length=500)

    @field_validator("amount_gbp")
    @classmethod
    def round_to_pence(cls, v: float) -> float:
        return round(v, 2)


class SadaqahUpdate(BaseModel):
    amount_gbp: float | None = Field(None, gt=0)
    charity_name: str | None = Field(None, min_length=1, max_length=150)
    sadaqah_type: SadaqahType | None = None
    donation_date: date | None = None
    notes: str | None = None


class SadaqahResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount_gbp: float
    charity_name: str
    sadaqah_type: str
    donation_date: date
    notes: str | None
    created_at: datetime


class MonthlyGivingSummary(BaseModel):
    month: str  # e.g. "2025-03"
    total_gbp: float
    count: int


class SadaqahSummaryResponse(BaseModel):
    """Aggregate giving statistics for the dashboard."""

    total_given_gbp: float
    total_donations: int
    this_year_gbp: float
    this_month_gbp: float
    by_type: dict[str, float]
    monthly_breakdown: list[MonthlyGivingSummary]
