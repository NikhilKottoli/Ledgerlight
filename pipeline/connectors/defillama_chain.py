"""DefiLlama NEAR Chain TVL connector."""
from __future__ import annotations
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import requests

API_URL = "https://api.llama.fi/v2/historicalChainTvl/NEAR"
OUT_DIR = Path(__file__).resolve().parents[2] / "data" / "raw" / "defillama"
OUT_DIR.mkdir(parents=True, exist_ok=True)

log = logging.getLogger(__name__)


def fetch_chain_tvl() -> list[dict]:
    r = requests.get(API_URL, timeout=30)
    r.raise_for_status()
    data = r.json()
    # Convert to daily points
    result = []
    for point in data:
        ts = point["date"]
        tvl = point["tvl"]
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        result.append({"t": dt.strftime("%Y-%m-%d"), "v": tvl})
    return result


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    log.info("Fetching NEAR chain TVL from DefiLlama...")
    series = fetch_chain_tvl()
    log.info(f"Got {len(series)} daily points")

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_path = OUT_DIR / f"defillama_chain_tvl_near_live_{ts}.json"
    out_path.write_text(json.dumps({
        "retrieved_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "series": series,
    }, indent=1))
    log.info(f"Saved to {out_path}")


if __name__ == "__main__":
    main()
