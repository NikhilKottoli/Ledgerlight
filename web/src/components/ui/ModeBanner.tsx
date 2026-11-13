"use client";
import { DataMode } from "@/lib/types";

const styles: Record<DataMode, { bg: string; text: string; label: string }> = {
  live: { bg: "bg-green-900/30", text: "text-green-300", label: "LIVE" },
  snapshot: { bg: "bg-amber-900/30", text: "text-amber-300", label: "SNAPSHOT" },
  synthetic: { bg: "bg-red-900/30", text: "text-red-300", label: "SYNTHETIC (TEST DATA)" },
};

interface Props {
  mode: DataMode;
  snapshotDate?: string;
}

export default function ModeBanner({ mode, snapshotDate }: Props) {
  const s = styles[mode];
  if (mode === "live") return null; // No banner for live

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${s.bg} border-b border-amber-800 ${mode === "synthetic" ? "bg-red-900/40 border-red-800" : ""}`}>
      <div className="mx-auto max-w-7xl px-4 py-1.5 flex items-center gap-3 text-sm">
        <span className={`font-mono px-2 py-0.5 rounded ${s.text} ${s.bg.replace("/30", "/50")}`}>
          {s.label}
        </span>
        <span className="text-amber-200">
          {mode === "snapshot" && snapshotDate
            ? `Showing committed snapshot from ${snapshotDate}. Data is not live.`
            : "Synthetic test data — not real. Do not use for decisions."}
        </span>
        {mode === "synthetic" && (
          <span className="ml-auto font-mono text-xs text-red-300 bg-red-900/30 px-2 py-0.5 rounded">
            WATERMARK: SYNTHETIC
          </span>
        )}
      </div>
    </div>
  );
}
