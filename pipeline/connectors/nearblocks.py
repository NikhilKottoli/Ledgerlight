"""
NearBlocks API connector for NEAR wallet transaction flows.

Fetches transactions for the three revenue wallets and the buyback wallet,
handles cursor pagination, and caches raw responses as Parquet.
"""
from __future__ import annotations

import os
import time
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
import pandas as pd
from tenacity import retry, stop_after_attempt, wait_exponential_jitter

API_BASE = "https://api.nearblocks.io/v1"
REVENUE_WALLETS = [
    "fefundsadmin.sputnik-dao.near",
    "buybacks.multisignature.near",
    "1csfundsadmin.sputnik-dao.near",
]
INTENTS_CONTRACT = "intents.near"
WRAP_NEAR_CONTRACT = "wrap.near"

log = logging.getLogger(__name__)


class NearBlocksClient:
    def __init__(self, api_key: str, rate_limit_rps: float = 0.5):
        self.session = requests.Session()
        self.session.headers.update({"Authorization": f"Bearer {api_key}"})
        self.min_interval = 1.0 / rate_limit_rps
        self._last_call = 0.0

    def _throttle(self):
        elapsed = time.time() - self._last_call
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self._last_call = time.time()

    @retry(
        wait=wait_exponential_jitter(initial=5, max=120),
        stop=stop_after_attempt(5),
    )
    def fetch_page(
        self,
        account: str,
        page: int = 1,
        per_page: int = 50,
        from_account: Optional[str] = None,
    ) -> dict:
        self._throttle()
        params = {"page": page, "per_page": per_page}
        if from_account:
            params["from"] = from_account
        url = f"{API_BASE}/account/{account}/txns"
        r = self.session.get(url, params=params, timeout=60)
        if r.status_code == 429:
            # Respect retry-after if present
            retry_after = r.headers.get("Retry-After")
            if retry_after:
                try:
                    wait_time = int(retry_after)
                    log.warning(f"Rate limited, waiting {wait_time}s (Retry-After header)")
                    time.sleep(wait_time)
                except ValueError:
                    pass
            raise requests.HTTPError("Rate limited", response=r)
        r.raise_for_status()
        return r.json()

    def fetch_all_pages(
        self,
        account: str,
        from_account: Optional[str] = None,
        max_pages: Optional[int] = None,
    ) -> list[dict]:
        """Fetch all pages for an account, handling cursor pagination."""
        all_txns = []
        page = 1
        cursor = None

        while True:
            if max_pages and page > max_pages:
                break
            data = self.fetch_page(account, page=page, from_account=from_account)
            txns = data.get("txns", [])
            if not txns:
                break
            all_txns.extend(txns)
            cursor = data.get("cursor")
            if not cursor:
                break
            page += 1

        return all_txns

    def fetch_pages_since(
        self,
        account: str,
        since_ts: int,
        from_account: Optional[str] = None,
        max_pages: Optional[int] = None,
    ) -> list[dict]:
        """Fetch pages until we reach transactions before since_ts (nanoseconds)."""
        all_txns = []
        page = 1

        while True:
            if max_pages and page > max_pages:
                break
            data = self.fetch_page(account, page=page, from_account=from_account)
            txns = data.get("txns", [])
            if not txns:
                break
            # Check if we've gone past our time window
            oldest_ts = txns[-1].get("block_timestamp", 0)
            if isinstance(oldest_ts, str):
                oldest_ts = int(oldest_ts)
            all_txns.extend(txns)
            if oldest_ts < since_ts:
                # Filter out older transactions
                all_txns = [t for t in all_txns if int(t.get("block_timestamp", 0)) >= since_ts]
                break
            cursor = data.get("cursor")
            if not cursor:
                break
            page += 1

        return all_txns


def save_parquet(df: pd.DataFrame, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(path, index=False)
    log.info(f"Saved {len(df)} rows to {path}")


def load_parquet(path: Path) -> pd.DataFrame:
    if path.exists():
        return pd.read_parquet(path)
    return pd.DataFrame()


def extract_transfers(txns: list[dict], wallet: str) -> list[dict]:
    """Extract NEAR transfers from transaction data."""
    transfers = []
    for tx in txns:
        block_ts = tx.get("block_timestamp")
        if not block_ts:
            continue
        block_ts = int(block_ts)
        dt = datetime.fromtimestamp(block_ts / 1e9, tz=timezone.utc)
        date_str = dt.strftime("%Y-%m-%d")

        for action in tx.get("actions", []):
            if action.get("action") != "TRANSFER":
                continue
            deposit = action.get("deposit")
            if deposit is None:
                continue
            # deposit is in yoctoNEAR
            near_amount = float(deposit) / 1e24

            transfers.append({
                "wallet": wallet,
                "tx_hash": tx.get("transaction_hash"),
                "receipt_id": tx.get("receipt_id"),
                "date": date_str,
                "timestamp": dt.isoformat(),
                "predecessor": tx.get("predecessor_account_id"),
                "receiver": tx.get("receiver_account_id"),
                "amount_near": near_amount,
                "status": tx.get("receipt_outcome", {}).get("status", False),
            })
    return transfers


def extract_function_call_transfers(txns: list[dict], wallet: str) -> list[dict]:
    """Extract transfers from FUNCTION_CALL args (for multisig buyback wallet)."""
    transfers = []
    for tx in txns:
        block_ts = tx.get("block_timestamp")
        if not block_ts:
            continue
        block_ts = int(block_ts)
        dt = datetime.fromtimestamp(block_ts / 1e9, tz=timezone.utc)
        date_str = dt.strftime("%Y-%m-%d")

        for action in tx.get("actions", []):
            if action.get("action") != "FUNCTION_CALL":
                continue
            args = action.get("args")
            if not args:
                continue
            try:
                parsed = json.loads(args) if isinstance(args, str) else args
            except Exception:
                continue

            # Handle add_request with Transfer actions
            if isinstance(parsed, dict) and parsed.get("request", {}).get("actions"):
                for a in parsed["request"]["actions"]:
                    if a.get("type") == "Transfer":
                        amount = a.get("amount")
                        receiver = parsed["request"].get("receiver_id")
                        if amount and receiver:
                            transfers.append({
                                "wallet": wallet,
                                "tx_hash": tx.get("transaction_hash"),
                                "receipt_id": tx.get("receipt_id"),
                                "date": date_str,
                                "timestamp": dt.isoformat(),
                                "predecessor": wallet,
                                "receiver": receiver,
                                "amount_near": float(amount) / 1e24,
                                "status": tx.get("receipt_outcome", {}).get("status", False),
                                "source": "function_call",
                            })
    return transfers


def extract_wnear_transfers(txns: list[dict], wallet: str) -> list[dict]:
    """Extract wNEAR mt_transfer actions."""
    transfers = []
    for tx in txns:
        block_ts = tx.get("block_timestamp")
        if not block_ts:
            continue
        block_ts = int(block_ts)
        dt = datetime.fromtimestamp(block_ts / 1e9, tz=timezone.utc)
        date_str = dt.strftime("%Y-%m-%d")

        for action in tx.get("actions", []):
            if action.get("action") != "FUNCTION_CALL":
                continue
            args = action.get("args")
            if not args:
                continue
            try:
                parsed = json.loads(args) if isinstance(args, str) else args
            except Exception:
                continue

            if action.get("method") == "mt_transfer" and isinstance(parsed, dict):
                token_id = parsed.get("token_id", "")
                if WRAP_NEAR_CONTRACT in token_id or "wrap.near" in token_id:
                    amount = parsed.get("amount")
                    receiver = parsed.get("receiver_id")
                    if amount and receiver:
                        transfers.append({
                            "wallet": wallet,
                            "tx_hash": tx.get("transaction_hash"),
                            "receipt_id": tx.get("receipt_id"),
                            "date": date_str,
                            "timestamp": dt.isoformat(),
                            "predecessor": tx.get("predecessor_account_id"),
                            "receiver": receiver,
                            "amount_wnear": float(amount) / 1e24,
                            "status": tx.get("receipt_outcome", {}).get("status", False),
                            "source": "mt_transfer",
                        })
    return transfers


def main():
    import argparse

    parser = argparse.ArgumentParser(description="NearBlocks wallet flow ingestion")
    parser.add_argument("--mode", choices=["live", "test"], default="test")
    parser.add_argument("--backfill-days", type=int, default=7)
    parser.add_argument("--max-pages", type=int, default=None, help="Max pages per wallet (for testing)")
    parser.add_argument("--cache-dir", default="data/cache/nearblocks")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    api_key = os.getenv("NEARBLOCKS_API_KEY")
    if not api_key:
        raise RuntimeError("NEARBLOCKS_API_KEY not set in environment")

    client = NearBlocksClient(api_key, rate_limit_rps=0.5)
    cache_dir = Path(args.cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)

    # Calculate since timestamp (nanoseconds)
    from datetime import timedelta
    since_dt = datetime.now(timezone.utc) - timedelta(days=args.backfill_days)
    since_ts = int(since_dt.timestamp() * 1e9)

    all_near_transfers = []
    all_wnear_transfers = []
    all_buyback_outflows = []

    # 1. Incoming NEAR transfers to revenue wallets from intents.near
    for wallet in REVENUE_WALLETS:
        log.info(f"Fetching incoming transfers for {wallet} since {since_dt.date()}...")
        txns = client.fetch_pages_since(wallet, since_ts, from_account=INTENTS_CONTRACT, max_pages=args.max_pages)
        log.info(f"  Got {len(txns)} transactions")
        transfers = extract_transfers(txns, wallet)
        all_near_transfers.extend(transfers)

        # Also fetch wNEAR transfers for 1csfundsadmin
        if wallet == "1csfundsadmin.sputnik-dao.near":
            wnear = extract_wnear_transfers(txns, wallet)
            all_wnear_transfers.extend(wnear)

    # 2. Outgoing transfers from buyback wallet (parse function calls)
    log.info("Fetching buyback wallet outflows...")
    buyback_txns = client.fetch_pages_since("buybacks.multisignature.near", since_ts, from_account="buybacks.multisignature.near", max_pages=args.max_pages)
    log.info(f"  Got {len(buyback_txns)} transactions")
    outflows = extract_function_call_transfers(buyback_txns, "buybacks.multisignature.near")
    all_buyback_outflows.extend(outflows)

    # Save raw transfers
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    if all_near_transfers:
        df = pd.DataFrame(all_near_transfers)
        save_parquet(df, cache_dir / f"near_transfers_{ts}.parquet")
    if all_wnear_transfers:
        df = pd.DataFrame(all_wnear_transfers)
        save_parquet(df, cache_dir / f"wnear_transfers_{ts}.parquet")
    if all_buyback_outflows:
        df = pd.DataFrame(all_buyback_outflows)
        save_parquet(df, cache_dir / f"buyback_outflows_{ts}.parquet")

    log.info("NearBlocks ingestion complete")


if __name__ == "__main__":
    main()
