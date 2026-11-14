"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeading from "@/components/ui/SectionHeading";
import KindBadge from "@/components/ui/KindBadge";
import { ChartSkeleton, TableSkeleton } from "@/components/ui/Loading";
import {
  IconChevronDown,
  IconCheck,
  IconDatabase,
  IconInfo,
  IconLayers,
  IconScale,
  IconShield,
} from "@/components/ui/icons";

const SOURCES = [
  {
    name: "DefiLlama",
    url: "https://api.llama.fi/protocol/near-intents",
    endpoints: [
      "GET /protocol/near-intents (TVL)",
      "GET /summary/fees/near-intents?dataType=dailyFees|dailyRevenue|dailyHoldersRevenue",
      "GET /coins/near (price history)",
      "GET /v2/historicalChainTvl/Near (chain TVL)",
    ],
  },
  {
    name: "NEAR Intents Explorer API",
    url: "https://explorer.near-intents.org/api/v0",
    endpoints: [
      "GET /transactions (1 req/5s, JWT required)",
      "Cursor pagination via lastDepositAddress + lastDepositMemo",
      "Filters: statuses, startTimestampUnix/endTimestampUnix (non-inclusive)",
    ],
  },
  {
    name: "NearBlocks",
    url: "https://nearblocks.io",
    endpoints: ["Wallet transaction history", "Token transfer tracking", "Revenue & buyback wallet monitoring"],
  },
  {
    name: "Pikespeak",
    url: "https://pikespeak.ai",
    endpoints: ["Hot wallet tracking", "Balance analytics"],
  },
] as const;

const UNIT_POLICY = [
  { category: "Volume", types: "SwapVolumeUSD", denomination: "USD" },
  { category: "Fees", types: "GrossFeesUSD, PartnerPayoutUSD, NetRevenueUSD", denomination: "USD" },
  { category: "Revenue", types: "NetRevenueNEAR, BuybackNEAR, BurnNEAR, HeldNEAR", denomination: "NEAR" },
  { category: "Supply", types: "SupplyNEAR, NetIssuanceNEAR", denomination: "NEAR" },
  { category: "Rates", types: "Bps (basis points)", denomination: "bps" },
] as const;

const MODES = [
  {
    mode: "Live",
    tone: "sage" as const,
    description: "Pipeline ran against real APIs with credentials just now. Shows retrieval timestamp.",
  },
  {
    mode: "Snapshot",
    tone: "ochre" as const,
    description: "Committed real aggregated data from an earlier live run. Persistent amber banner with snapshot date.",
  },
  {
    mode: "Synthetic",
    tone: "danger" as const,
    description: "Generated fixtures for unit tests only. Never shipped as the default.",
  },
] as const;

const toneClasses = {
  sage: { wrap: "border-sage/25 bg-sage-soft/50", label: "text-sage-deep", dot: "bg-sage" },
  ochre: { wrap: "border-ochre/30 bg-ochre-soft/55", label: "text-ochre-deep", dot: "bg-ochre" },
  danger: { wrap: "border-danger/25 bg-danger-soft/55", label: "text-danger-deep", dot: "bg-danger" },
};

function completenessClass(value: string) {
  if (value === "complete") return "border-sage/25 bg-sage-soft text-sage-deep";
  if (value === "partial") return "border-ochre/30 bg-ochre-soft text-ochre-deep";
  return "border-line bg-surface-muted text-ink-muted";
}

export default function MethodologyPage() {
  const [mounted, setMounted] = useState(false);
  const [registry, setRegistry] = useState<any>(null);
  const [isRegistryLoading, setIsRegistryLoading] = useState(true);

  useEffect(() => {
    fetch("/api/data/registry/")
      .then((res) => res.json())
      .then((data) => {
        setRegistry(data);
        setIsRegistryLoading(false);
      })
      .catch(() => setIsRegistryLoading(false));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const metrics = registry?.metrics || [];
  const counts = {
    measured: metrics.filter((m: any) => m.kind === "measured").length,
    derived: metrics.filter((m: any) => m.kind === "derived").length,
    modeled: metrics.filter((m: any) => m.kind === "modeled").length,
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Research · Methodology"
        title="Methodology"
        description="Inspect every metric: source, definition, calculation, coverage, freshness and limitations. Units are typed so incompatible amounts cannot be combined."
        meta={
          <>
            <span className="badge border-line bg-surface-subtle font-mono text-ink-muted">metrics/registry.yaml</span>
            <span>{metrics.length} registered metrics</span>
            <span>4 data sources</span>
          </>
        }
        actions={
          <span className="badge border-sage/25 bg-sage-soft text-sage-deep">
            <IconShield className="h-3 w-3" />
            Registry-backed charts only
          </span>
        }
      />

      {!mounted || isRegistryLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="card min-h-[92px] animate-pulse p-4">
                <div className="h-2.5 w-24 rounded bg-surface-muted" />
                <div className="mt-4 h-6 w-16 rounded bg-surface-muted" />
              </div>
            ))}
          </div>
          <TableSkeleton rows={8} />
          <ChartSkeleton height={140} />
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Registry summary">
            <div className="card flex items-center gap-3 p-4">
              <span className="rounded-lg border border-line bg-surface-subtle p-2 text-ink-muted">
                <IconDatabase className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-faint">Registered</p>
                <p className="tnum text-[20px] font-semibold tracking-[-0.03em] text-ink">
                  {metrics.length} <span className="text-[11px] font-normal text-ink-faint">metrics</span>
                </p>
              </div>
            </div>
            <div className="card flex items-center gap-3 p-4">
              <span className="rounded-lg border border-sage/25 bg-sage-soft p-2 text-sage-deep">
                <IconCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-faint">Measured</p>
                <p className="tnum text-[20px] font-semibold tracking-[-0.03em] text-ink">
                  {counts.measured} <span className="text-[11px] font-normal text-ink-faint">direct</span>
                </p>
              </div>
            </div>
            <div className="card flex items-center gap-3 p-4">
              <span className="rounded-lg border border-info/25 bg-info-soft p-2 text-info-deep">
                <IconLayers className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-faint">Derived</p>
                <p className="tnum text-[20px] font-semibold tracking-[-0.03em] text-ink">
                  {counts.derived} <span className="text-[11px] font-normal text-ink-faint">computed</span>
                </p>
              </div>
            </div>
            <div className="card flex items-center gap-3 p-4">
              <span className="rounded-lg border border-ochre/30 bg-ochre-soft p-2 text-ochre-deep">
                <IconScale className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-faint">Modeled</p>
                <p className="tnum text-[20px] font-semibold tracking-[-0.03em] text-ink">
                  {counts.modeled} <span className="text-[11px] font-normal text-ink-faint">assumption-led</span>
                </p>
              </div>
            </div>
          </section>

          <section className="card overflow-hidden" aria-labelledby="registry-heading">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
              <div>
                <h2 id="registry-heading" className="section-title">
                  Metrics registry
                </h2>
                <p className="mt-0.5 text-[10.5px] text-ink-faint">
                  {metrics.length} registered metrics. Each has a verified source, definition and calculation reference.
                </p>
              </div>
              <span className="badge border-line bg-surface-subtle font-mono text-ink-faint">
                {counts.measured} measured · {counts.derived} derived · {counts.modeled} modeled
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[1020px]">
                <thead>
                  <tr>
                    <th>Metric ID</th>
                    <th>Name</th>
                    <th>Kind</th>
                    <th>Unit</th>
                    <th>Source</th>
                    <th>Granularity</th>
                    <th>Completeness</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m: any) => (
                    <tr key={m.id}>
                      <td className="max-w-[230px] break-words font-mono text-[10.5px] text-ink-faint">{m.id}</td>
                      <td className="font-medium text-ink">{m.name}</td>
                      <td>
                        <KindBadge kind={m.kind} />
                      </td>
                      <td className="whitespace-nowrap font-mono text-[10.5px] text-ink-muted">{m.unit}</td>
                      <td className="text-ink-muted">{m.source?.name}</td>
                      <td className="whitespace-nowrap text-ink-muted">{m.granularity}</td>
                      <td>
                        <span className={`badge ${completenessClass(m.completeness)}`}>{m.completeness}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="source-heading">
            <SectionHeading
              title="Source definitions"
              description="Base URLs and endpoints used by the pipeline. Credentials never reach the browser."
              className="mb-3"
            />
            <h2 id="source-heading" className="sr-only">
              Source definitions
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {SOURCES.map((source) => (
                <details key={source.name} className="card group overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface-subtle sm:px-5">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="rounded-lg border border-line bg-surface-subtle p-1.5 text-ink-muted">
                        <IconDatabase className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-medium text-ink">{source.name}</span>
                        <span className="block truncate font-mono text-[10px] text-ink-faint">{source.url}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[10px] text-ink-faint">
                      {source.endpoints.length} endpoints
                      <IconChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="border-t border-line px-4 py-3 sm:px-5">
                    <p className="text-[11px] text-ink-muted">
                      <span className="font-medium text-ink-soft">Base URL:</span>{" "}
                      <span className="font-mono text-[10.5px]">{source.url}</span>
                    </p>
                    <ul className="mt-2 space-y-1 font-mono text-[10.5px] leading-relaxed text-ink-muted">
                      {source.endpoints.map((endpoint) => (
                        <li key={endpoint} className="flex gap-2">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-line-strong" />
                          {endpoint}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="card overflow-hidden" aria-labelledby="unit-policy-heading">
            <div className="border-b border-line px-4 py-3.5 sm:px-5">
              <h2 id="unit-policy-heading" className="section-title">
                Unit policy
              </h2>
              <p className="mt-0.5 text-[10.5px] text-ink-faint">Typed amounts prevent incompatible units from being combined.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[620px]">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Types</th>
                    <th>Denomination</th>
                  </tr>
                </thead>
                <tbody>
                  {UNIT_POLICY.map((row) => (
                    <tr key={row.category}>
                      <td className="font-medium text-ink">{row.category}</td>
                      <td className="font-mono text-[10.5px] text-ink-muted">{row.types}</td>
                      <td>
                        <span className="badge border-line bg-surface-subtle font-mono text-ink-muted">{row.denomination}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-4 py-2.5 text-[10.5px] leading-relaxed text-ink-faint sm:px-5">
              Types prevent mixing. GrossFeesUSD + NetRevenueNEAR → TypeError. USD→NEAR conversion requires an explicit
              PricePoint.
            </p>
          </section>

          <section aria-labelledby="stats-heading">
            <SectionHeading
              title="Statistical method"
              description="Transforms, inference and structural-break handling used by the thesis tests."
              className="mb-3"
            />
            <h2 id="stats-heading" className="sr-only">
              Statistical method
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "Transforms",
                  items: [
                    "Stationary transforms: log-differences (log x_t - log x_t-1)",
                    "Primary frequency: weekly (ISO weeks)",
                    "Minimum n = 52 weekly observations",
                    "Missing weeks dropped, never interpolated",
                  ],
                },
                {
                  title: "Inference",
                  items: [
                    "Stationary block bootstrap CIs (1000 resamples, block length 10)",
                    "Benjamini–Hochberg FDR across all lags tested",
                    "Partial correlation controlling for BTC/ETH returns",
                    "Effect size + CI + n reported (never p-value alone)",
                  ],
                },
                {
                  title: "Structural breaks",
                  items: [
                    "Pre/post 2026-02-23 (buyback programme start)",
                    "Exclude 14 days post 2026-10-01 (Omni exploit)",
                    "Results reported for each subsample",
                  ],
                },
                {
                  title: "Concentration",
                  items: [
                    "Gini coefficient, HHI, top-k share",
                    "Dimensions: addresses, contracts, chains, tokens",
                    "Quarterly trend (linear slope)",
                  ],
                },
              ].map((group) => (
                <div key={group.title} className="card p-4">
                  <h3 className="text-[12px] font-semibold text-ink">{group.title}</h3>
                  <ul className="mt-2.5 space-y-1.5 text-[11.5px] leading-relaxed text-ink-muted">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-line-strong" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="modes-heading">
            <SectionHeading
              title="Data modes"
              description="Every JSON artifact carries data_mode. The pipeline refuses to combine artifacts with different modes."
              className="mb-3"
            />
            <h2 id="modes-heading" className="sr-only">
              Data modes
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {MODES.map((mode) => {
                const tone = toneClasses[mode.tone];
                return (
                  <div key={mode.mode} className={`rounded-2xl border p-4 ${tone.wrap}`}>
                    <p className={`flex items-center gap-2 text-[12px] font-semibold ${tone.label}`}>
                      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                      {mode.mode}
                    </p>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">{mode.description}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-faint">
              <IconInfo className="mt-0.5 h-3 w-3 shrink-0" />
              Synthetic artifacts are never shipped as the default. Snapshot data remains real historical data, but it is
              not live.
            </p>
          </section>

          <p className="border-t border-line pt-4 text-[10.5px] leading-relaxed text-ink-faint">
            A chart without a registry entry is a bug. Empty or partial series stay visible and are never backfilled or
            interpolated.
          </p>
        </>
      )}
    </div>
  );
}
