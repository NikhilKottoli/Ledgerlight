"use client";
import { MetricArtifact } from "@/lib/types";
import KindBadge from "./KindBadge";
import ProvenanceButton from "./ProvenanceButton";

interface Props {
  artifact: MetricArtifact;
  registryEntry?: any;
  label: string;
  unit: string;
  previousPeriodLabel?: string;
}

function getLatestCompletePoint(series: Array<{ t: string; v: number | string | null }>) {
  const today = new Date().toISOString().split("T")[0];
  // Find the last point that's not today and has a value
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].v !== null && series[i].t !== today) {
      return { ...series[i], v: Number(series[i].v) };
    }
  }
  // Fallback: last point with value (even if today)
  const last = series.findLast(s => s.v !== null);
  return last ? { ...last, v: Number(last.v) } : null;
}

function getPrevPoint(series: Array<{ t: string; v: number | string | null }>, latest: { t: string; v: number | null } | null) {
  if (!latest) return null;
  const latestIdx = series.findIndex(s => s.t === latest.t);
  if (latestIdx <= 0) return null;
  for (let i = latestIdx - 1; i >= 0; i--) {
    if (series[i].v !== null) {
      return { ...series[i], v: Number(series[i].v) };
    }
  }
  return null;
}

export default function KpiCard({ artifact, registryEntry, label, unit, previousPeriodLabel }: Props) {
  const latest = getLatestCompletePoint(artifact.series);
  const prev = getPrevPoint(artifact.series, latest);
  const value = latest?.v ?? null;
  const prevValue = prev?.v ?? null;
  const delta = value !== null && prevValue !== null ? ((Number(value) - Number(prevValue)) / Number(prevValue)) * 100 : null;

  const format = (n: number | null) => n === null ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

  return (
    <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-muted truncate">{label}</p>
          <p className="mt-1 text-2xl font-mono tabular-nums font-semibold">{format(value)} <span className="text-base font-normal text-muted">{unit}</span></p>
          {delta !== null && (
            <p className="mt-1 text-xs flex items-center gap-1">
              <span className={delta >= 0 ? "text-green-400" : "text-red-400"}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}%
              </span>
              <span className="text-muted">{previousPeriodLabel || "vs prior period"}</span>
            </p>
          )}
          <p className="mt-1 text-xs text-muted">Updated: {new Date(artifact.meta.retrieved_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <KindBadge kind={artifact.meta.data_mode === "live" ? "measured" : artifact.meta.data_mode === "snapshot" ? "derived" : "modeled"} />
          <ProvenanceButton artifact={artifact} registryEntry={registryEntry} />
        </div>
      </div>
    </div>
  );
}
