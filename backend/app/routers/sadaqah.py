from fastapi import APIRouter, status

from app.dependencies import CurrentUserId, DbSession
from app.schemas.sadaqah import (
    SadaqahCreate,
    SadaqahResponse,
    SadaqahSummaryResponse,
    SadaqahUpdate,
)
from app.services.sadaqah_service import SadaqahService

router = APIRouter()


@router.get("/summary", response_model=SadaqahSummaryResponse)
async def get_summary(user_id: CurrentUserId, db: DbSession):
    """Aggregate giving statistics for the dashboard."""
    return await SadaqahService(db).get_summary(user_id)


@router.get("/", response_model=list[SadaqahResponse])
async def list_records(
    user_id: CurrentUserId,
    db: DbSession,
    page: int = 1,
    page_size: int = 20,
):
    """Return paginated list of the user's donations, newest first."""
    return await SadaqahService(db).list_records(user_id, page, page_size)


@router.post("/", response_model=SadaqahResponse, status_code=status.HTTP_201_CREATED)
async def add_record(
    payload: SadaqahCreate,
    user_id: CurrentUserId,
    db: DbSession,
):
    """Log a new charitable donation."""
    return await SadaqahService(db).add(user_id, payload)


@router.patch("/{record_id}", response_model=SadaqahResponse)
async def update_record(
    record_id: str,
    payload: SadaqahUpdate,
    user_id: CurrentUserId,
    db: DbSession,
):
    """Update a donation record."""
    return await SadaqahService(db).update(user_id, record_id, payload)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(record_id: str, user_id: CurrentUserId, db: DbSession):
    """Permanently delete a donation record."""
    await SadaqahService(db).delete(user_id, record_id)
