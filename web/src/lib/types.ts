/** TypeScript branded types mirroring pipeline/types/units.py */
export type Brand<T, B> = T & { __brand: B };

export type UsdAmount = Brand<number, "UsdAmount">;
export type NearAmount = Brand<number, "NearAmount">;
export type Bps = Brand<number, "Bps">;

export type GrossFeesUSD = Brand<number, "GrossFeesUSD">;
export type PartnerPayoutUSD = Brand<number, "PartnerPayoutUSD">;
export type NetRevenueUSD = Brand<number, "NetRevenueUSD">;
export type SwapVolumeUSD = Brand<number, "SwapVolumeUSD">;
export type AppFeesUSD = Brand<number, "AppFeesUSD">;

export type NetRevenueNEAR = Brand<number, "NetRevenueNEAR">;
export type BuybackNEAR = Brand<number, "BuybackNEAR">;
export type BurnNEAR = Brand<number, "BurnNEAR">;
export type HeldNEAR = Brand<number, "HeldNEAR">;
export type TreasuryNEAR = Brand<number, "TreasuryNEAR">;
export type SupplyNEAR = Brand<number, "SupplyNEAR">;

export type MetricKind = "measured" | "derived" | "modeled";
export type DataMode = "live" | "snapshot" | "synthetic";

export interface PricePoint {
  nearPerUsd: number; // NEAR per 1 USD
  source: string;
  timestamp: string; // ISO8601
}

export interface TypedAmount {
  value: number;
  unit: string;
  kind: MetricKind;
}

export interface SeriesPoint {
  t: string;
  v: number | null;
  null_reason: string | null;
}

export interface ArtifactMeta {
  metric_id: string;
  data_mode: DataMode;
  retrieved_at: string;
  source_max_ts: string | null;
  git_commit: string;
  sha256_inputs: string;
  completeness: string;
  warnings: string[];
}

export interface MetricArtifact {
  meta: ArtifactMeta;
  series: SeriesPoint[];
}

// Flow ledger types (from pipeline/types/flow_ledger.py)
export interface FlowNodeModel {
  id: string;
  label: string;
  stage: string;
  amount: number;
  unit: string;
  alt_amount: number | null;
  alt_unit: string | null;
  kind: string;
  status: string;
  calc: string;
  sources: string[];
  price_source: string | null;
  evidence_refs: string[];
  completeness_note: string;
}

export interface FlowEdgeModel {
  source: string;
  target: string;
  amount: number;
  unit: string;
  status: string;
}

export interface ResidualModel {
  stage: string;
  amount: number;
  unit: string;
  reason: string;
  sign: string;
}

export interface ReconciliationEntryModel {
  source: string;
  value: string;
  unit: string;
  delta_pct: string | null;
}

export interface FlowLedgerModel {
  period: string;
  start: string;
  end: string;
  data_mode: string;
  retrieved_at: string;
  volume_usd: number | null;
  effective_gross_take_bps: number | null;
  nodes: FlowNodeModel[];
  edges: FlowEdgeModel[];
  residuals: ResidualModel[];
  reconciliation: Record<string, ReconciliationEntryModel[]>;
}
