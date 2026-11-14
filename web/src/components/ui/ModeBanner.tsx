"use client";
import { DataMode } from "@/lib/types";
import { IconAlert, IconInfo } from "./icons";

const styles: Record<DataMode, { wrap: string; badge: string; label: string }> = {
  live: {
    wrap: "",
    badge: "",
    label: "LIVE",
  },
  snapshot: {
    wrap: "border-ochre/30 bg-ochre-soft text-ochre-deep",
    badge: "border-ochre/30 bg-surface/60 text-ochre-deep",
    label: "SNAPSHOT",
  },
  synthetic: {
    wrap: "border-danger/30 bg-danger-soft text-danger-deep",
    badge: "border-danger/30 bg-surface/60 text-danger-deep",
    label: "SYNTHETIC TEST DATA",
  },
};

interface Props {
  mode: DataMode;
  snapshotDate?: string;
}

export default function ModeBanner({ mode, snapshotDate }: Props) {
  const s = styles[mode];
  if (mode === "live") return null;

  return (
    <div className={`border-b px-4 py-2 sm:px-6 lg:px-8 xl:px-10 ${s.wrap}`}>
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        <span className={`badge ${s.badge} font-mono uppercase tracking-[0.08em]`}>
          {mode === "snapshot" ? <IconInfo className="h-3.5 w-3.5" /> : <IconAlert className="h-3.5 w-3.5" />}
          {s.label}
        </span>
        <span>
          {mode === "snapshot" && snapshotDate
            ? `Showing the committed snapshot from ${snapshotDate}. This is real data, but it is not live.`
            : mode === "snapshot"
              ? "Showing committed snapshot data. This is real data, but it is not live."
              : "Synthetic fixtures are being displayed — not real data. Do not use for decisions."}
        </span>
      </div>
    </div>
  );
}
