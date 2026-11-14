/**
 * Shared chart language. Colours are deliberately restrained: one warm accent,
 * two supporting hues, and warm neutrals for axes and grids.
 */
export const chart = {
  accent: "#b45a3c",
  accentSoft: "#e8c8ba",
  accentWash: "#f5e7e1",
  sage: "#557a60",
  sageSoft: "#e8f0e9",
  slate: "#4d6b85",
  slateSoft: "#e9eff4",
  ochre: "#a8742a",
  ochreSoft: "#f7eedd",
  danger: "#b24a3e",
  dangerSoft: "#f8e7e3",
  mauve: "#8a6a7e",
  warmGray: "#9c9287",
  ink: "#211d19",
  muted: "#766e64",
  faint: "#9d9488",
  grid: "#ece7df",
  axis: "#d9d1c4",
  surface: "#ffffff",
  surfaceMuted: "#faf8f4",
} as const;

export const chartPalette = [chart.accent, chart.slate, chart.sage, chart.ochre, chart.mauve, chart.warmGray];

type MetricUnit = "USD" | "NEAR" | "count" | "ratio" | "bps";

const METRIC_UNITS: Record<string, MetricUnit> = {
  "defillama.tvl.near_intents.daily": "USD",
  "defillama.fees.near_intents.daily": "USD",
  "defillama.revenue.near_intents.daily": "USD",
  "defillama.holders_revenue.near_intents.daily": "USD",
  "defillama.chain_tvl_near.daily": "USD",
  "nearblocks.revenue_near.daily": "NEAR",
  "nearblocks.net_revenue_near.daily": "NEAR",
  "nearblocks.buyback_outflows.daily": "NEAR",
  "nearblocks.wnear_transfers.daily": "NEAR",
  "pikespeak.hot_wallets_total_balance.daily": "NEAR",
  "pikespeak.hot_wallets_count.daily": "count",
  "intents.volume_usd.daily": "USD",
  "intents.swaps.daily": "count",
  "intents.unique_sender_addresses.daily": "count",
  "intents.avg_swap_usd.daily": "USD",
  "intents.concentration.daily": "ratio",
  "intents.status_mix.daily": "count",
  "intents.chain_distribution.daily": "USD",
  "intents.token_distribution.daily": "USD",
  "revenue.net.near_intents.daily": "USD",
};

export function metricUnit(metricId: string): MetricUnit {
  return METRIC_UNITS[metricId] || (metricId.includes("near") ? "NEAR" : "USD");
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const decimal = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.abs(n) >= 1000 ? compact.format(n) : decimal.format(n);
}

export function formatUsd(n: number, compactMode = true): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (compactMode && abs >= 1000) return `$${compact.format(n)}`;
  return `$${decimal.format(n)}`;
}

export function formatNear(n: number): string {
  return formatNumber(n);
}

export function formatPercent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatMetricValue(n: number, unit: string): { value: string; suffix: string; full: string } {
  const u = unit.toUpperCase();
  if (u === "USD") {
    return {
      value: formatUsd(n),
      suffix: "",
      full: `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)}`,
    };
  }
  if (u === "NEAR") {
    return {
      value: formatNumber(n),
      suffix: "NEAR",
      full: `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)} NEAR`,
    };
  }
  if (u === "RATIO") {
    return {
      value: `${(n * 100).toFixed(Math.abs(n) < 0.01 ? 2 : 1)}%`,
      suffix: "",
      full: n.toFixed(4),
    };
  }
  if (u === "BPS") {
    return { value: formatNumber(n), suffix: "bps", full: `${n} bps` };
  }
  return {
    value: formatNumber(n),
    suffix: "",
    full: new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n),
  };
}

export function formatMetricIdValue(metricId: string, n: number): { value: string; suffix: string; full: string } {
  const unit = metricUnit(metricId);
  if (unit === "ratio") return formatMetricValue(n, "ratio");
  return formatMetricValue(n, unit);
}

export function formatChartValue(metricId: string, n: number): string {
  const unit = metricUnit(metricId);
  if (unit === "USD") return formatUsd(n);
  if (unit === "NEAR") return `${formatNumber(n)} NEAR`;
  if (unit === "ratio") return `${(n * 100).toFixed(1)}%`;
  return formatNumber(n);
}

export function formatAxisValue(metricId: string, n: number): string {
  const unit = metricUnit(metricId);
  if (unit === "USD") return `$${compact.format(n)}`;
  if (unit === "NEAR") return `${compact.format(n)}`;
  if (unit === "ratio") return `${(n * 100).toFixed(0)}%`;
  return compact.format(n);
}

export function formatDateTick(date: string, spanDays: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  if (spanDays > 400) {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  if (spanDays > 120) {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatLongDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function daysBetween(first: string, last: string): number {
  const a = new Date(`${first}T00:00:00Z`).getTime();
  const b = new Date(`${last}T00:00:00Z`).getTime();
  return Math.max(1, Math.round(Math.abs(b - a) / 86_400_000));
}

export function seriesTrend(series: Array<{ t: string; v: number | string | null }>, window = 30): number[] {
  const points = series
    .filter((p) => p.v !== null && !Number.isNaN(Number(p.v)))
    .slice(-window)
    .map((p) => Number(p.v));
  return points;
}

export const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e7e1d6",
  borderRadius: "10px",
  boxShadow: "0 18px 40px -24px rgba(33,29,25,0.28)",
  color: "#211d19",
  fontSize: "12px",
  padding: "10px 12px",
} as const;
