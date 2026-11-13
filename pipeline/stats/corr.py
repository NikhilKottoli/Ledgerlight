"""Correlation and bootstrap utilities for thesis tests."""
from __future__ import annotations
import numpy as np
import pandas as pd
from scipy import stats
from typing import Optional
from dataclasses import dataclass


@dataclass
class CorrelationResult:
    rho: float
    p_value: float
    n: int
    ci_low: Optional[float] = None
    ci_high: Optional[float] = None
    method: str = "pearson"


def pearson_corr(x: np.ndarray, y: np.ndarray) -> CorrelationResult:
    """Pearson correlation with p-value."""
    r, p = stats.pearsonr(x, y)
    return CorrelationResult(rho=r, p_value=p, n=len(x), method="pearson")


def spearman_corr(x: np.ndarray, y: np.ndarray) -> CorrelationResult:
    """Spearman rank correlation with p-value."""
    r, p = stats.spearmanr(x, y)
    return CorrelationResult(rho=r, p_value=p, n=len(x), method="spearman")


def lagged_cross_corr(
    x: np.ndarray,
    y: np.ndarray,
    max_lag: int = 8,
    method: str = "pearson"
) -> list[CorrelationResult]:
    """Cross-correlation at lags -max_lag to +max_lag.

    Positive lag: x leads y (x_{t-lag} vs y_t)
    """
    results = []
    for lag in range(-max_lag, max_lag + 1):
        if lag < 0:
            x_lag, y_lag = x[:lag], y[-lag:]
        elif lag > 0:
            x_lag, y_lag = x[lag:], y[:-lag]
        else:
            x_lag, y_lag = x, y

        if len(x_lag) < 10:
            results.append(CorrelationResult(rho=np.nan, p_value=np.nan, n=0, method=method))
            continue

        if method == "pearson":
            res = pearson_corr(x_lag, y_lag)
        else:
            res = spearman_corr(x_lag, y_lag)
        res.ci_low = None  # Will be filled by bootstrap if needed
        res.ci_high = None
        results.append(res)

    return results


def rolling_corr(x: np.ndarray, y: np.ndarray, window: int = 26) -> np.ndarray:
    """Rolling Pearson correlation."""
    return pd.Series(x).rolling(window).corr(pd.Series(y)).values


def partial_corr(x: np.ndarray, y: np.ndarray, z: np.ndarray) -> float:
    """Partial correlation of x and y controlling for z.

    Returns partial correlation coefficient.
    """
    # Residuals after regressing on z
    X = np.column_stack([z, np.ones_like(z)])
    rx = x - X @ np.linalg.lstsq(X, x, rcond=None)[0]
    ry = y - X @ np.linalg.lstsq(X, y, rcond=None)[0]
    return np.corrcoef(rx, ry)[0, 1]


@dataclass
class BootstrapCI:
    low: float
    high: float
    n_resamples: int


def stationary_bootstrap_ci(
    stat_func,
    data: tuple[np.ndarray, ...],
    n_resamples: int = 1000,
    block_length: int = 10,
    confidence: float = 0.95,
    random_state: Optional[int] = 42
) -> BootstrapCI:
    """Stationary bootstrap confidence interval for a statistic.

    Uses Politis-Romano stationary bootstrap (geometric block lengths).
    """
    rng = np.random.default_rng(random_state)
    n = len(data[0])
    stats = []

    for _ in range(n_resamples):
        # Stationary bootstrap sampling
        indices = []
        i = rng.integers(0, n)
        for _ in range(n):
            indices.append(i)
            if rng.random() < 1.0 / block_length:
                i = rng.integers(0, n)
            else:
                i = (i + 1) % n

        sample = tuple(d[indices] for d in data)
        stats.append(stat_func(*sample))

    stats = np.array(stats)
    alpha = (1 - confidence) / 2
    low = np.percentile(stats, alpha * 100)
    high = np.percentile(stats, (1 - alpha) * 100)

    return BootstrapCI(low=low, high=high, n_resamples=n_resamples)


def benjamini_hochberg_fdr(p_values: np.ndarray, alpha: float = 0.05) -> np.ndarray:
    """Benjamini-Hochberg FDR correction.

    Returns boolean array: True = significant after FDR.
    """
    m = len(p_values)
    sorted_idx = np.argsort(p_values)
    sorted_p = p_values[sorted_idx]

    # BH threshold
    thresholds = alpha * (np.arange(1, m + 1) / m)
    significant = sorted_p <= thresholds

    # Find largest k where p_k <= threshold
    if not np.any(significant):
        return np.zeros(m, dtype=bool)

    k = np.where(significant)[0].max()
    result = np.zeros(m, dtype=bool)
    result[sorted_idx[:k+1]] = True
    return result


def lag_scan_with_fdr(
    x: np.ndarray,
    y: np.ndarray,
    max_lag: int = 8,
    method: str = "pearson",
    n_bootstrap: int = 1000,
    alpha: float = 0.05
) -> list[dict]:
    """Full lag scan with bootstrap CIs and BH-FDR.

    Returns list of dicts per lag with rho, p, CI, fdr_significant.
    """
    results = lagged_cross_corr(x, y, max_lag, method)
    p_values = np.array([r.p_value for r in results])

    # FDR
    fdr_sig = benjamini_hochberg_fdr(p_values, alpha)

    # Bootstrap CIs
    for i, r in enumerate(results):
        if np.isnan(r.rho):
            continue
        lag = i - max_lag
        if method == "pearson":
            stat_f = lambda a, b: stats.pearsonr(a, b)[0]
        else:
            stat_f = lambda a, b: stats.spearmanr(a, b)[0]

        if lag < 0:
            xa, ya = x[:lag], y[-lag:]
        elif lag > 0:
            xa, ya = x[lag:], y[:-lag]
        else:
            xa, ya = x, y

        if len(xa) >= 10:
            ci = stationary_bootstrap_ci(stat_f, (xa, ya), n_resamples=n_bootstrap)
            r.ci_low = ci.low
            r.ci_high = ci.high

    out = []
    for i, r in enumerate(results):
        out.append({
            "lag": i - max_lag,
            "rho": r.rho,
            "p_value": r.p_value,
            "n": r.n,
            "ci_low": r.ci_low,
            "ci_high": r.ci_high,
            "fdr_significant": bool(fdr_sig[i]),
            "method": r.method,
        })
    return out
