-- Metric: buyback.outflows
-- Source: bigquery-public-data.crypto_near_mainnet_us.receipts
-- Bytes scanned: pending BigQuery dry-run
-- Date verified: pending credentials and schema check
-- Required parameters: @start_date DATE, @end_date DATE
-- Cost control: partition filter on block_date; caller sets maximum_bytes_billed.
-- This query traces destinations; it does not classify burn versus held without
-- an explicit destination classification table.
-- Validate the actions.amount field against the current public schema before running.

SELECT
  block_date,
  receiver_account_id AS destination_account_id,
  SUM(CAST(action.amount AS BIGNUMERIC)) / POW(10, 24) AS outflow_near
FROM `bigquery-public-data.crypto_near_mainnet_us.receipts`,
  UNNEST(actions) AS action
WHERE block_date >= @start_date
  AND block_date < @end_date
  AND predecessor_account_id = 'buybacks.multisignature.near'
  AND action.action_kind = 'TRANSFER'
GROUP BY block_date, destination_account_id
ORDER BY block_date, destination_account_id;
