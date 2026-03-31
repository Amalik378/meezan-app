"""
NisabService — fetches and caches gold/silver spot prices.

Nisab thresholds (AAOIFI standard):
  Gold:   87.48 grams
  Silver: 612.36 grams

GoldAPI.io returns prices in troy ounces. 1 troy oz = 31.1035 grams.
"""

import logging
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.nisab import NisabPrice
from app.schemas.nisab import NisabPriceResponse

logger = logging.getLogger(__name__)

settings = get_settings()

NISAB_GOLD_GRAMS = 87.48
NISAB_SILVER_GRAMS = 612.36
TROY_OZ_TO_GRAMS = 31.1035
CACHE_TTL_HOURS = 24


class NisabService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_current_nisab(self) -> NisabPriceResponse:
        """
        Returns the current Nisab prices.
        Serves from DB cache if the record is < 24 hours old,
        otherwise fetches fresh data from GoldAPI.io.
        """
        cached = await self._get_cached_price()
        if cached:
            return NisabPriceResponse.model_validate(cached)

        return await self._fetch_and_cache()

    async def _get_cached_price(self) -> NisabPrice | None:
        cutoff = datetime.now(UTC) - timedelta(hours=CACHE_TTL_HOURS)
        result = await self.db.execute(
            select(NisabPrice)
            .where(NisabPrice.fetched_at >= cutoff)
            .order_by(NisabPrice.fetched_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def _fetch_and_cache(self) -> NisabPriceResponse:
        gold_gbp, silver_gbp = await self._fetch_prices()

        gold_gram_gbp = gold_gbp / TROY_OZ_TO_GRAMS
        silver_gram_gbp = silver_gbp / TROY_OZ_TO_GRAMS

        record = NisabPrice(
            gold_price_per_gram_gbp=round(gold_gram_gbp, 4),
            silver_price_per_gram_gbp=round(silver_gram_gbp, 4),
            nisab_gold_gbp=round(gold_gram_gbp * NISAB_GOLD_GRAMS, 2),
            nisab_silver_gbp=round(silver_gram_gbp * NISAB_SILVER_GRAMS, 2),
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)

        logger.info(
            "Nisab prices refreshed: gold=£%.2f silver=£%.2f",
            record.nisab_gold_gbp,
            record.nisab_silver_gbp,
        )
        return NisabPriceResponse.model_validate(record)

    async def _fetch_prices(self) -> tuple[float, float]:
        """
        Fetch GBP prices per troy ounce for gold and silver from GoldAPI.io.
        Falls back to reasonable defaults if the API key is not configured.
        """
        if not settings.gold_api_key:
            logger.warning("GOLD_API_KEY not set — using fallback prices.")
            return self._fallback_prices()

        headers = {"x-access-token": settings.gold_api_key, "Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=10) as client:
            gold_resp = await client.get(
                "https://www.goldapi.io/api/XAU/GBP", headers=headers
            )
            gold_resp.raise_for_status()
            gold_data = gold_resp.json()

            silver_resp = await client.get(
                "https://www.goldapi.io/api/XAG/GBP", headers=headers
            )
            silver_resp.raise_for_status()
            silver_data = silver_resp.json()

        return float(gold_data["price"]), float(silver_data["price"])

    @staticmethod
    def _fallback_prices() -> tuple[float, float]:
        """
        Approximate GBP prices per troy ounce (Feb 2026).
        Only used when GOLD_API_KEY is absent — never shown to users as "live".
        """
        return 2100.0, 24.0
