"""Plan 03 task 3.8: Three-way revenue reconciliation.

Compares: our onchain rebuild vs DefiLlama revenue vs revenue.near.org reference values.
"""
from __future__ import annotations
import argparse
import json
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from pipeline.types.artifact import MetricArtifact, ArtifactMeta, SeriesPoint, DataMode

PROCESSED = Path(__file__).resolve().parents[2] / "data" / "processed"
ARTIFACTS = Path(__file__).resolve().parents[2] / "web" / "public" / "data"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

REFERENCE_VALUES = {
    "cumulative": {
        "revenue_near_org": {
            "cumulative_net_revenue_near": 4340000,
            "wallet_breakdown": {
                "fefundsadmin.sputnik-dao.near": 0.464,
                "buybacks.multisignature.near": 0.408,
                "1csfundsadmin.sputnik-dao.near": 0.128,
            },
            "read_on": "2026-11-13",
            "url": "https://revenue.near.org",
            "note": "Figures shown are illustrative"
        }
    },
}

TOLERANCE_PCT = Decimal("10")


def load_artifact(metric_id: str, mode: DataMode) -> MetricArtifact | None:
    path = ARTIFACTS / f"{metric_id}.json"
    if not path.exists():
        return None
    return MetricArtifact.from_json(path.read_text())


def series_to_dict(series: list[SeriesPoint]) -> dict[str, Decimal]:
    return {s.t: s.v for s in series if s.v is not None}


def compute_reconciliation(our_series: dict, defillama_series: dict) -> dict:
    common_dates = set(our_series.keys()) & set(defillama_series.keys())
    if not common_dates:
        return {"status": "no_overlap", "dates": []}

    results = []
    for date in sorted(common_dates):
        our_val = our_series[date]
        defi_val = defillama_series[date]
        results.append({
            "date": date,
            "our_rebuild_near": str(our_val),
            "defillama_revenue_usd": str(defi_val),
            "status": "needs_price_conversion",
        })

    return {
        "window": f"{min(common_dates)} to {max(common_dates)}",
        "n_points": len(results),
        "tolerance_pct": str(TOLERANCE_PCT),
        "comparisons": results,
        "notes": [
            "Our rebuild is in NEAR; DefiLlama revenue is in USD",
            "Price conversion needed for direct comparison",
            "Reference values from revenue.near.org are illustrative",
        ]
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()

    mode = DataMode(args.mode)

    our_artifact = load_artifact("revenue.net.near_intents.daily", mode)
    if not our_artifact:
        print("ERROR: Our revenue artifact not found. Run pipeline.metrics.revenue_wallets first.")
        return 1

    our_series = series_to_dict(our_artifact.series)

    defi_artifact = load_artifact("defillama.revenue.near_intents.daily", mode)
    if not defi_artifact:
        print("ERROR: DefiLlama revenue artifact not found.")
        return 1

    defi_series = series_to_dict(defi_artifact.series)

    fees_artifact = load_artifact("defillama.fees.near_intents.daily", mode)
    fees_series = series_to_dict(fees_artifact.series) if fees_artifact else {}

    rec = compute_reconciliation(our_series, defi_series)

    our_cumulative = sum(our_series.values()) if our_series else Decimal("0")
    defi_cumulative_usd = sum(defi_series.values()) if defi_series else Decimal("0")
    fees_cumulative_usd = sum(fees_series.values()) if fees_series else Decimal("0")

    rec["cumulative"] = {
        "our_rebuild_near": str(our_cumulative),
        "defillama_revenue_usd": str(defi_cumulative_usd),
        "defillama_fees_usd": str(fees_cumulative_usd),
        "revenue_near_org_cumulative_near": 4340000,
        "notes": [
            "Our cumulative rebuild covers last 30 days only (quota-limited)",
            "DefiLlama cumulative covers full history",
            "Revenue.near.org: ~4.34M NEAR all-time (illustrative)",
        ]
    }

    meta = ArtifactMeta(
        metric_id="reconciliation.revenue.three_way",
        name="Three-way revenue reconciliation",
        data_mode=mode,
        retrieved_at=datetime.now(timezone.utc),
        source_max_ts=datetime.fromisoformat(max(our_series.keys()) + "T23:59:59+00:00") if our_series else None,
        git_commit="dev",
        sha256_inputs="",
        completeness="partial",
        warnings=["Quota-limited to 30 days; wNEAR from balance deltas; price conversion needed"],
    )

    recon_artifact = {
        "meta": meta.model_dump(mode="json"),
        "reconciliation": rec,
    }

    out_path = ARTIFACTS / "reconciliation.revenue.three_way.json"
    out_path.write_text(json.dumps(recon_artifact, indent=1, default=str))
    print(f"Wrote reconciliation to {out_path}")

    print(f"\n=== RECONCILIATION SUMMARY ===")
    print(f"Window: {rec.get('window', 'N/A')}")
    print(f"Our rebuild (30d, NEAR): {our_cumulative:,.0f}")
    print(f"DefiLlama revenue (30d, USD): ${defi_cumulative_usd:,.0f}")
    print(f"DefiLlama fees (30d, USD): ${fees_cumulative_usd:,.0f}")
    print(f"Revenue.near.org (all-time, NEAR): 4,340,000")
    if fees_cumulative_usd:
        print(f"Implied capture rate (30d): {float(defi_cumulative_usd)/float(fees_cumulative_usd)*100:.1f}%")

    return 0


if __name__ == "__main__":
    exit(main())
