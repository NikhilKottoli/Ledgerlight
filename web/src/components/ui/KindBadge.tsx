"use client";
import { MetricKind } from "@/lib/types";

const styles: Record<MetricKind, string> = {
  measured: "border-sage/25 bg-sage-soft text-sage-deep",
  derived: "border-info/25 bg-info-soft text-info-deep",
  modeled: "border-ochre/30 bg-ochre-soft text-ochre-deep",
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
  return (
    <span
      className={`badge ${styles[kind]} ${className}`}
      title={
        kind === "modeled"
          ? "Depends on human assumptions — not a prediction"
          : kind === "derived"
            ? "Calculated from measured data"
            : "Read directly from source"
      }
    >
      <span
        className={`h-1 w-1 rounded-full ${
          kind === "measured" ? "bg-sage" : kind === "derived" ? "bg-info" : "bg-ochre"
        }`}
      />
      {labels[kind]}
    </span>
  );
}
