"""
Tests for the Zakat calculation engine.

These test the core Islamic finance logic — the most critical part of the app.
All tests run against an in-memory SQLite database, no external services needed.
"""

from datetime import date, timedelta

import pytest
import pytest_asyncio

from app.schemas.zakat import ZakatAssetCreate
from app.services.nisab_service import NISAB_SILVER_GRAMS, TROY_OZ_TO_GRAMS
from app.services.zakat_service import HAWL_DAYS, ZAKAT_RATE, ZakatService

# ── Helpers ────────────────────────────────────────────────────────────────────

WELL_BEFORE_HAWL = date.today() - timedelta(days=int(HAWL_DAYS) + 10)
JUST_BEFORE_HAWL = date.today() - timedelta(days=int(HAWL_DAYS) - 10)
TEST_USER = "00000000-0000-0000-0000-000000000001"


def asset(
    asset_type: str = "cash",
    value_gbp: float = 1000.0,
    hawl_start_date: date = WELL_BEFORE_HAWL,
    description: str = "Test asset",
) -> ZakatAssetCreate:
    return ZakatAssetCreate(
        asset_type=asset_type,
        description=description,
        value_gbp=value_gbp,
        hawl_start_date=hawl_start_date,
    )


# ── Unit tests: Zakat calculation logic ───────────────────────────────────────


@pytest.mark.asyncio
async def test_add_asset_persists(db_session):
    service = ZakatService(db_session)
    result = await service.add_asset(TEST_USER, asset(value_gbp=5000.0))

    assert result.value_gbp == 5000.0
    assert result.asset_type == "cash"
    assert result.is_active is True


@pytest.mark.asyncio
async def test_get_assets_returns_only_active(db_session):
    service = ZakatService(db_session)

    a1 = await service.add_asset(TEST_USER, asset(value_gbp=1000.0))
    a2 = await service.add_asset(TEST_USER, asset(value_gbp=2000.0))

    # Delete one
    await service.delete_asset(TEST_USER, str(a1.id))

    assets = await service.get_assets(TEST_USER)
    assert len(assets) == 1
    assert assets[0].id == a2.id


@pytest.mark.asyncio
async def test_calculation_meets_nisab(db_session):
    """
    A user with £10,000 cash (well above any Nisab) should have Zakat due.
    """
    service = ZakatService(db_session)
    await service.add_asset(TEST_USER, asset(value_gbp=10_000.0))

    result = await service.calculate(TEST_USER, nisab_type="silver")

    assert result.meets_nisab is True
    assert result.zakat_due_gbp == round(10_000.0 * ZAKAT_RATE, 2)


@pytest.mark.asyncio
async def test_calculation_below_nisab(db_session):
    """
    A user with only £50 cash (below any reasonable Nisab) owes no Zakat.
    """
    service = ZakatService(db_session)
    await service.add_asset(TEST_USER, asset(value_gbp=50.0))

    result = await service.calculate(TEST_USER, nisab_type="silver")

    assert result.meets_nisab is False
    assert result.zakat_due_gbp == 0.0


@pytest.mark.asyncio
async def test_hawl_not_complete_excludes_asset(db_session):
    """
    An asset acquired less than one lunar year ago should not count toward Zakat.
    """
    service = ZakatService(db_session)

    # Asset that HAS completed hawl
    await service.add_asset(TEST_USER, asset(value_gbp=5000.0, hawl_start_date=WELL_BEFORE_HAWL))
    # Asset that has NOT completed hawl
    new_asset = await service.add_asset(
        TEST_USER, asset(value_gbp=50_000.0, hawl_start_date=JUST_BEFORE_HAWL)
    )

    result = await service.calculate(TEST_USER, nisab_type="silver")

    # Only the £5,000 asset counts
    assert result.total_assets_gbp == 5000.0
    assert str(new_asset.id) in result.assets_below_hawl


@pytest.mark.asyncio
async def test_zakat_rate_is_2_point_5_percent(db_session):
    """The Zakat rate must always be exactly 2.5%."""
    service = ZakatService(db_session)
    await service.add_asset(TEST_USER, asset(value_gbp=20_000.0))

    result = await service.calculate(TEST_USER, nisab_type="silver")

    assert result.zakat_rate == 0.025
    assert result.zakat_due_gbp == 500.0


@pytest.mark.asyncio
async def test_non_zakatable_property_excluded(db_session):
    """Primary residence / personal property is not zakatable."""
    service = ZakatService(db_session)
    await service.add_asset(TEST_USER, asset(asset_type="property", value_gbp=300_000.0))

    result = await service.calculate(TEST_USER, nisab_type="silver")

    # Property is excluded — no Zakat due
    assert result.total_assets_gbp == 0.0
    assert result.zakat_due_gbp == 0.0


@pytest.mark.asyncio
async def test_multiple_asset_types_aggregated(db_session):
    """Zakat is calculated on the sum of all zakatable assets."""
    service = ZakatService(db_session)
    await service.add_asset(TEST_USER, asset(asset_type="cash", value_gbp=5000.0))
    await service.add_asset(TEST_USER, asset(asset_type="stocks", value_gbp=3000.0))
    await service.add_asset(TEST_USER, asset(asset_type="gold", value_gbp=2000.0))
    await service.add_asset(TEST_USER, asset(asset_type="property", value_gbp=200_000.0))

    result = await service.calculate(TEST_USER, nisab_type="silver")

    assert result.total_assets_gbp == 10_000.0  # property excluded
    assert result.zakat_due_gbp == 250.0


@pytest.mark.asyncio
async def test_finalise_creates_record(db_session):
    """Calling finalise() should persist a ZakatRecord."""
    service = ZakatService(db_session)
    await service.add_asset(TEST_USER, asset(value_gbp=10_000.0))

    record = await service.finalise(TEST_USER, nisab_type="silver")

    assert record.id is not None
    assert record.zakat_due_gbp == round(10_000.0 * ZAKAT_RATE, 2)
    assert record.hijri_year is not None

    history = await service.get_records(TEST_USER)
    assert len(history) == 1
    assert history[0].id == record.id


@pytest.mark.asyncio
async def test_update_asset_changes_value(db_session):
    service = ZakatService(db_session)
    created = await service.add_asset(TEST_USER, asset(value_gbp=1000.0))

    from app.schemas.zakat import ZakatAssetUpdate

    updated = await service.update_asset(
        TEST_USER, str(created.id), ZakatAssetUpdate(value_gbp=2500.0)
    )

    assert updated.value_gbp == 2500.0


# ── Integration: API endpoints ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_api_add_and_list_assets(client):
    # Add an asset
    resp = await client.post(
        "/api/v1/zakat/assets",
        json={
            "asset_type": "cash",
            "description": "ISA savings",
            "value_gbp": 8000.0,
            "hawl_start_date": str(WELL_BEFORE_HAWL),
        },
    )
    assert resp.status_code == 201
    asset_id = resp.json()["id"]

    # List assets
    resp = await client.get("/api/v1/zakat/assets")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["id"] == asset_id


@pytest.mark.asyncio
async def test_api_calculate(client):
    await client.post(
        "/api/v1/zakat/assets",
        json={
            "asset_type": "cash",
            "description": "Savings",
            "value_gbp": 15_000.0,
            "hawl_start_date": str(WELL_BEFORE_HAWL),
        },
    )

    resp = await client.get("/api/v1/zakat/calculate?nisab_type=silver")
    assert resp.status_code == 200
    data = resp.json()
    assert data["meets_nisab"] is True
    assert data["zakat_due_gbp"] == 375.0


@pytest.mark.asyncio
async def test_api_delete_asset(client):
    resp = await client.post(
        "/api/v1/zakat/assets",
        json={
            "asset_type": "gold",
            "description": "Gold jewellery",
            "value_gbp": 500.0,
            "hawl_start_date": str(WELL_BEFORE_HAWL),
        },
    )
    asset_id = resp.json()["id"]

    del_resp = await client.delete(f"/api/v1/zakat/assets/{asset_id}")
    assert del_resp.status_code == 204

    list_resp = await client.get("/api/v1/zakat/assets")
    assert len(list_resp.json()) == 0
