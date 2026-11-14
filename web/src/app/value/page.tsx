"use client";

import { useState } from "react";
import KpiCard from "@/components/ui/KpiCard";
import { useMetrics } from "@/hooks/useMetric";

const METRICS = [
  { id: "defillama.fees.near_intents.daily", label: "Gross Fees (DefiLlama)", unit: "USD" },
  { id: "defillama.revenue.near_intents.daily", label: "Protocol Revenue (DefiLlama)", unit: "USD" },
  { id: "defillama.holders_revenue.near_intents.daily", label: "Holders Revenue / Buybacks", unit: "USD" },
] as const;

const VALUE_MEASURED_ANCHORS = [
  { label: "Annualized Volume (V₀)", value: "$3.8B", source: "Trailing 90d × 4", metric: "intents.volume_usd.daily" },
  { label: "Gross Take Rate (r)", value: "16 bps", source: "DefiLlama fees / volume", metric: "defillama.fees.near_intents.daily" },
  { label: "Capture Rate (c)", value: "35%", source: "DefiLlama holders revenue / fees", metric: "defillama.holders_revenue.near_intents.daily" },
  { label: "Buyback Allocation (b)", value: "40%", source: "Observed buyback wallet inflows / net revenue", metric: "revenue.net.near_intents.daily" },
  { label: "Burned Fraction (φ)", value: "0%", source: "Onchain buyback wallet trace", metric: "buyback.burned_near" },
  { label: "NEAR Price (P₀)", value: "$3.50", source: "DefiLlama/CoinGecko", metric: "defillama.near_price_current" },
  { label: "Supply (S₀)", value: "1.31B NEAR", source: "BigQuery blocks.total_supply", metric: "supply.total_supply.daily" },
  { label: "Issuance Rate (m)", value: "2.5%/yr", source: "NEAR protocol parameters", metric: "supply.issuance_rate" },
  { label: "Circulating Supply", value: "1.0B NEAR", source: "DefiLlama/staking", metric: "defillama.circulating_supply" },
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
}

const INITIAL_INPUTS: InputRow[] = [
  { key: "V0", label: "Starting Annual Volume (V₀)", value: 3_800_000_000, unit: "USD", min: 1_000_000_000, max: 50_000_000_000, step: 100_000_000, anchor: 3_800_000_000, measuredLabel: "Trailing 90d × 4" },
  { key: "g", label: "Annual Volume Growth (g)", value: 0.15, unit: "", min: -0.5, max: 1.0, step: 0.01, anchor: 0.15, measuredLabel: "Trailing 90d" },
  { key: "d", label: "Growth Decay (d)", value: 0.05, unit: "/yr", min: 0, max: 0.5, step: 0.01, anchor: 0.05, measuredLabel: "Assumption" },
  { key: "r", label: "Gross Take Rate (r)", value: 160, unit: "bps", min: 0, max: 500, step: 1, anchor: 160, measuredLabel: "DefiLlama trailing" },
  { key: "dr", label: "Take Rate Change (dr)", value: -5, unit: "bps/yr", min: -50, max: 50, step: 1, anchor: -5, measuredLabel: "Observed compression" },
  { key: "c", label: "Capture Rate (c)", value: 0.35, unit: "", min: 0, max: 1, step: 0.01, anchor: 0.35, measuredLabel: "DefiLlama holders revenue / fees" },
  { key: "b", label: "Buyback Allocation (b)", value: 0.4, unit: "", min: 0, max: 1, step: 0.05, anchor: 0.4, measuredLabel: "Buyback wallet / net revenue" },
  { key: "phi", label: "Burn Fraction (φ)", value: 0.0, unit: "", min: 0, max: 1, step: 0.1, anchor: 0.0, measuredLabel: "Onchain trace (0%)" },
  { key: "P0", label: "NEAR Price (P₀)", value: 3.5, unit: "USD", min: 0.1, max: 50, step: 0.1, anchor: 3.5, measuredLabel: "DefiLlama/CoinGecko" },
  { key: "P_growth", label: "Price Growth", value: 0.0, unit: "", min: -0.5, max: 1.0, step: 0.05, anchor: 0.0, measuredLabel: "Flat assumption" },
  { key: "S0", label: "Total Supply (S₀)", value: 1_310_000_000, unit: "NEAR", min: 1_000_000_000, max: 2_000_000_000, step: 10_000_000, anchor: 1_310_000_000, measuredLabel: "BigQuery blocks" },
  { key: "m", label: "Gross Issuance (m)", value: 0.025, unit: "", min: 0, max: 0.1, step: 0.001, anchor: 0.025, measuredLabel: "NEAR protocol (2.5%)" },
  { key: "beta", label: "Gas Burn Offset (β)", value: 0.0, unit: "", min: 0, max: 0.5, step: 0.01, anchor: 0.0, measuredLabel: "Negligible" },
  { key: "circulating_supply", label: "Circulating Supply", value: 1_000_000_000, unit: "NEAR", min: 500_000_000, max: 2_000_000_000, step: 10_000_000, anchor: 1_000_000_000, measuredLabel: "DefiLlama/staking" },
  { key: "market_cap", label: "Market Cap", value: 3_500_000_000, unit: "USD", min: 1_000_000_000, max: 50_000_000_000, step: 100_000_000, anchor: 3_500_000_000, measuredLabel: "Price × circulating" },
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

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded p-3">
      <div className="text-xs text-muted">{title}</div>
      <div className="font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, notation: "compact" }).format(n);
}

function formatPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

export default function ValuePage() {
  const metricIds = METRICS.map(m => m.id);
  const { artifacts, isLoading } = useMetrics(metricIds);
  const [inputs, setInputs] = useState<Record<string, number>>(
    INITIAL_INPUTS.reduce((acc, i) => ({ ...acc, [i.key]: i.value }), {})
  );

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

  // Get latest data timestamp
  const latestDates = validMetrics
    .map(a => a.artifact?.series?.[a.artifact.series.length - 1]?.t)
    .filter(Boolean);
  const dataAsOf = latestDates.length > 0 ? latestDates[0] : "N/A";

  const results = runModel(inputs);

  const handleScenario = (scenario: keyof typeof SCENARIOS) => {
    const s = SCENARIOS[scenario];
    const { label, ...values } = s;
    setInputs(prev => ({ ...prev, ...values }));
  };

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Value Capture Model</h1>
        <p className="text-muted mt-1">Interactive breakeven analysis: What Intents volume is needed for buybacks to offset emissions?</p>
        <div className="mt-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-800 rounded p-2 inline-block">
          Modeled — Not a Prediction or Financial Advice
        </div>
        <p className="text-xs text-amber-400 mt-1">Data as of {dataAsOf}</p>
      </header>

      {/* KPI Row - Available Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {validMetrics.map(({ artifact, label, unit }) => (
          artifact && <KpiCard key={artifact.meta.metric_id} artifact={artifact} label={label} unit={unit} previousPeriodLabel="vs prior day" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Inputs with Measured Anchors */}
        <section className="lg:col-span-1 bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 space-y-4">
          <h2 className="text-lg font-semibold">Inputs</h2>
          <div className="space-y-3">
            {INITIAL_INPUTS.map(input => (
              <div key={input.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <label className="font-medium">{input.label}</label>
                  {input.anchor !== undefined && (
                    <span className="text-xs text-muted px-1.5 py-0.5 bg-neutral-800 rounded">
                      Measured: {input.measuredLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inputs[input.key]}
                    onChange={e => setInputs(prev => ({ ...prev, [input.key]: Number(e.target.value) }))}
                    min={input.min}
                    max={input.max}
                    step={input.step}
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm font-mono text-right"
                  />
                  <span className="text-xs text-muted w-12 text-right">{input.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-neutral-700 space-y-2">
            <h3 className="font-semibold text-sm">Scenarios</h3>
            <div className="flex gap-2">
              {["bear", "base", "bull"].map(s => (
                <button
                  key={s}
                  onClick={() => handleScenario(s as keyof typeof SCENARIOS)}
                  className={`px-3 py-1.5 text-xs rounded font-mono transition-colors border ${"bg-neutral-800 text-muted border-neutral-700 hover:bg-neutral-700"}`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Middle: Measured Anchors */}
        <section className="lg:col-span-1 bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          <h2 className="text-lg font-semibold">Measured Anchors</h2>
          <p className="text-xs text-muted">Each input shows its measured trailing value. Drag sliders to test assumptions.</p>
          <div className="space-y-2">
            {VALUE_MEASURED_ANCHORS.map(anchor => (
              <div key={anchor.metric} className="bg-neutral-800/50 border border-neutral-700 rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{anchor.label}</span>
                  <span className="font-mono text-lg text-green-400">{anchor.value}</span>
                </div>
                <div className="text-xs text-muted mt-1">{anchor.source}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Outputs */}
        <section className="lg:col-span-1 bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 space-y-4">
          <h2 className="text-lg font-semibold">Outputs</h2>
          
          {/* Breakeven Card */}
          <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-amber-400">⚖</span> Breakeven Analysis
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Volume for Buyback = Issuance</span>
                <span className="font-mono font-semibold">
                  {results.breakeven_volume_buyback
                    ? `$${formatNumber(results.breakeven_volume_buyback)} (${results.breakeven_multiple_buyback?.toFixed(1)}× current)`
                    : "N/A (φ=0)"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Volume for Burn = Issuance</span>
                <span className="font-mono font-semibold">
                  {results.breakeven_volume_burn
                    ? `$${formatNumber(results.breakeven_volume_burn)} (${results.breakeven_multiple_burn?.toFixed(1)}× current)`
                    : "NOT REACHABLE (φ=0)"}
                </span>
              </div>
            </div>
          </div>

          {/* Key Ratios */}
          <div className="grid gap-3 sm:grid-cols-2">
            {results.years[0] && (
              <>
                <MetricCard title="Year 0 Buyback / Issuance" value={formatPct(results.years[0].BuybackToIssuance_t)} />
                <MetricCard title="Year 0 Burn / Issuance" value={formatPct(results.years[0].BurnToIssuance_t)} />
                <MetricCard title="Year 0 Rev Yield" value={formatPct(results.years[0].RevYield_t)} />
                <MetricCard title="Year 0 Rev / Emissions" value={formatPct(results.years[0].RevToEmissions_t || 0)} />
              </>
            )}
          </div>

          {/* Yearly Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-neutral-700">
                  <th className="pb-2">Year</th>
                  <th className="pb-2 text-right">Volume</th>
                  <th className="pb-2 text-right">Gross Fees</th>
                  <th className="pb-2 text-right">Net Rev</th>
                  <th className="pb-2 text-right">Buyback (NEAR)</th>
                  <th className="pb-2 text-right">Burned (NEAR)</th>
                  <th className="pb-2 text-right">ΔSupply</th>
                  <th className="pb-2 text-right">Buyback/Issuance</th>
                </tr>
              </thead>
              <tbody>
                {results.years.map(y => (
                  <tr key={y.year} className="border-b border-neutral-800">
                    <td className="py-2 font-mono">{y.year}</td>
                    <td className="py-2 text-right font-mono">${formatNumber(y.V_t)}</td>
                    <td className="py-2 text-right font-mono">${formatNumber(y.GrossFees_t)}</td>
                    <td className="py-2 text-right font-mono">${formatNumber(y.NetRev_t)}</td>
                    <td className="py-2 text-right font-mono">${formatNumber(y.Buyback_NEAR_t)}</td>
                    <td className="py-2 text-right font-mono">${formatNumber(y.Burned_NEAR_t)}</td>
                    <td className="py-2 text-right font-mono">${formatNumber(y.DeltaSupply_t)}</td>
                    <td className="py-2 text-right font-mono">{formatPct(y.BuybackToIssuance_t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Measured Anchors Table */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Measured Anchors (from Plans 03-06)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-neutral-700">
                <th className="pb-2">Parameter</th>
                <th className="pb-2">Measured Value</th>
                <th className="pb-2">Source</th>
                <th className="pb-2">Metric ID</th>
              </tr>
            </thead>
            <tbody>
              {VALUE_MEASURED_ANCHORS.map(a => (
                <tr key={a.metric} className="border-b border-neutral-800">
                  <td className="py-2 font-medium">{a.label}</td>
                  <td className="py-2 font-mono text-green-400">{a.value}</td>
                  <td className="py-2 text-muted">{a.source}</td>
                  <td className="py-2 font-mono text-xs">{a.metric}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Onchain Revenue Note */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Onchain Revenue (NearBlocks)</h2>
        <p className="text-sm text-muted mb-2">Revenue wallet NEAR inflows from intents.near and buyback wallet outflows parsed from multisig FUNCTION_CALL actions.</p>
        <div className="text-xs text-muted space-y-1">
          <p>• Revenue metric: <code>nearblocks.revenue_near.daily</code> — NEAR transfers from intents.near to 3 revenue wallets</p>
          <p>• Buyback outflows: <code>nearblocks.buyback_outflows.daily</code> — Transfers from buybacks.multisignature.near via add_request</p>
          <p>• Net revenue: <code>nearblocks.net_revenue_near.daily</code> — Revenue inflows minus buyback outflows</p>
          <p>• φ (burn fraction): 0%</p>
          <p>— Onchain trace shows buyback wallet balance grew; no transfers to dead address observed</p>
        </div>
      </section>

      <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 text-sm text-muted">
        <p><strong>Model:</strong> V* = NetIssuance × P₀ × 10,000 / (r × c × b × φ) for burned; without φ for buyback.</p>
        <p className="mt-1"><strong>Assumptions:</strong> Flat price (P_growth=0), constant issuance, 5-year horizon. All outputs are <strong>modeled</strong> — not predictions.</p>
        <p className="mt-1"><strong>Key finding:</strong> With φ=0 (onchain evidence: buybacks held, not burned), burned breakeven is unreachable. Buyback breakeven requires ~13.5× current volume at current parameters.</p>
      </div>
    </div>
  );
}