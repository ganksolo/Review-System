"""
Pydantic schemas for Trade API request/response validation.

所有枚举引用自 app/models/enums.py（database-schema 中定义的唯一数据源）。
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import (
    AccountType,
    ErrorLevel,
    ExitType,
    MarketEnvironment,
    PlanAdherence,
    PnLFlag,
    PsychologicalState,
    ResultType,
    SectorStatus,
    StopLossDiscipline,
    TradeCycle,
)


# ── 创建请求 ────────────────────────────────────────────────────────


class TradeCreate(BaseModel):
    """创建交易记录请求 — 对应 PRD 中的四步表单提交"""

    # 模块 1: 基础交易事实
    account_type: AccountType
    stock_code: str = Field(min_length=1, max_length=20)
    stock_name: Optional[str] = Field(None, max_length=100)
    trade_cycle: TradeCycle
    entry_date: datetime
    exit_date: Optional[datetime] = None
    position_size: float = Field(gt=0, le=100, description="仓位占比 (%)")
    entry_price: float = Field(gt=0)
    exit_price: Optional[float] = Field(None, gt=0)
    preset_stop_loss: Optional[float] = None
    preset_take_profit: Optional[float] = None
    slippage: Optional[float] = Field(None, ge=0)
    max_favorable_excursion: Optional[float] = None
    max_adverse_excursion: Optional[float] = None

    # 模块 2: 决策环境快照
    market_environment: Optional[MarketEnvironment] = None
    sector_status: Optional[SectorStatus] = None
    selection_dimension: Optional[List[str]] = None
    strategy_pattern: Optional[List[str]] = None
    volume_profile: Optional[str] = Field(None, max_length=500)
    thesis_statement: Optional[str] = None

    # 模块 3: 执行与心理评估
    plan_adherence: Optional[PlanAdherence] = None
    stop_loss_discipline: Optional[StopLossDiscipline] = None
    exit_type: Optional[ExitType] = None
    exit_reason: Optional[str] = None
    psychological_state: Optional[PsychologicalState] = None

    # 模块 4: 深度归因
    result_type: Optional[ResultType] = None
    error_level: Optional[ErrorLevel] = None
    environment_mismatch_flag: Optional[bool] = False
    permanent_exclusion_flag: Optional[bool] = False
    correct_action: str = Field(min_length=1, description="正确行为（必填）")

    @model_validator(mode="after")
    def validate_dates(self) -> "TradeCreate":
        if self.exit_date and self.entry_date:
            if self.exit_date < self.entry_date:
                raise ValueError(
                    "exit_date（卖出时间）必须晚于 entry_date（买入时间）"
                )
        return self


# ── 更新请求 ────────────────────────────────────────────────────────


class TradeUpdate(BaseModel):
    """部分更新请求 — 所有字段可选，附带 version 用于乐观锁"""

    account_type: Optional[AccountType] = None
    stock_code: Optional[str] = Field(None, min_length=1, max_length=20)
    stock_name: Optional[str] = None
    trade_cycle: Optional[TradeCycle] = None
    entry_date: Optional[datetime] = None
    exit_date: Optional[datetime] = None
    position_size: Optional[float] = Field(None, gt=0, le=100)
    entry_price: Optional[float] = Field(None, gt=0)
    exit_price: Optional[float] = Field(None, gt=0)
    preset_stop_loss: Optional[float] = None
    preset_take_profit: Optional[float] = None
    slippage: Optional[float] = None
    max_favorable_excursion: Optional[float] = None
    max_adverse_excursion: Optional[float] = None
    market_environment: Optional[MarketEnvironment] = None
    sector_status: Optional[SectorStatus] = None
    selection_dimension: Optional[List[str]] = None
    strategy_pattern: Optional[List[str]] = None
    volume_profile: Optional[str] = None
    thesis_statement: Optional[str] = None
    plan_adherence: Optional[PlanAdherence] = None
    stop_loss_discipline: Optional[StopLossDiscipline] = None
    exit_type: Optional[ExitType] = None
    exit_reason: Optional[str] = None
    psychological_state: Optional[PsychologicalState] = None
    result_type: Optional[ResultType] = None
    error_level: Optional[ErrorLevel] = None
    environment_mismatch_flag: Optional[bool] = None
    permanent_exclusion_flag: Optional[bool] = None
    correct_action: Optional[str] = Field(None, min_length=1)

    # 乐观锁
    version: int = Field(description="当前版本号，用于并发控制")


# ── 响应模型 ────────────────────────────────────────────────────────


class TradeResponse(BaseModel):
    """交易记录响应模型 — 包含系统自动管理的字段"""

    # 模块 0: 系统字段
    id: UUID
    user_id: str
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    version: int
    llm_analysis_status: str
    llm_raw_log: Optional[dict] = None

    # 模块 1: 基础交易事实
    account_type: str
    stock_code: str
    stock_name: Optional[str] = None
    trade_cycle: str
    entry_date: datetime
    exit_date: Optional[datetime] = None
    position_size: float
    entry_price: float
    exit_price: Optional[float] = None
    preset_stop_loss: Optional[float] = None
    preset_take_profit: Optional[float] = None
    slippage: Optional[float] = None
    max_favorable_excursion: Optional[float] = None
    max_adverse_excursion: Optional[float] = None
    pnl_amount: Optional[float] = None
    pnl_ratio: Optional[float] = None
    pnl_flag: Optional[str] = None

    # 模块 2: 决策环境快照
    market_environment: Optional[str] = None
    sector_status: Optional[str] = None
    selection_dimension: Optional[List[str]] = None
    strategy_pattern: Optional[List[str]] = None
    volume_profile: Optional[str] = None
    thesis_statement: Optional[str] = None

    # 模块 3: 执行与心理评估
    plan_adherence: Optional[str] = None
    stop_loss_discipline: Optional[str] = None
    exit_type: Optional[str] = None
    exit_reason: Optional[str] = None
    psychological_state: Optional[str] = None

    # 模块 4: 深度归因
    result_type: Optional[str] = None
    error_level: Optional[str] = None
    environment_mismatch_flag: Optional[bool] = None
    permanent_exclusion_flag: Optional[bool] = None
    correct_action: str
    llm_action_item: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ── 查询参数 ────────────────────────────────────────────────────────


class TradeFilters(BaseModel):
    """查询过滤参数"""

    stock_code: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    market_environment: Optional[MarketEnvironment] = None
    result_type: Optional[ResultType] = None
    pnl_flag: Optional[PnLFlag] = None
    account_type: Optional[AccountType] = None
    trade_cycle: Optional[TradeCycle] = None


class PaginationParams(BaseModel):
    """分页参数"""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class SortParams(BaseModel):
    """排序参数"""

    sort_by: str = Field(default="entry_date")
    order: str = Field(default="desc", pattern="^(asc|desc)$")


# ── 批量操作 ────────────────────────────────────────────────────────


class BulkCreateRequest(BaseModel):
    """批量创建请求"""

    trades: List[TradeCreate]


class BulkCreateResponse(BaseModel):
    """批量创建响应"""

    success_count: int
    failure_count: int
    successes: List[TradeResponse]
    failures: List[Dict]


# ── 规则库响应 ──────────────────────────────────────────────────────


class RulesSummary(BaseModel):
    """规则库汇总统计"""

    total_trades: int
    permanent_exclusions_count: int
    correct_behaviors_count: int
    environment_mismatches_count: int
    execution_errors_count: int
    pattern_errors_count: int
    environment_errors_count: int
