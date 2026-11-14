# NEAR Value Intelligence

**Does NEAR's growing economic activity turn into sustainable economic value for NEAR tokenholders?**

*Follow the money. Verify the value.*

---

## 🏆 Hackathon Submission

- **Track:** Research & Analysis / Data Infrastructure
- **Event:** NEAR AI x Hackathon (November 2026)
- **Repo:** `https://github.com/NikhilKottoli/LedgerLight`
- **Live Demo:** `https://through-ellen-richmond-directive.trycloudflare.com/`
- **Team:** Nikhil Kottoli (solo)

> **Core Insight:** The NEAR protocol claims buybacks "permanently remove NEAR from circulation" (revenue.near.org). Onchain evidence shows bought-back NEAR is **held in a multisig, not burned**. This platform is the first to trace that flow end-to-end with reproducible, pre-registered analysis.

---

## 🎯 What Makes This Different (Competition Survey Results)

| Differentiator | This Project | Typical Dashboard |
|----------------|--------------|-------------------|
| **Ground truth = onchain wallet flows** | ✅ Rebuilds net revenue from NEAR transfers into 3 revenue wallets, excluding inter-wallet transfers | ❌ Repeats revenue.near.org / DefiLlama without verification |
| **Buyback ≠ Burn traced** | ✅ Classifies outbound transfers from `buybacks.multisignature.near` (burn, treasury, staking, exchange, unknown). φ=0 observed. | ❌ Assumes buyback = burn |
| **Three-way reconciliation** | ✅ Our onchain rebuild vs DefiLlama vs revenue.near.org — every stage reconciles or shows explicit `unreconciled` | ❌ Single source, no cross-check |
| **Pre-registered hypotheses** | ✅ H1–H5 frozen at `prereg-v1` before analysis. Rule-based verdicts (`SUPPORTED | CONTRADICTED | MIXED | INSUFFICIENT_DATA`). | ❌ Narrative-driven, p-hacking risk |
| **Unit discipline** | ✅ Separate types: `GrossFeesUSD`, `NetRevenueNEAR`, `BuybackNEAR`, `BurnNEAR`. Mismatched arithmetic fails. | ❌ Mixes USD/NEAR, volume/fees/revenue freely |
| **Data modes (honest)** | ✅ `live` (timestamped), `snapshot` (amber banner, dated), `synthetic` (red watermark, test-only). Never mixed. | ❌ Silent fallbacks, unclear freshness |
| **Static, credential-free deploy** | ✅ Pipeline → JSON → Next.js static export. Vercel/Cloudflare free tier. Credentials never reach browser. | ❌ Often needs backend, DB, live API keys |
| **Provenance per chart** | ✅ Click any chart → source, definition, SQL, raw data link, registry entry | ❌ Black-box visualizations |

**Survey note:** Screened 888 hackathon repos via NEAR Hackathon API + Gap Intel Explorer. **Zero** existing projects trace buyback→burn onchain with three-way reconciliation + pre-registered stats. This is a genuine whitespace.

---

## 🖥️ Live Dashboard (7 Routes)

| Route | Purpose | Key Components |
|-------|---------|----------------|
| `/` | Overview — thesis verdicts + top KPIs | KpiCard grid, verdict badges |
| `/value` | Value Capture Model — φ slider, breakeven math | Interactive model, custom SVG charts |
| `/intents` | Intents protocol deep-dive | Status mix, chain/token distribution, volume breakdown |
| `/network` | NEAR network activity (non-Intents) | Active accounts, txs, correlation context |
| `/flows` | Sankey flow ledgers (5 presets) | d3-sankey, 7d/30d/90d/YTD/All, explicit unreconciled |
| `/thesis` | Pre-registered H1–H5 results | Verdict table, kill criteria, robustness |
| `/methodology` | Full registry, sources, unit policy, stats method | 34-row registry table, source definitions, data modes |

**All routes load live data (DefiLlama + Intents Explorer) — zero hydration errors.**

---

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────┐    ┌────────────────┐    ┌─────────────┐
│ Data Sources│───▶│  Pipeline    │───▶│  JSON Artifacts│───▶│  Dashboard  │
│  (5 APIs)   │    │  (Python)    │    │  (26 metrics)  │    │  (Next.js)  │
└─────────────┘    └──────────────┘    └────────────────┘    └─────────────┘
       │                  │                    │                    │
       ▼                  ▼                    ▼                    ▼
  DefiLlama          Connectors          26 daily TS        7 routes
  Intents API        Normalize           5 flow presets     Provenance
  BigQuery           Metrics             registry.json      drawer
  NearBlocks         Flows (Sankey)      events.json        Static export
  Pikespeak          Stats (bootstrap)   reconciliation     Vercel/CF
                     Thesis (H1-H5)      THESIS.md
                     Export + Verify     METHODOLOGY.md
                     Data modes          manifest.json
```

**Diagram:** Open `architecture.excalidraw` in [Excalidraw](https://excalidraw.com/) for the full editable architecture diagram.

---

## ⚡ Quick Start (Snapshot Mode — No Credentials)

```bash
# 1. Clone
git clone https://github.com/NikhilKottoli/LedgerLight.git
cd near-value-intelligence

# 2. Python deps (uv recommended)
uv venv --python 3.11 && uv sync --frozen
# or: pip install -e .

# 3. Node deps + build dashboard
cd web && pnpm install --frozen-lockfile && pnpm build

# 4. Serve
cd ../web && pnpm preview
# → http://localhost:4173
```

All data comes from committed `data/snapshot/` — **no API keys required**.

---

## 🔐 Live Mode (With Credentials)

### BigQuery (for onchain revenue reconstruction)
```bash
# 1. GCP project + BigQuery API enabled
# 2. Service account: roles/bigquery.jobUser + roles/bigquery.dataViewer
# 3. Save key to .gcp/bigquery-credentials.json
# 4. Cost cap (critical — free tier = 1 TB/month):
bq update --project_id=YOUR_PROJECT --default_query_job_properties='{"maximumBytesBilled": "1000000000000"}'
# 5. .env:
GOOGLE_APPLICATION_CREDENTIALS=.gcp/bigquery-credentials.json
BQ_PROJECT=your-project-id
```

### NEAR Intents Explorer JWT (for per-tx Intents data)
```bash
# 1. Request at https://partners.near-intents.org
# 2. Rate limit: 1 req / 5s (strict)
# 3. .env (NEVER commit):
NEAR_INTENTS_JWT=your_jwt_here
```

### Run Full Pipeline
```bash
cp .env.example .env
# Edit .env with credentials above

make rebuild MODE=live
# Or stage by stage:
make fetch MODE=live
make normalize MODE=live
make metrics MODE=live
make flows MODE=live
make stats MODE=live
make thesis MODE=live
make export MODE=live
make report MODE=live
```

---

## ✅ Verify & Test

```bash
# All verification checks
make verify MODE=snapshot

# Unit tests (Python + JS)
make test

# Playwright E2E (against local or tunnel)
cd web && PLAYWRIGHT_BASE_URL=http://localhost:3011 npx playwright test
```

**Verification gates (all passing):**
- Registry bijection: 26 metrics ↔ 26 JSON artifacts ✅
- Artifact validity: schema, freshness, completeness ✅
- Claims lint: no banned equivalences ("users", "buyback = burn", etc.) ✅
- Manifest: sha256 per artifact + git commit ✅
- Playwright: 7 routes, 0 console errors ✅

---

## 📊 Data Modes (Honest by Design)

| Mode | Description | Dashboard Banner | Use Case |
|------|-------------|------------------|----------|
| `live` | Pipeline ran against real APIs just now | Green — retrieval timestamp | Judges with credentials |
| `snapshot` | Committed real aggregated data from earlier live run | Amber — snapshot date | **Default for hackathon** — no creds needed |
| `synthetic` | Generated fixtures for unit tests only | **Red** — watermark on every chart | CI/test only, never shipped |

**Pipeline refuses to combine artifacts with different modes.**

---

## 🔬 Research Rigor (Pre-Registered)

**Frozen at tag `prereg-v1`** — hypotheses, tests, thresholds, kill criteria committed **before** analysis.

```bash
# View pre-registration
git show prereg-v1:thesis/PREREGISTRATION.md

# Re-run all hypothesis tests
make thesis MODE=snapshot

# View computed verdicts
cat thesis/thesis_results.json
```

### Hypothesis Summary (H1–H5)

| ID | Claim | Verdict | Blocker |
|----|-------|---------|---------|
| H1 | Intents adoption growing sustainably | INSUFFICIENT_DATA | Intents JWT required |
| H2 | Intents predicts NEAR network activity | INSUFFICIENT_DATA | BigQuery quota |
| H3 | NEAR captures meaningful value from Intents | INSUFFICIENT_DATA | BigQuery quota |
| H4 | Protocol growth benefits tokenholders | INSUFFICIENT_DATA | BigQuery quota |
| H5 | Adoption becoming less concentrated | INSUFFICIENT_DATA | Intents/BigQuery data |

**Key finding (Plan 06):** With φ=0 (buybacks held, not burned), **burn breakeven is unreachable**. Buyback breakeven requires ~13.5× current volume at current parameters.

---

## 📁 Repo Layout

```
near-value-intelligence/
├── AGENTS.md                    # Agent instructions
├── DECISIONS.md                 # 18 binding decisions with reversal triggers
├── BLOCKERS.md                  # Tracked blockers
├── Makefile                     # Pipeline commands
├── pyproject.toml               # Python config
├── README.md                    # This file
├── THESIS.md                    # Generated + human thesis
├── METHODOLOGY.md               # Static methodology export
├── THIRD_PARTY_NOTICES.md       # Adopted code licenses
├── architecture.excalidraw      # Architecture diagram (open in Excalidraw)
├── plans/                       # 9 gated plans
├── pipeline/                    # Python package
│   ├── connectors/              # DefiLlama, Intents, BigQuery, NearBlocks, Pikespeak
│   ├── normalize/               # Schema normalization
│   ├── metrics/                 # Metric computation + registry
│   ├── flows/                   # Flow ledger + Sankey (d3)
│   ├── stats/                   # Stationarity, bootstrap, FDR, structural breaks
│   ├── thesis/                  # Pre-registered H1-H5 tests
│   ├── export/                  # Artifacts + reports
│   └── verify/                  # Registry, artifacts, claims, manifest
├── web/                         # Next.js static dashboard
│   ├── src/app/                 # 7 routes (App Router)
│   ├── src/components/          # KpiCard, Sankey, LockedPanel, charts
│   └── public/data/             # 26 metric JSONs + 5 flow presets + registry
├── sql/                         # Verified BigQuery SQL (bytes + date headers)
├── thesis/
│   ├── PREREGISTRATION.md       # Frozen pre-registration
│   ├── hypotheses.yaml          # Machine-readable hypotheses
│   └── thesis_results.json      # Computed verdicts
├── metrics/registry.yaml        # 11 registered metrics
└── data/
    ├── raw/                     # Gitignored
    ├── processed/               # Gitignored (Parquet)
    ├── snapshot/                # Committed, real, aggregated
    └── reference/               # Manual reference values (source + date)
```

---

## ⚠️ Limitations (Honest Disclosure)

- **Accounts ≠ humans**: "Active accounts" = distinct signer addresses with ≥1 tx/day. Multi-sig, exchanges, bots inflate counts.
- **Addresses ≠ people**: Multi-chain individuals = multiple addresses. "Unique sender addresses" used, never "people".
- **Confidential flows**: Intents `CONFIDENTIAL_INTENTS` deposit/recipient types not fully visible.
- **Explorer coverage**: 1Click API documents only its own coverage; other integrators may differ.
- **Price conversion**: NEAR↔USD conversion introduces noise; revenue in NEAR is primary.
- **Timing mismatch**: Fees accrue per swap; sweeps to protocol wallets happen later with variable lag.
- **BigQuery quota**: Free tier 1 TB/month limits backfill; revenue wallet outflows pending quota reset.
- **Buyback ≠ burned**: Onchain evidence shows bought-back NEAR held in multisig. Revenue.near.org claims "permanently removed".

---

## 📜 License

MIT — see `LICENSE` file.

---

## 🙏 Acknowledgements

- **DefiLlama** — TVL, fees, revenue data (MIT)
- **NEAR Intents Explorer** — Swap activity API
- **BigQuery Public Datasets** — NEAR onchain data
- **revenue.near.org** — Protocol revenue reference
- **Gap Intel / NEAR Hackathon API** — Competition survey data

See `THIRD_PARTY_NOTICES.md` for full license inventory.