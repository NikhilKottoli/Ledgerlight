"""Plan 04: Normalize Intents Explorer transactions to artifact contract."""
from __future__ import annotations
import argparse
import gzip
import json
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from pipeline.types.artifact import MetricArtifact, ArtifactMeta, SeriesPoint, DataMode

RAW_DIR = Path(__file__).resolve().parents[2] / "data" / "raw" / "intents"
PROCESSED = Path(__file__).resolve().parents[2] / "data" / "processed"
ARTIFACTS = Path(__file__).resolve().parents[2] / "web" / "public" / "data"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

# Metrics we'll produce - numeric only
METRICS = {
    "intents.volume_usd.daily": ("volume_usd", "USD"),
    "intents.swaps.daily": ("swaps", "count"),
    "intents.unique_sender_addresses.daily": ("unique_sender_addresses", "address"),
    "intents.avg_swap_usd.daily": ("avg_swap_usd", "USD"),
    "intents.concentration.daily": ("top10_sender_share", "ratio"),
}

# Distribution metrics stored as JSON strings (separate artifacts)
DISTRIBUTION_METRICS = {
    "intents.status_mix.daily": ("status_mix", "ratio"),
    "intents.chain_distribution.daily": ("chain_distribution", "USD"),
    "intents.token_distribution.daily": ("token_distribution", "USD"),
}


def parse_asset_id(asset_id: str) -> tuple[str, str]:
    """Parse asset_id into (chain, symbol). Format varies; best effort."""
    if not asset_id:
        return ("unknown", "unknown")
    # Common formats: "near:NEAR", "ethereum:USDC", "wrap.near:USDC", etc.
    if ":" in asset_id:
        chain, symbol = asset_id.split(":", 1)
        return (chain.lower(), symbol.upper())
    return ("unknown", asset_id.upper())


def load_day_files(date_str: str) -> list[dict]:
    """Load all transaction files for a date."""
    date_dir = RAW_DIR / f"date={date_str}"
    if not date_dir.exists():
        return []
    txs = []
    for f in sorted(date_dir.glob("*.json.gz")):
        with gzip.open(f, "rt") as fh:
            data = json.load(fh)
            if isinstance(data, list):
                txs.extend(data)
    return txs


def deduplicate(txs: list[dict]) -> list[dict]:
    """Dedupe on (depositAddress, depositMemo), keeping latest retrieved_at."""
    seen = {}
    for tx in txs:
        key = (tx.get("depositAddress"), tx.get("depositMemo"))
        if key not in seen or tx.get("retrieved_at", "") > seen[key].get("retrieved_at", ""):
            seen[key] = tx
    return list(seen.values())


def normalize_txs(txs: list[dict]) -> list[dict[str, Any]]:
    """Normalize raw transactions to standard format."""
    normalized = []
    for tx in txs:
        amount_in = tx.get("amountInUsd")
        amount_out = tx.get("amountOutUsd")
        in_flight = (amount_in == 0 or amount_out == 0) and tx.get("status") in ("PROCESSING", "PENDING_DEPOSIT")

        origin_chain, origin_symbol = parse_asset_id(tx.get("originAsset", ""))
        dest_chain, dest_symbol = parse_asset_id(tx.get("destinationAsset", ""))

        # App fees
        app_fees = tx.get("appFees", [])
        total_app_fees_usd = sum(Decimal(str(f.get("fee", 0))) for f in app_fees) if app_fees else Decimal("0")

        created_at_str = tx.get("createdAt")
        created_at_ts = None
        if created_at_str:
            if isinstance(created_at_str, (int, float)):
                created_at_ts = created_at_str
            else:
                try:
                    created_at_ts = datetime.fromisoformat(created_at_str.replace("Z", "+00:00")).timestamp()
                except Exception:
                    created_at_ts = None

        n = {
            "tx_key": f"{tx.get('depositAddress')}:{tx.get('depositMemo')}",
            "created_at": created_at_str,
            "date": datetime.fromtimestamp(created_at_ts, tz=timezone.utc).strftime("%Y-%m-%d") if created_at_ts else None,
            "status": tx.get("status"),
            "origin_chain": origin_chain,
            "origin_symbol": origin_symbol,
            "dest_chain": dest_chain,
            "dest_symbol": dest_symbol,
            "amount_in_usd": Decimal(str(amount_in)) if amount_in else None,
            "amount_out_usd": Decimal(str(amount_out)) if amount_out else None,
            "sender_addresses": tx.get("senders", []),
            "recipient": tx.get("recipient"),
            "app_fees": app_fees,
            "total_app_fees_usd": total_app_fees_usd,
            "referral": tx.get("referral"),
            "deposit_type": tx.get("depositType"),
            "recipient_type": tx.get("recipientType"),
            "refund_type": tx.get("refundType"),
            "refund_reason": tx.get("refundReason"),
            "near_tx_hashes": tx.get("nearTxHashes", []),
            "is_in_flight": in_flight,
            "is_confidential": any(t in ("CONFIDENTIAL_INTENTS",) for t in [tx.get("depositType"), tx.get("recipientType")]),
            "is_test": tx.get("isTest", False),
        }
        normalized.append(n)
    return normalized


def build_daily_series(normalized: list[dict]) -> dict:
    """Build daily aggregated series from normalized transactions."""
    from collections import defaultdict

    daily = defaultdict(lambda: {
        "volume_usd": Decimal("0"),
        "swaps": 0,
        "senders": set(),
        "amounts": [],
        "status_counts": defaultdict(int),
        "chains": defaultdict(Decimal),
        "tokens": defaultdict(Decimal),
        "senders_volume": defaultdict(Decimal),
        "confidential": 0,
        "unmapped_assets": 0,
    })

    for tx in normalized:
        date = tx["date"]
        if not date:
            continue
        d = daily[date]

        if tx["status"] == "SUCCESS" and tx["amount_in_usd"] is not None:
            amt = tx["amount_in_usd"]
            d["volume_usd"] += amt
            d["swaps"] += 1
            d["amounts"].append(amt)

            for sender in tx["sender_addresses"]:
                d["senders"].add(sender)
                d["senders_volume"][sender] += amt

            d["chains"][f"{tx['origin_chain']}->{tx['dest_chain']}"] += amt
            d["tokens"][f"{tx['origin_symbol']}->{tx['dest_symbol']}"] += amt

        d["status_counts"][tx["status"]] += 1

        if tx["is_confidential"]:
            d["confidential"] += 1
        if tx["origin_chain"] == "unknown" or tx["dest_chain"] == "unknown":
            d["unmapped_assets"] += 1

    # Finalize
    series = {}
    for date, d in sorted(daily.items()):
        senders = d["senders"]
        top10_share = Decimal("0")
        if senders and d["volume_usd"] > 0:
            sorted_senders = sorted(d["senders_volume"].items(), key=lambda x: x[1], reverse=True)
            top10 = sum(v for _, v in sorted_senders[:10])
            top10_share = top10 / d["volume_usd"]

        avg_swap = (d["volume_usd"] / Decimal(str(d["swaps"]))) if d["swaps"] > 0 else Decimal("0")
        take_rate_bps = Decimal("0")
        if d["volume_usd"] > 0:
            # Approximate take rate from app fees
            total_fees = sum(Decimal(str(sum(Decimal(str(f.get("fee", 0))) for f in tx.get("appFees", [])))) for tx in normalized if tx["date"] == date)
            take_rate_bps = (total_fees / d["volume_usd"]) * Decimal("10000")

        series[date] = {
            "volume_usd": d["volume_usd"],
            "swaps": d["swaps"],
            "unique_sender_addresses": len(senders),
            "avg_swap_usd": avg_swap,
            "take_rate_bps": take_rate_bps,
            "status_mix": dict(d["status_counts"]),
            "chain_distribution": {k: str(v) for k, v in d["chains"].items()},
            "token_distribution": {k: str(v) for k, v in d["tokens"].items()},
            "top10_sender_share": top10_share,
            "confidential_share": Decimal(str(d["confidential"])) / Decimal(str(d["swaps"])) if d["swaps"] > 0 else Decimal("0"),
            "unmapped_asset_share": Decimal(str(d["unmapped_assets"])) / Decimal(str(d["swaps"])) if d["swaps"] > 0 else Decimal("0"),
        }

    return series


def write_artifacts(series: dict, mode: DataMode, git_commit: str, retrieved_at: datetime):
    """Write each metric as an artifact."""
    for metric_id, (field, unit) in METRICS.items():
        points = []
        for date in sorted(series.keys()):
            val = series[date].get(field)
            if val is not None:
                try:
                    d_val = Decimal(str(val))
                    if d_val.is_finite():
                        points.append(SeriesPoint(t=date, v=d_val, null_reason=None))
                    else:
                        points.append(SeriesPoint(t=date, v=Decimal("0"), null_reason="non_finite_value"))
                except Exception:
                    points.append(SeriesPoint(t=date, v=Decimal("0"), null_reason="conversion_error"))

        meta = ArtifactMeta(
            metric_id=metric_id,
            name=metric_id.replace(".", " ").title(),
            data_mode=mode,
            retrieved_at=retrieved_at,
            source_max_ts=datetime.fromisoformat(points[-1].t + "T23:59:59+00:00") if points else None,
            git_commit=git_commit,
            sha256_inputs="",
            completeness="complete" if points else "empty",
            warnings=["Quota-limited window; confidential flows not fully visible"],
        )
        artifact = MetricArtifact(meta=meta, series=points)
        artifact.meta.sha256_inputs = artifact.compute_hash()
        out_path = ARTIFACTS / f"{metric_id}.json"
        out_path.write_text(artifact.to_json())
        print(f"  Wrote {metric_id} ({len(points)} points)")

    # Write distribution metrics as raw JSON (not Decimal artifacts)
    write_distribution_artifacts(series, mode, git_commit, retrieved_at)

    # Also write transaction sample (latest 5000 + top 1000 by USD)
    all_txs = []
    for date in sorted(series.keys()):
        # We'd need to store normalized txs per date; for now skip
        pass


def write_distribution_artifacts(series: dict, mode: DataMode, git_commit: str, retrieved_at: datetime):
    """Write distribution metrics as raw JSON files for frontend parsing."""
    import json as json_module
    for metric_id, (field, unit) in DISTRIBUTION_METRICS.items():
        data = {}
        for date in sorted(series.keys()):
            val = series[date].get(field)
            if val is not None:
                data[date] = val
        
        # Write as raw JSON
        out_path = ARTIFACTS / f"{metric_id}.json"
        out_data = {
            "meta": {
                "metric_id": metric_id,
                "name": metric_id.replace(".", " ").title(),
                "data_mode": mode.value,
                "retrieved_at": retrieved_at.isoformat().replace("+00:00", "Z"),
                "source_max_ts": max(data.keys()) + "T23:59:59+00:00" if data else None,
                "git_commit": git_commit,
                "sha256_inputs": "",
                "completeness": "complete" if data else "empty",
                "warnings": ["Quota-limited window; confidential flows not fully visible"],
                "unit": unit,
                "kind": "measured",
            },
            "series": [{"t": date, "v": val} for date, val in data.items()]
        }
        out_path.write_text(json_module.dumps(out_data, indent=1))
        print(f"  Wrote {metric_id} ({len(data)} points) [distribution]")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()

    mode = DataMode(args.mode)
    retrieved_at = datetime.now(timezone.utc)

    import subprocess
    git_commit = "dev"
    try:
        git_commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()[:8]
    except Exception:
        pass

    if mode == DataMode.LIVE:
        # Find all date directories
        date_dirs = sorted([d for d in RAW_DIR.iterdir() if d.is_dir() and d.name.startswith("date=")])
        if not date_dirs:
            print("No raw data found. Run pipeline.connectors.intents_explorer first.")
            return 1

        all_normalized = []
        for d in date_dirs:
            date_str = d.name.replace("date=", "")
            txs = load_day_files(date_str)
            if not txs:
                continue
            txs = deduplicate(txs)
            normalized = normalize_txs(txs)
            all_normalized.extend(normalized)

        print(f"Normalized {len(all_normalized)} unique transactions")
    else:
        # Load from processed
        proc_file = PROCESSED / f"intents_normalized_{args.mode}.json"
        if not proc_file.exists():
            print(f"No snapshot file: {proc_file}")
            return 1
        all_normalized = json.loads(proc_file.read_text())

    # Save normalized for snapshot
    proc_dir = PROCESSED
    proc_dir.mkdir(parents=True, exist_ok=True)
    (proc_dir / f"intents_normalized_{args.mode}.json").write_text(json.dumps(all_normalized, indent=1, default=str))

    series = build_daily_series(all_normalized)
    write_artifacts(series, mode, git_commit, retrieved_at)

    print("Intents normalization complete")
    return 0


if __name__ == "__main__":
    main()
