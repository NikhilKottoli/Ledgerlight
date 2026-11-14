"use client";

import { MetricArtifact } from "@/lib/types";
import KindBadge from "./KindBadge";
import ProvenanceButton from "./ProvenanceButton";
import { chart } from "@/lib/chartTheme";

interface Props {
  artifact: MetricArtifact;
  registryEntry?: any;
  height?: number;
  topN?: number;
  unit?: string;
  title?: string;
  subtitle?: string;
  labelFormatter?: (key: string) => string;
  /** Optional observation date. Falls back to the latest non-null point. */
  date?: string;
}

function formatBreakdownValue(value: number, unit?: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    notation: Math.abs(value) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(value);
  if (!unit) return formatted;
  if (unit.toUpperCase() === "USD") return `$${formatted}`;
  return `${formatted} ${unit}`;
}

export default function BreakdownChart({
  artifact,
  registryEntry,
  height = 300,
  topN = 10,
  unit,
  title,
  subtitle,
  labelFormatter,
  date,
}: Props) {
  const latestPoint =
    (date ? artifact.series.find((point) => point.t === date && point.v !== null) : undefined) ||
    [...artifact.series].reverse().find((point) => point.v !== null);

  if (!latestPoint || typeof latestPoint.v !== "object" || latestPoint.v === null) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="section-title">{title || "Breakdown"}</h3>
          <KindBadge kind={artifact.meta.data_mode === "live" ? "measured" : artifact.meta.data_mode === "snapshot" ? "derived" : "modeled"} />
        </div>
        <div className="empty-state mt-4">
          <p className="text-[12.5px] font-medium text-ink-muted">No breakdown data available</p>
        </div>
      </div>
    );
  }

  const breakdown = latestPoint.v as Record<string, number | string>;
  const allEntries = Object.entries(breakdown)
    .map(([key, value]) => ({ key, value: Number(value) }))
    .filter((entry) => !Number.isNaN(entry.value))
    .sort((a, b) => b.value - a.value);
  const entries = allEntries.slice(0, topN);
  const total = allEntries.reduce((sum, entry) => sum + entry.value, 0);
  const maxValue = entries[0]?.value || 1;
  const kind = artifact.meta.data_mode === "live" ? "measured" : artifact.meta.data_mode === "snapshot" ? "derived" : "modeled";

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h3 className="section-title">{title || "Breakdown"}</h3>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {subtitle || `${allEntries.length} categories · ${latestPoint.t}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <KindBadge kind={kind} />
          <ProvenanceButton artifact={artifact} registryEntry={registryEntry} />
        </div>
      </div>

      <div className="overflow-y-auto px-4 pb-3 sm:px-5" style={{ maxHeight: height }}>
        <div className="space-y-2.5">
          {entries.map((entry, index) => {
            const pct = total > 0 ? (entry.value / total) * 100 : 0;
            const width = maxValue > 0 ? Math.max(1.5, (entry.value / maxValue) * 100) : 0;
            const displayKey = labelFormatter ? labelFormatter(entry.key) : entry.key;
            return (
              <div key={`${index}-${entry.key}`} className="group">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span
                    className="min-w-0 truncate font-mono text-[10.5px] text-ink-muted"
                    title={entry.key}
                  >
                    {displayKey}
                  </span>
                  <span className="tnum shrink-0 text-[11px] font-medium text-ink">
                    {formatBreakdownValue(entry.value, unit)}
                    <span className="ml-1.5 text-[10px] font-normal text-ink-faint">{pct.toFixed(1)}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${width}%`,
                      backgroundColor: chart.accent,
                      opacity: Math.max(0.42, 0.95 - index * 0.055),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-2.5 sm:px-5">
        <span className="text-[10.5px] text-ink-faint">
          Showing {entries.length} of {allEntries.length} categories
        </span>
        <span className="tnum text-[11px] text-ink-muted">
          Total <span className="ml-1 font-medium text-ink">{formatBreakdownValue(total, unit)}</span>
        </span>
      </div>
    </div>
  );
}
