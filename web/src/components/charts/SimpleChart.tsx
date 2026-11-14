"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chart, formatUsd, tooltipStyle } from "@/lib/chartTheme";

interface SimpleChartProps {
  data: Array<{
    year: string;
    volume: number;
    grossFees: number;
    netRev: number;
    [key: string]: any;
  }>;
  width?: number;
  height?: number;
}

export default function SimpleChart({ data, height = 300 }: SimpleChartProps) {
  if (!data.length) {
    return (
      <div className="empty-state" style={{ height }}>
        <p className="text-[12.5px] font-medium text-ink-muted">No projection data</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> Volume
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[2px] w-3.5 rounded-full bg-info" /> Gross fees
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[2px] w-3.5 rounded-full bg-sage" /> Net revenue
          </span>
        </div>
        <span className="text-[10px] text-ink-faint">Volume on left axis · fees and revenue on right</span>
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="projection-volume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chart.accent} stopOpacity={0.18} />
                <stop offset="100%" stopColor={chart.accent} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chart.grid} strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: chart.faint, fontSize: 10.5 }}
              tickLine={false}
              axisLine={{ stroke: chart.axis }}
              tickMargin={8}
            />
            <YAxis
              yAxisId="volume"
              tick={{ fill: chart.faint, fontSize: 10.5 }}
              tickLine={false}
              axisLine={false}
              width={46}
              tickFormatter={(value: number) => formatUsd(value)}
            />
            <YAxis
              yAxisId="fees"
              orientation="right"
              tick={{ fill: chart.faint, fontSize: 10.5 }}
              tickLine={false}
              axisLine={false}
              width={46}
              tickFormatter={(value: number) => formatUsd(value)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div style={tooltipStyle}>
                    <p className="font-mono text-[10.5px] text-ink-faint">{label}</p>
                    <div className="mt-1.5 space-y-1">
                      {payload.map((item: any) => (
                        <div key={item.dataKey} className="flex items-center justify-between gap-5 text-[11.5px]">
                          <span className="text-ink-muted">{item.name}</span>
                          <span className="tnum font-medium text-ink">{formatUsd(Number(item.value), false)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              yAxisId="volume"
              type="monotone"
              dataKey="volume"
              name="Volume"
              stroke={chart.accent}
              strokeWidth={2}
              fill="url(#projection-volume)"
              dot={{ r: 2.6, fill: chart.accent, strokeWidth: 0 }}
              activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="fees"
              type="monotone"
              dataKey="grossFees"
              name="Gross fees"
              stroke={chart.slate}
              strokeWidth={1.8}
              dot={{ r: 2.2, fill: chart.slate, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="fees"
              type="monotone"
              dataKey="netRev"
              name="Net revenue"
              stroke={chart.sage}
              strokeWidth={1.8}
              dot={{ r: 2.2, fill: chart.sage, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
