"""
Database integration tests — end-to-end verification of ORM CRUD,
filter combinations, cascade operations, and data integrity.

对应 database-schema spec:
- Task 17.1: 数据库集成测试
"""

import pytest
from uuid import uuid4

from app.services.trade_service import TradeService
from app.schemas.trade import (
    TradeCreate, TradeUpdate, TradeFilters, PaginationParams, SortParams,
)
from app.models.enums import (
    AccountType, TradeCycle, PnLFlag, MarketEnvironment, ResultType, ErrorLevel,
)
from app.core.errors import TradeNotFoundError, OptimisticLockError
from tests.conftest import make_trade_data

USER_ID = "integ-test-user"
pytestmark = pytest.mark.asyncio(loop_scope="session")


class TestTradeLifecycle:
    """完整交易生命周期: 创建 → 查询 → 更新 → 软删除 → 恢复"""

    async def test_full_crud_lifecycle(self, db_session):
        svc = TradeService(db_session)
        code = f"LC{uuid4().hex[:6]}"

        # Create
        trade = await svc.create_trade(
            USER_ID,
            TradeCreate(**make_trade_data(stock_code=code)),
        )
        assert trade.stock_code == code
        assert trade.version == 1

        # Read
        fetched = await svc.get_trade_by_id(USER_ID, trade.id)
        assert fetched.id == trade.id

        # Update
        updated = await svc.update_trade(
            USER_ID, trade.id,
            TradeUpdate(version=1, exit_price=20.0, stock_name="Updated"),
        )
        assert updated.version == 2
        assert updated.exit_price == 20.0
        assert updated.stock_name == "Updated"
        assert updated.pnl_amount is not None

        # Soft Delete
        await svc.soft_delete_trade(USER_ID, trade.id)
        with pytest.raises(TradeNotFoundError):
            await svc.get_trade_by_id(USER_ID, trade.id)

        # Restore
        restored = await svc.restore_trade(USER_ID, trade.id)
        assert restored.deleted_at is None
        again = await svc.get_trade_by_id(USER_ID, trade.id)
        assert again.stock_code == code


class TestMultiFilterQueries:
    """多条件组合过滤测试"""

    async def test_filter_by_account_type_and_cycle(self, db_session):
        svc = TradeService(db_session)
        code = f"MF{uuid4().hex[:6]}"

        await svc.create_trade(USER_ID, TradeCreate(**make_trade_data(
            stock_code=code, account_type="短线账户", trade_cycle="短线",
        )))
        await svc.create_trade(USER_ID, TradeCreate(**make_trade_data(
            stock_code=code, account_type="中线账户", trade_cycle="中线",
        )))

        trades, total = await svc.get_trades(
            USER_ID,
            TradeFilters(
                stock_code=code,
                account_type=AccountType.SHORT_TERM,
                trade_cycle=TradeCycle.SHORT_TERM,
            ),
            PaginationParams(), SortParams(),
        )
        assert total >= 1
        for t in trades:
            assert t.account_type == AccountType.SHORT_TERM
            assert t.trade_cycle == TradeCycle.SHORT_TERM

    async def test_filter_by_pnl_flag(self, db_session):
        svc = TradeService(db_session)
        code = f"PF{uuid4().hex[:6]}"

        await svc.create_trade(USER_ID, TradeCreate(**make_trade_data(
            stock_code=code, entry_price=10.0, exit_price=15.0, position_size=100,
        )))
        await svc.create_trade(USER_ID, TradeCreate(**make_trade_data(
            stock_code=code, entry_price=15.0, exit_price=10.0, position_size=100,
        )))

        trades, _ = await svc.get_trades(
            USER_ID,
            TradeFilters(stock_code=code, pnl_flag=PnLFlag.PROFIT),
            PaginationParams(), SortParams(),
        )
        assert all(t.pnl_flag == PnLFlag.PROFIT for t in trades)

    async def test_filter_by_date_range(self, db_session):
        svc = TradeService(db_session)
        code = f"DR{uuid4().hex[:6]}"

        await svc.create_trade(USER_ID, TradeCreate(**make_trade_data(
            stock_code=code, entry_date="2026-01-05T09:30:00",
        )))
        await svc.create_trade(USER_ID, TradeCreate(**make_trade_data(
            stock_code=code,
            entry_date="2026-06-15T09:30:00",
            exit_date="2026-06-18T14:00:00",
        )))

        trades, total = await svc.get_trades(
            USER_ID,
            TradeFilters(
                stock_code=code,
                start_date="2026-01-01T00:00:00",
                end_date="2026-03-01T00:00:00",
            ),
            PaginationParams(), SortParams(),
        )
        assert total >= 1
        for t in trades:
            assert t.entry_date.month <= 3


class TestDataIntegrity:
    """数据完整性验证"""

    async def test_pnl_recalculated_on_update(self, db_session):
        """更新价格后 PnL 应重新计算"""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data(
            entry_price=10.0, exit_price=12.0, position_size=100,
        )))
        assert trade.pnl_amount == pytest.approx(200.0)

        updated = await svc.update_trade(
            USER_ID, trade.id,
            TradeUpdate(version=1, exit_price=8.0),
        )
        assert updated.pnl_amount == pytest.approx(-200.0)
        assert updated.pnl_flag == PnLFlag.LOSS

    async def test_version_conflict_after_multiple_updates(self, db_session):
        """多次更新后使用旧版本号应失败"""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))

        await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=1, stock_name="V2"))
        await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=2, stock_name="V3"))

        with pytest.raises(OptimisticLockError):
            await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=1, stock_name="stale"))

    async def test_user_data_isolation(self, db_session):
        """不同用户的数据互相隔离"""
        svc = TradeService(db_session)
        code = f"ISO{uuid4().hex[:6]}"
        user_a = f"user-a-{uuid4().hex[:4]}"
        user_b = f"user-b-{uuid4().hex[:4]}"

        trade_a = await svc.create_trade(user_a, TradeCreate(**make_trade_data(stock_code=code)))
        await svc.create_trade(user_b, TradeCreate(**make_trade_data(stock_code=code)))

        with pytest.raises(TradeNotFoundError):
            await svc.get_trade_by_id(user_b, trade_a.id)


class TestRulesLibraryIntegration:
    """规则库端到端验证"""

    async def test_permanent_exclusion_appears_in_rules(self, db_session):
        svc = TradeService(db_session)
        user = f"rules-{uuid4().hex[:6]}"

        await svc.create_trade(user, TradeCreate(**make_trade_data(
            permanent_exclusion_flag=True,
        )))

        exclusions = await svc.get_permanent_exclusions(user)
        assert len(exclusions) >= 1
        assert all(t.permanent_exclusion_flag for t in exclusions)

    async def test_correct_behavior_appears_in_rules(self, db_session):
        svc = TradeService(db_session)
        user = f"rules-{uuid4().hex[:6]}"

        await svc.create_trade(user, TradeCreate(**make_trade_data(
            result_type="正确盈利",
        )))

        behaviors = await svc.get_correct_behaviors(user)
        assert len(behaviors) >= 1

    async def test_environment_mismatch_appears_in_rules(self, db_session):
        svc = TradeService(db_session)
        user = f"rules-{uuid4().hex[:6]}"

        await svc.create_trade(user, TradeCreate(**make_trade_data(
            environment_mismatch_flag=True,
        )))

        mismatches = await svc.get_environment_mismatches(user)
        assert len(mismatches) >= 1

    async def test_rules_summary_counts(self, db_session):
        svc = TradeService(db_session)
        user = f"rules-sum-{uuid4().hex[:6]}"

        await svc.create_trade(user, TradeCreate(**make_trade_data(
            permanent_exclusion_flag=True, result_type="执行亏损",
            error_level="执行层错误",
        )))
        await svc.create_trade(user, TradeCreate(**make_trade_data(
            result_type="正确盈利",
        )))

        summary = await svc.get_rules_summary(user)
        assert summary["total_trades"] == 2
        assert summary["permanent_exclusions_count"] >= 1
        assert summary["correct_behaviors_count"] >= 1

    async def test_soft_deleted_excluded_from_rules(self, db_session):
        svc = TradeService(db_session)
        user = f"rules-del-{uuid4().hex[:6]}"

        trade = await svc.create_trade(user, TradeCreate(**make_trade_data(
            permanent_exclusion_flag=True,
        )))
        await svc.soft_delete_trade(user, trade.id)

        exclusions = await svc.get_permanent_exclusions(user)
        assert all(t.id != trade.id for t in exclusions)


class TestBulkOperationsIntegration:
    """批量操作集成测试"""

    async def test_bulk_create_with_pnl_variety(self, db_session):
        svc = TradeService(db_session)
        user = f"bulk-{uuid4().hex[:6]}"

        trades_data = [
            TradeCreate(**make_trade_data(
                entry_price=10.0, exit_price=15.0, position_size=100,
            )),
            TradeCreate(**make_trade_data(
                entry_price=20.0, exit_price=18.0, position_size=50,
            )),
            TradeCreate(**make_trade_data(
                entry_price=10.0, exit_price=10.0, position_size=100,
            )),
        ]

        successes, failures = await svc.bulk_create_trades(user, trades_data)
        assert len(successes) == 3
        assert len(failures) == 0

        flags = {t.pnl_flag for t in successes}
        assert PnLFlag.PROFIT in flags
        assert PnLFlag.LOSS in flags
        assert PnLFlag.BREAKEVEN in flags

    async def test_bulk_creates_independent_records(self, db_session):
        svc = TradeService(db_session)
        user = f"bulk-ind-{uuid4().hex[:6]}"

        trades_data = [
            TradeCreate(**make_trade_data(stock_code=f"BIND{i}"))
            for i in range(5)
        ]
        successes, _ = await svc.bulk_create_trades(user, trades_data)
        ids = {t.id for t in successes}
        assert len(ids) == 5
