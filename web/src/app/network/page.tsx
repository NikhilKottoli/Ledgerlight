import { Metadata } from "next";
import KpiCard from "@/components/ui/KpiCard";
import TimeSeriesChart from "@/components/ui/TimeSeriesChart";
import LockedPanel from "@/components/ui/LockedPanel";
import { MetricArtifact } from "@/lib/types";
import fs from "fs";
import path from "path";

export const metadata: Metadata = { title: "NEAR Value Intelligence — Network" };

function loadArtifact(metricId: string): MetricArtifact | null {
  const p = path.join(process.cwd(), `public/data/${metricId}.json`);
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as MetricArtifact;
  } catch {
    return null;
  }
}

const METRICS = [
  { id: "defillama.tvl.near_intents.daily", label: "TVL (NEAR Intents)", unit: "USD" },
  { id: "defillama.fees.near_intents.daily", label: "Fees (Gross)", unit: "USD" },
  { id: "defillama.revenue.near_intents.daily", label: "Revenue (Protocol)", unit: "USD" },
  { id: "defillama.holders_revenue.near_intents.daily", label: "Holders Revenue (Buybacks)", unit: "USD" },
] as const;

const LOCKED_METRICS = [
  { id: "network.active_accounts.daily", label: "Daily Active Accounts", unit: "", reason: "BigQuery quota" },
  { id: "network.transactions.daily", label: "Daily Transactions", unit: "", reason: "BigQuery quota" },
  { id: "network.intents_attributable.daily", label: "Intents-Attributable Activity", unit: "", reason: "BigQuery quota" },
  { id: "supply.net_supply_change.daily", label: "Net Supply Change (NEAR)", unit: "NEAR", reason: "BigQuery quota" },
  { id: "defillama.chain_tvl_near.daily", label: "NEAR Chain TVL", unit: "USD", reason: "Not yet implemented" },
] as const;

export default function NetworkPage() {
  const artifacts = METRICS.map(m => ({ ...m, artifact: loadArtifact(m.id) })).filter(m => m.artifact);
  const lockedMetrics = LOCKED_METRICS;

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Network</h1>
        <p className="text-muted mt-1">NEAR network activity and Intents protocol metrics</p>
        <p className="text-sm text-muted mt-2">
          Accounts ≠ humans. "Active accounts" = distinct signer addresses with ≥1 tx/day.
        </p>
      </header>

      {/* KPI Row - Available Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {artifacts.map(({ artifact, label, unit }) => (
          artifact && <KpiCard key={artifact.meta.metric_id} artifact={artifact} label={label} unit={unit} previousPeriodLabel="vs prior day" />
        ))}
      </div>

      {/* Locked Metrics Row */}
      {lockedMetrics.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lockedMetrics.map(({ label, unit, reason }) => (
            <LockedPanel
              key={label}
              title={label}
              description={unit ? `Unit: ${unit}` : "Onchain metric"}
              missing={reason}
            />
          ))}
        </div>
      )}

      {/* Charts - Available Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        {artifacts.map(({ artifact, label }) => (
          artifact && (
            <section key={artifact.meta.metric_id} className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">{label}</h2>
              <TimeSeriesChart artifact={artifact} height={350} />
            </section>
          )
        ))}
      </div>

      {/* Chain TVL Context */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">NEAR Chain TVL (Context)</h2>
        <LockedPanel
          title="NEAR Chain TVL"
          description="Total value locked across all NEAR protocols"
          missing="Not yet implemented — requires DefiLlama chain TVL endpoint"
        />
      </section>

      {/* Data Sources */}
      <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 text-sm text-muted">
        <p><strong>Available sources:</strong> DefiLlama (TVL, fees, revenue, holders revenue for NEAR Intents protocol).</p>
        <p className="mt-1"><strong>Missing (BigQuery quota):</strong> Daily active accounts, daily transactions, Intents-attributable activity, net supply change.</p>
        <p className="mt-1"><strong>Note:</strong> "Active accounts" = distinct signer addresses with ≥1 transaction. Not equivalent to unique humans.</p>
      </div>
    </div>
  );
}
