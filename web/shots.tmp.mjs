import { chromium } from "playwright";
import fs from "fs";

const base = process.env.BASE || "http://localhost:3011";
const outDir = process.env.OUT || "/tmp/opencode/shots";
fs.mkdirSync(outDir, { recursive: true });
const routes = ["/", "/network/", "/intents/", "/flows/", "/value/", "/thesis/", "/methodology/"];
const browser = await chromium.launch();
const errors = [];

for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  page.on("console", msg => { if (msg.type() === "error") errors.push(`${route} console: ${msg.text()}`); });
  page.on("pageerror", err => errors.push(`${route} pageerror: ${err.message}`));
  await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${outDir}/${route.replace(/\//g, "_") || "root"}.png`, fullPage: true });
  console.log(`${route} -> ${await page.title()} | h1: ${(await page.locator("h1").first().textContent().catch(() => "none"))}`);
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await page.goto(base + "/intents/", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${outDir}/mobile_intents.png`, fullPage: true });
await browser.close();
console.log("ERRORS:", JSON.stringify(errors, null, 2));
