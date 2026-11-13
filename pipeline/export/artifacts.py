"""Plan 02: Export artifacts to web/public/data/ and write manifest."""
from __future__ import annotations
import argparse
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path

ARTIFACTS = Path("web/public/data")
MANIFEST = Path("data/manifest.json")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": args.mode,
        "artifacts": {},
    }

    for f in sorted(ARTIFACTS.glob("*.json")):
        content = f.read_bytes()
        sha = hashlib.sha256(content).hexdigest()
        manifest["artifacts"][f.name] = {"sha256": sha, "bytes": len(content)}
        print(f"  {f.name}: {sha[:16]}... ({len(content)} bytes)")

    MANIFEST.write_text(json.dumps(manifest, indent=1))
    print(f"Manifest written to {MANIFEST}")

if __name__ == "__main__":
    main()
