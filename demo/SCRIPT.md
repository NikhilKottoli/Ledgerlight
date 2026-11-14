# NEAR Value Intelligence — 4-Minute Demo Script

**Target:** Hackathon judges / reviewers with **zero context**.
**Format:** Screen-recorded walkthrough (one take, no edits needed).
**URL to record:** `https://through-ellen-richmond-directive.trycloudflare.com/`

---

## 🎬 Recording Checklist (Do Before Hitting Record)

- [ ] Browser: Chrome/Edge, 1920×1080, no extensions visible
- [ ] URL loaded: `https://through-ellen-richmond-directive.trycloudflare.com/`
- [ ] Tab title visible: "NEAR Value Intelligence"
- [ ] DevTools closed (no console noise)
- [ ] Mic test: 30 sec, clear audio
- [ ] Timer visible (phone stopwatch or OBS timer overlay)

---

## ⏱️ Timing Budget (4:00 Total)

| Segment | Time | Cumulative |
|---------|------|------------|
| Hook + One-Liner | 0:00–0:20 | 0:20 |
| Overview (thesis verdicts) | 0:20–0:50 | 0:50 |
| Value Capture Model (φ slider) | 0:50–1:30 | 1:30 |
| Intents Deep-Dive | 1:30–2:10 | 2:10 |
| Flows Sankey (5 presets) | 2:10–2:50 | 2:50 |
| Thesis (pre-registered H1–H5) | 2:50–3:20 | 3:20 |
| Methodology (registry + provenance) | 3:20–3:45 | 3:45 |
| Closing + Repo Pointer | 3:45–4:00 | 4:00 |

---

## 🎤 SCRIPT — Read Aloud While Recording

### 0:00–0:20 — Hook + One-Liner
> **[Show landing page — Overview route]**
>
> "NEAR's Intents protocol does billions in swap volume. The Foundation says buybacks 'permanently remove NEAR from circulation.' But onchain, the bought-back NEAR sits in a multisig — **not burned**."
>
> **[Gesture to thesis verdict badges]**
>
> "This is NEAR Value Intelligence — an evidence-first platform that traces Intents revenue from gross fees through to tokenholder outcomes, with **pre-registered hypotheses**, **three-way reconciliation**, and **zero fabricated data**."

---

### 0:20–0:50 — Overview (Thesis Verdicts)
> **[Scroll slightly to show KPI cards + verdict badges]**
>
> "Landing page shows the five pre-registered hypotheses — H1 through H5. All currently `INSUFFICIENT_DATA` because live onchain revenue reconstruction needs BigQuery quota, and Intents per-tx data needs a partner JWT. **But the framework is complete** — every test, threshold, and kill criterion was frozen at git tag `prereg-v1` before any analysis ran."
>
> **[Point to amber 'Snapshot' banner if visible]**
>
> "You're seeing **snapshot mode** — real aggregated data from a live run, honestly dated. No API keys needed to explore."

---

### 0:50–1:30 — Value Capture Model (The Core Insight)
> **[Click `/value` in nav — wait for load]**
>
> "This is the Value Capture Model — the heart of the project. It answers: *if Intents generates X in fees, how much NEAR actually gets burned?*"
>
> **[Point to φ slider — drag it slowly]**
>
> "φ (phi) is the **burn fraction** — what share of buyback outflows actually hits a dead address. Onchain evidence shows φ = 0. The buyback wallet `buybacks.multisignature.near` sends NEAR to treasury, staking, exchanges — **zero to a burn address**."
>
> **[Point to breakeven callout]**
>
> "With φ = 0, **burn breakeven is mathematically unreachable**. Buyback breakeven — where buybacks offset emissions — needs ~13.5× current volume at today's take rate. Drag φ to 1 (hypothetical full burn) and you see the gap close. This isn't opinion — it's arithmetic from traced wallet flows."

---

### 1:30–2:10 — Intents Deep-Dive
> **[Click `/intents` in nav]**
>
> "Intents page — live data from the NEAR Intents Explorer API (DefiLlama for TVL/fees, Explorer for per-swap details)."
>
> **[Hover Status Mix chart — show tooltip]**
> "Status mix: SUCCESS vs PENDING_DEPOSIT vs REFUNDED. Only SUCCESS counts toward volume."
>
> **[Hover Chain Distribution — point to stacked bars]**
> "Chain distribution — where swaps originate. Ethereum, Arbitrum, Base, NEAR native. Stacked bars = daily breakdown."
>
> **[Hover Token Distribution]**
> "Token distribution — USDC, USDT, NEAR, wNEAR, others. Top-N + 'other' bucket."
>
> **[Scroll to Volume Breakdown — point to blue section]**
> "Volume breakdown by status. Blue section = Intents Explorer data (live). Neutral above = DefiLlama aggregates."
>
> **[Click a KPI card's provenance icon (top-right) if visible]**
> "Every KPI and chart has a **provenance drawer** — source, definition, SQL, raw data link, registry entry. Click to verify."

---

### 2:10–2:50 — Flows Sankey (5 Presets)
> **[Click `/flows` in nav]**
>
> "Flow ledgers — Sankey diagrams showing money movement across 5 time presets."
>
> **[Click 7d → 30d → 90d → YTD → All tabs]**
> "7-day, 30-day, 90-day, year-to-date, all-time. Built offline, not arbitrary ranges."
>
> **[Trace with mouse: Gross Fees → Protocol Revenue → Holders Revenue/Buybacks → Buyback Wallet Inflows → Burned (φ=0) / Held]**
> "Flow starts at **Gross Fees** (DefiLlama), not swap volume — volume is a context strip above with effective take rate in bps. Protocol Revenue splits to Holders Revenue (buybacks). Onchain, we trace inflows to the buyback wallet. Outbound: φ=0 observed → **Burned = 0, Held = 100%**. The 'Unreconciled' node is explicit — never plugged."
>
> **[Point to 'Unreconciled' label]**
> "Negative residual = definitions differ. We show it, we don't hide it."

---

### 2:50–3:20 — Thesis (Pre-Registered Rigor)
> **[Click `/thesis` in nav]**
>
> "Thesis page — the pre-registered hypothesis tests. This is what separates research from a dashboard with a narrative."
>
> **[Scroll through H1–H5 cards]**
> "H1: Adoption growth. H2: Intents predicts non-Intents NEAR activity (circularity broken — we decompose NEAR txs into Intents-attributable vs other). H3: Value capture (capture rate ≥ 10%?). H4: Tokenholder benefit (buyback/issuance ≥ 10%?). H5: Concentration flattening."
>
> **[Point to 'Kill Criteria' sections]**
> "Each hypothesis has **kill criteria** — e.g., H3 killed if capture rate < 10% for 3 consecutive months. Verdicts are **rule-based**: `SUPPORTED | CONTRADICTED | MIXED | INSUFFICIENT_DATA`. No p-hacking, no narrative override."

---

### 3:20–3:45 — Methodology (Transparency)
> **[Click `/methodology` in nav]**
>
> "Full methodology — 34 registered metrics with source, definition, calculation, unit, kind, coverage, freshness, completeness."
>
> **[Scroll to show table rows]**
> "Kind tags: `measured` (direct from API), `derived` (deterministic calc), `modeled` (human assumption). Never mixed."
>
> **[Scroll to Source Definitions]**
> "Source definitions with endpoints. Unit policy: USD pre-sweep, NEAR post-sweep. Statistical method: weekly frequency, block bootstrap CIs, FDR, structural breaks at buyback start (Feb 23) and Omni exploit (Oct 1)."
>
> **[Point to Data Modes cards]**
> "Three data modes — live (green), snapshot (amber, what you're seeing), synthetic (red, test-only). Pipeline refuses to mix them."

---

### 3:45–4:00 — Closing + Repo
> **[Return to Overview or show GitHub URL on screen]**
>
> "Repo: `github.com/NikhilKottoli/LedgerLight`. MIT license. Static deploy — Vercel or Cloudflare Pages, zero credentials on server."
>
> "Run it yourself: `git clone`, `uv sync`, `cd web && pnpm install && pnpm build`, `pnpm preview`. Snapshot mode works instantly."
>
> "The question: **Does NEAR capture meaningful value from Intents, and does it accrue to tokenholders?** The data says: not yet — and the burn path is blocked at φ=0. But the framework is here to verify every future claim."
>
> **[Hold on repo URL for 3 seconds]**
>
> "Thanks for watching."

---

## 🎥 Recording Tips

| Tip | Why |
|-----|-----|
| Speak slightly slower than normal | Judges may replay at 1.25× |
| Pause 1 sec after each click | Let page settle, avoids "wait what?" |
| Use mouse to trace flows (don't just point) | Sankey is hard to follow verbally |
| Don't narrate loading states | Cut silence in post if needed, but one-take is fine |
| If a chart is empty (Intents JWT missing), say: *"This panel needs the Intents partner JWT — in snapshot mode it shows the last live pull"* | Honest > perfect |

---

## 🔗 Links to Have Ready (Description / Pinned Comment)

- Repo: `https://github.com/NikhilKottoli/LedgerLight`
- Live demo: `https://through-ellen-richmond-directive.trycloudflare.com/`
- Pre-registration: `https://github.com/NikhilKottoli/LedgerLight/blob/prereg-v1/thesis/PREREGISTRATION.md`
- Architecture diagram: `architecture.excalidraw` (open in excalidraw.com)
- THESIS.md: `https://github.com/NikhilKottoli/LedgerLight/blob/main/THESIS.md`

---

## 🆘 Fallback If Tunnel Dies

Local recording works identically:
```bash
cd web && pnpm preview
# Record against http://localhost:4173
```
All data is in `web/public/data/` — zero external dependencies in snapshot mode.