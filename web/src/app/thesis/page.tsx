"use client";

const HYPOTHESES = [
  {
    id: "H1",
    claim: "Intents adoption is growing sustainably",
    hypothesis: "Intents volume, unique senders, and returning share show genuine growth; concentration not excessive; take rate stable",
    verdict: "INSUFFICIENT_DATA",
    tests: [
      { id: "vol_growth_90d", label: "Volume Growth (90d vs prior 90d)", threshold: "> 0", status: "partial", note: "3 days of Intents JWT data (3,000 tx). Need 90d." },
      { id: "sender_growth_90d", label: "Unique Sender Growth (90d)", threshold: "> 0", status: "partial", note: "3 days of unique sender addresses. Need 90d." },
      { id: "returning_sender_share", label: "Returning Sender Share", threshold: ">= 30%", status: "partial", note: "3 days of sender data. Need longer window." },
      { id: "top10_sender_share", label: "Top-10 Sender Share", threshold: "< 50%", status: "available", note: "Intents concentration metric available (3 days)." },
      { id: "take_rate_trend", label: "Take Rate Trend (365d slope)", threshold: "> -25%", status: "available", note: "DefiLlama fees/volume available (552 days)." },
    ],
    killCriteria: [
      "Volume growth <= 0 for two consecutive 90d windows",
      "Unique sender growth < 0 while volume growth > 0 (whale-driven)",
      "Top-10 sender share > 50%",
      "Take rate falls > 25% over window with flat fees",
    ],
    unavailable: "Intents JWT: 3 days only (2026-11-12 to 2026-11-14). Need 90d backfill for growth tests.",
  },
  {
    id: "H2",
    claim: "Intents activity predicts NEAR network activity",
    hypothesis: "Intents volume changes precede non-Intents NEAR active accounts/transactions changes",
    verdict: "INSUFFICIENT_DATA",
    tests: [
      { id: "corr_pearson", label: "Pearson Correlation (lags -8 to +8)", threshold: "|rho| >= 0.3, FDR CI excludes 0", status: "blocked", note: "Needs non-Intents NEAR active accounts/transactions (BigQuery quota)" },
      { id: "corr_spearman", label: "Spearman Correlation", threshold: "|rho| >= 0.3, FDR CI excludes 0", status: "blocked", note: "Needs non-Intents NEAR activity (BigQuery quota)" },
      { id: "partial_corr", label: "Partial Corr (market control)", threshold: "|rho| >= 0.3", status: "blocked", note: "Needs non-Intents NEAR activity + BTC/ETH returns (BigQuery quota)" },
      { id: "rolling_corr", label: "Rolling 26-week Correlation", threshold: "Visual inspection", status: "blocked", note: "Needs 52+ weekly observations of non-Intents NEAR activity" },
    ],
    killCriteria: [
      "No lag >= 0 meets |rho| >= 0.3 with FDR-adjusted CI excluding 0",
      "n < 52 weekly observations",
    ],
    unavailable: "Non-Intents NEAR network activity requires BigQuery (quota exhausted). Pikespeak event-historic endpoint times out.",
  },
  {
    id: "H3",
    claim: "NEAR captures meaningful value from Intents",
    hypothesis: "Capture rate and net revenue show sustainable value accrual",
    verdict: "INSUFFICIENT_DATA",
    tests: [
      { id: "capture_rate", label: "Capture Rate (90d trailing)", threshold: ">= 10%", status: "available", note: "DefiLlama holders revenue / fees = 35% (552 days). NearBlocks revenue wallet inflows available (90d)." },
      { id: "net_rev_growth", label: "Net Revenue NEAR Growth", threshold: "> 0", status: "available", note: "NearBlocks net_revenue_near.daily available (43 days, 90d window)." },
      { id: "take_rate_compression", label: "Take Rate Compression", threshold: "Not falling > 25% with flat fees", status: "available", note: "DefiLlama fees/volume trend available (552 days)." },
      { id: "reconciliation", label: "3-Way Revenue Reconciliation", threshold: "Delta <= 25% or explained", status: "partial", note: "DefiLlama vs NearBlocks vs revenue.near.org: DefiLlama holders rev vs NearBlocks revenue inflows. Buyback outflows = 0 observed." },
    ],
    killCriteria: [
      "Capture rate < 10% over trailing 90d",
      "Capture rate falls in 3 consecutive months",
      "Net revenue (NEAR) declines while Intents activity increases",
      "Onchain rebuild disagrees with DefiLlama by > 25% and unexplained",
    ],
    unavailable: "Full onchain revenue rebuild with buyback tracing needs BigQuery. NearBlocks gives wallet inflows/outflows but no historical removal trace. Removal tracing also needs BigQuery.",
  },
  {
    id: "H4",
    claim: "Protocol growth benefits tokenholders",
    hypothesis: "Post-buyback (since 2026-02-23), value capture translates to tokenholder benefit",
    verdict: "INSUFFICIENT_DATA",
    tests: [
      { id: "buyback_issuance", label: "Buyback NEAR / Net Issuance (90d)", threshold: ">= 10%", status: "partial", note: "NearBlocks buyback_outflows.daily = 0 observed. DefiLlama holders revenue (USD) available. Need net issuance (BigQuery)." },
      { id: "burn_issuance", label: "Removed NEAR / Net Issuance", threshold: "> 0", status: "available", note: "Onchain trace: buyback wallet balance grew, no transfers to removal address. φ = 0%." },
      { id: "net_supply", label: "Net Supply Change", threshold: "Not rising", status: "blocked", note: "Needs blocks.total_supply (BigQuery quota)." },
      { id: "rev_market_cap", label: "Revenue (NEAR) / Market Cap", threshold: "> 0", status: "partial", note: "Revenue (NEAR) from NearBlocks available. Market cap needs NEAR price × circulating supply." },
      { id: "rev_emissions", label: "Revenue / Emissions", threshold: "> 0", status: "partial", note: "Revenue (NEAR) available. Emissions need net issuance (BigQuery)." },
    ],
    killCriteria: [
      "Buyback NEAR < 10% of net issuance over trailing 90d",
      "Burned NEAR = 0 or unobserved (buyback NEAR != burned NEAR)",
      "Net supply still rising",
    ],
    unavailable: "Net issuance and supply change need BigQuery. NearBlocks shows buyback outflows = 0, φ = 0%.",
  },
  {
    id: "H5",
    claim: "Adoption is becoming less concentrated",
    hypothesis: "Usage distribution flattening across addresses, contracts, chains, tokens",
    verdict: "INSUFFICIENT_DATA",
    tests: [
      { id: "sender_gini", label: "Intents Sender Gini", threshold: "Not rising 2 consecutive quarters", status: "partial", note: "Intents sender addresses available (3 days). Need longer history for Gini trend." },
      { id: "sender_top10", label: "Intents Top-10 Share", threshold: "<= 10pp rise", status: "available", note: "Intents concentration metric (top-10 share) available (3 days)." },
      { id: "account_hhi", label: "NEAR Account HHI", threshold: "Not rising 2 consecutive quarters", status: "blocked", note: "Needs network-wide account activity (BigQuery quota)." },
      { id: "contract_hhi", label: "Contract HHI", threshold: "Not rising 2 consecutive quarters", status: "blocked", note: "Needs contract interaction data (BigQuery quota)." },
      { id: "chain_hhi", label: "Chain HHI", threshold: "Not rising 2 consecutive quarters", status: "available", note: "Intents chain_distribution.daily available (3 days)." },
      { id: "token_hhi", label: "Token HHI", threshold: "Not rising 2 consecutive quarters", status: "available", note: "Intents token_distribution.daily available (3 days)." },
      { id: "returning_sender", label: "Returning Sender Trend", threshold: "Not falling", status: "partial", note: "3 days of sender data. Need longer window for trend." },
    ],
    killCriteria: [
      "HHI rises in 2 consecutive quarters on >= 2 of 4 dimensions",
      "Top-10 share rises > 10 percentage points",
    ],
    unavailable: "Longitudinal concentration trends need >3 days. Network-wide HHI needs BigQuery. Pikespeak hot wallets = snapshot only.",
  },
] as const;

const VERDICT_COLORS = {
  SUPPORTED: "text-green-400 bg-green-900/30 border-green-700",
  CONTRADICTED: "text-red-400 bg-red-900/30 border-red-700",
  MIXED: "text-amber-400 bg-amber-900/30 border-amber-700",
  INSUFFICIENT_DATA: "text-muted bg-neutral-800 border-neutral-700",
};

const TEST_STATUS_COLORS = {
  available: "text-green-400 bg-green-900/30 border-green-700",
  partial: "text-amber-400 bg-amber-900/30 border-amber-700",
  blocked: "text-red-400 bg-red-900/30 border-red-700",
};

const TEST_STATUS_LABELS = {
  available: "Data Available",
  partial: "Partial Data",
  blocked: "Blocked (BigQuery)",
};

interface TestItem {
  id: string;
  label: string;
  threshold: string;
  status: "available" | "partial" | "blocked";
  note: string;
}

function TestRows({ tests }: { tests: TestItem[] }) {
  const rows = [];
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const statusColor = TEST_STATUS_COLORS[t.status];
    const statusLabel = TEST_STATUS_LABELS[t.status];
    rows.push(
      <tr key={t.id} className="border-b border-neutral-800">
        <td className="py-2 font-mono text-xs">{t.id}</td>
        <td className="py-2 text-sm">{t.label}</td>
        <td className="py-2 text-sm">{t.threshold}</td>
        <td className="py-2 text-center">
          <span className={`px-2 py-0.5 rounded text-xs ${statusColor}`}>
            {statusLabel}
          </span>
        </td>
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

function DataAvailabilityNotice({ text, status }: { text: string; status: "available" | "partial" | "blocked" }) {
  const colors = {
    available: "border-green-800 bg-green-900/20 text-green-300",
    partial: "border-amber-800 bg-amber-900/20 text-amber-300",
    blocked: "border-red-800 bg-red-900/20 text-red-300",
  };
  const labels = {
    available: "✓ Data Available",
    partial: "⚠ Partial Data",
    blocked: "✗ Blocked (BigQuery Quota)",
  };
  return (
    <div className={`border ${colors[status]} rounded p-3 text-sm`}>
      <div className="flex items-center gap-2 mb-1">{labels[status]}</div>
      <div className="text-muted">{text}</div>
    </div>
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
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded">✓ Available</span>
          <span className="px-2 py-1 bg-amber-900/30 text-amber-400 rounded">⚠ Partial</span>
          <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded">✗ Blocked</span>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        {HYPOTHESES.map((h) => (
          <div key={h.id} className={"px-4 py-2 rounded-lg border " + VERDICT_COLORS[h.verdict]}>
            <div className="font-semibold">{h.id}</div>
            <div className="text-xs">{h.verdict}</div>
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
              <div className={"px-3 py-1 rounded text-sm font-medium " + VERDICT_COLORS[h.verdict]}>
                {h.verdict}
              </div>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-neutral-700">
                    <th className="pb-2 w-1/4">Test</th>
                    <th className="pb-2">Threshold</th>
                    <th className="pb-2 text-center">Status</th>
                    <th className="pb-2">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {h.tests.map((t) => (
                    <tr key={t.id} className="border-b border-neutral-800">
                      <td className="py-2 font-mono text-xs">{t.id}</td>
                      <td className="py-2 text-sm">{t.label}</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${TEST_STATUS_COLORS[t.status]}`}>
                          {TEST_STATUS_LABELS[t.status]}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-muted max-w-xs truncate">{t.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <KillCriteriaList criteria={h.killCriteria} />

            <DataAvailabilityNotice text={h.unavailable} status={h.tests.some(t => t.status === "blocked") ? "blocked" : h.tests.some(t => t.status === "partial") ? "partial" : "available"} />
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
        <h2 className="text-lg font-semibold mb-2">Methodology (Plan 07)</h2>
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
              <li>• Intents Explorer: 3,000 tx over 3 days (volume, swaps, senders, chains, tokens, concentration)</li>
              <li>• NearBlocks: Revenue wallet NEAR inflows (90d), buyback outflows (0 observed)</li>
              <li>• Pikespeak: Top 100 hot wallets (38.9M NEAR)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Blocked (BigQuery Quota Exhausted)</p>
            <ul className="space-y-1 text-red-400">
              <li>• Network-wide daily active accounts / transactions</li>
              <li>• Intents-attributable NEAR activity</li>
              <li>• Net supply change / total supply / issuance</li>
              <li>• Historical buyback/removal trace with counterparties</li>
              <li>• 90-day backfill for Intents metrics (only 3 days)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}