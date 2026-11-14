import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3011";

test.describe("Methodology page debug", () => {
  test("Methodology page loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    page.on("pageerror", err => errors.push(err.message));

    await page.goto(`${BASE_URL}/methodology`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    console.log("Methodology page errors:", errors);
    console.log("Page title:", await page.title());
    console.log("H1:", await page.locator('h1').first().textContent());

    expect(errors.length).toBe(0);
    expect(await page.locator('h1').first().textContent()).toContain("Methodology");
  });

  test("Methodology page registry data renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/methodology`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const table = page.locator('table');
    const rows = await table.locator('tbody tr').count();
    console.log(`Registry table rows: ${rows}`);
    expect(rows).toBeGreaterThan(0);
  });
});