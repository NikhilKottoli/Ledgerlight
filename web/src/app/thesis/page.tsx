"use client";

const HYPOTHESES = [
  {
    id: "H1",
    claim: "Intents adoption is growing sustainably",
    hypothesis: "Intents volume, unique senders, and returning share show genuine growth; concentration not excessive; take rate stable",
    tests: [
      { id: "vol_growth_90d", label: "Volume Growth (90d vs prior 90d)", threshold: "> 0" },
      { id: "sender_growth_90d", label: "Unique Sender Growth (90d)", threshold: "> 0" },
      { id: "returning_sender_share", label: "Returning Sender Share", threshold: ">= 30%" },
      { id: "top10_sender_share", label: "Top-10 Sender Share", threshold: "< 50%" },
      { id: "take_rate_trend", label: "Take Rate Trend (365d slope)", threshold: "> -25%" },
    ],
    killCriteria: [
      "Volume growth <= 0 for two consecutive 90d windows",
      "Unique sender growth < 0 while volume growth > 0 (whale-driven)",
      "Top-10 sender share > 50%",
      "Take rate falls > 25% over window with flat fees",
    ],
  },
  {
    id: "H2",
    claim: "Intents activity predicts NEAR network activity",
    hypothesis: "Intents volume changes precede non-Intents NEAR active accounts/transactions changes",
    tests: [
      { id: "corr_pearson", label: "Pearson Correlation (lags -8 to +8)", threshold: "|rho| >= 0.3, FDR CI excludes 0" },
      { id: "corr_spearman", label: "Spearman Correlation", threshold: "|rho| >= 0.3, FDR CI excludes 0" },
      { id: "partial_corr", label: "Partial Corr (market control)", threshold: "|rho| >= 0.3" },
      { id: "rolling_corr", label: "Rolling 26-week Correlation", threshold: "Visual inspection" },
    ],
    killCriteria: [
      "No lag >= 0 meets |rho| >= 0.3 with FDR-adjusted CI excluding 0",
      "n < 52 weekly observations",
    ],
  },
  {
    id: "H3",
    claim: "NEAR captures meaningful value from Intents",
    hypothesis: "Capture rate and net revenue show sustainable value accrual",
    tests: [
      { id: "capture_rate", label: "Capture Rate (90d trailing)", threshold: ">= 10%" },
      { id: "net_rev_growth", label: "Net Revenue NEAR Growth", threshold: "> 0" },
      { id: "take_rate_compression", label: "Take Rate Compression", threshold: "Not falling > 25% with flat fees" },
      { id: "reconciliation", label: "3-Way Revenue Reconciliation", threshold: "Delta <= 25% or explained" },
    ],
    killCriteria: [
      "Capture rate < 10% over trailing 90d",
      "Capture rate falls in 3 consecutive months",
      "Net revenue (NEAR) declines while Intents activity increases",
      "Onchain rebuild disagrees with DefiLlama by > 25% and unexplained",
    ],
  },
  {
    id: "H4",
    claim: "Protocol growth benefits tokenholders",
    hypothesis: "Post-buyback (since 2026-02-23), value capture translates to tokenholder benefit",
    tests: [
      { id: "buyback_issuance", label: "Buyback NEAR / Net Issuance (90d)", threshold: ">= 10%" },
      { id: "removal_issuance", label: "Removed NEAR / Net Issuance", threshold: "> 0" },
      { id: "net_supply", label: "Net Supply Change", threshold: "Not rising" },
      { id: "rev_market_cap", label: "Revenue (NEAR) / Market Cap", threshold: "> 0" },
      { id: "rev_emissions", label: "Revenue / Emissions", threshold: "> 0" },
    ],
    killCriteria: [
      "Buyback NEAR < 10% of net issuance over trailing 90d",
      "Removed NEAR = 0 or unobserved (buyback NEAR != removed NEAR)",
      "Net supply still rising",
    ],
  },
  {
    id: "H5",
    claim: "Adoption is becoming less concentrated",
    hypothesis: "Usage distribution flattening across addresses, contracts, chains, tokens",
    tests: [
      { id: "sender_gini", label: "Intents Sender Gini", threshold: "Not rising 2 consecutive quarters" },
      { id: "sender_top10", label: "Intents Top-10 Share", threshold: "<= 10pp rise" },
      { id: "account_hhi", label: "NEAR Account HHI", threshold: "Not rising 2 consecutive quarters" },
      { id: "contract_hhi", label: "Contract HHI", threshold: "Not rising 2 consecutive quarters" },
      { id: "chain_hhi", label: "Chain HHI", threshold: "Not rising 2 consecutive quarters" },
      { id: "token_hhi", label: "Token HHI", threshold: "Not rising 2 consecutive quarters" },
      { id: "returning_sender", label: "Returning Sender Trend", threshold: "Not falling" },
    ],
    killCriteria: [
      "HHI rises in 2 consecutive quarters on >= 2 of 4 dimensions",
      "Top-10 share rises > 10 percentage points",
    ],
  },
] as const;

interface TestItem {
  id: string;
  label: string;
  threshold: string;
}

function TestRows({ tests }: { tests: readonly TestItem[] }) {
  const rows = [];
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    rows.push(
      <tr key={t.id} className="border-b border-neutral-800">
        <td className="py-2 font-mono text-xs">{t.id}</td>
        <td className="py-2 text-sm">{t.label}</td>
        <td className="py-2 text-sm">{t.threshold}</td>
      </tr>
    );
  }
  return rows;
}

function KillCriteriaList({ criteria }: { criteria: readonly string[] }) {
  const items = [];
  for (let i = 0; i < criteria.length; i++) {
    const k = criteria[i];
    items.push(
      <li key={i} className="flex items-center gap-2">
        <span className="text-red-400">✗</span>
        {criteria[i]}
      </li>
    );
  }
  return (
    <details className="mb-4">
      <summary className="cursor-pointer font-medium text-sm text-amber-300 flex items-center gap-2">
        ⚠ Kill Criteria ({criteria.length})
      </summary>
      <ul className="mt-2 space-y-1 text-sm text-muted">{items}</ul>
    </details>
  );
}

export default function ThesisPage() {
  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Thesis Lab</h1>
        <p className="text-muted mt-1">Pre-registered hypotheses H1–H5 with rule-based verdicts and visible evidence status</p>
        <div className="mt-2 flex items-center gap-4 text-sm">
          <span className="px-2 py-1 bg-neutral-800 rounded font-mono">prereg-v1</span>
          <span className="text-muted">Frozen pre-registration tag</span>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        {HYPOTHESES.map((h) => (
          <div key={h.id} className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900/50">
            <div className="font-semibold">{h.id}</div>
            <div className="text-xs text-muted">{h.claim}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {HYPOTHESES.map((h) => (
          <section key={h.id} className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-neutral-800 rounded font-mono">{h.id}</span>
                  {h.claim}
                </h2>
                <p className="text-sm text-muted mt-1">{h.hypothesis}</p>
              </div>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-neutral-700">
                    <th className="pb-2 w-1/4">Test</th>
                    <th className="pb-2">Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {TestRows({ tests: h.tests })}
                </tbody>
              </table>
            </div>

            <KillCriteriaList criteria={h.killCriteria} />
          </section>
        ))}
      </div>

      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-2">Pre-registration</h2>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div>
            <p className="font-medium mb-1">Frozen at tag: <code className="bg-neutral-800 px-1 rounded">prereg-v1</code></p>
            <p className="text-muted">All hypotheses, thresholds, and kill criteria frozen before any analysis runs.</p>
          </div>
          <div>
            <p className="font-medium mb-1">Amendments</p>
            <p className="text-muted">Any changes after freeze are append-only in <code className="bg-neutral-800 px-1 rounded">PREREGISTRATION.md</code> with date, change, and rationale.</p>
          </div>
        </div>
      </section>

      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-2">Methodology</h2>
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <div>
            <p className="font-medium mb-1">Statistical Method</p>
            <ul className="space-y-1 text-muted">
              <li>• Stationary transforms: log-differences (log x_t - log x_t-1)</li>
              <li>• Primary frequency: weekly (ISO weeks)</li>
              <li>• Minimum n = 52 weekly observations</li>
              <li>• Missing weeks dropped, never interpolated</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">Inference</p>
            <ul className="space-y-1 text-muted">
              <li>• Stationary block bootstrap CIs (1000 resamples, block length 10)</li>
              <li>• Benjamini–Hochberg FDR across all lags tested</li>
              <li>• Partial correlation controlling for BTC/ETH returns</li>
              <li>• Effect size + CI + n reported (never p-value alone)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">Structural Breaks</p>
            <ul className="space-y-1 text-muted">
              <li>• Pre/post 2026-02-23 (buyback start)</li>
              <li>• Exclude 14d post 2026-10-01 (exploit)</li>
              <li>• Results reported for each subsample</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-2">Current Evidence Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div>
            <p className="font-medium mb-2">Available Now</p>
            <ul className="space-y-1 text-green-400">
              <li>• DefiLlama: Intents TVL, fees, revenue, holders revenue (552 days)</li>
              <li>• DefiLlama: NEAR Chain TVL (1,913 days)</li>
              <li>• Intents Explorer: 4 days of transaction data (volume, swaps, senders, chains, tokens, concentration)</li>
              <li>• NearBlocks: Revenue wallet NEAR inflows (90d), buyback outflows (0 observed)</li>
              <li>• Pikespeak: Top 100 hot wallets (38.9M NEAR)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Requires Additional Data</p>
            <ul className="space-y-1 text-amber-400">
              <li>• Network-wide daily active accounts / transactions</li>
              <li>• Intents-attributable NEAR activity</li>
              <li>• Net supply change / total supply / issuance</li>
              <li>• Historical buyback/removal trace with counterparties</li>
              <li>• 90-day backfill for Intents metrics (currently 4 days)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}