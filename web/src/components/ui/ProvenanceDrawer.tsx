"use client";
import { useEffect, useState } from "react";
import KindBadge from "./KindBadge";
import { MetricArtifact } from "@/lib/types";
import { IconCheck, IconClose, IconCopy, IconDownload } from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
  artifact: MetricArtifact;
  registryEntry?: any;
}

export default function ProvenanceDrawer({ open, onClose, artifact, registryEntry }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const copyCalc = async () => {
    const text = registryEntry?.calc_ref || artifact.meta.warnings.join("\n") || "No calculation reference";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be unavailable; the calculation stays visible below.
    }
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(artifact, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.meta.metric_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const header = "t,v,null_reason\n";
    const rows = artifact.series.map((s) => `${s.t},${s.v ?? ""},${s.null_reason ?? ""}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.meta.metric_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const metaRows = [
    ["Data mode", artifact.meta.data_mode],
    ["Retrieved", artifact.meta.retrieved_at],
    ["Source max timestamp", artifact.meta.source_max_ts || "N/A"],
    ["Git commit", artifact.meta.git_commit],
    ["Completeness", artifact.meta.completeness],
    ["Points", String(artifact.series.length)],
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-stretch sm:justify-end">
      <button type="button" className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} aria-label="Close provenance" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="provenance-title"
        className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop sm:max-h-none sm:w-[560px] sm:rounded-none sm:border-y-0 sm:border-r-0"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="micro-label">Provenance</p>
            <h3 id="provenance-title" className="mt-1 break-all font-mono text-[12.5px] font-medium leading-relaxed text-ink">
              {artifact.meta.metric_id}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="Close provenance"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <KindBadge kind={artifact.meta.data_mode === "live" ? "measured" : artifact.meta.data_mode === "snapshot" ? "derived" : "modeled"} />
            <span className="badge border-line bg-surface-subtle text-ink-muted">{artifact.meta.data_mode}</span>
            {artifact.meta.warnings.length > 0 && (
              <span className="badge border-ochre/30 bg-ochre-soft text-ochre-deep">
                {artifact.meta.warnings.length} warning{artifact.meta.warnings.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            {metaRows.map(([label, value]) => (
              <div key={label} className="bg-surface px-3.5 py-3">
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">{label}</dt>
                <dd className="mt-1 break-all font-mono text-[11.5px] leading-relaxed text-ink-soft">{value}</dd>
              </div>
            ))}
          </dl>

          {artifact.meta.warnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-ochre/25 bg-ochre-soft/70 p-3.5">
              <p className="text-[11.5px] font-semibold text-ochre-deep">Warnings</p>
              <ul className="mt-1.5 space-y-1 text-[12px] text-ochre-deep/90">
                {artifact.meta.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ochre" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {registryEntry && (
            <details className="mt-4 rounded-xl border border-line bg-surface-subtle/60">
              <summary className="cursor-pointer px-3.5 py-3 text-[12px] font-medium text-ink-soft">
                Registry entry
              </summary>
              <pre className="max-h-72 overflow-auto border-t border-line px-3.5 py-3 text-[10.5px] leading-relaxed text-ink-muted">
                {JSON.stringify(registryEntry, null, 2)}
              </pre>
            </details>
          )}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <button type="button" onClick={copyCalc} className="btn-secondary">
              {copied ? <IconCheck className="h-3.5 w-3.5 text-sage" /> : <IconCopy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy calculation"}
            </button>
            <button type="button" onClick={downloadJSON} className="btn-secondary">
              <IconDownload className="h-3.5 w-3.5" />
              JSON
            </button>
            <button type="button" onClick={downloadCSV} className="btn-secondary">
              <IconDownload className="h-3.5 w-3.5" />
              CSV
            </button>
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-ink-faint">
            Every value links back to its source, definition and retrieval timestamp. Downloads contain the same
            artifact the charts read.
          </p>
        </div>
      </div>
    </div>
  );
}
