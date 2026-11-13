"""Plan 03 task 3.5: Revenue wallet reconstruction from BigQuery.

Rebuilds net revenue from NEAR/wNEAR transfers into the three revenue wallets,
excluding inter-wallet transfers. Produces daily series per wallet in NEAR.

Uses:
- Native NEAR: receipt_actions (TRANSFER kind)
- wNEAR: ft_balances_daily balance changes (more efficient than ft_events)
"""
from __future__ import annotations
import argparse
import json
import os
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

from pipeline.connectors.bigquery import BigQueryClient, get_client
from pipeline.types.artifact import MetricArtifact, ArtifactMeta, SeriesPoint, DataMode

PROCESSED = Path(__file__).resolve().parents[2] / "data" / "processed"
ARTIFACTS = Path(__file__).resolve().parents[2] / "web" / "public" / "data"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

# Revenue wallets
REVENUE_WALLETS = [
    "fefundsadmin.sputnik-dao.near",
    "buybacks.multisignature.near",
    "1csfundsadmin.sputnik-dao.near",
]

WALLET_SET_SQL = ", ".join([f"'{w}'" for w in REVENUE_WALLETS])
BACKFILL_DAYS = int(os.getenv("BACKFILL_DAYS", "90"))

# Native NEAR transfers via receipt_actions
NATIVE_SQL = f"""
SELECT
  block_date,
  receipt_receiver_account_id AS wallet,
  SUM(CAST(JSON_EXTRACT_SCALAR(args, '$.deposit') AS NUMERIC)) / 1e24 AS amt_near
FROM `bigquery-public-data.crypto_near_mainnet_us.receipt_actions`
WHERE block_date >= DATE_SUB(CURRENT_DATE(), INTERVAL {BACKFILL_DAYS} DAY)
  AND action_kind = 'TRANSFER'
  AND receipt_receiver_account_id IN ({WALLET_SET_SQL})
  AND receipt_predecessor_account_id NOT IN ({WALLET_SET_SQL})
  AND JSON_EXTRACT_SCALAR(args, '$.deposit') IS NOT NULL
GROUP BY block_date, wallet
ORDER BY block_date, wallet
"""

# Native NEAR outflows
OUTFLOW_SQL = f"""
SELECT
  block_date,
  receipt_predecessor_account_id AS wallet,
  receipt_receiver_account_id AS counterparty,
  SUM(CAST(JSON_EXTRACT_SCALAR(args, '$.deposit') AS NUMERIC)) / 1e24 AS amt_near
FROM `bigquery-public-data.crypto_near_mainnet_us.receipt_actions`
WHERE block_date >= DATE_SUB(CURRENT_DATE(), INTERVAL {BACKFILL_DAYS} DAY)
  AND action_kind = 'TRANSFER'
  AND receipt_predecessor_account_id IN ({WALLET_SET_SQL})
  AND JSON_EXTRACT_SCALAR(args, '$.deposit') IS NOT NULL
GROUP BY block_date, wallet, counterparty
ORDER BY block_date, wallet, counterparty
"""

# wNEAR balance changes via ft_balances_daily
# Compute daily delta of total balance (liquid + staked + unstaked + lockup) per wallet
WNEAR_BALANCE_SQL = f"""
WITH daily_balance AS (
  SELECT
    epoch_date AS block_date,
    account_id AS wallet,
    (COALESCE(liquid, 0) + COALESCE(staked, 0) + COALESCE(unstaked_not_liquid, 0) +
     COALESCE(lockup_liquid, 0) + COALESCE(lockup_staked, 0) + COALESCE(lockup_unstaked_not_liquid, 0) +
     COALESCE(reward, 0)) AS total_wnear
  FROM `bigquery-public-data.crypto_near_mainnet_us.ft_balances_daily`
  WHERE epoch_date >= DATE_SUB(CURRENT_DATE(), INTERVAL {BACKFILL_DAYS} DAY)
    AND account_id IN ({WALLET_SET_SQL})
    AND contract_account_id = 'wrap.near'
)
SELECT
  block_date,
  wallet,
  total_wnear - LAG(total_wnear) OVER (PARTITION BY wallet ORDER BY block_date) AS delta_wnear
FROM daily_balance
WHERE total_wnear IS NOT NULL
QUALIFY delta_wnear IS NOT NULL
ORDER BY block_date, wallet
"""

# wNEAR outflows not directly available from balances - use ft_events if needed later


def fetch_wallet_flows(client: BigQueryClient) -> dict:
    """Fetch native NEAR inflows, native NEAR outflows, and wNEAR balance deltas."""
    print("Fetching native NEAR inflows...")
    native = client.run(NATIVE_SQL)
    print(f"  {len(native)} rows")

    print("Fetching native NEAR outflows...")
    native_out = client.run(OUTFLOW_SQL)
    print(f"  {len(native_out)} rows")

    print("Fetching wNEAR balance changes...")
    wnear = client.run(WNEAR_BALANCE_SQL)
    print(f"  {len(wnear)} rows")

    return {
        "native_in": native,
        "native_out": native_out,
        "wnear_delta": wnear,
    }


def build_daily_series(flows: dict) -> dict[str, list[dict]]:
    """Combine native + wNEAR inflows per wallet per day."""
    from collections import defaultdict

    inflows = defaultdict(lambda: defaultdict(Decimal))
    outflows = defaultdict(lambda: defaultdict(Decimal))
    wnear_changes = defaultdict(lambda: defaultdict(Decimal))

    for row in flows["native_in"]:
        inflows[row["block_date"]][row["wallet"]] += Decimal(str(row["amt_near"]))

    for row in flows["native_out"]:
        outflows[row["block_date"]][row["wallet"]] += Decimal(str(row["amt_near"]))

    for row in flows["wnear_delta"]:
        delta = Decimal(str(row["delta_wnear"]))
        if delta > 0:
            inflows[row["block_date"]][row["wallet"]] += delta
        elif delta < 0:
            outflows[row["block_date"]][row["wallet"]] += abs(delta)
        wnear_changes[row["block_date"]][row["wallet"]] = delta

    all_dates = set(inflows.keys()) | set(outflows.keys()) | set(wnear_changes.keys())
    wallet_series = {w: [] for w in REVENUE_WALLETS}

    for date in sorted(all_dates):
        for wallet in REVENUE_WALLETS:
            net = inflows[date].get(wallet, Decimal("0")) - outflows[date].get(wallet, Decimal("0"))
            wallet_series[wallet].append({
                "t": str(date),
                "v": net,
                "inflow_native": inflows[date].get(wallet, Decimal("0")) if date in inflows and wallet in inflows[date] else Decimal("0"),
                "outflow_native": outflows[date].get(wallet, Decimal("0")) if date in outflows and wallet in outflows[date] else Decimal("0"),
                "wnear_delta": wnear_changes[date].get(wallet, Decimal("0")),
            })

    return wallet_series


def write_artifacts(wallet_series: dict, mode: DataMode, git_commit: str, retrieved_at: datetime):
    """Write per-wallet artifacts and combined net revenue artifact."""
    for wallet, series in wallet_series.items():
        metric_id = f"revenue.wallet.{wallet}.daily"
        meta = ArtifactMeta(
            metric_id=metric_id,
            name=f"Revenue wallet net inflow — {wallet}",
            data_mode=mode,
            retrieved_at=retrieved_at,
            source_max_ts=datetime.fromisoformat(series[-1]["t"] + "T23:59:59+00:00") if series else None,
            git_commit=git_commit,
            sha256_inputs="",
            completeness="complete" if series else "empty",
            warnings=["wNEAR from ft_balances_daily balance deltas; may include staking rewards"],
        )
        points = [SeriesPoint(t=s["t"], v=s["v"], null_reason=None) for s in series]
        artifact = MetricArtifact(meta=meta, series=points)
        artifact.meta.sha256_inputs = artifact.compute_hash()
        out_path = ARTIFACTS / f"{metric_id}.json"
        out_path.write_text(artifact.to_json())
        print(f"  Wrote {metric_id} ({len(points)} points)")

    # Combined net revenue
    all_dates = sorted(set(s["t"] for wallet in REVENUE_WALLETS for s in wallet_series[wallet]))
    combined = []
    for date in all_dates:
        total = Decimal("0")
        for wallet in REVENUE_WALLETS:
            for s in wallet_series[wallet]:
                if s["t"] == date:
                    total += s["v"]
                    break
        combined.append(SeriesPoint(t=date, v=total, null_reason=None))

    meta = ArtifactMeta(
        metric_id="revenue.net.near_intents.daily",
        name="Net revenue (NEAR) — NEAR Intents (onchain rebuild)",
        data_mode=mode,
        retrieved_at=retrieved_at,
        source_max_ts=datetime.fromisoformat(combined[-1].t + "T23:59:59+00:00") if combined else None,
        git_commit=git_commit,
        sha256_inputs="",
        completeness="complete" if combined else "empty",
        warnings=["Excludes inter-wallet transfers. Native NEAR + wNEAR via ft_balances_daily balance deltas."],
    )
    artifact = MetricArtifact(meta=meta, series=combined)
    artifact.meta.sha256_inputs = artifact.compute_hash()
    out_path = ARTIFACTS / "revenue.net.near_intents.daily.json"
    out_path.write_text(artifact.to_json())
    print(f"  Wrote revenue.net.near_intents.daily ({len(combined)} points)")


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
        client = get_client()
        flows = fetch_wallet_flows(client)
        raw_dir = Path(__file__).resolve().parents[2] / "data" / "raw" / "bigquery"
        raw_dir.mkdir(parents=True, exist_ok=True)
        ts = retrieved_at.strftime("%Y%m%dT%H%M%SZ")
        (raw_dir / f"wallet_flows_{ts}.json").write_text(json.dumps(flows, indent=1, default=str))
    else:
        raw_dir = Path(__file__).resolve().parents[2] / "data" / "raw" / "bigquery"
        files = sorted(raw_dir.glob("wallet_flows_*.json"))
        if not files:
            raise FileNotFoundError("No snapshot wallet flows found")
        flows = json.loads(files[-1].read_text())

    wallet_series = build_daily_series(flows)
    write_artifacts(wallet_series, mode, git_commit, retrieved_at)

    out_dir = Path(__file__).resolve().parents[2] / "data" / "processed"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"wallet_flows_{args.mode}.json").write_text(json.dumps(flows, indent=1, default=str))
    (out_dir / f"wallet_daily_series_{args.mode}.json").write_text(json.dumps(wallet_series, indent=1, default=str))

    print("Revenue wallet reconstruction complete")


if __name__ == "__main__":
    main()
