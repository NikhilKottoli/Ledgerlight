# Demo Script — NEAR Value Intelligence
**Target length: 3–5 minutes**  
**Format: Screen recording with voiceover**  
**Resolution: 1440×900**

---

## 0. Setup (before recording)
```bash
# Clone and serve static dashboard
cd near-value-intelligence/web
npx serve out/
# Dashboard at http://localhost:3000 (or shown port)
```

---

## 1. Hook (10 seconds)
**[Show: Terminal with `npx serve out/` starting, then browser opening to `/`]**

> **"Intents activity on NEAR is growing fast. But where does the money actually go? Does it turn into value for NEAR tokenholders — or just vanish into the protocol treasury?"**

**[Cut to: Dashboard home page — show the tagline "Follow the money. Verify the value."]**

---

## 2. Flows Page — Follow the Money (60 seconds)
**[Navigate to `/flows`]**

> **"Start with gross fees. DefiLlama reports ~$1.2M in fees over the last 30 days. But fees ≠ revenue."**

**[Click the 30d preset button. Point to Sankey nodes.]**

> **"Protocol revenue (what NEAR keeps) is ~$420K — that's a 35% capture rate. The rest goes to integrators as referral fees."**

**[Hover over "Holders Revenue / Buybacks" node — shows ~$150K.]**

> **"Of that revenue, ~$150K flows to buybacks. But here's the critical finding:"**

**[Click the "Reconciliation Panel" drawer on the Buyback node.]**

> **"DefiLlama says buybacks are held, not burned. Revenue.near.org claims 'permanently removed.' Onchain evidence — the buyback wallet balance grew — agrees with DefiLlama. Buyback ≠ burned."**

**[Point to the unreconciled amount.]**

> **"Every stage either reconciles or shows an explicit unreconciled amount. We never plug gaps."**

---

## 3. Provenance — Show Your Work (20 seconds)
**[Click any KPI card's "Provenance" drawer — e.g., Fees.]**

> **"Every metric links to its source. Here's the DefiLlama endpoint, the exact SQL if it's BigQuery, the retrieval timestamp, and the data mode (live vs snapshot)."**

**[Show the three-way revenue reconciliation table.]**

> **"Three sources: DefiLlama (market data), onchain rebuild (ground truth), revenue.near.org (reference). Delta shown explicitly."**

---

## 4. Thesis Lab — Pre-Registered, Not Post-Hoc (40 seconds)
**[Navigate to `/thesis`]**

> **"Five hypotheses, pre-registered at tag `prereg-v1` before any analysis ran. Rule-based verdicts — no p-hacking."**

**[Point to the verdict chips: all INSUFFICIENT_DATA.]**

> **"H1: Adoption growing? Need Intents JWT — we now have it. H2: Predicts network activity? Need BigQuery quota. H3: Value capture? Capture rate 35% but need onchain rebuild. H4: Tokenholder benefit? Burn fraction φ=0 — buybacks held, not burned. H5: Less concentrated? Need concentration metrics."**

> **"The conclusion follows the data: we don't yet have sufficient evidence for tokenholder value accrual. That's not bearish — that's honest."**

---

## 5. Value Capture Model — What Would It Take? (20 seconds)
**[Navigate to `/value`]**

> **"Interactive model: V* = NetIssuance × P₀ × 10,000 / (r × c × b × φ). Measured anchors on the left, outputs on the right."**

> **"With φ=0 (buybacks held, not burned), **burn breakeven is unreachable**. For buybacks to offset emissions, we'd need ~13.5× current volume — about $51B/year."**

**[Drag the φ slider from 0 to 0.5 — watch burn breakeven drop.]**

> **"If NEAR ever burns even half the buyback, breakeven drops dramatically. This is modeled — not a prediction."**

---

## 6. Close (10 seconds)
**[Return to home page or show repo URL]**

> **"NEAR Value Intelligence. The framework is ready. The data is arriving. The conclusion comes from the evidence."**

**[Show GitHub repo URL and live dashboard URL]**

---

## Recording Tips
- **Narrate actions before clicking** — "I'm clicking the 30d preset..."
- **Pause 1-2 seconds** on key findings (buyback≠burned, φ=0, breakeven card)
- **Keep mouse movements smooth** — no jittery navigation
- **Total target: 180–300 seconds**

---

## Post-Recording
1. Export as MP4 (H.264, 1080p or 1440p)
2. Upload to YouTube (unlisted) or Twitter/X
3. Add link to README `demo_url`
4. Update repo description with demo link
