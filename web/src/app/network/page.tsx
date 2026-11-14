"use client";

import KpiCard from "@/components/ui/KpiCard";
import TimeSeriesChart from "@/components/ui/TimeSeriesChart";
import { useMetrics } from "@/hooks/useMetric";

const METRICS = [
  { id: "defillama.tvl.near_intents.daily", label: "TVL (NEAR Intents)", unit: "USD" },
  { id: "defillama.fees.near_intents.daily", label: "Fees (Gross)", unit: "USD" },
  { id: "defillama.revenue.near_intents.daily", label: "Revenue (Protocol)", unit: "USD" },
  { id: "defillama.holders_revenue.near_intents.daily", label: "Holders Revenue (Buybacks)", unit: "USD" },
  { id: "defillama.chain_tvl_near.daily", label: "NEAR Chain TVL (DefiLlama)", unit: "USD" },
  { id: "nearblocks.revenue_near.daily", label: "Revenue Wallet Inflows", unit: "NEAR" },
  { id: "nearblocks.buyback_outflows.daily", label: "Buyback Outflows", unit: "NEAR" },
  { id: "nearblocks.net_revenue_near.daily", label: "Net Revenue (Onchain)", unit: "NEAR" },
  { id: "pikespeak.hot_wallets_total_balance.daily", label: "Top 100 Hot Wallets Balance", unit: "NEAR" },
  { id: "pikespeak.hot_wallets_count.daily", label: "Hot Wallets Count", unit: "count" },
] as const;

const UNAVAILABLE_METRICS = [
  { label: "Daily Active Accounts", unit: "", reason: "Requires Flipside/Pikespeak event-historic API — network-wide active signer addresses (endpoint timeout)" },
  { label: "Daily Transactions", unit: "", reason: "Requires Flipside/Pikespeak event-historic API — network-wide tx count (endpoint timeout)" },
  { label: "Intents-Attributable Activity", unit: "", reason: "Requires Flipside/Pikespeak event-historic API — Intents contract receipts (endpoint timeout)" },
  { label: "Net Supply Change (NEAR)", unit: "NEAR", reason: "Requires Flipside/Pikespeak API — blocks.total_supply" },
] as const;

export default function NetworkPage() {
  const metricIds = METRICS.map(m => m.id);
  const { artifacts, isLoading } = useMetrics(metricIds);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <header className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Network</h1>
          <p className="text-muted mt-1">NEAR network activity and Intents protocol metrics</p>
        </header>
        <div className="text-center py-12 text-muted">Loading live data...</div>
      </div>
    );
  }

  const validMetrics = METRICS.map((m, i) => ({ ...m, artifact: artifacts[i] })).filter(m => m.artifact);

  // Get latest data timestamp from artifacts
  const latestDates = validMetrics
    .map(a => a.artifact?.series?.[a.artifact.series.length - 1]?.t)
    .filter(Boolean);
  const dataAsOf = latestDates.length > 0 ? latestDates[0] : "N/A";

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Network</h1>
        <p className="text-muted mt-1">NEAR network activity and Intents protocol metrics</p>
        <p className="text-sm text-muted mt-2">
          Accounts ≠ humans. "Active accounts" = distinct signer addresses with ≥1 tx/day.
        </p>
        <p className="text-xs text-amber-400 mt-1">Data as of {dataAsOf}</p>
      </header>

      {/* KPI Row - Available Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {validMetrics.map(({ artifact, label, unit }) => (
          artifact && <KpiCard key={artifact.meta.metric_id} artifact={artifact} label={label} unit={unit} previousPeriodLabel="vs prior day" />
        ))}
      </div>

      {/* Charts - Available Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        {validMetrics.map(({ artifact, label }) => (
          artifact && (
            <section key={artifact.meta.metric_id} className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">{label}</h2>
              <TimeSeriesChart artifact={artifact} height={350} />
            </section>
          )
        ))}
      </div>

      {/* Unavailable Metrics as plain notes */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Unavailable Metrics</h2>
        <ul className="space-y-2 text-sm">
          {UNAVAILABLE_METRICS.map(({ label, unit, reason }) => (
            <li key={label} className="flex items-start gap-2 text-muted">
              <span className="font-mono text-xs text-amber-400">•</span>
              <span className="font-medium">{label}</span>
              {unit && <span className="text-xs text-neutral-500">({unit})</span>}
              <span className="ml-2">— {reason}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Data Sources */}
      <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 text-sm text-muted">
        <p><strong>Available sources:</strong> DefiLlama (TVL, fees, revenue, holders revenue for NEAR Intents protocol; NEAR chain TVL); NearBlocks (onchain NEAR revenue wallet inflows and buyback outflows); Pikespeak (top 100 hot wallets by USD value).</p>
        <p className="mt-1"><strong>Missing:</strong> Network-wide daily active accounts, daily transactions, Intents-attributable activity, net supply change (Pikespeak event-historic endpoint timeouts; BigQuery quota exhausted).</p>
        <p className="mt-1"><strong>Note:</strong> "Active accounts" = distinct signer addresses with ≥1 transaction. Not equivalent to unique humans.</p>
      </div>
    </div>
  );
}