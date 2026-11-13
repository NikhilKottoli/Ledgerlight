"""Plan 05: Flow ledger types and stage model.

Stage model (from plan 05):
[Context strip] Swap volume (USD) → effective gross take rate (bps)

Gross fees (USD)
 ├─ Partner / affiliate payouts   (appFees recipients NOT protocol wallets)
 ├─ Solver / other payouts        (only if observable; else part of Unreconciled)
 ├─ Net revenue swept to protocol wallets   (onchain, NEAR → USD derived)
 └─ Unreconciled (residual)
      │
Net revenue (NEAR)
 ├─ Buyback (NEAR acquired by buybacks wallet)
 ├─ Held in revenue wallets
 ├─ Spent / transferred out (treasury, ops, other labelled)
 └─ Unknown destination
      │
Buyback NEAR
 ├─ Burned
 ├─ Held (wallet balance)
 ├─ Redistributed / recirculated
 └─ Unknown
      │
Tokenholder implications (annotations, not money):
   net NEAR removed from circulation vs net supply change over same period
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field

from pipeline.types.units import (
    GrossFeesUSD, PartnerPayoutUSD, SolverPayoutUSD, NetRevenueUSD,
    NetRevenueNEAR, BuybackNEAR, BurnNEAR, HeldNEAR, TreasuryNEAR, SupplyNEAR,
    SwapVolumeUSD, Bps, PricePoint
)


class FlowStage(str, Enum):
    """Stages in the economic flow ledger."""
    CONTEXT_VOLUME = "context_volume"           # Swap volume (USD) - context strip
    GROSS_FEES = "gross_fees"                   # Gross fees (USD)
    PARTNER_PAYOUT = "partner_payout"           # Partner/affiliate payouts (USD)
    SOLVER_PAYOUT = "solver_payout"             # Solver/other payouts (USD)
    NET_REVENUE_SWEPT = "net_revenue_swept"     # Net revenue swept (USD, derived from NEAR)
    NET_REVENUE_NEAR = "net_revenue_near"       # Net revenue (NEAR)
    BUYBACK = "buyback"                          # Buyback NEAR acquired
    HELD = "held"                                # Held in revenue wallets
    SPENT = "spent"                              # Spent/transferred out
    UNKNOWN_DEST = "unknown_dest"                # Unknown destination
    BURNED = "burned"                            # Burned NEAR
    HELD_BUYBACK = "held_buyback"                # Held in buyback wallet
    REDISTRIBUTED = "redistributed"              # Redistributed/recirculated
    UNKNOWN_BUYBACK = "unknown_buyback"          # Unknown buyback destination


class NodeStatus(str, Enum):
    RECONCILED = "reconciled"
    PARTIAL = "partial"
    UNKNOWN = "unknown"
    UNRECONCILED = "unreconciled"


@dataclass
class FlowNode:
    id: str
    label: str
    stage: FlowStage
    amount: Decimal
    unit: str  # "USD" or "NEAR"
    alt_amount: Optional[Decimal] = None  # Amount in other unit
    alt_unit: Optional[str] = None
    kind: str = "derived"  # measured | derived | modeled
    status: NodeStatus = NodeStatus.RECONCILED
    calc: str = ""
    sources: List[str] = field(default_factory=list)
    price_source: Optional[str] = None
    evidence_refs: List[str] = field(default_factory=list)
    completeness_note: str = ""


@dataclass
class FlowEdge:
    source: str  # node id
    target: str  # node id
    amount: Decimal
    unit: str
    status: NodeStatus = NodeStatus.RECONCILED


@dataclass
class Residual:
    stage: str
    amount: Decimal
    unit: str
    reason: str
    sign: str  # "positive" | "negative"


class ReconciliationEntry(BaseModel):
    source: str
    value: Decimal
    unit: str
    delta_pct: Optional[Decimal] = None


@dataclass
class FlowLedger:
    period: str
    start: str
    end: str
    data_mode: str
    retrieved_at: str
    volume_usd: Optional[Decimal] = None
    effective_gross_take_bps: Optional[Decimal] = None
    nodes: List[FlowNode] = field(default_factory=list)
    edges: List[FlowEdge] = field(default_factory=list)
    residuals: List[Residual] = field(default_factory=list)
    reconciliation: dict = field(default_factory=dict)

    def add_node(self, node: FlowNode):
        self.nodes.append(node)

    def add_edge(self, edge: FlowEdge):
        self.edges.append(edge)

    def add_residual(self, residual: Residual):
        self.residuals.append(residual)


class FlowNodeModel(BaseModel):
    id: str
    label: str
    stage: str
    amount: Decimal
    unit: str
    alt_amount: Optional[Decimal] = None
    alt_unit: Optional[str] = None
    kind: str
    status: str
    calc: str
    sources: List[str] = []
    price_source: Optional[str] = None
    evidence_refs: List[str] = []
    completeness_note: str = ""


class FlowEdgeModel(BaseModel):
    source: str
    target: str
    amount: Decimal
    unit: str
    status: str


class ResidualModel(BaseModel):
    stage: str
    amount: Decimal
    unit: str
    reason: str
    sign: str


class ReconciliationEntryModel(BaseModel):
    source: str
    value: str  # string for flexibility
    unit: str
    delta_pct: Optional[str] = None


class FlowLedgerModel(BaseModel):
    period: str
    start: str
    end: str
    data_mode: str
    retrieved_at: str
    volume_usd: Optional[Decimal] = None
    effective_gross_take_bps: Optional[Decimal] = None
    nodes: list = []
    edges: list = []
    residuals: list = []
    reconciliation: dict = {}

    @classmethod
    def from_ledger(cls, ledger: FlowLedger) -> "FlowLedgerModel":
        return cls(
            period=ledger.period,
            start=ledger.start,
            end=ledger.end,
            data_mode=ledger.data_mode,
            retrieved_at=ledger.retrieved_at,
            volume_usd=ledger.volume_usd,
            effective_gross_take_bps=ledger.effective_gross_take_bps,
            nodes=[
                {
                    "id": n.id, "label": n.label, "stage": n.stage.value,
                    "amount": n.amount, "unit": n.unit,
                    "alt_amount": n.alt_amount, "alt_unit": n.alt_unit,
                    "kind": n.kind, "status": n.status.value,
                    "calc": n.calc, "sources": n.sources,
                    "price_source": n.price_source, "evidence_refs": n.evidence_refs,
                    "completeness_note": n.completeness_note,
                } for n in ledger.nodes
            ],
            edges=[
                {"source": e.source, "target": e.target, "amount": e.amount, "unit": e.unit, "status": e.status.value}
                for e in ledger.edges
            ],
            residuals=[
                {"stage": r.stage, "amount": r.amount, "unit": r.unit, "reason": r.reason, "sign": r.sign}
                for r in ledger.residuals
            ],
            reconciliation={
                k: [
                    {"source": v.get("source", ""), "value": str(v.get("value", "")), "unit": v.get("unit", ""), "delta_pct": str(v.get("delta_pct", ""))}
                    for v in vals
                ] for k, vals in ledger.reconciliation.items()
            },
        )

    def to_json(self) -> str:
        return self.model_dump_json(indent=1)


# Presets
PERIOD_PRESETS = ["7d", "30d", "90d", "ytd", "all"]


def period_to_dates(period: str, end: Optional[datetime] = None) -> tuple[datetime, datetime]:
    end = end or datetime.now()
    if period == "7d":
        start = end - timedelta(days=7)
    elif period == "30d":
        start = end - timedelta(days=30)
    elif period == "90d":
        start = end - timedelta(days=90)
    elif period == "ytd":
        start = datetime(end.year, 1, 1)
    elif period == "all":
        start = datetime(2024, 12, 10)  # First Intents fee data
    else:
        raise ValueError(f"Unknown period: {period}")
    return start, end
