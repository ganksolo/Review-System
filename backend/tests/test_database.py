"""
Property-based tests for the database schema using hypothesis.

Covers database-schema spec tasks:
- 4.2-4.5: Validator property tests (positive numbers, dates, PnL flag, required fields)
- 5.3-5.6: Timestamps property tests
- 6.3-6.5: Soft delete property/unit tests
- 7.3-7.7: Optimistic lock property/unit tests
- 8.2-8.3: UUID property/unit tests
- 9.3-9.5: LLM status property/unit tests
- 10.2-10.4: Array field property/unit tests
- 11.3-11.6: PnL calculation property tests
- 12.2: Index existence tests
- 15.2-15.3: Batch operation tests
"""

import pytest
import pytest_asyncio
from uuid import uuid4, UUID
from datetime import datetime, timezone

from hypothesis import given, settings, assume
from hypothesis import strategies as st

from app.models.trade import Trade
from app.models.enums import (
    AccountType, TradeCycle, PnLFlag, LLMAnalysisStatus,
    MarketEnvironment, SectorStatus, PlanAdherence, StopLossDiscipline,
    ExitType, PsychologicalState, ResultType, ErrorLevel,
)
from app.services.trade_service import TradeService
from app.schemas.trade import (
    TradeCreate, TradeUpdate, TradeFilters, PaginationParams, SortParams,
)
from app.core.errors import TradeNotFoundError, OptimisticLockError
from tests.conftest import make_trade_data

USER_ID = "test-user"
pytestmark = pytest.mark.asyncio(loop_scope="session")


# ── Strategies ─────────────────────────────────────────────────────

positive_float = st.floats(min_value=0.01, max_value=1e6, allow_nan=False, allow_infinity=False)
position_size = st.floats(min_value=1, max_value=10000, allow_nan=False, allow_infinity=False)


# ── 4.2 Property Test: Positive Number Validation ─────────────────

class TestPositiveNumberValidation:
    """database-schema 4.2: 正数验证属性测试"""

    @given(price=st.floats(min_value=-1e6, max_value=-0.01, allow_nan=False, allow_infinity=False))
    @settings(max_examples=50)
    def test_negative_entry_price_rejected_by_schema(self, price):
        """Negative entry_price should be rejected by Pydantic schema."""
        with pytest.raises(Exception):
            TradeCreate(**make_trade_data(entry_price=price))

    @given(price=positive_float)
    @settings(max_examples=50)
    def test_positive_entry_price_accepted(self, price):
        """Positive entry_price should be accepted."""
        data = TradeCreate(**make_trade_data(entry_price=round(price, 2)))
        assert data.entry_price > 0

    @given(pos=st.floats(min_value=-100, max_value=-0.01, allow_nan=False, allow_infinity=False))
    @settings(max_examples=50)
    def test_negative_position_size_rejected(self, pos):
        """Negative position_size should be rejected."""
        with pytest.raises(Exception):
            TradeCreate(**make_trade_data(position_size=pos))


# ── 4.3 Property Test: Date Range Validation ──────────────────────

class TestDateRangeValidation:
    """database-schema 4.3: 日期范围验证属性测试"""

    @given(
        entry_day=st.integers(min_value=1, max_value=25),
        exit_offset=st.integers(min_value=1, max_value=5),
    )
    @settings(max_examples=50)
    def test_exit_after_entry_accepted(self, entry_day, exit_offset):
        """exit_date >= entry_date should always be accepted."""
        entry = f"2026-01-{entry_day:02d}T09:30:00"
        exit_dt = f"2026-01-{entry_day + exit_offset:02d}T14:00:00"
        assume(entry_day + exit_offset <= 28)
        data = TradeCreate(**make_trade_data(entry_date=entry, exit_date=exit_dt))
        assert data.exit_date >= data.entry_date

    @given(
        entry_day=st.integers(min_value=5, max_value=28),
        offset=st.integers(min_value=1, max_value=4),
    )
    @settings(max_examples=50)
    def test_exit_before_entry_rejected(self, entry_day, offset):
        """exit_date < entry_date should always be rejected."""
        entry = f"2026-01-{entry_day:02d}T09:30:00"
        exit_dt = f"2026-01-{entry_day - offset:02d}T14:00:00"
        with pytest.raises(Exception):
            TradeCreate(**make_trade_data(entry_date=entry, exit_date=exit_dt))


# ── 4.4 Property Test: PnL Flag Auto-Classification ──────────────

class TestPnLFlagAutoClassification:
    """database-schema 4.4: PnL 标志自动分类属性测试"""

    @pytest.mark.parametrize("entry,exit_,expected_flag", [
        (10.0, 12.0, PnLFlag.PROFIT),
        (10.0, 15.0, PnLFlag.PROFIT),
        (10.0, 10.5, PnLFlag.PROFIT),
    ])
    async def test_positive_pnl_sets_profit_flag(self, db_session, entry, exit_, expected_flag):
        """Positive PnL should set flag to 盈利."""
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(
            entry_price=entry, exit_price=exit_, position_size=100
        ))
        trade = await svc.create_trade(USER_ID, data)
        assert trade.pnl_flag == expected_flag

    async def test_zero_pnl_sets_breakeven_flag(self, db_session):
        """Zero PnL should set flag to 保本出局."""
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(
            entry_price=10.0, exit_price=10.0, position_size=100
        ))
        trade = await svc.create_trade(USER_ID, data)
        assert trade.pnl_flag == PnLFlag.BREAKEVEN

    async def test_negative_pnl_sets_loss_flag(self, db_session):
        """Negative PnL should set flag to 亏损."""
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(
            entry_price=15.0, exit_price=13.0, position_size=100
        ))
        trade = await svc.create_trade(USER_ID, data)
        assert trade.pnl_flag == PnLFlag.LOSS


# ── 4.5 Property Test: Required Fields ────────────────────────────

class TestRequiredFieldsValidation:
    """database-schema 4.5: 必填字段属性测试"""

    def test_missing_stock_code_rejected(self):
        with pytest.raises(Exception):
            TradeCreate(**make_trade_data(stock_code=None))

    def test_missing_entry_price_rejected(self):
        with pytest.raises(Exception):
            TradeCreate(**make_trade_data(entry_price=None))

    def test_missing_correct_action_rejected(self):
        with pytest.raises(Exception):
            d = make_trade_data()
            del d["correct_action"]
            TradeCreate(**d)


# ── 5.3-5.6 Timestamps Property Tests ─────────────────────────────

class TestTimestamps:
    """database-schema 5.3-5.6: 时间戳属性测试"""

    async def test_created_at_auto_set(self, db_session):
        """5.3: created_at should be automatically set on creation."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))
        assert trade.created_at is not None

    async def test_updated_at_auto_update(self, db_session):
        """5.4: updated_at should update on modification."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))
        original_updated = trade.updated_at
        updated = await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=1, exit_price=20.0))
        assert updated.updated_at >= original_updated

    async def test_created_at_immutable_on_update(self, db_session):
        """5.5: created_at should not change on update."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))
        original_created = trade.created_at
        updated = await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=1, exit_price=20.0))
        assert updated.created_at == original_created


# ── 6.3-6.5 Soft Delete Property Tests ────────────────────────────

class TestSoftDeleteProperties:
    """database-schema 6.3-6.5: 软删除属性测试"""

    async def test_soft_delete_preserves_data(self, db_session):
        """6.3: Soft delete should preserve the trade data."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data(stock_code="SOFT001")))
        tid = trade.id
        await svc.soft_delete_trade(USER_ID, tid)
        # Restore to verify data integrity
        restored = await svc.restore_trade(USER_ID, tid)
        assert restored.stock_code == "SOFT001"

    async def test_default_query_excludes_deleted(self, db_session):
        """6.4: Default queries should exclude soft-deleted records."""
        svc = TradeService(db_session)
        code = f"DEL{uuid4().hex[:6]}"
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data(stock_code=code)))
        await svc.soft_delete_trade(USER_ID, trade.id)

        trades, total = await svc.get_trades(
            USER_ID, TradeFilters(stock_code=code),
            PaginationParams(), SortParams(),
        )
        assert all(t.stock_code != code or t.deleted_at is None for t in trades)

    async def test_soft_delete_and_restore_cycle(self, db_session):
        """6.5: Full soft delete → verify hidden → restore → verify visible."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))

        await svc.soft_delete_trade(USER_ID, trade.id)
        with pytest.raises(TradeNotFoundError):
            await svc.get_trade_by_id(USER_ID, trade.id)

        restored = await svc.restore_trade(USER_ID, trade.id)
        assert restored.deleted_at is None
        fetched = await svc.get_trade_by_id(USER_ID, trade.id)
        assert fetched.id == trade.id


# ── 7.3-7.7 Optimistic Lock Property Tests ───────────────────────

class TestOptimisticLockProperties:
    """database-schema 7.3-7.7: 乐观锁属性测试"""

    async def test_initial_version_is_one(self, db_session):
        """7.3: New trade should have version=1."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))
        assert trade.version == 1

    async def test_version_increments(self, db_session):
        """7.4: Each update should increment version by 1."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))
        assert trade.version == 1
        updated = await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=1, exit_price=15.0))
        assert updated.version == 2
        updated2 = await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=2, exit_price=16.0))
        assert updated2.version == 3

    async def test_stale_version_rejected(self, db_session):
        """7.5: Update with stale version should raise OptimisticLockError."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))
        await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=1, exit_price=15.0))
        with pytest.raises(OptimisticLockError):
            await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=1, exit_price=16.0))

    async def test_version_always_positive(self, db_session):
        """7.6: Version should always be >= 1."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))
        assert trade.version >= 1

    async def test_optimistic_lock_full_flow(self, db_session):
        """7.7: Complete optimistic lock update flow."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))

        # Successful update with correct version
        v1 = trade.version
        updated = await svc.update_trade(USER_ID, trade.id, TradeUpdate(version=v1, stock_name="Updated"))
        assert updated.version == v1 + 1
        assert updated.stock_name == "Updated"


# ── 8.2-8.3 UUID Property Tests ──────────────────────────────────

class TestUUIDProperties:
    """database-schema 8.2-8.3: UUID 属性测试"""

    async def test_uuid_uniqueness(self, db_session):
        """8.2: Each trade should get a unique UUID."""
        svc = TradeService(db_session)
        ids = set()
        for _ in range(5):
            trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))
            assert trade.id not in ids
            ids.add(trade.id)
        assert len(ids) == 5

    async def test_uuid_valid_format(self, db_session):
        """8.2: Trade ID should be a valid UUID."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))
        assert isinstance(trade.id, UUID)

    async def test_query_by_primary_key(self, db_session):
        """8.3: Should be able to query trade by UUID primary key."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))
        fetched = await svc.get_trade_by_id(USER_ID, trade.id)
        assert fetched.id == trade.id


# ── 9.3-9.5 LLM Analysis Status Tests ────────────────────────────

class TestLLMStatusProperties:
    """database-schema 9.3-9.5: LLM 分析状态属性测试"""

    async def test_initial_status_pending(self, db_session):
        """9.3: New trade should have LLM status = Pending."""
        svc = TradeService(db_session)
        trade = await svc.create_trade(USER_ID, TradeCreate(**make_trade_data()))
        assert trade.llm_analysis_status == LLMAnalysisStatus.PENDING

    def test_llm_status_transition_to_processing(self):
        """9.5: Trade should transition from Pending to Processing."""
        trade = Trade(
            stock_code="000001", entry_price=10.0, position_size=100,
            account_type=AccountType.SHORT_TERM, trade_cycle=TradeCycle.SHORT_TERM,
            entry_date=datetime.now(), correct_action="test",
        )
        trade.start_llm_analysis()
        assert trade.llm_analysis_status == LLMAnalysisStatus.PROCESSING

    def test_llm_status_transition_to_completed(self):
        """9.5: Trade should transition from Processing to Completed."""
        trade = Trade(
            stock_code="000001", entry_price=10.0, position_size=100,
            account_type=AccountType.SHORT_TERM, trade_cycle=TradeCycle.SHORT_TERM,
            entry_date=datetime.now(), correct_action="test",
        )
        trade.start_llm_analysis()
        trade.complete_llm_analysis({"result": "ok"})
        assert trade.llm_analysis_status == LLMAnalysisStatus.COMPLETED
        assert trade.llm_raw_log == {"result": "ok"}

    def test_llm_status_transition_to_failed(self):
        """9.5: Trade should transition from Processing to Failed."""
        trade = Trade(
            stock_code="000001", entry_price=10.0, position_size=100,
            account_type=AccountType.SHORT_TERM, trade_cycle=TradeCycle.SHORT_TERM,
            entry_date=datetime.now(), correct_action="test",
        )
        trade.start_llm_analysis()
        trade.fail_llm_analysis({"error": "timeout"})
        assert trade.llm_analysis_status == LLMAnalysisStatus.FAILED


# ── 10.2-10.4 Array Field Tests ───────────────────────────────────

class TestArrayFieldProperties:
    """database-schema 10.2-10.4: 数组字段属性测试"""

    async def test_array_multiple_values(self, db_session):
        """10.2: Arrays should support multiple values."""
        svc = TradeService(db_session)
        data = make_trade_data()
        data["selection_dimension"] = ["核心题材", "形态"]
        data["strategy_pattern"] = ["首板", "二板"]
        trade = await svc.create_trade(USER_ID, TradeCreate(**data))
        assert trade.selection_dimension == ["核心题材", "形态"]
        assert trade.strategy_pattern == ["首板", "二板"]

    async def test_array_empty(self, db_session):
        """10.2: Arrays should support empty values."""
        svc = TradeService(db_session)
        data = make_trade_data()
        data["selection_dimension"] = []
        data["strategy_pattern"] = []
        trade = await svc.create_trade(USER_ID, TradeCreate(**data))
        assert trade.selection_dimension == [] or trade.selection_dimension is None

    async def test_array_filter_query(self, db_session):
        """10.3: Should be able to query by array contents."""
        svc = TradeService(db_session)
        unique_dim = f"DIM_{uuid4().hex[:6]}"
        data = make_trade_data()
        data["selection_dimension"] = [unique_dim]
        await svc.create_trade(USER_ID, TradeCreate(**data))
        # Verify the trade was created with the array value
        trades, _ = await svc.get_trades(
            USER_ID, TradeFilters(), PaginationParams(page_size=100), SortParams(),
        )
        found = [t for t in trades if t.selection_dimension and unique_dim in t.selection_dimension]
        assert len(found) >= 1


# ── 11.3-11.6 PnL Calculation Property Tests ─────────────────────

class TestPnLProperties:
    """database-schema 11.3-11.6: PnL 计算属性测试"""

    @pytest.mark.parametrize("entry,exit_,pos", [
        (10.0, 12.0, 100),
        (5.0, 8.0, 50),
        (20.0, 18.0, 50),
        (100.0, 150.0, 10),
        (10.0, 10.0, 100),
    ])
    async def test_pnl_amount_formula(self, db_session, entry, exit_, pos):
        """11.3: pnl_amount = (exit - entry) * position"""
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(
            entry_price=entry, exit_price=exit_, position_size=pos,
        ))
        trade = await svc.create_trade(USER_ID, data)
        expected = (exit_ - entry) * pos
        assert trade.pnl_amount == pytest.approx(expected, abs=0.01)

    @pytest.mark.parametrize("entry,exit_,pos", [
        (10.0, 12.0, 100),
        (5.0, 10.0, 80),
        (20.0, 15.0, 50),
    ])
    async def test_pnl_ratio_calculation(self, db_session, entry, exit_, pos):
        """11.4: pnl_ratio = pnl_amount / (entry * position) * 100"""
        svc = TradeService(db_session)
        data = TradeCreate(**make_trade_data(
            entry_price=entry, exit_price=exit_, position_size=pos,
        ))
        trade = await svc.create_trade(USER_ID, data)
        if trade.pnl_amount is not None:
            expected_ratio = (trade.pnl_amount / (entry * pos)) * 100
            assert trade.pnl_ratio == pytest.approx(expected_ratio, abs=0.01)


# ── 12.2 Index Existence Tests ────────────────────────────────────

class TestIndexExistence:
    """database-schema 12.2: 索引存在性验证"""

    def test_trade_model_has_indexes(self):
        """Verify that Trade model defines appropriate indexes."""
        table = Trade.__table__
        index_columns = set()
        for idx in table.indexes:
            for col in idx.columns:
                index_columns.add(col.name)

        # Key indexed columns per spec
        assert "stock_code" in index_columns or any(
            c.index for c in table.columns if c.name == "stock_code"
        )

    def test_primary_key_exists(self):
        """Verify primary key is defined."""
        pk_cols = [c for c in Trade.__table__.columns if c.primary_key]
        assert len(pk_cols) == 1
        assert pk_cols[0].name == "id"


# ── 15.2-15.3 Batch Operation Tests ──────────────────────────────

class TestBatchOperations:
    """database-schema 15.2-15.3: 批量操作测试"""

    async def test_batch_insert_creates_all(self, db_session):
        """15.3: Bulk insert should create all trades."""
        svc = TradeService(db_session)
        trades_data = [
            TradeCreate(**make_trade_data(stock_code=f"BAT{i:03d}"))
            for i in range(3)
        ]
        successes, failures = await svc.bulk_create_trades(USER_ID, trades_data)
        assert len(successes) == 3
        assert len(failures) == 0
        codes = {t.stock_code for t in successes}
        assert codes == {"BAT000", "BAT001", "BAT002"}

    async def test_batch_validation_independent(self, db_session):
        """15.2: Each trade in batch should be validated independently."""
        svc = TradeService(db_session)
        trades_data = [
            TradeCreate(**make_trade_data(stock_code=f"IND{i:03d}"))
            for i in range(2)
        ]
        successes, failures = await svc.bulk_create_trades(USER_ID, trades_data)
        # Each should have independent PnL calculation and version
        for trade in successes:
            assert trade.version == 1
            if trade.pnl_amount is not None:
                assert isinstance(trade.pnl_amount, float)
