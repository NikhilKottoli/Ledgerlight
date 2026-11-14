"use client";

import { useState, useEffect } from "react";

export default function MethodologyPage() {
  const [mounted, setMounted] = useState(false);
  const [registry, setRegistry] = useState<any>(null);
  const [isRegistryLoading, setIsRegistryLoading] = useState(true);

  // Fetch registry on mount
  useEffect(() => {
    fetch("/api/data/registry/")
      .then(res => res.json())
      .then(data => {
        setRegistry(data);
        setIsRegistryLoading(false);
      })
      .catch(() => setIsRegistryLoading(false));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <header className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Methodology</h1>
          <p className="text-muted mt-1">Inspect every metric: source, definition, calculation, coverage, freshness, limitations</p>
        </header>
        <div className="text-center py-12 text-muted">Loading live data...</div>
      </div>
    );
  }

  if (isRegistryLoading) {
    return (
      <div className="space-y-6">
        <header className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Methodology</h1>
          <p className="text-muted mt-1">Inspect every metric: source, definition, calculation, coverage, freshness, limitations</p>
        </header>
        <div className="text-center py-12 text-muted">Loading live data...</div>
      </div>
    );
  }

  const metrics = registry?.metrics || [];

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Methodology</h1>
        <p className="text-muted mt-1">Inspect every metric: source, definition, calculation, coverage, freshness, limitations</p>
      </header>

      {/* Registry Browser */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Metrics Registry</h2>
        <p className="text-sm text-muted mb-4">
          {metrics.length} registered metrics. Each metric has a verified source, definition, and calculation reference.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-neutral-700">
                <th className="pb-2">Metric ID</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">Kind</th>
                <th className="pb-2">Unit</th>
                <th className="pb-2">Source</th>
                <th className="pb-2">Granularity</th>
                <th className="pb-2">Completeness</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m: any) => (
                <tr key={m.id} className="border-b border-neutral-800">
                  <td className="py-2 font-mono text-xs">{m.id}</td>
                  <td className="py-2">{m.name}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      m.kind === "measured" ? "bg-green-900/30 text-green-300" :
                      m.kind === "derived" ? "bg-blue-900/30 text-blue-300" :
                      "bg-amber-900/30 text-amber-300"
                    }`}>{m.kind}</span>
                  </td>
                  <td className="py-2 font-mono">{m.unit}</td>
                  <td className="py-2 text-sm text-muted">{m.source?.name}</td>
                  <td className="py-2">{m.granularity}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      m.completeness === "complete" ? "bg-green-900/30 text-green-300" :
                      m.completeness === "partial" ? "bg-amber-900/30 text-amber-300" :
                      "bg-neutral-800 text-muted"
                    }`}>{m.completeness}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Source Definitions */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Source Definitions</h2>
        <div className="space-y-4">
          {[
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
              endpoints: [
                "Wallet transaction history",
                "Token transfer tracking",
                "Revenue & buyback wallet monitoring",
              ],
            },
            {
              name: "Pikespeak",
              url: "https://pikespeak.ai",
              endpoints: [
                "Hot wallet tracking",
                "Balance analytics",
              ],
            },
          ].map(source => (
            <details key={source.name} className="border border-neutral-700 rounded p-4">
              <summary className="cursor-pointer font-medium flex items-center justify-between">
                {source.name}
                <span className="text-xs text-muted">{source.endpoints.length} endpoints</span>
              </summary>
              <div className="mt-3 space-y-1">
                <p className="text-sm text-muted"><strong>Base URL:</strong> {source.url}</p>
                <ul className="mt-2 space-y-1 text-sm font-mono text-muted">
                  {source.endpoints.map(e => <li key={e}>{e}</li>)}
                </ul>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Unit Policy */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Unit Policy</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-neutral-700">
                <th className="pb-2">Category</th>
                <th className="pb-2">Types</th>
                <th className="pb-2">Denomination</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-800">
                <td className="py-2 font-medium">Volume</td>
                <td className="py-2 font-mono">SwapVolumeUSD</td>
                <td className="py-2">USD</td>
              </tr>
              <tr className="border-b border-neutral-800">
                <td className="py-2 font-medium">Fees</td>
                <td className="py-2 font-mono">GrossFeesUSD, PartnerPayoutUSD, NetRevenueUSD</td>
                <td className="py-2">USD</td>
              </tr>
              <tr className="border-b border-neutral-800">
                <td className="py-2 font-medium">Revenue</td>
                <td className="py-2 font-mono">NetRevenueNEAR, BuybackNEAR, BurnNEAR, HeldNEAR</td>
                <td className="py-2">NEAR</td>
              </tr>
              <tr className="border-b border-neutral-800">
                <td className="py-2 font-medium">Supply</td>
                <td className="py-2 font-mono">SupplyNEAR, NetIssuanceNEAR</td>
                <td className="py-2">NEAR</td>
              </tr>
              <tr className="border-b border-neutral-800">
                <td className="py-2 font-medium">Rates</td>
                <td className="py-2 font-mono">Bps (basis points)</td>
                <td className="py-2">bps</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          Types prevent mixing. GrossFeesUSD + NetRevenueNEAR → TypeError. USD→NEAR conversion requires explicit PricePoint.
        </p>
      </section>

      {/* Statistical Method */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Statistical Method</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-medium mb-2">Transforms</h3>
            <ul className="space-y-1 text-sm text-muted">
              <li>• Stationary transforms: log-differences (log x_t - log x_t-1)</li>
              <li>• Primary frequency: weekly (ISO weeks)</li>
              <li>• Minimum n = 52 weekly observations</li>
              <li>• Missing weeks dropped, never interpolated</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Inference</h3>
            <ul className="space-y-1 text-sm text-muted">
              <li>• Stationary block bootstrap CIs (1000 resamples, block length 10)</li>
              <li>• Benjamini–Hochberg FDR across all lags tested</li>
              <li>• Partial correlation controlling for BTC/ETH returns</li>
              <li>• Effect size + CI + n reported (never p-value alone)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Structural Breaks</h3>
            <ul className="space-y-1 text-sm text-muted">
              <li>• Pre/post 2026-02-23 (buyback programme start)</li>
              <li>• Exclude 14 days post 2026-10-01 (Omni exploit)</li>
              <li>• Results reported for each subsample</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Concentration</h3>
            <ul className="space-y-1 text-sm text-muted">
              <li>• Gini coefficient, HHI, top-k share</li>
              <li>• Dimensions: addresses, contracts, chains, tokens</li>
              <li>• Quarterly trend (linear slope)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Data Modes */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Data Modes</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-green-900/20 border border-green-800 rounded p-4">
            <h3 className="font-semibold text-green-300 mb-1">Live</h3>
            <p className="text-sm text-muted">Pipeline ran against real APIs with credentials just now. Shows retrieval timestamp.</p>
          </div>
          <div className="bg-amber-900/20 border border-amber-800 rounded p-4">
            <h3 className="font-semibold text-amber-300 mb-1">Snapshot</h3>
            <p className="text-sm text-muted">Committed real aggregated data from earlier live run. Persistent amber banner with snapshot date.</p>
          </div>
          <div className="bg-red-900/20 border border-red-800 rounded p-4">
            <h3 className="font-semibold text-red-300 mb-1">Synthetic</h3>
            <p className="text-sm text-muted">Generated fixtures for unit tests only. Never shipped as default.</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          Every JSON artifact carries <code className="bg-neutral-800 px-1 rounded">data_mode</code>. Pipeline refuses to combine artifacts with different modes.
        </p>
      </section>
    </div>
  );
}