from typing import Literal

from fastapi import APIRouter, status

from app.dependencies import CurrentUserId, DbSession
from app.schemas.zakat import (
    ZakatAssetCreate,
    ZakatAssetResponse,
    ZakatAssetUpdate,
    ZakatCalculationResponse,
    ZakatRecordResponse,
)
from app.services.zakat_service import ZakatService

router = APIRouter()


@router.get("/assets", response_model=list[ZakatAssetResponse])
async def list_assets(user_id: CurrentUserId, db: DbSession):
    """Return all active Zakat assets for the authenticated user."""
    return await ZakatService(db).get_assets(user_id)


@router.post("/assets", response_model=ZakatAssetResponse, status_code=status.HTTP_201_CREATED)
async def add_asset(
    payload: ZakatAssetCreate,
    user_id: CurrentUserId,
    db: DbSession,
):
    """Add a new zakatable asset."""
    return await ZakatService(db).add_asset(user_id, payload)


@router.patch("/assets/{asset_id}", response_model=ZakatAssetResponse)
async def update_asset(
    asset_id: str,
    payload: ZakatAssetUpdate,
    user_id: CurrentUserId,
    db: DbSession,
):
    """Update the value or description of an existing asset."""
    return await ZakatService(db).update_asset(user_id, asset_id, payload)


@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(asset_id: str, user_id: CurrentUserId, db: DbSession):
    """Soft-delete an asset (sets is_active = False)."""
    await ZakatService(db).delete_asset(user_id, asset_id)


@router.get("/calculate", response_model=ZakatCalculationResponse)
async def calculate_zakat(
    user_id: CurrentUserId,
    db: DbSession,
    nisab_type: Literal["gold", "silver"] = "silver",
):
    """
    Preview the Zakat calculation for the current asset portfolio.
    Does not save a record — use POST /records to finalise.
    """
    return await ZakatService(db).calculate(user_id, nisab_type)


@router.post("/records", response_model=ZakatRecordResponse, status_code=status.HTTP_201_CREATED)
async def finalise_zakat(
    user_id: CurrentUserId,
    db: DbSession,
    nisab_type: Literal["gold", "silver"] = "silver",
):
    """
    Finalise and persist the annual Zakat calculation as an immutable record.
    This is the user's official Zakat for the year.
    """
    return await ZakatService(db).finalise(user_id, nisab_type)


@router.get("/records", response_model=list[ZakatRecordResponse])
async def list_records(user_id: CurrentUserId, db: DbSession):
    """Return the user's historical Zakat records, newest first."""
    return await ZakatService(db).get_records(user_id)


@router.get("/records/{record_id}", response_model=ZakatRecordResponse)
async def get_record(record_id: str, user_id: CurrentUserId, db: DbSession):
    """Return a single Zakat record by ID for the authenticated user."""
    return await ZakatService(db).get_record_by_id(user_id, record_id)
