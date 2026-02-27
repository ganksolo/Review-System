/**
 * TypeScript type definitions for Trade entities.
 * Must match backend Pydantic schemas and Python enums (中文 values).
 */

// ── 枚举值（与后端 Python 枚举一致）──────────────────────────────

export const ACCOUNT_TYPES = ["短线账户", "中线账户"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const TRADE_CYCLES = ["短线", "中线", "长线"] as const;
export type TradeCycle = (typeof TRADE_CYCLES)[number];

export const PNL_FLAGS = ["盈利", "亏损", "保本出局"] as const;
export type PnLFlag = (typeof PNL_FLAGS)[number];

export const MARKET_ENVIRONMENTS = [
  "牛市-主升", "牛市-调整", "熊市-主跌", "熊市-反弹",
  "震荡市-上轨", "震荡市-下轨", "震荡市-中枢",
] as const;
export type MarketEnvironment = (typeof MARKET_ENVIRONMENTS)[number];

export const SECTOR_STATUSES = ["启动期", "主升期", "高潮期", "退潮期", "混沌期"] as const;
export type SectorStatus = (typeof SECTOR_STATUSES)[number];

export const PLAN_ADHERENCES = ["完全按计划", "轻微偏离", "临盘起意冲动交易"] as const;
export type PlanAdherence = (typeof PLAN_ADHERENCES)[number];

export const STOP_LOSS_DISCIPLINES = [
  "有预设并严格执行", "有预设但未执行", "无预设止损",
] as const;
export type StopLossDiscipline = (typeof STOP_LOSS_DISCIPLINES)[number];

export const EXIT_TYPES = ["主动止盈", "被动止损", "保本出局", "模式外情绪化离场"] as const;
export type ExitType = (typeof EXIT_TYPES)[number];

export const PSYCHOLOGICAL_STATES = ["冷静", "追涨FOMO", "贪婪", "恐惧"] as const;
export type PsychologicalState = (typeof PSYCHOLOGICAL_STATES)[number];

export const RESULT_TYPES = ["正确盈利", "运气盈利", "执行亏损", "模式亏损"] as const;
export type ResultType = (typeof RESULT_TYPES)[number];

export const ERROR_LEVELS = ["执行层错误", "模式层错误", "环境层错误"] as const;
export type ErrorLevel = (typeof ERROR_LEVELS)[number];

export const SELECTION_DIMENSIONS = ["技术面", "政策面", "基本面", "事件驱动", "情绪接力"] as const;

export const STRATEGY_PATTERNS = [
  "突破买入", "回踩低吸", "龙头首阴", "打板追涨", "均线支撑",
] as const;

// ── Trade 实体 ─────────────────────────────────────────────────

export interface Trade {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  llm_analysis_status: string;
  llm_raw_log: Record<string, unknown> | null;

  account_type: string;
  stock_code: string;
  stock_name: string | null;
  trade_cycle: string;
  entry_date: string;
  exit_date: string | null;
  position_size: number;
  entry_price: number;
  exit_price: number | null;
  preset_stop_loss: number | null;
  preset_take_profit: number | null;
  slippage: number | null;
  max_favorable_excursion: number | null;
  max_adverse_excursion: number | null;
  pnl_amount: number | null;
  pnl_ratio: number | null;
  pnl_flag: string | null;

  market_environment: string | null;
  sector_status: string | null;
  selection_dimension: string[] | null;
  strategy_pattern: string[] | null;
  volume_profile: string | null;
  thesis_statement: string | null;

  plan_adherence: string | null;
  stop_loss_discipline: string | null;
  exit_type: string | null;
  exit_reason: string | null;
  psychological_state: string | null;

  result_type: string | null;
  error_level: string | null;
  environment_mismatch_flag: boolean | null;
  permanent_exclusion_flag: boolean | null;
  correct_action: string;
  llm_action_item: string | null;
}

// ── API 响应类型 ───────────────────────────────────────────────

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: { code: string; details?: unknown };
}

export interface PaginationInfo {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationInfo;
  message: string;
}

export interface RulesSummary {
  total_trades: number;
  permanent_exclusions_count: number;
  correct_behaviors_count: number;
  environment_mismatches_count: number;
  execution_errors_count: number;
  pattern_errors_count: number;
  environment_errors_count: number;
}

// ── 创建/更新请求类型 ─────────────────────────────────────────

export interface TradeCreateData {
  account_type: AccountType;
  stock_code: string;
  stock_name?: string;
  trade_cycle: TradeCycle;
  entry_date: string;
  exit_date?: string;
  position_size: number;
  entry_price: number;
  exit_price?: number;
  preset_stop_loss?: number;
  preset_take_profit?: number;
  slippage?: number;
  max_favorable_excursion?: number;
  max_adverse_excursion?: number;
  market_environment?: MarketEnvironment;
  sector_status?: SectorStatus;
  selection_dimension?: string[];
  strategy_pattern?: string[];
  volume_profile?: string;
  thesis_statement?: string;
  plan_adherence?: PlanAdherence;
  stop_loss_discipline?: StopLossDiscipline;
  exit_type?: ExitType;
  exit_reason?: string;
  psychological_state?: PsychologicalState;
  result_type?: ResultType;
  error_level?: ErrorLevel;
  environment_mismatch_flag?: boolean;
  permanent_exclusion_flag?: boolean;
  correct_action: string;
}

export interface TradeUpdateData extends Partial<TradeCreateData> {
  version: number;
}
