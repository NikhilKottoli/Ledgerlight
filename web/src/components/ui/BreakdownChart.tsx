"use client";

import { MetricArtifact } from "@/lib/types";
import KindBadge from "./KindBadge";
import ProvenanceButton from "./ProvenanceButton";

interface Props {
  artifact: MetricArtifact;
  registryEntry?: any;
  height?: number;
  topN?: number;
  unit?: string;
}

export default function BreakdownChart({ artifact, registryEntry, height = 300, topN = 10, unit }: Props) {
  // Process series: each point has an object value { key: value }
  // We'll show the latest point as a horizontal bar chart
  const latestPoint = [...artifact.series].reverse().find(s => s.v !== null);
  
  if (!latestPoint || typeof latestPoint.v !== 'object' || latestPoint.v === null) {
    return (
      <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <KindBadge kind={artifact.meta.data_mode === "live" ? "measured" : artifact.meta.data_mode === "snapshot" ? "derived" : "modeled"} />
        </div>
        <div className="text-center py-8 text-muted">No breakdown data available</div>
      </div>
    );
  }

  const breakdown = latestPoint.v as Record<string, number | string>;
  const entries = Object.entries(breakdown)
    .map(([key, value]) => ({ key, value: Number(value) }))
    .filter(e => !isNaN(e.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);

  const total = entries.reduce((sum, e) => sum + e.value, 0);
  const maxValue = entries[0]?.value || 1;

  const kind = artifact.meta.data_mode === "live" ? "measured" : artifact.meta.data_mode === "snapshot" ? "derived" : "modeled";
  const kindStyles = {
    measured: { bg: "bg-green-900/30", text: "text-green-300", border: "border-green-700" },
    derived: { bg: "bg-blue-900/30", text: "text-blue-300", border: "border-blue-700" },
    modeled: { bg: "bg-amber-900/30", text: "text-amber-300", border: "border-amber-700" },
  };
  const s = kindStyles[kind];

  return (
    <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 overflow-y-auto" style={{ maxHeight: height }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <KindBadge kind={kind} />
          {artifact.meta.data_mode !== "live" && (
            <span className="text-xs text-muted">
              {artifact.meta.data_mode === "snapshot" ? `Snapshot: ${artifact.meta.retrieved_at.split("T")[0]}` : "Synthetic"}
            </span>
          )}
        </div>
        {registryEntry && (
          <ProvenanceButton artifact={artifact} registryEntry={registryEntry} />
        )}
      </div>

      <div className="space-y-2">
        {entries.map((entry, i) => {
          const pct = total > 0 ? (entry.value / total) * 100 : 0;
          const width = maxValue > 0 ? (entry.value / maxValue) * 100 : 0;
          
          // Truncate long keys for display
          const displayKey = entry.key.length > 40 ? entry.key.substring(0, 37) + "..." : entry.key;
          
          return (
            <div key={`${i}-${entry.key}`} className="group">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-muted truncate max-w-[200px]" title={entry.key}>
                  {displayKey}
                </span>
                <span className="text-xs font-mono text-right text-white whitespace-nowrap">
                  {new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(entry.value)}
                  {total > 0 && ` (${pct.toFixed(1)}%)`}
                </span>
              </div>
              <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-blue-500/80 group-hover:bg-blue-500"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
        
        {total > 0 && (
          <div className="pt-2 border-t border-neutral-700 flex justify-between text-xs">
            <span className="text-muted">Total</span>
            <span className="font-mono text-white">
              {new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(total)}
              {unit && ` ${unit}`}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-muted">
        Latest: {latestPoint.t}
      </div>
    </div>
  );
}