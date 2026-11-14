"""Normalize NearBlocks wallet flows to artifact contract."""
from __future__ import annotations
import argparse
import json
import subprocess
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from collections import defaultdict

import pandas as pd
from pipeline.types.artifact import MetricArtifact, ArtifactMeta, SeriesPoint, DataMode

PROCESSED = Path(__file__).resolve().parents[2] / "data" / "processed"
ARTIFACTS = Path(__file__).resolve().parents[2] / "web" / "public" / "data"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "cache" / "nearblocks"

# Metric definitions
METRICS = {
    "nearblocks.revenue_near.daily": {
        "name": "NEAR Revenue Wallet Inflows (NEAR) — Daily",
        "unit": "NEAR",
        "entity": "near",
        "kind": "measured",
        "source": "NearBlocks API",
        "definition": "Daily NEAR transfers into the three revenue wallets from intents.near, excluding inter-wallet transfers",
    },
    "nearblocks.buyback_outflows.daily": {
        "name": "Buyback Wallet Outflows (NEAR) — Daily",
        "unit": "NEAR",
        "entity": "near",
        "kind": "measured",
        "source": "NearBlocks API",
        "definition": "Daily NEAR outflows from buybacks.multisignature.near parsed from FUNCTION_CALL add_request actions",
    },
    "nearblocks.wnear_transfers.daily": {
        "name": "wNEAR Transfers from 1csfundsadmin (wNEAR) — Daily",
        "unit": "wNEAR",
        "entity": "wnear",
        "kind": "measured",
        "source": "NearBlocks API",
        "definition": "Daily wNEAR mt_transfer actions from 1csfundsadmin.sputnik-dao.near",
    },
}


def load_latest_cache() -> pd.DataFrame:
    """Load the most recent near_transfers parquet file."""
    files = sorted(CACHE_DIR.glob("near_transfers_*.parquet"))
    if not files:
        return pd.DataFrame()
    return pd.read_parquet(files[-1])


def load_latest_wnear() -> pd.DataFrame:
    """Load the most recent wnear_transfers parquet file."""
    files = sorted(CACHE_DIR.glob("wnear_transfers_*.parquet"))
    if not files:
        return pd.DataFrame()
    return pd.read_parquet(files[-1])


def load_latest_buyback() -> pd.DataFrame:
    """Load the most recent buyback_outflows parquet file."""
    files = sorted(CACHE_DIR.glob("buyback_outflows_*.parquet"))
    if not files:
        return pd.DataFrame()
    return pd.read_parquet(files[-1])


def aggregate_daily(df: pd.DataFrame, amount_col: str) -> dict[str, Decimal]:
    """Aggregate transfers by date, return dict of date -> Decimal amount."""
    if df.empty:
        return {}
    daily = df.groupby("date")[amount_col].sum()
    return {date: Decimal(str(val)) for date, val in daily.items()}


def create_artifact(
    metric_id: str,
    series_dict: dict[str, Decimal],
    mode: DataMode,
    git_commit: str,
    retrieved_at: datetime,
) -> MetricArtifact:
    """Create a MetricArtifact from daily series."""
    series = []
    for date in sorted(series_dict.keys()):
        val = series_dict[date]
        if val.is_finite():
            series.append(SeriesPoint(t=date, v=val, null_reason=None))

    meta = ArtifactMeta(
        metric_id=metric_id,
        data_mode=mode,
        retrieved_at=retrieved_at,
        source_max_ts=datetime.fromisoformat(series[-1].t + "T23:59:59+00:00") if series else None,
        git_commit=git_commit,
        sha256_inputs="",
        completeness="complete" if series else "empty",
        warnings=[],
    )

    artifact = MetricArtifact(meta=meta, series=series)
    artifact.meta.sha256_inputs = artifact.compute_hash()
    return artifact


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()

    mode = DataMode(args.mode)

    # Load cached data
    near_df = load_latest_cache()
    wnear_df = load_latest_wnear()
    buyback_df = load_latest_buyback()

    if near_df.empty and wnear_df.empty and buyback_df.empty:
        print("No NearBlocks cache data found. Run pipeline.connectors.nearblocks first.")
        return

    git_commit = "dev"
    try:
        git_commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()[:8]
    except Exception:
        pass

    retrieved_at = datetime.now(timezone.utc)

    # Aggregate NEAR revenue inflows (exclude inter-wallet transfers)
    revenue_wallets = {"fefundsadmin.sputnik-dao.near", "buybacks.multisignature.near", "1csfundsadmin.sputnik-dao.near"}
    near_revenue = near_df[
        (near_df["predecessor"] == "intents.near") &
        (~near_df["predecessor"].isin(revenue_wallets))
    ]
    daily_near = aggregate_daily(near_revenue, "amount_near")

    # Aggregate buyback outflows
    daily_buyback = aggregate_daily(buyback_df, "amount_near")

    # Aggregate wNEAR transfers
    daily_wnear = aggregate_daily(wnear_df, "amount_wnear")

    # Create artifacts
    artifacts = [
        ("nearblocks.revenue_near.daily", daily_near),
        ("nearblocks.buyback_outflows.daily", daily_buyback),
        ("nearblocks.wnear_transfers.daily", daily_wnear),
    ]

    for metric_id, series_dict in artifacts:
        artifact = create_artifact(metric_id, series_dict, mode, git_commit, retrieved_at)
        out_path = ARTIFACTS / f"{metric_id}.json"
        out_path.write_text(artifact.to_json())
        print(f"  Wrote {metric_id} ({len(artifact.series)} points)")

    # Also write a combined daily summary for the flows ledger
    # Net revenue = NEAR revenue - buyback outflows (simplified)
    all_dates = set(daily_near.keys()) | set(daily_buyback.keys())
    daily_net = {}
    for date in sorted(all_dates):
        net = daily_near.get(date, Decimal("0")) - daily_buyback.get(date, Decimal("0"))
        daily_net[date] = net

    artifact = create_artifact("nearblocks.net_revenue_near.daily", daily_net, mode, git_commit, retrieved_at)
    out_path = ARTIFACTS / "nearblocks.net_revenue_near.daily.json"
    out_path.write_text(artifact.to_json())
    print(f"  Wrote nearblocks.net_revenue_near.daily ({len(artifact.series)} points)")

if __name__ == "__main__":
    main()
