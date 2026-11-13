"""Stationarity tests (ADF, KPSS)."""
from __future__ import annotations
import numpy as np
from dataclasses import dataclass
from typing import Optional
from statsmodels.tsa.stattools import adfuller, kpss


@dataclass
class StationarityResult:
    test: str
    statistic: float
    p_value: float
    critical_values: dict[str, float]
    is_stationary: bool
    used_diff: int = 0


def adf_test(series: np.ndarray, max_diff: int = 2, alpha: float = 0.05) -> StationarityResult:
    """Augmented Dickey-Fuller test with automatic differencing.

    Returns StationarityResult with the lowest diff order that achieves stationarity.
    """
    current = np.asarray(series, dtype=float)
    diff_order = 0

    while diff_order <= max_diff:
        result = adfuller(current, autolag="AIC")
        stat, pval, _, _, crit_vals, _ = result

        is_stat = pval < alpha
        if is_stat or diff_order == max_diff:
            return StationarityResult(
                test="ADF",
                statistic=stat,
                p_value=pval,
                critical_values=dict(crit_vals),
                is_stationary=is_stat,
                used_diff=diff_order,
            )

        # Difference and retry
        current = np.diff(current)
        diff_order += 1

    # Should not reach here
    return StationarityResult(
        test="ADF",
        statistic=stat,
        p_value=pval,
        critical_values=dict(crit_vals),
        is_stationary=False,
        used_diff=diff_order,
    )


def kpss_test(series: np.ndarray, max_diff: int = 2, alpha: float = 0.05) -> StationarityResult:
    """KPSS test with automatic differencing.

    Null hypothesis: series is stationary (trend-stationary).
    """
    current = np.asarray(series, dtype=float)
    diff_order = 0

    while diff_order <= max_diff:
        stat, pval, _, crit_vals = kpss(current, regression="ct", nlags="auto")

        # KPSS: reject null (p < alpha) => non-stationary
        is_stat = pval >= alpha
        if is_stat or diff_order == max_diff:
            return StationarityResult(
                test="KPSS",
                statistic=stat,
                p_value=pval,
                critical_values=dict(crit_vals),
                is_stationary=is_stat,
                used_diff=diff_order,
            )

        current = np.diff(current)
        diff_order += 1

    return StationarityResult(
        test="KPSS",
        statistic=stat,
        p_value=pval,
        critical_values=dict(crit_vals),
        is_stationary=False,
        used_diff=diff_order,
    )


def is_stationary(series: np.ndarray, method: str = "adf", **kwargs) -> tuple[bool, int]:
    """Quick check: returns (is_stationary, diff_order_used)."""
    if method.lower() == "adf":
        res = adf_test(series, **kwargs)
    elif method.lower() == "kpss":
        res = kpss_test(series, **kwargs)
    else:
        raise ValueError(f"method must be adf|kpss, got {method}")
    return res.is_stationary, res.used_diff
