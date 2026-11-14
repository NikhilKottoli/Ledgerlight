"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface Props {
  chartData: Array<{
    year: string;
    buybackRatio: number;
    revYield: number;
  }>;
}

const CHART_COLORS = {
  buyback: "#f59e0b",
  yield: "#06b6d4",
};

export default function KeyRatiosChart({ chartData }: Props) {
  return (
    <div className="h-56 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={{ stroke: "#374151" }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false}
            tickFormatter={v => Number(v).toFixed(1) + "%"} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-neutral-900 border border-neutral-700 rounded p-3 text-xs">
                  <p className="font-mono text-white">{label}</p>
                  {payload.map(p => (
                    <p key={p.dataKey} className="flex items-center gap-1" style={{ color: (p.color as string) }}>
                      <span>{p.name}: </span>
                      <span className="font-mono">{Number(p.value).toFixed(1)}%</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="buybackRatio" name="Buyback / Issuance" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="revYield" name="Revenue Yield" stroke="#06b6d4" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}