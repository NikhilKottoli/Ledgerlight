"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chart, tooltipStyle } from "@/lib/chartTheme";

interface SimpleLineChartProps {
  data: Array<{
    year: string;
    buybackRatio: number;
    revYield: number;
    [key: string]: any;
  }>;
  width?: number;
  height?: number;
}

export default function SimpleLineChart({ data, height = 240 }: SimpleLineChartProps) {
  if (!data.length) {
    return (
      <div className="empty-state" style={{ height }}>
        <p className="text-[12.5px] font-medium text-ink-muted">No ratio data</p>
      </div>
    );
  }

  const maxValue = Math.max(100, ...data.flatMap((d) => [d.buybackRatio, d.revYield]));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[2px] w-3.5 rounded-full bg-ochre" /> Buyback / issuance
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[2px] w-3.5 rounded-full bg-sage" /> Revenue yield
          </span>
        </div>
        <span className="text-[10px] text-ink-faint">Dashed line = 100% target</span>
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chart.grid} strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: chart.faint, fontSize: 10.5 }}
              tickLine={false}
              axisLine={{ stroke: chart.axis }}
              tickMargin={8}
            />
            <YAxis
              domain={[0, Math.ceil(maxValue / 10) * 10]}
              tick={{ fill: chart.faint, fontSize: 10.5 }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(value: number) => `${value}%`}
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
                          <span className="tnum font-medium text-ink">{Number(item.value).toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={100}
              stroke={chart.ochre}
              strokeDasharray="3 4"
              strokeOpacity={0.45}
              label={{ value: "100%", position: "insideTopRight", fill: chart.ochre, fontSize: 9 }}
            />
            <Line
              type="monotone"
              dataKey="buybackRatio"
              name="Buyback / issuance"
              stroke={chart.ochre}
              strokeWidth={2}
              dot={{ r: 2.4, fill: chart.ochre, strokeWidth: 0 }}
              activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="revYield"
              name="Revenue yield"
              stroke={chart.sage}
              strokeWidth={2}
              dot={{ r: 2.4, fill: chart.sage, strokeWidth: 0 }}
              activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
