# LedgerLight — 3-Minute Demo Script

**Record against:** `https://through-ellen-richmond-directive.trycloudflare.com/`
**Target:** Judges with zero context. One take, no edits.

---

## ⏱️ Timing (3:00)

| Segment | Time |
|---------|------|
| Hook + headline | 0:00–0:20 |
| Overview (KPIs + verdicts) | 0:20–0:40 |
| Flows (Sankey) | 0:40–1:20 |
| Value model (φ slider) | 1:20–2:00 |
| Intents / Network | 2:00–2:30 |
| Thesis + Methodology | 2:30–2:50 |
| Close + repo | 2:50–3:00 |

---

## 🎤 Narration

### 0:00–0:20 — Hook
> **[Overview page loaded]**
>
> "NEAR's Intents protocol does billions in swap volume. The Foundation says buybacks 'permanently remove NEAR from circulation.' Onchain, the bought-back NEAR sits in a multisig — **not burned**."
>
> **[Gesture to headline finding]**
>
> "This is LedgerLight. It traces gross fees through to tokenholder outcomes, with pre-registered tests, typed units, and honest reconciliation at every stage."

### 0:20–0:40 — Overview
> "Landing page: KPIs and the five thesis verdicts. All `INSUFFICIENT_DATA` — blocked by Intents JWT and BigQuery quota, not missing tests. The framework is complete; live mode fills it in. You're seeing **snapshot mode** — real data from a live run, amber banner, no credentials needed."

### 0:40–1:20 — Flows (Sankey)
> **[Click `/flows`]**
>
> "Sankey ledgers for 7d, 30d, 90d, YTD, all-time. Built offline, not arbitrary ranges."
>
> **[Trace with mouse: Gross Fees → Protocol Revenue → Holders Revenue → Buyback Wallet Inflows → Burned (0) / Held (100%)]**
>
> "Flow starts at **Gross Fees** (DefiLlama). Volume is a context strip with take rate in bps. Protocol Revenue → Holders Revenue (buybacks). Onchain: inflows to `buybacks.multisignature.near` reconcile. Outbound: **φ = 0 observed** — zero to burn address, 100% held. The 'Unreconciled' node is explicit, never forced to balance."

### 1:20–2:00 — Value Model
> **[Click `/value`]**
>
> "Value capture model. φ (phi) is the burn fraction — what share of buyback outflows actually burns."
>
> **[Drag φ slider from 0 → 1]**
>
> "At φ = 0 (observed), **burn breakeven is unreachable**. Buyback breakeven needs ~13.5× current volume. Drag φ to 1 (hypothetical full burn) and the gap closes. This is arithmetic from traced wallet flows, not opinion."

### 2:00–2:30 — Intents / Network
> **[Click `/intents` → hover Status Mix, Chain Distribution, Token Distribution]**
>
> "Intents: live data from Explorer API. Status mix (SUCCESS only counts), chain distribution (Ethereum, Arbitrum, Base, NEAR), token distribution (USDC, USDT, NEAR, wNEAR)."
>
> **[Click `/network`]**
>
> "Network: NEAR activity excluding Intents — active accounts, transactions. Used for H2 correlation tests."

### 2:30–2:50 — Thesis + Methodology
> **[Click `/thesis` → scroll H1–H5 cards]**
>
> "Pre-registered H1–H5 with kill criteria. Verdicts from rules: `SUPPORTED | CONTRADICTED | MIXED | INSUFFICIENT_DATA`. No p-hacking."
>
> **[Click `/methodology` → scroll registry table]**
>
> "34 metrics. Kind tags: `measured` (direct), `derived` (deterministic), `modeled` (assumption). Unit policy: USD pre-sweep, NEAR post-sweep. Three data modes — live (green), snapshot (amber), synthetic (red, test-only). Pipeline refuses to mix modes."

### 2:50–3:00 — Close
> **[Show repo URL]**
>
> "Repo: `github.com/NikhilKottoli/LedgerLight`. MIT. Static deploy — credentials never reach browser."
>
> "Run it: `git clone`, `uv sync`, `cd web && pnpm install && pnpm build`, `pnpm preview`. Snapshot mode works instantly."
>
> "The question: **Does NEAR capture meaningful value from Intents, and does it accrue to tokenholders?** Data says: not yet — burn path blocked at φ=0. Framework is here to verify every future claim."

---

## 🎥 Recording Tips

- Speak slightly slow; judges may replay at 1.25×
- Pause 1s after each click; let page settle
- Trace Sankey with mouse, don't just point
- If a panel shows "Data Unavailable": *"Needs Intents JWT / BigQuery quota — snapshot shows last live pull"*
- Local fallback: `cd web && pnpm preview` → record at `http://localhost:4173`

---

## 🔗 Links for Description

- Repo: `https://github.com/NikhilKottoli/LedgerLight`
- Live demo: `https://through-ellen-richmond-directive.trycloudflare.com/`
- Pre-registration: `github.com/NikhilKottoli/LedgerLight/blob/prereg-v1/thesis/PREREGISTRATION.md`
- Architecture: `architecture.excalidraw` (drag into excalidraw.com)
- Thesis: `THESIS.md`