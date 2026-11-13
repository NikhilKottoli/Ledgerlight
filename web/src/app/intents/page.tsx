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

const METRICS = [
  { id: "intents.volume_usd.daily", label: "Volume (USD)", unit: "USD" },
  { id: "intents.swaps.daily", label: "Swaps", unit: "" },
  { id: "intents.unique_sender_addresses.daily", label: "Unique Sender Addresses", unit: "" },
  { id: "intents.avg_swap_usd.daily", label: "Avg Swap Size", unit: "USD" },
];

export default function IntentsPage() {
  const artifacts = METRICS.map(m => ({ ...m, artifact: loadArtifact(m.id) }));
  const hasData = artifacts.some(a => a.artifact);

  if (!hasData) {
    return (
      <div className="space-y-6">
        <header className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Intents</h1>
          <p className="text-muted mt-1">NEAR Intents activity: volume, swaps, addresses, chains, tokens</p>
        </header>
        <LockedPanel
          title="Intents Data Unavailable"
          description="No Intents Explorer data found. This requires a JWT from partners.near-intents.org."
          missing="NEAR_INTENTS_JWT in .env"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Intents</h1>
        <p className="text-muted mt-1">NEAR Intents activity: volume, swaps, addresses, chains, tokens</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {artifacts.map(({ artifact, label, unit }) => (
          artifact && <KpiCard key={artifact.meta.metric_id} artifact={artifact} label={label} unit={unit} previousPeriodLabel="vs prior day" />
        ))}
      </div>

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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Status Mix</h3>
          <p className="text-sm text-muted">Success / Failed / Refunded / In-flight breakdown</p>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Chain Distribution</h3>
          <p className="text-sm text-muted">Origin → Destination chain volume</p>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Token Distribution</h3>
          <p className="text-sm text-muted">Origin → Destination token volume</p>
        </div>
      </div>
    </div>
  );
}
