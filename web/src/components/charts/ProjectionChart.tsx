"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend
} from "recharts";

interface Props {
  chartData: Array<{
    year: string;
    volume: number;
    grossFees: number;
    netRev: number;
  }>;
}

const CHART_COLORS = {
  volume: "#10b981",
  fees: "#3b82f6",
  netRev: "#8b5cf6",
};

function formatCurrency(n: number): string {
  return "$" + new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, notation: "compact" }).format(n);
}

export default function ProjectionChart({ chartData }: Props) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.volume} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={CHART_COLORS.volume} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.fees} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={CHART_COLORS.fees} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorNetRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.netRev} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={CHART_COLORS.netRev} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={{ stroke: "#374151" }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false}
            tickFormatter={v => formatCurrency(v)} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-neutral-900 border border-neutral-700 rounded p-3 text-xs">
                  <p className="font-mono text-white">{label}</p>
                  {payload.map(p => (
                    <p key={p.dataKey} className="flex items-center gap-1" style={{ color: (p.color as string) }}>
                      <span>{p.name}: </span>
                      <span className="font-mono">{formatCurrency(Number(p.value))}</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend />
          <Area type="monotone" dataKey="volume" name="Volume (USD)" stroke={CHART_COLORS.volume} fillOpacity={1} fill="url(#colorVolume)" />
          <Area type="monotone" dataKey="grossFees" name="Gross Fees (USD)" stroke={CHART_COLORS.fees} fillOpacity={1} fill="url(#colorFees)" />
          <Area type="monotone" dataKey="netRev" name="Net Revenue (USD)" stroke={CHART_COLORS.netRev} fillOpacity={1} fill="url(#colorNetRev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}