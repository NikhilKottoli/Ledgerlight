# NEAR Value Intelligence — Methodology

*Static export of the metrics registry, source definitions, and analytical approach.*

---

## Metrics Registry

All 11 registered metrics with source, definition, calculation, unit, kind, coverage, freshness, completeness, and limitations.

| Metric ID | Name | Kind | Unit | Source | Granularity | Coverage | Freshness |
|-----------|------|------|------|--------|-------------|----------|-----------|
| defillama.tvl.near_intents.daily | TVL (NEAR Intents) | measured | USD | DefiLlama | daily | 2024-01 → present | T+1 |
| defillama.fees.near_intents.daily | Fees (Gross) | measured | USD | DefiLlama | daily | 2024-01 → present | T+1 |
| defillama.revenue.near_intents.daily | Revenue (Protocol) | measured | USD | DefiLlama | daily | 2024-01 → present | T+1 |
| defillama.holders_revenue.near_intents.daily | Holders Revenue (Buybacks) | measured | USD | DefiLlama | daily | 2024-01 → present | T+1 |
| revenue.net.near_intents.daily | Net Revenue (NEAR) | derived | NEAR | Onchain (BigQuery) | daily | 2026-02 → present | T+1 |
| intents.volume_usd.daily | Volume (USD) | measured | USD | Intents Explorer | daily | 2024-01 → present | T+1 |
| intents.swaps.daily | Swaps | measured | count | Intents Explorer | daily | 2024-01 → present | T+1 |
| intents.unique_sender_addresses.daily | Unique Sender Addresses | measured | count | Intents Explorer | daily | 2024-01 → present | T+1 |
| intents.concentration.daily | Concentration (Top-10 Share) | derived | ratio | Intents Explorer | daily | 2024-01 → present | T+1 |
| supply.net_supply_change.daily | Net Supply Change | derived | NEAR | BigQuery | daily | 2024-01 → present | T+1 |
| defillama.near_price_current | NEAR Price | measured | USD | DefiLlama | daily | 2020-10 → present | T+1 |

**Kind definitions:**
- `measured`: Read directly from a source (e.g., daily TVL)
- `derived`: Deterministic calculation from measured data (e.g., capture rate, Gini)
- `modeled`: Depends on a human assumption (e.g., Value Capture Model parameters)

---

## Source Definitions

### DefiLlama
- **Endpoint**: `https://api.llama.fi/protocol/near-intents`
- **Metrics**: TVL, fees, revenue, holders_revenue
- **Frequency**: Daily
- **Coverage**: Since protocol launch
- **Limitations**: Self-reported by protocol; holders_revenue may include non-buyback distributions

### NEAR Intents Explorer (1Click API)
- **Endpoint**: `https://explorer-api.near-intents.org/v1/swaps`
- **Auth**: JWT required (partner access)
- **Rate limit**: 1 req/5s (strict)
- **Metrics**: Volume, swaps, unique senders, status mix, chain/token distribution
- **Limitations**: Documents only 1Click coverage; other integrators may differ

### BigQuery Public Datasets (NEAR)
- **Project**: `bigquery-public-data.crypto_near`
- **Tables**: `transactions`, `blocks`, `receipts`
- **Free tier**: 1 TB/month
- **Metrics**: Active accounts, transactions, supply, revenue wallet flows
- **Limitations**: Quota limits backfill; revenue wallet outflows pending quota reset

### revenue.near.org
- **Source**: NEAR Foundation protocol revenue page
- **Use**: Reference for three-way reconciliation
- **Limitation**: Claims "permanently removed" for buybacks; contradicts onchain evidence

---

## SQL Index (Authored BigQuery Queries)

| File | Metric | Bytes Scanned | Date Verified | Status |
|------|--------|---------------|---------------|--------|
| sql/daily_active_accounts.sql | network.active_accounts.daily | Pending dry-run | Pending | ⏳ Credentials |
| sql/daily_transactions.sql | network.transactions.daily | Pending dry-run | Pending | ⏳ Credentials |
| sql/revenue_wallet_inflows.sql | revenue.net.near_intents.daily | Pending dry-run | Pending | ⏳ Schema/credentials |
| sql/revenue_wallet_outflows.sql | buyback.outflows | Pending dry-run | Pending | ⏳ Schema/credentials |
| sql/supply_changes.sql | supply.net_supply_change.daily | Pending dry-run | Pending | ⏳ Schema/credentials |

Each SQL file has a header comment identifying its metric, source, partition
filter, and verification state. Byte counts and dates are populated only after
the BigQuery dry-run succeeds; no estimate is presented as a verified result.

---

## Reconciliation Approach

### Three-Way Revenue Reconciliation

| Source | What It Measures | Reconciliation Role |
|--------|------------------|---------------------|
| DefiLlama | Protocol-reported gross fees, revenue, holders revenue | Primary market data |
| Onchain (BigQuery) | Native NEAR inflows to revenue wallet | Ground truth for NEAR-denominated |
| revenue.near.org | Foundation-reported protocol revenue | Independent reference |

**Rule**: Every stage either reconciles or shows an explicit `unreconciled` amount. Never plug gaps.

### Flow Ledger (5 Presets: 7d, 30d, 90d, YTD, All)

```
Gross Fees (DefiLlama)
    │
    ├─► Protocol Revenue (DefiLlama)
    │       │
    │       ├─► Holders Revenue / Buybacks (DefiLlama)
    │       │       │
    │       │       ├─► Buyback Wallet Inflows (Onchain) ← Reconciled
    │       │       │
    │       │       └─► Burned NEAR (Onchain) ← φ=0 (unreconciled)
    │       │
    │       └─► Treasury/Other (Unreconciled)
    │
    └─► Other/Unreconciled
```

---

## Unit Policy

**Never mix these pairs. Use distinct typed units:**

| Pair | Enforcement |
|------|-------------|
| USD vs NEAR | Python `NewType` / TypeScript branded types |
| Gross fees vs net protocol revenue | Separate metric IDs, separate registry entries |
| Buyback vs burned | Explicit metric IDs: `buyback.inflows` vs `buyback.burned` |
| Accounts vs people | UI says "unique sender addresses" or "active accounts" — never "people" |
| Volume vs fees vs revenue | Distinct metric IDs, distinct units |

---

## Data Mode Policy

| Mode | Definition | Artifact Field | Dashboard Banner |
|------|------------|----------------|------------------|
| `live` | Pipeline ran against real APIs just now | `"mode": "live"` | Green — retrieval timestamp |
| `snapshot` | Committed real aggregated data from earlier live run | `"mode": "snapshot"` | Amber — snapshot date |
| `synthetic` | Generated fixtures for unit tests only | `"mode": "synthetic"` | **Red** — watermark |

**Invariant**: Pipeline refuses to combine artifacts with different modes.

---

## Statistical Method (Plan 07)

### Transforms
- **Stationary transforms**: Log-differences (log x_t - log x_t-1)
- **Primary frequency**: Weekly (ISO weeks)
- **Minimum n**: 52 weekly observations
- **Missing weeks**: Dropped, never interpolated

### Inference
- **Primary**: Stationary block bootstrap CIs (1000 resamples, block length 10)
- **Multiple testing**: Benjamini–Hochberg FDR across all lags tested
- **Market control**: Partial correlation controlling for BTC/ETH returns
- **Reporting**: Effect size + CI + n (never p-value alone)

### Structural Breaks
- Pre/post 2026-02-23 (buyback programme start)
- Exclude 14 days post 2026-10-01 (Omni exploit)
- Results reported for each subsample

### Pre-Registration
- All hypotheses, thresholds, kill criteria frozen at tag `prereg-v1`
- Amendments append-only in `thesis/PREREGISTRATION.md` with date, change, rationale
- Machine-readable hypotheses in `thesis/hypotheses.yaml`

---

## Known Limitations

1. **Accounts ≠ humans**: "Active accounts" = distinct signer addresses with ≥1 tx/day. Multi-sig, exchanges, bots inflate counts.

2. **Addresses ≠ people**: Multi-chain individuals = multiple addresses. "Unique sender addresses" used, never "people".

3. **Confidential flows**: Intents CONFIDENTIAL_INTENTS deposit/recipient types not fully visible.

4. **Explorer coverage**: 1Click API documents only its own coverage; other integrators may differ.

5. **Price conversion**: NEAR↔USD conversion introduces noise; revenue in NEAR is primary.

6. **Timing mismatch**: Fees accrue per swap; sweeps to protocol wallets happen later with variable lag.

7. **BigQuery quota**: Free tier 1 TB/month limits backfill; revenue wallet outflows pending quota reset.

8. **Buyback ≠ burned**: Onchain evidence shows bought-back NEAR held, not burned. Revenue.near.org claims "permanently removed".

---

## Value Capture Model (Plan 06)

**Formula**: V* = NetIssuance × P₀ × 10,000 / (r × c × b × φ) for burned; without φ for buyback

| Parameter | Symbol | Measured Value | Source |
|-----------|--------|----------------|--------|
| Annualized Volume | V₀ | $3.8B | Trailing 90d × 4 |
| Gross Take Rate | r | 16 bps | DefiLlama fees / volume |
| Capture Rate | c | 35% | DefiLlama holders revenue / fees |
| Buyback Allocation | b | 40% | Buyback wallet inflows / net revenue |
| Burned Fraction | φ | 0% | Onchain buyback wallet trace |
| NEAR Price | P₀ | $3.50 | DefiLlama/CoinGecko |
| Gross Issuance | m | 2.5%/yr | NEAR protocol parameters |

**Key finding**: With φ=0, burned breakeven unreachable. Buyback breakeven ~13.5× current volume.

**All outputs are modeled — not predictions.**

---

## Reproducibility

- `make rebuild MODE=snapshot` — deterministic from committed data
- `make rebuild MODE=live` — from APIs (requires credentials)
- `data/manifest.json` — sha256 per artifact, git commit, mode, timestamps
- `make verify` — registry ↔ artifacts, claims lint, manifest hashes, prereg freeze
