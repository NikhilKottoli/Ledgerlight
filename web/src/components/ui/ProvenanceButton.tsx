"use client";
import { useState } from "react";
import ProvenanceDrawer from "./ProvenanceDrawer";
import { MetricArtifact } from "@/lib/types";

interface Props {
  artifact: MetricArtifact;
  registryEntry?: any; // Full registry entry
}

export default function ProvenanceButton({ artifact, registryEntry }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded hover:bg-white/5 transition-colors text-muted hover:text-white"
        aria-label="Open provenance"
        title="View data provenance"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
      <ProvenanceDrawer open={open} onClose={() => setOpen(false)} artifact={artifact} registryEntry={registryEntry} />
    </>
  );
}
