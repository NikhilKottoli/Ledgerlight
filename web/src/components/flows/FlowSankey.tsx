"use client";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { sankeyJustify } from "d3-sankey";
import { FlowLedgerModel, FlowNodeModel, FlowEdgeModel } from "@/lib/types";

interface Props {
  ledger: FlowLedgerModel;
  onNodeClick?: (node: FlowNodeModel) => void;
  unitToggle?: "USD" | "NEAR";
  onUnitToggle?: (unit: "USD" | "NEAR") => void;
}

const STAGE_COLORS: Record<string, { base: string; reconciled: string; partial: string; unknown: string }> = {
  context_volume: { base: "#6b7280", reconciled: "#9ca3af", partial: "#9ca3af", unknown: "#9ca3af" },
  gross_fees: { base: "#3b82f6", reconciled: "#60a5fa", partial: "#93c5fd", unknown: "#bfdbfe" },
  partner_payout: { base: "#8b5cf6", reconciled: "#a78bfa", partial: "#c4b5fd", unknown: "#ddd6fe" },
  solver_payout: { base: "#ec4899", reconciled: "#f472b6", partial: "#f9a8d4", unknown: "#fce7f3" },
  net_revenue_swept: { base: "#10b981", reconciled: "#34d399", partial: "#6ee7b7", unknown: "#a7f3d0" },
  net_revenue_near: { base: "#059669", reconciled: "#10b981", partial: "#34d399", unknown: "#a7f3d0" },
  buyback: { base: "#f59e0b", reconciled: "#fbbf24", partial: "#fcd34d", unknown: "#fef3c7" },
  held: { base: "#6b7280", reconciled: "#9ca3af", partial: "#9ca3af", unknown: "#d1d5db" },
  spent: { base: "#ef4444", reconciled: "#f87171", partial: "#fca5a5", unknown: "#fee2e2" },
  unknown_dest: { base: "#9ca3af", reconciled: "#d1d5db", partial: "#d1d5db", unknown: "#e5e7eb" },
  burned: { base: "#ef4444", reconciled: "#f87171", partial: "#fca5a5", unknown: "#fee2e2" },
  held_buyback: { base: "#f59e0b", reconciled: "#fbbf24", partial: "#fcd34d", unknown: "#fef3c7" },
  redistributed: { base: "#3b82f6", reconciled: "#60a5fa", partial: "#93c5fd", unknown: "#bfdbfe" },
  unknown_buyback: { base: "#9ca3af", reconciled: "#d1d5db", partial: "#d1d5db", unknown: "#e5e7eb" },
};

const STAGE_ORDER: Record<string, number> = {
  context_volume: 0,
  gross_fees: 1,
  partner_payout: 2,
  solver_payout: 2,
  net_revenue_swept: 3,
  net_revenue_near: 4,
  buyback: 5,
  held: 5,
  spent: 5,
  unknown_dest: 5,
  burned: 6,
  held_buyback: 6,
  redistributed: 6,
  unknown_buyback: 6,
};

interface SankeyNode {
  id: string;
  label: string;
  stage: string;
  amount: number;
  unit: string;
  alt_amount: number | null;
  alt_unit: string | null;
  kind: string;
  status: string;
  calc: string;
  sources: string[];
  price_source: string | null;
  evidence_refs: string[];
  completeness_note: string;
  stageOrder: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export default function FlowSankey({
  ledger,
  onNodeClick,
  unitToggle = "USD",
  onUnitToggle,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(400);
  const [selectedNode, setSelectedNode] = useState<FlowNodeModel | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !ledger.nodes.length) return;

    const svg = d3.select(containerRef.current).select("svg");
    const g = svg.select("g");

    g.selectAll("*").remove();

    // Filter nodes by unit
    const nodes = ledger.nodes.filter(n =>
      unitToggle === "USD" ? n.unit === "USD" : n.unit === "NEAR" || n.alt_unit === "NEAR"
    );
    const edges = ledger.edges.filter(e => {
      const src = nodes.find(n => n.id === e.source);
      const tgt = nodes.find(n => n.id === e.target);
      return src && tgt;
    });

    const sankeyLayout = sankey<SankeyNode, SankeyLink>()
      .nodeId((d: SankeyNode) => d.id)
      .nodeAlign(sankeyJustify)
      .nodeWidth(20)
      .nodePadding(20)
      .extent([[50, 20], [width - 50, height - 40]]);

    const snodes = nodes.map(n => ({ ...n, stageOrder: STAGE_ORDER[n.stage] || 99 })) as SankeyNode[];
    const slinks = edges.map(e => ({ source: e.source, target: e.target, value: Number(e.amount) })) as SankeyLink[];

    const { nodes: snodesLayout, links: slinksLayout } = sankeyLayout({
      nodes: snodes,
      links: slinks,
    });

    // Links
    const link = g.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
      .selectAll("path")
      .data(slinksLayout)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", (d: any) => {
        const colors = STAGE_COLORS[d.target.stage] || STAGE_COLORS.gross_fees;
        return colors.reconciled;
      })
      .attr("stroke-width", (d: any) => Math.max(1, d.width))
      .style("cursor", "pointer");

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(snodesLayout)
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`)
      .style("cursor", "pointer");

    node.append("rect")
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("fill", (d: any) => {
        const colors = STAGE_COLORS[d.stage] || STAGE_COLORS.gross_fees;
        if (d.status === "reconciled") return colors.reconciled;
        if (d.status === "partial") return colors.partial;
        if (d.status === "unknown") return colors.unknown;
        return colors.base;
      })
      .attr("stroke", (d: any) => {
        if (d.status === "partial" || d.status === "unknown") return "#f59e0b";
        return "none";
      })
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d: any) => d.status === "partial" ? "4,2" : "none");

    node.append("title")
      .text((d: any) => `${d.label}\n${new Intl.NumberFormat().format(d.amount)} ${d.unit}`);

    // Labels
    node.append("text")
      .attr("x", (d: any) => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", (d: any) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d: any) => d.x0 < width / 2 ? "start" : "end")
      .attr("font-size", "11px")
      .attr("fill", "#e5e7eb")
      .text((d: any) => d.label);

    // Click handler
    node.on("click", (event: any, d: any) => {
      const fullNode = ledger.nodes.find(n => n.id === d.id);
      if (fullNode && onNodeClick) {
        onNodeClick(fullNode);
        setSelectedNode(fullNode);
      }
    });

    // Context strip (volume) at top
    if (ledger.volume_usd && unitToggle === "USD") {
      g.append("text")
        .attr("x", width / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#9ca3af")
        .text(`Swap Volume: ${new Intl.NumberFormat(undefined, { notation: "compact" }).format(ledger.volume_usd)} USD  |  Effective Take Rate: ${ledger.effective_gross_take_bps ? (Number(ledger.effective_gross_take_bps) / 100).toFixed(2) + "%" : "N/A"}`);
    }

    // Unit toggle hint
    if (unitToggle === "NEAR") {
      g.append("text")
        .attr("x", width - 50)
        .attr("y", 15)
        .attr("text-anchor", "end")
        .attr("font-size", "11px")
        .attr("fill", "#f59e0b")
        .text("Showing NEAR amounts (alt)");
    }
  }, [ledger, unitToggle, width, height, onNodeClick]);

  return (
    <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Economic Flow Ledger — {ledger.period.toUpperCase()}</span>
          <span className="text-xs text-muted">{ledger.start} → {ledger.end}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUnitToggle?.("USD")}
            className={`px-2 py-1 text-xs rounded ${unitToggle === "USD" ? "bg-blue-900/30 text-blue-300" : "bg-neutral-800 text-muted"}`}
          >
            USD
          </button>
          <button
            onClick={() => onUnitToggle?.("NEAR")}
            className={`px-2 py-1 text-xs rounded ${unitToggle === "NEAR" ? "bg-amber-900/30 text-amber-300" : "bg-neutral-800 text-muted"}`}
          >
            NEAR
          </button>
        </div>
      </div>

      <div ref={containerRef} style={{ width: "100%", height: `${height}px` }}>
        <svg width="100%" height="100%">
          <g />
        </svg>
      </div>

      {/* Reconciliation Panel */}
      {Object.keys(ledger.reconciliation).length > 0 && (
        <details className="mt-4 border border-neutral-700 rounded p-4">
          <summary className="cursor-pointer font-medium flex items-center gap-2">
            <span>Reconciliation Panel</span>
            <span className="text-xs text-amber-300">{Object.keys(ledger.reconciliation).length} stages</span>
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(ledger.reconciliation).map(([stage, sources]) => (
              <details key={stage} className="border border-neutral-700 rounded p-2">
                <summary className="cursor-pointer font-mono text-xs">{stage}</summary>
                <div className="mt-1 space-y-1">
                  {(sources as any[]).map((s: any, i: number) => (
                    <div key={i} className="text-xs text-muted flex gap-2">
                      <span className="font-mono">{s.source}</span>
                      <span>{new Intl.NumberFormat().format(Number(s.value))} {s.unit}</span>
                      {s.delta_pct && <span className="text-amber-300">({Number(s.delta_pct).toFixed(2)}%)</span>}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </details>
      )}

      {/* Residuals */}
      {ledger.residuals && ledger.residuals.length > 0 && (
        <details className="mt-4 border border-neutral-700 rounded p-4">
          <summary className="cursor-pointer font-medium flex items-center gap-2">
            <span>Unreconciled Amounts</span>
            <span className="text-xs text-amber-300">{ledger.residuals.length} residuals</span>
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            {ledger.residuals.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="font-mono">{r.stage}</span>
                <span className={r.sign === "negative" ? "text-red-400" : "text-amber-400"}>
                  {r.sign === "negative" ? "−" : "+"}{new Intl.NumberFormat().format(Number(r.amount))} {r.unit}
                </span>
                <span className="text-muted">{r.reason}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Node Drawer */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedNode(null)}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedNode(null)} />
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{selectedNode.label}</h3>
              <button onClick={() => setSelectedNode(null)} className="p-1 rounded hover:bg-white/5">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="text-muted">Stage:</span> <span className="ml-2 font-mono">{selectedNode.stage}</span></div>
              <div><span className="text-muted">Amount:</span> <span className="ml-2 font-mono tabular-nums">{new Intl.NumberFormat().format(Number(selectedNode.amount))} {selectedNode.unit}</span></div>
              {selectedNode.alt_amount && (
                <div><span className="text-muted">Alt Amount:</span> <span className="ml-2 font-mono tabular-nums">{new Intl.NumberFormat().format(Number(selectedNode.alt_amount))} {selectedNode.alt_unit}</span></div>
              )}
              <div><span className="text-muted">Kind:</span> <span className="ml-2 capitalize">{selectedNode.kind}</span></div>
              <div><span className="text-muted">Status:</span> <span className="ml-2 capitalize">{selectedNode.status}</span></div>
              <div><span className="text-muted">Calculation:</span> <div className="mt-1 text-xs text-muted whitespace-pre-wrap">{selectedNode.calc}</div></div>
              <div><span className="text-muted">Sources:</span> <div className="mt-1 text-xs text-muted">{selectedNode.sources.join(", ")}</div></div>
              {selectedNode.completeness_note && (
                <div className="border border-amber-700 bg-amber-900/20 rounded p-2 text-xs text-amber-200">
                  ⚠ {selectedNode.completeness_note}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="mt-4 w-full px-3 py-1.5 text-sm border border-neutral-600 rounded hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
