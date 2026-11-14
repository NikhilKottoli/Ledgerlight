"use client";
import { MetricArtifact } from "@/lib/types";
import KindBadge from "./KindBadge";
import ProvenanceButton from "./ProvenanceButton";
import Sparkline from "./Sparkline";
import { IconTrendDown, IconTrendUp } from "./icons";
import { formatMetricValue, seriesTrend } from "@/lib/chartTheme";

function getLatestCompletePoint(series: Array<{ t: string; v: number | string | null }>, todayOverride?: string) {
  const today = todayOverride || new Date().toISOString().split("T")[0];
  // Find the last point that's not today and has a value
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].v !== null && series[i].t !== today) {
      return { ...series[i], v: Number(series[i].v) };
    }
  }
  // Fallback: last point with value (even if today)
  const last = series.findLast((s) => s.v !== null);
  return last ? { ...last, v: Number(last.v) } : null;
}

function getPrevPoint(series: Array<{ t: string; v: number | string | null }>, latest: { t: string; v: number | null } | null) {
  if (!latest) return null;
  const latestIdx = series.findIndex((s) => s.t === latest.t);
  if (latestIdx <= 0) return null;
  for (let i = latestIdx - 1; i >= 0; i--) {
    if (series[i].v !== null) {
      return { ...series[i], v: Number(series[i].v) };
    }
  }
  return null;
}

interface Props {
  artifact: MetricArtifact;
  registryEntry?: any;
  label: string;
  unit: string;
  previousPeriodLabel?: string;
  todayOverride?: string;
  /** Show the newest observation, even when it falls on the current day. */
  preferLatest?: boolean;
}

export default function KpiCard({
  artifact,
  registryEntry,
  label,
  unit,
  previousPeriodLabel,
  todayOverride,
  preferLatest = false,
}: Props) {
  const lastObserved = artifact.series.findLast((s) => s.v !== null);
  const latest = preferLatest
    ? lastObserved
      ? { ...lastObserved, v: Number(lastObserved.v) }
      : null
    : getLatestCompletePoint(artifact.series, todayOverride);
  const prev = getPrevPoint(artifact.series, latest);
  const value = latest?.v ?? null;
  const prevValue = prev?.v ?? null;
  const delta =
    value !== null && prevValue !== null && prevValue !== 0
      ? ((Number(value) - Number(prevValue)) / Number(prevValue)) * 100
      : null;
  const hasData = artifact.series.some((s) => s.v !== null);
  const formatted = value !== null ? formatMetricValue(value, unit) : null;
  const trend = seriesTrend(artifact.series, 30);

  return (
    <div className="card flex min-h-[148px] flex-col justify-between p-4 sm:p-[18px]" suppressHydrationWarning>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium leading-snug text-ink-muted" title={label}>
          {label}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <KindBadge kind={artifact.meta.data_mode === "live" ? "measured" : artifact.meta.data_mode === "snapshot" ? "derived" : "modeled"} />
          <ProvenanceButton artifact={artifact} registryEntry={registryEntry} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {hasData && formatted ? (
            <p className="flex flex-wrap items-baseline gap-x-1.5" title={formatted.full}>
              <span className="stat-value whitespace-nowrap">{formatted.value}</span>
              {formatted.suffix && (
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">{formatted.suffix}</span>
              )}
            </p>
          ) : (
            <p className="text-[13px] text-ink-faint">No data reported</p>
          )}
        </div>
        <Sparkline values={trend} positive={trend.length > 1 ? trend[trend.length - 1] >= trend[0] : true} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line/70 pt-2.5">
        {delta !== null ? (
          <span className="inline-flex items-center gap-1.5 text-[11.5px]">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium tabular-nums ${
                delta >= 0 ? "bg-sage-soft text-sage-deep" : "bg-danger-soft text-danger-deep"
              }`}
            >
              {delta >= 0 ? <IconTrendUp className="h-3 w-3" /> : <IconTrendDown className="h-3 w-3" />}
              {delta >= 0 ? "+" : "−"}
              {Math.abs(delta).toFixed(2)}%
            </span>
            <span className="text-ink-faint">{previousPeriodLabel || "vs prior period"}</span>
          </span>
        ) : (
          <span className="text-[11px] text-ink-faint">No prior comparison</span>
        )}
        <span
          className="text-[10.5px] text-ink-faint"
          title={new Date(artifact.meta.retrieved_at).toLocaleString()}
        >
          {latest ? `As of ${latest.t}` : `Retrieved ${artifact.meta.retrieved_at.split("T")[0]}`}
        </span>
      </div>
    </div>
  );
}
