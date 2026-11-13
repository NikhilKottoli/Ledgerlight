"""Plan 02 task 2.4: Verify artifact schema and data_mode consistency."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from pipeline.types.artifact import MetricArtifact, DataMode

ARTIFACTS = Path("web/public/data")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["live", "snapshot"], default="live")
    args = parser.parse_args()

    expected_mode = DataMode(args.mode)
    errors = 0

    for f in sorted(ARTIFACTS.glob("*.json")):
        # Skip non-metric artifacts (like events.json)
        if f.stem == "events":
            continue
        try:
            artifact = MetricArtifact.from_json(f.read_text())
            if artifact.meta.data_mode != expected_mode:
                print(f"FAIL: {f.name} data_mode={artifact.meta.data_mode.value} != expected {expected_mode.value}")
                errors += 1
            # Verify hash
            if not artifact.verify_hash(artifact.meta.sha256_inputs):
                print(f"FAIL: {f.name} hash mismatch (expected {artifact.meta.sha256_inputs[:16]}..., got {artifact.compute_hash()[:16]}...)")
                errors += 1
            else:
                print(f"OK: {f.name} (mode={artifact.meta.data_mode.value}, {len(artifact.series)} points)")
        except Exception as e:
            print(f"FAIL: {f.name} parse error: {e}")
            errors += 1

    if errors:
        print(f"FAIL: {errors} artifact(s) failed validation")
        return 1
    print("All artifacts valid")
    return 0

if __name__ == "__main__":
    exit(main())
