"use client";

import KpiCard from "@/components/ui/KpiCard";
import TimeSeriesChart from "@/components/ui/TimeSeriesChart";
import { useMetric } from "@/hooks/useMetric";

export default function HomePage() {
  const { artifact, isLoading } = useMetric("defillama.tvl.near_intents.daily");
  const latest = artifact?.series.findLast(s => s.v !== null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <header className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">NEAR Value Intelligence</h1>
          <p className="text-muted mt-1">Follow the money. Verify the value.</p>
        </header>
        <div className="text-center py-12 text-muted">Loading live data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">NEAR Value Intelligence</h1>
        <p className="text-muted mt-1">Follow the money. Verify the value.</p>
        <p className="text-sm text-muted mt-2">
          Does NEAR's growing Intents activity turn into sustainable economic value for NEAR tokenholders?
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {artifact && latest && (
          <KpiCard
            artifact={artifact}
            label="DefiLlama TVL (NEAR Intents)"
            unit="USD"
            previousPeriodLabel="vs prior day"
            todayOverride={latest.t}
          />
        )}
      </div>

      {artifact && (
        <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">TVL History (Daily)</h2>
          <TimeSeriesChart artifact={artifact} height={400} />
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Onchain & Market Data</h3>
          <ul className="text-sm text-muted space-y-1">
            <li>Network metrics & activity</li>
            <li>Revenue wallet reconstruction</li>
            <li>Buyback vs burn trace</li>
            <li>Three-way reconciliation</li>
          </ul>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Intents Ingestion</h3>
          <ul className="text-sm text-muted space-y-1">
            <li>Explorer API (1 req/5s)</li>
            <li>Per-chain/token/sender analysis</li>
            <li>Fee unit verification</li>
            <li>DefiLlama cross-check</li>
          </ul>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Flow Ledger & Sankey</h3>
          <ul className="text-sm text-muted space-y-1">
            <li>Gross fees → protocol revenue → buyback</li>
            <li>Explicit unreconciled amounts</li>
            <li>Typed units (USD/NEAR, gross/net)</li>
            <li>Buyback vs burn traced</li>
          </ul>
        </div>
      </section>
    </div>
  );
}