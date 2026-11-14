-- Metric: revenue.net.near_intents.daily
-- Source: bigquery-public-data.crypto_near_mainnet_us.receipts
-- Bytes scanned: pending BigQuery dry-run
-- Date verified: pending credentials and schema check
-- Required parameters: @start_date DATE, @end_date DATE
-- Cost control: partition filter on block_date; caller sets maximum_bytes_billed.
-- Validate the actions.amount field against the current public schema before running.

SELECT
  block_date,
  SUM(CAST(action.amount AS BIGNUMERIC)) / POW(10, 24) AS inflow_near
FROM `bigquery-public-data.crypto_near_mainnet_us.receipts`,
  UNNEST(actions) AS action
WHERE block_date >= @start_date
  AND block_date < @end_date
  AND receiver_account_id IN (
    'fefundsadmin.sputnik-dao.near',
    'buybacks.multisignature.near',
    '1csfundsadmin.sputnik-dao.near'
  )
  AND action.action_kind = 'TRANSFER'
GROUP BY block_date
ORDER BY block_date;
