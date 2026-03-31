from fastapi import APIRouter, status

from app.dependencies import CurrentUserId, DbSession
from app.schemas.screening import (
    ScreeningResultResponse,
    WatchlistAddRequest,
    WatchlistItemResponse,
)
from app.services.screening_service import ScreeningService

router = APIRouter()


@router.get("/screen/{ticker}", response_model=ScreeningResultResponse)
async def screen_ticker(ticker: str, db: DbSession):
    """
    Screen a stock ticker for Shariah compliance.
    Results are cached for 7 days.
    This endpoint is public — no auth required.
    """
    return await ScreeningService(db).screen_ticker(ticker)


@router.get("/watchlist", response_model=list[WatchlistItemResponse])
async def get_watchlist(user_id: CurrentUserId, db: DbSession):
    """Return the user's watchlist with latest screening results."""
    return await ScreeningService(db).get_watchlist(user_id)


@router.post(
    "/watchlist",
    response_model=WatchlistItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_to_watchlist(
    payload: WatchlistAddRequest,
    user_id: CurrentUserId,
    db: DbSession,
):
    """Add a ticker to the user's watchlist. Screens it immediately if not cached."""
    return await ScreeningService(db).add_to_watchlist(user_id, payload)


@router.delete("/watchlist/{ticker}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    ticker: str, user_id: CurrentUserId, db: DbSession
):
    """Remove a ticker from the user's watchlist."""
    await ScreeningService(db).remove_from_watchlist(user_id, ticker)
