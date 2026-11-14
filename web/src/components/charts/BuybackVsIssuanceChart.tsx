"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface Props {
  chartData: Array<{
    year: string;
    buybackNEAR: number;
    issuance: number;
  }>;
}

const CHART_COLORS = {
  buyback: "#f59e0b",
  issuance: "#ef4444",
};

function formatCurrency(n: number): string {
  return "$" + new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, notation: "compact" }).format(n);
}

export default function BuybackVsIssuanceChart({ chartData }: Props) {
  return (
    <div className="h-56 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
          <Bar dataKey="buybackNEAR" name="Buyback (NEAR)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="issuance" name="Issuance (NEAR)" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}