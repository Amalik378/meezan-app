from fastapi import APIRouter

from app.dependencies import DbSession
from app.schemas.nisab import NisabPriceResponse
from app.services.nisab_service import NisabService

router = APIRouter()


@router.get("/current", response_model=NisabPriceResponse)
async def get_current_nisab(db: DbSession):
    """
    Returns the current Nisab thresholds in GBP based on live gold/silver prices.
    Results are cached for 24 hours.
    This endpoint is public — no auth required.
    """
    return await NisabService(db).get_current_nisab()
