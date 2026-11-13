"""Plan 02 task 2.7: DefiLlama connector for TVL (vertical slice).

Endpoint: https://api.llama.fi/protocol/near-intents
Returns: {tvl: [{date, totalLiquidityUSD, ...}], ...}
"""
from __future__ import annotations
import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import requests
from tenacity import retry, stop_after_attempt, wait_exponential_jitter

RAW_DIR = Path(__file__).resolve().parents[2] / "data" / "raw" / "defillama"
RAW_DIR.mkdir(parents=True, exist_ok=True)

API_URL = "https://api.llama.fi/protocol/near-intents"
HEADERS = {"Client-Name": "near-value-intelligence/0.1"}

@retry(
    wait=wait_exponential_jitter(initial=1, max=30),
    stop=stop_after_attempt(5),
    reraise=True,
)
def fetch_defillama() -> dict[str, Any]:
    r = requests.get(API_URL, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()


def save_raw(data: dict, mode: str) -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = RAW_DIR / f"near-intents_{mode}_{ts}.json"
    path.write_text(json.dumps(data, indent=1))
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()

    if args.mode == "live":
        print("Fetching DefiLlama TVL for near-intents...")
        data = fetch_defillama()
        raw_path = save_raw(data, "live")
        print(f"Saved raw to {raw_path}")
    else:
        # Snapshot mode: find the most recent raw file
        files = sorted(RAW_DIR.glob("near-intents_snapshot_*.json"))
        if not files:
            files = sorted(RAW_DIR.glob("near-intents_live_*.json"))
        if not files:
            raise FileNotFoundError("No snapshot raw data found")
        data = json.loads(files[-1].read_text())
        print(f"Loaded snapshot from {files[-1]}")

    # Extract TVL series (daily)
    tvl_data = data.get("tvl", [])
    if not tvl_data:
        raise ValueError("No TVL data in response")

    # Normalize: keep date and totalLiquidityUSD
    series = []
    for point in tvl_data:
        date_str = point.get("date")
        tvl_usd = point.get("totalLiquidityUSD")
        if date_str and tvl_usd is not None:
            series.append({"t": date_str, "v": tvl_usd, "null_reason": None})

    # Sort by date
    series.sort(key=lambda x: x["t"])

    # Output normalized JSON for next stage
    out_dir = Path(__file__).resolve().parents[2] / "data" / "processed"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"defillama_tvl_{args.mode}.json"
    out_path.write_text(json.dumps({"series": series, "retrieved_at": datetime.now(timezone.utc).isoformat()}, indent=1))
    print(f"Wrote normalized to {out_path} ({len(series)} points)")

if __name__ == "__main__":
    main()
