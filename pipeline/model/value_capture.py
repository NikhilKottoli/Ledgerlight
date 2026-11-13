"""Plan 06: Value Capture Model — Python reference implementation.

Breakeven analysis linking Intents volume to NEAR token economics.
All outputs are `modeled` — never presented as prediction or advice.
"""
from __future__ import annotations
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal
from enum import Enum

from pipeline.types.units import (
    GrossFeesUSD, NetRevenueNEAR, BuybackNEAR, BurnNEAR, NearAmount, UsdAmount, Bps,
    PricePoint, NetRevenueUSD, SwapVolumeUSD
)


class Scenario(str, Enum):
    BEAR = "bear"
    BASE = "base"
    BULL = "bull"


@dataclass(frozen=True)
class ModelInputs:
    """All inputs with source tags."""
    V0: UsdAmount              # Starting annual Intents volume (USD)
    g: Decimal                 # Annual volume growth rate (e.g., 0.2 = 20%)
    d: Decimal                 # Growth decay per year (e.g., 0.1 = 10% decay)
    r: Bps                     # Gross take rate (bps)
    dr: Bps                    # Annual take rate change (bps)
    c: Decimal                 # Protocol capture rate (net/gross)
    b: Decimal                 # Buyback allocation (share of net revenue to buybacks)
    phi: Decimal               # Burn fraction of bought-back NEAR [0, 1]
    P0: UsdAmount              # Current NEAR price (USD)
    P_growth: Decimal          # Annual NEAR price growth rate
    S0: NearAmount             # Current supply (NEAR)
    m: Decimal                 # Gross annual issuance rate
    beta: Decimal              # Gas burn offset rate (fraction of issuance burned)
    circulating_supply: NearAmount  # Circulating supply (NEAR)
    market_cap: UsdAmount      # Current market cap (USD)

    # Metadata
    V0_source: str = "measured"
    g_source: str = "modeled"
    d_source: str = "modeled"
    r_source: str = "measured"
    dr_source: str = "modeled"
    c_source: str = "measured"
    b_source: str = "measured"
    phi_source: str = "measured"
    P0_source: str = "measured"
    P_growth_source: str = "modeled"
    S0_source: str = "measured"
    m_source: str = "measured"
    beta_source: str = "measured"


@dataclass(frozen=True)
class YearlyResult:
    year: int
    V_t: UsdAmount           # Volume
    r_t: Bps                 # Take rate
    GrossFees_t: GrossFeesUSD
    NetRev_t: NetRevenueUSD
    NetRev_NEAR_t: NetRevenueNEAR
    Buyback_NEAR_t: BuybackNEAR
    Burned_NEAR_t: BurnNEAR
    Held_NEAR_t: NearAmount
    NetIssuance_t: NearAmount
    DeltaSupply_t: NearAmount
    RevYield_t: Decimal      # NetRev / MarketCap
    BuybackToIssuance_t: Decimal
    BurnToIssuance_t: Decimal
    RevToEmissions_t: Decimal


@dataclass(frozen=True)
class ModelOutput:
    years: list[YearlyResult]
    breakeven_volume_burn: UsdAmount | None  # V* where Burned = NetIssuance
    breakeven_volume_buyback: UsdAmount | None  # V* where Buyback = NetIssuance
    breakeven_multiple_burn: Decimal | None  # V* / V0
    breakeven_multiple_buyback: Decimal | None


def compute_yearly(inputs: ModelInputs, year: int, prev: YearlyResult | None) -> YearlyResult:
    """Compute all values for a single year."""
    if year == 0:
        V_t = inputs.V0
        g_t = inputs.g
        r_t = inputs.r
    else:
        g_t = max(Decimal("0"), inputs.g - inputs.d * Decimal(str(year)))
        V_t = UsdAmount(prev.V_t * (Decimal("1") + g_t))
        r_t = Bps(max(Decimal("0"), Decimal(str(inputs.r)) + Decimal(str(inputs.dr)) * Decimal(str(year))))

    GrossFees_t = GrossFeesUSD(V_t * Decimal(str(r_t)) / Decimal("10000"))
    NetRev_t = NetRevenueUSD(GrossFees_t * inputs.c)

    P_t = UsdAmount(inputs.P0 * (Decimal("1") + inputs.P_growth) ** Decimal(str(year)))
    NetRev_NEAR_t = NetRevenueNEAR(NetRev_t / Decimal(str(P_t)))
    Buyback_NEAR_t = BuybackNEAR(NetRev_NEAR_t * inputs.b)
    Burned_NEAR_t = BurnNEAR(Buyback_NEAR_t * inputs.phi)
    Held_NEAR_t = NearAmount(Decimal(str(Buyback_NEAR_t)) - Decimal(str(Burned_NEAR_t)))

    net_issuance = NearAmount(Decimal(str(inputs.S0)) * inputs.m * (Decimal("1") - inputs.beta))
    NetIssuance_t = net_issuance
    DeltaSupply_t = NearAmount(NetIssuance_t - Burned_NEAR_t)

    # Approximate market cap growth
    supply_t = inputs.circulating_supply + DeltaSupply_t * Decimal(str(year + 1))
    market_cap_t = UsdAmount(Decimal(str(P_t)) * Decimal(str(supply_t)))

    RevYield_t = NetRev_t / market_cap_t if market_cap_t > 0 else Decimal("0")
    BuybackToIssuance_t = Buyback_NEAR_t / NetIssuance_t if NetIssuance_t > 0 else Decimal("0")
    BurnToIssuance_t = Burned_NEAR_t / NetIssuance_t if NetIssuance_t > 0 else Decimal("0")
    RevToEmissions_t = NetRev_NEAR_t / NetIssuance_t if NetIssuance_t > 0 else Decimal("0")

    return YearlyResult(
        year=year,
        V_t=V_t,
        r_t=r_t,
        GrossFees_t=GrossFees_t,
        NetRev_t=NetRev_t,
        NetRev_NEAR_t=NetRev_NEAR_t,
        Buyback_NEAR_t=Buyback_NEAR_t,
        Burned_NEAR_t=Burned_NEAR_t,
        Held_NEAR_t=Held_NEAR_t,
        NetIssuance_t=NetIssuance_t,
        DeltaSupply_t=DeltaSupply_t,
        RevYield_t=RevYield_t,
        BuybackToIssuance_t=BuybackToIssuance_t,
        BurnToIssuance_t=BurnToIssuance_t,
        RevToEmissions_t=RevToEmissions_t,
    )


def run_model(inputs: ModelInputs, horizon_years: int = 5) -> "ModelOutput":
    """Run the model for N years."""
    years = []
    prev = None
    for y in range(horizon_years):
        yr = compute_yearly(inputs, y, prev)
        years.append(yr)
        prev = yr

    # Breakeven analysis
    net_issuance = NearAmount(Decimal(str(inputs.S0)) * inputs.m * (Decimal("1") - inputs.beta))

    if inputs.phi > 0:
        denom_burn = Decimal(str(inputs.r)) * inputs.c * inputs.b * inputs.phi
        if denom_burn > 0:
            V_star_burn = UsdAmount(
                net_issuance * inputs.P0 * Decimal("10000") / denom_burn
            )
            breakeven_multiple_burn = V_star_burn / inputs.V0
        else:
            V_star_burn = None
            breakeven_multiple_burn = None
    else:
        V_star_burn = None
        breakeven_multiple_burn = None

    denom_buyback = Decimal(str(inputs.r)) * inputs.c * inputs.b
    if denom_buyback > 0:
        V_star_buyback = UsdAmount(
            net_issuance * inputs.P0 * Decimal("10000") / denom_buyback
        )
        breakeven_multiple_buyback = V_star_buyback / inputs.V0
    else:
        V_star_buyback = None
        breakeven_multiple_buyback = None

    return ModelOutput(
        years=years,
        breakeven_volume_burn=V_star_burn,
        breakeven_volume_buyback=V_star_buyback,
        breakeven_multiple_burn=breakeven_multiple_burn,
        breakeven_multiple_buyback=breakeven_multiple_buyback,
    )


# Default measured anchors (from Plan 03/05 data)
def get_default_inputs() -> ModelInputs:
    """Default inputs anchored to measured trailing values."""
    return ModelInputs(
        V0=UsdAmount(Decimal("3800000000")),      # ~$3.8B annualized (90d trailing)
        g=Decimal("0.15"),                         # 15% annual growth (trailing)
        d=Decimal("0.05"),                         # 5% decay per year
        r=Bps(Decimal("160")),                     # 16 bps take rate
        dr=Bps(Decimal("-5")),                     # -5 bps/yr compression
        c=Decimal("0.35"),                         # 35% capture rate (net/gross)
        b=Decimal("0.4"),                          # 40% of net revenue to buybacks
        phi=Decimal("0.0"),                        # 0% burned (per onchain evidence)
        P0=UsdAmount(Decimal("3.5")),              # $3.50/NEAR
        P_growth=Decimal("0.0"),                   # Flat price assumption
        S0=NearAmount(Decimal("1310000000")),      # ~1.31B NEAR supply
        m=Decimal("0.025"),                        # 2.5% gross issuance
        beta=Decimal("0.0"),                       # Gas burn offset
        circulating_supply=NearAmount(Decimal("1000000000")),  # ~1B circulating
        market_cap=UsdAmount(Decimal("3500000000")),  # $3.5B market cap
        V0_source="measured",
        r_source="measured",
        c_source="measured",
        b_source="measured",
        phi_source="measured",
        P0_source="measured",
        S0_source="measured",
        m_source="measured",
    )


# Export ModelOutput for use
@dataclass(frozen=True)
class ModelOutput:
    years: list[YearlyResult]
    breakeven_volume_burn: UsdAmount | None
    breakeven_volume_buyback: UsdAmount | None
    breakeven_multiple_burn: Decimal | None
    breakeven_multiple_buyback: Decimal | None


if __name__ == "__main__":
    inputs = get_default_inputs()
    output = run_model(inputs, horizon_years=5)

    print("=== VALUE CAPTURE MODEL ===")
    print(f"Horizon: 5 years")
    print(f"\nInputs:")
    print(f"  V0: ${inputs.V0:,.0f}")
    print(f"  g: {inputs.g*100:.1f}% (decay {inputs.d*100:.1f}%/yr)")
    print(f"  r: {inputs.r} bps (dr {inputs.dr} bps/yr)")
    print(f"  c: {inputs.c*100:.1f}%")
    print(f"  b: {inputs.b*100:.1f}%")
    print(f"  phi: {inputs.phi*100:.1f}%")
    print(f"  P0: ${inputs.P0}")
    print(f"  S0: {inputs.S0:,.0f} NEAR")
    print(f"  m: {inputs.m*100:.2f}%")
    print(f"  phi: {inputs.phi*100:.1f}% (burn fraction)")

    print(f"\nYearly Results:")
    for yr in output.years:
        print(f"  Year {yr.year}: V=${yr.V_t:,.0f} | r={yr.r_t} bps | GrossFees=${yr.GrossFees_t:,.0f} | NetRev=${yr.NetRev_t:,.0f} | Buyback={yr.Buyback_NEAR_t:,.0f} NEAR | Burned={yr.Burned_NEAR_t:,.0f} NEAR | NetIssuance={yr.NetIssuance_t:,.0f} NEAR | DeltaSupply={yr.DeltaSupply_t:,.0f} NEAR | RevYield={yr.RevYield_t*100:.2f}% | Buyback/Issuance={yr.BuybackToIssuance_t*100:.1f}%")

    print(f"\n=== BREAKEVEN ANALYSIS ===")
    if output.breakeven_volume_burn:
        print(f"  V* (burn = issuance): ${output.breakeven_volume_burn:,.0f} ({output.breakeven_multiple_burn:.1f}x current)")
    else:
        print(f"  V* (burn = issuance): NOT REACHABLE (phi=0)")

    if output.breakeven_volume_buyback:
        print(f"  V* (buyback = issuance): ${output.breakeven_volume_buyback:,.0f} ({output.breakeven_multiple_buyback:.1f}x current)")
    else:
        print(f"  V* (buyback = issuance): NOT REACHABLE")
