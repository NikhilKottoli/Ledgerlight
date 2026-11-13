"use client";
import { useEffect } from "react";
import KindBadge from './KindBadge';
import { MetricArtifact } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  artifact: MetricArtifact;
  registryEntry?: any;
}

export default function ProvenanceDrawer({ open, onClose, artifact, registryEntry }: Props) {
  if (!open) return null;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const copyCalc = () => {
    const text = registryEntry?.calc_ref || artifact.meta.warnings.join("\n") || "No calculation reference";
    navigator.clipboard.writeText(text);
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(artifact, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.meta.metric_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const header = "t,v,null_reason\n";
    const rows = artifact.series.map(s => `${s.t},${s.v ?? ""},${s.null_reason ?? ""}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.meta.metric_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <h3 className="text-lg font-semibold">Provenance: {artifact.meta.metric_id}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5">✕</button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><span className="text-muted text-sm">Data mode</span><br /><KindBadge kind={artifact.meta.data_mode === "live" ? "measured" : artifact.meta.data_mode === "snapshot" ? "derived" : "modeled"} /></div>
            <div><span className="text-muted text-sm">Retrieved</span><br /><code className="text-xs">{artifact.meta.retrieved_at}</code></div>
            <div><span className="text-muted text-sm">Source max timestamp</span><br /><code className="text-xs">{artifact.meta.source_max_ts || "N/A"}</code></div>
            <div><span className="text-muted text-sm">Git commit</span><br /><code className="text-xs">{artifact.meta.git_commit}</code></div>
            <div><span className="text-muted text-sm">Completeness</span><br /><span>{artifact.meta.completeness}</span></div>
            <div><span className="text-muted text-sm">Points</span><br /><span>{artifact.series.length}</span></div>
          </div>

          {registryEntry && (
            <details className="border border-neutral-700 rounded p-3">
              <summary className="cursor-pointer font-medium">Registry entry (click to expand)</summary>
              <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(registryEntry, null, 2)}</pre>
            </details>
          )}

          {artifact.meta.warnings.length > 0 && (
            <div className="border border-amber-700 bg-amber-900/20 rounded p-3">
              <div className="font-medium text-amber-300 mb-1">Warnings</div>
              <ul className="text-sm space-y-1">
                {artifact.meta.warnings.map((w, i) => <li key={i} className="text-amber-200">• {w}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-neutral-700">
            <button onClick={copyCalc} className="px-3 py-1.5 text-sm border border-neutral-600 rounded hover:bg-white/5">Copy calculation</button>
            <button onClick={downloadJSON} className="px-3 py-1.5 text-sm border border-neutral-600 rounded hover:bg-white/5">Download JSON</button>
            <button onClick={downloadCSV} className="px-3 py-1.5 text-sm border border-neutral-600 rounded hover:bg-white/5">Download CSV</button>
          </div>
        </div>
      </div>
    </div>
  );
}
