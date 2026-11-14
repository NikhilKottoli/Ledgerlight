"use client";

import { FlowLedgerModel } from "@/lib/types";
import { formatNumber } from "@/lib/chartTheme";

interface Props {
  ledger: FlowLedgerModel;
}

const DESTINATIONS = [
  { id: "buyback", label: "Buyback", color: "#a8742a" },
  { id: "held", label: "Held", color: "#9c9287" },
  { id: "spent", label: "Spent / other", color: "#b24a3e" },
  { id: "unknown_dest", label: "Unknown", color: "#d6cdc0" },
  { id: "burned", label: "Burned", color: "#8e352b" },
] as const;

export default function FlowDestination({ ledger }: Props) {
  const totalNode = ledger.nodes.find((n) => n.id === "net_revenue_near");
  const rows = DESTINATIONS.map((destination) => {
    const node = ledger.nodes.find((n) => n.id === destination.id);
    return { ...destination, amount: node ? Number(node.amount) : 0, status: node?.status };
  });
  const total = totalNode ? Number(totalNode.amount) : rows.reduce((sum, row) => sum + row.amount, 0);

  if (!totalNode || total <= 0) {
    return (
      <div className="card p-5">
        <h3 className="section-title">NEAR destination split</h3>
        <div className="empty-state mt-4">
          <p className="text-[12.5px] font-medium text-ink-muted">No NEAR destination stages</p>
          <p className="mt-1 text-[11.5px] text-ink-faint">This ledger has no net revenue denominated in NEAR.</p>
        </div>
      </div>
    );
  }

  const burned = rows.find((row) => row.id === "burned")?.amount || 0;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="section-title">NEAR destination split</h3>
          <p className="mt-0.5 text-[11px] text-ink-faint">Net revenue after sweep, by destination</p>
        </div>
        <div className="text-right">
          <p className="tnum text-[14px] font-semibold text-ink">{formatNumber(total)}</p>
          <p className="text-[9.5px] uppercase tracking-[0.1em] text-ink-faint">NEAR</p>
        </div>
      </div>

      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted" role="img" aria-label="NEAR destination split">
        {rows
          .filter((row) => row.amount > 0)
          .map((row) => (
            <div
              key={row.id}
              style={{ width: `${(row.amount / total) * 100}%`, backgroundColor: row.color }}
              title={`${row.label}: ${formatNumber(row.amount)} NEAR`}
            />
          ))}
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-[11.5px] text-ink-muted">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              {row.label}
              {row.id === "buyback" && row.status === "partial" && (
                <span className="badge border-ochre/30 bg-ochre-soft text-[9px] text-ochre-deep">partial</span>
              )}
            </span>
            <span className="tnum shrink-0 text-[11px] text-ink">
              {formatNumber(row.amount)} NEAR
              <span className="ml-1.5 text-[10px] text-ink-faint">{total > 0 ? ((row.amount / total) * 100).toFixed(1) : "0.0"}%</span>
            </span>
          </div>
        ))}
      </div>

      {burned === 0 && (
        <p className="mt-4 rounded-lg border border-ochre/25 bg-ochre-soft/60 px-3 py-2 text-[10.5px] leading-relaxed text-ochre-deep">
          Burned is 0 NEAR in this ledger. Buybacks are held in the buyback wallet, not sent to a burn destination.
        </p>
      )}
    </div>
  );
}
