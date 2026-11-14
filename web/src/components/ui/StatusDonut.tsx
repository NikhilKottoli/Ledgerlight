"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { MetricArtifact } from "@/lib/types";
import KindBadge from "./KindBadge";
import ProvenanceButton from "./ProvenanceButton";
import { chart, tooltipStyle } from "@/lib/chartTheme";

interface Props {
  artifact: MetricArtifact;
  date?: string;
  title?: string;
  subtitle?: string;
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: chart.sage,
  PROCESSING: chart.slate,
  PENDING_DEPOSIT: chart.ochre,
  PENDING: chart.ochre,
  INCOMPLETE_DEPOSIT: "#c49a5c",
  REFUNDED: chart.mauve,
  FAILED: chart.danger,
};

function prettyStatus(key: string): string {
  return key
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function StatusDonut({ artifact, date, title = "Status mix", subtitle }: Props) {
  const point =
    (date ? artifact.series.find((s) => s.t === date && s.v !== null) : undefined) ||
    [...artifact.series].reverse().find((s) => s.v !== null);

  if (!point || typeof point.v !== "object" || point.v === null) {
    return (
      <div className="card p-5">
        <h3 className="section-title">{title}</h3>
        <div className="empty-state mt-4">
          <p className="text-[12.5px] font-medium text-ink-muted">No status observations</p>
        </div>
      </div>
    );
  }

  const entries = Object.entries(point.v as Record<string, number | string>)
    .map(([key, value]) => ({ key, value: Number(value) }))
    .filter((entry) => !Number.isNaN(entry.value) && entry.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const kind = artifact.meta.data_mode === "live" ? "measured" : artifact.meta.data_mode === "snapshot" ? "derived" : "modeled";

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h3 className="section-title">{title}</h3>
          <p className="mt-0.5 text-[11px] text-ink-faint">{subtitle || `${point.t} · transaction count`}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <KindBadge kind={kind} />
          <ProvenanceButton artifact={artifact} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 px-4 pb-5 pt-1 sm:flex-row sm:gap-4 sm:px-5">
        <div className="relative h-[190px] w-[190px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={entries}
                dataKey="value"
                nameKey="key"
                innerRadius={58}
                outerRadius={82}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {entries.map((entry, index) => (
                  <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || chartPaletteFallback[index % chartPaletteFallback.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0];
                  const value = Number(item.value);
                  return (
                    <div style={tooltipStyle}>
                      <p className="text-[11.5px] font-medium text-ink">{prettyStatus(String(item.name))}</p>
                      <p className="tnum mt-1 text-[11.5px] text-ink-muted">
                        {new Intl.NumberFormat("en-US").format(value)} tx ·{" "}
                        {total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"}%
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="tnum text-[19px] font-semibold tracking-[-0.03em] text-ink">
              {new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(total)}
            </span>
            <span className="text-[9.5px] uppercase tracking-[0.1em] text-ink-faint">transactions</span>
          </div>
        </div>

        <div className="w-full min-w-0 space-y-1.5">
          {entries.map((entry) => (
            <div key={entry.key} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-[11.5px] text-ink-muted">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[entry.key] || chart.warmGray }}
                />
                <span className="truncate">{prettyStatus(entry.key)}</span>
              </span>
              <span className="tnum shrink-0 text-[11px] text-ink">
                {new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(entry.value)}
                <span className="ml-1 text-[10px] text-ink-faint">
                  {total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0"}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const chartPaletteFallback = ["#b45a3c", "#4d6b85", "#557a60", "#a8742a", "#8a6a7e", "#9c9287"];
