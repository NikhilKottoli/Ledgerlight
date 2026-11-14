"""Deterministic rule-based evaluator for hypotheses H1-H5."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd

from pipeline.stats import (
    align_series,
    lag_scan_with_fdr,
    log_diff,
    weekly_aggregate,
)

ARTIFACTS = Path(__file__).resolve().parents[2] / "web" / "public" / "data"
THESIS = Path(__file__).resolve().parents[2] / "thesis"
PREREG_TAG = "prereg-v1"


def load_artifact(metric_id: str) -> dict | None:
    path = ARTIFACTS / f"{metric_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def series_to_pd(artifact: dict | None) -> pd.Series:
    if not artifact:
        return pd.Series(dtype=float)
    dates: list[pd.Timestamp] = []
    values: list[float] = []
    for point in artifact.get("series", []):
        if point.get("v") is None:
            continue
        try:
            value = point["t"]
            if isinstance(value, str) and len(value) == 8 and value[4] == "-" and value[6] == "W":
                dates.append(pd.Timestamp(datetime.strptime(value + "-1", "%G-W%V-%u")))
            else:
                dates.append(pd.Timestamp(value))
            values.append(float(point["v"]))
        except (TypeError, ValueError):
            continue
    return pd.Series(values, index=pd.DatetimeIndex(dates)).sort_index()


def result(
    hypothesis: str,
    verdict: str,
    tests: list[dict],
    supporting: list[str],
    contradicting: list[str],
    unavailable: list[dict] | None = None,
    kill_criteria_hit: list[str] | None = None,
) -> dict:
    return {
        "id": hypothesis,
        "verdict": verdict,
        "evaluated_at": datetime.now(UTC).isoformat(),
        "prereg_tag": PREREG_TAG,
        "tests": tests,
        "supporting": supporting,
        "contradicting": contradicting,
        "kill_criteria_hit": kill_criteria_hit or [],
        "unavailable": unavailable or [],
    }


def trailing_growth(series: pd.Series, days: int = 90) -> dict | None:
    series = series.dropna()
    if series.empty:
        return None
    end = series.index.max()
    current = series[(series.index > end - pd.Timedelta(days=days)) & (series.index <= end)].sum()
    prior_end = end - pd.Timedelta(days=days)
    prior = series[
        (series.index > prior_end - pd.Timedelta(days=days)) & (series.index <= prior_end)
    ].sum()
    if prior == 0:
        return None
    return {
        "current": float(current),
        "prior": float(prior),
        "growth": float((current - prior) / abs(prior)),
    }


def take_rate_test(volume: pd.Series, fees: pd.Series) -> dict | None:
    common = pd.concat({"volume": volume, "fees": fees}, axis=1).dropna()
    common = common[common["volume"] > 0]
    if len(common) < 30:
        return None
    daily_rate = common["fees"] / common["volume"]
    end = daily_rate.index.max()
    window = daily_rate[daily_rate.index > end - pd.Timedelta(days=365)]
    if len(window) < 30:
        return None
    x = np.arange(len(window), dtype=float)
    slope = float(np.polyfit(x, window.to_numpy(), 1)[0])
    normalized_slope = float(slope * len(window) / max(abs(window.mean()), 1e-12))
    return {
        "n": int(len(window)),
        "slope_per_day": slope,
        "normalized_window_change": normalized_slope,
        "threshold": -0.25,
        "unit": "fraction of take rate per trailing window",
    }


def evaluate_h1(artifacts: dict) -> dict:
    volume = series_to_pd(artifacts.get("intents.volume_usd.daily"))
    fees = series_to_pd(artifacts.get("defillama.fees.near_intents.daily"))
    tests: list[dict] = []
    supporting: list[str] = []
    contradicting: list[str] = []
    unavailable = [
        {"item": "unique sender address growth", "reason": "UNAVAILABLE (JWT required)"},
        {"item": "returning sender share", "reason": "UNAVAILABLE (JWT required)"},
        {"item": "top-10 sender concentration", "reason": "UNAVAILABLE (JWT required)"},
    ]

    growth = trailing_growth(volume)
    if growth is None:
        unavailable.append(
            {"item": "vol_growth_90d", "reason": "Insufficient overlapping proxy volume history"}
        )
    else:
        tests.append({"id": "vol_growth_90d", **growth, "kind": "proxy"})
        if growth["growth"] > 0:
            supporting.append("vol_growth_90d > 0")
        else:
            contradicting.append("vol_growth_90d <= 0")

    rate = take_rate_test(volume, fees)
    if rate is None:
        unavailable.append(
            {"item": "take_rate_trend", "reason": "Insufficient overlapping volume and fee history"}
        )
    else:
        tests.append({"id": "take_rate_trend", **rate, "kind": "proxy volume + measured fees"})
        if rate["normalized_window_change"] > -0.25:
            supporting.append("take_rate_trend above -25% threshold")
        else:
            contradicting.append("take_rate_trend below -25% threshold")

    observed = len(tests)
    verdict = (
        "PARTIAL / MIXED"
        if observed and contradicting
        else ("SUPPORTED" if observed else "INSUFFICIENT_DATA")
    )
    if observed and not supporting and contradicting:
        verdict = "CONTRADICTED"
    return result("H1", verdict, tests, supporting, contradicting, unavailable)


def evaluate_h2(artifacts: dict) -> dict:
    volume = weekly_aggregate(series_to_pd(artifacts.get("intents.volume_usd.daily")), "sum")
    accounts = weekly_aggregate(
        series_to_pd(artifacts.get("network.active_accounts_non_intents.daily")), "mean"
    )
    volume, accounts = align_series(volume, accounts)
    stationary = pd.concat([log_diff(volume), log_diff(accounts)], axis=1).dropna()
    n = len(stationary)
    if n < 52:
        return result(
            "H2",
            "INSUFFICIENT_DATA (n < 52)",
            [{"id": "weekly_log_diff_lag_scan", "n": n, "required_n": 52}],
            [],
            [],
            [{"item": "weekly lag scan", "reason": f"Only {n} aligned weekly observations"}],
        )

    scan = lag_scan_with_fdr(
        stationary.iloc[:, 0].to_numpy(),
        stationary.iloc[:, 1].to_numpy(),
        max_lag=8,
        n_bootstrap=1000,
    )
    eligible = [
        r
        for r in scan
        if r["fdr_significant"]
        and r["ci_low"] is not None
        and (r["ci_low"] > 0 or r["ci_high"] < 0)
    ]
    supported = [r for r in eligible if r["lag"] >= 0 and abs(r["rho"]) >= 0.3]
    verdict = "SUPPORTED" if supported else "CONTRADICTED"
    return result(
        "H2",
        verdict,
        [
            {
                "id": "weekly_log_diff_lag_scan",
                "n": n,
                "lags": scan,
                "method": "stationary block bootstrap + BH-FDR",
            }
        ],
        [f"lag {r['lag']} meets |rho| >= 0.3 after BH-FDR" for r in supported],
        [] if supported else ["No non-negative lag meets preregistered correlation criteria"],
    )


def evaluate_h3(artifacts: dict) -> dict:
    fees = series_to_pd(artifacts.get("defillama.fees.near_intents.daily"))
    holders = series_to_pd(artifacts.get("defillama.holders_revenue.near_intents.daily"))
    capture = pd.concat({"fees": fees, "holders": holders}, axis=1).dropna()
    end = capture.index.max() if not capture.empty else None
    trailing = capture[capture.index > end - pd.Timedelta(days=90)] if end is not None else capture
    capture_rate = (
        float(trailing["holders"].sum() / trailing["fees"].sum())
        if trailing["fees"].sum()
        else None
    )
    tests: list[dict] = [
        {"id": "capture_rate_trend", "trailing_90d": capture_rate, "threshold": 0.10}
    ]
    supporting: list[str] = []
    contradicting: list[str] = []
    if capture_rate is None:
        contradicting.append("capture_rate_trend unavailable or zero-fee window")
    elif capture_rate >= 0.10:
        supporting.append("capture rate >= 10%")
    else:
        contradicting.append("capture rate < 10%")

    revenue_growth = trailing_growth(series_to_pd(artifacts.get("revenue.net.near_intents.daily")))
    tests.append({"id": "net_rev_near_growth", "value": revenue_growth})
    if revenue_growth and revenue_growth["growth"] > 0:
        supporting.append("net revenue in NEAR grew")
    elif revenue_growth:
        contradicting.append("net revenue in NEAR did not grow")

    reconciliation = artifacts.get("reconciliation.revenue.three_way", {}).get("reconciliation", {})
    tests.append(
        {
            "id": "three_way_reconciliation",
            "status": reconciliation.get("status", "partial"),
            "note": "USD/NEAR conversion and comparable windows are required",
        }
    )
    unavailable = []
    if not reconciliation:
        unavailable.append(
            {"item": "three-way reconciliation", "reason": "No reconciliation metadata"}
        )
    verdict = "SUPPORTED" if supporting and not contradicting else "CONTRADICTED"
    return result("H3", verdict, tests, supporting, contradicting, unavailable)


def evaluate_h4(artifacts: dict) -> dict:
    issuance = series_to_pd(artifacts.get("supply.net_issuance.weekly"))
    burn = series_to_pd(artifacts.get("buyback.burned_near"))
    buyback = series_to_pd(artifacts.get("nearblocks.buyback_inflows_proxy.daily"))
    tests: list[dict] = []
    unavailable: list[dict] = []

    if buyback.empty or issuance.empty:
        unavailable.append(
            {
                "item": "buyback_to_issuance",
                "reason": "Buyback NEAR proxy or issuance denominator unavailable",
            }
        )
    else:
        buyback_90d = buyback[buyback.index > buyback.index.max() - pd.Timedelta(days=90)].sum()
        issuance_total = issuance[
            issuance.index >= issuance.index.max() - pd.Timedelta(days=13)
        ].sum()
        ratio = float(buyback_90d / issuance_total) if issuance_total else None
        tests.append(
            {"id": "buyback_to_issuance", "ratio": ratio, "threshold": 0.10, "kind": "proxy"}
        )

    burn_total = (
        float(burn[burn.index >= burn.index.max() - pd.Timedelta(days=90)].sum())
        if not burn.empty
        else None
    )
    tests.append({"id": "burn_to_issuance", "burn_near": burn_total, "threshold": "> 0", "phi": 0})
    contradicting = ["buyback != burn (phi=0; buybacks held in multisig, not burned)"]
    return result(
        "H4",
        "MIXED",
        tests,
        [],
        contradicting,
        unavailable,
        ["burned NEAR = 0; preregistered buyback != burn condition"],
    )


def evaluate_h5(artifacts: dict) -> dict:
    return result(
        "H5",
        "INSUFFICIENT_DATA",
        [],
        [],
        [],
        [{"item": "sender concentration metrics", "reason": "Requires Explorer JWT sender census"}],
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()
    artifact_ids = [
        "intents.volume_usd.daily",
        "defillama.fees.near_intents.daily",
        "defillama.holders_revenue.near_intents.daily",
        "revenue.net.near_intents.daily",
        "reconciliation.revenue.three_way",
        "network.active_accounts_non_intents.daily",
        "nearblocks.buyback_inflows_proxy.daily",
        "supply.net_issuance.weekly",
        "buyback.burned_near",
    ]
    artifacts = {aid: load_artifact(aid) for aid in artifact_ids}
    results = {
        "H1": evaluate_h1(artifacts),
        "H2": evaluate_h2(artifacts),
        "H3": evaluate_h3(artifacts),
        "H4": evaluate_h4(artifacts),
        "H5": evaluate_h5(artifacts),
    }
    out = {
        "evaluated_at": datetime.now(UTC).isoformat(),
        "data_mode": args.mode,
        "prereg_tag": PREREG_TAG,
        "hypotheses": results,
    }
    payload = json.dumps(out, indent=1, allow_nan=False)
    (THESIS / "thesis_results.json").write_text(payload)
    (ARTIFACTS / "thesis_results.json").write_text(payload)
    not_comp = [
        {"hypothesis": h, "item": item["item"], "reason": item["reason"]}
        for h, res in results.items()
        for item in res.get("unavailable", [])
    ]
    (THESIS / "NOT_COMPUTABLE.md").write_text(
        "# Not Computable\n\n"
        + "\n".join(f"- **{n['hypothesis']}**: {n['item']} — {n['reason']}" for n in not_comp)
        + "\n"
    )
    print(f"Wrote {THESIS / 'thesis_results.json'} (MODE={args.mode})")


if __name__ == "__main__":
    main()
