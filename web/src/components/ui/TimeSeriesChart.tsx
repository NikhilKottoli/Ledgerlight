"use client";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricArtifact } from "@/lib/types";
import { EventMarker } from "./EventMarkers";
import KindBadge from "./KindBadge";
import ProvenanceButton from "./ProvenanceButton";
import {
  chart,
  daysBetween,
  formatAxisValue,
  formatChartValue,
  formatDateTick,
  formatLongDate,
  tooltipStyle,
} from "@/lib/chartTheme";

interface Props {
  artifact: MetricArtifact;
  registryEntry?: any;
  height?: number;
  showBrush?: boolean;
  kindOverride?: "measured" | "derived" | "modeled";
  /** Optional card heading. When omitted, the metric id is shown. */
  title?: string;
  subtitle?: string;
  className?: string;
}

interface ChartPoint {
  t: string;
  v: number | null;
  null_reason: string | null;
}

export default function TimeSeriesChart({
  artifact,
  registryEntry,
  height = 300,
  showBrush = true,
  kindOverride,
  title,
  subtitle,
  className = "",
}: Props) {
  const data = useMemo(() => {
    const seen = new Set<string>();
    return artifact.series
      .map<ChartPoint>((s) => ({
        t: s.t,
        v: s.v !== null ? Number(s.v) : null,
        null_reason: s.null_reason,
      }))
      .filter((s) => {
        if (seen.has(s.t)) return false;
        seen.add(s.t);
        return true;
      });
  }, [artifact.series]);

  const kind = kindOverride || (artifact.meta.data_mode === "live" ? "measured" : artifact.meta.data_mode === "snapshot" ? "derived" : "modeled");
  const hasData = data.some((point) => point.v !== null);
  const first = data.find((p) => p.v !== null)?.t || data[0]?.t || "";
  const last = [...data].reverse().find((p) => p.v !== null)?.t || data[data.length - 1]?.t || "";
  const span = first && last ? daysBetween(first, last) : 0;
  const gradientId = `series-${artifact.meta.metric_id.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const strokeDasharray = kind === "modeled" ? "5 4" : kind === "derived" ? "6 3" : undefined;
  const showDots = data.filter((p) => p.v !== null).length <= 16;

  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h3 className="section-title truncate" title={title || artifact.meta.metric_id}>
            {title || artifact.meta.metric_id}
          </h3>
          <p className="mt-0.5 truncate font-mono text-[10.5px] text-ink-faint">
            {subtitle || `${data.length} daily observations`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {artifact.meta.data_mode !== "live" && (
            <span className="badge border-line bg-surface-subtle text-ink-muted">
              {artifact.meta.data_mode === "snapshot" ? `Snapshot ${artifact.meta.retrieved_at.split("T")[0]}` : "Synthetic"}
            </span>
          )}
          <KindBadge kind={kind} />
          <ProvenanceButton artifact={artifact} registryEntry={registryEntry} />
        </div>
      </div>

      {!hasData ? (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="empty-state">
            <p className="text-[12.5px] font-medium text-ink-muted">No observations reported</p>
            <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-ink-faint">
              The source returned an empty series for this metric. It stays visible so the gap is explicit.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ width: "100%", height }} className="px-1 sm:px-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 14, left: 2, bottom: showBrush ? 0 : 8 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chart.accent} stopOpacity={0.16} />
                  <stop offset="85%" stopColor={chart.accent} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chart.grid} strokeDasharray="3 4" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fill: chart.faint, fontSize: 10.5 }}
                tickLine={false}
                axisLine={{ stroke: chart.axis }}
                tickMargin={8}
                minTickGap={40}
                interval="preserveStartEnd"
                tickFormatter={(value: string) => formatDateTick(value, span)}
              />
              <YAxis
                tick={{ fill: chart.faint, fontSize: 10.5 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickMargin={4}
                tickFormatter={(value: number) => formatAxisValue(artifact.meta.metric_id, value)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const point = payload[0].payload as ChartPoint;
                  return (
                    <div style={tooltipStyle}>
                      <p className="font-mono text-[10.5px] text-ink-faint">{formatLongDate(String(label))}</p>
                      {point.v === null ? (
                        <p className="mt-1 text-[12px] text-ochre-deep">No observation</p>
                      ) : (
                        <p className="mt-1 text-[13px] font-semibold tabular-nums text-ink">
                          {formatChartValue(artifact.meta.metric_id, point.v)}
                        </p>
                      )}
                      {point.null_reason && (
                        <p className="mt-1 max-w-[220px] text-[10.5px] leading-relaxed text-ochre-deep">
                          Gap: {point.null_reason}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="v"
                name={artifact.meta.metric_id}
                stroke={chart.accent}
                strokeWidth={2}
                strokeDasharray={strokeDasharray}
                fill={`url(#${gradientId})`}
                connectNulls={false}
                dot={showDots ? { r: 2.4, fill: chart.accent, strokeWidth: 0 } : false}
                activeDot={{ r: 4, fill: chart.accent, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <EventMarker eventsPath="/data/events.json" start={first} end={last} />
              {showBrush && data.length > 30 && (
                <Brush
                  dataKey="t"
                  height={24}
                  travellerWidth={6}
                  stroke={chart.axis}
                  fill={chart.surfaceMuted}
                  tickFormatter={(value: string) => formatDateTick(value, span)}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-2 sm:px-5">
        <span className="text-[10.5px] text-ink-faint">
          {first && last ? (
            <>
              {formatLongDate(first)} — {formatLongDate(last)}
            </>
          ) : (
            "No dated observations"
          )}
        </span>
        <span className="text-[10.5px] text-ink-faint">
          {showBrush && data.length > 30 ? "Drag the range handles to inspect a window" : `${data.length} observations`}
        </span>
      </div>
    </div>
  );
}
