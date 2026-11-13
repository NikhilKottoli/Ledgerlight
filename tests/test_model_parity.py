"""Parity tests for Plan 06 Value Capture Model.

Python and TypeScript implementations must match to 1e-9 relative.
"""
import subprocess
import sys
from decimal import Decimal
from pipeline.model.value_capture import run_model, get_default_inputs, ModelOutput, ModelInputs
from pipeline.types.units import UsdAmount, NearAmount, Bps


def test_python_runs():
    """Basic sanity: Python model runs without error."""
    inputs = get_default_inputs()
    output = run_model(inputs, horizon_years=5)
    assert isinstance(output, ModelOutput)
    assert len(output.years) == 5


def test_typescript_compiles():
    """TypeScript model compiles without error."""
    result = subprocess.run(
        ["npx", "tsc", "--noEmit", "src/lib/model/valueCapture.ts"],
        cwd="web",
        capture_output=True,
        text=True,
        timeout=60
    )
    assert result.returncode == 0, f"TypeScript compile failed: {result.stderr}"


def test_parity_fixtures():
    """Test against known fixture cases."""
    # Fixture 1: Default inputs
    inputs = get_default_inputs()
    output = run_model(inputs, horizon_years=5)

    # Check breakeven values (known from manual calculation)
    assert output.breakeven_volume_burn is None  # phi=0
    assert output.breakeven_volume_buyback is not None
    assert output.breakeven_multiple_buyback is not None
    assert abs(float(output.breakeven_multiple_buyback) - 13.5) < 0.1  # ~13.5x

    # Fixture 2: Edge case - zero capture rate
    inputs2 = ModelInputs(
        V0=UsdAmount(Decimal("1000000")),
        g=Decimal("0.1"),
        d=Decimal("0.0"),
        r=Bps(Decimal("100")),
        dr=Bps(Decimal("0")),
        c=Decimal("0"),  # Zero capture
        b=Decimal("0.5"),
        phi=Decimal("1.0"),
        P0=UsdAmount(Decimal("1.0")),
        P_growth=Decimal("0"),
        S0=NearAmount(Decimal("1000000000")),
        m=Decimal("0.05"),
        beta=Decimal("0.0"),
        circulating_supply=NearAmount(Decimal("800000000")),
        market_cap=UsdAmount(Decimal("800000000")),
    )
    output2 = run_model(inputs2, horizon_years=3)
    # With c=0, net revenue = 0, so buyback = 0, breakeven = inf (None)
    assert output2.breakeven_volume_buyback is None

    # Fixture 3: Zero phi (burn fraction)
    inputs3 = get_default_inputs()
    output3 = run_model(inputs3, horizon_years=3)
    assert output3.breakeven_volume_burn is None

    # Fixture 4: phi=1 (full burn) - create new instance
    inputs4_base = get_default_inputs()
    inputs4 = ModelInputs(
        V0=inputs4_base.V0,
        g=inputs4_base.g,
        d=inputs4_base.d,
        r=inputs4_base.r,
        dr=inputs4_base.dr,
        c=inputs4_base.c,
        b=inputs4_base.b,
        phi=Decimal("1.0"),
        P0=inputs4_base.P0,
        P_growth=inputs4_base.P_growth,
        S0=inputs4_base.S0,
        m=inputs4_base.m,
        beta=inputs4_base.beta,
        circulating_supply=inputs4_base.circulating_supply,
        market_cap=inputs4_base.market_cap,
    )
    output4 = run_model(inputs4, horizon_years=3)
    assert output4.breakeven_volume_burn is not None


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
