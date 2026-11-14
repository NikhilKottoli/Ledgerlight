"use client";

import { useState } from "react";
import Link from "next/link";
import KpiCard from "@/components/ui/KpiCard";
import TimeSeriesChart from "@/components/ui/TimeSeriesChart";
import BreakdownChart from "@/components/ui/BreakdownChart";
import StatusDonut from "@/components/ui/StatusDonut";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeading from "@/components/ui/SectionHeading";
import { ChartSkeleton, KpiSkeleton } from "@/components/ui/Loading";
import { IconArrowUpRight, IconInfo } from "@/components/ui/icons";
import { useMetrics } from "@/hooks/useMetric";
import { formatLongDate } from "@/lib/chartTheme";

const DEFI_LLAMA_METRICS = [
  { id: "defillama.fees.near_intents.daily", label: "Gross Fees (DefiLlama)", unit: "USD" },
  { id: "defillama.revenue.near_intents.daily", label: "Protocol Revenue (DefiLlama)", unit: "USD" },
  { id: "defillama.holders_revenue.near_intents.daily", label: "Holders Revenue / Buybacks", unit: "USD" },
] as const;

const INTENTS_LIVE_METRICS = [
  { id: "intents.volume_usd.daily", label: "Volume (USD)", unit: "USD" },
  { id: "intents.swaps.daily", label: "Swaps", unit: "count" },
  { id: "intents.unique_sender_addresses.daily", label: "Unique Sender Addresses", unit: "count" },
  { id: "intents.avg_swap_usd.daily", label: "Avg Swap Size (USD)", unit: "USD" },
  { id: "intents.concentration.daily", label: "Concentration (Top-10 Share)", unit: "ratio" },
] as const;

const INTENTS_DISTRIBUTION_METRICS = [
  { id: "intents.status_mix.daily", label: "Status Mix", unit: "ratio" },
  { id: "intents.chain_distribution.daily", label: "Chain Distribution", unit: "USD" },
  { id: "intents.token_distribution.daily", label: "Token Distribution", unit: "USD" },
] as const;

function lastDate(artifacts: Array<{ series: Array<{ t: string; v: unknown }> } | undefined>) {
  const dates = artifacts
    .flatMap((artifact) => artifact?.series.filter((point) => point.v !== null).map((point) => point.t) || [])
    .sort();
  return dates[dates.length - 1] || "";
}

function shortDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function shortenToken(part: string) {
  const dash = part.indexOf("-");
  if (dash < 0) return part;
  const token = part.slice(0, dash);
  const address = part.slice(dash + 1);
  if (address.length <= 12) return part;
  return `${token}-${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatPair(key: string) {
  return key
    .split("->")
    .map((part) => {
      const cleaned = part.replace(/\.OMFT\.NEAR/g, "");
      if (/^nep141$/i.test(cleaned)) return "NEP-141";
      return shortenToken(cleaned);
    })
    .join(" → ");
}

export default function IntentsPage() {
  const [selectedDate, setSelectedDate] = useState("");

  const { artifacts: defillamaArtifacts, isLoading: defillamaLoading } = useMetrics(
    DEFI_LLAMA_METRICS.map((metric) => metric.id)
  );
  const { artifacts: intentsArtifacts, isLoading: intentsLoading } = useMetrics(
    INTENTS_LIVE_METRICS.map((metric) => metric.id)
  );
  const { artifacts: distributionArtifacts, isLoading: distributionLoading } = useMetrics(
    INTENTS_DISTRIBUTION_METRICS.map((metric) => metric.id)
  );

  const isLoading = defillamaLoading || intentsLoading || distributionLoading;

  const validDefillama = DEFI_LLAMA_METRICS.map((metric, index) => ({
    ...metric,
    artifact: defillamaArtifacts[index],
  })).filter((metric) => metric.artifact);
  const validIntents = INTENTS_LIVE_METRICS.map((metric, index) => ({
    ...metric,
    artifact: intentsArtifacts[index],
  })).filter((metric) => metric.artifact);
  const validDistribution = INTENTS_DISTRIBUTION_METRICS.map((metric, index) => ({
    ...metric,
    artifact: distributionArtifacts[index],
  })).filter((metric) => metric.artifact);

  const dataAsOf = lastDate([...defillamaArtifacts, ...intentsArtifacts, ...distributionArtifacts]);

  const dateSets = validDistribution.map(
    (metric) =>
      new Set(
        (metric.artifact?.series || [])
          .filter((point) => point.v !== null)
          .map((point) => point.t)
      )
  );
  const commonDates =
    dateSets.length > 0
      ? [...dateSets[0]].filter((date) => dateSets.every((set) => set.has(date))).sort()
      : [];
  const effectiveDate =
    (selectedDate && commonDates.includes(selectedDate) ? selectedDate : "") ||
    commonDates[commonDates.length - 1] ||
    "";

  const statusArtifact = validDistribution.find((metric) => metric.id === "intents.status_mix.daily")?.artifact;
  const chainArtifact = validDistribution.find((metric) => metric.id === "intents.chain_distribution.daily")?.artifact;
  const tokenArtifact = validDistribution.find((metric) => metric.id === "intents.token_distribution.daily")?.artifact;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Analysis · Intents"
        title="Intents"
        description="NEAR Intents protocol activity: volume, swaps, unique sender addresses, chains and tokens. DefiLlama aggregates and Intents Explorer observations are labelled separately."
        meta={
          <>
            {dataAsOf && (
              <span>
                Latest observation <span className="font-medium text-ink-muted">{formatLongDate(dataAsOf)}</span>
              </span>
            )}
            <span className="font-mono text-ink-faint">Explorer window: {geometryText(validIntents)}</span>
          </>
        }
        actions={
          <Link href="/methodology" className="btn-secondary">
            Intents methodology
            <IconArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {isLoading ? (
        <>
          <KpiSkeleton count={3} />
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartSkeleton height={220} />
            <ChartSkeleton height={220} />
            <ChartSkeleton height={220} />
          </div>
        </>
      ) : (
        <>
          <section aria-labelledby="defillama-heading">
            <SectionHeading
              title="DefiLlama aggregates"
              description="Protocol-level fee and revenue series. These are the longest-running Intents observations."
              className="mb-3"
            />
            <h2 id="defillama-heading" className="sr-only">
              DefiLlama aggregates
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {validDefillama.map(({ artifact, label, unit }) =>
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
            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              {validDefillama.map(({ artifact, label }) =>
                artifact ? (
                  <TimeSeriesChart
                    key={artifact.meta.metric_id}
                    artifact={artifact}
                    title={label}
                    height={240}
                  />
                ) : null
              )}
            </div>
          </section>

          <section aria-labelledby="explorer-heading">
            <SectionHeading
              title="Intents Explorer metrics"
              description="Transaction-level observations from the Intents Explorer. The window is short, so changes are shown and never extrapolated."
              className="mb-3"
              actions={
                <span className="badge border-line bg-surface-subtle font-mono text-ink-muted">
                  n = {Math.max(...validIntents.map((metric) => metric.artifact?.series.filter((point) => point.v !== null).length || 0), 0)} days
                </span>
              }
            />
            <h2 id="explorer-heading" className="sr-only">
              Intents Explorer metrics
            </h2>
            {validIntents.length > 0 ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {validIntents.map(({ artifact, label, unit }) =>
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
                  {validIntents.map(({ artifact, label }) =>
                    artifact ? (
                      <TimeSeriesChart
                        key={artifact.meta.metric_id}
                        artifact={artifact}
                        title={label}
                        height={250}
                        showBrush={false}
                        className={artifact.meta.metric_id === "intents.volume_usd.daily" ? "xl:col-span-2" : ""}
                      />
                    ) : null
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p className="text-[12.5px] font-medium text-ink-muted">No Intents Explorer data available</p>
                <p className="mt-1 text-[11.5px] text-ink-faint">
                  The explorer returned no observations for this window. Nothing is estimated.
                </p>
              </div>
            )}
          </section>

          {validDistribution.length > 0 && (
            <section aria-labelledby="breakdown-heading">
              <SectionHeading
                title="Volume breakdown"
                description="Status mix is a transaction count. Chain and token distributions are USD-denominated. The three views never share a scale."
                className="mb-3"
                actions={
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="segmented" role="group" aria-label="Distribution observation date">
                      {commonDates.map((date) => (
                        <button
                          key={date}
                          type="button"
                          onClick={() => setSelectedDate(date)}
                          aria-pressed={effectiveDate === date}
                          className={`segmented-item ${effectiveDate === date ? "segmented-item-active" : ""}`}
                        >
                          {shortDate(date)}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-ink-faint">Observation date · all breakdowns</span>
                  </div>
                }
              />
              <h2 id="breakdown-heading" className="sr-only">
                Volume breakdown
              </h2>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                {statusArtifact && (
                  <div className="self-start">
                    <StatusDonut
                      artifact={statusArtifact}
                      date={effectiveDate}
                      title="Status mix"
                      subtitle={effectiveDate ? `${formatLongDate(effectiveDate)} · transaction count` : undefined}
                    />
                  </div>
                )}
                <div className="grid gap-4">
                  {chainArtifact && (
                    <BreakdownChart
                      artifact={chainArtifact}
                      date={effectiveDate}
                      unit="USD"
                      title="Chain distribution"
                      subtitle={`USD volume by chain pair${effectiveDate ? ` · ${effectiveDate}` : ""}`}
                      labelFormatter={formatPair}
                      height={230}
                    />
                  )}
                  {tokenArtifact && (
                    <BreakdownChart
                      artifact={tokenArtifact}
                      date={effectiveDate}
                      unit="USD"
                      title="Token distribution"
                      subtitle={`USD volume by token pair${effectiveDate ? ` · ${effectiveDate}` : ""}`}
                      labelFormatter={formatPair}
                      height={230}
                    />
                  )}
                </div>
              </div>
              <p className="mt-3 flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-faint">
                <IconInfo className="mt-0.5 h-3 w-3 shrink-0" />
                Breakdown categories are shown exactly as reported by the source. Percentages are computed within the
                selected observation only.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function geometryText(metrics: Array<{ artifact?: { series: Array<{ t: string; v: unknown }> } }>) {
  const dates = metrics
    .flatMap((metric) => metric.artifact?.series.filter((point) => point.v !== null).map((point) => point.t) || [])
    .sort();
  if (!dates.length) return "no observations";
  return `${shortDate(dates[0])} – ${shortDate(dates[dates.length - 1])}`;
}
