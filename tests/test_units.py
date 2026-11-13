"""Tests for typed units (Plan 02 task 2.2)."""
import pytest
from decimal import Decimal
from pipeline.types.units import (
    GrossFeesUSD, NetRevenueNEAR, BuybackNEAR, BurnNEAR,
    SwapVolumeUSD, PartnerPayoutUSD, Bps, PricePoint,
    gross_fees_usd_to_net_revenue_near, buyback_near_to_burn_near,
    TypedAmount,
)


def test_type_mixing_raises():
    with pytest.raises(TypeError):
        _ = GrossFeesUSD("100") + NetRevenueNEAR("50")
    with pytest.raises(TypeError):
        _ = BuybackNEAR("100") + BurnNEAR("50")
    with pytest.raises(TypeError):
        _ = SwapVolumeUSD("100") + GrossFeesUSD("50")
    with pytest.raises(TypeError):
        _ = PartnerPayoutUSD("100") + NetRevenueNEAR("50")


def test_conversion_requires_price():
    g = GrossFeesUSD("1000")
    price = PricePoint(near_per_usd=Decimal("0.2"), source="test", timestamp="2026-01-01T00:00:00Z")
    nr = gross_fees_usd_to_net_revenue_near(g, Bps("500"), price)
    # 1000 USD * 5% = 50 USD; 50 USD * 0.2 NEAR/USD = 10 NEAR
    assert nr == NetRevenueNEAR("10")

    with pytest.raises(ValueError):
        buyback_near_to_burn_near(BuybackNEAR("100"), Decimal("1.5"))
    with pytest.raises(ValueError):
        buyback_near_to_burn_near(BuybackNEAR("100"), Decimal("-0.1"))


def test_burn_fraction():
    b = BuybackNEAR("1000")
    br = buyback_near_to_burn_near(b, Decimal("0.3"))
    assert br == BurnNEAR("300")


def test_typed_amount_validation():
    ta = TypedAmount(value=Decimal("100"), unit="GrossFeesUSD", kind="measured")
    assert ta.unit == "GrossFeesUSD"
    with pytest.raises(ValueError):
        TypedAmount(value=Decimal("100"), unit="INVALID", kind="measured")
    with pytest.raises(ValueError):
        TypedAmount(value=Decimal("100"), unit="USD", kind="predicted")
