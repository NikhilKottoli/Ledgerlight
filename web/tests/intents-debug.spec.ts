import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3011";

test.describe("Intents page debug", () => {
  test("Intents page - check KPI card values are rendered", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/intents`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000); // Wait for SWR to fetch

    // Get the full page HTML for debugging
    const html = await page.content();
    console.log("=== PAGE HTML (first 5000 chars) ===");
    console.log(html.substring(0, 5000));
    console.log("=== END HTML ===");

    // Get all KPI cards - look for the specific structure
    const kpiCards = page.locator('.bg-neutral-900\\/50.border.border-neutral-700.rounded-xl.p-4:has(p.mt-1.text-2xl.font-mono)');
    const count = await kpiCards.count();
    console.log(`Found ${count} KPI cards`);

    for (let i = 0; i < count; i++) {
      const card = kpiCards.nth(i);
      const label = await card.locator('p.text-sm.text-muted.truncate').first().textContent();
      const value = await card.locator('p.mt-1.text-2xl.font-mono').first().textContent();
      const kindBadge = await card.locator('span.inline-flex.items-center.gap-1').first().textContent();
      
      console.log(`Card ${i}: Label="${label}", Value="${value}", Badge="${kindBadge}"`);
    }

    // Specifically check the Intents Explorer Metrics section
    const intentsSection = page.locator('section:has(h2:text("Intents Explorer Metrics"))');
    const intentsCards = intentsSection.locator('.bg-neutral-900\\/50.border.border-neutral-700.rounded-xl.p-4:has(p.mt-1.text-2xl.font-mono)');
    const intentsCount = await intentsCards.count();
    console.log(`\nIntents Explorer Metrics: ${intentsCount} cards`);
    
    for (let i = 0; i < intentsCount; i++) {
      const card = intentsCards.nth(i);
      const label = await card.locator('p.text-sm.text-muted.truncate').first().textContent();
      const value = await card.locator('p.mt-1.text-2xl.font-mono').first().textContent();
      console.log(`  Intents Card ${i}: Label="${label}", Value="${value}"`);
    }

    // Check for console errors
    console.log("\nConsole errors:", errors);
    expect(errors.length).toBe(0);
  });

  test("API endpoints return data for intents metrics", async ({ request }) => {
    const metrics = [
      "intents.volume_usd.daily",
      "intents.swaps.daily",
      "intents.unique_sender_addresses.daily",
      "intents.avg_swap_usd.daily",
      "intents.concentration.daily",
    ];

    for (const metric of metrics) {
      const response = await request.get(`${BASE_URL}/api/data/${metric}`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      console.log(`${metric}: ${data.series?.length || 0} points, latest:`, data.series?.[data.series.length - 1]);
      expect(data.series).toBeDefined();
      expect(data.series.length).toBeGreaterThan(0);
    }
  });
});