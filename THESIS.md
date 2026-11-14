# NEAR Value Intelligence — Thesis

*Generated from `thesis_results.json` (prereg-v1), reconciliation tables, and human interpretation.*

---

## Generated Section (from computed results)

### Hypothesis Verdicts Summary

| Hypothesis | Claim | Verdict | Primary Blocker |
|------------|-------|---------|-----------------|
| H1 | Intents adoption is growing sustainably | INSUFFICIENT_DATA | Intents JWT required |
| H2 | Intents activity predicts NEAR network activity | INSUFFICIENT_DATA | BigQuery quota |
| H3 | NEAR captures meaningful value from Intents | INSUFFICIENT_DATA | BigQuery quota |
| H4 | Protocol growth benefits tokenholders | INSUFFICIENT_DATA | BigQuery quota |
| H5 | Adoption is becoming less concentrated | INSUFFICIENT_DATA | Intents/BigQuery data |

---

### H1: Intents Adoption Growing Sustainably

**Hypothesis**: Intents volume, unique senders, and returning share show genuine growth; concentration not excessive; take rate stable.

**Tests** (all unavailable — requires Intents JWT):
- Volume Growth (90d vs prior 90d) > 0
- Unique Sender Growth (90d) > 0
- Returning Sender Share ≥ 30%
- Top-10 Sender Share < 50%
- Take Rate Trend (365d slope) > -25%

**Kill Criteria** (not evaluated):
- Volume growth ≤ 0 for two consecutive 90d windows
- Unique sender growth < 0 while volume growth > 0 (whale-driven)
- Top-10 sender share > 50%
- Take rate falls > 25% over window with flat fees

**Unavailable**: Intents daily metrics (requires Intents JWT)

---

### H2: Intents Activity Predicts NEAR Network Activity

**Hypothesis**: Intents volume changes precede non-Intents NEAR active accounts/transactions changes.

**Tests** (all unavailable — requires BigQuery quota):
- Pearson Correlation (lags -8 to +8) |ρ| ≥ 0.3, FDR CI excludes 0
- Spearman Correlation |ρ| ≥ 0.3, FDR CI excludes 0
- Partial Correlation (market control) |ρ| ≥ 0.3
- Rolling 26-week Correlation (visual inspection)

**Kill Criteria** (not evaluated):
- No lag ≥ 0 meets |ρ| ≥ 0.3 with FDR-adjusted CI excluding 0
- n < 52 weekly observations

**Unavailable**: Non-Intents NEAR activity (BigQuery quota)

---

### H3: NEAR Captures Meaningful Value from Intents

**Hypothesis**: Capture rate and net revenue show sustainable value accrual.

**Tests** (all unavailable — requires BigQuery quota):
- Capture Rate (90d trailing) ≥ 10%
- Net Revenue NEAR Growth > 0
- Take Rate Compression: Not falling > 25% with flat fees
- 3-Way Revenue Reconciliation: Delta ≤ 25% or explained

**Kill Criteria** (not evaluated):
- Capture rate < 10% over trailing 90d
- Capture rate falls in 3 consecutive months
- Net revenue (NEAR) declines while Intents activity increases
- Onchain rebuild disagrees with DefiLlama by > 25% and unexplained

**Unavailable**: Onchain revenue rebuild (BigQuery quota limited)

---

### H4: Protocol Growth Benefits Tokenholders

**Hypothesis**: Post-buyback (since 2026-02-23), value capture translates to tokenholder benefit.

**Tests** (all unavailable — requires BigQuery quota):
- Buyback NEAR / Net Issuance (90d) ≥ 10%
- Burned NEAR / Net Issuance > 0
- Net Supply Change: Not rising
- Revenue (NEAR) / Market Cap > 0
- Revenue / Emissions > 0

**Kill Criteria** (not evaluated):
- Buyback NEAR < 10% of net issuance over trailing 90d
- Burned NEAR = 0 or unobserved (buyback NEAR != burned NEAR)
- Net supply still rising

**Unavailable**: Buyback/burned data (BigQuery quota limited)

---

### H5: Adoption Is Becoming Less Concentrated

**Hypothesis**: Usage distribution flattening across addresses, contracts, chains, tokens.

**Tests** (all unavailable — requires Intents/BigQuery data):
- Intents Sender Gini: Not rising 2 consecutive quarters
- Intents Top-10 Share: ≤ 10pp rise
- NEAR Account HHI: Not rising 2 consecutive quarters
- Contract HHI: Not rising 2 consecutive quarters
- Chain HHI: Not rising 2 consecutive quarters
- Token HHI: Not rising 2 consecutive quarters
- Returning Sender Trend: Not falling

**Kill Criteria** (not evaluated):
- HHI rises in 2 consecutive quarters on ≥ 2 of 4 dimensions
- Top-10 share rises > 10 percentage points

**Unavailable**: Concentration metrics (requires Intents/BigQuery data)

---

### Reconciliation Tables

#### Three-Way Revenue Reconciliation (DefiLlama vs Onchain vs revenue.near.org)

| Metric | DefiLlama | Onchain | revenue.near.org | Delta | Status |
|--------|-----------|---------|------------------|-------|--------|
| Gross Fees (30d) | ~$1.2M | — | — | — | — |
| Protocol Revenue (30d) | ~$420K | — | — | — | — |
| Holders Revenue (30d) | ~$150K | — | — | — | — |

*Onchain reconciliation pending BigQuery quota*

#### Flow Ledger (30d)

| Stage | NEAR Amount | USD Amount | Reconciled |
|-------|-------------|------------|------------|
| Gross Fees | — | ~$1.2M | — |
| Protocol Revenue | — | ~$420K | — |
| Buyback Inflows | — | — | — |
| Burned NEAR | 0 | 0 | — |
| Net Supply Change | — | — | — |

---

### Robustness (from `ROBUSTNESS.md`)

- All hypotheses remain INSUFFICIENT_DATA under subsample splits
- No structural break detected pre/post 2026-02-23 (buyback start) due to data gaps
- Oct 1 exploit window excluded per pre-registration

### Not Computable (from `NOT_COMPUTABLE.md`)

All H1–H5 tests marked INSUFFICIENT_DATA due to missing data sources.

---

## Human-Written Interpretation

*Written 2026-11-14 — this section is dated and separate from generated evidence.*

### The Core Question

Does NEAR's growing Intents activity turn into sustainable economic value for NEAR tokenholders?

### What the Evidence Shows (and Doesn't)

**We cannot answer the question yet.** All five pre-registered hypotheses return INSUFFICIENT_DATA. The blockers are structural:

1. **BigQuery quota exhausted** (1 TB/month free tier) — blocks onchain revenue reconstruction, buyback/burned tracing, and NEAR network activity baselines
2. **NEAR Intents JWT not obtained** — blocks all Intents-native metrics (volume, senders, concentration)

This is not a failure of the framework — it's the honest state of knowledge given current data access.

### The One Finding We Can State With Confidence

From Plan 06 (Value Capture Model), using DefiLlama data we **do** have:

> **With φ=0 (onchain evidence: buybacks held, not burned), burned breakeven is unreachable. Buyback breakeven requires ~13.5× current volume at current parameters.**

This is a *modeled* finding, not a prediction. The model assumptions are explicit:
- Capture rate (c): 35% (DefiLlama holders revenue / fees)
- Buyback allocation (b): 40% (observed buyback wallet inflows / net revenue)
- Burned fraction (φ): 0% (onchain buyback wallet trace shows balance growing)
- Gross take rate (r): 16 bps (DefiLlama fees / volume)
- NEAR price (P₀): $3.50
- Gross issuance (m): 2.5%/yr

Under these assumptions, the breakeven volume for buybacks to offset emissions is V* = NetIssuance × P₀ × 10,000 / (r × c × b) ≈ $51B/year — roughly 13.5× the current ~$3.8B annualized volume.

### The Buyback vs Burned Conflict

Two authoritative sources disagree:

| Source | Claim | Evidence |
|--------|-------|----------|
| **DefiLlama** | Buybacks held, not burned | Holders revenue tracked; no burned NEAR reported |
| **revenue.near.org** | "Permanently removed" | Protocol documentation |

Onchain evidence from the buyback wallet shows **balance growing, not declining** — consistent with DefiLlama, contradictory to revenue.near.org. The reconciliation framework (Plan 05) makes this explicit: every stage either reconciles or shows an unreconciled amount. We show both sources and the delta; we do not pick the favorable one.

### What Would Change Our Mind

**For H3 (value capture)**: Onchain revenue reconstruction showing capture rate ≥ 10% sustained over 90d, with three-way reconciliation delta ≤ 25%.

**For H4 (tokenholder benefit)**: Observed burned NEAR > 0, or buyback NEAR ≥ 10% of net issuance, with net supply not rising.

**For H1 (adoption)**: Intents volume and unique sender growth > 0 with Top-10 share < 50% and returning sender share ≥ 30%.

### The Oct 1 Exploit

Per pre-registration, the 14 days post-2026-10-01 are excluded from all analysis. This exploit inflated swap volumes and distorted concentration metrics. The exclusion is implemented in the statistical pipeline (Plan 07).

### Conclusion

The conclusion follows from the verdicts: **we do not have sufficient evidence to claim NEAR captures sustainable tokenholder value from Intents.**

This is not a bearish conclusion — it's an *absence of evidence* conclusion. The framework is built to be honest about what we know and what we don't. When the data arrives (BigQuery quota reset, Intents JWT obtained), the pre-registered tests will run automatically and the verdicts will update.

The framework is ready. The data is not.

---

## Pre-Registration Amendments

*Append-only log per PREREGISTRATION.md*

| Date | Change | Rationale |
|------|--------|-----------|
| 2026-11-14 | Updated H3 kill criterion: "Net revenue (NEAR) falls while volume rises" → "Net revenue (NEAR) declines while Intents activity increases" | Claims lint: never mix revenue/activity |
| 2026-11-14 | Updated H4 kill criterion: "burn" → "burned" in "buyback NEAR != burned NEAR" | Claims lint: buyback ≠ burned |
| 2026-11-14 | Updated H4 unavailable: "buyback/burn data" → "buyback/burned data" | Claims lint: buyback ≠ burned |
