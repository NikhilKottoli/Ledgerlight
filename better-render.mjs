import fs from "fs";
import { createCanvas } from "canvas";

const excalidrawData = JSON.parse(fs.readFileSync("architecture.excalidraw", "utf-8"));
const elements = excalidrawData.elements;

const width = 2200;
const height = 1600;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// White background
ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, width, height);

// Color palette matching the diagram
const colors = {
  source: "#3b82f6",      // blue
  pipeline: "#22c55e",    // green
  artifact: "#f59e0b",    // amber
  dashboard: "#a855f7",   // purple
  verify: "#ef4444",      // red
  text: "#1f2937",
  lightText: "#6b7280",
  border: "#d1d5db",
  bg: {
    source: "#eff6ff",
    pipeline: "#f0fdf4",
    artifact: "#fffbeb",
    dashboard: "#faf5ff",
    verify: "#fef2f2"
  }
};

// Helper functions
function drawRect(x, y, w, h, fillColor, borderColor, text, textColor = "#1f2937") {
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  if (text) {
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = textColor;
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      ctx.fillText(line, x + 12, y + 28 + i * 20);
    });
  }
}

function drawArrow(fromX, fromY, toX, toY, color = "#9ca3af") {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  // Arrowhead
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = 12;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI/6), toY - headLen * Math.sin(angle - Math.PI/6));
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI/6), toY - headLen * Math.sin(angle + Math.PI/6));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawSectionLabel(x, y, text, color) {
  ctx.font = "bold 18px Arial";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// Layout positions
const colX = [80, 500, 1000, 1550];
const rowY = [140, 220, 300, 380, 460, 540, 620, 700];
const boxW = [380, 450, 500, 550];
const boxH = 60;

// Title
ctx.font = "bold 32px Arial";
ctx.fillStyle = "#1a1a2e";
ctx.fillText("NEAR Value Intelligence — Architecture", 80, 50);
ctx.font = "20px Arial";
ctx.fillStyle = "#4a4a6a";
ctx.fillText("Follow the money. Verify the value.", 80, 85);

// Column headers
const colLabels = ["DATA SOURCES", "PIPELINE (Python)", "JSON ARTIFACTS", "DASHBOARD"];
const colColors = [colors.source, colors.pipeline, colors.artifact, colors.dashboard];
colLabels.forEach((label, i) => {
  ctx.font = "bold 16px Arial";
  ctx.fillStyle = colColors[i];
  ctx.fillText(label, colX[i], 120);
});

// DATA SOURCES (blue)
const sources = [
  { name: "DefiLlama API", detail: "TVL, fees, revenue, holders_revenue" },
  { name: "Intents Explorer API", detail: "Swaps, volume, chains, tokens, senders" },
  { name: "BigQuery Public Datasets", detail: "NEAR txs, blocks, receipts" },
  { name: "NearBlocks / Pikespeak", detail: "Wallet tracking, hot wallets" },
  { name: "revenue.near.org", detail: "Reference values for reconciliation" }
];

sources.forEach((s, i) => {
  const y = rowY[i];
  drawRect(colX[0], y, boxW[0], boxH, colors.bg.source, colors.source, s.name + "\n" + s.detail);
});

// PIPELINE (green)
const pipeline = [
  { name: "Connectors", detail: "Fetchers with rate limiting" },
  { name: "Normalize", detail: "Schema normalization to common types" },
  { name: "Metrics", detail: "11 registered metrics from registry.yaml" },
  { name: "Flows", detail: "5 Sankey presets (7d/30d/90d/YTD/All)" },
  { name: "Stats", detail: "Stationarity, bootstrap CIs, FDR, breaks" },
  { name: "Thesis", detail: "Pre-registered H1–H5 rule-based verdicts" },
  { name: "Export", detail: "Write JSON artifacts to web/public/data/" },
  { name: "Verify", detail: "Registry, artifacts, claims lint, manifest" }
];

pipeline.forEach((s, i) => {
  const y = rowY[i];
  drawRect(colX[1], y, boxW[1], boxH, colors.bg.pipeline, colors.pipeline, s.name + "\n" + s.detail);
});

// JSON ARTIFACTS (amber)
const artifacts = [
  { name: "26 Daily Time Series", detail: "defillama.*, intents.*, nearblocks.*" },
  { name: "5 Flow Ledger Presets", detail: "7d, 30d, 90d, YTD, All-time" },
  { name: "registry.json + events.json", detail: "Metric registry + annotated events" },
  { name: "reconciliation.*.json", detail: "Three-way revenue reconciliation" },
  { name: "THESIS.md + METHODOLOGY.md", detail: "Generated documentation" },
  { name: "manifest.json", detail: "SHA256 per artifact + git commit" }
];

artifacts.forEach((s, i) => {
  const y = rowY[i];
  drawRect(colX[2], y, boxW[2], boxH, colors.bg.artifact, colors.artifact, s.name + "\n" + s.detail);
});

// DASHBOARD (purple)
const dashboard = [
  { name: "7 Routes (Next.js App Router)", detail: "Overview, Value, Intents, Network, Flows, Thesis, Methodology" },
  { name: "Components", detail: "KpiCard, TimeSeriesChart, BreakdownChart, Sankey, LockedPanel" },
  { name: "Provenance Drawer", detail: "Source, definition, SQL, raw data link per chart" },
  { name: "Static Export", detail: "Deploy to Vercel / Cloudflare Pages" },
  { name: "Data Modes", detail: "live (green) | snapshot (amber) | synthetic (red)" }
];

dashboard.forEach((s, i) => {
  const y = rowY[i];
  drawRect(colX[3], y, boxW[3], boxH, colors.bg.dashboard, colors.dashboard, s.name + "\n" + s.detail);
});

// VERIFICATION LOOP (red) - bottom right
const verifyY = rowY[7] + 20;
drawSectionLabel(colX[3], verifyY - 10, "VERIFICATION LOOP", colors.verify);
drawRect(colX[3], verifyY, boxW[3], 80, colors.bg.verify, colors.verify, 
  "make verify MODE=snapshot    # registry↔artifacts, schemas, claims lint, manifest\nmake test                    # Python + JS unit tests\nPlaywright E2E               # 7 routes, 0 console errors");

// Data Modes badge
drawSectionLabel(colX[1], rowY[8] + 30, "DATA MODES", colors.text);
ctx.font = "14px Arial";
ctx.fillStyle = "#16a34a";
ctx.fillText("● live", colX[1], rowY[8] + 60);
ctx.fillStyle = "#f59e0b";
ctx.fillText("● snapshot (default)", colX[1] + 100, rowY[8] + 60);
ctx.fillStyle = "#ef4444";
ctx.fillText("● synthetic (test-only)", colX[1] + 280, rowY[8] + 60);
ctx.fillStyle = colors.lightText;
ctx.fillText("Pipeline refuses to combine artifacts from different modes", colX[1], rowY[8] + 90);

// Draw arrows between columns
for (let i = 0; i < 3; i++) {
  const fromX = colX[i] + boxW[i];
  const toX = colX[i + 1];
  const midY = rowY[3] + boxH/2;
  drawArrow(fromX, midY, toX, midY, colors.border);
}

// Vertical arrows in pipeline column
for (let i = 0; i < pipeline.length - 1; i++) {
  const fromY = rowY[i] + boxH;
  const toY = rowY[i + 1];
  const midX = colX[1] + boxW[1]/2;
  drawArrow(midX, fromY, midX, toY, colors.pipeline);
}

// Vertical arrows in artifacts column
for (let i = 0; i < artifacts.length - 1; i++) {
  const fromY = rowY[i] + boxH;
  const toY = rowY[i + 1];
  const midX = colX[2] + boxW[2]/2;
  drawArrow(midX, fromY, midX, toY, colors.artifact);
}

// Footer
ctx.font = "12px Arial";
ctx.fillStyle = "#9ca3af";
ctx.fillText("architecture.excalidraw — editable in excalidraw.com", 80, height - 30);

const buffer = canvas.toBuffer("image/png");
fs.writeFileSync("architecture.png", buffer);
console.log("Exported architecture.png (better render)");
