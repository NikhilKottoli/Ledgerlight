import { chromium } from "playwright";

const base = "http://localhost:3011";
const browser = await chromium.launch();
const errors = [];
const results = [];
const check = (name, condition, detail = "") => {
  results.push({ name, ok: !!condition, detail });
  if (!condition) console.error("FAIL", name, detail);
};

async function open(path) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${path}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`${path}: ${err.message}`));
  await page.goto(base + path, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  return page;
}

// Flows: period switch, unit toggle, node dialog
{
  const page = await open("/flows/");
  const grossBefore = await page.locator("text=Gross fees").first().locator("..").textContent();
  check("flows initial 30d gross", /5\.82M/.test(await page.textContent("body")), grossBefore || "");
  await page.getByRole("button", { name: /^7d$/i }).click();
  await page.waitForTimeout(400);
  const body7d = await page.textContent("body");
  check("flows 7d selected", (await page.getByRole("button", { name: /^7d$/i }).getAttribute("aria-pressed")) === "true");
  check("flows 7d ledger range updated", body7d.includes("Nov 7, 2026") && body7d.includes("Nov 14, 2026"), body7d.slice(0, 120));

  await page.getByRole("button", { name: "NEAR stages" }).click();
  await page.waitForTimeout(500);
  const nearBody = await page.textContent("body");
  check("flows NEAR stages active", (await page.getByRole("button", { name: "NEAR stages" }).getAttribute("aria-pressed")) === "true");
  check("flows NEAR stage labels present", nearBody.includes("Buyback") && nearBody.includes("Net revenue"), "");

  await page.getByRole("button", { name: "USD stages" }).click();
  await page.waitForTimeout(400);
  const nodeLabel = page.locator("svg[role='img'] text").filter({ hasText: "Net revenue swept" }).first();
  check("flows sankey right label exists", (await nodeLabel.count()) > 0);
  if (await nodeLabel.count()) {
    await nodeLabel.click({ force: true });
    await page.waitForTimeout(300);
    check("flows node dialog opens", (await page.getByRole("dialog", { name: "Ledger node" }).count()) > 0 || (await page.locator("#flow-node-title").count()) > 0);
    await page.getByRole("button", { name: "Close node details" }).last().click();
  }
  await page.close();
}

// Intents: distribution date filter and breadown sync
{
  const page = await open("/intents/");
  const before = await page.locator("text=transactions").first().locator("..").textContent().catch(() => "");
  await page.getByRole("button", { name: "Nov 11", exact: true }).click();
  await page.waitForTimeout(400);
  const body = await page.textContent("body");
  check("intents date filter updates status", body.includes("Nov 11, 2026 · transaction count"), "");
  check("intents date filter pressed", (await page.getByRole("button", { name: "Nov 11", exact: true }).getAttribute("aria-pressed")) === "true");
  check("intents volume chart still present", body.includes("Volume (USD)"));
  await page.close();
}

// Value: scenarios, advanced inputs, number input
{
  const page = await open("/value/");
  const baseValue = await page.locator("text=Buyback breakeven").first().locator("..").textContent();
  await page.getByRole("button", { name: /^BEAR$/i }).click();
  await page.waitForTimeout(400);
  const bearValue = await page.locator("text=Buyback breakeven").first().locator("..").textContent();
  check("value bear scenario changes output", baseValue !== bearValue, `${baseValue} -> ${bearValue}`);

  await page.getByLabel("Show advanced inputs").check();
  check("value advanced input revealed", (await page.getByText("Growth Decay (d)").count()) > 0);

  const volumeInput = page.getByLabel("Starting Annual Volume (V₀)", { exact: true });
  await volumeInput.fill("5000000000");
  await page.waitForTimeout(400);
  const body = await page.textContent("body");
  check("value input updates model", body.includes("11.4×") || body.includes("11.5×") || body.includes("10.2×"), "");
  await page.close();
}

// Overview interactions
{
  const page = await open("/");
  await page.getByRole("button", { name: "30D", exact: true }).click();
  await page.waitForTimeout(300);
  check("overview range 30D pressed", (await page.getByRole("button", { name: "30D", exact: true }).getAttribute("aria-pressed")) === "true");
  await page.getByRole("button", { name: "Gross fees" }).click();
  await page.waitForTimeout(200);
  check("overview legend toggles", (await page.getByRole("button", { name: "Gross fees" }).getAttribute("aria-pressed")) === "false");
  const registryHref = await page.getByRole("main").getByRole("link", { name: "Metric registry" }).getAttribute("href");
  check("overview registry link", Boolean(registryHref && registryHref.startsWith("/methodology")), String(registryHref));
  await page.close();
}

// Thesis anchor and methodology accordion
{
  const page = await open("/thesis/");
  await page.getByRole("main").getByRole("link", { name: "Pre-registration", exact: true }).click();
  await page.waitForTimeout(300);
  check("thesis anchor exists", (await page.locator("#preregistration").count()) === 1);
  await page.close();

  const method = await open("/methodology/");
  const defillama = method.locator("details").filter({ hasText: "DefiLlama" }).first();
  await defillama.locator("summary").click();
  check("methodology source expands", (await defillama.getAttribute("open")) !== null);
  await method.close();
}

// Mobile nav
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(`mobile: ${msg.text()}`); });
  page.on("pageerror", (err) => errors.push(`mobile: ${err.message}`));
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Open navigation" }).click();
  check("mobile drawer opens", (await page.getByRole("dialog", { name: "Navigation" }).count()) === 1);
  await page.getByRole("link", { name: "Intents", exact: true }).click();
  await page.waitForTimeout(900);
  check("mobile navigation works", page.url().includes("/intents"));
  check("mobile drawer closes", (await page.getByRole("dialog", { name: "Navigation" }).count()) === 0);
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ results, errors }, null, 2));
if (errors.length) process.exitCode = 1;
if (results.some((r) => !r.ok)) process.exitCode = 1;
