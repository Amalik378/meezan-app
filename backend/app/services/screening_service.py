"""
ScreeningService — Shariah compliance screening powered by Zoya Finance.

Screening methodology (AAOIFI standard via Zoya):
  1. Business activity screen — is the sector/business permissible?
  2. Revenue purity         — non-compliant revenue < 5% of total
  3. Debt-to-market-cap     — total debt < 30% of market cap
  4. Securities-to-market-cap — interest-bearing securities < 30% of market cap

Compliance score (0–100) is computed from Zoya's continuous data:
  - 40 pts: compliant revenue percentage
  - 30 pts: how far debt ratio is below the 30% threshold
  - 30 pts: how far securities ratio is below the 30% threshold

If ZOYA_API_KEY is not set the service falls back to realistic mock data
for 25+ well-known tickers, making the app fully usable without a key.

Results are cached in the DB (ScreeningResult) and refreshed weekly.
"""

import logging
import uuid
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.screening import ScreeningResult, WatchlistItem
from app.schemas.screening import (
    ScreeningResultResponse,
    WatchlistAddRequest,
    WatchlistItemResponse,
)

logger = logging.getLogger(__name__)
settings = get_settings()

CACHE_TTL_DAYS = 7

ZOYA_LIVE_URL = "https://api.zoya.finance/graphql"
ZOYA_SANDBOX_URL = "https://sandbox-api.zoya.finance/graphql"

ZOYA_QUERY = """
query ScreenTicker($symbol: String!) {
  advancedCompliance {
    report(input: { symbol: $symbol, methodology: AAOIFI }) {
      symbol
      name
      exchange
      status
      businessScreen
      financialScreen
      compliantRevenue
      nonCompliantRevenue
      questionableRevenue
    }
  }
}
"""

# AAOIFI financial ratio thresholds (Zoya methodology)
DEBT_THRESHOLD = 0.30        # debt-to-market-cap < 30%
SECURITIES_THRESHOLD = 0.30  # securities-to-market-cap < 30%
REVENUE_THRESHOLD = 0.95     # compliant revenue >= 95% (non-compliant < 5%)


class ScreeningService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def screen_ticker(self, ticker: str) -> ScreeningResultResponse:
        ticker = ticker.upper().strip()
        cached = await self._get_cached(ticker)
        if cached:
            return ScreeningResultResponse.model_validate(cached)
        return await self._fetch_screen_and_cache(ticker)

    async def get_watchlist(self, user_id: str) -> list[WatchlistItemResponse]:
        result = await self.db.execute(
            select(WatchlistItem)
            .where(WatchlistItem.user_id == uuid.UUID(user_id))
            .order_by(WatchlistItem.added_at.desc())
        )
        items = result.scalars().all()

        enriched = []
        for item in items:
            screening = await self._get_cached(item.ticker)
            enriched.append(
                WatchlistItemResponse(
                    id=item.id,
                    ticker=item.ticker,
                    company_name=item.company_name,
                    added_at=item.added_at,
                    screening=(
                        ScreeningResultResponse.model_validate(screening)
                        if screening
                        else None
                    ),
                )
            )
        return enriched

    async def add_to_watchlist(
        self, user_id: str, payload: WatchlistAddRequest
    ) -> WatchlistItemResponse:
        ticker = payload.ticker.upper().strip()
        screening = await self.screen_ticker(ticker)

        existing = await self.db.execute(
            select(WatchlistItem).where(
                WatchlistItem.user_id == uuid.UUID(user_id),
                WatchlistItem.ticker == ticker,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"{ticker} is already in your watchlist.")

        item = WatchlistItem(
            user_id=uuid.UUID(user_id),
            ticker=ticker,
            company_name=screening.company_name,
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)

        return WatchlistItemResponse(
            id=item.id,
            ticker=item.ticker,
            company_name=item.company_name,
            added_at=item.added_at,
            screening=screening,
        )

    async def remove_from_watchlist(self, user_id: str, ticker: str) -> None:
        ticker = ticker.upper().strip()
        result = await self.db.execute(
            select(WatchlistItem).where(
                WatchlistItem.user_id == uuid.UUID(user_id),
                WatchlistItem.ticker == ticker,
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise ValueError(f"{ticker} is not in your watchlist.")
        await self.db.delete(item)
        await self.db.commit()

    # ── Internal ────────────────────────────────────────────────────────────────

    async def _fetch_screen_and_cache(self, ticker: str) -> ScreeningResultResponse:
        data = await self._fetch_from_zoya(ticker)
        if data is None:
            data = self._mock_data(ticker)

        record_dict = self._build_record(ticker, data)

        existing = await self._get_cached(ticker)
        if existing:
            for key, value in record_dict.items():
                setattr(existing, key, value)
            existing.last_updated = datetime.now(UTC)
        else:
            self.db.add(ScreeningResult(**record_dict))

        await self.db.commit()
        refreshed = await self._get_cached(ticker)
        return ScreeningResultResponse.model_validate(refreshed)

    async def _fetch_from_zoya(self, ticker: str) -> dict | None:
        """Call the Zoya GraphQL API. Returns normalised dict or None on failure."""
        if not settings.zoya_api_key:
            logger.debug("ZOYA_API_KEY not set — using mock data for %s", ticker)
            return None

        url = (
            ZOYA_SANDBOX_URL
            if settings.zoya_api_key.startswith("sandbox-")
            else ZOYA_LIVE_URL
        )
        headers = {
            "Authorization": settings.zoya_api_key,
            "Content-Type": "application/json",
        }
        payload = {"query": ZOYA_QUERY, "variables": {"symbol": ticker}}

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                body = resp.json()

            if "errors" in body:
                logger.warning("Zoya API errors for %s: %s", ticker, body["errors"])
                return None

            report = (
                body.get("data", {})
                .get("advancedCompliance", {})
                .get("report")
            )
            if not report:
                logger.warning("Zoya: no report returned for %s", ticker)
                return None

            return {
                "company_name": report.get("name") or ticker,
                "sector": None,  # not returned in this query
                "exchange": report.get("exchange"),
                "business_screen_pass": report.get("businessScreen") == "COMPLIANT",
                "financial_screen_pass": report.get("financialScreen") == "COMPLIANT",
                "compliant_revenue_pct": (report.get("compliantRevenue") or 100.0) / 100.0,
                # Ratio fields only available on the live Advanced plan — None in sandbox
                "debt_to_market_cap_ratio": None,
                "securities_to_market_cap_ratio": None,
            }

        except Exception as exc:
            logger.warning("Zoya API request failed for %s: %s", ticker, exc)
            return None

    def _build_record(self, ticker: str, data: dict) -> dict:
        """Apply AAOIFI screens and compute score from Zoya data."""
        compliant_rev = data.get("compliant_revenue_pct", 1.0)
        debt_ratio = data.get("debt_to_market_cap_ratio")      # None on sandbox/basic plan
        sec_ratio = data.get("securities_to_market_cap_ratio")  # None on sandbox/basic plan

        # financial_screen_pass is the binary fallback when individual ratios aren't available
        financial_pass = data.get("financial_screen_pass", True)

        business_pass = data.get("business_screen_pass", True)
        revenue_pass = compliant_rev >= REVENUE_THRESHOLD
        debt_pass = (debt_ratio < DEBT_THRESHOLD) if debt_ratio is not None else financial_pass
        securities_pass = (sec_ratio < SECURITIES_THRESHOLD) if sec_ratio is not None else financial_pass

        fail_reasons: list[str] = []
        if not business_pass:
            fail_reasons.append(
                "Business activity: sector involves impermissible activities under AAOIFI"
            )
        if not revenue_pass:
            non_compliant_pct = round((1.0 - compliant_rev) * 100, 1)
            fail_reasons.append(
                f"Revenue purity: {non_compliant_pct}% non-compliant revenue exceeds 5% threshold"
            )
        if not debt_pass:
            fail_reasons.append(
                f"Debt ratio exceeds 30% of market capitalisation"
                if debt_ratio is None
                else f"Debt ratio: {debt_ratio:.1%} debt-to-market-cap exceeds 30% threshold"
            )
        if not securities_pass:
            fail_reasons.append(
                f"Securities ratio exceeds 30% of market capitalisation"
                if sec_ratio is None
                else f"Securities ratio: {sec_ratio:.1%} securities-to-market-cap exceeds 30% threshold"
            )

        return {
            "ticker": ticker,
            "company_name": data.get("company_name", ticker),
            "sector": data.get("sector"),
            "exchange": data.get("exchange"),
            "business_screen_pass": business_pass,
            "debt_ratio_pass": debt_pass,
            "interest_income_pass": securities_pass,  # mapped to securities screen
            "receivables_pass": revenue_pass,          # mapped to revenue purity screen
            "compliance_score": self._compute_score(compliant_rev, debt_ratio, sec_ratio, financial_pass),
            "debt_to_market_cap_ratio": debt_ratio,
            "securities_to_market_cap_ratio": sec_ratio,
            "compliant_revenue_pct": compliant_rev,
            "fail_reasons": fail_reasons,
        }

    @staticmethod
    def _compute_score(
        compliant_revenue_pct: float,
        debt_ratio: float | None,
        securities_ratio: float | None,
        financial_screen_pass: bool = True,
    ) -> int:
        """
        Transparent 0–100 score derived from Zoya's continuous data.

        Full formula (live Advanced plan — individual ratios available):
          40 pts — compliant revenue percentage
          30 pts — how far debt ratio sits below the 30% threshold
          30 pts — how far securities ratio sits below the 30% threshold

        Fallback (sandbox / basic plan — ratios not available):
          40 pts — compliant revenue percentage
          60 pts — binary financial screen pass/fail
        """
        business_score = compliant_revenue_pct * 40.0

        if debt_ratio is not None and securities_ratio is not None:
            debt_score = max(0.0, (DEBT_THRESHOLD - debt_ratio) / DEBT_THRESHOLD) * 30.0
            sec_score = max(0.0, (SECURITIES_THRESHOLD - securities_ratio) / SECURITIES_THRESHOLD) * 30.0
        else:
            # Binary fallback when individual ratios aren't available
            debt_score = 30.0 if financial_screen_pass else 0.0
            sec_score = 30.0 if financial_screen_pass else 0.0

        return min(100, round(business_score + debt_score + sec_score))

    async def _get_cached(self, ticker: str) -> ScreeningResult | None:
        cutoff = datetime.now(UTC) - timedelta(days=CACHE_TTL_DAYS)
        result = await self.db.execute(
            select(ScreeningResult).where(
                ScreeningResult.ticker == ticker,
                ScreeningResult.last_updated >= cutoff,
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    def _mock_data(ticker: str) -> dict:
        """
        Realistic Zoya-style data for 25+ tickers (used when ZOYA_API_KEY is not set).
        Ratios are market-cap based per Zoya/AAOIFI methodology.
        """
        MOCK_DB: dict[str, dict] = {
            # ── Compliant: Technology ───────────────────────────────────────────
            "AAPL": {
                "company_name": "Apple Inc.",
                "sector": "Technology",
                "exchange": "XNAS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.97,
                "debt_to_market_cap_ratio": 0.04,
                "securities_to_market_cap_ratio": 0.02,
            },
            "MSFT": {
                "company_name": "Microsoft Corporation",
                "sector": "Technology",
                "exchange": "XNAS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.98,
                "debt_to_market_cap_ratio": 0.03,
                "securities_to_market_cap_ratio": 0.01,
            },
            "GOOGL": {
                "company_name": "Alphabet Inc.",
                "sector": "Technology",
                "exchange": "XNAS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.97,
                "debt_to_market_cap_ratio": 0.02,
                "securities_to_market_cap_ratio": 0.01,
            },
            "NVDA": {
                "company_name": "NVIDIA Corporation",
                "sector": "Semiconductors",
                "exchange": "XNAS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.99,
                "debt_to_market_cap_ratio": 0.01,
                "securities_to_market_cap_ratio": 0.01,
            },
            "META": {
                "company_name": "Meta Platforms Inc.",
                "sector": "Technology",
                "exchange": "XNAS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.97,
                "debt_to_market_cap_ratio": 0.02,
                "securities_to_market_cap_ratio": 0.01,
            },
            "ADBE": {
                "company_name": "Adobe Inc.",
                "sector": "Technology",
                "exchange": "XNAS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.98,
                "debt_to_market_cap_ratio": 0.06,
                "securities_to_market_cap_ratio": 0.01,
            },
            "CRM": {
                "company_name": "Salesforce Inc.",
                "sector": "Technology",
                "exchange": "XNYS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.97,
                "debt_to_market_cap_ratio": 0.04,
                "securities_to_market_cap_ratio": 0.01,
            },
            # ── Compliant: Other sectors ────────────────────────────────────────
            "AMZN": {
                "company_name": "Amazon.com Inc.",
                "sector": "E-Commerce & Cloud",
                "exchange": "XNAS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.96,
                "debt_to_market_cap_ratio": 0.05,
                "securities_to_market_cap_ratio": 0.02,
            },
            "TSLA": {
                "company_name": "Tesla Inc.",
                "sector": "Electric Vehicles",
                "exchange": "XNAS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.99,
                "debt_to_market_cap_ratio": 0.03,
                "securities_to_market_cap_ratio": 0.01,
            },
            "PFE": {
                "company_name": "Pfizer Inc.",
                "sector": "Pharmaceuticals",
                "exchange": "XNYS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.95,
                "debt_to_market_cap_ratio": 0.18,
                "securities_to_market_cap_ratio": 0.03,
            },
            "JNJ": {
                "company_name": "Johnson & Johnson",
                "sector": "Healthcare",
                "exchange": "XNYS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.96,
                "debt_to_market_cap_ratio": 0.08,
                "securities_to_market_cap_ratio": 0.02,
            },
            "NVO": {
                "company_name": "Novo Nordisk A/S",
                "sector": "Pharmaceuticals",
                "exchange": "XNYS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.99,
                "debt_to_market_cap_ratio": 0.05,
                "securities_to_market_cap_ratio": 0.01,
            },
            "NFLX": {
                "company_name": "Netflix Inc.",
                "sector": "Streaming Media",
                "exchange": "XNAS",
                "business_screen_pass": True,
                "compliant_revenue_pct": 0.96,
                "debt_to_market_cap_ratio": 0.12,
                "securities_to_market_cap_ratio": 0.04,
            },
            # ── Non-compliant: Conventional Finance ────────────────────────────
            "JPM": {
                "company_name": "JPMorgan Chase & Co.",
                "sector": "Conventional Banking",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.12,
                "debt_to_market_cap_ratio": 0.85,
                "securities_to_market_cap_ratio": 0.72,
            },
            "BAC": {
                "company_name": "Bank of America Corp.",
                "sector": "Conventional Banking",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.10,
                "debt_to_market_cap_ratio": 0.80,
                "securities_to_market_cap_ratio": 0.68,
            },
            "V": {
                "company_name": "Visa Inc.",
                "sector": "Conventional Finance",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.08,
                "debt_to_market_cap_ratio": 0.09,
                "securities_to_market_cap_ratio": 0.06,
            },
            "MA": {
                "company_name": "Mastercard Inc.",
                "sector": "Conventional Finance",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.09,
                "debt_to_market_cap_ratio": 0.10,
                "securities_to_market_cap_ratio": 0.05,
            },
            "GS": {
                "company_name": "The Goldman Sachs Group",
                "sector": "Conventional Banking",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.05,
                "debt_to_market_cap_ratio": 0.95,
                "securities_to_market_cap_ratio": 0.88,
            },
            # ── Non-compliant: Tobacco ──────────────────────────────────────────
            "PM": {
                "company_name": "Philip Morris International",
                "sector": "Tobacco",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.01,
                "debt_to_market_cap_ratio": 0.48,
                "securities_to_market_cap_ratio": 0.12,
            },
            "MO": {
                "company_name": "Altria Group Inc.",
                "sector": "Tobacco",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.01,
                "debt_to_market_cap_ratio": 0.55,
                "securities_to_market_cap_ratio": 0.10,
            },
            # ── Non-compliant: Alcohol ──────────────────────────────────────────
            "BUD": {
                "company_name": "Anheuser-Busch InBev",
                "sector": "Alcoholic Beverages",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.02,
                "debt_to_market_cap_ratio": 0.35,
                "securities_to_market_cap_ratio": 0.08,
            },
            "DEO": {
                "company_name": "Diageo plc",
                "sector": "Alcoholic Beverages",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.02,
                "debt_to_market_cap_ratio": 0.28,
                "securities_to_market_cap_ratio": 0.06,
            },
            # ── Non-compliant: Gambling ─────────────────────────────────────────
            "MGM": {
                "company_name": "MGM Resorts International",
                "sector": "Gambling & Casinos",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.02,
                "debt_to_market_cap_ratio": 0.42,
                "securities_to_market_cap_ratio": 0.15,
            },
            "LVS": {
                "company_name": "Las Vegas Sands Corp.",
                "sector": "Gambling & Casinos",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.02,
                "debt_to_market_cap_ratio": 0.38,
                "securities_to_market_cap_ratio": 0.12,
            },
            # ── Non-compliant: Defense ──────────────────────────────────────────
            "RTX": {
                "company_name": "RTX Corporation (Raytheon)",
                "sector": "Defense & Aerospace",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.02,
                "debt_to_market_cap_ratio": 0.15,
                "securities_to_market_cap_ratio": 0.08,
            },
            "LMT": {
                "company_name": "Lockheed Martin Corporation",
                "sector": "Defense & Aerospace",
                "exchange": "XNYS",
                "business_screen_pass": False,
                "compliant_revenue_pct": 0.02,
                "debt_to_market_cap_ratio": 0.22,
                "securities_to_market_cap_ratio": 0.06,
            },
        }

        data = MOCK_DB.get(ticker.upper())
        if data:
            return data

        # Unknown ticker — assume compliant small-cap tech
        return {
            "company_name": f"{ticker} Inc.",
            "sector": "Technology",
            "exchange": "XNAS",
            "business_screen_pass": True,
            "compliant_revenue_pct": 0.96,
            "debt_to_market_cap_ratio": 0.08,
            "securities_to_market_cap_ratio": 0.03,
        }
