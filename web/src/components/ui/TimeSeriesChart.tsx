"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Brush, Legend,
} from "recharts";
import { MetricArtifact, SeriesPoint } from "@/lib/types";
import { EventMarker } from "./EventMarkers";
import KindBadge from "./KindBadge";

interface Props {
  artifact: MetricArtifact;
  registryEntry?: any;
  height?: number;
  showBrush?: boolean;
  kindOverride?: "measured" | "derived" | "modeled";
}

const kindStyles = {
  measured: { stroke: "#10b981", strokeDasharray: "0", strokeWidth: 2 },
  derived: { stroke: "#3b82f6", strokeDasharray: "6 4", strokeWidth: 2 },
  modeled: { stroke: "#f59e0b", strokeDasharray: "2 4", strokeWidth: 2, opacity: 0.85 },
};

export default function TimeSeriesChart({ artifact, registryEntry, height = 300, showBrush = true, kindOverride }: Props) {
  const data = artifact.series.map(s => ({
    t: s.t,
    v: s.v,
    null_reason: s.null_reason,
  }));

  const kind = kindOverride || (artifact.meta.data_mode === "live" ? "measured" : artifact.meta.data_mode === "snapshot" ? "derived" : "modeled");
  const style = kindStyles[kind];

  return (
    <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 h-[{height}px]">
      <div className="flex items-center justify-between mb-2">
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

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: showBrush ? 50 : 5 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#374151" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(v)}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload.length) return null;
              const point = payload[0].payload as SeriesPoint;
              return (
                <div className="bg-neutral-900 border border-neutral-700 rounded p-3 text-xs">
                  <p className="font-mono text-white">{label}</p>
                  <p className="text-green-300">{new Intl.NumberFormat().format(point.v ?? 0)}</p>
                  {point.null_reason && <p className="text-amber-300 mt-1">Gap: {point.null_reason}</p>}
                </div>
              );
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="v"
            name={artifact.meta.metric_id}
            connectNulls={false}
            {...style}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
          <EventMarker eventsPath="/data/events.json" />
          {showBrush && <Brush dataKey="v" height={30} stroke="#3b82f6" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
