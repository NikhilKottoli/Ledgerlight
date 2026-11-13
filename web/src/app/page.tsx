import { Metadata } from "next";
import KpiCard from "@/components/ui/KpiCard";
import TimeSeriesChart from "@/components/ui/TimeSeriesChart";
import { MetricArtifact } from "@/lib/types";
import fs from "fs";
import path from "path";

export const metadata: Metadata = { title: "NEAR Value Intelligence — Overview" };

function loadArtifact(): MetricArtifact | null {
  const p = path.join(process.cwd(), "public/data/defillama.tvl.near_intents.daily.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as MetricArtifact;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const artifact = loadArtifact();
  const latest = artifact?.series.findLast(s => s.v !== null);

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
          />
        )}
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 col-span-2 lg:col-span-1">
          <p className="text-sm text-muted">Vertical Slice</p>
          <p className="mt-1 text-xl font-mono font-semibold">DefiLlama TVL</p>
          <p className="mt-1 text-sm text-muted">
            This is the Plan 02 vertical slice: one metric working end-to-end.
            Source → Registry → JSON → Chart → Provenance → <code className="bg-neutral-800 px-1 rounded">make rebuild</code>
          </p>
          <p className="mt-3 text-xs text-muted">
            Data mode: {artifact?.meta.data_mode} • {artifact?.series.length} daily points • Updated {artifact?.meta.retrieved_at?.split("T")[0]}
          </p>
        </div>
      </div>

      {artifact && (
        <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">TVL History (Daily)</h2>
          <TimeSeriesChart artifact={artifact} height={400} />
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Plan 03: Onchain & Market Data</h3>
          <ul className="text-sm text-muted space-y-1">
            <li>• BigQuery network metrics</li>
            <li>• Revenue wallet reconstruction</li>
            <li>• Buyback vs burn trace</li>
            <li>• Three-way reconciliation</li>
          </ul>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Plan 04: Intents Ingestion</h3>
          <ul className="text-sm text-muted space-y-1">
            <li>• Explorer API (1 req/5s)</li>
            <li>• Per-chain/token/sender cubes</li>
            <li>• Fee unit verification</li>
            <li>• DefiLlama cross-check</li>
          </ul>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Plan 05: Flow Ledger & Sankey</h3>
          <ul className="text-sm text-muted space-y-1">
            <li>• Gross fees → protocol revenue → buyback</li>
            <li>• Explicit unreconciled nodes</li>
            <li>• Typed units (USD/NEAR, gross/net)</li>
            <li>• Buyback vs burn traced</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
