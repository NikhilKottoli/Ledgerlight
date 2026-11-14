"use client";

import { useState } from "react";
import Link from "next/link";
import FlowSankey from "@/components/flows/FlowSankey";
import FlowWaterfall from "@/components/flows/FlowWaterfall";
import FlowDestination from "@/components/flows/FlowDestination";
import PageHeader from "@/components/ui/PageHeader";
import { ChartSkeleton } from "@/components/ui/Loading";
import { IconAlert, IconArrowUpRight, IconCheck } from "@/components/ui/icons";
import { FlowLedgerModel } from "@/lib/types";
import { useMetrics } from "@/hooks/useMetric";
import { formatLongDate, formatNumber, formatUsd } from "@/lib/chartTheme";

const PRESETS = ["7d", "30d", "90d", "ytd", "all"] as const;

const statusStyles: Record<string, string> = {
  reconciled: "border-sage/25 bg-sage-soft text-sage-deep",
  partial: "border-ochre/30 bg-ochre-soft text-ochre-deep",
  unknown: "border-line bg-surface-muted text-ink-muted",
};

export default function FlowsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30d");
  const [unit, setUnit] = useState<"USD" | "NEAR">("USD");
  const { artifacts, isLoading } = useMetrics(PRESETS.map((period) => `flow_ledger_${period}`));

  const ledgers = PRESETS.map((period, index) => ({
    period,
    ledger: artifacts[index] as FlowLedgerModel | undefined,
  })).filter((entry): entry is { period: (typeof PRESETS)[number]; ledger: FlowLedgerModel } => Boolean(entry.ledger));

  const selectedLedger =
    ledgers.find((entry) => entry.period === selectedPeriod)?.ledger || ledgers[0]?.ledger;

  const node = (id: string, ledger?: FlowLedgerModel) => ledger?.nodes.find((entry) => entry.id === id);

  const grossFees = node("gross_fees", selectedLedger);
  const netRevenue = node("net_revenue_swept", selectedLedger);
  const netRevenueNear = node("net_revenue_near", selectedLedger);
  const buyback = node("buyback", selectedLedger);
  const burned = node("burned", selectedLedger);
  const residualCount = selectedLedger?.residuals.length || 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Analysis · Flows"
        title="Economic Flows"
        description="Trace gross Intents fees through to tokenholder-relevant outcomes. USD fee stages and post-sweep NEAR stages are kept in separate ledgers and never forced to balance."
        meta={
          <>
            {selectedLedger && (
              <span>
                Ledger window{" "}
                <span className="font-medium text-ink-muted">
                  {formatLongDate(selectedLedger.start)} — {formatLongDate(selectedLedger.end)}
                </span>
              </span>
            )}
            {selectedLedger?.retrieved_at && (
              <span>Retrieved {formatLongDate(selectedLedger.retrieved_at.split("T")[0])}</span>
            )}
            {residualCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-ochre-deep">
                <IconAlert className="h-3 w-3" />
                {residualCount} explicit unreconciled amount{residualCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sage-deep">
                <IconCheck className="h-3 w-3" />
                No residual amounts recorded
              </span>
            )}
          </>
        }
        actions={
          <Link href="/methodology" className="btn-secondary">
            Unit policy
            <IconArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid gap-4">
          <ChartSkeleton height={420} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartSkeleton height={260} />
            <ChartSkeleton height={260} />
          </div>
        </div>
      ) : !selectedLedger ? (
        <div className="empty-state">
          <p className="text-[12.5px] font-medium text-ink-muted">No flow ledger data available</p>
          <p className="mt-1 text-[11.5px] text-ink-faint">
            The pipeline has not published a ledger artifact. Nothing is estimated.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="micro-label">Ledger period</p>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                {ledgers.length} published windows. Selection changes the full ledger below.
              </p>
            </div>
            <div className="segmented" role="group" aria-label="Flow ledger period">
              {ledgers.map(({ period }) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSelectedPeriod(period)}
                  aria-pressed={selectedLedger.period === period}
                  className={`segmented-item uppercase ${selectedLedger.period === period ? "segmented-item-active" : ""}`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ledger headline values">
            <div className="card p-4">
              <p className="text-[11.5px] font-medium text-ink-muted">Gross fees</p>
              <p className="tnum mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink">
                {grossFees ? formatUsd(Number(grossFees.amount)) : "—"}
              </p>
              <p className="mt-1 text-[10.5px] text-ink-faint">USD · before partner payouts</p>
            </div>
            <div className="card p-4">
              <p className="text-[11.5px] font-medium text-ink-muted">Net revenue swept</p>
              <p className="tnum mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink">
                {netRevenue ? formatUsd(Number(netRevenue.amount)) : "—"}
              </p>
              <p className="mt-1 text-[10.5px] text-ink-faint">USD · net of partner payouts</p>
            </div>
            <div className="card p-4">
              <p className="text-[11.5px] font-medium text-ink-muted">Net revenue</p>
              <p className="tnum mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink">
                {netRevenueNear ? `${formatNumber(Number(netRevenueNear.amount))} NEAR` : "—"}
              </p>
              <p className="mt-1 text-[10.5px] text-ink-faint">NEAR · post-sweep stages</p>
            </div>
            <div className="card p-4">
              <p className="text-[11.5px] font-medium text-ink-muted">Buyback</p>
              <p className="tnum mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink">
                {buyback ? `${formatNumber(Number(buyback.amount))} NEAR` : "—"}
              </p>
              <p className="mt-1 text-[10.5px] text-ink-faint">
                Burned: {burned ? `${formatNumber(Number(burned.amount))} NEAR` : "not reported"}
              </p>
            </div>
          </section>

          <FlowSankey ledger={selectedLedger} unitToggle={unit} onUnitToggle={setUnit} />

          <section className="grid gap-4 lg:grid-cols-2" aria-label="Flow composition">
            <FlowWaterfall ledger={selectedLedger} />
            <FlowDestination ledger={selectedLedger} />
          </section>

          <details className="card group overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[12px] font-medium text-ink-soft hover:bg-surface-subtle sm:px-5">
              <span className="flex flex-wrap items-center gap-2">
                All ledger stages
                <span className="badge border-line bg-surface-subtle font-mono text-ink-muted">
                  {selectedLedger.nodes.length} nodes
                </span>
                <span className="badge border-line bg-surface-subtle font-mono text-ink-muted">
                  {selectedLedger.edges.length} edges
                </span>
              </span>
              <span className="text-[10.5px] text-ink-faint group-open:hidden">Show stage detail</span>
              <span className="hidden text-[10.5px] text-ink-faint group-open:inline">Hide stage detail</span>
            </summary>
            <div className="border-t border-line p-4 sm:p-5">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Node</th>
                      <th>Stage</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Alternate unit</th>
                      <th>Kind</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLedger.nodes.map((entry) => (
                      <tr key={entry.id}>
                        <td className="font-medium text-ink">{entry.label}</td>
                        <td className="font-mono text-[11px] text-ink-faint">{entry.stage}</td>
                        <td className="tnum whitespace-nowrap text-right">
                          {new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(entry.amount))}{" "}
                          <span className="text-[10.5px] text-ink-faint">{entry.unit}</span>
                        </td>
                        <td className="tnum whitespace-nowrap text-right text-ink-muted">
                          {entry.alt_amount !== null
                            ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
                                Number(entry.alt_amount)
                              )} ${entry.alt_unit}`
                            : "—"}
                        </td>
                        <td className="font-mono text-[11px] text-ink-faint">{entry.kind}</td>
                        <td>
                          <span className={`badge ${statusStyles[entry.status] || statusStyles.unknown}`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10.5px] text-ink-faint">
                Values are shown as published. The alternate unit is contextual only and never replaces the native
                ledger amount.
              </p>
            </div>
          </details>

          <section className="card card-pad" aria-label="Sources">
            <p className="text-[11px] leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">Sources.</span> DefiLlama (fees, revenue, holders revenue), onchain
              rebuild, NEAR Intents Explorer. Unreconciled amounts remain explicit in the ledger; they are never plugged
              to make a stage balance.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
