"""Plan 04: NEAR Intents Explorer API ingestion.

API: https://explorer.near-intents.org/api/v0
Auth: Bearer JWT from partners.near-intents.org
Rate limit: 1 request / 5 seconds per partner (we throttle to ≥6s)
Max 1000 tx/request, cursor pagination via lastDepositAddress + lastDepositMemo
"""
from __future__ import annotations
import argparse
import gzip
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import requests
from tenacity import retry, stop_after_attempt, wait_exponential_jitter

RAW_DIR = Path(__file__).resolve().parents[2] / "data" / "raw" / "intents"
RAW_DIR.mkdir(parents=True, exist_ok=True)

API_BASE = "https://explorer.near-intents.org/api/v0"
HEADERS_BASE = {"Client-Name": "near-value-intelligence/0.1"}

# Rate limit: 1 req / 5s per partner → we use 6s safety margin
MIN_REQUEST_INTERVAL = 6.0
_last_request_time = 0.0


def _throttle():
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < MIN_REQUEST_INTERVAL:
        time.sleep(MIN_REQUEST_INTERVAL - elapsed)
    _last_request_time = time.time()


@retry(
    wait=wait_exponential_jitter(initial=2, max=60),
    stop=stop_after_attempt(6),
    reraise=True,
)
def _fetch_page(url: str, params: dict, jwt: str) -> dict[str, Any]:
    _throttle()
    headers = {**HEADERS_BASE, "Authorization": f"Bearer {jwt}"}
    r = requests.get(url, headers=headers, params=params, timeout=30)
    if r.status_code == 429:
        # Parse retry-after if present
        retry_after = r.headers.get("Retry-After")
        if retry_after:
            time.sleep(int(retry_after) + 1)
        raise requests.exceptions.HTTPError("429", response=r)
    r.raise_for_status()
    return r.json()


def fetch_day_window(jwt: str, start_ts: int, end_ts: int, statuses: list[str] = None) -> list[dict]:
    """Fetch all transactions for a day window [start_ts, end_ts) — non-inclusive bounds."""
    if statuses is None:
        statuses = ["SUCCESS", "FAILED", "REFUNDED", "PROCESSING", "PENDING_DEPOSIT", "INCOMPLETE_DEPOSIT"]

    all_txs = []
    cursor = None
    page = 0

    while True:
        params = {
            "startTimestampUnix": start_ts,
            "endTimestampUnix": end_ts,
            "statuses": ",".join(statuses),
            "numberOfTransactions": 1000,
            "direction": "next",  # oldest first
            "showTestTxs": "false",
        }
        if cursor:
            params["lastDepositAddress"] = cursor["address"]
            params["lastDepositMemo"] = cursor["memo"]

        data = _fetch_page(f"{API_BASE}/transactions", params, jwt)
        txs = data.get("transactions", [])
        all_txs.extend(txs)

        # Check for next page
        if len(txs) < 1000:
            break
        # Cursor from last transaction
        last = txs[-1]
        cursor = {"address": last.get("depositAddress"), "memo": last.get("depositMemo")}
        if not cursor["address"] or not cursor["memo"]:
            break
        page += 1

    return all_txs


def save_raw_day(txs: list[dict], date_str: str, mode: str) -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = RAW_DIR / f"date={date_str}"
    path.mkdir(parents=True, exist_ok=True)
    file_path = path / f"page-{ts}.json.gz"
    with gzip.open(file_path, "wt") as f:
        json.dump(txs, f, separators=(",", ":"))
    return file_path


def save_manifest(date_str: str, request_params: dict, tx_count: int, complete: bool, mode: str):
    path = RAW_DIR / f"date={date_str}" / "_manifest.json"
    manifest = {
        "date": date_str,
        "request_params": request_params,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "rows": tx_count,
        "complete": complete,
        "mode": mode,
    }
    path.write_text(json.dumps(manifest, indent=1))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    parser.add_argument("--backfill-days", type=int, default=int(os.getenv("BACKFILL_DAYS", "90")))
    parser.add_argument("--jwt", help="JWT token (or use NEAR_INTENTS_JWT env)")
    args = parser.parse_args()

    jwt = args.jwt or os.getenv("NEAR_INTENTS_JWT")
    if not jwt and args.mode == "live":
        print("ERROR: NEAR_INTENTS_JWT not provided (env or --jwt)")
        return 1

    mode = args.mode
    backfill_days = args.backfill_days

    if mode == "live":
        print(f"Starting Intents ingestion (backfill={backfill_days} days)...")
        # Refetch last 2 days every run (late status changes) + any missing days
        end_date = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=backfill_days)

        for i in range((end_date - start_date).days + 1):
            date = start_date + timedelta(days=i)
            date_str = date.isoformat()

            # Check manifest
            manifest_path = RAW_DIR / f"date={date_str}" / "_manifest.json"
            if manifest_path.exists():
                manifest = json.loads(manifest_path.read_text())
                if manifest.get("complete") and date < end_date - timedelta(days=1):
                    print(f"  {date_str}: already complete, skipping")
                    continue

            # Day window: non-inclusive bounds, so [date-1s, date+1d)
            start_ts = int(datetime.combine(date - timedelta(days=1), datetime.min.time()).timestamp())
            end_ts = int(datetime.combine(date + timedelta(days=1), datetime.min.time()).timestamp())

            print(f"  Fetching {date_str}...")
            try:
                txs = fetch_day_window(jwt, start_ts, end_ts)
                save_raw_day(txs, date_str, "live")
                save_manifest(date_str, {"start": start_ts, "end": end_ts}, len(txs), True, "live")
                print(f"    {len(txs)} transactions")
            except Exception as e:
                print(f"    ERROR: {e}")
                save_manifest(date_str, {"start": start_ts, "end": end_ts}, 0, False, "live")

    else:
        print("Snapshot mode: data already in data/raw/intents/")

    print("Intents ingestion complete")
    return 0


if __name__ == "__main__":
    import os
    from datetime import timedelta
    exit(main())
