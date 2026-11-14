"""Data transforms for thesis tests."""

from __future__ import annotations

from decimal import Decimal

import numpy as np
import pandas as pd


def log_diff(series: pd.Series) -> pd.Series:
    """Log difference: log(x_t) - log(x_{t-1}). Drops first NaN."""
    return np.log(series).diff()


def weekly_aggregate(daily: pd.Series, how: str = "sum", min_days: int = 5) -> pd.Series:
    """Aggregate daily series to ISO weeks.

    Args:
        daily: Series with DatetimeIndex (daily frequency)
        how: "sum", "mean", "last"
        min_days: Minimum days in week to keep (else NaN)

    Returns:
        Weekly series indexed by week end date (Sunday)
    """
    if how == "sum":
        weekly = daily.resample("W-SUN").sum(min_count=min_days)
    elif how == "mean":
        grouped = daily.resample("W-SUN")
        weekly = grouped.mean()
        weekly[grouped.count() < min_days] = np.nan
    elif how == "last":
        weekly = daily.resample("W-SUN").last()
    else:
        raise ValueError(f"how must be sum|mean|last, got {how}")
    return weekly


def drop_missing_weeks(series: pd.Series, min_obs: int = 52) -> tuple[pd.Series, int]:
    """Drop weeks with NaN, report count dropped.

    Args:
        series: Weekly series
        min_obs: Minimum observations required (else raises)

    Returns:
        (cleaned_series, n_dropped)
    """
    n_before = len(series)
    cleaned = series.dropna()
    n_dropped = n_before - len(cleaned)
    if len(cleaned) < min_obs:
        raise ValueError(f"Insufficient observations: {len(cleaned)} < {min_obs}")
    return cleaned, n_dropped


def align_series(*series: pd.Series) -> list[pd.Series]:
    """Align multiple series to common index (intersection)."""
    common_idx = series[0].index
    for s in series[1:]:
        common_idx = common_idx.intersection(s.index)
    return [s.loc[common_idx] for s in series]


def trailing_window(series: pd.Series, window: str) -> pd.Series:
    """Get trailing window (e.g., '90d', '365d')."""
    end = series.index.max()
    if window.endswith("d"):
        days = int(window[:-1])
        start = end - pd.Timedelta(days=days)
    else:
        raise ValueError(f"Only 'Nd' windows supported, got {window}")
    return series[(series.index >= start) & (series.index <= end)]


def growth_rate(current: pd.Series, prior: pd.Series) -> Decimal:
    """Growth rate: (current - prior) / |prior|."""
    if prior == 0:
        return Decimal("NaN")
    return Decimal(str((current - prior).abs() / prior.abs()))
