import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

AssetType = Literal[
    "cash",
    "gold",
    "silver",
    "stocks",
    "business_inventory",
    "receivables",
    "property",
    "debts",
]


class ZakatAssetCreate(BaseModel):
    asset_type: AssetType
    description: str = Field(..., min_length=1, max_length=200)
    value_gbp: float = Field(..., gt=0, description="Value in GBP")
    hawl_start_date: date = Field(
        ...,
        description="Date you acquired or first held this asset (Hawl start date)",
    )

    @field_validator("value_gbp")
    @classmethod
    def round_to_pence(cls, v: float) -> float:
        return round(v, 2)


class ZakatAssetUpdate(BaseModel):
    description: str | None = Field(None, min_length=1, max_length=200)
    value_gbp: float | None = Field(None, gt=0)
    hawl_start_date: date | None = None

    @field_validator("value_gbp")
    @classmethod
    def round_to_pence(cls, v: float | None) -> float | None:
        return round(v, 2) if v is not None else None


class ZakatAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_type: str
    description: str
    value_gbp: float
    hawl_start_date: date
    is_active: bool
    created_at: datetime


class AssetBreakdownItem(BaseModel):
    """Summary of a single asset type in a Zakat calculation."""

    asset_type: str
    total_value_gbp: float
    is_zakatable: bool
    count: int


class ZakatCalculationResponse(BaseModel):
    """
    Result of a Zakat calculation preview — does not save a record.
    Call POST /zakat/records to finalise and persist.
    """

    total_assets_gbp: float
    total_deductions_gbp: float
    net_zakatable_gbp: float
    nisab_value_gbp: float
    nisab_type: str
    meets_nisab: bool
    zakat_due_gbp: float
    zakat_rate: float = 0.025
    assets_below_hawl: list[str] = Field(
        default_factory=list,
        description="Asset IDs excluded because they haven't completed one Hawl",
    )
    breakdown: list[AssetBreakdownItem]


class ZakatRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    calculation_date: date
    hijri_year: str | None
    total_assets_gbp: float
    total_deductions_gbp: float
    net_zakatable_gbp: float
    nisab_value_gbp: float
    nisab_type_used: str
    zakat_due_gbp: float
    created_at: datetime
