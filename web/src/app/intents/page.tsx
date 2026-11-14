import { Metadata } from "next";
import KpiCard from "@/components/ui/KpiCard";
import TimeSeriesChart from "@/components/ui/TimeSeriesChart";
import LockedPanel from "@/components/ui/LockedPanel";
import { MetricArtifact } from "@/lib/types";
import fs from "fs";
import path from "path";

export const metadata: Metadata = { title: "NEAR Value Intelligence — Intents" };

function loadArtifact(metricId: string): MetricArtifact | null {
  const p = path.join(process.cwd(), `public/data/${metricId}.json`);
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as MetricArtifact;
  } catch {
    return null;
  }
}

const AVAILABLE_METRICS = [
  { id: "defillama.fees.near_intents.daily", label: "Gross Fees (DefiLlama)", unit: "USD" },
  { id: "defillama.revenue.near_intents.daily", label: "Protocol Revenue (DefiLlama)", unit: "USD" },
  { id: "defillama.holders_revenue.near_intents.daily", label: "Holders Revenue / Buybacks", unit: "USD" },
] as const;

const INTENTS_METRICS = [
  { id: "intents.volume_usd.daily", label: "Volume (USD)", unit: "USD", reason: "Requires NEAR_INTENTS_JWT" },
  { id: "intents.swaps.daily", label: "Swaps", unit: "", reason: "Requires NEAR_INTENTS_JWT" },
  { id: "intents.unique_sender_addresses.daily", label: "Unique Sender Addresses", unit: "", reason: "Requires NEAR_INTENTS_JWT" },
  { id: "intents.avg_swap_usd.daily", label: "Avg Swap Size", unit: "USD", reason: "Requires NEAR_INTENTS_JWT" },
  { id: "intents.status_mix.daily", label: "Status Mix", unit: "", reason: "Requires NEAR_INTENTS_JWT" },
  { id: "intents.chain_distribution.daily", label: "Chain Distribution", unit: "USD", reason: "Requires NEAR_INTENTS_JWT" },
  { id: "intents.token_distribution.daily", label: "Token Distribution", unit: "USD", reason: "Requires NEAR_INTENTS_JWT" },
  { id: "intents.concentration.daily", label: "Concentration (Top-10 Share)", unit: "", reason: "Requires NEAR_INTENTS_JWT" },
] as const;

export default function IntentsPage() {
  const availableArtifacts = AVAILABLE_METRICS.map(m => ({ ...m, artifact: loadArtifact(m.id) })).filter(m => m.artifact);

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Intents</h1>
        <p className="text-muted mt-1">NEAR Intents protocol activity: volume, swaps, addresses, chains, tokens</p>
      </header>

      {/* Available from DefiLlama */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">DefiLlama Aggregates (No JWT Required)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availableArtifacts.map(({ artifact, label, unit }) => (
            artifact && <KpiCard key={artifact.meta.metric_id} artifact={artifact} label={label} unit={unit} previousPeriodLabel="vs prior day" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          {availableArtifacts.map(({ artifact, label }) => (
            artifact && (
              <section key={artifact.meta.metric_id} className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4">{label}</h3>
                <TimeSeriesChart artifact={artifact} height={300} />
              </section>
            )
          ))}
        </div>
      </section>

      {/* Intents Explorer Metrics (Requires JWT) */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Intents Explorer Metrics</h2>
        <p className="text-sm text-muted mb-4">
          These metrics require a JWT from <code className="bg-neutral-800 px-1 rounded">partners.near-intents.org</code>.
          Rate limit: 1 request / 5 seconds. Add <code className="bg-neutral-800 px-1 rounded">NEAR_INTENTS_JWT</code> to <code className="bg-neutral-800 px-1 rounded">.env</code> to enable.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTENTS_METRICS.map(({ label, unit, reason }) => (
            <LockedPanel key={label} title={label} description={unit ? `Unit: ${unit}` : "Per-transaction metric"} missing={reason} />
          ))}
        </div>
      </section>

      {/* Transaction Explorer Preview */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Transaction Explorer (Preview)</h2>
        <LockedPanel
          title="Transaction Sample"
          description="Latest 5,000 + top 1,000 by USD + referenced transactions"
          missing="Requires NEAR_INTENTS_JWT and successful ingestion"
        />
      </section>

      {/* Data Sources */}
      <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 text-sm text-muted">
        <p><strong>Available:</strong> DefiLlama aggregates for NEAR Intents (fees, revenue, holders revenue).</p>
        <p className="mt-1"><strong>Requires JWT:</strong> Per-transaction metrics — volume, swaps, unique sender addresses, chain/token distributions, status mix, concentration.</p>
        <p className="mt-1"><strong>Rate limit:</strong> 1 request / 5 seconds per partner. Ingestion is resumable day-window with dedupe.</p>
        <p className="mt-1"><strong>Note:</strong> "Unique sender addresses" ≠ unique humans. Multi-chain users = multiple addresses.</p>
      </div>
    </div>
  );
}
