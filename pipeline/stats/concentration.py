"""Concentration measures (Gini, HHI, top-k share)."""
from __future__ import annotations
import numpy as np


def gini(values: np.ndarray) -> float:
    """Gini coefficient.

    values: non-negative array (e.g., volumes per sender)
    Returns: Gini in [0, 1] (0 = perfect equality, 1 = max inequality)
    """
    x = np.asarray(values, dtype=float)
    x = x[x >= 0]
    if len(x) == 0 or x.sum() == 0:
        return 0.0

    x = np.sort(x)
    n = len(x)
    cumsum = np.cumsum(x)
    return float((2 * np.sum((np.arange(1, n + 1) * x)) / (n * cumsum[-1])) - (n + 1) / n)


def hhi(values: np.ndarray) -> float:
    """Herfindahl-Hirschman Index.

    values: non-negative array
    Returns: HHI in [0, 1] (0 = perfect competition, 1 = monopoly)
    """
    x = np.asarray(values, dtype=float)
    x = x[x >= 0]
    total = x.sum()
    if total == 0:
        return 0.0
    shares = x / total
    return float(np.sum(shares ** 2))


def top_k_share(values: np.ndarray, k: int = 10) -> float:
    """Share of total held by top-k.

    values: non-negative array
    Returns: share in [0, 1]
    """
    x = np.asarray(values, dtype=float)
    x = x[x >= 0]
    if len(x) == 0 or x.sum() == 0:
        return 0.0

    x = np.sort(x)[::-1]  # descending
    top_k = x[:k].sum()
    return float(top_k / x.sum())


def concentration_measures(values: np.ndarray) -> dict:
    """All concentration measures at once."""
    return {
        "gini": gini(values),
        "hhi": hhi(values),
        "top_10_share": top_k_share(values, 10),
        "top_5_share": top_k_share(values, 5),
        "top_1_share": top_k_share(values, 1),
    }


def quarterly_trend(series: dict[str, float]) -> float:
    """Compute quarterly trend (simple linear slope) from quarterly dict.

    series: {quarter_str: value} e.g., {"2026-Q1": 0.45, ...}
    Returns: slope per quarter
    """
    quarters = sorted(series.keys())
    if len(quarters) < 2:
        return 0.0

    x = np.arange(len(quarters))
    y = np.array([series[q] for q in quarters])

    # Simple linear regression
    slope = np.polyfit(x, y, 1)[0]
    return float(slope)


def quarterly_change(current: float, prior: float) -> float:
    """Quarter-over-quarter change."""
    if prior == 0:
        return float("inf")
    return (current - prior) / abs(prior)
