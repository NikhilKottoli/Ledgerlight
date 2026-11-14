import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3011';

test.describe('Debug page loads', () => {
  test('Overview page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('Overview errors:', errors);
    expect(errors.length).toBe(0);
    await expect(page.locator('h1')).toContainText('NEAR Value Intelligence');
  });

  test('Value page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/value/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('Value page errors:', errors);
    console.log('Value page URL:', page.url());
    console.log('Page title:', await page.title());

    // Check for loading state
    const loadingText = await page.locator('text=Loading live data').count();
    console.log('Loading elements:', loadingText);

    // Check for main content
    const h1 = await page.locator('h1').textContent();
    console.log('H1:', h1);

    // Check for KPI cards
    const kpiCards = await page.locator('.bg-neutral-900\\/50').count();
    console.log('KPI cards:', kpiCards);

    expect(errors.length).toBe(0);
  });

  test('Intents page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/intents/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('Intents errors:', errors);
    expect(errors.length).toBe(0);
  });

  test('Network page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/network/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('Network errors:', errors);
    expect(errors.length).toBe(0);
  });

  test('API endpoints return data', async ({ request }) => {
    const metrics = [
      'defillama.tvl.near_intents.daily',
      'defillama.fees.near_intents.daily',
      'intents.volume_usd.daily',
    ];

    for (const metric of metrics) {
      const response = await request.get(`http://localhost:3011/api/data/${metric}`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      console.log(`${metric}: ${data.series.length} points, latest: ${data.series[data.series.length - 1]?.t}`);
      expect(data.series.length).toBeGreaterThan(0);
    }
  });
});