"""
Fetch real financial ratios from Yahoo Finance (quoteSummary API).

Sources of truth for labels:
  - Compliant  (1): constituents of DJIM World / MSCI World Islamic Index
  - Non-compliant (0): sectors excluded by AAOIFI/DJIM — conventional banking,
    insurance, interest-based fintech, alcohol, tobacco, gambling, defence.

Computed features (same as train.py):
  debt_to_assets       = totalDebt / totalAssets
  interest_to_revenue  = interestExpense / totalRevenue
  receivables_to_assets= netReceivables / totalAssets
  sector_is_haram      = 1 if sector excluded by AAOIFI primary screen

Usage:
  python -m app.ml.fetch_data          # writes app/ml/training_data.csv
  python -m app.ml.fetch_data --dry    # prints results, no write
"""

import argparse
import logging
import sys
import time
from pathlib import Path

import pandas as pd
import requests

logger = logging.getLogger(__name__)

OUT_PATH = Path(__file__).parent / "training_data.csv"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}

# ---------------------------------------------------------------------------
# Ground-truth universe
# Source: DJIM World Index methodology + MSCI World Islamic Index fact sheets
# (Feb 2025).  sector_is_haram uses AAOIFI primary business activity screen.
# ---------------------------------------------------------------------------
UNIVERSE = [
    # ── Technology ──────────────────────────────────────────────────────────
    ("AAPL",  "Apple Inc.",               "Technology",             0, 1),
    ("MSFT",  "Microsoft Corporation",    "Technology",             0, 1),
    ("GOOGL", "Alphabet Inc.",            "Technology",             0, 1),
    ("NVDA",  "NVIDIA Corporation",       "Semiconductors",         0, 1),
    ("META",  "Meta Platforms",           "Technology",             0, 1),
    ("ADBE",  "Adobe Inc.",               "Technology",             0, 1),
    ("CRM",   "Salesforce Inc.",          "Technology",             0, 1),
    ("ORCL",  "Oracle Corporation",       "Technology",             0, 1),
    ("INTC",  "Intel Corporation",        "Semiconductors",         0, 1),
    ("AMD",   "Advanced Micro Devices",   "Semiconductors",         0, 1),
    ("QCOM",  "Qualcomm Inc.",            "Semiconductors",         0, 1),
    ("TSMC",  "Taiwan Semiconductor",     "Semiconductors",         0, 1),
    ("ASML",  "ASML Holding",             "Semiconductors",         0, 1),
    ("TXN",   "Texas Instruments",        "Semiconductors",         0, 1),
    ("AVGO",  "Broadcom Inc.",            "Semiconductors",         0, 1),
    ("MU",    "Micron Technology",        "Semiconductors",         0, 1),
    ("LRCX",  "Lam Research",             "Semiconductor Equipment",0, 1),
    ("KLAC",  "KLA Corporation",          "Semiconductor Equipment",0, 1),
    # ── E-commerce / Platforms ───────────────────────────────────────────────
    ("AMZN",  "Amazon.com",               "E-Commerce",             0, 1),
    ("SHOP",  "Shopify Inc.",             "E-Commerce Platform",    0, 1),
    # ── EVs / Auto ───────────────────────────────────────────────────────────
    ("TSLA",  "Tesla Inc.",               "Electric Vehicles",      0, 1),
    # ── Pharma / Healthcare ──────────────────────────────────────────────────
    ("PFE",   "Pfizer Inc.",              "Pharmaceuticals",        0, 1),
    ("JNJ",   "Johnson & Johnson",        "Healthcare",             0, 1),
    ("NVO",   "Novo Nordisk",             "Pharmaceuticals",        0, 1),
    ("MRK",   "Merck & Co.",              "Pharmaceuticals",        0, 1),
    ("LLY",   "Eli Lilly and Co.",        "Pharmaceuticals",        0, 1),
    ("ABBV",  "AbbVie Inc.",              "Pharmaceuticals",        0, 1),
    ("TMO",   "Thermo Fisher Scientific", "Healthcare Equipment",   0, 1),
    ("ABT",   "Abbott Laboratories",      "Healthcare",             0, 1),
    ("UNH",   "UnitedHealth Group",       "Healthcare",             0, 1),
    # ── Streaming / Media ────────────────────────────────────────────────────
    ("NFLX",  "Netflix Inc.",             "Streaming Media",        0, 1),
    ("SPOT",  "Spotify Technology",       "Streaming Media",        0, 1),
    # ── Transportation / Logistics ───────────────────────────────────────────
    ("UBER",  "Uber Technologies",        "Transportation",         0, 1),
    ("LYFT",  "Lyft Inc.",                "Transportation",         0, 1),
    ("EXPD",  "Expeditors International", "Logistics",              0, 1),
    ("UPS",   "United Parcel Service",    "Logistics",              0, 1),
    ("FDX",   "FedEx Corporation",        "Logistics",              0, 1),
    # ── Travel ───────────────────────────────────────────────────────────────
    ("ABNB",  "Airbnb Inc.",              "Travel & Hospitality",   0, 1),
    ("BKNG",  "Booking Holdings",         "Travel & Hospitality",   0, 1),
    # ── Cybersecurity / Cloud ────────────────────────────────────────────────
    ("PANW",  "Palo Alto Networks",       "Cybersecurity",          0, 1),
    ("CRWD",  "CrowdStrike Holdings",     "Cybersecurity",          0, 1),
    ("ZS",    "Zscaler Inc.",             "Cybersecurity",          0, 1),
    ("SNOW",  "Snowflake Inc.",           "Cloud Software",         0, 1),
    ("DDOG",  "Datadog Inc.",             "Cloud Software",         0, 1),
    ("NOW",   "ServiceNow Inc.",          "Enterprise Software",    0, 1),
    ("TEAM",  "Atlassian Corporation",    "Software",               0, 1),
    # ── Telecom ──────────────────────────────────────────────────────────────
    ("TMUS",  "T-Mobile US",              "Telecommunications",     0, 1),
    ("T",     "AT&T Inc.",                "Telecommunications",     0, 1),
    ("VZ",    "Verizon Communications",   "Telecommunications",     0, 1),
    ("CMCSA", "Comcast Corporation",      "Media & Telecom",        0, 1),
    # ── Energy ───────────────────────────────────────────────────────────────
    ("XOM",   "Exxon Mobil",              "Oil & Gas",              0, 1),
    ("CVX",   "Chevron Corporation",      "Oil & Gas",              0, 1),
    ("COP",   "ConocoPhillips",           "Oil & Gas",              0, 1),
    ("SLB",   "SLB (Schlumberger)",       "Oilfield Services",      0, 1),
    # ── Solar / Renewables ───────────────────────────────────────────────────
    ("ENPH",  "Enphase Energy",           "Solar Energy",           0, 1),
    ("FSLR",  "First Solar Inc.",         "Solar Energy",           0, 1),
    ("SEDG",  "SolarEdge Technologies",   "Solar Energy",           0, 1),
    ("NEE",   "NextEra Energy",           "Renewable Energy",       0, 1),
    ("BEP",   "Brookfield Renewable",     "Renewable Energy",       0, 1),
    # ── Industrial ───────────────────────────────────────────────────────────
    ("GE",    "GE Vernova",               "Industrial",             0, 1),
    ("CAT",   "Caterpillar Inc.",          "Industrial Machinery",   0, 1),
    ("HON",   "Honeywell International",  "Industrial Conglomerate", 0, 1),
    ("DE",    "Deere & Company",          "Agricultural Machinery", 0, 1),
    ("MMM",   "3M Company",               "Industrial Conglomerate", 0, 1),
    # ── Retail ───────────────────────────────────────────────────────────────
    ("WMT",   "Walmart Inc.",             "Retail",                 0, 1),
    ("COST",  "Costco Wholesale",         "Retail",                 0, 1),
    ("TGT",   "Target Corporation",       "Retail",                 0, 1),
    ("NKE",   "Nike Inc.",                "Apparel",                0, 1),
    # ── Real Estate ──────────────────────────────────────────────────────────
    ("PLD",   "Prologis Inc.",            "Real Estate",            0, 1),
    ("EQR",   "Equity Residential",       "Real Estate",            0, 1),
    ("AMT",   "American Tower Corp",      "Real Estate (Telecom)",  0, 1),
    ("O",     "Realty Income Corp",       "Real Estate",            0, 1),
    ("SPG",   "Simon Property Group",     "Real Estate",            0, 1),

    # ── Non-compliant: Conventional Banking ─────────────────────────────────
    ("JPM",   "JPMorgan Chase",           "Conventional Banking",   1, 0),
    ("BAC",   "Bank of America",          "Conventional Banking",   1, 0),
    ("WFC",   "Wells Fargo",              "Conventional Banking",   1, 0),
    ("C",     "Citigroup",                "Conventional Banking",   1, 0),
    ("GS",    "Goldman Sachs",            "Conventional Banking",   1, 0),
    ("MS",    "Morgan Stanley",           "Conventional Banking",   1, 0),
    ("USB",   "US Bancorp",               "Conventional Banking",   1, 0),
    ("PNC",   "PNC Financial",            "Conventional Banking",   1, 0),
    ("V",     "Visa Inc.",                "Conventional Banking",   1, 0),
    ("MA",    "Mastercard Inc.",          "Conventional Banking",   1, 0),
    ("AXP",   "American Express",         "Conventional Banking",   1, 0),
    ("SOFI",  "SoFi Technologies",        "Conventional Banking",   1, 0),
    # ── Non-compliant: Interest-based Fintech ────────────────────────────────
    ("SQ",    "Block Inc.",               "Fintech",                1, 0),
    ("PYPL",  "PayPal Holdings",          "Fintech",                1, 0),
    ("AFRM",  "Affirm Holdings",          "Fintech",                1, 0),
    # ── Non-compliant: Conventional Insurance ────────────────────────────────
    ("BRK-B", "Berkshire Hathaway",       "Conventional Insurance", 1, 0),
    ("MET",   "MetLife Inc.",             "Conventional Insurance", 1, 0),
    ("PRU",   "Prudential Financial",     "Conventional Insurance", 1, 0),
    ("AIG",   "American Intl Group",      "Conventional Insurance", 1, 0),
    # ── Non-compliant: Tobacco ────────────────────────────────────────────────
    ("PM",    "Philip Morris Intl",       "Tobacco",                1, 0),
    ("MO",    "Altria Group",             "Tobacco",                1, 0),
    ("BTI",   "British American Tobacco", "Tobacco",                1, 0),
    # ── Non-compliant: Alcohol ────────────────────────────────────────────────
    ("BUD",   "Anheuser-Busch InBev",     "Alcoholic Beverages",    1, 0),
    ("DEO",   "Diageo plc",               "Alcoholic Beverages",    1, 0),
    ("SAM",   "Boston Beer Company",      "Alcoholic Beverages",    1, 0),
    # ── Non-compliant: Gambling ───────────────────────────────────────────────
    ("MGM",   "MGM Resorts",              "Gambling & Casinos",     1, 0),
    ("LVS",   "Las Vegas Sands",          "Gambling & Casinos",     1, 0),
    ("WYNN",  "Wynn Resorts",             "Gambling & Casinos",     1, 0),
    # ── Non-compliant: Defence ────────────────────────────────────────────────
    ("RTX",   "RTX Corporation",          "Defense & Aerospace",    1, 0),
    ("LMT",   "Lockheed Martin",          "Defense & Aerospace",    1, 0),
    ("NOC",   "Northrop Grumman",         "Defense & Aerospace",    1, 0),
    ("GD",    "General Dynamics",         "Defense & Aerospace",    1, 0),
    ("BA",    "Boeing Company",           "Defense & Aerospace",    1, 0),
    # ── Non-compliant: F&B (high debt / interest) ─────────────────────────────
    ("MCD",   "McDonald's Corporation",   "Food & Beverage",        0, 0),
    ("SBUX",  "Starbucks Corporation",    "Food & Beverage",        0, 0),
    ("YUM",   "Yum! Brands",              "Restaurants",            0, 0),
    ("KO",    "Coca-Cola Company",        "Soft Drinks",            0, 0),
    ("PEP",   "PepsiCo Inc.",             "Beverages",              0, 0),
    # ── Non-compliant: Media / Entertainment (excessive debt) ────────────────
    ("DIS",   "The Walt Disney Company",  "Entertainment",          0, 0),
    ("CMCSA", "Comcast Corporation",      "Media & Telecom",        0, 0),
]

# Remove duplicates (CMCSA appears twice with different labels — keep compliant one)
_seen: set[str] = set()
UNIVERSE_DEDUPED = []
for row in UNIVERSE:
    if row[0] not in _seen:
        _seen.add(row[0])
        UNIVERSE_DEDUPED.append(row)
UNIVERSE = UNIVERSE_DEDUPED


def _yf_summary(ticker: str) -> dict:
    """Fetch Yahoo Finance quoteSummary for balance sheet + income statement."""
    modules = "balanceSheetHistory,incomeStatementHistory,financialData"
    url = (
        f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}"
        f"?modules={modules}&corsDomain=finance.yahoo.com&formatted=false"
    )
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    data = r.json()
    result = data.get("quoteSummary", {}).get("result", [])
    if not result:
        raise ValueError(f"Empty result for {ticker}")
    return result[0]


def _safe(d: dict, *keys, default=0.0) -> float:
    """Safely dig into nested dict, return float or default."""
    for k in keys:
        if not isinstance(d, dict):
            return float(default)
        d = d.get(k, {})
    if isinstance(d, dict):
        # Yahoo sometimes wraps: {"raw": 1234, "fmt": "1.2K"}
        return float(d.get("raw", default))
    try:
        return float(d)
    except (TypeError, ValueError):
        return float(default)


def compute_ratios(ticker: str) -> dict | None:
    """Return feature dict for one ticker, or None if data unavailable."""
    try:
        summary = _yf_summary(ticker)
    except Exception as exc:
        logger.warning("  %s: fetch failed — %s", ticker, exc)
        return None

    # ── Balance sheet (most recent annual) ──────────────────────────────────
    bs_list = summary.get("balanceSheetHistory", {}).get("balanceSheetStatements", [])
    bs = bs_list[0] if bs_list else {}

    total_assets     = _safe(bs, "totalAssets")
    total_debt       = _safe(bs, "longTermDebt") + _safe(bs, "shortLongTermDebt")
    net_receivables  = _safe(bs, "netReceivables")

    # ── Income statement (most recent annual) ───────────────────────────────
    is_list = summary.get("incomeStatementHistory", {}).get("incomeStatementHistory", [])
    inc = is_list[0] if is_list else {}

    total_revenue    = _safe(inc, "totalRevenue")
    interest_expense = abs(_safe(inc, "interestExpense"))   # reported negative

    # ── Ratios ───────────────────────────────────────────────────────────────
    if total_assets <= 0 or total_revenue <= 0:
        logger.warning("  %s: zero assets or revenue — skipping", ticker)
        return None

    return {
        "debt_to_assets":       round(min(total_debt / total_assets, 3.0), 4),
        "interest_to_revenue":  round(min(interest_expense / total_revenue, 2.0), 4),
        "receivables_to_assets":round(min(net_receivables / total_assets, 1.0), 4),
    }


def _already_fetched(out_path: Path) -> set[str]:
    """Return set of tickers already written to out_path (for resume support)."""
    if out_path.exists():
        try:
            df = pd.read_csv(out_path)
            return set(df["ticker"].tolist())
        except Exception:
            pass
    return set()


def build_dataset(delay: float = 1.5, out_path: Path = OUT_PATH, resume: bool = True) -> pd.DataFrame:
    already = _already_fetched(out_path) if resume else set()
    if already:
        logger.info("Resuming — %d tickers already in %s", len(already), out_path)

    total = len(UNIVERSE)
    written = 0
    skipped = 0

    import csv

    # Open CSV in append/write mode so each successful fetch is persisted immediately
    file_exists = out_path.exists() and resume and bool(already)
    mode = "a" if file_exists else "w"
    COLS = [
        "ticker", "company_name", "sector", "debt_to_assets",
        "interest_to_revenue", "receivables_to_assets", "sector_is_haram", "label",
    ]

    with open(out_path, mode, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLS)
        if not file_exists:
            writer.writeheader()

        for i, (ticker, company, sector, sector_is_haram, label) in enumerate(UNIVERSE, 1):
            if ticker in already:
                logger.info("[%3d/%d] %-8s  SKIP (already fetched)", i, total, ticker)
                continue

            logger.info("[%3d/%d] %-8s %s", i, total, ticker, company)
            ratios = compute_ratios(ticker)
            if ratios is None:
                logger.warning("  %s: skipped (no data)", ticker)
                skipped += 1
                time.sleep(delay)
                continue

            row = {
                "ticker":                ticker,
                "company_name":          company,
                "sector":                sector,
                "debt_to_assets":        max(ratios["debt_to_assets"], 0),
                "interest_to_revenue":   max(ratios["interest_to_revenue"], 0),
                "receivables_to_assets": max(ratios["receivables_to_assets"], 0),
                "sector_is_haram":       sector_is_haram,
                "label":                 label,
            }
            writer.writerow(row)
            f.flush()   # persist after each row — never lose data on 429/crash
            written += 1

            logger.info(
                "  d/a=%.3f  i/r=%.3f  r/a=%.3f  haram=%d  label=%d",
                ratios["debt_to_assets"],
                ratios["interest_to_revenue"],
                ratios["receivables_to_assets"],
                sector_is_haram,
                label,
            )
            time.sleep(delay)

    logger.info("Done — %d written, %d skipped (no data)", written, skipped)
    df = pd.read_csv(out_path)
    logger.info(
        "Total in CSV: %d rows — %d compliant, %d non-compliant",
        len(df), df["label"].sum(), (df["label"] == 0).sum()
    )
    return df


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="Fetch real financial data for Shariah classifier")
    parser.add_argument("--dry", action="store_true", help="Print only, do not write CSV")
    parser.add_argument("--delay", type=float, default=1.5, help="Seconds between requests (default 1.5)")
    parser.add_argument("--no-resume", action="store_true", help="Start fresh, ignore existing CSV")
    args = parser.parse_args()

    if args.dry:
        # Just show what we'd fetch, don't touch the CSV
        for ticker, company, _sector, _haram, _label in UNIVERSE[:5]:
            print(f"{ticker:<8} {company}")
        print(f"... {len(UNIVERSE)} total tickers")
        sys.exit(0)

    if args.no_resume:
        # Write to a temp file so existing training_data.csv is never clobbered
        import shutil
        import tempfile
        tmp = Path(tempfile.mktemp(suffix=".csv", dir=OUT_PATH.parent))
        logger.info("--no-resume: writing to temp %s first", tmp)
        df = build_dataset(delay=args.delay, out_path=tmp, resume=False)
        if len(df) > 0:
            shutil.move(str(tmp), OUT_PATH)
            logger.info("Replaced %s  (%d rows)", OUT_PATH, len(df))
            print(f"\nDataset saved to {OUT_PATH}  ({len(df)} rows)")
        else:
            tmp.unlink(missing_ok=True)
            logger.warning("0 rows fetched — original training_data.csv preserved")
            print("\n0 rows fetched. training_data.csv is unchanged.")
    else:
        df = build_dataset(delay=args.delay, out_path=OUT_PATH, resume=True)
        print(f"\nDataset saved to {OUT_PATH}  ({len(df)} rows)")
