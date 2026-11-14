"""Verify provenance entries for imported competitor and proxy data."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "data" / "reference" / "competitor" / "manifest.json"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    parser.parse_args()
    if not MANIFEST.exists():
        print(f"FAIL: missing {MANIFEST}")
        return 1

    document = json.loads(MANIFEST.read_text())
    errors: list[str] = []
    for item in document.get("imports", []):
        relative = item.get("file_path")
        if not relative:
            errors.append(f"{item.get('id', '<unknown>')}: missing file_path")
            continue
        path = MANIFEST.parent / relative
        if not path.exists():
            errors.append(f"{item.get('id', '<unknown>')}: missing {relative}")
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != item.get("sha256"):
            errors.append(f"{item.get('id', '<unknown>')}: sha256 mismatch")
        if not item.get("commit"):
            errors.append(f"{item.get('id', '<unknown>')}: missing upstream commit")
        if not item.get("license"):
            errors.append(f"{item.get('id', '<unknown>')}: missing license")

    if errors:
        print("\n".join(f"FAIL: {error}" for error in errors))
        return 1
    print(f"OK: {len(document.get('imports', []))} provenance imports verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
