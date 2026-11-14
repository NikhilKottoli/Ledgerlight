-- Metric: network.active_accounts.daily
-- Source: bigquery-public-data.crypto_near_mainnet_us.transactions
-- Bytes scanned: pending BigQuery dry-run
-- Date verified: pending credentials and schema check
-- Required parameters: @start_date DATE, @end_date DATE
-- Cost control: partition filter on block_date; caller sets maximum_bytes_billed.

SELECT
  block_date,
  COUNT(DISTINCT signer_account_id) AS active_accounts
FROM `bigquery-public-data.crypto_near_mainnet_us.transactions`
WHERE block_date >= @start_date
  AND block_date < @end_date
GROUP BY block_date
ORDER BY block_date;
