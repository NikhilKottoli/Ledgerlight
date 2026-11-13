# NEAR Value Intelligence — Plan 02 Foundation
# Repo scaffold with typed units, metrics registry, and DefiLlama TVL vertical slice

UV ?= uv
PNPM ?= pnpm
PYTHON_VERSION = 3.11

.PHONY: setup test rebuild verify web-dev web-build snapshot clean

# --- Setup ---
setup:
	$(UV) venv --python $(PYTHON_VERSION)
	$(UV) sync --frozen
	cd web && $(PNPM) install --frozen-lockfile

# --- Vertical slice (Plan 02 task 2.7) ---
# MODE=live  -> fetch from APIs
# MODE=snapshot -> use data/snapshot/
rebuild:
	@echo "=== rebuild MODE=$(MODE) ==="
	$(UV) run python -m pipeline.connectors.defillama --mode=$(MODE)
	$(UV) run python -m pipeline.normalize.defillama --mode=$(MODE)
	$(UV) run python -m pipeline.metrics.compute --mode=$(MODE)
	$(UV) run python -m pipeline.export.artifacts --mode=$(MODE)
	$(MAKE) verify MODE=$(MODE)

# --- Verification ---
verify:
	$(UV) run python -m pipeline.verify.registry
	$(UV) run python -m pipeline.verify.artifacts --mode=$(MODE)
	$(UV) run python -m pipeline.verify.claims_lint

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
	git commit -m "plan-02: snapshot data for $(shell date -u +%Y-%m-%d)"

# --- Clean ---
clean:
	rm -rf .venv data/raw data/processed web/node_modules web/.next
