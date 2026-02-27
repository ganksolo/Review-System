"""
Tests for TradeService business logic.

对应 spec:
- backend-api 6.2: Service 层逻辑
- backend-api 6.5: PnL 计算属性测试
"""

import pytest
import pytest_asyncio
from uuid import uuid4

from app.services.trade_service import TradeService
from app.schemas.trade import TradeCreate, TradeUpdate, TradeFilters, PaginationParams, SortParams
from app.models.enums import AccountType, PnLFlag, TradeCycle
from app.core.errors import TradeNotFoundError, OptimisticLockError

from tests.conftest import make_trade_data

USER_ID = "test-user"

pytestmark = pytest.mark.asyncio(loop_scope="session")


# ── Create ────────────────────────────────────────────────────────

class TestCreateTrade:

    async def test_create_with_pnl_calculation(self, db_session):
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(
            entry_price=10.0, exit_price=11.0, position_size=100
        ))
        trade = await svc.create_trade(USER_ID, data)
        assert trade.pnl_amount is not None
        assert trade.pnl_amount == pytest.approx(100.0)  # (11-10)*100
        assert trade.pnl_ratio is not None
        assert trade.pnl_flag == PnLFlag.PROFIT

    async def test_create_loss_trade(self, db_session):
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(
            entry_price=15.0, exit_price=14.0, position_size=50
        ))
        trade = await svc.create_trade(USER_ID, data)
        assert trade.pnl_amount == pytest.approx(-50.0)
        assert trade.pnl_flag == PnLFlag.LOSS

    async def test_create_breakeven_trade(self, db_session):
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(
            entry_price=10.0, exit_price=10.0, position_size=100
        ))
        trade = await svc.create_trade(USER_ID, data)
        assert trade.pnl_amount == pytest.approx(0.0)
        assert trade.pnl_flag == PnLFlag.BREAKEVEN

    async def test_create_without_exit_price_no_pnl(self, db_session):
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(exit_price=None, exit_date=None))
        trade = await svc.create_trade(USER_ID, data)
        assert trade.pnl_amount is None
        assert trade.pnl_flag is None

    async def test_initial_version_is_one(self, db_session):
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data())
        trade = await svc.create_trade(USER_ID, data)
        assert trade.version == 1

    async def test_llm_status_defaults_to_pending(self, db_session):
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data())
        trade = await svc.create_trade(USER_ID, data)
        from app.models.enums import LLMAnalysisStatus
        assert trade.llm_analysis_status == LLMAnalysisStatus.PENDING


# ── Read ──────────────────────────────────────────────────────────

class TestGetTrades:

    async def test_get_by_id(self, db_session):
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(stock_code="600001"))
        trade = await svc.create_trade(USER_ID, data)
        fetched = await svc.get_trade_by_id(USER_ID, trade.id)
        assert fetched.id == trade.id
        assert fetched.stock_code == "600001"

    async def test_get_by_id_not_found(self, db_session):
        svc = TradeService(db_session)
        with pytest.raises(TradeNotFoundError):
            await svc.get_trade_by_id(USER_ID, uuid4())

    async def test_list_with_pagination(self, db_session):
        svc = TradeService(db_session)
        # Create a few trades
        for i in range(3):
            data = TradeCreate(**make_trade_data(stock_code=f"TEST{i:03d}"))
            await svc.create_trade(USER_ID, data)

        trades, total = await svc.get_trades(
            USER_ID,
            TradeFilters(),
            PaginationParams(page=1, page_size=2),
            SortParams(),
        )
        assert len(trades) <= 2
        assert total >= 3

    async def test_filter_by_stock_code(self, db_session):
        svc = TradeService(db_session)
        code = f"FILTER{uuid4().hex[:4]}"
        data = TradeCreate(**make_trade_data(stock_code=code))
        await svc.create_trade(USER_ID, data)

        trades, total = await svc.get_trades(
            USER_ID,
            TradeFilters(stock_code=code),
            PaginationParams(),
            SortParams(),
        )
        assert total >= 1
        assert all(t.stock_code == code for t in trades)


# ── Update ────────────────────────────────────────────────────────

class TestUpdateTrade:

    async def test_optimistic_lock_success(self, db_session):
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data())
        trade = await svc.create_trade(USER_ID, data)

        update = TradeUpdate(version=1, exit_price=15.0)
        updated = await svc.update_trade(USER_ID, trade.id, update)
        assert updated.exit_price == 15.0
        assert updated.version == 2

    async def test_optimistic_lock_conflict(self, db_session):
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data())
        trade = await svc.create_trade(USER_ID, data)

        # First update succeeds
        await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=1, exit_price=15.0))

        # Second update with stale version=1 → conflict
        with pytest.raises(OptimisticLockError):
            await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=1, exit_price=16.0))


# ── Soft Delete ───────────────────────────────────────────────────

class TestSoftDelete:

    async def test_delete_and_restore(self, db_session):
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data())
        trade = await svc.create_trade(USER_ID, data)

        # Delete
        await svc.soft_delete_trade(USER_ID, trade.id)
        with pytest.raises(TradeNotFoundError):
            await svc.get_trade_by_id(USER_ID, trade.id)

        # Restore
        restored = await svc.restore_trade(USER_ID, trade.id)
        assert restored.deleted_at is None
        fetched = await svc.get_trade_by_id(USER_ID, trade.id)
        assert fetched.id == trade.id


# ── PnL Calculation Property Tests (6.5) ─────────────────────────

class TestPnLCalculation:
    """PnL 计算正确性"""

    async def test_pnl_amount_formula(self, db_session):
        """pnl = (exit - entry) * position - slippage"""
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(
            entry_price=10.0, exit_price=12.0, position_size=100, slippage=5.0,
        ))
        trade = await svc.create_trade(USER_ID, data)
        expected = (12.0 - 10.0) * 100 - 5.0  # 195.0
        assert trade.pnl_amount == pytest.approx(expected)

    async def test_pnl_ratio_formula(self, db_session):
        """pnl_ratio = pnl_amount / (entry_price * position_size) * 100"""
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(
            entry_price=10.0, exit_price=12.0, position_size=100,
        ))
        trade = await svc.create_trade(USER_ID, data)
        expected_ratio = (200.0 / (10.0 * 100)) * 100  # 200%
        assert trade.pnl_ratio == pytest.approx(expected_ratio)
