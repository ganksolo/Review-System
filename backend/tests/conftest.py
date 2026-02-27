"""
Test configuration and shared fixtures.

Uses a real PostgreSQL test database (trading_review_system_test) with
async SQLAlchemy sessions. Each test function gets a fresh transaction
that is rolled back after the test.
"""

import asyncio
import os
from typing import AsyncGenerator
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Override DATABASE_URL BEFORE importing the app
TEST_DB_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://jiayulong@localhost:5432/trading_review_system",
)

from app.models.base import Base
from app.db.session import get_db
from app.main import app
from app.schemas.trade import TradeCreate


# ── Engine / Session ──────────────────────────────────────────────

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


# ── Fixtures ──────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    """Use a single event loop for all tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def setup_database():
    """Create all tables at start, drop at end."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture(loop_scope="session")
async def db_session(setup_database) -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional DB session that rolls back after each test."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(loop_scope="session")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provide an httpx AsyncClient with DB session override."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


# ── Helpers ───────────────────────────────────────────────────────

def make_trade_data(**overrides) -> dict:
    """Return a valid trade creation payload dict."""
    defaults = {
        "account_type": "短线账户",
        "stock_code": "000001",
        "stock_name": "平安银行",
        "trade_cycle": "短线",
        "entry_date": "2026-01-10T09:30:00",
        "exit_date": "2026-01-12T14:00:00",
        "entry_price": 12.50,
        "exit_price": 13.10,
        "position_size": 10,
        "correct_action": "按计划执行，在关键位置止盈",
    }
    defaults.update(overrides)
    return defaults
