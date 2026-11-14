interface SparklineProps {
  values: number[];
  positive?: boolean;
  className?: string;
}

/**
 * A compact, dependency-free trend line. Purely contextual: the exact values
 * remain available in the KPI card title and the full time-series chart.
 */
export default function Sparkline({ values, positive = true, className = "" }: SparklineProps) {
  if (values.length < 2) return null;

  const width = 104;
  const height = 30;
  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (width - pad * 2) / (values.length - 1);
  const points = values.map((value, index) => {
    const x = pad + index * step;
    const y = pad + (height - pad * 2) * (1 - (value - min) / span);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(2)},${height} L${points[0][0].toFixed(2)},${height} Z`;
  const stroke = positive ? "#557a60" : "#b24a3e";
  const fill = positive ? "#e8f0e9" : "#f8e7e3";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`h-8 w-[72px] shrink-0 ${className}`}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={area} fill={fill} opacity="0.7" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.1" fill={stroke} />
    </svg>
  );
}
