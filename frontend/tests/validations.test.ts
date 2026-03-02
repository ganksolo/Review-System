import { describe, it, expect } from "vitest";
import { tradeCreateSchema } from "@/lib/validations/trade";

const validTrade = {
  account_type: "短线账户",
  stock_code: "000001",
  stock_name: "平安银行",
  trade_cycle: "短线",
  entry_date: "2025-03-15T10:00",
  exit_date: "2025-03-16T14:30",
  position_size: 30,
  entry_price: 12.5,
  exit_price: 13.1,
  correct_action: "严格执行止损纪律",
};

describe("tradeCreateSchema", () => {
  it("should accept valid trade data", () => {
    const result = tradeCreateSchema.safeParse(validTrade);
    expect(result.success).toBe(true);
  });

  it("should require stock_code", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      stock_code: "",
    });
    expect(result.success).toBe(false);
  });

  it("should require correct_action", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      correct_action: "",
    });
    expect(result.success).toBe(false);
  });

  it("should require entry_date", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      entry_date: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative entry_price", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      entry_price: -5,
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero entry_price", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      entry_price: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject position_size > 100", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      position_size: 150,
    });
    expect(result.success).toBe(false);
  });

  it("should reject position_size <= 0", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      position_size: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject exit_date before entry_date", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      entry_date: "2025-03-16T10:00",
      exit_date: "2025-03-15T10:00",
    });
    expect(result.success).toBe(false);
  });

  it("should accept trade without optional fields", () => {
    const result = tradeCreateSchema.safeParse({
      account_type: "中线账户",
      stock_code: "600519",
      trade_cycle: "中线",
      entry_date: "2025-01-10T09:30",
      position_size: 20,
      entry_price: 1800,
      correct_action: "持有不动",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid account_type enum", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      account_type: "无效账户",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid trade_cycle enum", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      trade_cycle: "超长线",
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid market_environment enum", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      market_environment: "牛市-主升",
    });
    expect(result.success).toBe(true);
  });

  it("should accept selection_dimension as array", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      selection_dimension: ["技术面", "政策面"],
    });
    expect(result.success).toBe(true);
  });

  it("should accept boolean flags", () => {
    const result = tradeCreateSchema.safeParse({
      ...validTrade,
      environment_mismatch_flag: true,
      permanent_exclusion_flag: false,
    });
    expect(result.success).toBe(true);
  });
});
