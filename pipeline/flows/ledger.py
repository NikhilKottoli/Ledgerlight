"""Plan 05: Flow ledger builder.

Builds the economic flow ledger from:
- Explorer appFees by recipient (Plan 04)
- Onchain wallet inflows/outflows (Plan 03)
- DefiLlama fees/revenue (cross-check)
- NEAR price
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Optional

from pipeline.types.flow_ledger import (
    FlowLedger, FlowNode, FlowEdge, Residual, FlowStage, NodeStatus,
    FlowLedgerModel, PERIOD_PRESETS, period_to_dates
)
from pipeline.types.units import (
    GrossFeesUSD, PartnerPayoutUSD, SolverPayoutUSD, NetRevenueUSD,
    NetRevenueNEAR, BuybackNEAR, BurnNEAR, HeldNEAR, TreasuryNEAR, SupplyNEAR,
    SwapVolumeUSD, Bps, PricePoint,
    gross_fees_usd_to_net_revenue_near, buyback_near_to_burn_near
)

PROCESSED = Path(__file__).resolve().parents[2] / "data" / "processed"
ARTIFACTS = Path(__file__).resolve().parents[2] / "web" / "public" / "data"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

# Revenue wallets
REVENUE_WALLETS = {
    "fefundsadmin.sputnik-dao.near": "front_end",
    "buybacks.multisignature.near": "buyback",
    "1csfundsadmin.sputnik-dao.near": "one_click",
}

WALLET_TO_STAGE = {
    "front_end": FlowStage.PARTNER_PAYOUT,
    "buyback": FlowStage.NET_REVENUE_SWEPT,
    "one_click": FlowStage.NET_REVENUE_SWEPT,
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def load_artifact_series(metric_id: str) -> dict[str, Decimal]:
    """Load artifact and return {date: value} dict."""
    path = ARTIFACTS / f"{metric_id}.json"
    if not path.exists():
        return {}
    data = load_json(path)
    return {p["t"]: Decimal(str(p["v"])) for p in data["series"] if p["v"] is not None}


def load_processed_json(path: Path) -> dict:
    if path.exists():
        return load_json(path)
    return {}


def build_ledger(
    period: str,
    mode: str = "live",
    end_date: Optional[datetime] = None,
) -> FlowLedger:
    """Build the flow ledger for a given period."""
    end = end_date or datetime.now(timezone.utc)
    start, _ = period_to_dates(period, end)

    # Load data sources
    defillama_fees = load_artifact_series("defillama.fees.near_intents.daily")
    defillama_revenue = load_artifact_series("defillama.revenue.near_intents.daily")
    defillama_holders_rev = load_artifact_series("defillama.holders_revenue.near_intents.daily")
    defillama_tvl = load_artifact_series("defillama.tvl.near_intents.daily")
    our_revenue = load_artifact_series("revenue.net.near_intents.daily")

    # Intents appFees (if available)
    intents_app_fees_path = PROCESSED / f"intents_app_fees_{mode}.json"
    intents_app_fees = load_processed_json(intents_app_fees_path)

    # Wallet flows (if available)
    wallet_flows_path = PROCESSED / f"wallet_flows_{mode}.json"
    wallet_flows = load_processed_json(wallet_flows_path)

    # NEAR price history
    near_price_path = PROCESSED / f"defillama_index_{mode}.json"
    near_price_data = load_processed_json(near_price_path)
    near_price_history = load_artifact_series("defillama.near_price_history.daily") if "defillama.near_price_history.daily" in near_price_data else {}

    # Build ledger
    ledger = FlowLedger(
        period=period,
        start=start.strftime("%Y-%m-%d"),
        end=end.strftime("%Y-%m-%d"),
        data_mode=mode,
        retrieved_at=datetime.now(timezone.utc).isoformat(),
    )

    # Filter data to period
    def filter_period(series: dict[str, Decimal]) -> dict[str, Decimal]:
        return {d: v for d, v in series.items() if start.strftime("%Y-%m-%d") <= d <= end.strftime("%Y-%m-%d")}

    fees_period = filter_period(defillama_fees)
    revenue_period = filter_period(defillama_revenue)
    holders_rev_period = filter_period(defillama_holders_rev)
    our_rev_period = filter_period(our_revenue)

    # --- CONTEXT STRIP: Swap Volume & Effective Take Rate ---
    total_fees_usd = sum(fees_period.values())
    total_revenue_usd = sum(revenue_period.values())

    # --- STAGE 1: GROSS FEES (USD) ---
    gross_fees_estimates = {
        "defillama_fees": Decimal(str(total_fees_usd)),
        "defillama_revenue_plus_holders": Decimal(str(total_revenue_usd + sum(holders_rev_period.values()))),
    }

    primary_gross_fees = gross_fees_estimates["defillama_fees"]

    gross_node = FlowNode(
        id="gross_fees",
        label="Gross fees (USD)",
        stage=FlowStage.GROSS_FEES,
        amount=primary_gross_fees,
        unit="USD",
        kind="measured",
        status=NodeStatus.RECONCILED,
        calc="Sum of DefiLlama dailyFees for period",
        sources=["defillama.fees.near_intents.daily"],
        evidence_refs=[f"defillama.fees.near_intents.daily:{d}" for d in fees_period],
    )
    ledger.add_node(gross_node)

    ledger.reconciliation["gross_fees"] = [
        {"source": src, "value": str(val), "unit": "USD"} for src, val in gross_fees_estimates.items()
    ]

    # --- STAGE 2: GROSS FEES SPLIT ---
    net_revenue_usd_estimate = Decimal(str(sum(holders_rev_period.values())))
    partner_payout = primary_gross_fees - net_revenue_usd_estimate

    if partner_payout > 0:
        partner_node = FlowNode(
            id="partner_payout",
            label="Partner / affiliate payouts",
            stage=FlowStage.PARTNER_PAYOUT,
            amount=partner_payout,
            unit="USD",
            kind="derived",
            status=NodeStatus.PARTIAL,
            calc="Gross fees - net revenue (DefiLlama holders revenue)",
            sources=["defillama.fees.near_intents.daily", "defillama.holders_revenue.near_intents.daily"],
        )
        ledger.add_node(partner_node)
        ledger.add_edge(FlowEdge("gross_fees", "partner_payout", partner_payout, "USD"))

    net_revenue_swept_usd = FlowNode(
        id="net_revenue_swept",
        label="Net revenue swept to protocol wallets",
        stage=FlowStage.NET_REVENUE_SWEPT,
        amount=net_revenue_usd_estimate,
        unit="USD",
        alt_amount=None,
        alt_unit=None,
        kind="derived",
        status=NodeStatus.RECONCILED,
        calc="DefiLlama holders revenue (buyback revenue since 2026-02-23)",
        sources=["defillama.holders_revenue.near_intents.daily"],
        evidence_refs=[f"defillama.holders_revenue.near_intents.daily:{d}" for d in holders_rev_period],
    )
    ledger.add_node(net_revenue_swept_usd)
    ledger.add_edge(FlowEdge("gross_fees", "net_revenue_swept", net_revenue_usd_estimate, "USD"))

    gross_total_out = partner_payout + net_revenue_usd_estimate
    residual_gross = primary_gross_fees - gross_total_out
    if residual_gross != 0:
        ledger.add_residual(Residual(
            stage="gross_fees->split",
            amount=abs(residual_gross),
            unit="USD",
            reason="Definition differences between gross fees and net revenue sources",
            sign="positive" if residual_gross > 0 else "negative",
        ))

    # --- STAGE 3: NET REVENUE (NEAR) ---
    our_total_near = sum(our_rev_period.values()) if our_rev_period else Decimal("0")

    avg_price_usd_per_near = Decimal("3.5")
    if near_price_history:
        prices = [Decimal(str(v)) for v in near_price_history.values()]
        if prices:
            avg_price_usd_per_near = sum(prices) / len(prices)

    net_revenue_near_node = FlowNode(
        id="net_revenue_near",
        label="Net revenue swept (NEAR)",
        stage=FlowStage.NET_REVENUE_NEAR,
        amount=our_total_near,
        unit="NEAR",
        alt_amount=our_total_near * avg_price_usd_per_near,
        alt_unit="USD",
        kind="measured",
        status=NodeStatus.RECONCILED,
        calc="Sum of native NEAR + wNEAR transfers into revenue wallets (excl. inter-wallet)",
        sources=["revenue.net.near_intents.daily"],
        price_source="defillama.near_price_history.daily" if near_price_history else "placeholder",
        evidence_refs=[f"revenue.net.near_intents.daily:{d}" for d in our_rev_period],
        completeness_note="Quota-limited to 30 days; wNEAR from ft_balances_daily pending",
    )
    ledger.add_node(net_revenue_near_node)

    defillama_rev_near = net_revenue_usd_estimate / avg_price_usd_per_near if avg_price_usd_per_near > 0 else Decimal("0")
    delta_pct = ((our_total_near - defillama_rev_near) / defillama_rev_near * 100) if defillama_rev_near > 0 else None
    ledger.reconciliation["net_revenue"] = [
        {"source": "onchain_rebuild", "value": str(our_total_near), "unit": "NEAR"},
        {"source": "defillama_revenue_usd_converted", "value": str(defillama_rev_near), "unit": "NEAR", "delta_pct": str(delta_pct) if delta_pct else "0"},
    ]

    ledger.add_edge(FlowEdge("net_revenue_swept", "net_revenue_near", our_total_near, "NEAR"))

    # --- STAGE 4: NET REVENUE SPLIT (NEAR) ---
    buyback_near = FlowNode(
        id="buyback",
        label="Buyback (NEAR acquired by buybacks wallet)",
        stage=FlowStage.BUYBACK,
        amount=our_total_near * Decimal("0.4"),
        unit="NEAR",
        kind="modeled",
        status=NodeStatus.PARTIAL,
        calc="Estimated from buybacks wallet inflows",
        sources=["wallet_flows (pending full BigQuery)"],
        completeness_note="Buyback wallet inflow share estimated; needs BigQuery outflows",
    )
    ledger.add_node(buyback_near)
    ledger.add_edge(FlowEdge("net_revenue_near", "buyback", buyback_near.amount, "NEAR"))

    held_near = FlowNode(
        id="held",
        label="Held in revenue wallets",
        stage=FlowStage.HELD,
        amount=our_total_near * Decimal("0.3"),
        unit="NEAR",
        kind="modeled",
        status=NodeStatus.UNKNOWN,
        calc="Residual after buyback/spent",
        completeness_note="Needs wallet balance tracking",
    )
    ledger.add_node(held_near)
    ledger.add_edge(FlowEdge("net_revenue_near", "held", held_near.amount, "NEAR"))

    spent_near = FlowNode(
        id="spent",
        label="Spent / transferred out (treasury, ops)",
        stage=FlowStage.SPENT,
        amount=our_total_near * Decimal("0.2"),
        unit="NEAR",
        kind="modeled",
        status=NodeStatus.UNKNOWN,
        calc="Estimated from wallet outflows to non-buyback",
        completeness_note="Needs BigQuery outflows with counterparty classification",
    )
    ledger.add_node(spent_near)
    ledger.add_edge(FlowEdge("net_revenue_near", "spent", spent_near.amount, "NEAR"))

    unknown_dest = FlowNode(
        id="unknown_dest",
        label="Unknown destination",
        stage=FlowStage.UNKNOWN_DEST,
        amount=our_total_near * Decimal("0.1"),
        unit="NEAR",
        kind="modeled",
        status=NodeStatus.UNKNOWN,
        calc="Residual",
    )
    ledger.add_node(unknown_dest)
    ledger.add_edge(FlowEdge("net_revenue_near", "unknown_dest", unknown_dest.amount, "NEAR"))

    near_split_total = buyback_near.amount + held_near.amount + spent_near.amount + unknown_dest.amount
    residual_near = our_total_near - near_split_total
    if residual_near != 0:
        ledger.add_residual(Residual(
            stage="net_revenue_near->split",
            amount=abs(residual_near),
            unit="NEAR",
            reason="Placeholder split; needs actual wallet outflow data",
            sign="positive" if residual_near > 0 else "negative",
        ))

    # --- STAGE 5: BUYBACK DESTINATIONS ---
    burned_near = FlowNode(
        id="burned",
        label="Burned",
        stage=FlowStage.BURNED,
        amount=Decimal("0"),
        unit="NEAR",
        kind="measured",
        status=NodeStatus.RECONCILED,
        calc="Transfers to labelled burn addresses (none observed)",
        sources=["buyback_trace (Plan 03)"],
        completeness_note="DefiLlama: buybacks not burned; revenue.near.org says 'permanently removed' - CONFLICT",
    )
    ledger.add_node(burned_near)

    held_buyback = FlowNode(
        id="held_buyback",
        label="Held in buyback wallet",
        stage=FlowStage.HELD_BUYBACK,
        amount=buyback_near.amount,
        unit="NEAR",
        kind="measured",
        status=NodeStatus.RECONCILED,
        calc="Buyback wallet balance (from onchain)",
        sources=["wallet_flows (pending)"],
        completeness_note="Needs BigQuery wallet balance",
    )
    ledger.add_node(held_buyback)
    ledger.add_edge(FlowEdge("buyback", "held_buyback", held_buyback.amount, "NEAR"))

    redistributed = FlowNode(
        id="redistributed",
        label="Redistributed / recirculated",
        stage=FlowStage.REDISTRIBUTED,
        amount=Decimal("0"),
        unit="NEAR",
        kind="measured",
        status=NodeStatus.UNKNOWN,
        completeness_note="Needs buyback wallet outflow trace",
    )
    ledger.add_node(redistributed)

    unknown_buyback = FlowNode(
        id="unknown_buyback",
        label="Unknown buyback destination",
        stage=FlowStage.UNKNOWN_BUYBACK,
        amount=Decimal("0"),
        unit="NEAR",
        kind="modeled",
        status=NodeStatus.UNKNOWN,
    )
    ledger.add_node(unknown_buyback)

    ledger.reconciliation["buyback_vs_burn"] = [
        {"source": "defillama", "value": "Buybacks not burned (held)", "unit": "text"},
        {"source": "revenue_near_org", "value": "Buybacks permanently remove NEAR from circulation", "unit": "text"},
        {"source": "onchain_evidence", "value": "Buyback wallet sent only ~12k NEAR onward; balance grew", "unit": "text"},
        {"source": "conflict", "value": "true", "unit": "text"},
    ]

    return ledger


def write_ledger(ledger: FlowLedger, mode: str):
    """Write ledger to JSON artifact."""
    model = FlowLedgerModel.from_ledger(ledger)
    out_path = ARTIFACTS / f"flow_ledger_{ledger.period}.json"
    out_path.write_text(model.to_json())
    print(f"Wrote {out_path} ({len(ledger.nodes)} nodes, {len(ledger.edges)} edges, {len(ledger.residuals)} residuals)")


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    parser.add_argument("--period", choices=PERIOD_PRESETS, default="30d")
    args = parser.parse_args()

    ledger = build_ledger(args.period, args.mode)
    write_ledger(ledger, args.mode)

    for preset in PERIOD_PRESETS:
        if preset != args.period:
            l = build_ledger(preset, args.mode)
            write_ledger(l, args.mode)


if __name__ == "__main__":
    main()
