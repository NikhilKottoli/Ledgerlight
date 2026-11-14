"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal, sankeyJustify } from "d3-sankey";
import { FlowLedgerModel, FlowNodeModel } from "@/lib/types";
import { chart, formatNumber } from "@/lib/chartTheme";
import { IconAlert, IconChevronDown, IconClose, IconInfo, IconX } from "../ui/icons";

interface Props {
  ledger: FlowLedgerModel;
  onNodeClick?: (node: FlowNodeModel) => void;
  unitToggle?: "USD" | "NEAR";
  onUnitToggle?: (unit: "USD" | "NEAR") => void;
}

const STAGE_COLORS: Record<string, { base: string; soft: string }> = {
  context_volume: { base: "#9c9287", soft: "#e8e3db" },
  gross_fees: { base: "#b45a3c", soft: "#f5e7e1" },
  partner_payout: { base: "#9c7b5f", soft: "#f0e7df" },
  solver_payout: { base: "#8a6a7e", soft: "#efe7ec" },
  net_revenue_swept: { base: "#4d6b85", soft: "#e9eff4" },
  net_revenue_near: { base: "#557a60", soft: "#e8f0e9" },
  buyback: { base: "#a8742a", soft: "#f7eedd" },
  held: { base: "#8c8378", soft: "#efebe5" },
  spent: { base: "#b24a3e", soft: "#f8e7e3" },
  unknown_dest: { base: "#a8a094", soft: "#f0ece6" },
  burned: { base: "#b24a3e", soft: "#f8e7e3" },
  held_buyback: { base: "#a8742a", soft: "#f7eedd" },
  redistributed: { base: "#4d6b85", soft: "#e9eff4" },
  unknown_buyback: { base: "#a8a094", soft: "#f0ece6" },
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
  amount: number;
  unit: string;
  status: string;
}

const statusStyles: Record<string, string> = {
  reconciled: "border-sage/25 bg-sage-soft text-sage-deep",
  partial: "border-ochre/30 bg-ochre-soft text-ochre-deep",
  unknown: "border-line bg-surface-muted text-ink-muted",
};

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

export default function FlowSankey({ ledger, onNodeClick, unitToggle = "USD", onUnitToggle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [internalUnit, setInternalUnit] = useState<"USD" | "NEAR">(unitToggle);
  const [selectedNode, setSelectedNode] = useState<FlowNodeModel | null>(null);
  const activeUnit = onUnitToggle ? unitToggle : internalUnit;
  const height = 440;

  const visibleNodes = useMemo(
    () =>
      ledger.nodes.filter((n) =>
        activeUnit === "USD" ? n.unit === "USD" : n.unit === "NEAR" || n.alt_unit === "NEAR"
      ),
    [ledger.nodes, activeUnit]
  );
  const visibleEdges = useMemo(() => {
    const ids = new Set(visibleNodes.map((n) => n.id));
    return ledger.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [ledger.edges, visibleNodes]);

  const setUnit = (unit: "USD" | "NEAR") => {
    if (onUnitToggle) onUnitToggle(unit);
    else setInternalUnit(unit);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedNode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedNode(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedNode]);

  useEffect(() => {
    if (!containerRef.current || !width || !visibleNodes.length) return;

    const svg = d3.select(containerRef.current).select("svg");
    const g = svg.select("g");
    g.selectAll("*").remove();

    const nodes: SankeyNode[] = visibleNodes.map((n) => ({
      ...n,
      amount: Number(n.amount),
      alt_amount: n.alt_amount !== null ? Number(n.alt_amount) : null,
      stageOrder: STAGE_ORDER[n.stage] ?? 99,
    }));
    const links: SankeyLink[] = visibleEdges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      value: Math.max(Number(edge.amount), 0.0001),
      amount: Number(edge.amount),
      unit: edge.unit,
      status: edge.status,
    }));

    const layout = sankey<SankeyNode, SankeyLink>()
      .nodeId((d) => d.id)
      .nodeAlign(sankeyJustify)
      .nodeWidth(14)
      .nodePadding(20)
      .extent([
        [14, 34],
        [width - 14, height - 34],
      ]);

    let laidOut: { nodes: SankeyNode[]; links: SankeyLink[] };
    try {
      laidOut = layout({ nodes, links }) as unknown as { nodes: SankeyNode[]; links: SankeyLink[] };
    } catch {
      return;
    }

    const linkGroup = g.append("g").attr("fill", "none");
    linkGroup
      .selectAll("path")
      .data(laidOut.links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", (d: any) => {
        const colors = STAGE_COLORS[d.target.stage] || STAGE_COLORS.gross_fees;
        return colors.base;
      })
      .attr("stroke-opacity", 0.22)
      .attr("stroke-width", (d: any) => Math.max(1, d.width))
      .style("cursor", "pointer")
      .on("mouseenter", function () {
        d3.select(this).attr("stroke-opacity", 0.38);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke-opacity", 0.22);
      })
      .append("title")
      .text((d: any) => {
        const source = typeof d.source === "object" ? d.source.label : d.source;
        const target = typeof d.target === "object" ? d.target.label : d.target;
        return `${source} → ${target}\n${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(d.amount)} ${d.unit}\nStatus: ${d.status}`;
      });

    const node = g
      .append("g")
      .selectAll("g")
      .data(laidOut.nodes)
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`)
      .style("cursor", "pointer");

    node
      .append("rect")
      .attr("height", (d: any) => Math.max(2, d.y1 - d.y0))
      .attr("width", (d: any) => Math.max(3, d.x1 - d.x0))
      .attr("rx", 3)
      .attr("fill", (d: any) => (STAGE_COLORS[d.stage] || STAGE_COLORS.gross_fees).base)
      .attr("stroke", (d: any) => (d.status === "reconciled" ? "none" : chart.ochre))
      .attr("stroke-width", 1.4)
      .attr("stroke-dasharray", (d: any) => (d.status === "partial" ? "3,2" : d.status === "unknown" ? "1,2" : "none"))
      .attr("opacity", (d: any) => (d.status === "unknown" ? 0.72 : 1));

    node
      .append("title")
      .text(
        (d: any) =>
          `${d.label}\n${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(d.amount)} ${d.unit}\nStatus: ${d.status}`
      );

    const labels = node
      .append("text")
      .attr("x", (d: any) => (d.x0 < width / 2 ? d.x1 - d.x0 + 8 : -8))
      .attr("y", (d: any) => (d.y1 - d.y0) / 2)
      .attr("dy", "-0.1em")
      .attr("text-anchor", (d: any) => (d.x0 < width / 2 ? "start" : "end"))
      .attr("font-size", "10.5px")
      .attr("font-family", "var(--font-sans), ui-sans-serif, sans-serif")
      .attr("fill", chart.ink)
      .attr("font-weight", 500);

    labels.each(function (this: SVGTextElement, d: any) {
      const el = d3.select(this);
      const available = d.x0 < width / 2 ? width - d.x1 - 24 : d.x0 - 24;
      const maxChars = Math.max(12, Math.floor(available / 6.1));
      el.append("tspan").text(truncate(d.label, maxChars));
      el.append("tspan")
        .attr("x", d.x0 < width / 2 ? d.x1 - d.x0 + 8 : -8)
        .attr("dy", "1.35em")
        .attr("fill", chart.faint)
        .attr("font-size", "9.5px")
        .attr("font-weight", 400)
        .text(`${formatNumber(d.amount)} ${d.unit}`);
    });

    if (activeUnit === "NEAR" && ledger.volume_usd && ledger.effective_gross_take_bps) {
      g.append("text")
        .attr("x", width - 14)
        .attr("y", 14)
        .attr("text-anchor", "end")
        .attr("font-size", "9.5px")
        .attr("fill", chart.faint)
        .text(`Swap volume $${formatNumber(ledger.volume_usd)} · ${(Number(ledger.effective_gross_take_bps) / 100).toFixed(2)}% take rate`);
    }

    node.on("click", (_event: any, d: any) => {
      const fullNode = ledger.nodes.find((n) => n.id === d.id);
      if (!fullNode) return;
      onNodeClick?.(fullNode);
      setSelectedNode(fullNode);
    });
  }, [ledger, activeUnit, width, visibleNodes, visibleEdges, onNodeClick]);

  const statusCounts = visibleNodes.reduce(
    (acc, n) => {
      acc[n.status] = (acc[n.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="section-title">Economic flow ledger</h3>
              <span className="badge border-line bg-surface-subtle font-mono text-ink-muted">
                {ledger.period.toUpperCase()}
              </span>
              <span className="badge border-line bg-surface-subtle font-mono text-ink-faint">
                {ledger.start} → {ledger.end}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
              Gross fees → protocol revenue → buyback → destination. Widths are relative within each unit.
            </p>
          </div>
          <div className="segmented" role="group" aria-label="Flow ledger unit">
            <button
              type="button"
              onClick={() => setUnit("USD")}
              aria-pressed={activeUnit === "USD"}
              className={`segmented-item ${activeUnit === "USD" ? "segmented-item-active" : ""}`}
            >
              USD stages
            </button>
            <button
              type="button"
              onClick={() => setUnit("NEAR")}
              aria-pressed={activeUnit === "NEAR"}
              className={`segmented-item ${activeUnit === "NEAR" ? "segmented-item-active" : ""}`}
            >
              NEAR stages
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-ink-faint">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-sage" /> Reconciled
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm border border-dashed border-ochre" /> Partial ({statusCounts.partial || 0})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-ink-faint/60" /> Unknown ({statusCounts.unknown || 0})
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <IconInfo className="h-3 w-3" />
            Click any node for its definition and evidence
          </span>
        </div>

        {ledger.volume_usd && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-surface-subtle px-3 py-2 text-[11px] text-ink-muted">
            <span>
              Swap volume <strong className="tnum font-medium text-ink">${formatNumber(ledger.volume_usd)}</strong>
            </span>
            {ledger.effective_gross_take_bps && (
              <span>
                Effective gross take rate{" "}
                <strong className="tnum font-medium text-ink">
                  {(Number(ledger.effective_gross_take_bps) / 100).toFixed(2)}%
                </strong>
              </span>
            )}
          </div>
        )}
      </div>

      {activeUnit === "NEAR" && (
        <div className="border-b border-line bg-sage-soft/50 px-4 py-2 text-[11px] text-sage-deep sm:px-5">
          Post-sweep stages are denominated in NEAR. They are not drawn to the same scale as the USD fee stages.
        </div>
      )}

      <div className="overflow-x-auto">
        <div ref={containerRef} className="min-w-[680px]" style={{ width: "100%", height }}>
          {visibleNodes.length ? (
            <svg width="100%" height="100%" role="img" aria-label={`Economic flow diagram for ${ledger.period}`}>
              <g />
            </svg>
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <div className="empty-state w-full max-w-md">
                <p className="text-[12.5px] font-medium text-ink-muted">No {activeUnit} stages in this ledger</p>
                <p className="mt-1 text-[11.5px] text-ink-faint">Try the other unit to see the available flow.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="border-t border-line/70 px-4 py-2 text-[10.5px] text-ink-faint sm:hidden">
        Scroll horizontally to explore the full ledger.
      </p>

      {Object.keys(ledger.reconciliation).length > 0 && (
        <details className="group border-t border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[12px] font-medium text-ink-soft hover:bg-surface-subtle sm:px-5">
            <span className="flex items-center gap-2">
              Reconciliation
              <span className="badge border-ochre/30 bg-ochre-soft font-mono text-ochre-deep">
                {Object.keys(ledger.reconciliation).length} stages
              </span>
            </span>
            <IconChevronDown className="h-4 w-4 text-ink-faint transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 px-4 pb-4 sm:px-5">
            {Object.entries(ledger.reconciliation).map(([stage, sources]) => (
              <details key={stage} className="rounded-lg border border-line bg-surface-subtle/60">
                <summary className="cursor-pointer list-none px-3 py-2 font-mono text-[11px] text-ink-muted">
                  {stage}
                </summary>
                <div className="border-t border-line px-3 py-2">
                  {(sources as any[]).map((source: any, index: number) => (
                    <div key={index} className="flex flex-wrap items-baseline justify-between gap-2 py-1 text-[11px]">
                      <span className="font-mono text-ink-muted">{source.source}</span>
                      <span className="tnum text-ink-soft">
                        {new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(source.value))} {source.unit}
                        {source.delta_pct && (
                          <span className="ml-2 text-ochre-deep">Δ {Number(source.delta_pct).toFixed(2)}%</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </details>
      )}

      {ledger.residuals && ledger.residuals.length > 0 && (
        <details className="group border-t border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[12px] font-medium text-ink-soft hover:bg-surface-subtle sm:px-5">
            <span className="flex items-center gap-2">
              Unreconciled amounts
              <span className="badge border-ochre/30 bg-ochre-soft font-mono text-ochre-deep">
                {ledger.residuals.length}
              </span>
            </span>
            <IconChevronDown className="h-4 w-4 text-ink-faint transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 px-4 pb-4 sm:px-5">
            {ledger.residuals.map((residual, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-ochre/25 bg-ochre-soft/50 px-3 py-2 text-[11px]">
                <IconAlert className="h-3.5 w-3.5 text-ochre-deep" />
                <span className="font-mono text-ink-soft">{residual.stage}</span>
                <span className={residual.sign === "negative" ? "tnum text-danger-deep" : "tnum text-ochre-deep"}>
                  {residual.sign === "negative" ? "−" : "+"}
                  {new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(residual.amount))} {residual.unit}
                </span>
                <span className="text-ink-muted">{residual.reason}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {selectedNode && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            onClick={() => setSelectedNode(null)}
            aria-label="Close node details"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="flow-node-title"
            className="relative max-h-[84vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-pop"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="micro-label">Ledger node</p>
                <h3 id="flow-node-title" className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-ink">
                  {selectedNode.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                aria-label="Close node details"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`badge ${statusStyles[selectedNode.status] || statusStyles.unknown}`}>{selectedNode.status}</span>
              <span className="badge border-line bg-surface-subtle font-mono text-ink-muted">{selectedNode.stage}</span>
              <span className="badge border-line bg-surface-subtle font-mono text-ink-muted">{selectedNode.kind}</span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
              <div className="bg-surface px-3.5 py-3">
                <dt className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-faint">Amount</dt>
                <dd className="tnum mt-1 text-[15px] font-semibold text-ink">
                  {new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(selectedNode.amount))}{" "}
                  <span className="text-[10px] font-medium text-ink-faint">{selectedNode.unit}</span>
                </dd>
              </div>
              <div className="bg-surface px-3.5 py-3">
                <dt className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-faint">Alternate unit</dt>
                <dd className="tnum mt-1 text-[13px] font-medium text-ink-soft">
                  {selectedNode.alt_amount !== null
                    ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(selectedNode.alt_amount))} ${selectedNode.alt_unit}`
                    : "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-4 space-y-3 text-[12px] leading-relaxed">
              <div>
                <p className="micro-label">Calculation</p>
                <p className="mt-1 whitespace-pre-wrap text-ink-soft">{selectedNode.calc}</p>
              </div>
              <div>
                <p className="micro-label">Sources</p>
                <p className="mt-1 font-mono text-[11px] text-ink-muted">{selectedNode.sources.join(", ")}</p>
              </div>
              {selectedNode.price_source && (
                <div>
                  <p className="micro-label">Price source</p>
                  <p className="mt-1 text-ink-soft">{selectedNode.price_source}</p>
                </div>
              )}
              {selectedNode.completeness_note && (
                <div className="flex gap-2 rounded-lg border border-ochre/25 bg-ochre-soft/60 p-3 text-[11px] text-ochre-deep">
                  <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {selectedNode.completeness_note}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="btn-secondary mt-5 w-full"
            >
              <IconX className="h-3.5 w-3.5" />
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
