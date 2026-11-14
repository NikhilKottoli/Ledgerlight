# NEAR Value Intelligence — Full Pipeline
# Repo scaffold with typed units, metrics registry, and full pipeline

UV ?= uv
PNPM ?= pnpm
PYTHON_VERSION = 3.11

.PHONY: setup test rebuild verify web-dev web-build snapshot clean \
        fetch normalize metrics flows stats thesis export report

# --- Setup ---
setup:
	$(UV) venv --python $(PYTHON_VERSION)
	$(UV) sync --frozen
	cd web && $(PNPM) install --frozen-lockfile

# --- Full Pipeline (Plan 09 task 9.1) ---
# MODE=live      -> fetch from APIs
# MODE=snapshot  -> use data/snapshot/
rebuild:
	@echo "=== rebuild MODE=$(MODE) ==="
	$(UV) run python -m pipeline.connectors.defillama --mode=$(MODE)
	$(UV) run python -m pipeline.connectors.intents --mode=$(MODE)
	$(UV) run python -m pipeline.connectors.bigquery --mode=$(MODE)
	$(UV) run python -m pipeline.normalize.defillama --mode=$(MODE)
	$(UV) run python -m pipeline.normalize.intents --mode=$(MODE)
	$(UV) run python -m pipeline.normalize.bigquery --mode=$(MODE)
	$(UV) run python -m pipeline.metrics.compute --mode=$(MODE)
	$(UV) run python -m pipeline.flows.ledger --mode=$(MODE)
	$(UV) run python -m pipeline.stats.run --mode=$(MODE)
	$(UV) run python -m pipeline.thesis.run --mode=$(MODE)
	$(UV) run python -m pipeline.export.artifacts --mode=$(MODE)
	$(UV) run python -m pipeline.export.report --mode=$(MODE)
	$(MAKE) verify MODE=$(MODE)

# --- Individual Pipeline Stages ---
fetch:
	$(UV) run python -m pipeline.connectors.defillama --mode=$(MODE)
	$(UV) run python -m pipeline.connectors.intents --mode=$(MODE)
	$(UV) run python -m pipeline.connectors.bigquery --mode=$(MODE)

normalize:
	$(UV) run python -m pipeline.normalize.defillama --mode=$(MODE)
	$(UV) run python -m pipeline.normalize.intents --mode=$(MODE)
	$(UV) run python -m pipeline.normalize.bigquery --mode=$(MODE)

metrics:
	$(UV) run python -m pipeline.metrics.compute --mode=$(MODE)

flows:
	$(UV) run python -m pipeline.flows.ledger --mode=$(MODE)

stats:
	$(UV) run python -m pipeline.stats.run --mode=$(MODE)

thesis:
	$(UV) run python -m pipeline.thesis.run --mode=$(MODE)

export:
	$(UV) run python -m pipeline.export.artifacts --mode=$(MODE)

report:
	$(UV) run python -m pipeline.export.report --mode=$(MODE)

# --- Verification ---
verify:
	$(UV) run python -m pipeline.verify.registry
	$(UV) run python -m pipeline.verify.artifacts --mode=$(MODE)
	$(UV) run python -m pipeline.verify.claims_lint
	$(UV) run python -m pipeline.verify.manifest --mode=$(MODE)
	$(UV) run python -m pipeline.verify.prereg_freeze

# --- Testing ---
test:
	$(UV) run pytest -q
	cd web && $(PNPM) test

# --- Web ---
web-dev:
	cd web && $(PNPM) dev

web-build:
	cd web && $(PNPM) build

# --- Snapshot (commit after first live run) ---
snapshot:
	@echo "Commit data/snapshot/ after successful live run"
	git add data/snapshot/
	git commit -m "plan-09: snapshot data for $(shell date -u +%Y-%m-%d)"

# --- Clean ---
clean:
	rm -rf .venv data/raw data/processed web/node_modules web/.next
