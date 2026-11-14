"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricArtifact } from "@/lib/types";
import { EventMarker } from "./EventMarkers";
import { chart, daysBetween, formatAxisValue, formatChartValue, formatDateTick, formatLongDate, tooltipStyle } from "@/lib/chartTheme";
import { IconInfo } from "./icons";

export interface MultiSeriesInput {
  metricId: string;
  label: string;
  artifact: MetricArtifact;
  color: string;
}

interface Props {
  series: MultiSeriesInput[];
  title: string;
  subtitle?: string;
  height?: number;
  initialRange?: 30 | 90 | 180 | 0;
  yAxisMetricId?: string;
  footnote?: string;
}

const RANGES = [
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
  { label: "180D", value: 180 },
  { label: "All", value: 0 },
] as const;

export default function MultiSeriesChart({
  series,
  title,
  subtitle,
  height = 320,
  initialRange = 180,
  yAxisMetricId,
  footnote,
}: Props) {
  const [range, setRange] = useState<number>(initialRange);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const { rows, first, last } = useMemo(() => {
    const byDate = new Map<string, Record<string, number | string | null>>();
    for (const input of series) {
      for (const point of input.artifact.series) {
        if (point.v === null || Number.isNaN(Number(point.v))) continue;
        const row = byDate.get(point.t) || { t: point.t };
        row[input.metricId] = Number(point.v);
        byDate.set(point.t, row);
      }
    }
    const sorted = [...byDate.values()].sort((a, b) => String(a.t).localeCompare(String(b.t)));
    const limited = range > 0 ? sorted.slice(-range) : sorted;
    return {
      rows: limited,
      first: limited[0]?.t as string | undefined,
      last: limited[limited.length - 1]?.t as string | undefined,
    };
  }, [series, range]);

  const span = first && last ? daysBetween(first, last) : 0;
  const visible = series.filter((s) => !hidden[s.metricId]);
  const unitMetric = yAxisMetricId || series[0]?.metricId || "";

  const toggle = (metricId: string) => {
    setHidden((prev) => {
      // Keep at least one series visible.
      const next = { ...prev, [metricId]: !prev[metricId] };
      if (series.every((s) => next[s.metricId])) return prev;
      return next;
    });
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented" role="group" aria-label="Chart range">
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRange(r.value)}
                aria-pressed={range === r.value}
                className={`segmented-item ${range === r.value ? "segmented-item-active" : ""}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="badge border-line bg-surface-subtle text-ink-faint">
            <IconInfo className="h-3 w-3" />
            Daily
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 pb-2 sm:px-5" aria-label="Series legend">
        {series.map((input) => {
          const isHidden = !!hidden[input.metricId];
          return (
            <button
              key={input.metricId}
              type="button"
              onClick={() => toggle(input.metricId)}
              aria-pressed={!isHidden}
              className={`inline-flex items-center gap-1.5 text-[11.5px] transition-opacity ${
                isHidden ? "opacity-40" : "opacity-100"
              }`}
              title={`${isHidden ? "Show" : "Hide"} ${input.label}`}
            >
              <span className="h-[2px] w-3.5 rounded-full" style={{ backgroundColor: input.color }} />
              <span className="text-ink-muted">{input.label}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="empty-state">
            <p className="text-[12.5px] font-medium text-ink-muted">No overlapping observations</p>
            <p className="mt-1 text-[11.5px] text-ink-faint">The selected series do not share any dated observations.</p>
          </div>
        </div>
      ) : (
        <div style={{ width: "100%", height }} className="px-1 sm:px-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 12, right: 16, left: 2, bottom: 6 }}>
              <CartesianGrid stroke={chart.grid} strokeDasharray="3 4" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fill: chart.faint, fontSize: 10.5 }}
                tickLine={false}
                axisLine={{ stroke: chart.axis }}
                tickMargin={8}
                minTickGap={46}
                interval="preserveStartEnd"
                tickFormatter={(value: string) => formatDateTick(value, span)}
              />
              <YAxis
                tick={{ fill: chart.faint, fontSize: 10.5 }}
                tickLine={false}
                axisLine={false}
                width={54}
                tickMargin={4}
                tickFormatter={(value: number) => formatAxisValue(unitMetric, value)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div style={tooltipStyle}>
                      <p className="font-mono text-[10.5px] text-ink-faint">{formatLongDate(String(label))}</p>
                      <div className="mt-1.5 space-y-1">
                        {series
                          .filter((s) => !hidden[s.metricId])
                          .map((s) => {
                            const item = payload.find((p) => p.dataKey === s.metricId);
                            if (!item || item.value === undefined || item.value === null) return null;
                            return (
                              <div key={s.metricId} className="flex items-center justify-between gap-5">
                                <span className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
                                  <span className="h-[2px] w-3 rounded-full" style={{ backgroundColor: s.color }} />
                                  {s.label}
                                </span>
                                <span className="tnum text-[11.5px] font-medium text-ink">
                                  {formatChartValue(s.metricId, Number(item.value))}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                }}
              />
              {visible.map((input) => (
                <Line
                  key={input.metricId}
                  type="monotone"
                  dataKey={input.metricId}
                  name={input.label}
                  stroke={input.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3.5, stroke: "#fff", strokeWidth: 1.5 }}
                  isAnimationActive={false}
                />
              ))}
              <EventMarker eventsPath="/data/events.json" start={first} end={last} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-2 sm:px-5">
        <span className="text-[10.5px] text-ink-faint">
          {first && last ? `${formatLongDate(first)} — ${formatLongDate(last)}` : "No dated observations"}
        </span>
        <span className="text-[10.5px] text-ink-faint">{footnote || "Click a legend item to isolate a series"}</span>
      </div>
    </div>
  );
}
