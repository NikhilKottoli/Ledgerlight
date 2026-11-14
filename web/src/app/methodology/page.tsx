import { Metadata } from "next";
import { MetricArtifact } from "@/lib/types";
import fs from "fs";
import path from "path";

function loadArtifact(metricId: string): MetricArtifact | null {
  const p = path.join(process.cwd(), `public/data/${metricId}.json`);
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as MetricArtifact;
  } catch {
    return null;
  }
}

function loadRegistry() {
  const p = path.join(process.cwd(), "public/data/registry.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}


export default function MethodologyPage() {
  const registry = loadRegistry();
  const metrics = registry?.metrics || [];
  
  // Load all artifacts
  const artifactIds = metrics.map((m: { id: string }) => m.id);
  const artifacts = artifactIds.map((id: string) => loadArtifact(id)).filter(Boolean);

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
                "GET /overview/dexs/near-intents (may 500)",
                "GET /coins/near (price history)",
                "GET /v2/historicalChainTvl/Near (chain TVL)",
              ],
            },
            {
              name: "BigQuery (crypto_near_mainnet_us)",
              url: "https://console.cloud.google.com/bigquery",
              endpoints: [
                "transactions (block_date, signer_account_id, status)",
                "receipt_actions (action_kind, args.deposit, receipt_receiver_account_id)",
                "ft_events (contract_account_id, affected_account_id, delta_amount, cause)",
                "ft_balances_daily (account_id, liquid, staked, contract_account_id)",
                "blocks (total_supply, block_date)",
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
              name: "revenue.near.org",
              url: "https://revenue.near.org",
              endpoints: [
                "JS-rendered dashboard only (no API)",
                "Manual reference values in data/reference/revenue_near_org.yaml",
                "Three revenue wallets: fefundsadmin, buybacks.multisignature, 1csfundsadmin",
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

      {/* Reconciliation Tables */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Reconciliation Tables</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded p-4">
            <h3 className="font-semibold mb-2">Three-Way Revenue Reconciliation</h3>
            <p className="text-sm text-muted mb-3">Our onchain rebuild vs DefiLlama revenue vs revenue.near.org reference</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-neutral-700">
                    <th className="pb-2">Window</th>
                    <th className="pb-2 text-right">Onchain (NEAR)</th>
                    <th className="pb-2 text-right">DefiLlama (USD)</th>
                    <th className="pb-2 text-right">revenue.near.org (NEAR)</th>
                    <th className="pb-2 text-right">Delta %</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-800">
                    <td className="py-2">30d</td>
                    <td className="py-2 text-right font-mono">413,015</td>
                    <td className="py-2 text-right font-mono">$9.93M</td>
                    <td className="py-2 text-right font-mono">—</td>
                    <td className="py-2 text-right font-mono text-amber-400">needs price</td>
                    <td className="py-2"><span className="px-2 py-0.5 bg-amber-900/30 text-amber-300 rounded text-xs">investigate</span></td>
                  </tr>
                  <tr>
                    <td className="py-2">All-time</td>
                    <td className="py-2 text-right font-mono">—</td>
                    <td className="py-2 text-right font-mono">$9.35M</td>
                    <td className="py-2 text-right font-mono">4.34M</td>
                    <td className="py-2 text-right">—</td>
                    <td className="py-2"><span className="px-2 py-0.5 bg-amber-900/30 text-amber-300 rounded text-xs">investigate</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-neutral-800/50 border border-neutral-700 rounded p-4">
            <h3 className="font-semibold mb-2">Intents vs DefiLlama Reconciliation</h3>
            <p className="text-sm text-muted mb-3">Explorer API volume/fees vs DefiLlama DEX volume/fees</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-neutral-700">
                    <th className="pb-2">Metric</th>
                    <th className="pb-2 text-right">Explorer</th>
                    <th className="pb-2 text-right">DefiLlama</th>
                    <th className="pb-2 text-right">Delta %</th>
                    <th className="pb-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-800">
                    <td className="py-2">Volume (30d)</td>
                    <td className="py-2 text-right font-mono">—</td>
                    <td className="py-2 text-right font-mono">$3.897B</td>
                    <td className="py-2 text-right">—</td>
                    <td className="py-2 text-muted">Requires JWT</td>
                  </tr>
                  <tr>
                    <td className="py-2">Fees (30d)</td>
                    <td className="py-2 text-right font-mono">—</td>
                    <td className="py-2 text-right font-mono">$6.01M</td>
                    <td className="py-2 text-right">—</td>
                    <td className="py-2 text-muted">Requires JWT</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Unit Policy */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Unit Policy (D6)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-neutral-700">
                <th className="pb-2">Category</th>
                <th className="pb-2">Types</th>
                <th className="pb-2">Denomination</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-800">
                <td className="py-2 font-medium">Volume</td>
                <td className="py-2 font-mono">SwapVolumeUSD</td>
                <td className="py-2">USD</td>
                <td className="py-2 text-muted">Explorer amountInUsd, SUCCESS only</td>
              </tr>
              <tr className="border-b border-neutral-800">
                <td className="py-2 font-medium">Fees</td>
                <td className="py-2 font-mono">GrossFeesUSD, PartnerPayoutUSD, NetRevenueUSD</td>
                <td className="py-2">USD</td>
                <td className="py-2 text-muted">Pre-sweep stage</td>
              </tr>
              <tr className="border-b border-neutral-800">
                <td className="py-2 font-medium">Revenue</td>
                <td className="py-2 font-mono">NetRevenueNEAR, BuybackNEAR, BurnNEAR, HeldNEAR</td>
                <td className="py-2">NEAR</td>
                <td className="py-2 text-muted">Post-sweep, converted via daily price</td>
              </tr>
              <tr className="border-b border-neutral-800">
                <td className="py-2 font-medium">Supply</td>
                <td className="py-2 font-mono">SupplyNEAR, NetIssuanceNEAR</td>
                <td className="py-2">NEAR</td>
                <td className="py-2 text-muted">Blocks.total_supply delta</td>
              </tr>
              <tr className="border-b border-neutral-800">
                <td className="py-2 font-medium">Rates</td>
                <td className="py-2 font-mono">Bps (basis points)</td>
                <td className="py-2">bps</td>
                <td className="py-2 text-muted">1 bps = 0.01%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          <strong>Rule:</strong> Types prevent mixing. GrossFeesUSD + NetRevenueNEAR → TypeError. 
          USD→NEAR conversion requires explicit PricePoint.
        </p>
      </section>

      {/* Statistical Method */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Statistical Method (D9)</h2>
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

      {/* Known Limitations */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Known Limitations</h2>
        <ul className="space-y-2 text-sm text-muted">
          <li>• <strong>Accounts ≠ humans:</strong> "Active accounts" = distinct signer addresses. Multi-sig, exchanges, bots inflate counts.</li>
          <li>• <strong>Addresses ≠ people:</strong> Multi-chain individuals = multiple addresses. "Unique sender addresses" used, never "people".</li>
          <li>• <strong>Confidential flows:</strong> Intents CONFIDENTIAL_INTENTS deposit/recipient types not fully visible.</li>
          <li>• <strong>Explorer coverage:</strong> 1Click API documents only its own coverage; other integrators may differ.</li>
          <li>• <strong>Price conversion:</strong> NEAR↔USD conversion introduces noise; revenue in NEAR is primary.</li>
          <li>• <strong>Timing mismatch:</strong> Fees accrue per swap; sweeps to protocol wallets happen later with variable lag.</li>
          <li>• <strong>Buyback ≠ burned:</strong> Onchain evidence shows bought-back NEAR held, not burned. Revenue.near.org claims "permanently removed".</li>
          <li>• <strong>BigQuery quota:</strong> Free tier 1 TB/month limits backfill; revenue wallet outflows pending quota reset.</li>
        </ul>
      </section>

      {/* Data Modes */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Data Modes (D2)</h2>
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
            <p className="text-sm text-muted">Generated fixtures for unit tests only. Loud red banner + watermark on every chart. Never default.</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          Every JSON artifact carries <code className="bg-neutral-800 px-1 rounded">data_mode</code>. Pipeline refuses to combine artifacts with different modes.
        </p>
      </section>

      {/* How to Reproduce */}
      <section className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">How to Reproduce</h2>
        <div className="space-y-2 font-mono text-sm">
          <p><code>git clone https://github.com/.../near-value-intelligence.git</code></p>
          <p><code>cd near-value-intelligence</code></p>
          <p><code>cp .env.example .env  # fill in credentials</code></p>
          <p><code>make setup</code></p>
          <p><code>make rebuild MODE=snapshot  # or MODE=live</code></p>
          <p><code>make verify</code></p>
          <p className="mt-2"><code>cd web && npm run dev</code> (or <code>make web-dev</code>)</p>
        </div>
      </section>
    </div>
  );
}
