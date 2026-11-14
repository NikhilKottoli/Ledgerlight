# NEAR Value Intelligence

**Does NEAR's growing economic activity turn into sustainable economic value for NEAR tokenholders?**

*Follow the money. Verify the value.*

---

## What It Is

NEAR Value Intelligence is an evidence-first research platform that traces Intents protocol revenue from gross fees through to tokenholder-relevant outcomes (buybacks, burns, supply changes). It answers one question with reproducible, pre-registered analysis:

> **Does NEAR capture meaningful value from Intents, and does that value accrue to tokenholders?**

The platform combines:
- **Onchain data** (BigQuery public NEAR datasets)
- **Market data** (DefiLlama TVL, fees, revenue)
- **Intents activity** (NEAR Intents Explorer API)
- **Pre-registered statistical tests** with rule-based verdicts

All outputs are deterministic, static-exported, and inspectable — every chart links to its SQL, source, and raw data.

---

## Screenshots

| Network | Flows | Thesis Lab |
|---------|-------|------------|
| ![Network](docs/screenshots/network.png) | ![Flows](docs/screenshots/flows.png) | ![Thesis](docs/screenshots/thesis.png) |

| Value Capture Model | Intents | Methodology |
|---------------------|---------|-------------|
| ![Value](docs/screenshots/value.png) | ![Intents](docs/screenshots/intents.png) | ![Methodology](docs/screenshots/methodology.png) |

---

## Quick Start (Snapshot Mode — No Credentials, 3 Commands)

```bash
# 1. Clone and install
git clone https://github.com/your-org/near-value-intelligence
cd near-value-intelligence

# 2. Install Python dependencies
pip install -e .

# 3. Install Node dependencies and build dashboard
cd web && pnpm install --frozen-lockfile && pnpm build

# 4. Serve static dashboard
cd ../web && pnpm preview
# or: npx serve out/
```

The dashboard runs at `http://localhost:4173` (or whatever `serve` uses). All data comes from the committed `data/snapshot/` — no API keys required.

---

## Installing Dependencies

### Python (3.11+)
```bash
# Using uv (recommended)
uv venv --python 3.11
uv sync --frozen

# Or pip
pip install -e .
```

### Node (20+)
```bash
cd web && pnpm install --frozen-lockfile
```

---

## Configuring BigQuery

1. **Create a GCP project** and enable the BigQuery API
2. **Create a service account** with `roles/bigquery.jobUser` and `roles/bigquery.dataViewer`
3. **Download the JSON key** and save as `.gcp/bigquery-credentials.json`
4. **Set cost caps** (critical — free tier is 1 TB/month):
   ```bash
   bq update --project_id=YOUR_PROJECT --default_query_job_properties='{"maximumBytesBilled": "1000000000000"}'
   ```
5. **Add to `.env`**:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=.gcp/bigquery-credentials.json
   BQ_PROJECT=your-project-id
   ```

---

## Configuring the NEAR Intents JWT

**Required for live Intents ingestion.** Without it, Intents pages show "Data Unavailable" panels.

1. Go to <https://partners.near-intents.org> and request a partner JWT
2. **Rate limit**: 1 request per 5 seconds (strictly enforced)
3. **Never commit the JWT** — add to `.env` only:
   ```bash
   NEAR_INTENTS_JWT=your_jwt_here
   ```
4. The pipeline respects the 5s throttle automatically

---

## Fetching Data & Rebuilding

### Snapshot Mode (Offline, No Credentials)
```bash
make rebuild MODE=snapshot
```

### Live Mode (Requires Credentials)
```bash
# Configure .env with BigQuery credentials and Intents JWT
cp .env.example .env
# Edit .env with your credentials

make rebuild MODE=live
```

### Pipeline Stages (Run Individually)
```bash
make fetch MODE=live          # Pull from all sources
make normalize MODE=live      # Normalize to common schema
make metrics MODE=live        # Compute registered metrics
make flows MODE=live          # Build flow ledgers (5 presets)
make stats MODE=live          # Run pre-registered statistical tests
make thesis MODE=live         # Run H1-H5 verdicts
make export MODE=live         # Write JSON artifacts to public/data/
make report MODE=live         # Generate THESIS.md, reconciliation tables
```

### Verify
```bash
make verify MODE=snapshot   # All checks
make test                   # Unit tests (Python + JS)
```

---

## Reproducing the Research

The thesis is **pre-registered** at git tag `prereg-v1`. All hypotheses, thresholds, and kill criteria were frozen before analysis ran.

```bash
# View the frozen pre-registration
git show prereg-v1:thesis/PREREGISTRATION.md

# Re-run all hypothesis tests
make thesis MODE=snapshot

# View results
cat thesis/thesis_results.json
```

### Hypothesis Summary (H1–H5)

| ID | Claim | Verdict |
|----|-------|---------|
| H1 | Intents adoption growing sustainably | INSUFFICIENT_DATA |
| H2 | Intents predicts NEAR network activity | INSUFFICIENT_DATA |
| H3 | NEAR captures meaningful value from Intents | INSUFFICIENT_DATA |
| H4 | Protocol growth benefits tokenholders | INSUFFICIENT_DATA |
| H5 | Adoption becoming less concentrated | INSUFFICIENT_DATA |

**Key finding (from Plan 06):** With φ=0 (onchain evidence: buybacks held, not burned), **burn breakeven is unreachable**. Buyback breakeven requires ~13.5× current volume at current parameters.

---

## Data Modes

| Mode | Description | Dashboard Banner |
|------|-------------|------------------|
| `live` | Pipeline ran against real APIs just now | Green — shows retrieval timestamp |
| `snapshot` | Committed real aggregated data from earlier live run | Amber — shows snapshot date |
| `synthetic` | Generated fixtures for unit tests only | **Red** — watermark on every chart |

**Never mixes modes** — the pipeline refuses to combine artifacts with different modes.

---

## Repo Layout

```
near-value-intelligence/
├── AGENTS.md                    # Agent instructions (read every session)
├── DECISIONS.md                 # 18 binding decisions with reversal triggers
├── BLOCKERS.md                  # Tracked blockers
├── Makefile                     # Pipeline commands
├── pyproject.toml               # Python project config
├── README.md                    # This file
├── THESIS.md                    # Generated + human thesis
├── THIRD_PARTY_NOTICES.md       # Adopted code licenses
├── METHODOLOGY.md               # Static methodology export
├── plans/                       # 9 gated plans
├── pipeline/                    # Python package
│   ├── connectors/              # DefiLlama, Intents, BigQuery
│   ├── normalize/               # Schema normalization
│   ├── metrics/                 # Metric computation + registry
│   ├── flows/                   # Flow ledger + Sankey
│   ├── stats/                   # Stationarity, bootstrap, FDR
│   ├── thesis/                  # Pre-registered tests
│   ├── export/                  # Artifacts + reports
│   └── verify/                  # Registry, artifacts, claims, manifest
├── web/                         # Next.js static dashboard
│   ├── src/app/                 # 7 routes
│   ├── src/components/          # KpiCard, Sankey, LockedPanel, etc.
│   └── out/                     # Static export
├── sql/                         # Verified BigQuery SQL (bytes + date headers)
├── thesis/
│   ├── PREREGISTRATION.md       # Frozen pre-registration
│   ├── hypotheses.yaml          # Machine-readable hypotheses
│   └── thesis_results.json      # Computed verdicts
├── metrics/registry.yaml        # 11 registered metrics
├── data/
│   ├── raw/                     # Gitignored
│   ├── processed/               # Gitignored (Parquet)
│   ├── snapshot/                # Committed, real, aggregated
│   └── reference/               # Manual reference values (source + date)
└── research/                    # P0 research outputs
```

---

## Limitations

- **Accounts ≠ humans**: "Active accounts" = distinct signer addresses with ≥1 tx/day. Multi-sig, exchanges, bots inflate counts.
- **Addresses ≠ people**: Multi-chain individuals = multiple addresses. "Unique sender addresses" used, never "people".
- **Confidential flows**: Intents CONFIDENTIAL_INTENTS deposit/recipient types not fully visible.
- **Explorer coverage**: 1Click API documents only its own coverage; other integrators may differ.
- **Price conversion**: NEAR↔USD conversion introduces noise; revenue in NEAR is primary.
- **Timing mismatch**: Fees accrue per swap; sweeps to protocol wallets happen later with variable lag.
- **BigQuery quota**: Free tier 1 TB/month limits backfill; revenue wallet outflows pending quota reset.
- **Buyback ≠ burned**: Onchain evidence shows bought-back NEAR held, not burned. Revenue.near.org claims "permanently removed".

---

## License

MIT — see `LICENSE` file.

---

## Acknowledgements

- **DefiLlama** — TVL, fees, revenue data (MIT)
- **NEAR Intents Explorer** — Swap activity API
- **BigQuery Public Datasets** — NEAR onchain data
- **revenue.near.org** — Protocol revenue reference
- **Hackathon submissions** — 888 repos screened for reuse/ideas

See `THIRD_PARTY_NOTICES.md` for full license inventory.
