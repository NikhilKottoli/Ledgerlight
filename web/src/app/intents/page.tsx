"use client";

import KpiCard from "@/components/ui/KpiCard";
import TimeSeriesChart from "@/components/ui/TimeSeriesChart";
import { useMetrics } from "@/hooks/useMetric";

const DEFI_LLAMA_METRICS = [
  { id: "defillama.fees.near_intents.daily", label: "Gross Fees (DefiLlama)", unit: "USD" },
  { id: "defillama.revenue.near_intents.daily", label: "Protocol Revenue (DefiLlama)", unit: "USD" },
  { id: "defillama.holders_revenue.near_intents.daily", label: "Holders Revenue / Buybacks", unit: "USD" },
] as const;

const INTENTS_LIVE_METRICS = [
  { id: "intents.volume_usd.daily", label: "Volume (USD)", unit: "USD" },
  { id: "intents.swaps.daily", label: "Swaps", unit: "count" },
  { id: "intents.unique_sender_addresses.daily", label: "Unique Sender Addresses", unit: "count" },
  { id: "intents.avg_swap_usd.daily", label: "Avg Swap Size (USD)", unit: "USD" },
  { id: "intents.concentration.daily", label: "Concentration (Top-10 Share)", unit: "ratio" },
] as const;

const INTENTS_DISTRIBUTION_METRICS = [
  { id: "intents.status_mix.daily", label: "Status Mix", unit: "ratio" },
  { id: "intents.chain_distribution.daily", label: "Chain Distribution", unit: "USD" },
  { id: "intents.token_distribution.daily", label: "Token Distribution", unit: "USD" },
] as const;

export default function IntentsPage() {
  const defillamaIds = DEFI_LLAMA_METRICS.map(m => m.id);
  const intentsIds = INTENTS_LIVE_METRICS.map(m => m.id);
  const distributionIds = INTENTS_DISTRIBUTION_METRICS.map(m => m.id);

  const { artifacts: defillamaArtifacts, isLoading: defillamaLoading } = useMetrics(defillamaIds);
  const { artifacts: intentsArtifacts, isLoading: intentsLoading } = useMetrics(intentsIds);
  const { artifacts: distributionArtifacts, isLoading: distributionLoading } = useMetrics(distributionIds);

  const isLoading = defillamaLoading || intentsLoading || distributionLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <header className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Intents</h1>
          <p className="text-muted mt-1">NEAR Intents protocol activity: volume, swaps, addresses, chains, tokens</p>
        </header>
        <div className="text-center py-12 text-muted">Loading live data...</div>
      </div>
    );
  }

  const validDefillama = DEFI_LLAMA_METRICS.map((m, i) => ({ ...m, artifact: defillamaArtifacts[i] })).filter(m => m.artifact);
  const validIntents = INTENTS_LIVE_METRICS.map((m, i) => ({ ...m, artifact: intentsArtifacts[i] })).filter(m => m.artifact);
  const validDistribution = INTENTS_DISTRIBUTION_METRICS.map((m, i) => ({ ...m, artifact: distributionArtifacts[i] })).filter(m => m.artifact);

  // Get latest data timestamp
  const latestDates = [...validDefillama, ...validIntents, ...validDistribution]
    .map(a => a.artifact?.series?.[a.artifact.series.length - 1]?.t)
    .filter(Boolean);
  const dataAsOf = latestDates.length > 0 ? latestDates[0] : "N/A";

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Intents</h1>
        <p className="text-muted mt-1">NEAR Intents protocol activity: volume, swaps, addresses, chains, tokens</p>
        <p className="text-xs text-amber-400 mt-1">Data as of {dataAsOf}</p>
      </header>

      {/* DefiLlama Aggregates */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">DefiLlama Aggregates (No JWT Required)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {validDefillama.map(({ artifact, label, unit }) => (
            artifact && <KpiCard key={artifact.meta.metric_id} artifact={artifact} label={label} unit={unit} previousPeriodLabel="vs prior day" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          {validDefillama.map(({ artifact, label }) => (
            artifact && (
              <section key={artifact.meta.metric_id} className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4">{label}</h3>
                <TimeSeriesChart artifact={artifact} height={300} />
              </section>
            )
          ))}
        </div>
      </section>

      {/* Live Intents Explorer Metrics (JWT Available) */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Intents Explorer Metrics (Live Data)</h2>
        <p className="text-sm text-muted mb-4">
          Sourced from <code className="bg-neutral-800 px-1 rounded">explorer.near-intents.org</code> API.
          Rate limit: 1 request / 5 seconds. Partner: <code className="bg-neutral-800 px-1 rounded">studentindividualdeveloper</code>.
          3,000 transactions ingested over 3 days (2026-11-12 to 2026-11-14).
        </p>
        {validIntents.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {validIntents.map(({ artifact, label, unit }) => (
                artifact && <KpiCard key={artifact.meta.metric_id} artifact={artifact} label={label} unit={unit} previousPeriodLabel="vs prior day" />
              ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2 mt-6">
              {validIntents.map(({ artifact, label }) => (
                artifact && (
                  <section key={artifact.meta.metric_id} className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4">{label}</h3>
                    <TimeSeriesChart artifact={artifact} height={300} />
                  </section>
                )
              ))}
            </div>
          </>
        ) : (
          <div className="text-muted text-center py-8">
            <p>No live Intents data available. Run <code className="bg-neutral-800 px-1 rounded">pipeline.connectors.intents_explorer</code> with <code className="bg-neutral-800 px-1 rounded">NEAR_INTENTS_JWT</code> set.</p>
          </div>
        )}
      </section>

      {/* Distribution Metrics (Object-valued, shown as charts only) */}
      {validDistribution.length > 0 && (
        <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Intents Distributions (Live Data)</h2>
          <p className="text-sm text-muted mb-4">
            Volume breakdown by status, chain, and token. Object-valued metrics — shown as charts only.
          </p>
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            {validDistribution.map(({ artifact, label }) => (
              artifact && (
                <section key={artifact.meta.metric_id} className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-4">{label}</h3>
                  <TimeSeriesChart artifact={artifact} height={300} />
                </section>
              )
            ))}
          </div>
        </section>
      )}

      {/* Transaction Explorer Preview */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Transaction Explorer (Preview)</h2>
        <div className="text-sm text-muted">
          <p>Sample of latest 5,000 + top 1,000 by USD + referenced transactions.</p>
          <p className="mt-1">Requires <code className="bg-neutral-800 px-1 rounded">NEAR_INTENTS_JWT</code> and successful ingestion.</p>
        </div>
      </section>

      {/* Data Sources */}
      <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 text-sm text-muted">
        <p><strong>Available (DefiLlama):</strong> Aggregated fees, revenue, holders revenue for NEAR Intents protocol.</p>
        <p className="mt-1"><strong>Available (Intents Explorer):</strong> Per-transaction metrics — volume, swaps, unique sender addresses, chain/token distributions, status mix, concentration.</p>
        <p className="mt-1"><strong>Rate limit:</strong> 1 request / 5 seconds per partner. Ingestion is resumable day-window with dedupe.</p>
        <p className="mt-1"><strong>Note:</strong> "Unique sender addresses" ≠ unique humans. Multi-chain users = multiple addresses.</p>
      </div>
    </div>
  );
}