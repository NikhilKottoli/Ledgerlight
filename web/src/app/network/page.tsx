"use client";

import KpiCard from "@/components/ui/KpiCard";
import TimeSeriesChart from "@/components/ui/TimeSeriesChart";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeading from "@/components/ui/SectionHeading";
import { ChartSkeleton, KpiSkeleton } from "@/components/ui/Loading";
import { IconArrowUpRight, IconDatabase, IconNetwork } from "@/components/ui/icons";
import { useMetrics } from "@/hooks/useMetric";
import { formatLongDate } from "@/lib/chartTheme";
import Link from "next/link";

const INTENTS_METRICS = [
  { id: "defillama.tvl.near_intents.daily", label: "TVL (NEAR Intents)", unit: "USD" },
  { id: "defillama.fees.near_intents.daily", label: "Fees (Gross)", unit: "USD" },
  { id: "defillama.revenue.near_intents.daily", label: "Revenue (Protocol)", unit: "USD" },
  { id: "defillama.holders_revenue.near_intents.daily", label: "Holders Revenue (Buybacks)", unit: "USD" },
] as const;

const ONCHAIN_METRICS = [
  { id: "defillama.chain_tvl_near.daily", label: "NEAR Chain TVL (DefiLlama)", unit: "USD" },
  { id: "nearblocks.revenue_near.daily", label: "Revenue Wallet Inflows", unit: "NEAR" },
  { id: "nearblocks.buyback_outflows.daily", label: "Buyback Outflows", unit: "NEAR" },
  { id: "nearblocks.net_revenue_near.daily", label: "Net Revenue (Onchain)", unit: "NEAR" },
  { id: "pikespeak.hot_wallets_total_balance.daily", label: "Top 100 Hot Wallets Balance", unit: "NEAR" },
  { id: "pikespeak.hot_wallets_count.daily", label: "Hot Wallets Count", unit: "count" },
] as const;

const ALL_METRICS = [...INTENTS_METRICS, ...ONCHAIN_METRICS];

function latestDate(artifacts: Array<{ series: Array<{ t: string; v: unknown }> } | undefined>) {
  const dates = artifacts
    .flatMap((artifact) => artifact?.series.filter((point) => point.v !== null).map((point) => point.t) || [])
    .sort();
  return dates[dates.length - 1] || "";
}

export default function NetworkPage() {
  const { artifacts, isLoading } = useMetrics(ALL_METRICS.map((metric) => metric.id));

  const intents = INTENTS_METRICS.map((metric, index) => ({ ...metric, artifact: artifacts[index] }));
  const onchain = ONCHAIN_METRICS.map((metric, index) => ({
    ...metric,
    artifact: artifacts[index + INTENTS_METRICS.length],
  }));

  const dataAsOf = latestDate(artifacts);
  const observed = ALL_METRICS.filter((_, index) => artifacts[index]?.series.some((point) => point.v !== null)).length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Analysis · Network"
        title="Network"
        description="NEAR network activity and Intents protocol metrics, kept in their native units. Onchain NEAR amounts and USD market data are never mixed."
        meta={
          <>
            {dataAsOf && (
              <span>
                Latest observation <span className="font-medium text-ink-muted">{formatLongDate(dataAsOf)}</span>
              </span>
            )}
            <span>
              {observed} of {ALL_METRICS.length} metrics reporting
            </span>
            <span className="font-mono text-ink-faint">DefiLlama · NearBlocks · Pikespeak</span>
          </>
        }
        actions={
          <Link href="/methodology" className="btn-secondary">
            Sources & definitions
            <IconArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {isLoading ? (
        <>
          <KpiSkeleton count={4} />
          <div className="grid gap-4 md:grid-cols-2">
            <ChartSkeleton height={260} />
            <ChartSkeleton height={260} />
          </div>
        </>
      ) : (
        <>
          <section aria-labelledby="intents-network-heading">
            <SectionHeading
              title="Intents protocol"
              description="TVL, gross fees, protocol revenue and holders revenue for NEAR Intents. All USD."
              className="mb-3"
              actions={
                <span className="inline-flex items-center gap-1.5 badge border-line bg-surface-subtle text-ink-muted">
                  <IconNetwork className="h-3 w-3" />
                  DefiLlama
                </span>
              }
            />
            <h2 id="intents-network-heading" className="sr-only">
              Intents protocol metrics
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {intents.map(({ artifact, label, unit }) =>
                artifact ? (
                  <KpiCard
                    key={artifact.meta.metric_id}
                    artifact={artifact}
                    label={label}
                    unit={unit}
                    previousPeriodLabel="vs prior day"
                    preferLatest
                  />
                ) : null
              )}
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {intents.map(({ artifact, label }) =>
                artifact ? (
                  <TimeSeriesChart
                    key={artifact.meta.metric_id}
                    artifact={artifact}
                    title={label}
                    subtitle={`${artifact.series.filter((point) => point.v !== null).length} daily observations`}
                    height={280}
                  />
                ) : null
              )}
            </div>
          </section>

          <section aria-labelledby="onchain-network-heading">
            <SectionHeading
              title="NEAR chain & onchain wallets"
              description="Chain-level TVL plus reconstructed revenue, buyback and hot-wallet balances. NEAR-denominated series stay in NEAR."
              className="mb-3"
              actions={
                <span className="inline-flex items-center gap-1.5 badge border-line bg-surface-subtle text-ink-muted">
                  <IconDatabase className="h-3 w-3" />
                  NearBlocks · Pikespeak
                </span>
              }
            />
            <h2 id="onchain-network-heading" className="sr-only">
              Onchain network metrics
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {onchain.map(({ artifact, label, unit }) =>
                artifact ? (
                  <KpiCard
                    key={artifact.meta.metric_id}
                    artifact={artifact}
                    label={label}
                    unit={unit}
                    previousPeriodLabel="vs prior day"
                    preferLatest
                  />
                ) : null
              )}
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {onchain.map(({ artifact, label }) =>
                artifact ? (
                  <TimeSeriesChart
                    key={artifact.meta.metric_id}
                    artifact={artifact}
                    title={label}
                    subtitle={`${artifact.series.filter((point) => point.v !== null).length} daily observations`}
                    height={280}
                  />
                ) : null
              )}
            </div>
          </section>

          <section className="card card-pad" aria-label="Sources">
            <p className="text-[11px] leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">Sources.</span> DefiLlama provides TVL, fees, revenue and holders
              revenue for the NEAR Intents protocol, plus NEAR chain TVL. NearBlocks provides onchain NEAR revenue
              wallet inflows and buyback outflows. Pikespeak provides the top 100 hot wallets by USD value. An empty
              series stays visible so missing observations are not mistaken for zero.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
