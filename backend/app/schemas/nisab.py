from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NisabPriceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    gold_price_per_gram_gbp: float
    silver_price_per_gram_gbp: float
    nisab_gold_gbp: float
    nisab_silver_gbp: float
    fetched_at: datetime
