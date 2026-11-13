"""Plan 03 task 3.6: DefiLlama connector for fees, revenue, TVL, prices.

Endpoints:
- Protocol TVL: https://api.llama.fi/protocol/near-intents
- Fees summary: https://api.llama.fi/summary/fees/near-intents?dataType=dailyFees|dailyRevenue|dailyHoldersRevenue
- DEX volume: https://api.llama.fi/overview/dexs/near-intents (may 500)
- Prices: https://coins.llama.fi/prices/current/coingecko:near (current), https://coins.llama.fi/chart/coingecko:near?span=1y (history)
- Chain TVL: https://api.llama.fi/v2/historicalChainTvl/Near
"""
from __future__ import annotations
import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import requests
from tenacity import retry, stop_after_attempt, wait_exponential_jitter

RAW_DIR = Path(__file__).resolve().parents[2] / "data" / "raw" / "defillama"
RAW_DIR.mkdir(parents=True, exist_ok=True)

API_BASE = "https://api.llama.fi"
COINS_BASE = "https://coins.llama.fi"
HEADERS = {"User-Agent": "near-value-intelligence/0.1"}

@retry(
    wait=wait_exponential_jitter(initial=1, max=30),
    stop=stop_after_attempt(5),
    reraise=True,
)
def fetch(url: str, base: str = API_BASE) -> dict[str, Any]:
    r = requests.get(f"{base}{url}", headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()


def fetch_safe(url: str, name: str, mode: str, base: str = API_BASE) -> dict[str, Any] | None:
    """Fetch with error handling; return None on failure."""
    try:
        data = fetch(url, base)
        save_raw(data, name, mode)
        return data
    except Exception as e:
        print(f"  WARNING: {name} failed: {e}")
        return None


def save_raw(data: dict, name: str, mode: str) -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = RAW_DIR / f"{name}_{mode}_{ts}.json"
    path.write_text(json.dumps(data, indent=1))
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()

    mode = args.mode
    print(f"Fetching DefiLlama data (mode={mode})...")

    results = {}

    # 1. Protocol overview (TVL history)
    if mode == "live":
        results["protocol"] = fetch_safe("/protocol/near-intents", "protocol", "live")
    else:
        files = sorted(RAW_DIR.glob("protocol_live_*.json"))
        results["protocol"] = json.loads(files[-1].read_text()) if files else {}

    # 2. Fees breakdown
    fee_types = ["dailyFees", "dailyRevenue", "dailyHoldersRevenue"]
    results["fees"] = {}
    for ft in fee_types:
        if mode == "live":
            data = fetch_safe(f"/summary/fees/near-intents?dataType={ft}", f"fees_{ft}", "live")
            results["fees"][ft] = data
            time.sleep(0.5)
        else:
            files = sorted(RAW_DIR.glob(f"fees_{ft}_live_*.json"))
            results["fees"][ft] = json.loads(files[-1].read_text()) if files else {}

    # 3. DEX volume summary (may fail)
    if mode == "live":
        results["dex_volume"] = fetch_safe("/overview/dexs/near-intents", "dex_volume", "live")
    else:
        files = sorted(RAW_DIR.glob("dex_volume_live_*.json"))
        results["dex_volume"] = json.loads(files[-1].read_text()) if files else {}

    # 4. NEAR price history (from coins.llama.fi)
    if mode == "live":
        # Current price
        fetch_safe("/prices/current/coingecko:near", "near_price_current", "live", COINS_BASE)
        # Historical (1 year)
        fetch_safe("/chart/coingecko:near?span=1y", "near_price_history", "live", COINS_BASE)
    else:
        files = sorted(RAW_DIR.glob("near_price_history_live_*.json"))
        results["near_price_history"] = json.loads(files[-1].read_text()) if files else {}
        files = sorted(RAW_DIR.glob("near_price_current_live_*.json"))
        results["near_price_current"] = json.loads(files[-1].read_text()) if files else {}

    # 5. Chain TVL for NEAR (for market context)
    if mode == "live":
        results["chain_tvl"] = fetch_safe("/v2/historicalChainTvl/Near", "chain_tvl_near", "live")
    else:
        files = sorted(RAW_DIR.glob("chain_tvl_near_live_*.json"))
        results["chain_tvl"] = json.loads(files[-1].read_text()) if files else {}

    # Write normalized index
    out_dir = Path(__file__).resolve().parents[2] / "data" / "processed"
    out_dir.mkdir(parents=True, exist_ok=True)
    index = {
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "files": {
            "protocol": "protocol" if results.get("protocol") else None,
            "fees": {k: f"fees_{k}" for k, v in results.get("fees", {}).items() if v},
            "dex_volume": "dex_volume" if results.get("dex_volume") else None,
            "near_price_current": "near_price_current",
            "near_price_history": "near_price_history",
            "chain_tvl": "chain_tvl_near" if results.get("chain_tvl") else None,
        },
    }
    (out_dir / f"defillama_index_{mode}.json").write_text(json.dumps(index, indent=1))
    print(f"DefiLlama index written (mode={mode})")


if __name__ == "__main__":
    main()
