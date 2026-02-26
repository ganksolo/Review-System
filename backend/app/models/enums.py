"""
All enum type definitions for the trading review system.
Maps to PostgreSQL ENUM types via SQLAlchemy.

枚举定义遵循 .kiro/specs/database-schema/design.md 中的规范。
"""

import enum


# ---------------------------------------------------------------------------
# 模块 0: 系统、安全与日志审计
# ---------------------------------------------------------------------------

class LLMAnalysisStatus(str, enum.Enum):
    """LLM 分析状态"""
    PENDING = "Pending"        # 待分析
    PROCESSING = "Processing"  # 分析中
    COMPLETED = "Completed"    # 已完成
    FAILED = "Failed"          # 失败


# ---------------------------------------------------------------------------
# 模块 1: 基础交易事实与风控
# ---------------------------------------------------------------------------

class AccountType(str, enum.Enum):
    """交易账户类型"""
    SHORT_TERM = "短线账户"
    MEDIUM_TERM = "中线账户"


class TradeCycle(str, enum.Enum):
    """交易周期"""
    SHORT_TERM = "短线"    # 2-5 天
    MEDIUM_TERM = "中线"   # 1-4 周
    LONG_TERM = "长线"     # 1-3 个月


class PnLFlag(str, enum.Enum):
    """盈亏标识"""
    PROFIT = "盈利"
    LOSS = "亏损"
    BREAKEVEN = "保本出局"


# ---------------------------------------------------------------------------
# 模块 2: 决策环境快照
# ---------------------------------------------------------------------------

class MarketEnvironment(str, enum.Enum):
    """市场环境"""
    BULL_MAIN_RISE = "牛市-主升"
    BULL_CORRECTION = "牛市-调整"
    BEAR_MAIN_FALL = "熊市-主跌"
    BEAR_REBOUND = "熊市-反弹"
    RANGE_UPPER = "震荡市-上轨"
    RANGE_LOWER = "震荡市-下轨"
    RANGE_MIDDLE = "震荡市-中枢"


class SectorStatus(str, enum.Enum):
    """板块阶段"""
    STARTUP = "启动期"
    MAIN_RISE = "主升期"
    CLIMAX = "高潮期"
    RETREAT = "退潮期"
    CHAOS = "混沌期"


# ---------------------------------------------------------------------------
# 模块 3: 执行与心理评估
# ---------------------------------------------------------------------------

class PlanAdherence(str, enum.Enum):
    """计划执行度"""
    FULL_COMPLIANCE = "完全按计划"
    SLIGHT_DEVIATION = "轻微偏离"
    IMPULSIVE = "临盘起意冲动交易"


class StopLossDiscipline(str, enum.Enum):
    """止损纪律"""
    PRESET_AND_EXECUTED = "有预设并严格执行"
    PRESET_NOT_EXECUTED = "有预设但未执行"
    NO_PRESET = "无预设止损"


class ExitType(str, enum.Enum):
    """离场类型"""
    ACTIVE_PROFIT = "主动止盈"
    PASSIVE_STOP = "被动止损"
    BREAKEVEN_EXIT = "保本出局"
    EMOTIONAL_EXIT = "模式外情绪化离场"


class PsychologicalState(str, enum.Enum):
    """心理状态"""
    CALM = "冷静"
    FOMO = "追涨FOMO"
    GREED = "贪婪"
    FEAR = "恐惧"


# ---------------------------------------------------------------------------
# 模块 4: 深度归因与系统迭代
# ---------------------------------------------------------------------------

class ResultType(str, enum.Enum):
    """结果类型 — 区分技能 vs 运气"""
    CORRECT_PROFIT = "正确盈利"    # 保留孩子
    LUCKY_PROFIT = "运气盈利"      # 隐患警告
    EXECUTION_LOSS = "执行亏损"    # 修正执行力
    PATTERN_LOSS = "模式亏损"      # 修正模式


class ErrorLevel(str, enum.Enum):
    """错误层级"""
    EXECUTION_ERROR = "执行层错误"
    PATTERN_ERROR = "模式层错误"
    ENVIRONMENT_ERROR = "环境层错误"
