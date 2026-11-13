# DECISIONS.md

Binding decisions for the build. Each has a rationale and a **Reverse if** trigger.
If a trigger fires, log it in `BLOCKERS.md` and wait for a human.

---

## A. Facts verified on Nov 13, 2026 (re-verify before relying on them)

These come from fetching the sources named in the original plan. They shaped the decisions below.

| # | Fact | Source | Why it matters |
|---|---|---|---|
| F1 | Hackathon API returns `{projects, total, page, pageSize}`. At fetch time `total=879`, `pageSize=8` (~110 pages). Projects carry `tracks[]` and `demo_url` (X posts). | nearhackathon.com/api/projects | Paginate from metadata. Politeness delay needed. |
| F2 | Gap Intel explorer exposes a JSON API that "maps 1:1" from its explore URL, with repo links and scored dimensions for ~591 projects. | near-gap-intel.vercel.app/explore, `/docs` | Fastest way to find repos. Cross-check against the hackathon API. |
| F3 | A direct thesis-track competitor exists: **"near-thesis: NEAR on the evidence"** (demo: x.com/soldanoandrea/status/2116498437860647095). | hackathon API | Inspect it first. It may already do part of this plan. |
| F4 | Explorer API: JWT required (from partners.near-intents.org). **1 request / 5 s per partner.** Max 1000 tx/request. Cursor pagination by `lastDepositAddress` + `lastDepositMemo`, `direction=next` (older) / `prev` (newer). Start/end timestamp filters are **non-inclusive**. | docs.near-intents.org Explorer API | Backfill is slow. Day-window resumable ingestion is required. |
| F5 | Explorer tx fields include `amountInUsd`, `amountOutUsd`, `appFees[{recipient, fee}]`, `status` (SUCCESS, FAILED, REFUNDED, PROCESSING, PENDING_DEPOSIT, INCOMPLETE_DEPOSIT), `depositType`/`recipientType` incl. `CONFIDENTIAL_INTENTS`, `senders[]`, `nearTxHashes[]`, `refundReason`. In-flight swaps report amounts as 0. `showTestTxs` exists. Some filters exclude "masking transactions". | same | Fee attribution by recipient is possible. Volume must exclude in-flight and test txs. Confidential flows may be partly invisible. |
| F6 | revenue.near.org is a JS-rendered dashboard. No documented API. Footer says figures "shown are illustrative". All fees denominated in NEAR. It lists three revenue wallets: `fefundsadmin.sputnik-dao.near` (46.4%), `buybacks.multisignature.near` (40.8%), `1csfundsadmin.sputnik-dao.near` (12.8%) (all-time NEAR, ≈4.34M NEAR total). Fee-capture categories: front-end fees, quote improvement, B2B partners. | revenue.near.org | **Revenue is verifiable onchain.** Treat the dashboard as a cross-check, not a source. |
| F7 | DefiLlama defines Revenue as "NEAR/wNEAR swept into its revenue wallets", transfers between those wallets excluded. Fees = protocol fee + affiliate fee, gross. Holders revenue = since **2026-02-23** revenue used to buy back NEAR on the open market, "**not burned**". API: `https://api.llama.fi/protocol/near-intents`. | defillama.com/protocol/near-intents | **Conflict:** revenue.near.org says buybacks "permanently remove NEAR from circulation"; DefiLlama says not burned. Resolving this onchain is a headline finding. |
| F8 | DefiLlama (read as of ~Nov 3, 2026): cumulative fees $58.27M, revenue $9.35M; 30d fees $6.01M, revenue $2.1M, DEX volume $3.897B. Monthly fees were roughly flat ($3–4M) from Dec 2025–Aug 2026, then ~$6–7M in Sep–Oct 2026. TVL peaked $267M on Sep 28, 2026, ~$192M by Nov 3. | same | Use as **sanity anchors** for reconciliation tests (tolerance bands). Not as inputs to hardcode. |
| F9 | **Oct 1, 2026: $3.8M exploit** of the Omni deposit/withdrawal infrastructure. Funds to be compensated. | DefiLlama hacks section | Must be an annotated event on all time series. Test H1/H3 with and without a post-event window. |

---

## B. Architecture decisions

### D1. Static-first. No FastAPI. No Postgres.
- Pipeline (Python) → `data/processed/*.parquet` (DuckDB for SQL transforms) → `web/public/data/*.json` → Next.js reads static JSON only.
- **Why:** the original asks for Postgres + FastAPI "if needed". Nothing here needs a live backend. Static output makes `make rebuild` deterministic, deploys free to Vercel, and keeps credentials off the server entirely.
- **Reverse if:** a feature needs server-side filtering over data too large to ship (see D11).

### D2. Three data modes, and a real committed snapshot (not synthetic demo data)
- `live`, `snapshot`, `synthetic` as defined in `AGENTS.md`.
- Commit a **real, aggregated** snapshot (daily series, flow ledgers, thesis results; no raw tx dumps) after the first successful live run.
- **Why:** judges without credentials still see real numbers, honestly dated. Synthetic data is only for tests.
- **Reverse if:** snapshot exceeds ~25 MB.

### D3. Revenue ground truth = onchain wallet flows
- Rebuild net revenue from NEAR/wNEAR transfers into the revenue wallets (F6, F7), excluding inter-wallet transfers.
- Three-way reconcile: **our onchain rebuild** vs **DefiLlama** vs **revenue.near.org** (manually recorded reference values in `data/reference/`, with date and URL).
- **Why:** this is "verify the value" made literal, and it is the strongest differentiator against dashboards that just repeat revenue.near.org.
- **Reverse if:** BigQuery cannot see these transfers (freshness or schema). Fallback: NearBlocks API for the three wallets (low tx count). Check ToS and rate limits.

### D4. The Sankey starts at gross fees, not swap volume
- Volume is not a flow of money into fees. It is shown as a context strip above the diagram with the effective take rate (bps).
- Flow: **Gross fees (USD) → partner/affiliate payouts | solver/other | net revenue swept to protocol wallets → buyback | held | spent/other | unknown → burned | held | recirculated | unknown.**
- Implemented with `d3-sankey` + custom React rendering (React Flow is not a Sankey tool).
- Periods are presets (7d, 30d, 90d, YTD, all-time) generated offline, not arbitrary ranges.
- Residuals are explicit "Unreconciled" nodes. A negative residual is shown with a warning (it means definitions differ).

### D5. Buyback ≠ burn is traced, not assumed
- Trace outbound transfers of `buybacks.multisignature.near`: classify counterparties (burn/dead address, treasury, staking, exchange, other, unknown).
- In the model, `burn_fraction` defaults to the **observed** fraction. If unobservable, show a band (0 to 1) and label it unknown. Never default to 1.

### D6. Unit policy
- Pre-sweep stages (volume, gross fees, app fees): **USD** (Explorer provides USD).
- Post-sweep stages (revenue wallets onward): **NEAR**. USD view is derived using daily NEAR price, flagged `derived` with the price source.
- Statistical tests on revenue use **NEAR-denominated** series, to avoid mechanical correlation with NEAR price.

### D7. Intents ingestion is day-window resumable and idempotent
- One day window at a time (`startTimestampUnix`/`endTimestampUnix`, non-inclusive, so overlap by 1 s and dedupe on `(depositAddress, depositMemo)`).
- Default backfill: last **90 days**, extendable with `BACKFILL_DAYS`. Throttle to ≥6 s between requests. No parallel processes on one JWT.
- Fallback chain if no JWT: DefiLlama DEX volume/fees (daily aggregates only) → mark all per-tx, per-chain, per-token, per-sender features `unavailable`.
- **Day-0 task for the human:** get the JWT. Everything in Intents depends on it.

### D8. Pre-registration and rule-based verdicts
- Hypotheses, tests, thresholds and kill criteria are committed in `thesis/PREREGISTRATION.md` **before any analysis is run**. Later changes go in an append-only Amendments section.
- Verdicts (`SUPPORTED | CONTRADICTED | MIXED | INSUFFICIENT_DATA`) are computed by rule from the thresholds.
- **Why:** this is what separates research from a dashboard with a narrative, and protects against p-hacking.

### D9. Statistical method (defaults)
- Work on stationary transforms (log-differences / growth rates), not levels. Check with ADF.
- Primary frequency: **weekly** (daily as robustness). Minimum n = 52 weekly observations or report `INSUFFICIENT_DATA`.
- Lag scans reported with stationary-block-bootstrap CIs and Benjamini–Hochberg FDR across all lags tested.
- Partial correlations controlling for market returns (BTC, ETH, or a broad index from the price source).
- Structural-break subsamples: before/after **2026-02-23** (buyback start) and excluding the **14 days after 2026-10-01** (exploit).
- Report effect size + CI + n, never p-value alone.

### D10. Break the circularity in H2
- Intents settles via a NEAR contract, so NEAR tx counts rise mechanically with Intents use.
- Decompose NEAR activity into **intents-attributable** (receipts to the Intents contract; verify its account id) vs **other**. Test H2 on the "other" series.

### D11. Transaction explorer is a bounded sample
- Ship: most recent N (default 5,000) + top 1,000 by USD + any tx referenced by a Sankey/thesis evidence link. Link out to explorer.near-intents.org for the rest.
- Filter charts use pre-aggregated cubes: `date × origin_chain × dest_chain × status` and `date × token × status` (top 15 + "other"). Joint chain×token filtering is documented as unsupported.

### D12. BigQuery cost controls
- Every query: dry-run first, `maximum_bytes_billed` cap (default 100 GB, env-configurable), partition filter on `block_date`, bytes scanned recorded in the SQL file header and `data/query_log.jsonl`.
- First step of the integration: check `MAX(block_date)`. If the public dataset is stale, stop and log a blocker.

### D13. Make illegal states unrepresentable
- Separate types for `GrossFeesUSD`, `NetRevenueNEAR`, `BuybackNEAR`, `BurnNEAR`, etc. Arithmetic between mismatched types fails type-checking or raises.
- A `claims lint` test scans generated text and UI strings for banned equivalences ("users" without "addresses", "revenue" next to "volume" in the same equation, "burn" for buyback).

### D14. Vertical slice before breadth
- Plan 02 ends with ONE metric working end-to-end: source → registry → JSON → chart → provenance drawer → `make rebuild`. All later work follows that pattern.

### D15. Scope cut line
- **Must ship:** plans 01–05, H1/H3/H4 tests, flow explorer, provenance, README/THESIS.
- **Should ship:** plan 06 model, H2/H5, network retention.
- **Cut in this order if time runs out:** (1) NEAR-account cohort retention, (2) contract-level activity charts, (3) rolling-correlation UI, (4) DefiLlama DEX/TVL comparison panel, (5) transaction explorer filters.

### D16. Naming
- Say "unique sender addresses" (Intents) and "active accounts" (NEAR). Never "users".

### D17. Edge cases for Intents data
- Volume = `amountInUsd` of `SUCCESS` swaps, test txs excluded (`showTestTxs` off). Report `REFUNDED/FAILED` separately.
- Exclude in-flight (amount 0) from volume; count them.
- Record share of `CONFIDENTIAL_INTENTS` deposit/recipient types as a completeness caveat.
- Verify `appFees.fee` units (likely bps) by comparing against `(amountInUsd − amountOutUsd)/amountInUsd` on sampled txs. Document the finding.

### D18. Repo license is MIT
- **Reverse if:** a reused component forces another license.

---

## C. Open questions for the human (answer before plan 03)

1. **Intents JWT obtained?** (partners.near-intents.org). If not, plan 04 runs in fallback mode.
2. **GCP project with BigQuery access and billing/quota?**
3. **Hackathon deadline?** Sets how much of the "should ship" list is realistic.
4. **Deploy target?** Default assumption: Vercel, static.
5. **Confirm the default thresholds** in plan 07 before pre-registration is committed.
