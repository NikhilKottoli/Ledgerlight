"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import KpiCard from "@/components/ui/KpiCard";
import { useMetrics } from "@/hooks/useMetric";

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

function formatCurrencyFull(n: number): string {
  return "$" + new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

// Dynamically import chart components (client-side only)
const ProjectionChart = dynamic(() => import("@/components/charts/ProjectionChart"), { ssr: false });
const BuybackVsIssuanceChart = dynamic(() => import("@/components/charts/BuybackVsIssuanceChart"), { ssr: false });
const KeyRatiosChart = dynamic(() => import("@/components/charts/KeyRatiosChart"), { ssr: false });

export default function ValuePage() {
  const metricIds = METRICS.map(m => m.id);
  const { artifacts, isLoading } = useMetrics(metricIds);
  const [inputs, setInputs] = useState<Record<string, number>>(
    INITIAL_INPUTS.reduce((acc, i) => ({ ...acc, [i.key]: i.value }), {})
  );
  const [activeScenario, setActiveScenario] = useState<keyof typeof SCENARIOS>("base");
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <header className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Value Capture Model</h1>
          <p className="text-muted mt-1">Interactive breakeven analysis: What Intents volume is needed for buybacks to offset emissions?</p>
        </header>
        <div className="text-center py-12 text-muted">Loading live data...</div>
      </div>
    );
  }

  const validMetrics = METRICS.map((m, i) => ({ ...m, artifact: artifacts[i] })).filter(m => m.artifact);

  const latestDates = validMetrics
    .map(a => a.artifact?.series?.[a.artifact.series.length - 1]?.t)
    .filter(Boolean);
  const dataAsOf = latestDates.length > 0 ? latestDates[0] : "N/A";

  const results = useMemo(() => runModel(inputs), [inputs]);

  const handleScenario = (scenario: keyof typeof SCENARIOS) => {
    const s = SCENARIOS[scenario];
    const { label, ...values } = s;
    setInputs(prev => ({ ...prev, ...values }));
    setActiveScenario(scenario);
  };

  // Chart data
  const chartData = useMemo(() => results.years.map(y => ({
    year: `Year ${y.year}`,
    volume: y.V_t,
    grossFees: y.GrossFees_t,
    netRev: y.NetRev_t,
    buybackNEAR: y.Buyback_NEAR_t,
    issuance: y.NetIssuance_t,
    buybackRatio: y.BuybackToIssuance_t * 100,
    revYield: y.RevYield_t * 100,
    deltaSupply: y.DeltaSupply_t,
  })), [results.years]);

  const breakevenData = useMemo(() => {
    if (!results.breakeven_volume_buyback) return [];
    const currentVol = inputs.V0;
    const breakeven = results.breakeven_volume_buyback;
    return [
      { label: "Current Volume", value: currentVol, type: "current" },
      { label: "Breakeven Volume", value: breakeven, type: "breakeven" },
    ];
  }, [results.breakeven_volume_buyback, inputs.V0]);

  const scenarioComparison = useMemo(() => {
    return (["bear", "base", "bull"] as const).map(s => {
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
  }, [inputs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Value Capture Model</h1>
          <p className="text-muted mt-1">What Intents volume is needed for buybacks to offset emissions?</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">Data as of {dataAsOf}</span>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showAdvanced}
              onChange={e => setShowAdvanced(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-blue-500"
            />
            Show advanced inputs
          </label>
        </div>
      </header>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {validMetrics.map(({ artifact, label, unit }) => (
          artifact && <KpiCard key={artifact.meta.metric_id} artifact={artifact} label={label} unit={unit} previousPeriodLabel="vs prior day" />
        ))}
      </div>

      {/* Key Output Cards - Prominent */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="bg-amber-900/30 border border-amber-800 rounded-xl p-5">
          <div className="text-xs text-amber-400 font-medium mb-1">Buyback Breakeven</div>
          <div className="text-3xl font-mono font-bold text-amber-300">
            {results.breakeven_volume_buyback
              ? formatCurrency(results.breakeven_volume_buyback)
              : "N/A (φ=0)"}
          </div>
          <div className="text-sm text-muted mt-1">
            {results.breakeven_multiple_buyback
              ? `${results.breakeven_multiple_buyback.toFixed(1)}× current volume`
              : "Burn fraction is 0%"}
          </div>
        </div>
        <div className="bg-green-900/30 border border-green-800 rounded-xl p-5">
          <div className="text-xs text-green-400 font-medium mb-1">Year 0 Buyback / Issuance</div>
          <div className="text-3xl font-mono font-bold text-green-300">
            {formatPct(results.years[0]?.BuybackToIssuance_t || 0)}
          </div>
          <div className="text-sm text-muted mt-1">Target: ≥100%</div>
        </div>
        <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-5">
          <div className="text-xs text-blue-400 font-medium mb-1">Year 0 Revenue Yield</div>
          <div className="text-3xl font-mono font-bold text-blue-300">
            {formatPct(results.years[0]?.RevYield_t || 0)}
          </div>
          <div className="text-sm text-muted mt-1">Net Rev / Market Cap</div>
        </div>
        <div className="bg-purple-900/30 border border-purple-800 rounded-xl p-5">
          <div className="text-xs text-purple-400 font-medium mb-1">Year 0 Rev / Emissions</div>
          <div className="text-3xl font-mono font-bold text-purple-300">
            {formatPct(results.years[0]?.RevToEmissions_t || 0)}
          </div>
          <div className="text-sm text-muted mt-1">NEAR Revenue / NEAR Issued</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
        {/* Left: Inputs */}
        <section className="lg:col-span-1 bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Inputs</h2>
            <div className="flex gap-2">
              {(["bear", "base", "bull"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => handleScenario(s)}
                  className={`px-3 py-1.5 text-xs rounded font-mono transition-colors border ${
                    activeScenario === s
                      ? "bg-blue-900/30 text-blue-300 border-blue-700"
                      : "bg-neutral-800 text-muted border-neutral-700 hover:bg-neutral-700"
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {INITIAL_INPUTS
              .filter(input => showAdvanced || ["V0", "g", "r", "c", "b", "phi", "P0"].includes(input.key))
              .map(input => (
                <div key={input.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <label className="font-medium cursor-help" title={input.measuredLabel}>
                      {input.label}
                    </label>
                    {input.anchor !== undefined && (
                      <span className="text-xs text-muted px-1.5 py-0.5 bg-neutral-800 rounded">
                        Measured: {input.format ? input.format(input.anchor) : input.anchor}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={input.min}
                      max={input.max}
                      step={input.step}
                      value={inputs[input.key]}
                      onChange={e => setInputs(prev => ({ ...prev, [input.key]: Number(e.target.value) }))}
                      className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none accent-blue-500"
                    />
                    <input
                      type="number"
                      min={input.min}
                      max={input.max}
                      step={input.step}
                      value={inputs[input.key]}
                      onChange={e => setInputs(prev => ({ ...prev, [input.key]: Number(e.target.value) }))}
                      className="w-28 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm font-mono text-right"
                    />
                    <span className="text-xs text-muted w-20 text-right">{input.unit}</span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* Middle: Live Charts */}
        <section className="lg:col-span-1 bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 space-y-4">
          <h2 className="text-lg font-semibold">Projections (5 Years)</h2>

          {/* Projection Chart */}
          <ProjectionChart chartData={chartData} />

          {/* Buyback vs Issuance Chart */}
          <BuybackVsIssuanceChart chartData={chartData} />

          {/* Key Ratios Chart */}
          <KeyRatiosChart chartData={chartData} />
        </section>

        {/* Right: Breakeven Analysis & Scenario Compare */}
        <section className="lg:col-span-1 bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 space-y-4">
          <h2 className="text-lg font-semibold">Breakeven Analysis</h2>

          {/* Breakeven Volume Visual */}
          <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className="text-amber-400">⚖</span> Volume Required for Buyback = Issuance
            </h3>
            <div className="space-y-3">
              {breakevenData.map((d, i) => (
                <div key={d.label} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    d.type === "current" ? "bg-blue-500 text-white" : "bg-amber-500 text-white"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{d.label}</div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          d.type === "current" ? "bg-blue-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(100, (d.value / results.breakeven_volume_buyback!) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-40 text-right font-mono text-lg">
                    {formatCurrency(d.value)}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-amber-800 text-sm text-muted">
                {results.breakeven_multiple_buyback
                  ? `Need ${results.breakeven_multiple_buyback.toFixed(1)}× current volume`
                  : "Not reachable (φ=0)"}
              </div>
            </div>
          </div>

          {/* Scenario Comparison */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
            <h3 className="font-semibold mb-3">Scenario Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-neutral-700">
                    <th className="pb-2">Scenario</th>
                    <th className="pb-2 text-right">Breakeven Vol</th>
                    <th className="pb-2 text-right">Multiple</th>
                    <th className="pb-2 text-right">Y0 Buyback/Iss</th>
                    <th className="pb-2 text-right">Y0 Rev Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioComparison.map(s => (
                    <tr key={s.scenario} className={`border-b border-neutral-800 ${activeScenario === s.scenario ? "bg-blue-900/20" : ""}`}>
                      <td className="py-2 font-medium capitalize">{s.scenario}</td>
                      <td className="py-2 text-right font-mono">{s.breakeven ? formatCurrency(s.breakeven) : "N/A"}</td>
                      <td className="py-2 text-right font-mono">{s.multiple ? s.multiple.toFixed(1) + "×" : "N/A"}</td>
                      <td className="py-2 text-right font-mono">{formatPct(s.year0BuybackRatio / 100)}</td>
                      <td className="py-2 text-right font-mono">{formatPct(s.year0RevYield / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Yearly Detail Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-neutral-700">
                  <th className="pb-2">Year</th>
                  <th className="pb-2 text-right">Volume</th>
                  <th className="pb-2 text-right">Gross Fees</th>
                  <th className="pb-2 text-right">Net Rev</th>
                  <th className="pb-2 text-right">Buyback (NEAR)</th>
                  <th className="pb-2 text-right">ΔSupply</th>
                  <th className="pb-2 text-right">Buyback/Iss</th>
                  <th className="pb-2 text-right">Rev Yield</th>
                </tr>
              </thead>
              <tbody>
                {results.years.map(y => (
                  <tr key={y.year} className="border-b border-neutral-800">
                    <td className="py-2 font-mono">{y.year}</td>
                    <td className="py-2 text-right font-mono">{formatCurrency(y.V_t)}</td>
                    <td className="py-2 text-right font-mono">{formatCurrency(y.GrossFees_t)}</td>
                    <td className="py-2 text-right font-mono">{formatCurrency(y.NetRev_t)}</td>
                    <td className="py-2 text-right font-mono">{formatNumber(y.Buyback_NEAR_t)} NEAR</td>
                    <td className="py-2 text-right font-mono">{formatNumber(y.DeltaSupply_t)} NEAR</td>
                    <td className="py-2 text-right font-mono">{formatPct(y.BuybackToIssuance_t)}</td>
                    <td className="py-2 text-right font-mono">{formatPct(y.RevYield_t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Measured Anchors - Compact */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Measured Anchors</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_MEASURED_ANCHORS.map(a => (
            <div key={a.label} className="bg-neutral-800/50 border border-neutral-700 rounded p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{a.label}</span>
                <span className="font-mono text-lg text-green-400">{a.value}</span>
              </div>
              <div className="text-xs text-muted mt-1">{a.source}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Formula Reference */}
      <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 text-sm text-muted">
        <p className="font-mono"><strong>Breakeven:</strong> V* = NetIssuance × P₀ × 10,000 / (r × c × b × φ) [burned] | without φ [buyback]</p>
        <p className="mt-1"><strong>Key finding:</strong> With φ=0 (buybacks held, not burned), burned breakeven is unreachable. Buyback breakeven requires ~{results.breakeven_multiple_buyback?.toFixed(1) || "13.5"}× current volume.</p>
      </div>
    </div>
  );
}

