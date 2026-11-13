/** Plan 06: Value Capture Model — TypeScript implementation (parity with Python).
 *  All outputs are `modeled` — never presented as prediction or advice.
 */

export type Scenario = "bear" | "base" | "bull";

export interface ModelInputs {
  V0: number;              // Starting annual Intents volume (USD)
  g: number;               // Annual volume growth rate
  d: number;               // Growth decay per year
  r: number;               // Gross take rate (bps)
  dr: number;              // Annual take rate change (bps)
  c: number;               // Protocol capture rate (net/gross)
  b: number;               // Buyback allocation (share of net revenue)
  phi: number;             // Burn fraction of bought-back NEAR [0, 1]
  P0: number;              // Current NEAR price (USD)
  P_growth: number;        // Annual NEAR price growth rate
  S0: number;              // Current supply (NEAR)
  m: number;               // Gross annual issuance rate
  beta: number;            // Gas burn offset rate
  circulating_supply: number;  // Circulating supply (NEAR)
  market_cap: number;      // Current market cap (USD)
}

export interface YearlyResult {
  year: number;
  V_t: number;
  r_t: number;
  GrossFees_t: number;
  NetRev_t: number;
  NetRev_NEAR_t: number;
  Buyback_NEAR_t: number;
  Burned_NEAR_t: number;
  Held_NEAR_t: number;
  NetIssuance_t: number;
  DeltaSupply_t: number;
  RevYield_t: number;
  BuybackToIssuance_t: number;
  BurnToIssuance_t: number;
  RevToEmissions_t: number;
}

export interface ModelOutput {
  years: YearlyResult[];
  breakeven_volume_burn: number | null;
  breakeven_volume_buyback: number | null;
  breakeven_multiple_burn: number | null;
  breakeven_multiple_buyback: number | null;
}

function computeYearly(inputs: ModelInputs, year: number, prev: YearlyResult | null): YearlyResult {
  let V_t: number;
  let r_t: number;

  if (year === 0) {
    V_t = inputs.V0;
    r_t = inputs.r;
  } else {
    const g_t = Math.max(0, inputs.g - inputs.d * year);
    V_t = prev!.V_t * (1 + g_t);
    r_t = Math.max(0, inputs.r + inputs.dr * year);
  }

  const GrossFees_t = V_t * r_t / 10000;
  const NetRev_t = GrossFees_t * inputs.c;

  const P_t = inputs.P0 * Math.pow(1 + inputs.P_growth, year);
  const NetRev_NEAR_t = NetRev_t / P_t;
  const Buyback_NEAR_t = NetRev_NEAR_t * inputs.b;
  const Burned_NEAR_t = Buyback_NEAR_t * inputs.phi;
  const Held_NEAR_t = Buyback_NEAR_t - Burned_NEAR_t;

  const net_issuance = inputs.S0 * inputs.m * (1 - inputs.beta);
  const NetIssuance_t = net_issuance;
  const DeltaSupply_t = NetIssuance_t - Burned_NEAR_t;

  const supply_t = inputs.circulating_supply + DeltaSupply_t * (year + 1);
  const market_cap_t = P_t * supply_t;

  const RevYield_t = market_cap_t > 0 ? NetRev_t / market_cap_t : 0;
  const BuybackToIssuance_t = NetIssuance_t > 0 ? Buyback_NEAR_t / NetIssuance_t : 0;
  const BurnToIssuance_t = NetIssuance_t > 0 ? Burned_NEAR_t / NetIssuance_t : 0;
  const RevToEmissions_t = NetIssuance_t > 0 ? NetRev_NEAR_t / NetIssuance_t : 0;

  return {
    year,
    V_t,
    r_t,
    GrossFees_t,
    NetRev_t,
    NetRev_NEAR_t,
    Buyback_NEAR_t,
    Burned_NEAR_t,
    Held_NEAR_t,
    NetIssuance_t,
    DeltaSupply_t,
    RevYield_t,
    BuybackToIssuance_t,
    BurnToIssuance_t,
    RevToEmissions_t,
  };
}

export function runModel(inputs: ModelInputs, horizonYears: number = 5): ModelOutput {
  const years: YearlyResult[] = [];
  let prev: YearlyResult | null = null;

  for (let y = 0; y < horizonYears; y++) {
    const yr = computeYearly(inputs, y, prev);
    years.push(yr);
    prev = yr;
  }

  // Breakeven analysis
  const net_issuance = inputs.S0 * inputs.m * (1 - inputs.beta);

  let V_star_burn: number | null = null;
  let breakeven_multiple_burn: number | null = null;

  if (inputs.phi > 0) {
    const denom_burn = inputs.r * inputs.c * inputs.b * inputs.phi;
    if (denom_burn > 0) {
      V_star_burn = net_issuance * inputs.P0 * 10000 / denom_burn;
      breakeven_multiple_burn = V_star_burn / inputs.V0;
    }
  }

  const denom_buyback = inputs.r * inputs.c * inputs.b;
  let V_star_buyback: number | null = null;
  let breakeven_multiple_buyback: number | null = null;

  if (denom_buyback > 0) {
    V_star_buyback = net_issuance * inputs.P0 * 10000 / denom_buyback;
    breakeven_multiple_buyback = V_star_buyback / inputs.V0;
  }

  return {
    years,
    breakeven_volume_burn: V_star_burn,
    breakeven_volume_buyback: V_star_buyback,
    breakeven_multiple_burn: breakeven_multiple_burn,
    breakeven_multiple_buyback: breakeven_multiple_buyback,
  };
}

export interface ModelOutput {
  years: YearlyResult[];
  breakeven_volume_burn: number | null;
  breakeven_volume_buyback: number | null;
  breakeven_multiple_burn: number | null;
  breakeven_multiple_buyback: number | null;
}

export function getDefaultInputs(): ModelInputs {
  return {
    V0: 3_800_000_000,
    g: 0.15,
    d: 0.05,
    r: 160,
    dr: -5,
    c: 0.35,
    b: 0.4,
    phi: 0.0,
    P0: 3.5,
    P_growth: 0.0,
    S0: 1_310_000_000,
    m: 0.025,
    beta: 0.0,
    circulating_supply: 1_000_000_000,
    market_cap: 3_500_000_000,
  };
}

export const SCENARIOS: Record<Scenario, Partial<ModelInputs>> = {
  bear: {
    g: 0.0,
    d: 0.1,
    r: 120,
    dr: -10,
    c: 0.25,
    b: 0.3,
    phi: 0.0,
    P_growth: -0.1,
  },
  base: {
    g: 0.15,
    d: 0.05,
    r: 160,
    dr: -5,
    c: 0.35,
    b: 0.4,
    phi: 0.0,
    P_growth: 0.0,
  },
  bull: {
    g: 0.3,
    d: 0.02,
    r: 180,
    dr: 0,
    c: 0.45,
    b: 0.5,
    phi: 0.0,  // Only if onchain evidence supports
    P_growth: 0.1,
  },
};

export function applyScenario(inputs: ModelInputs, scenario: Scenario): ModelInputs {
  const overrides = SCENARIOS[scenario];
  return { ...inputs, ...overrides };
}
