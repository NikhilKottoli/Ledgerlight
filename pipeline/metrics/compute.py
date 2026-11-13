"""Plan 02: Metrics compute stage (placeholder for now — vertical slice just passes through)."""
from __future__ import annotations
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()
    print(f"metrics.compute: MODE={args.mode} (passthrough for vertical slice)")
    # In later plans, this reads normalized data, computes derived metrics, writes to data/processed/metrics/
    # For now, just verify the input artifact exists
    in_path = Path("web/public/data/defillama.tvl.near_intents.daily.json")
    if in_path.exists():
        print(f"Input artifact found: {in_path}")
    else:
        print(f"WARNING: {in_path} not found")

if __name__ == "__main__":
    main()
