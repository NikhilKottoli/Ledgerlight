"use client";

import { useState } from "react";
import FlowSankey from "@/components/flows/FlowSankey";
import { FlowLedgerModel } from "@/lib/types";
import { useMetrics } from "@/hooks/useMetric";

const PRESETS = ["7d", "30d", "90d", "ytd", "all"] as const;

export default function FlowsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30d");
  const metricIds = PRESETS.map(p => `flow_ledger_${p}`);
  const { artifacts, isLoading } = useMetrics(metricIds);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <header className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Economic Flows</h1>
          <p className="text-muted mt-1">Gross fees → Protocol revenue → Buyback → Destination</p>
        </header>
        <div className="text-center py-12 text-muted">Loading live data...</div>
      </div>
    );
  }

  const ledgers = PRESETS.map((p, i) => ({ period: p, ledger: artifacts[i] as FlowLedgerModel | undefined })).filter(l => l.ledger);

  if (!ledgers.length) {
    return (
      <div className="space-y-6">
        <header className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Economic Flows</h1>
          <p className="text-muted mt-1">Gross fees → Protocol revenue → Buyback → Destination</p>
        </header>
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-8 text-center text-muted">
          No flow ledger data found. Run <code className="bg-neutral-800 px-1 rounded">pipeline.flows.ledger</code> to generate.
        </div>
      </div>
    );
  }

  // Ensure selected period exists in ledgers
  const selectedLedger = ledgers.find(l => l.period === selectedPeriod) || ledgers[0];
  if (!ledgers.find(l => l.period === selectedPeriod)) {
    setSelectedPeriod(selectedLedger.period);
  }

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Economic Flows</h1>
        <p className="text-muted mt-1">
          Trace gross Intents fees through to tokenholder-relevant outcomes.
          Every stage either reconciles or shows an explicit unreconciled amount.
        </p>
      </header>

      {/* Period Selector */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {ledgers.map(({ period }) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-3 py-1.5 text-sm rounded font-mono border transition-colors ${
              period === selectedPeriod ? "bg-blue-900/30 text-blue-300 border-blue-700" : "bg-neutral-800 text-muted border-neutral-700 hover:bg-neutral-700"
            }`}
          >
            {period.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Sankey */}
      {selectedLedger.ledger && (
        <FlowSankey ledger={selectedLedger.ledger} />
      )}

      {/* Key Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Gross → Net Reconciliation</h3>
          <p className="text-sm text-muted">
            Compare DefiLlama gross fees, our onchain net revenue, and revenue.near.org references.
            Click "Reconciliation Panel" in the Sankey for details.
          </p>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Buyback ≠ Burn</h3>
          <p className="text-sm text-muted">
            DefiLlama: buybacks held (not burned).<br/>
            revenue.near.org: "permanently removed".<br/>
            Onchain: buyback wallet balance grew.
          </p>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Unreconciled Amounts</h3>
          <p className="text-sm text-muted">
            Every stage shows residuals. Negative residuals = definition mismatch.
            Hover nodes for details.
          </p>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 text-sm text-muted">
        <p><strong>Sources:</strong> DefiLlama (fees, revenue, holders revenue), BigQuery onchain rebuild (receipt_actions, ft_balances_daily), NEAR Intents Explorer (appFees - pending JWT).</p>
        <p className="mt-1"><strong>Warnings:</strong> BigQuery quota limited to 30 days; wNEAR from ft_balances_daily balance deltas; appFees by recipient pending Explorer JWT.</p>
      </div>
    </div>
  );
}