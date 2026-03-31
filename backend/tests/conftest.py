"""
Test configuration and shared fixtures.

Uses an in-memory SQLite database so tests run without Docker.
SQLAlchemy async with SQLite requires aiosqlite: pip install aiosqlite
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.middleware.auth import get_current_user_id

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
TEST_USER_ID = "00000000-0000-0000-0000-000000000001"


@pytest_asyncio.fixture(scope="function")
async def db_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    """
    AsyncClient with overridden dependencies:
      - Database uses the in-memory test session
      - Auth always returns TEST_USER_ID (no real JWT needed)
    """

    async def override_db():
        yield db_session

    async def override_auth():
        return TEST_USER_ID

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user_id] = override_auth

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
