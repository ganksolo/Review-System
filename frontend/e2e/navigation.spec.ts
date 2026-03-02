import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should load the dashboard page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("交易复盘仪表板");
  });

  test("should navigate to trades list", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/trades"]');
    await expect(page).toHaveURL("/trades");
    await expect(page.locator("h1")).toContainText("交易列表");
  });

  test("should navigate to new trade form", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/trades/new"]');
    await expect(page).toHaveURL("/trades/new");
    await expect(page.locator("h1")).toContainText("新建交易记录");
  });

  test("should navigate to rules page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/rules"]');
    await expect(page).toHaveURL("/rules");
    await expect(page.locator("h1")).toContainText("动态规则库");
  });

  test("should navigate to analytics page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/analytics"]');
    await expect(page).toHaveURL("/analytics");
    await expect(page.locator("h1")).toContainText("数据分析");
  });

  test("sidebar should display all nav items", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator("aside");
    await expect(sidebar.locator("text=仪表板")).toBeVisible();
    await expect(sidebar.locator("text=交易列表")).toBeVisible();
    await expect(sidebar.locator("text=新建交易")).toBeVisible();
    await expect(sidebar.locator("text=规则库")).toBeVisible();
    await expect(sidebar.locator("text=数据分析")).toBeVisible();
  });
});
