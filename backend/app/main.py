from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import create_tables
from app.routers import nisab, sadaqah, screening, zakat

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    # Startup: create tables in dev, run migrations in prod
    if settings.debug:
        await create_tables()
    yield
    # Shutdown: nothing to clean up (connection pool handles itself)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Halal finance, Zakat calculation, and Shariah stock screening API.",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# ── Middleware ─────────────────────────────────────────────────────────────────

# In debug mode allow all origins so the Expo dev server is never CORS-blocked
# regardless of how the preview tool proxies the request.
# Note: allow_credentials must be False with allow_origins=["*"] (CORS spec),
# which is fine because we authenticate via Authorization Bearer headers, not cookies.
# In production, only the explicitly configured origins are trusted.
if settings.debug:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ── Exception handlers ─────────────────────────────────────────────────────────


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)},
    )


@app.exception_handler(PermissionError)
async def permission_error_handler(request: Request, exc: PermissionError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": "Access denied."},
    )


# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(zakat.router, prefix="/api/v1/zakat", tags=["Zakat"])
app.include_router(nisab.router, prefix="/api/v1/nisab", tags=["Nisab"])
app.include_router(sadaqah.router, prefix="/api/v1/sadaqah", tags=["Sadaqah"])
app.include_router(screening.router, prefix="/api/v1/screening", tags=["Screening"])


# ── Health check ───────────────────────────────────────────────────────────────


@app.get("/health", tags=["Health"], include_in_schema=False)
async def health() -> dict[str, Any]:
    return {"status": "ok", "version": settings.app_version}
