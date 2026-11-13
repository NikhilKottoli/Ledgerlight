"""Plan 03: Normalize DefiLlama fees/revenue to artifact contract."""
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

METRICS = {
    "defillama.fees.near_intents.daily": "dailyFees",
    "defillama.revenue.near_intents.daily": "dailyRevenue",
    "defillama.holders_revenue.near_intents.daily": "dailyHoldersRevenue",
}

def extract_series(data: dict) -> list[SeriesPoint]:
    """Extract time series from DefiLlama totalDataChart format: [[ts, val], ...]"""
    chart = data.get("totalDataChart") or []
    series = []
    for ts, val in chart:
        if ts is not None and val is not None:
            t = datetime.fromtimestamp(int(ts), tz=timezone.utc).strftime("%Y-%m-%d")
            series.append(SeriesPoint(t=t, v=Decimal(str(val)), null_reason=None))
    series.sort(key=lambda s: s.t)
    return series


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()

    mode = DataMode(args.mode)
    index_path = PROCESSED / f"defillama_index_{args.mode}.json"
    index = json.loads(index_path.read_text())

    import subprocess
    git_commit = "dev"
    try:
        git_commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()[:8]
    except Exception:
        pass

    for metric_id, fee_key in METRICS.items():
        raw_name = index["files"]["fees"].get(fee_key)
        if not raw_name:
            print(f"  Skipping {metric_id}: no raw data for {fee_key}")
            continue

        # Find the latest raw file
        raw_dir = Path(__file__).resolve().parents[2] / "data" / "raw" / "defillama"
        files = sorted(raw_dir.glob(f"{raw_name}_{args.mode}_*.json"))
        if not files:
            print(f"  Skipping {metric_id}: raw file not found")
            continue

        data = json.loads(files[-1].read_text())
        series = extract_series(data)

        meta = ArtifactMeta(
            metric_id=metric_id,
            data_mode=mode,
            retrieved_at=datetime.fromisoformat(index["retrieved_at"].replace("Z", "+00:00")),
            source_max_ts=datetime.fromisoformat(series[-1].t + "T23:59:59+00:00") if series else None,
            git_commit=git_commit,
            sha256_inputs="",
            completeness="complete" if series else "empty",
            warnings=[],
        )

        artifact = MetricArtifact(meta=meta, series=series)
        artifact.meta.sha256_inputs = artifact.compute_hash()

        out_path = ARTIFACTS / f"{metric_id}.json"
        out_path.write_text(artifact.to_json())
        print(f"  Wrote {metric_id} ({len(series)} points)")

if __name__ == "__main__":
    main()
