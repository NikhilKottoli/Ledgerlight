import { test } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3011";

test("dump full intents page HTML", async ({ page }) => {
  await page.goto(`${BASE_URL}/intents`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const html = await page.content();
  console.log(html);
});