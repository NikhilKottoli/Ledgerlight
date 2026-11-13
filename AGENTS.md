# AGENTS.md — NEAR Value Intelligence

Read this file at the start of every session. It applies to every plan in `plans/`.

**Product:** evidence-first research platform answering one question:
*Does NEAR's growing economic activity turn into sustainable economic value for NEAR tokenholders?*
**Tagline:** Follow the money. Verify the value.

The conclusion must come from the data, even if it contradicts the bullish hypothesis.

---

## 1. How to work

1. Work on ONE plan file at a time (`plans/NN-*.md`). Do not start a later plan early.
2. Read `DECISIONS.md` first. Decisions there are binding. If one is wrong, write the problem in `BLOCKERS.md` and stop. Do not silently deviate.
3. Do tasks in order. Commit after each task: `plan-NN: <task> — <what changed>`.
4. Each plan ends with a **GATE**. Run every gate check. Print a pass/fail table. Then STOP and wait for a human.
5. If you are blocked (missing credential, API changed, table does not exist, data stale), append to `BLOCKERS.md` with: what you tried, the exact error, and options. **Never fake data to get past a blocker.**
6. Prefer boring tools. No Kubernetes, no microservices, no new frameworks beyond those named in `DECISIONS.md`.
7. Time-box exploration. If an investigation exceeds its stated time-box, stop and report.

## 2. Data integrity rules (mandatory, enforced by tests)

1. Never fabricate, interpolate, backfill, or silently substitute a value. Missing = `null` + a reason.
2. Every metric has an entry in `metrics/registry.yaml` (source, definition, query/calculation, unit, kind, coverage, freshness, completeness, limitations). A chart without a registry entry is a bug.
3. Every metric is tagged `measured | derived | modeled`.
   - `measured`: read directly from a source (e.g. daily tx count).
   - `derived`: deterministic calculation from measured data (e.g. take rate, Gini).
   - `modeled`: depends on a human assumption (anything in the Value Capture Model).
4. Never mix these pairs. Use distinct types (Python `NewType`/pydantic models, TS branded types):
   - swap volume vs fees vs revenue
   - gross fees vs net protocol revenue
   - buyback vs burn
   - accounts/addresses vs humans
   - USD-denominated vs NEAR-denominated amounts
5. UI and generated text say "unique sender addresses" or "active accounts". Never "users" or "people" without that qualifier.
6. Never plug a gap to make a flow balance. Show an explicit `unreconciled` amount.
7. When two sources disagree, show both, show the delta, and investigate definitions. Do not pick the favourable one.
8. No claim of statistical significance without the test, the effect size, the CI and the sample size. Correlation is never described as causation.
9. Generated research text is produced by deterministic templates from computed results. No LLM calls at build or runtime.
10. If a metric cannot be computed, record why in `THESIS.md` under "Not computable".

## 3. Modes

| Mode | Meaning | UI |
|---|---|---|
| `live` | Pipeline ran against real APIs with credentials just now | Shows retrieval timestamp |
| `snapshot` | Committed real aggregated data from an earlier live run | Persistent amber banner with snapshot date |
| `synthetic` | Generated fixtures for unit tests only | Loud red banner + watermark on every chart. Never shipped as the default |

Every JSON artifact carries `data_mode`. The pipeline refuses to combine artifacts with different modes.

## 4. Repo conventions

- Python 3.11+, `uv`, `ruff`, `pytest`, `pydantic`, `pandas`, `duckdb`, `pyarrow`.
- Node 20+, `pnpm`, Next.js (App Router), TypeScript strict, Tailwind, shadcn/ui, Recharts, d3-sankey, zod, vitest, Playwright.
- Layout:
  ```
  pipeline/        python package: connectors/, normalize/, metrics/, flows/, stats/, thesis/, export/
  sql/             verified BigQuery SQL, one file per query, header comment with bytes-scanned + date verified
  web/             Next.js app (static data only)
  metrics/registry.yaml
  thesis/PREREGISTRATION.md, thesis/hypotheses.yaml
  data/raw/        gitignored
  data/processed/  gitignored (parquet)
  data/snapshot/   committed, real aggregated data, small
  data/reference/  committed, manual reference values (with source + date)
  research/        P0 research outputs
  plans/           these plans
  ```
- Secrets only via env vars. `.env` is gitignored. `.env.example` is committed. Credentials never reach the browser or any committed file.
- Determinism: sorted outputs, fixed seeds, no wall-clock in calculations (wall-clock only in `retrieved_at`). Each export writes `data/manifest.json` with sha256 per artifact and the git commit.

## 5. Licensing rules

- Our repo license: MIT.
- Reuse code ONLY if the actual `LICENSE` file in the repo is MIT, Apache-2.0, BSD or ISC. Read the file. Do not trust the README or the author.
- No license file = all rights reserved = do not copy. Reimplement from the idea.
- GPL/AGPL/other copyleft = do not copy.
- Copied or adapted code keeps its copyright header and gets a `THIRD_PARTY_NOTICES.md` entry (repo URL, commit SHA, file path, license, what changed).
- Reading a repo to learn a data definition is fine. Copying its code is a licensing decision.

## 6. Definition of done for any task

- Code runs from a clean checkout using documented commands.
- Tests added or updated and passing (`make test`).
- New metrics registered; new SQL has a verified header.
- No secrets, no large raw data committed.
- You can state exactly what is measured, derived or modeled.
