"""Generate registry.json from registry.yaml for static site."""
import yaml
import json
from pathlib import Path

registry_path = Path("metrics/registry.yaml")
out_path = Path("web/public/data/registry.json")

with open(registry_path) as f:
    data = yaml.safe_load(f)

out_path.write_text(json.dumps(data, indent=1))
print(f"Generated {out_path} with {len(data.get('metrics', []))} metrics")
