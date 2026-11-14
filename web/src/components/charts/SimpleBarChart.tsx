"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chart, formatNumber, tooltipStyle } from "@/lib/chartTheme";

interface SimpleBarChartProps {
  data: Array<{
    year: string;
    buybackNEAR: number;
    issuance: number;
    [key: string]: any;
  }>;
  width?: number;
  height?: number;
}

export default function SimpleBarChart({ data, height = 240 }: SimpleBarChartProps) {
  if (!data.length) {
    return (
      <div className="empty-state" style={{ height }}>
        <p className="text-[12.5px] font-medium text-ink-muted">No buyback data</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-ochre" /> Buyback
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-info" /> Net issuance
          </span>
        </div>
        <span className="text-[10px] text-ink-faint">NEAR per year</span>
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid stroke={chart.grid} strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: chart.faint, fontSize: 10.5 }}
              tickLine={false}
              axisLine={{ stroke: chart.axis }}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: chart.faint, fontSize: 10.5 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => formatNumber(value)}
            />
            <Tooltip
              cursor={{ fill: chart.surfaceMuted }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div style={tooltipStyle}>
                    <p className="font-mono text-[10.5px] text-ink-faint">{label}</p>
                    <div className="mt-1.5 space-y-1">
                      {payload.map((item: any) => (
                        <div key={item.dataKey} className="flex items-center justify-between gap-5 text-[11.5px]">
                          <span className="text-ink-muted">{item.name}</span>
                          <span className="tnum font-medium text-ink">{formatNumber(Number(item.value))} NEAR</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="buybackNEAR" name="Buyback" fill={chart.ochre} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            <Bar dataKey="issuance" name="Net issuance" fill={chart.slateSoft} stroke={chart.slate} strokeWidth={1} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
