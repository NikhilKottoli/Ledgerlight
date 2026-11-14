-- Metric: supply.net_supply_change.daily
-- Source: bigquery-public-data.crypto_near_mainnet_us.blocks
-- Bytes scanned: pending BigQuery dry-run
-- Date verified: pending credentials and schema check
-- Required parameters: @start_date DATE, @end_date DATE
-- Cost control: partition filter on block_date; caller sets maximum_bytes_billed.
-- Validate the supply field names against the current public schema before running.

SELECT
  block_date,
  MAX(total_supply) - LAG(MAX(total_supply)) OVER (ORDER BY block_date)
    AS net_supply_change_yocto_near
FROM `bigquery-public-data.crypto_near_mainnet_us.blocks`
WHERE block_date >= @start_date
  AND block_date < @end_date
GROUP BY block_date
ORDER BY block_date;
