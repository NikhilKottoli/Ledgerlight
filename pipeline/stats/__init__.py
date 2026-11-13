"""Plan 07: Statistics library for thesis tests.

Pure, tested functions with fixed seeds.
"""
from .transform import log_diff, weekly_aggregate, drop_missing_weeks, align_series, trailing_window
from .stationarity import adf_test, kpss_test, is_stationary
from .corr import (
    pearson_corr, spearman_corr, lagged_cross_corr, rolling_corr,
    partial_corr, stationary_bootstrap_ci, benjamini_hochberg_fdr, lag_scan_with_fdr,
    CorrelationResult, BootstrapCI
)
from .concentration import gini, hhi, top_k_share, concentration_measures
from .breaks import subsample_runner, SubsampleResult, BUYBACK_START, EXPLOIT_DATE

__all__ = [
    "log_diff", "weekly_aggregate", "drop_missing_weeks", "align_series", "trailing_window",
    "adf_test", "kpss_test", "is_stationary",
    "pearson_corr", "spearman_corr", "lagged_cross_corr", "rolling_corr",
    "partial_corr", "stationary_bootstrap_ci", "benjamini_hochberg_fdr", "lag_scan_with_fdr",
    "CorrelationResult", "BootstrapCI",
    "gini", "hhi", "top_k_share", "concentration_measures",
    "subsample_runner", "SubsampleResult", "BUYBACK_START", "EXPLOIT_DATE",
]
