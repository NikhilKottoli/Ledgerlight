"""Normalize Pikespeak hot wallets to artifact contract."""
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

RAW_DIR = Path(__file__).resolve().parents[2] / "data" / "raw" / "pikespeak"

METRICS = {
    "pikespeak.hot_wallets_total_balance.daily": {
        "name": "Top 100 Hot Wallets Total Balance (NEAR) — Daily",
        "unit": "NEAR",
        "entity": "near",
        "kind": "measured",
        "source": "Pikespeak",
        "definition": "Sum of NEAR balances across top 100 wallets by total USD value",
    },
    "pikespeak.hot_wallets_count.daily": {
        "name": "Hot Wallets Count — Daily",
        "unit": "count",
        "entity": "count",
        "kind": "measured",
        "source": "Pikespeak",
        "definition": "Number of wallets in top 100 hot wallets list",
    },
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()

    mode = DataMode(args.mode)

    # Find latest raw file
    files = sorted(RAW_DIR.glob(f"hot_wallets_{args.mode}_*.json"))
    if not files:
        print(f"  No raw file found for mode={args.mode}")
        return

    data = json.loads(files[-1].read_text())
    hot_data = data["data"]

    top_accounts = hot_data.get("topAccounts", [])
    total_balance = sum(Decimal(str(a.get("amount", "0"))) for a in top_accounts)
    wallet_count = len(top_accounts)

    git_commit = "dev"
    try:
        git_commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()[:8]
    except Exception:
        pass

    retrieved_at = datetime.fromisoformat(data["retrieved_at"].replace("Z", "+00:00"))
    date_str = retrieved_at.strftime("%Y-%m-%d")

    for metric_id, meta in METRICS.items():
        if "total_balance" in metric_id:
            val = total_balance
        else:
            val = Decimal(str(wallet_count))

        series = [SeriesPoint(t=date_str, v=val, null_reason=None)]

        artifact_meta = ArtifactMeta(
            metric_id=metric_id,
            data_mode=mode,
            retrieved_at=retrieved_at,
            source_max_ts=datetime.fromisoformat(date_str + "T23:59:59+00:00"),
            git_commit=git_commit,
            sha256_inputs="",
            completeness="complete" if series else "empty",
            warnings=[],
        )

        artifact = MetricArtifact(meta=artifact_meta, series=series)
        artifact.meta.sha256_inputs = artifact.compute_hash()

        out_path = ARTIFACTS / f"{metric_id}.json"
        out_path.write_text(artifact.to_json())
        print(f"  Wrote {metric_id} ({len(series)} points)")


if __name__ == "__main__":
    main()
