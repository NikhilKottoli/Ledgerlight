"""Plan 02 task 2.3: Verify registry ↔ artifacts bijection."""
from __future__ import annotations
import yaml
from pathlib import Path
from pipeline.types.registry import MetricsRegistry

REGISTRY = Path("metrics/registry.yaml")
ARTIFACTS = Path("web/public/data")

def main():
    if not REGISTRY.exists():
        print("Registry not found, skipping")
        return 0

    registry = MetricsRegistry.model_validate(yaml.safe_load(REGISTRY.read_text()))
    metric_ids = registry.ids()
    artifact_ids = {f.stem for f in ARTIFACTS.glob("*.json") if f.stem != "events"}

    missing_in_artifacts = metric_ids - artifact_ids
    extra_in_artifacts = artifact_ids - metric_ids

    if missing_in_artifacts:
        print(f"FAIL: Metrics in registry but no artifact: {sorted(missing_in_artifacts)}")
        return 1
    if extra_in_artifacts:
        print(f"FAIL: Artifacts with no registry entry: {sorted(extra_in_artifacts)}")
        return 1

    print(f"OK: Registry ({len(metric_ids)} metrics) ↔ Artifacts ({len(artifact_ids)}) bijection holds")
    return 0

if __name__ == "__main__":
    exit(main())
