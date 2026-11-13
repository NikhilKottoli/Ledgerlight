"""Plan 02 task 2.7: Normalize DefiLlama TVL to artifact contract."""
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

METRIC_ID = "defillama.tvl.near_intents.daily"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()

    mode = DataMode(args.mode)
    in_path = PROCESSED / f"defillama_tvl_{args.mode}.json"
    data = json.loads(in_path.read_text())
    series_raw = data["series"]

    import subprocess
    git_commit = "dev"
    try:
        git_commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()[:8]
    except Exception:
        pass

    series = []
    for point in series_raw:
        t = point["t"]
        # DefiLlama returns Unix timestamp (int) for date, convert to ISO date string
        if isinstance(t, (int, float)):
            t = datetime.fromtimestamp(int(t), tz=timezone.utc).strftime("%Y-%m-%d")
        v = point["v"]
        series.append(SeriesPoint(t=t, v=Decimal(str(v)), null_reason=point.get("null_reason")))

    meta = ArtifactMeta(
        metric_id=METRIC_ID,
        data_mode=mode,
        retrieved_at=datetime.fromisoformat(data["retrieved_at"].replace("Z", "+00:00")),
        source_max_ts=datetime.fromisoformat(series[-1].t + "T23:59:59+00:00") if series else None,
        git_commit=git_commit,
        sha256_inputs="",  # filled below
        completeness="complete" if series else "empty",
        warnings=[],
    )

    artifact = MetricArtifact(meta=meta, series=series)
    # Compute sha256_inputs (canonical without retrieved_at)
    artifact.meta.sha256_inputs = artifact.compute_hash()  # hack: compute then assign

    out_path = ARTIFACTS / f"{METRIC_ID}.json"
    out_path.write_text(artifact.to_json())
    print(f"Wrote artifact to {out_path} ({len(series)} points, mode={mode.value})")

if __name__ == "__main__":
    main()
