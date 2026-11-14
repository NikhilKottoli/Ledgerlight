"use client";

import { useMemo } from "react";

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

export default function SimpleLineChart({ data, width = 600, height = 300 }: SimpleLineChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return null;
    
    const allValues = data.flatMap(d => [d.buybackRatio, d.revYield]);
    const maxValue = Math.max(...allValues);
    const minValue = 0;
    
    const padding = { top: 20, right: 80, bottom: 40, left: 60 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    
    const xScale = (i: number) => padding.left + (i / (data.length - 1)) * innerWidth;
    const yScale = (value: number) => padding.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight;
    
    return { xScale, yScale, maxValue, padding, innerWidth, innerHeight };
  }, [data, width, height]);
  
  if (!chartData) {
    return <svg width={width} height={height} className="bg-neutral-800/50 rounded" />;
  }
  
  const { xScale, yScale, maxValue, padding, innerWidth, innerHeight } = chartData;
  
  return (
    <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={padding.top + innerHeight * t}
            x2={width - padding.right}
            y2={padding.top + innerHeight * t}
            stroke="#1f2937"
            strokeDasharray="4,4"
            strokeWidth="0.5"
          />
        ))}
        
        {/* Buyback Ratio line */}
        <path
          d={data.reduce((acc, d, i) => {
            const x = xScale(i);
            const y = yScale(d.buybackRatio);
            return acc + (i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
          }, "")}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={3}
        />
        
        {/* Revenue Yield line */}
        <path
          d={data.reduce((acc, d, i) => {
            const x = xScale(i);
            const y = yScale(d.revYield);
            return acc + (i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
          }, "")}
          fill="none"
          stroke="#06b6d4"
          strokeWidth={3}
        />
        
        {/* Dots */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(d.buybackRatio)} r={5} fill="#f59e0b" stroke="white" strokeWidth={2} />
            <circle cx={xScale(i)} cy={yScale(d.revYield)} r={5} fill="#06b6d4" stroke="white" strokeWidth={2} />
          </g>
        ))}
        
        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={xScale(i)}
            y={height - 10}
            textAnchor="middle"
            fontSize="10"
            fill="#9ca3af"
            fontFamily="monospace"
          >
            {d.year}
          </text>
        ))}
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <text
            key={i}
            x={10}
            y={padding.top + innerHeight * t + 4}
            textAnchor="end"
            fontSize="10"
            fill="#9ca3af"
            fontFamily="monospace"
          >
            {(maxValue * (1 - t)).toFixed(1)}%
          </text>
        ))}
        
        {/* Legend */}
        <g transform={`translate(${width - 100}, ${padding.top})`}>
          {[
            { color: "#f59e0b", label: "Buyback / Issuance" },
            { color: "#06b6d4", label: "Revenue Yield" },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(0, ${i * 20})`}>
              <circle cx={5} cy={5} r={5} fill={item.color} />
              <text x={15} y={9} fontSize="11" fill="#e5e7eb" fontFamily="monospace">{item.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}