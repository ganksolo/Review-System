"""
Tests for Pydantic schemas and enum types.

对应 spec:
- database-schema 2.2: 枚举单元测试
- backend-api 6.1: Pydantic schemas 验证
"""

import pytest
from pydantic import ValidationError

from app.models.enums import (
    AccountType,
    ErrorLevel,
    ExitType,
    LLMAnalysisStatus,
    MarketEnvironment,
    PlanAdherence,
    PnLFlag,
    PsychologicalState,
    ResultType,
    SectorStatus,
    StopLossDiscipline,
    TradeCycle,
)
from app.schemas.trade import (
    PaginationParams,
    SortParams,
    TradeCreate,
    TradeFilters,
    TradeUpdate,
)


# ── Enum Tests (database-schema 2.2) ────────────────────────────

class TestEnums:
    """枚举值正确性验证"""

    def test_llm_analysis_status_values(self):
        assert LLMAnalysisStatus.PENDING.value == "Pending"
        assert LLMAnalysisStatus.PROCESSING.value == "Processing"
        assert LLMAnalysisStatus.COMPLETED.value == "Completed"
        assert LLMAnalysisStatus.FAILED.value == "Failed"

    def test_account_type_values(self):
        assert AccountType.SHORT_TERM.value == "短线账户"
        assert AccountType.MEDIUM_TERM.value == "中线账户"

    def test_trade_cycle_values(self):
        assert TradeCycle.SHORT_TERM.value == "短线"
        assert TradeCycle.MEDIUM_TERM.value == "中线"
        assert TradeCycle.LONG_TERM.value == "长线"

    def test_pnl_flag_values(self):
        assert PnLFlag.PROFIT.value == "盈利"
        assert PnLFlag.LOSS.value == "亏损"
        assert PnLFlag.BREAKEVEN.value == "保本出局"

    def test_market_environment_values(self):
        assert len(MarketEnvironment) == 7
        assert MarketEnvironment.BULL_MAIN_RISE.value == "牛市-主升"
        assert MarketEnvironment.BEAR_REBOUND.value == "熊市-反弹"

    def test_sector_status_values(self):
        assert len(SectorStatus) == 5
        assert SectorStatus.STARTUP.value == "启动期"

    def test_plan_adherence_values(self):
        assert PlanAdherence.FULL_COMPLIANCE.value == "完全按计划"
        assert PlanAdherence.IMPULSIVE.value == "临盘起意冲动交易"

    def test_stop_loss_discipline_values(self):
        assert StopLossDiscipline.PRESET_AND_EXECUTED.value == "有预设并严格执行"
        assert StopLossDiscipline.NO_PRESET.value == "无预设止损"

    def test_exit_type_values(self):
        assert len(ExitType) == 4
        assert ExitType.ACTIVE_PROFIT.value == "主动止盈"

    def test_psychological_state_values(self):
        assert PsychologicalState.CALM.value == "冷静"
        assert PsychologicalState.FOMO.value == "追涨FOMO"

    def test_result_type_values(self):
        assert ResultType.CORRECT_PROFIT.value == "正确盈利"
        assert ResultType.LUCKY_PROFIT.value == "运气盈利"
        assert ResultType.EXECUTION_LOSS.value == "执行亏损"
        assert ResultType.PATTERN_LOSS.value == "模式亏损"

    def test_error_level_values(self):
        assert ErrorLevel.EXECUTION_ERROR.value == "执行层错误"
        assert ErrorLevel.PATTERN_ERROR.value == "模式层错误"
        assert ErrorLevel.ENVIRONMENT_ERROR.value == "环境层错误"

    def test_all_enums_are_str_subclass(self):
        """所有枚举都继承 str，可直接用字符串比较"""
        for enum_cls in [
            AccountType, TradeCycle, PnLFlag, MarketEnvironment,
            SectorStatus, PlanAdherence, StopLossDiscipline,
            ExitType, PsychologicalState, ResultType, ErrorLevel,
            LLMAnalysisStatus,
        ]:
            for member in enum_cls:
                assert isinstance(member, str)


# ── Schema Tests (backend-api 6.1) ─────────────────────────────

class TestTradeCreate:
    """TradeCreate Pydantic schema 验证"""

    def test_valid_minimal(self):
        data = TradeCreate(
            account_type=AccountType.SHORT_TERM,
            stock_code="000001",
            trade_cycle=TradeCycle.SHORT_TERM,
            entry_date="2026-01-10T09:30:00",
            entry_price=12.50,
            position_size=10,
            correct_action="按计划执行",
        )
        assert data.stock_code == "000001"
        assert data.entry_price == 12.50

    def test_missing_required_field(self):
        with pytest.raises(ValidationError) as exc_info:
            TradeCreate(
                account_type=AccountType.SHORT_TERM,
                stock_code="000001",
                trade_cycle=TradeCycle.SHORT_TERM,
                entry_date="2026-01-10T09:30:00",
                entry_price=12.50,
                position_size=10,
                # correct_action 缺失
            )
        assert "correct_action" in str(exc_info.value)

    def test_empty_stock_code_rejected(self):
        with pytest.raises(ValidationError):
            TradeCreate(
                account_type=AccountType.SHORT_TERM,
                stock_code="",  # 空字符串
                trade_cycle=TradeCycle.SHORT_TERM,
                entry_date="2026-01-10T09:30:00",
                entry_price=12.50,
                position_size=10,
                correct_action="按计划执行",
            )

    def test_exit_date_before_entry_date_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            TradeCreate(
                account_type=AccountType.SHORT_TERM,
                stock_code="000001",
                trade_cycle=TradeCycle.SHORT_TERM,
                entry_date="2026-01-12T09:30:00",
                exit_date="2026-01-10T14:00:00",  # 早于 entry
                entry_price=12.50,
                position_size=10,
                correct_action="按计划执行",
            )
        assert "exit_date" in str(exc_info.value).lower() or "日期" in str(exc_info.value)

    def test_optional_fields_default_none(self):
        data = TradeCreate(
            account_type=AccountType.SHORT_TERM,
            stock_code="000001",
            trade_cycle=TradeCycle.SHORT_TERM,
            entry_date="2026-01-10T09:30:00",
            entry_price=12.50,
            position_size=10,
            correct_action="按计划执行",
        )
        assert data.exit_price is None
        assert data.market_environment is None
        assert data.thesis_statement is None


class TestTradeUpdate:
    """TradeUpdate schema 验证"""

    def test_partial_update_with_version(self):
        data = TradeUpdate(version=1, exit_price=14.00)
        assert data.version == 1
        assert data.exit_price == 14.00
        assert data.stock_code is None  # 其他未填字段为 None

    def test_version_required(self):
        with pytest.raises(ValidationError):
            TradeUpdate(exit_price=14.00)  # 缺少 version


class TestPaginationParams:

    def test_defaults(self):
        p = PaginationParams()
        assert p.page == 1
        assert p.page_size == 20

    def test_page_size_max(self):
        with pytest.raises(ValidationError):
            PaginationParams(page_size=200)  # max is 100


class TestSortParams:

    def test_invalid_order(self):
        with pytest.raises(ValidationError):
            SortParams(order="invalid")
