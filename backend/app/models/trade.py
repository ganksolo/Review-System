"""
Trade ORM model — maps to the `trades` PostgreSQL table.

5 个逻辑模块:
  0. 系统、安全与日志审计
  1. 基础交易事实与风控
  2. 决策环境快照
  3. 执行与心理评估
  4. 深度归因与系统迭代
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Float,
    Index,
    Integer,
    String,
    Text,
    event,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import validates
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.sql import func

from app.models.base import Base
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


class Trade(Base):
    """
    核心交易记录模型，包含从开仓到平仓的完整复盘信息。
    支持软删除、乐观锁并发控制和 LLM 异步分析。
    """

    __tablename__ = "trades"

    # ── 模块 0: 系统、安全与日志审计 ──────────────────────────────────
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="主键，UUID v4",
    )
    user_id = Column(
        String(255),
        nullable=False,
        index=True,
        comment="用户标识",
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="记录创建时间 (UTC)",
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="记录最后更新时间 (UTC)",
    )
    deleted_at = Column(
        TIMESTAMP(timezone=True),
        nullable=True,
        comment="软删除标记时间",
    )
    version = Column(
        Integer,
        nullable=False,
        default=1,
        comment="乐观锁版本号",
    )
    llm_analysis_status = Column(
        SQLEnum(LLMAnalysisStatus, name="llm_analysis_status_enum"),
        nullable=False,
        default=LLMAnalysisStatus.PENDING,
        comment="LLM 分析状态",
    )
    llm_raw_log = Column(
        JSONB,
        nullable=True,
        comment="LLM 原始返回日志 (JSON)",
    )

    # ── 模块 1: 基础交易事实与风控 ──────────────────────────────────
    account_type = Column(
        SQLEnum(AccountType, name="account_type_enum"),
        nullable=False,
        comment="交易账户类型 (短线/中线)",
    )
    stock_code = Column(
        String(20),
        nullable=False,
        index=True,
        comment="股票代码",
    )
    stock_name = Column(
        String(100),
        nullable=True,
        comment="股票名称",
    )
    trade_cycle = Column(
        SQLEnum(TradeCycle, name="trade_cycle_enum"),
        nullable=False,
        comment="交易周期",
    )
    entry_date = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        index=True,
        comment="买入时间",
    )
    exit_date = Column(
        TIMESTAMP(timezone=True),
        nullable=True,
        comment="卖出时间",
    )
    position_size = Column(
        Float,
        nullable=False,
        comment="持仓仓位占比 (%)",
    )
    entry_price = Column(
        Float,
        nullable=False,
        comment="实际买入均价",
    )
    exit_price = Column(
        Float,
        nullable=True,
        comment="实际卖出均价",
    )
    preset_stop_loss = Column(
        Float,
        nullable=True,
        comment="预设止损价",
    )
    preset_take_profit = Column(
        Float,
        nullable=True,
        comment="预设止盈价",
    )
    slippage = Column(
        Float,
        nullable=True,
        default=0.0,
        comment="滑点/交易损耗",
    )
    max_favorable_excursion = Column(
        Float,
        nullable=True,
        comment="最大浮盈 (MFE)",
    )
    max_adverse_excursion = Column(
        Float,
        nullable=True,
        comment="最大浮亏 (MAE)",
    )
    pnl_amount = Column(
        Float,
        nullable=True,
        comment="实际盈亏金额",
    )
    pnl_ratio = Column(
        Float,
        nullable=True,
        comment="实际盈亏比例 (%)",
    )
    pnl_flag = Column(
        SQLEnum(PnLFlag, name="pnl_flag_enum"),
        nullable=True,
        comment="盈亏标识",
    )

    # ── 模块 2: 决策环境快照 ─────────────────────────────────────
    market_environment = Column(
        SQLEnum(MarketEnvironment, name="market_environment_enum"),
        nullable=True,
        index=True,
        comment="市场环境",
    )
    sector_status = Column(
        SQLEnum(SectorStatus, name="sector_status_enum"),
        nullable=True,
        comment="板块阶段",
    )
    selection_dimension = Column(
        ARRAY(String),
        nullable=True,
        comment="选股维度 (技术面/政策面/基本面/事件驱动/情绪接力)",
    )
    strategy_pattern = Column(
        ARRAY(String),
        nullable=True,
        comment="买入模式标签 (突破买入/回踩低吸/龙头首阴等)",
    )
    volume_profile = Column(
        String(500),
        nullable=True,
        comment="量能特征",
    )
    thesis_statement = Column(
        Text,
        nullable=True,
        comment="买入论点 — LLM 语义分析核心依据",
    )

    # ── 模块 3: 执行与心理评估 ──────────────────────────────────
    plan_adherence = Column(
        SQLEnum(PlanAdherence, name="plan_adherence_enum"),
        nullable=True,
        comment="计划执行度",
    )
    stop_loss_discipline = Column(
        SQLEnum(StopLossDiscipline, name="stop_loss_discipline_enum"),
        nullable=True,
        comment="止损纪律",
    )
    exit_type = Column(
        SQLEnum(ExitType, name="exit_type_enum"),
        nullable=True,
        comment="离场类型",
    )
    exit_reason = Column(
        Text,
        nullable=True,
        comment="具体卖出理由",
    )
    psychological_state = Column(
        SQLEnum(PsychologicalState, name="psychological_state_enum"),
        nullable=True,
        comment="交易时心理状态",
    )

    # ── 模块 4: 深度归因与系统迭代 ─────────────────────────────────
    result_type = Column(
        SQLEnum(ResultType, name="result_type_enum"),
        nullable=True,
        index=True,
        comment="结果类型 (正确盈利/运气盈利/执行亏损/模式亏损)",
    )
    error_level = Column(
        SQLEnum(ErrorLevel, name="error_level_enum"),
        nullable=True,
        comment="错误层级",
    )
    environment_mismatch_flag = Column(
        Boolean,
        nullable=True,
        default=False,
        comment="环境错配标记",
    )
    permanent_exclusion_flag = Column(
        Boolean,
        nullable=True,
        default=False,
        comment="永久排除标记 (绝对错误行为)",
    )
    correct_action = Column(
        Text,
        nullable=False,
        comment="对应的正确行为 (必填)",
    )
    llm_action_item = Column(
        Text,
        nullable=True,
        comment="LLM 生成的行动指令",
    )

    # ── 表级索引 ──────────────────────────────────────────────
    __table_args__ = (
        Index("idx_trades_user_deleted", "user_id", "deleted_at"),
    )

    # ── 验证器 ────────────────────────────────────────────────

    @validates("entry_price", "exit_price", "position_size")
    def validate_positive_numbers(self, key: str, value):
        """价格和仓位必须为正数"""
        if value is not None and value <= 0:
            raise ValueError(f"{key} must be positive, got {value}")
        return value

    @validates("exit_date")
    def validate_exit_after_entry(self, key: str, exit_date):
        """卖出时间必须晚于买入时间"""
        if exit_date and self.entry_date and exit_date < self.entry_date:
            raise ValueError("exit_date must be after entry_date")
        return exit_date

    @validates("correct_action")
    def validate_correct_action_not_empty(self, key: str, value: str):
        """correct_action 不能为空"""
        if not value or not value.strip():
            raise ValueError("correct_action cannot be empty")
        return value

    @validates("pnl_amount")
    def auto_set_pnl_flag(self, key: str, pnl_amount):
        """根据盈亏金额自动设置 pnl_flag"""
        if pnl_amount is not None:
            if pnl_amount > 0.01:
                self.pnl_flag = PnLFlag.PROFIT
            elif pnl_amount < -0.01:
                self.pnl_flag = PnLFlag.LOSS
            else:
                self.pnl_flag = PnLFlag.BREAKEVEN
        return pnl_amount

    # ── 软删除方法 ─────────────────────────────────────────────

    def soft_delete(self):
        """标记为已删除"""
        self.deleted_at = datetime.now(timezone.utc)

    def restore(self):
        """恢复已删除的记录"""
        self.deleted_at = None

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    # ── LLM 状态管理 ────────────────────────────────────────────

    def start_llm_analysis(self):
        """标记 LLM 分析开始"""
        self.llm_analysis_status = LLMAnalysisStatus.PROCESSING

    def complete_llm_analysis(self, raw_log: dict):
        """标记 LLM 分析完成"""
        self.llm_analysis_status = LLMAnalysisStatus.COMPLETED
        self.llm_raw_log = raw_log

    def fail_llm_analysis(self, error: dict):
        """标记 LLM 分析失败"""
        self.llm_analysis_status = LLMAnalysisStatus.FAILED
        self.llm_raw_log = error

    def __repr__(self) -> str:
        return (
            f"<Trade(id={self.id}, stock_code={self.stock_code}, "
            f"entry_date={self.entry_date}, pnl_flag={self.pnl_flag})>"
        )


# ── 事件监听: 乐观锁版本自动递增 ──────────────────────────────────

@event.listens_for(Trade, "before_update")
def increment_version(mapper, connection, target: Trade):
    """每次更新时自动递增 version"""
    target.version += 1
