#!/bin/bash
# Auto-run pipeline every 5 minutes
# Requires NEAR_INTENTS_JWT in environment

cd /home/azureuser/NEAR/near-value-intelligence

# Load env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Run ingestion
python3 -m pipeline.connectors.intents_explorer --mode=live --backfill-days=3 >> /tmp/pipeline_cron.log 2>&1

# Normalize
python3 -m pipeline.normalize.intents --mode=live >> /tmp/pipeline_cron.log 2>&1

# Update registry
python3 scripts/gen_registry_json.py >> /tmp/pipeline_cron.log 2>&1

echo "$(date): Pipeline cycle complete" >> /tmp/pipeline_cron.log
