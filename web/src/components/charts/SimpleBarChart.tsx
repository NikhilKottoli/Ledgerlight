"use client";

import { useMemo } from "react";

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

function formatCurrency(n: number): string {
  return "$" + new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, notation: "compact" }).format(n);
}

export default function SimpleBarChart({ data, width = 600, height = 300 }: SimpleBarChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return null;
    
    const allValues = data.flatMap(d => [d.buybackNEAR, d.issuance]);
    const maxValue = Math.max(...allValues);
    const minValue = 0;
    
    const padding = { top: 20, right: 80, bottom: 40, left: 60 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const barWidth = (innerWidth / data.length) * 0.35;
    
    const xScale = (i: number) => padding.left + (i / (data.length - 1)) * innerWidth;
    const yScale = (value: number) => padding.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight;
    
    return { xScale, yScale, maxValue, barWidth, padding, innerWidth, innerHeight };
  }, [data, width, height]);
  
  if (!chartData) {
    return <svg width={width} height={height} className="bg-neutral-800/50 rounded" />;
  }
  
  const { xScale, yScale, maxValue, barWidth, padding, innerWidth, innerHeight } = chartData;
  
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
        
        {/* Bars */}
        {data.map((d, i) => {
          const x = xScale(i);
          const buybackY = yScale(d.buybackNEAR);
          const issuanceY = yScale(d.issuance);
          
          return (
            <g key={i}>
              {/* Buyback bar */}
              <rect
                x={x - barWidth / 2}
                y={buybackY}
                width={barWidth}
                height={innerHeight - (buybackY - padding.top)}
                fill="#f59e0b"
                rx={2}
              />
              {/* Issuance bar */}
              <rect
                x={x + barWidth / 2}
                y={issuanceY}
                width={barWidth}
                height={innerHeight - (issuanceY - padding.top)}
                fill="#ef4444"
                rx={2}
              />
            </g>
          );
        })}
        
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
            {formatCurrency(maxValue * (1 - t))}
          </text>
        ))}
        
        {/* Legend */}
        <g transform={`translate(${width - 75}, ${padding.top})`}>
          {[
            { color: "#f59e0b", label: "Buyback (NEAR)" },
            { color: "#ef4444", label: "Issuance (NEAR)" },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(0, ${i * 20})`}>
              <rect x={0} y={0} width={10} height={10} fill={item.color} rx={2} />
              <text x={15} y={9} fontSize="11" fill="#e5e7eb" fontFamily="monospace">{item.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}