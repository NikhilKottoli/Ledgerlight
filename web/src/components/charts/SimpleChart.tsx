"use client";

import { useMemo } from "react";

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

const CHART_COLORS = {
  volume: "#10b981",
  fees: "#3b82f6",
  netRev: "#8b5cf6",
};

function formatCurrency(n: number): string {
  return "$" + new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, notation: "compact" }).format(n);
}

export default function SimpleChart({ data, width = 600, height = 300 }: SimpleChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return null as any;
    
    // Find min/max for scaling
    const allValues = data.flatMap(d => [d.volume, d.grossFees, d.netRev]);
    const maxValue = Math.max(...allValues);
    const minValue = 0;
    
    const padding = { top: 20, right: 80, bottom: 40, left: 60 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    
    const xScale = (i: number) => padding.left + (i / (data.length - 1)) * innerWidth;
    const yScale = (value: number) => padding.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight;
    
    return { xScale, yScale, maxValue, minValue, innerWidth, innerHeight, padding };
  }, [data, width, height]);
  
  if (!chartData || !data.length) {
    return <svg width={width} height={height} className="bg-neutral-800/50 rounded" />;
  }
  
  const { xScale, yScale, maxValue, padding, innerWidth, innerHeight } = chartData;
  
  return (
    <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        <defs>
          <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="feesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
          </linearGradient>
        </defs>
        
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
        
        {/* X-axis grid lines */}
        {data.map((_, i) => (
          <line
            key={i}
            x1={xScale(i)}
            y1={padding.top}
            x2={xScale(i)}
            y2={padding.top + innerHeight}
            stroke="#1f2937"
            strokeDasharray="4,4"
            strokeWidth="0.5"
          />
        ))}
        
        {/* Volume area */}
        <path
          d={data.reduce((acc, d, i) => {
            const x = xScale(i);
            const y = yScale(d.volume);
            return acc + (i === 0 ? `M ${x} ${padding.top + innerHeight} L ${x} ${y} ` : `L ${x} ${y} `);
          }, "") + ` L ${xScale(data.length - 1)} ${padding.top + innerHeight} Z`}
          fill="url(#volGrad)"
          stroke="#10b981"
          strokeWidth="2"
        />
        
        {/* Gross Fees area */}
        <path
          d={data.reduce((acc, d, i) => {
            const x = xScale(i);
            const y = yScale(d.grossFees);
            return acc + (i === 0 ? `M ${x} ${padding.top + innerHeight} L ${x} ${y} ` : `L ${x} ${y} `);
          }, "") + ` L ${xScale(data.length - 1)} ${padding.top + innerHeight} Z`}
          fill="url(#feesGrad)"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        
        {/* Net Revenue area */}
        <path
          d={data.reduce((acc, d, i) => {
            const x = xScale(i);
            const y = yScale(d.netRev);
            return acc + (i === 0 ? `M ${x} ${padding.top + innerHeight} L ${x} ${y} ` : `L ${x} ${y} `);
          }, "") + ` L ${xScale(data.length - 1)} ${padding.top + innerHeight} Z`}
          fill="url(#netGrad)"
          stroke="#8b5cf6"
          strokeWidth="2"
        />
        
        {/* Volume line */}
        <path
          d={data.reduce((acc, d, i) => {
            const x = xScale(i);
            const y = yScale(d.volume);
            return acc + (i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
          }, "")}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
        />
        
        {/* Gross Fees line */}
        <path
          d={data.reduce((acc, d, i) => {
            const x = xScale(i);
            const y = yScale(d.grossFees);
            return acc + (i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
          }, "")}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        
        {/* Net Revenue line */}
        <path
          d={data.reduce((acc, d, i) => {
            const x = xScale(i);
            const y = yScale(d.netRev);
            return acc + (i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
          }, "")}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
        />
        
        {/* Dots */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(d.volume)} r={4} fill="#10b981" stroke="white" strokeWidth={1} />
            <circle cx={xScale(i)} cy={yScale(d.grossFees)} r={4} fill="#3b82f6" stroke="white" strokeWidth={1} />
            <circle cx={xScale(i)} cy={yScale(d.netRev)} r={4} fill="#8b5cf6" stroke="white" strokeWidth={1} />
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
            {formatCurrency(maxValue * (1 - t))}
          </text>
        ))}
        
        {/* Legend */}
        <g transform={`translate(${width - 75}, ${padding.top})`}>
          {[
            { color: "#10b981", label: "Volume" },
            { color: "#3b82f6", label: "Gross Fees" },
            { color: "#8b5cf6", label: "Net Revenue" },
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