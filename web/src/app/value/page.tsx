"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import KpiCard from "@/components/ui/KpiCard";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeading from "@/components/ui/SectionHeading";
import SimpleChart from "@/components/charts/SimpleChart";
import SimpleBarChart from "@/components/charts/SimpleBarChart";
import SimpleLineChart from "@/components/charts/SimpleLineChart";
import { IconAlert, IconArrowUpRight, IconScale } from "@/components/ui/icons";
import { formatLongDate } from "@/lib/chartTheme";

const METRICS = [
  { id: "defillama.fees.near_intents.daily", label: "Gross Fees (DefiLlama)", unit: "USD" },
  { id: "defillama.revenue.near_intents.daily", label: "Protocol Revenue (DefiLlama)", unit: "USD" },
  { id: "defillama.holders_revenue.near_intents.daily", label: "Holders Revenue / Buybacks", unit: "USD" },
] as const;

const VALUE_MEASURED_ANCHORS = [
  { label: "Annualized Volume (V₀)", value: "$3.8B", source: "Trailing 90d × 4" },
  { label: "Gross Take Rate (r)", value: "16 bps", source: "DefiLlama fees / volume" },
  { label: "Capture Rate (c)", value: "35%", source: "DefiLlama holders revenue / fees" },
  { label: "Buyback Allocation (b)", value: "40%", source: "Observed buyback wallet inflows / net revenue" },
  { label: "Burned Fraction (φ)", value: "0%", source: "Onchain buyback wallet trace" },
  { label: "NEAR Price (P₀)", value: "$3.50", source: "DefiLlama/CoinGecko" },
  { label: "Supply (S₀)", value: "1.31B NEAR", source: "Blocks total supply" },
  { label: "Issuance Rate (m)", value: "2.5%/yr", source: "NEAR protocol parameters" },
  { label: "Circulating Supply", value: "1.0B NEAR", source: "DefiLlama/staking" },
] as const;

interface InputRow {
  key: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  anchor?: number;
  measuredLabel?: string;
  format?: (v: number) => string;
}

const INITIAL_INPUTS: InputRow[] = [
  { key: "V0", label: "Starting Annual Volume (V₀)", value: 3_800_000_000, unit: "USD", min: 1_000_000_000, max: 50_000_000_000, step: 100_000_000, anchor: 3_800_000_000, measuredLabel: "Trailing 90d × 4", format: (v) => "$" + new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(v) },
  { key: "g", label: "Annual Volume Growth (g)", value: 0.15, unit: "", min: -0.5, max: 1.0, step: 0.01, anchor: 0.15, measuredLabel: "Trailing 90d", format: (v) => (v * 100).toFixed(1) + "%" },
  { key: "d", label: "Growth Decay (d)", value: 0.05, unit: "/yr", min: 0, max: 0.5, step: 0.01, anchor: 0.05, measuredLabel: "Assumption", format: (v) => (v * 100).toFixed(1) + "%/yr" },
  { key: "r", label: "Gross Take Rate (r)", value: 160, unit: "bps", min: 0, max: 500, step: 1, anchor: 160, measuredLabel: "DefiLlama trailing", format: (v) => v + " bps" },
  { key: "dr", label: "Take Rate Change (dr)", value: -5, unit: "bps/yr", min: -50, max: 50, step: 1, anchor: -5, measuredLabel: "Observed compression", format: (v) => (v >= 0 ? "+" : "") + v + " bps/yr" },
  { key: "c", label: "Capture Rate (c)", value: 0.35, unit: "", min: 0, max: 1, step: 0.01, anchor: 0.35, measuredLabel: "DefiLlama holders revenue / fees", format: (v) => (v * 100).toFixed(1) + "%" },
  { key: "b", label: "Buyback Allocation (b)", value: 0.4, unit: "", min: 0, max: 1, step: 0.05, anchor: 0.4, measuredLabel: "Buyback wallet / net revenue", format: (v) => (v * 100).toFixed(0) + "%" },
  { key: "phi", label: "Burn Fraction (φ)", value: 0.0, unit: "", min: 0, max: 1, step: 0.1, anchor: 0.0, measuredLabel: "Onchain trace (0%)", format: (v) => (v * 100).toFixed(0) + "%" },
  { key: "P0", label: "NEAR Price (P₀)", value: 3.5, unit: "USD", min: 0.1, max: 50, step: 0.1, anchor: 3.5, measuredLabel: "DefiLlama/CoinGecko", format: (v) => "$" + v.toFixed(2) },
  { key: "P_growth", label: "Price Growth", value: 0.0, unit: "", min: -0.5, max: 1.0, step: 0.05, anchor: 0.0, measuredLabel: "Flat assumption", format: (v) => (v * 100).toFixed(1) + "%" },
  { key: "S0", label: "Total Supply (S₀)", value: 1_310_000_000, unit: "NEAR", min: 1_000_000_000, max: 2_000_000_000, step: 10_000_000, anchor: 1_310_000_000, measuredLabel: "Blocks total supply", format: (v) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(v) + " NEAR" },
  { key: "m", label: "Gross Issuance (m)", value: 0.025, unit: "", min: 0, max: 0.1, step: 0.001, anchor: 0.025, measuredLabel: "NEAR protocol (2.5%)", format: (v) => (v * 100).toFixed(2) + "%" },
  { key: "beta", label: "Gas Burn Offset (β)", value: 0.0, unit: "", min: 0, max: 0.5, step: 0.01, anchor: 0.0, measuredLabel: "Negligible", format: (v) => (v * 100).toFixed(0) + "%" },
  { key: "circulating_supply", label: "Circulating Supply", value: 1_000_000_000, unit: "NEAR", min: 500_000_000, max: 2_000_000_000, step: 10_000_000, anchor: 1_000_000_000, measuredLabel: "DefiLlama/staking", format: (v) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(v) + " NEAR" },
  { key: "market_cap", label: "Market Cap", value: 3_500_000_000, unit: "USD", min: 1_000_000_000, max: 50_000_000_000, step: 100_000_000, anchor: 3_500_000_000, measuredLabel: "Price × circulating", format: (v) => "$" + new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(v) },
] as const;

const SCENARIOS = {
  bear: { g: 0.0, d: 0.1, r: 120, dr: -10, c: 0.25, b: 0.3, phi: 0.0, P_growth: -0.1, label: "Bear" },
  base: { g: 0.15, d: 0.05, r: 160, dr: -5, c: 0.35, b: 0.4, phi: 0.0, P_growth: 0.0, label: "Base" },
  bull: { g: 0.3, d: 0.02, r: 180, dr: 0, c: 0.45, b: 0.5, phi: 0.0, P_growth: 0.1, label: "Bull" },
} as const;

function runModel(inputs: Record<string, number>) {
  const { V0, g, d, r, dr, c, b, phi, P0, P_growth, S0, m, beta } = inputs;
  const net_issuance = S0 * m * (1 - beta);
  const years = [];
  let prev = null;

  for (let y = 0; y < 5; y++) {
    let V_t, r_t;
    if (y === 0) { V_t = V0; r_t = r; }
    else {
      const g_t = Math.max(0, g - d * y);
      V_t = prev!.V_t * (1 + g_t);
      r_t = Math.max(0, r + dr * y);
    }
    const GrossFees_t = V_t * r_t / 10000;
    const NetRev_t = GrossFees_t * c;
    const P_t = P0 * Math.pow(1 + P_growth, y);
    const NetRev_NEAR_t = NetRev_t / P_t;
    const Buyback_NEAR_t = NetRev_NEAR_t * b;
    const Burned_NEAR_t = Buyback_NEAR_t * phi;
    const NetIssuance_t = S0 * m * (1 - beta);
    const DeltaSupply_t = NetIssuance_t - Burned_NEAR_t;
    const supply_t = 1_000_000_000 + DeltaSupply_t * (y + 1);
    const market_cap_t = P_t * supply_t;
    const RevYield_t = market_cap_t > 0 ? NetRev_t / market_cap_t : 0;
    const BuybackToIssuance_t = NetIssuance_t > 0 ? Buyback_NEAR_t / NetIssuance_t : 0;
    const BurnToIssuance_t = NetIssuance_t > 0 ? Burned_NEAR_t / NetIssuance_t : 0;
    const RevToEmissions_t = NetIssuance_t > 0 ? NetRev_NEAR_t / NetIssuance_t : 0;
    const yearResult: { year: number; V_t: number; r_t: number; GrossFees_t: number; NetRev_t: number; NetRev_NEAR_t: number; Buyback_NEAR_t: number; Burned_NEAR_t: number; NetIssuance_t: number; DeltaSupply_t: number; RevYield_t: number; BuybackToIssuance_t: number; BurnToIssuance_t: number; RevToEmissions_t: number } = { year: y, V_t, r_t, GrossFees_t, NetRev_t, NetRev_NEAR_t, Buyback_NEAR_t, Burned_NEAR_t, NetIssuance_t, DeltaSupply_t, RevYield_t, BuybackToIssuance_t, BurnToIssuance_t, RevToEmissions_t };
    years.push(yearResult);
    prev = yearResult;
  }

  let breakeven_volume_buyback = null;
  let breakeven_multiple_buyback = null;
  const denom_buyback = r * c * b;
  if (denom_buyback > 0) {
    const V_star = net_issuance * P0 * 10000 / denom_buyback;
    breakeven_volume_buyback = V_star;
    breakeven_multiple_buyback = V_star / V0;
  }

  let breakeven_volume_burn = null;
  let breakeven_multiple_burn = null;
  if (phi > 0) {
    const denom_burn = r * c * b * phi;
    if (denom_burn > 0) {
      const V_star = net_issuance * P0 * 10000 / denom_burn;
      breakeven_volume_burn = V_star;
      breakeven_multiple_burn = V_star / V0;
    }
  }

  return { breakeven_volume_buyback, breakeven_multiple_buyback, breakeven_volume_burn, breakeven_multiple_burn, years };
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, notation: "compact" }).format(n);
}

function formatPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function formatCurrency(n: number): string {
  return "$" + new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, notation: "compact" }).format(n);
}

export default function ValuePage() {
  const [mounted, setMounted] = useState(false);
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [activeScenario, setActiveScenario] = useState<keyof typeof SCENARIOS>("base");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const metricIds = METRICS.map((m) => m.id);
    Promise.all(metricIds.map((id) => fetch(`/api/data/${id}`).then((r) => r.json())))
      .then((data) => {
        setMetrics(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setInputs(INITIAL_INPUTS.reduce((acc, i) => ({ ...acc, [i.key]: i.value }), {}));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-7">
        <PageHeader
          eyebrow="Analysis · Value"
          title="Value Capture Model"
          description="Interactive breakeven analysis. Modeled outputs depend on explicit human assumptions."
        />
        <div className="card-pad animate-pulse">
          <div className="h-3 w-48 rounded bg-surface-muted" />
          <div className="mt-4 h-40 rounded-xl bg-surface-muted/70" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-7">
        <PageHeader
          eyebrow="Analysis · Value"
          title="Value Capture Model"
          description="Interactive breakeven analysis. Modeled outputs depend on explicit human assumptions."
        />
        <div className="card-pad animate-pulse">
          <div className="h-3 w-48 rounded bg-surface-muted" />
          <div className="mt-4 h-40 rounded-xl bg-surface-muted/70" />
        </div>
      </div>
    );
  }

  const validMetrics = METRICS.map((m, i) => ({ ...m, artifact: metrics[i] })).filter((m) => m.artifact);

  const latestDates = validMetrics
    .map((a) => a.artifact?.series?.[a.artifact.series.length - 1]?.t)
    .filter(Boolean);
  const dataAsOf = latestDates.length > 0 ? latestDates[0] : "N/A";

  const results = runModel(inputs);

  const handleScenario = (scenario: keyof typeof SCENARIOS) => {
    const s = SCENARIOS[scenario];
    const { label, ...values } = s;
    setInputs((prev) => ({ ...prev, ...values }));
    setActiveScenario(scenario);
  };

  const chartData = results.years.map((y) => ({
    year: `Year ${y.year}`,
    volume: y.V_t,
    grossFees: y.GrossFees_t,
    netRev: y.NetRev_t,
    buybackNEAR: y.Buyback_NEAR_t,
    issuance: y.NetIssuance_t,
    buybackRatio: y.BuybackToIssuance_t * 100,
    revYield: y.RevYield_t * 100,
    deltaSupply: y.DeltaSupply_t,
  }));

  const breakevenData = results.breakeven_volume_buyback
    ? [
        { label: "Current Volume", value: inputs.V0, type: "current" },
        { label: "Breakeven Volume", value: results.breakeven_volume_buyback, type: "breakeven" },
      ]
    : [];

  const scenarioComparison = (["bear", "base", "bull"] as const).map((s) => {
    const scen = SCENARIOS[s];
    const { label, ...scenValues } = scen;
    const scenInputs = { ...inputs, ...scenValues };
    const scenResults = runModel(scenInputs);
    return {
      scenario: s,
      breakeven: scenResults.breakeven_volume_buyback,
      multiple: scenResults.breakeven_multiple_buyback,
      year0BuybackRatio: scenResults.years[0]?.BuybackToIssuance_t * 100 || 0,
      year0RevYield: scenResults.years[0]?.RevYield_t * 100 || 0,
    };
  });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Analysis · Value"
        title="Value Capture Model"
        description="What Intents volume is needed for buybacks to offset emissions? Modeled outputs are scenario-dependent and are not presented as forecasts."
        meta={
          <>
            <span>
              Measured anchors as of <span className="font-medium text-ink-muted">{dataAsOf}</span>
            </span>
            <span className="badge border-ochre/30 bg-ochre-soft font-mono uppercase tracking-[0.08em] text-ochre-deep">
              Modeled
            </span>
            <span>Assumptions are explicit and editable</span>
          </>
        }
        actions={
          <>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] text-ink-soft transition-colors hover:border-line-strong">
              <input
                type="checkbox"
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-line-strong accent-accent"
              />
              Show advanced inputs
            </label>
            <Link href="/methodology" className="btn-ghost">
              Model method
              <IconArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      <section aria-label="Measured inputs from DefiLlama">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {validMetrics.map(({ artifact, label, unit }) =>
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
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Model outputs">
        <article className="card relative overflow-hidden p-4">
          <span className="absolute inset-x-0 top-0 h-[2px] bg-accent" />
          <p className="text-[11.5px] font-medium text-ink-muted">Buyback breakeven</p>
          <p className="tnum mt-2 text-[24px] font-semibold tracking-[-0.035em] text-ink">
            {results.breakeven_volume_buyback ? formatCurrency(results.breakeven_volume_buyback) : "N/A (φ=0)"}
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-ink-faint">
            {results.breakeven_multiple_buyback
              ? `${results.breakeven_multiple_buyback.toFixed(1)}× current volume`
              : "Burn fraction is 0%"}
          </p>
        </article>
        <article className="card relative overflow-hidden p-4">
          <span className="absolute inset-x-0 top-0 h-[2px] bg-sage" />
          <p className="text-[11.5px] font-medium text-ink-muted">Year 0 buyback / issuance</p>
          <p className="tnum mt-2 text-[24px] font-semibold tracking-[-0.035em] text-ink">
            {formatPct(results.years[0]?.BuybackToIssuance_t || 0)}
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-ink-faint">Target: ≥100%</p>
        </article>
        <article className="card relative overflow-hidden p-4">
          <span className="absolute inset-x-0 top-0 h-[2px] bg-info" />
          <p className="text-[11.5px] font-medium text-ink-muted">Year 0 revenue yield</p>
          <p className="tnum mt-2 text-[24px] font-semibold tracking-[-0.035em] text-ink">
            {formatPct(results.years[0]?.RevYield_t || 0)}
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-ink-faint">Net revenue / market cap</p>
        </article>
        <article className="card relative overflow-hidden p-4">
          <span className="absolute inset-x-0 top-0 h-[2px] bg-ochre" />
          <p className="text-[11.5px] font-medium text-ink-muted">Year 0 revenue / emissions</p>
          <p className="tnum mt-2 text-[24px] font-semibold tracking-[-0.035em] text-ink">
            {formatPct(results.years[0]?.RevToEmissions_t || 0)}
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-ink-faint">NEAR revenue / NEAR issued</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.38fr)]" aria-label="Model inputs and projections">
        <div className="card self-start p-4 sm:p-5 xl:sticky xl:top-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="micro-label">Model assumptions</p>
              <h2 className="mt-1 section-title">Inputs</h2>
            </div>
            <div className="segmented" role="group" aria-label="Scenario preset">
              {(["bear", "base", "bull"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleScenario(s)}
                  aria-pressed={activeScenario === s}
                  className={`segmented-item uppercase ${activeScenario === s ? "segmented-item-active" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
            Scenario buttons replace every assumption below. Manual edits are allowed; the preset label stays selected.
          </p>

          <div className="mt-4 space-y-3">
            {INITIAL_INPUTS
              .filter((input) => showAdvanced || ["V0", "g", "r", "c", "b", "phi", "P0"].includes(input.key))
              .map((input) => (
                <div key={input.key} className="rounded-xl border border-line bg-surface-subtle/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <label htmlFor={`input-${input.key}`} className="text-[12px] font-medium leading-snug text-ink-soft">
                      {input.label}
                    </label>
                    <span className="tnum shrink-0 text-[11px] font-medium text-ink">
                      {input.format ? input.format(inputs[input.key] ?? input.value) : inputs[input.key] ?? input.value}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <input
                      id={`input-${input.key}`}
                      type="range"
                      min={input.min}
                      max={input.max}
                      step={input.step}
                      value={inputs[input.key] ?? input.value}
                      onChange={(e) => setInputs((prev) => ({ ...prev, [input.key]: Number(e.target.value) }))}
                      className="range flex-1"
                      aria-label={`${input.label} slider`}
                    />
                    <input
                      type="number"
                      min={input.min}
                      max={input.max}
                      step={input.step}
                      value={inputs[input.key] ?? input.value}
                      onChange={(e) => setInputs((prev) => ({ ...prev, [input.key]: Number(e.target.value) }))}
                      className="field tnum w-[104px] text-right"
                      aria-label={input.label}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-ink-faint">
                    <span>{input.measuredLabel ? `Measured / assumption: ${input.measuredLabel}` : ""}</span>
                    <span className="shrink-0 font-mono">{input.unit}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="section-title">Projections · 5 years</h2>
                <p className="mt-0.5 text-[11px] text-ink-faint">Volume area on the left axis; fees and net revenue on the right</p>
              </div>
              <span className="badge border-ochre/30 bg-ochre-soft font-mono text-ochre-deep">Modeled</span>
            </div>
            <div className="px-2 pb-2 pt-3 sm:px-3">
              <SimpleChart data={chartData} height={290} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="border-b border-line px-4 py-3">
                <h3 className="section-title">Buyback vs issuance</h3>
                <p className="mt-0.5 text-[10.5px] text-ink-faint">NEAR per year</p>
              </div>
              <div className="px-2 pb-2 pt-3">
                <SimpleBarChart data={chartData} height={236} />
              </div>
            </div>
            <div className="card overflow-hidden">
              <div className="border-b border-line px-4 py-3">
                <h3 className="section-title">Key ratios</h3>
                <p className="mt-0.5 text-[10.5px] text-ink-faint">Percent per year</p>
              </div>
              <div className="px-2 pb-2 pt-3">
                <SimpleLineChart data={chartData} height={236} />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="section-title">Volume required for buyback = issuance</h3>
                  <p className="mt-0.5 text-[10.5px] text-ink-faint">Buyback allocation path, excluding burn</p>
                </div>
                <span className="rounded-lg border border-line bg-surface-subtle p-1.5 text-ochre">
                  <IconScale className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {breakevenData.map((d, i) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <span
                      className={`tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                        d.type === "current" ? "bg-info-soft text-info-deep" : "bg-ochre-soft text-ochre-deep"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11.5px] text-ink-muted">{d.label}</span>
                        <span className="tnum text-[12px] font-medium text-ink">{formatCurrency(d.value)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            d.type === "current" ? "bg-info" : "bg-ochre"
                          }`}
                          style={{ width: `${Math.min(100, (d.value / results.breakeven_volume_buyback!) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t border-line pt-2.5 text-[11px] text-ink-muted">
                  {results.breakeven_multiple_buyback
                    ? `Need ${results.breakeven_multiple_buyback.toFixed(1)}× current volume`
                    : "Not reachable (φ=0)"}
                </div>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-line px-4 py-3.5">
                <h3 className="section-title">Scenario comparison</h3>
                <p className="mt-0.5 text-[10.5px] text-ink-faint">Each scenario re-runs the same model with preset assumptions</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table min-w-[520px]">
                  <thead>
                    <tr>
                      <th>Scenario</th>
                      <th className="text-right">Breakeven vol</th>
                      <th className="text-right">Multiple</th>
                      <th className="text-right">Y0 buyback/iss</th>
                      <th className="text-right">Y0 rev yield</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioComparison.map((s) => (
                      <tr key={s.scenario} className={activeScenario === s.scenario ? "bg-accent-soft/45" : ""}>
                        <td className="font-medium capitalize text-ink">{s.scenario}</td>
                        <td className="tnum text-right">{s.breakeven ? formatCurrency(s.breakeven) : "N/A"}</td>
                        <td className="tnum text-right">{s.multiple ? s.multiple.toFixed(1) + "×" : "N/A"}</td>
                        <td className="tnum text-right">{formatPct(s.year0BuybackRatio / 100)}</td>
                        <td className="tnum text-right">{formatPct(s.year0RevYield / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden" aria-labelledby="yearly-detail-heading">
        <div className="border-b border-line px-4 py-3.5 sm:px-5">
          <h2 id="yearly-detail-heading" className="section-title">
            Yearly detail
          </h2>
          <p className="mt-0.5 text-[10.5px] text-ink-faint">All modeled outputs for the current assumption set</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[820px]">
            <thead>
              <tr>
                <th>Year</th>
                <th className="text-right">Volume</th>
                <th className="text-right">Gross fees</th>
                <th className="text-right">Net revenue</th>
                <th className="text-right">Buyback (NEAR)</th>
                <th className="text-right">Δ supply</th>
                <th className="text-right">Buyback / iss</th>
                <th className="text-right">Rev yield</th>
              </tr>
            </thead>
            <tbody>
              {results.years.map((y) => (
                <tr key={y.year}>
                  <td className="font-mono font-medium text-ink">{y.year}</td>
                  <td className="tnum text-right">{formatCurrency(y.V_t)}</td>
                  <td className="tnum text-right">{formatCurrency(y.GrossFees_t)}</td>
                  <td className="tnum text-right">{formatCurrency(y.NetRev_t)}</td>
                  <td className="tnum text-right">{formatNumber(y.Buyback_NEAR_t)} NEAR</td>
                  <td className="tnum text-right">{formatNumber(y.DeltaSupply_t)} NEAR</td>
                  <td className="tnum text-right">{formatPct(y.BuybackToIssuance_t)}</td>
                  <td className="tnum text-right">{formatPct(y.RevYield_t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="anchors-heading">
        <SectionHeading
          title="Measured anchors"
          description="Reference values behind the starting assumptions. These are observations, not model outputs."
          className="mb-3"
        />
        <h2 id="anchors-heading" className="sr-only">
          Measured anchors
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {VALUE_MEASURED_ANCHORS.map((anchor) => (
            <div key={anchor.label} className="card flex items-start justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium leading-snug text-ink-soft">{anchor.label}</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-ink-faint">{anchor.source}</p>
              </div>
              <span className="tnum shrink-0 text-[15px] font-semibold text-sage-deep">{anchor.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card card-pad" aria-labelledby="formula-heading">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg border border-line bg-surface-subtle p-1.5 text-ink-muted">
            <IconAlert className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 id="formula-heading" className="section-title">
              Formula reference
            </h2>
            <p className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-subtle px-3 py-2 font-mono text-[10.5px] leading-relaxed text-ink-muted">
              Breakeven: V* = NetIssuance × P₀ × 10,000 / (r × c × b × φ) [burned] | without φ [buyback]
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">Key finding.</span> With φ=0 (buybacks held, not burned), burned
              breakeven is unreachable. Buyback breakeven requires ~
              {results.breakeven_multiple_buyback?.toFixed(1) || "13.5"}× current volume.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
