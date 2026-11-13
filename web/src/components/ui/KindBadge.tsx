"use client";
import { MetricKind } from "@/lib/types";

const styles: Record<MetricKind, { bg: string; text: string; border: string; pattern?: string }> = {
  measured: { bg: "bg-green-900/30", text: "text-green-300", border: "border-green-700" },
  derived: { bg: "bg-blue-900/30", text: "text-blue-300", border: "border-blue-700" },
  modeled: { bg: "bg-amber-900/30", text: "text-amber-300", border: "border-amber-700" },
};

const labels: Record<MetricKind, string> = {
  measured: "Measured",
  derived: "Derived",
  modeled: "Modeled",
};

interface Props {
  kind: MetricKind;
  className?: string;
}

export default function KindBadge({ kind, className = "" }: Props) {
  const s = styles[kind];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium font-mono border ${s.bg} ${s.text} ${s.border} ${className}`}
      title={kind === "modeled" ? "Depends on human assumptions — not a prediction" : kind === "derived" ? "Calculated from measured data" : "Read directly from source"}
    >
      {labels[kind]}
    </span>
  );
}
