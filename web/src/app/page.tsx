"use client";

import Link from "next/link";
import KpiCard from "@/components/ui/KpiCard";
import TimeSeriesChart from "@/components/ui/TimeSeriesChart";
import MultiSeriesChart from "@/components/ui/MultiSeriesChart";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeading from "@/components/ui/SectionHeading";
import { ChartSkeleton, KpiSkeleton } from "@/components/ui/Loading";
import { IconArrowUpRight, IconDatabase, IconFlows, IconIntents, IconSpark } from "@/components/ui/icons";
import { useMetrics } from "@/hooks/useMetric";
import { chart, formatLongDate, formatPercent, formatUsd } from "@/lib/chartTheme";

const KPI_METRICS = [
  { id: "defillama.tvl.near_intents.daily", label: "DefiLlama TVL (NEAR Intents)", unit: "USD" },
  { id: "defillama.fees.near_intents.daily", label: "Gross Fees (Daily)", unit: "USD" },
  { id: "defillama.revenue.near_intents.daily", label: "Protocol Revenue (Daily)", unit: "USD" },
  { id: "defillama.holders_revenue.near_intents.daily", label: "Holders Revenue / Buybacks", unit: "USD" },
] as const;

const CAPABILITIES = [
  {
    title: "Onchain & Market Data",
    icon: IconDatabase,
    items: [
      "Network metrics & activity",
      "Revenue wallet reconstruction",
      "Buyback vs burn trace",
      "Three-way reconciliation",
    ],
  },
  {
    title: "Intents Ingestion",
    icon: IconIntents,
    items: [
      "Explorer API (1 req/5s)",
      "Per-chain/token/sender analysis",
      "Fee unit verification",
      "DefiLlama cross-check",
    ],
  },
  {
    title: "Flow Ledger & Sankey",
    icon: IconFlows,
    items: [
      "Gross fees → protocol revenue → buyback",
      "Explicit unreconciled amounts",
      "Typed units (USD/NEAR, gross/net)",
      "Buyback vs burn traced",
    ],
  },
] as const;

function latestValue(series: Array<{ t: string; v: number | string | null }>) {
  return [...series].reverse().find((point) => point.v !== null && !Number.isNaN(Number(point.v)));
}

export default function HomePage() {
  const { artifacts, isLoading } = useMetrics([
    ...KPI_METRICS.map((metric) => metric.id),
    "nearblocks.buyback_outflows.daily",
    "intents.volume_usd.daily",
  ]);

  const [tvl, fees, revenue, holders, buybackOutflows, intentsVolume] = artifacts;
  const dataAsOf =
    artifacts
      .flatMap((artifact) => artifact?.series.filter((point) => point.v !== null).map((point) => point.t) || [])
      .sort()
      .at(-1) || "";

  const latestFees = latestValue(fees?.series || []);
  const latestRevenue = latestValue(revenue?.series || []);
  const latestHolders = latestValue(holders?.series || []);
  const captureRate =
    latestFees && latestHolders && Number(latestFees.v) > 0
      ? Number(latestHolders.v) / Number(latestFees.v)
      : null;
  const revenueShare =
    latestFees && latestRevenue && Number(latestFees.v) > 0
      ? Number(latestRevenue.v) / Number(latestFees.v)
      : null;

  const feeStart = fees?.series.find((point) => point.v !== null)?.t;
  const feeObservations = fees?.series.filter((point) => point.v !== null).length || 0;
  const buybackObservations = buybackOutflows?.series.filter((point) => point.v !== null).length || 0;
  const intentsObservations = intentsVolume?.series.filter((point) => point.v !== null).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-7">
        <PageHeader
          eyebrow="Workspace · Overview"
          title="NEAR Value Intelligence"
          description="Follow the money. Verify the value. Does NEAR's growing Intents activity turn into sustainable economic value for NEAR tokenholders?"
          meta={<span className="text-[12px] text-ink-faint">Loading live artifacts…</span>}
        />
        <KpiSkeleton />
        <ChartSkeleton height={300} />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartSkeleton height={120} />
          <ChartSkeleton height={120} />
          <ChartSkeleton height={120} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Workspace · Overview"
        title="NEAR Value Intelligence"
        description="Does NEAR's growing Intents activity turn into sustainable economic value for NEAR tokenholders? Start with the aggregate fee flow, then trace it through the ledger."
        meta={
          <>
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sage" />
              </span>
              Live artifacts
            </span>
            {dataAsOf && (
              <span>
                Latest source observation <span className="font-medium text-ink-muted">{formatLongDate(dataAsOf)}</span>
              </span>
            )}
            <span className="font-mono text-ink-faint">DefiLlama · NearBlocks · Intents Explorer</span>
          </>
        }
        actions={
          <Link href="/methodology" className="btn-secondary">
            Metric registry
            <IconArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <section aria-label="Headline metrics">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_METRICS.map((metric, index) => {
            const artifact = artifacts[index];
            return (
              artifact && (
                <KpiCard
                  key={artifact.meta.metric_id}
                  artifact={artifact}
                  label={metric.label}
                  unit={metric.unit}
                  previousPeriodLabel="vs prior day"
                  preferLatest
                />
              )
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]" aria-label="Fee capture and evidence coverage">
        {fees && revenue && holders && (
          <MultiSeriesChart
            title="Fee capture over time"
            subtitle="Gross fees, protocol revenue and holders revenue, daily USD"
            series={[
              { metricId: "defillama.fees.near_intents.daily", label: "Gross fees", artifact: fees, color: chart.accent },
              { metricId: "defillama.revenue.near_intents.daily", label: "Protocol revenue", artifact: revenue, color: chart.slate },
              { metricId: "defillama.holders_revenue.near_intents.daily", label: "Holders revenue", artifact: holders, color: chart.sage },
            ]}
            yAxisMetricId="defillama.fees.near_intents.daily"
            height={318}
            initialRange={180}
            footnote="Derived ratios below use single-day measured values"
          />
        )}

        <aside className="card flex flex-col overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
            <div>
              <p className="micro-label">Evidence snapshot</p>
              <h2 className="mt-1 section-title">What the aggregate data supports</h2>
            </div>
            <span className="rounded-lg border border-line bg-surface-subtle p-1.5 text-accent">
              <IconSpark className="h-4 w-4" />
            </span>
          </div>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11.5px] text-ink-muted">Latest-day capture rate</span>
                <span className="tnum text-[15px] font-semibold text-ink">
                  {captureRate !== null ? formatPercent(captureRate) : "—"}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, Math.max(0, (captureRate || 0) * 100))}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-faint">
                Holders revenue ÷ gross fees. Protocol revenue is{" "}
                {revenueShare !== null ? formatPercent(revenueShare) : "—"} of gross fees on the same day.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">Gross fees</dt>
                <dd className="tnum mt-0.5 text-[13px] font-semibold text-ink">
                  {latestFees ? formatUsd(Number(latestFees.v)) : "—"}
                </dd>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">Holders revenue</dt>
                <dd className="tnum mt-0.5 text-[13px] font-semibold text-ink">
                  {latestHolders ? formatUsd(Number(latestHolders.v)) : "—"}
                </dd>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">Fee coverage</dt>
                <dd className="tnum mt-0.5 text-[13px] font-semibold text-ink">
                  {feeObservations ? `${feeObservations} days` : "—"}
                </dd>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">Buyback trace</dt>
                <dd className="tnum mt-0.5 text-[13px] font-semibold text-ink">
                  {buybackObservations ? `${buybackObservations} obs` : "0 obs"}
                </dd>
              </div>
            </dl>

            <div className="rounded-xl border border-ochre/25 bg-ochre-soft/55 px-3 py-2.5">
              <p className="text-[11px] font-medium text-ochre-deep">Explicit data gaps</p>
              <ul className="mt-1 space-y-1 text-[10.5px] leading-relaxed text-ochre-deep/90">
                <li>
                  · Buyback outflows have {buybackObservations} observations — no buyback flow is inferred.
                </li>
                <li>
                  · Intents Explorer covers {intentsObservations} of the {feeObservations || 0} days in the fee series; short-window metrics are not extrapolated.
                </li>
              </ul>
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
              <Link href="/flows" className="link-accent">
                Open the flow ledger
                <IconArrowUpRight className="h-3 w-3" />
              </Link>
              <span className="text-ink-faint">·</span>
              <Link href="/thesis" className="link-accent">
                Read the hypotheses
                <IconArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </aside>
      </section>

      {tvl && (
        <section aria-label="Intents TVL history">
          <SectionHeading
            title="Intents TVL history"
            description="Daily total value locked in NEAR Intents, sourced from DefiLlama. Use the brush to inspect a window."
            className="mb-3"
          />
          <TimeSeriesChart
            artifact={tvl}
            title="DefiLlama TVL · NEAR Intents"
            subtitle={`${tvl.series.length} daily observations`}
            height={360}
            showBrush
          />
        </section>
      )}

      <section aria-label="Platform capabilities">
        <SectionHeading
          title="How this platform works"
          description="Three evidence tracks feed the same question. Each keeps source, definition and gap visible."
          className="mb-3"
        />
        <div className="grid gap-4 md:grid-cols-3">
          {CAPABILITIES.map((capability, index) => {
            const Icon = capability.icon;
            return (
              <article key={capability.title} className="card group p-5 transition-shadow hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl border border-line bg-surface-subtle p-2.5 text-accent transition-colors group-hover:border-accent/25 group-hover:bg-accent-soft">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="tnum text-[11px] font-medium text-ink-faint">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-[14px] font-semibold tracking-[-0.01em] text-ink">{capability.title}</h3>
                <ul className="mt-3 space-y-1.5">
                  {capability.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-muted">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-line-strong" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <p className="border-t border-line pt-4 text-[10.5px] leading-relaxed text-ink-faint">
        Coverage start: {feeStart ? formatLongDate(feeStart) : "—"} for DefiLlama fee metrics. Measured values are read
        directly from sources; capture-rate figures are derived from those values. Modeled outputs live only in the
        Value Capture Model.
      </p>
    </div>
  );
}
