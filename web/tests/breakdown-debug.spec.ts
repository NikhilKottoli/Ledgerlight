import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3011";

test.describe("Breakdown charts debug", () => {
  test("Check Volume Breakdown section renders", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/intents`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Check for Volume Breakdown section
    const breakdownSection = page.locator('section:has(h2:text("Volume Breakdown"))');
    const exists = await breakdownSection.count();
    console.log(`Volume Breakdown section exists: ${exists > 0}`);

    if (exists > 0) {
      const html = await breakdownSection.innerHTML();
      console.log("=== Volume Breakdown HTML ===");
      console.log(html.substring(0, 5000));
      console.log("=== END ===");
    }

    // Check for the breakdown charts
    const breakdownCharts = page.locator('section:has(h2:text("Volume Breakdown")) .bg-neutral-900\\/50.border.border-neutral-700.rounded-xl.p-4');
    const chartCount = await breakdownCharts.count();
    console.log(`Breakdown charts found: ${chartCount}`);

    for (let i = 0; i < chartCount; i++) {
      const chart = breakdownCharts.nth(i);
      const label = await chart.locator('h3').textContent();
      console.log(`  Chart ${i}: ${label}`);
    }

    console.log("\nConsole errors:", errors);
    expect(errors.length).toBe(0);
  });
});