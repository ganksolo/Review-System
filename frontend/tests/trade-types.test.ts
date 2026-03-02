import { describe, it, expect } from "vitest";
import {
  ACCOUNT_TYPES,
  TRADE_CYCLES,
  PNL_FLAGS,
  MARKET_ENVIRONMENTS,
  SECTOR_STATUSES,
  PLAN_ADHERENCES,
  STOP_LOSS_DISCIPLINES,
  EXIT_TYPES,
  PSYCHOLOGICAL_STATES,
  RESULT_TYPES,
  ERROR_LEVELS,
  SELECTION_DIMENSIONS,
  STRATEGY_PATTERNS,
} from "@/types/trade";

describe("Trade enum constants", () => {
  it("should define ACCOUNT_TYPES matching backend enums", () => {
    expect(ACCOUNT_TYPES).toEqual(["短线账户", "中线账户"]);
  });

  it("should define TRADE_CYCLES matching backend enums", () => {
    expect(TRADE_CYCLES).toEqual(["短线", "中线", "长线"]);
  });

  it("should define PNL_FLAGS matching backend enums", () => {
    expect(PNL_FLAGS).toEqual(["盈利", "亏损", "保本出局"]);
  });

  it("should define 7 MARKET_ENVIRONMENTS", () => {
    expect(MARKET_ENVIRONMENTS).toHaveLength(7);
    expect(MARKET_ENVIRONMENTS).toContain("牛市-主升");
    expect(MARKET_ENVIRONMENTS).toContain("震荡市-中枢");
  });

  it("should define 5 SECTOR_STATUSES", () => {
    expect(SECTOR_STATUSES).toHaveLength(5);
    expect(SECTOR_STATUSES).toContain("启动期");
    expect(SECTOR_STATUSES).toContain("混沌期");
  });

  it("should define 3 PLAN_ADHERENCES", () => {
    expect(PLAN_ADHERENCES).toHaveLength(3);
    expect(PLAN_ADHERENCES).toContain("完全按计划");
    expect(PLAN_ADHERENCES).toContain("临盘起意冲动交易");
  });

  it("should define 3 STOP_LOSS_DISCIPLINES", () => {
    expect(STOP_LOSS_DISCIPLINES).toHaveLength(3);
  });

  it("should define 4 EXIT_TYPES", () => {
    expect(EXIT_TYPES).toHaveLength(4);
    expect(EXIT_TYPES).toContain("主动止盈");
    expect(EXIT_TYPES).toContain("模式外情绪化离场");
  });

  it("should define 4 PSYCHOLOGICAL_STATES", () => {
    expect(PSYCHOLOGICAL_STATES).toHaveLength(4);
    expect(PSYCHOLOGICAL_STATES).toContain("冷静");
    expect(PSYCHOLOGICAL_STATES).toContain("追涨FOMO");
  });

  it("should define 4 RESULT_TYPES", () => {
    expect(RESULT_TYPES).toHaveLength(4);
    expect(RESULT_TYPES).toContain("正确盈利");
    expect(RESULT_TYPES).toContain("模式亏损");
  });

  it("should define 3 ERROR_LEVELS", () => {
    expect(ERROR_LEVELS).toHaveLength(3);
    expect(ERROR_LEVELS).toContain("执行层错误");
    expect(ERROR_LEVELS).toContain("环境层错误");
  });

  it("should define 5 SELECTION_DIMENSIONS", () => {
    expect(SELECTION_DIMENSIONS).toHaveLength(5);
    expect(SELECTION_DIMENSIONS).toContain("技术面");
    expect(SELECTION_DIMENSIONS).toContain("情绪接力");
  });

  it("should define STRATEGY_PATTERNS", () => {
    expect(STRATEGY_PATTERNS.length).toBeGreaterThanOrEqual(3);
    expect(STRATEGY_PATTERNS).toContain("突破买入");
    expect(STRATEGY_PATTERNS).toContain("龙头首阴");
  });
});
