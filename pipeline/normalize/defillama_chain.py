"""Normalize DefiLlama NEAR Chain TVL to artifact contract."""
from __future__ import annotations
import argparse
import json
import subprocess
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from pipeline.types.artifact import MetricArtifact, ArtifactMeta, SeriesPoint, DataMode

PROCESSED = Path(__file__).resolve().parents[2] / "data" / "processed"
ARTIFACTS = Path(__file__).resolve().parents[2] / "web" / "public" / "data"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

RAW_DIR = Path(__file__).resolve().parents[2] / "data" / "raw" / "defillama"

METRIC_ID = "defillama.chain_tvl_near.daily"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()

    mode = DataMode(args.mode)

    # Find latest raw file
    files = sorted(RAW_DIR.glob(f"defillama_chain_tvl_near_{args.mode}_*.json"))
    if not files:
        print(f"  No raw file found for mode={args.mode}")
        return

    data = json.loads(files[-1].read_text())
    series_raw = data["series"]

    git_commit = "dev"
    try:
        git_commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()[:8]
    except Exception:
        pass

    series = []
    for point in series_raw:
        t = point["t"]
        v = point["v"]
        series.append(SeriesPoint(t=t, v=Decimal(str(v)), null_reason=None))

    meta = ArtifactMeta(
        metric_id=METRIC_ID,
        data_mode=mode,
        retrieved_at=datetime.fromisoformat(data["retrieved_at"].replace("Z", "+00:00")),
        source_max_ts=datetime.fromisoformat(series[-1].t + "T23:59:59+00:00") if series else None,
        git_commit=git_commit,
        sha256_inputs="",
        completeness="complete" if series else "empty",
        warnings=[],
    )

    artifact = MetricArtifact(meta=meta, series=series)
    artifact.meta.sha256_inputs = artifact.compute_hash()

    out_path = ARTIFACTS / f"{METRIC_ID}.json"
    out_path.write_text(artifact.to_json())
    print(f"  Wrote {METRIC_ID} ({len(series)} points)")


if __name__ == "__main__":
    main()
