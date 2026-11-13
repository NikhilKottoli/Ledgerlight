"""Plan 03 task 3.2: BigQuery client with cost guard.

Every query: dry-run first, log estimated bytes, refuse if above BQ_MAX_BYTES_BILLED.
Append {query_file, params, bytes_processed, rows, ran_at} to data/query_log.jsonl.
Reject any SQL with no block_date filter (simple parser check).
"""
from __future__ import annotations
import argparse
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, List

from google.cloud import bigquery
from google.oauth2 import service_account

QUERY_LOG = Path(__file__).resolve().parents[2] / "data" / "query_log.jsonl"
QUERY_LOG.parent.mkdir(parents=True, exist_ok=True)

# Default 100 GB cap, configurable via env
MAX_BYTES_BILLED = int(os.getenv("BQ_MAX_BYTES_BILLED", "100000000000"))

# Regex to detect block_date filter (partition column)
BLOCK_DATE_PATTERN = re.compile(r"\bblock_date\s*(=|>=|<=|>|<|BETWEEN)", re.IGNORECASE)


class BigQueryClient:
    def __init__(self, project_id: Optional[str] = None, credentials_path: Optional[str] = None):
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID")
        if credentials_path or os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            creds_path = credentials_path or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            credentials = service_account.Credentials.from_service_account_file(creds_path)
            self.client = bigquery.Client(project=self.project_id, credentials=credentials)
        else:
            self.client = bigquery.Client(project=self.project_id)

    def dry_run(self, sql: str, params: List = None) -> int:
        """Return estimated bytes processed."""
        job_config = bigquery.QueryJobConfig(
            dry_run=True,
            use_query_cache=False,
            query_parameters=params or [],
        )
        job = self.client.query(sql, job_config=job_config)
        return job.total_bytes_processed

    def run(self, sql: str, params: List = None, max_bytes: Optional[int] = None) -> List[dict]:
        """Execute query with cost guard. Returns list of dict rows."""
        max_bytes = max_bytes or MAX_BYTES_BILLED

        # Check for block_date filter
        if not BLOCK_DATE_PATTERN.search(sql):
            raise ValueError(f"Query rejected: no block_date filter found. SQL:\n{sql[:500]}...")

        # Dry run
        estimated_bytes = self.dry_run(sql, params)
        if estimated_bytes > max_bytes:
            raise ValueError(f"Query exceeds byte limit: {estimated_bytes:,} > {max_bytes:,} bytes")

        # Real run with byte cap
        job_config = bigquery.QueryJobConfig(
            maximum_bytes_billed=max_bytes,
            query_parameters=params or [],
        )
        start = time.time()
        job = self.client.query(sql, job_config=job_config)
        rows = [dict(row) for row in job.result()]
        elapsed = time.time() - start

        # Log
        self._log_query(sql, params, estimated_bytes, len(rows), elapsed)

        return rows

    def _log_query(self, sql: str, params: List, bytes_processed: int, row_count: int, elapsed: float):
        entry = {
            "ran_at": datetime.now(timezone.utc).isoformat(),
            "bytes_processed": bytes_processed,
            "rows": row_count,
            "elapsed_seconds": elapsed,
            "sql_preview": sql[:200],
            "params": params,
        }
        with QUERY_LOG.open("a") as f:
            f.write(json.dumps(entry) + "\n")


def get_client() -> BigQueryClient:
    """Factory for pipeline scripts."""
    return BigQueryClient()


# --- CLI for testing ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BigQuery test query")
    parser.add_argument("--sql", help="SQL to run")
    parser.add_argument("--sql-file", help="Path to .sql file")
    args = parser.parse_args()

    if args.sql_file:
        sql = Path(args.sql_file).read_text()
    elif args.sql:
        sql = args.sql
    else:
        # Default: freshness check
        sql = """
        SELECT MAX(block_date) as max_block_date
        FROM `bigquery-public-data.crypto_near_mainnet_us.transactions`
        """

    client = get_client()
    try:
        rows = client.run(sql)
        print(json.dumps(rows, indent=2, default=str))
    except Exception as e:
        print(f"ERROR: {e}")
        exit(1)
