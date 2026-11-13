"""Plan 02 task 2.2: Typed units (D13).
Distinct types for USD vs NEAR, gross vs net, buyback vs burn, volume vs fees vs revenue.
"""
from __future__ import annotations
from dataclasses import dataclass
from decimal import Decimal
from typing import NewType
from pydantic import BaseModel, field_validator

# --- Base scalar types (branded via NewType) ---
UsdAmount = NewType("UsdAmount", Decimal)
NearAmount = NewType("NearAmount", Decimal)

# Bps as a real class (not NewType) so isinstance works
class Bps:
    """Basis points (1 = 0.01%)."""
    __slots__ = ("_value",)
    def __init__(self, value: Decimal | float | int | str):
        self._value = Decimal(str(value))
    def __repr__(self): return f"Bps({self._value})"
    def __str__(self): return str(self._value)
    def to_decimal(self) -> Decimal:
        return self._value / Decimal(10000)
    def __eq__(self, other): return isinstance(other, Bps) and self._value == other._value
    def __hash__(self): return hash(self._value)

# --- Semantic wrappers (distinct types, no implicit conversion) ---
class _Semantic(Decimal):
    """Base for semantic types that wrap Decimal but don't mix."""
    __slots__ = ()

    def __new__(cls, value: Decimal | float | int | str):
        return super().__new__(cls, str(value))

    def __add__(self, other):
        if not isinstance(other, self.__class__):
            raise TypeError(f"Cannot add {type(other).__name__} to {self.__class__.__name__}")
        return self.__class__(super().__add__(other))

    def __sub__(self, other):
        if not isinstance(other, self.__class__):
            raise TypeError(f"Cannot subtract {type(other).__name__} from {self.__class__.__name__}")
        return self.__class__(super().__sub__(other))

    def __mul__(self, other: Decimal | float | int | Bps):
        if isinstance(other, Bps):
            other = other.to_decimal()
        return self.__class__(super().__mul__(Decimal(str(other))))

    def __truediv__(self, other: Decimal | float | int | Bps):
        if isinstance(other, Bps):
            other = other.to_decimal()
        return self.__class__(super().__truediv__(Decimal(str(other))))


class GrossFeesUSD(_Semantic): pass
class PartnerPayoutUSD(_Semantic): pass
class SolverPayoutUSD(_Semantic): pass
class NetRevenueUSD(_Semantic): pass

class NetRevenueNEAR(_Semantic): pass
class BuybackNEAR(_Semantic): pass
class BurnNEAR(_Semantic): pass
class HeldNEAR(_Semantic): pass
class TreasuryNEAR(_Semantic): pass
class SupplyNEAR(_Semantic): pass

class SwapVolumeUSD(_Semantic): pass
class AppFeesUSD(_Semantic): pass

# --- Price point for USD <-> NEAR conversion ---
@dataclass(frozen=True)
class PricePoint:
    near_per_usd: Decimal  # NEAR per 1 USD (inverse of usual quote)
    source: str
    timestamp: str  # ISO8601

    def usd_to_near(self, usd: GrossFeesUSD | NetRevenueUSD | PartnerPayoutUSD | SwapVolumeUSD) -> NearAmount:
        return NearAmount(usd * self.near_per_usd)

    def near_to_usd(self, near: NearAmount) -> UsdAmount:
        return UsdAmount(near / self.near_per_usd)


# --- Pydantic models for serialization (registry, artifacts) ---
class TypedAmount(BaseModel):
    """Serialized form: value + unit tag. Never mix units in arithmetic."""
    value: Decimal
    unit: str  # one of: "USD", "NEAR", "BPS", or semantic tags
    kind: str  # "measured" | "derived" | "modeled"

    @field_validator("unit")
    @classmethod
    def check_unit(cls, v: str) -> str:
        allowed = {"USD", "NEAR", "BPS",
                   "GrossFeesUSD", "PartnerPayoutUSD", "SolverPayoutUSD", "NetRevenueUSD",
                   "NetRevenueNEAR", "BuybackNEAR", "BurnNEAR", "HeldNEAR", "TreasuryNEAR", "SupplyNEAR",
                   "SwapVolumeUSD", "AppFeesUSD"}
        if v not in allowed:
            raise ValueError(f"unit must be one of {sorted(allowed)}")
        return v

    @field_validator("kind")
    @classmethod
    def check_kind(cls, v: str) -> str:
        if v not in {"measured", "derived", "modeled"}:
            raise ValueError("kind must be measured|derived|modeled")
        return v


# --- Conversion helpers (explicit, never implicit) ---
def gross_fees_usd_to_net_revenue_near(gross: GrossFeesUSD, capture_rate_bps: Bps, price: PricePoint) -> NetRevenueNEAR:
    """NetRevenueNEAR = GrossFeesUSD * capture_rate / 10000 / price_usd_per_near"""
    net_usd = NetRevenueUSD(gross * capture_rate_bps)
    return NetRevenueNEAR(price.usd_to_near(net_usd))


def buyback_near_to_burn_near(buyback: BuybackNEAR, burn_fraction: Decimal) -> BurnNEAR:
    """BurnNEAR = BuybackNEAR * burn_fraction. burn_fraction in [0,1]."""
    if not Decimal("0") <= burn_fraction <= Decimal("1"):
        raise ValueError("burn_fraction must be in [0,1]")
    return BurnNEAR(buyback * burn_fraction)


# --- Tests (inline, run with pytest) ---
if __name__ == "__main__":
    # Type mixing should raise
    try:
        _ = GrossFeesUSD("100") + NetRevenueNEAR("50")
        print("FAIL: GrossFeesUSD + NetRevenueNEAR should raise")
    except TypeError as e:
        print(f"OK: {e}")

    try:
        _ = BuybackNEAR("100") + BurnNEAR("50")
        print("FAIL: BuybackNEAR + BurnNEAR should raise")
    except TypeError as e:
        print(f"OK: {e}")

    # Conversion requires PricePoint
    price = PricePoint(near_per_usd=Decimal("0.2"), source="test", timestamp="2026-01-01T00:00:00Z")
    g = GrossFeesUSD("1000")
    nr = gross_fees_usd_to_net_revenue_near(g, Bps("500"), price)  # 5% capture
    print(f"GrossFeesUSD(1000) * 500bps / price(0.2) = NetRevenueNEAR({nr})")
    assert nr == NetRevenueNEAR("250")

    # Burn fraction
    b = BuybackNEAR("1000")
    br = buyback_near_to_burn_near(b, Decimal("0.3"))
    print(f"BuybackNEAR(1000) * 0.3 = BurnNEAR({br})")
    assert br == BurnNEAR("300")

    print("All unit tests passed")
