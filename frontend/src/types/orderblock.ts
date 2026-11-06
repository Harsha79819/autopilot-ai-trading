export interface OrderBlockSetup {
  symbol: string;
  type: 'BULLISH' | 'BEARISH';
  current_price: number;
  day_pct: number;
  vwap: number;
  vwap_aligned: boolean;
  zone_z: number;
  invalidation: number;
  stop_label: string;
  target_r1: number;
  target_r2: number;
  risk_per_share: number;
  rr_ratio: number;
  rule_badge?: string;
  is_pick?: boolean;
}

export interface MarketBreadth {
  counts: {
    bullish: number;
    bearish: number;
    total: number;
  };
  leading_sector: {
    sector: string;
    avg_pct: number;
  };
  lagging_sector: {
    sector: string;
    avg_pct: number;
  };
  dots: Array<{
    symbol: string;
    pct: number;
    sector: string;
    is_bullish: boolean;
  }>;
}
