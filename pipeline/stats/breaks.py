"""Structural break subsample runner."""
from __future__ import annotations
import numpy as np
from dataclasses import dataclass
from typing import Callable, Optional
from datetime import datetime, date


@dataclass
class SubsampleResult:
    label: str
    start: date
    end: date
    n: int
    result: dict  # Whatever the test function returns


# Key structural break dates
BUYBACK_START = date(2026, 2, 23)
EXPLOIT_DATE = date(2026, 10, 1)
EXPLOIT_WINDOW_DAYS = 14


def subsample_runner(
    data: np.ndarray,
    dates: np.ndarray,
    test_func: Callable[[np.ndarray], dict],
    break_dates: list[date] = None,
    exclude_windows: list[tuple[date, date]] = None,
    min_obs: int = 30
) -> list[SubsampleResult]:
    """Run test_func on full sample and structural break subsamples.

    Args:
        data: 1D array of observations
        dates: 1D array of datetime.date matching data
        test_func: Function taking 1D array -> dict of results
        break_dates: Dates to split on (e.g., [BUYBACK_START])
        exclude_windows: List of (start, end) to exclude (e.g., exploit window)
        min_obs: Minimum observations per subsample

    Returns:
        List of SubsampleResult for full sample and each subsample
    """
    dates = np.asarray(dates)
    break_dates = break_dates or [BUYBACK_START]
    exclude_windows = exclude_windows or [(EXPLOIT_DATE, date.fromordinal(EXPLOIT_DATE.toordinal() + EXPLOIT_WINDOW_DAYS))]

    results = []

    # Full sample
    if len(data) >= min_obs:
        results.append(SubsampleResult(
            label="full",
            start=dates[0],
            end=dates[-1],
            n=len(data),
            result=test_func(data)
        ))

    # Split at break dates
    for i, break_date in enumerate(break_dates):
        before_mask = dates < break_date
        after_mask = dates >= break_date

        for label, mask in [("pre_break", before_mask), ("post_break", after_mask)]:
            subset = data[mask]
            if len(subset) >= min_obs:
                subset_dates = dates[mask]
                results.append(SubsampleResult(
                    label=label,
                    start=subset_dates[0],
                    end=subset_dates[-1],
                    n=len(subset),
                    result=test_func(subset)
                ))

    # Exclude windows
    for start, end in exclude_windows:
        exclude_mask = (dates >= start) & (dates <= end)
        include_mask = ~exclude_mask
        subset = data[include_mask]
        if len(subset) >= min_obs:
            subset_dates = dates[include_mask]
            results.append(SubsampleResult(
                label=f"excl_{start}_{end}",
                start=subset_dates[0],
                end=subset_dates[-1],
                n=len(subset),
                result=test_func(subset)
            ))

    return results


def compare_verdicts(full: dict, subsample: dict, threshold: float = 0.1) -> dict:
    """Compare full sample result with subsample.

    Returns dict with 'verdict_changed', 'delta', 'details'.
    """
    # This is a generic comparison - specific implementations
    # should override based on their result structure
    return {
        "verdict_changed": False,
        "delta": None,
        "details": "Generic comparison not implemented"
    }
