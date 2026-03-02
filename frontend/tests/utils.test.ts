import { describe, it, expect } from "vitest";
import { cn, formatDate, formatDateTime, formatPnL, formatPercent, pnlColor } from "@/lib/utils";

describe("cn", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("should merge conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatDate", () => {
  it("should format ISO date string to zh-CN date", () => {
    const result = formatDate("2025-03-15T10:00:00Z");
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/03/);
    expect(result).toMatch(/15/);
  });
});

describe("formatDateTime", () => {
  it("should include time in the output", () => {
    const result = formatDateTime("2025-06-01T14:30:00Z");
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/06/);
  });
});

describe("formatPnL", () => {
  it("should return '-' for null", () => {
    expect(formatPnL(null)).toBe("-");
  });

  it("should add '+' sign for positive values", () => {
    expect(formatPnL(123.456)).toBe("+123.46");
  });

  it("should format negative values", () => {
    expect(formatPnL(-50.1)).toBe("-50.10");
  });

  it("should handle zero", () => {
    expect(formatPnL(0)).toBe("+0.00");
  });
});

describe("formatPercent", () => {
  it("should return '-' for null", () => {
    expect(formatPercent(null)).toBe("-");
  });

  it("should add '+' sign and '%' suffix for positive", () => {
    expect(formatPercent(12.345)).toBe("+12.35%");
  });

  it("should format negative percent", () => {
    expect(formatPercent(-5.5)).toBe("-5.50%");
  });
});

describe("pnlColor", () => {
  it("should return green for 盈利", () => {
    expect(pnlColor("盈利")).toBe("text-emerald-500");
  });

  it("should return red for 亏损", () => {
    expect(pnlColor("亏损")).toBe("text-red-500");
  });

  it("should return neutral for 保本出局", () => {
    expect(pnlColor("保本出局")).toBe("text-zinc-400");
  });

  it("should return neutral for null", () => {
    expect(pnlColor(null)).toBe("text-zinc-400");
  });
});
