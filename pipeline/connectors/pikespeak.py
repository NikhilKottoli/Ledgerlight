"""Pikespeak API connector for NEAR hot wallets data."""
from __future__ import annotations
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

API_BASE = "https://api.pikespeak.ai"
OUT_DIR = Path(__file__).resolve().parents[2] / "data" / "raw" / "pikespeak"
OUT_DIR.mkdir(parents=True, exist_ok=True)

log = logging.getLogger(__name__)


class PikespeakClient:
    def __init__(self, api_key: str):
        self.session = requests.Session()
        self.session.headers.update({"x-api-key": api_key})

    def fetch_hot_wallets(self, limit: int = 100) -> dict:
        """Fetch top NEAR wallets by balance."""
        url = f"{API_BASE}/hot-wallets/near"
        r = self.session.get(url, params={"limit": limit}, timeout=30)
        r.raise_for_status()
        return r.json()

    def fetch_account_balance(self, account_id: str) -> dict:
        """Fetch token balances for a single account."""
        url = f"{API_BASE}/account/balance/{account_id}"
        r = self.session.get(url, timeout=30)
        r.raise_for_status()
        return r.json()


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Pikespeak hot wallets ingestion")
    parser.add_argument("--mode", choices=["live", "test"], default="test")
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    api_key = os.getenv("PIKESPEAK_API_KEY")
    if not api_key:
        raise RuntimeError("PIKESPEAK_API_KEY not set in environment")

    client = PikespeakClient(api_key)

    log.info(f"Fetching top {args.limit} hot wallets...")
    data = client.fetch_hot_wallets(limit=args.limit)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_path = OUT_DIR / f"hot_wallets_{args.mode}_{ts}.json"
    out_path.write_text(json.dumps({
        "retrieved_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "data": data,
    }, indent=1))
    log.info(f"Saved {len(data.get('topAccounts', []))} wallets to {out_path}")


if __name__ == "__main__":
    import os
    main()
