"use client";
import { useState } from "react";
import ProvenanceDrawer from "./ProvenanceDrawer";
import { MetricArtifact } from "@/lib/types";
import { IconInfo } from "./icons";

interface Props {
  artifact: MetricArtifact;
  registryEntry?: any; // Full registry entry
}

export default function ProvenanceButton({ artifact, registryEntry }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
        aria-label={`Open provenance for ${artifact.meta.metric_id}`}
        title="View data provenance"
      >
        <IconInfo className="h-[15px] w-[15px]" />
      </button>
      <ProvenanceDrawer open={open} onClose={() => setOpen(false)} artifact={artifact} registryEntry={registryEntry} />
    </>
  );
}
