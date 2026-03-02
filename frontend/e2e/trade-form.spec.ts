import { test, expect } from "@playwright/test";

test.describe("Trade Form — 4-step flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/trades/new");
    await expect(page.locator("h1")).toContainText("新建交易记录");
  });

  test("should display step 1 by default", async ({ page }) => {
    await expect(page.locator("h2")).toContainText("基础交易信息");
  });

  test("should show step indicator with 4 steps", async ({ page }) => {
    await expect(page.locator("text=基础信息")).toBeVisible();
    await expect(page.locator("text=决策环境")).toBeVisible();
    await expect(page.locator("text=执行评估")).toBeVisible();
    await expect(page.locator("text=归因反思")).toBeVisible();
  });

  test("should validate required fields before advancing to step 2", async ({
    page,
  }) => {
    await page.click("button:has-text('下一步')");
    // Should still be on step 1 since required fields are empty
    await expect(page.locator("h2")).toContainText("基础交易信息");
  });

  test("should advance to step 2 after filling required fields", async ({
    page,
  }) => {
    // Fill step 1 required fields
    await page.fill('input[name="stock_code"]', "000001");
    await page.fill('input[name="entry_date"]', "2025-03-15T10:00");
    await page.fill('input[name="entry_price"]', "12.50");
    // position_size has default 10, account_type and trade_cycle have defaults

    await page.click("button:has-text('下一步')");
    await expect(page.locator("h2")).toContainText("决策环境快照");
  });

  test("should navigate back to step 1 from step 2", async ({ page }) => {
    await page.fill('input[name="stock_code"]', "000001");
    await page.fill('input[name="entry_date"]', "2025-03-15T10:00");
    await page.fill('input[name="entry_price"]', "12.50");

    await page.click("button:has-text('下一步')");
    await expect(page.locator("h2")).toContainText("决策环境快照");

    await page.click("button:has-text('上一步')");
    await expect(page.locator("h2")).toContainText("基础交易信息");
  });

  test("should walk through all 4 steps", async ({ page }) => {
    // Step 1
    await page.fill('input[name="stock_code"]', "600519");
    await page.fill('input[name="stock_name"]', "贵州茅台");
    await page.fill('input[name="entry_date"]', "2025-03-10T09:30");
    await page.fill('input[name="exit_date"]', "2025-03-12T14:50");
    await page.fill('input[name="entry_price"]', "1800");
    await page.fill('input[name="exit_price"]', "1850");

    await page.click("button:has-text('下一步')");

    // Step 2
    await expect(page.locator("h2")).toContainText("决策环境快照");
    await page.click("button:has-text('下一步')");

    // Step 3
    await expect(page.locator("h2")).toContainText("执行与心理评估");
    await page.click("button:has-text('下一步')");

    // Step 4
    await expect(page.locator("h2")).toContainText("深度归因与反思");
    await expect(page.locator("button:has-text('提交复盘')")).toBeVisible();
  });

  test("should show submit button only on step 4", async ({ page }) => {
    // Step 1 — should not show submit
    await expect(page.locator("button:has-text('提交复盘')")).toHaveCount(0);
    await expect(page.locator("button:has-text('下一步')")).toBeVisible();

    // Navigate to step 4
    await page.fill('input[name="stock_code"]', "000001");
    await page.fill('input[name="entry_date"]', "2025-03-15T10:00");
    await page.fill('input[name="entry_price"]', "12.50");
    await page.click("button:has-text('下一步')");
    await page.click("button:has-text('下一步')");
    await page.click("button:has-text('下一步')");

    // Step 4 — should show submit
    await expect(page.locator("button:has-text('提交复盘')")).toBeVisible();
    await expect(page.locator("button:has-text('下一步')")).toHaveCount(0);
  });

  test("should disable prev button on step 1", async ({ page }) => {
    const prevBtn = page.locator("button:has-text('上一步')");
    await expect(prevBtn).toBeDisabled();
  });

  test("should validate correct_action is required on step 4", async ({
    page,
  }) => {
    // Navigate to step 4
    await page.fill('input[name="stock_code"]', "000001");
    await page.fill('input[name="entry_date"]', "2025-03-15T10:00");
    await page.fill('input[name="entry_price"]', "12.50");
    await page.click("button:has-text('下一步')");
    await page.click("button:has-text('下一步')");
    await page.click("button:has-text('下一步')");

    // Try to submit without correct_action
    await page.click("button:has-text('提交复盘')");

    // Should show validation error
    await expect(page.locator("text=正确行为不能为空")).toBeVisible();
  });
});
