"""Plan 07: Thesis test runner.

Evaluates hypotheses H1-H5 with rule-based verdicts.
"""
from __future__ import annotations
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pipeline.stats import (
    log_diff, weekly_aggregate, drop_missing_weeks, align_series,
    adf_test, kpss_test, is_stationary,
    pearson_corr, spearman_corr, lagged_cross_corr, rolling_corr,
    partial_corr, stationary_bootstrap_ci, benjamini_hochberg_fdr, lag_scan_with_fdr,
    gini, hhi, top_k_share, concentration_measures,
    subsample_runner, BUYBACK_START, EXPLOIT_DATE
)

ARTIFACTS = Path(__file__).resolve().parents[2] / "web" / "public" / "data"
THESIS = Path(__file__).resolve().parents[2] / "thesis"

PREREG_TAG = "prereg-v1"


def load_artifact(metric_id: str) -> dict | None:
    path = ARTIFACTS / f"{metric_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def series_to_pd(artifact: dict) -> "pd.Series":
    import pandas as pd
    dates = [pd.Timestamp(p["t"]) for p in artifact["series"] if p["v"] is not None]
    values = [float(p["v"]) for p in artifact["series"] if p["v"] is not None]
    return pd.Series(values, index=pd.DatetimeIndex(dates))


def evaluate_h1(artifacts: dict) -> dict:
    """H1: Intents adoption growing sustainably."""
    # TODO: Implement using actual artifact data
    # For now, return structure
    return {
        "id": "H1",
        "verdict": "INSUFFICIENT_DATA",
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "prereg_tag": PREREG_TAG,
        "tests": [],
        "supporting": [],
        "contradicting": [],
        "kill_criteria_hit": [],
        "unavailable": [{"item": "intents daily metrics", "reason": "Requires Intents JWT"}],
    }


def evaluate_h2(artifacts: dict) -> dict:
    """H2: Intents predicts NEAR network activity."""
    # TODO: Implement lagged cross-correlation with bootstrap CIs and BH-FDR
    return {
        "id": "H2",
        "verdict": "INSUFFICIENT_DATA",
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "prereg_tag": PREREG_TAG,
        "tests": [],
        "supporting": [],
        "contradicting": [],
        "kill_criteria_hit": [],
        "unavailable": [{"item": "non-Intents NEAR activity", "reason": "Requires BigQuery quota"}],
    }


def evaluate_h3(artifacts: dict) -> dict:
    """H3: NEAR captures meaningful value from Intents."""
    return {
        "id": "H3",
        "verdict": "INSUFFICIENT_DATA",
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "prereg_tag": PREREG_TAG,
        "tests": [],
        "supporting": [],
        "contradicting": [],
        "kill_criteria_hit": [],
        "unavailable": [{"item": "onchain revenue rebuild", "reason": "BigQuery quota limited"}],
    }


def evaluate_h4(artifacts: dict) -> dict:
    """H4: Protocol growth benefits tokenholders."""
    return {
        "id": "H4",
        "verdict": "INSUFFICIENT_DATA",
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "prereg_tag": PREREG_TAG,
        "tests": [],
        "supporting": [],
        "contradicting": [],
        "kill_criteria_hit": [],
        "unavailable": [{"item": "buyback/burn data", "reason": "BigQuery quota limited"}],
    }


def evaluate_h5(artifacts: dict) -> dict:
    """H5: Adoption becoming less concentrated."""
    return {
        "id": "H5",
        "verdict": "INSUFFICIENT_DATA",
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "prereg_tag": PREREG_TAG,
        "tests": [],
        "supporting": [],
        "contradicting": [],
        "kill_criteria_hit": [],
        "unavailable": [{"item": "concentration metrics", "reason": "Requires Intents/BigQuery data"}],
    }


def main():
    # Load all artifacts
    artifact_ids = [
        "intents.volume_usd.daily",
        "intents.swaps.daily",
        "intents.unique_sender_addresses.daily",
        "intents.avg_swap_usd.daily",
        "intents.status_mix.daily",
        "intents.chain_distribution.daily",
        "intents.token_distribution.daily",
        "intents.concentration.daily",
        "revenue.net.near_intents.daily",
        "defillama.fees.near_intents.daily",
        "defillama.revenue.near_intents.daily",
        "defillama.holders_revenue.near_intents.daily",
        "reconciliation.revenue.three_way",
        "network.active_accounts.daily",
        "network.transactions.daily",
        "network.intents_attributable.daily",
        "supply.net_supply_change.daily",
        "market.cap.daily",
    ]

    artifacts = {}
    for aid in artifact_ids:
        artifacts[aid] = load_artifact(aid)

    # Evaluate all hypotheses
    results = {
        "H1": evaluate_h1(artifacts),
        "H2": evaluate_h2(artifacts),
        "H3": evaluate_h3(artifacts),
        "H4": evaluate_h4(artifacts),
        "H5": evaluate_h5(artifacts),
    }

    # Write thesis_results.json
    out = {
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "prereg_tag": PREREG_TAG,
        "hypotheses": results,
    }
    (THESIS / "thesis_results.json").write_text(json.dumps(out, indent=1))
    print(f"Wrote {THESIS / 'thesis_results.json'}")

    # Generate robustness report
    robustness = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "checks": [],
        "notes": "Robustness checks require full data; currently INSUFFICIENT_DATA",
    }
    (THESIS / "ROBUSTNESS.md").write_text(json.dumps(robustness, indent=1))

    # Generate NOT_COMPUTABLE
    not_comp = [
        {"hypothesis": h, "item": item["item"], "reason": item["reason"]}
        for h, res in results.items()
        for item in res.get("unavailable", [])
    ]
    (THESIS / "NOT_COMPUTABLE.md").write_text(
        "# Not Computable\n\n" +
        "\n".join([f"- **{n['hypothesis']}**: {n['item']} — {n['reason']}" for n in not_comp])
    )

    print("Thesis evaluation complete (INSUFFICIENT_DATA for all — needs credentials)")


if __name__ == "__main__":
    main()
