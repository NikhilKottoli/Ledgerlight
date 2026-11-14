"use client";

import { useEffect, useState } from "react";

import PageHeader from "@/components/ui/PageHeader";
import SectionHeading from "@/components/ui/SectionHeading";
import { IconAlert, IconArrowUpRight, IconCheck, IconShield, IconX } from "@/components/ui/icons";

const HYPOTHESES = [
  {
    id: "H1",
    claim: "Intents adoption is growing sustainably",
    hypothesis: "Intents volume, unique sender addresses, and returning share show genuine growth; concentration not excessive; take rate stable",
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
] as const;

interface TestItem {
  id: string;
  label: string;
  threshold: string;
}

interface ThesisResults {
  hypotheses: Record<string, { verdict: string }>;
  data_mode: string;
}

function VerdictScorecard() {
  const [results, setResults] = useState<ThesisResults | null>(null);

  useEffect(() => {
    fetch("/data/thesis_results.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((value: ThesisResults | null) => setResults(value))
      .catch(() => setResults(null));
  }, []);

  if (!results) return null;

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="scorecard-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="micro-label">Computed results</p>
          <h2 id="scorecard-heading" className="mt-1 section-title">Hypothesis scorecard</h2>
        </div>
        <span className="badge border-line bg-surface-subtle font-mono text-ink-muted">{results.data_mode}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        {Object.entries(results.hypotheses).map(([id, hypothesis]) => (
          <div key={id} className="rounded-lg border border-line bg-surface-subtle/60 p-3">
            <p className="font-mono text-[11px] font-semibold text-accent">{id}</p>
            <p className="mt-1 text-[11px] font-medium text-ink">{hypothesis.verdict}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestRows({ tests }: { tests: readonly TestItem[] }) {
  return (
    <>
      {tests.map((t) => (
        <tr key={t.id}>
          <td className="whitespace-nowrap font-mono text-[10.5px] text-ink-faint">{t.id}</td>
          <td className="text-ink-soft">{t.label}</td>
          <td className="font-mono text-[11px] text-ink-muted">{t.threshold}</td>
        </tr>
      ))}
    </>
  );
}

function KillCriteriaList({ hypothesisId, criteria }: { hypothesisId: string; criteria: readonly string[] }) {
  return (
    <details className="group rounded-xl border border-line bg-surface-subtle/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 text-[11.5px] font-medium text-ochre-deep hover:bg-ochre-soft/40">
        <span className="flex items-center gap-2">
          <IconAlert className="h-3.5 w-3.5" />
          Kill criteria ({criteria.length})
        </span>
        <span className="font-mono text-[10px] text-ink-faint group-open:hidden">Show</span>
        <span className="hidden font-mono text-[10px] text-ink-faint group-open:inline">Hide</span>
      </summary>
      <ul className="space-y-1.5 border-t border-line px-3.5 py-3 text-[11.5px] leading-relaxed text-ink-muted" aria-label={`Kill criteria for ${hypothesisId}`}>
        {criteria.map((criterion, index) => (
          <li key={index} className="flex items-start gap-2">
            <IconX className="mt-0.5 h-3 w-3 shrink-0 text-danger" />
            {criterion}
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function ThesisPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Research · Thesis"
        title="Thesis Lab"
        description="Pre-registered hypotheses H1–H4 with rule-based verdicts and visible evidence status. Tests and kill criteria are frozen before analysis."
        meta={
          <>
            <span className="badge border-line bg-surface-subtle font-mono text-ink-muted">prereg-v1</span>
            <span>4 hypotheses</span>
            <span className="inline-flex items-center gap-1.5">
              <IconShield className="h-3 w-3 text-sage" />
              Frozen pre-registration tag
            </span>
          </>
        }
        actions={
          <a href="#preregistration" className="btn-secondary">
            Pre-registration
            <IconArrowUpRight className="h-3.5 w-3.5" />
          </a>
        }
      />

      <section aria-label="Hypothesis index">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {HYPOTHESES.map((h) => (
            <a
              key={h.id}
              href={`#hypothesis-${h.id}`}
              className="card group flex flex-col gap-2 p-3.5 transition-shadow hover:shadow-lift"
            >
              <span className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold text-accent">{h.id}</span>
                <span className="text-[10px] text-ink-faint">{h.tests.length} tests</span>
              </span>
              <span className="text-[11.5px] font-medium leading-snug text-ink-soft group-hover:text-ink">{h.claim}</span>
            </a>
          ))}
        </div>
      </section>

      <VerdictScorecard />

      <div className="space-y-4">
        {HYPOTHESES.map((h) => (
          <section
            key={h.id}
            id={`hypothesis-${h.id}`}
            className="card scroll-mt-24 overflow-hidden"
            aria-labelledby={`${h.id}-claim`}
          >
            <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent-soft font-mono text-[11px] font-semibold text-accent-deep">
                  {h.id}
                </span>
                <div className="min-w-0">
                  <h2 id={`${h.id}-claim`} className="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-ink">
                    {h.claim}
                  </h2>
                  <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-ink-muted">{h.hypothesis}</p>
                </div>
              </div>
              <span className="badge shrink-0 border-line bg-surface-subtle font-mono text-ink-muted">
                {h.tests.length} tests · {h.killCriteria.length} kill criteria
              </span>
            </div>

            <div className="space-y-3 px-4 py-4 sm:px-5">
              <div className="table-wrap">
                <table className="data-table min-w-[620px]">
                  <thead>
                    <tr>
                      <th className="w-[180px]">Test</th>
                      <th>Definition</th>
                      <th>Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TestRows tests={h.tests} />
                  </tbody>
                </table>
              </div>
              <KillCriteriaList hypothesisId={h.id} criteria={h.killCriteria} />
            </div>
          </section>
        ))}
      </div>

      <section id="preregistration" className="grid scroll-mt-24 gap-4 lg:grid-cols-2" aria-labelledby="preregistration-heading">
        <div className="card p-4 sm:p-5">
          <p className="micro-label">Frozen</p>
          <h2 id="preregistration-heading" className="mt-1 section-title">
            Pre-registration
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
            Frozen at tag <code className="rounded border border-line bg-surface-subtle px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft">prereg-v1</code>. All hypotheses, thresholds, and kill criteria
            are frozen before any analysis runs.
          </p>
        </div>
        <div className="card p-4 sm:p-5">
          <p className="micro-label">Change control</p>
          <h2 className="mt-1 section-title">Amendments</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
            Any changes after freeze are append-only in{" "}
            <code className="rounded border border-line bg-surface-subtle px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft">PREREGISTRATION.md</code>{" "}
            with date, change, and rationale.
          </p>
        </div>
      </section>

      <section aria-labelledby="thesis-method-heading">
        <SectionHeading
          title="Methodology"
          description="The statistical rules that decide whether a hypothesis survives or is killed."
          className="mb-3"
        />
        <h2 id="thesis-method-heading" className="sr-only">
          Statistical methodology
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="card p-4">
            <h3 className="text-[12px] font-semibold text-ink">Statistical method</h3>
            <ul className="mt-2.5 space-y-1.5 text-[11.5px] leading-relaxed text-ink-muted">
              <li>Stationary transforms: log-differences (log x_t - log x_t-1)</li>
              <li>Primary frequency: weekly (ISO weeks)</li>
              <li>Minimum n = 52 weekly observations</li>
              <li>Missing weeks dropped, never interpolated</li>
            </ul>
          </div>
          <div className="card p-4">
            <h3 className="text-[12px] font-semibold text-ink">Inference</h3>
            <ul className="mt-2.5 space-y-1.5 text-[11.5px] leading-relaxed text-ink-muted">
              <li>Stationary block bootstrap CIs (1000 resamples, block length 10)</li>
              <li>Benjamini–Hochberg FDR across all lags tested</li>
              <li>Partial correlation controlling for BTC/ETH returns</li>
              <li>Effect size + CI + n reported (never p-value alone)</li>
            </ul>
          </div>
          <div className="card p-4">
            <h3 className="text-[12px] font-semibold text-ink">Structural breaks</h3>
            <ul className="mt-2.5 space-y-1.5 text-[11.5px] leading-relaxed text-ink-muted">
              <li>Pre/post 2026-02-23 (buyback start)</li>
              <li>Exclude 14d post 2026-10-01 (exploit)</li>
              <li>Results reported for each subsample</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden" aria-labelledby="evidence-heading">
        <div className="border-b border-line px-4 py-3.5 sm:px-5">
          <h2 id="evidence-heading" className="section-title">
            Current evidence summary
          </h2>
          <p className="mt-0.5 text-[10.5px] text-ink-faint">Observed coverage versus what is still required</p>
        </div>
        <div className="grid md:grid-cols-2">
          <div className="border-b border-line p-4 sm:p-5 md:border-b-0 md:border-r">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-sage-deep">
              <IconCheck className="h-4 w-4" />
              Available now
            </p>
            <ul className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-ink-muted">
              <li>DefiLlama: Intents TVL, fees, revenue, holders revenue (552 days)</li>
              <li>DefiLlama: NEAR Chain TVL (1,913 days)</li>
              <li>Intents Explorer: 4 days of transaction data (volume, swaps, unique sender addresses, chains, tokens, concentration)</li>
              <li>NearBlocks: Revenue wallet NEAR inflows (90d), buyback outflows (0 observed)</li>
              <li>Pikespeak: Top 100 hot wallets (38.9M NEAR)</li>
            </ul>
          </div>
          <div className="p-4 sm:p-5">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-ochre-deep">
              <IconAlert className="h-4 w-4" />
              Requires additional data
            </p>
            <ul className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-ink-muted">
              <li>Network-wide daily active accounts / transactions</li>
              <li>Intents-attributable NEAR activity</li>
              <li>Net supply change / total supply / issuance</li>
              <li>Historical buyback/removal trace with counterparties</li>
              <li>90-day backfill for Intents metrics (currently 4 days)</li>
            </ul>
          </div>
        </div>
      </section>

      <p className="border-t border-line pt-4 text-[10.5px] leading-relaxed text-ink-faint">
        Verdicts are rule-based and are not issued until every test has the required sample size. Correlation is not
        described as causation.
      </p>
    </div>
  );
}
