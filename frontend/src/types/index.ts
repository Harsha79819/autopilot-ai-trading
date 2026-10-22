/**
 * TypeScript Type Definitions for AutoPilot AI Trading Platform
 */

export interface FeeBreakdown {
  brokerage: number;
  stt: number;
  exchange_charges: number;
  gst: number;
  sebi_charges: number;
  stamp_duty: number;
  dp_charges: number;
  slippage_amount: number;
  spread_amount: number;
  total_charges: number;
}

export interface Position {
  id: number;
  symbol: string;
  quantity: number;
  average_buy_price: number;
  current_price: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  gross_pnl?: number;
  estimated_exit_costs?: number;
  net_pnl?: number;
  updated_at: string;
}

export interface Trade {
  id: number;
  order_id: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  execution_price: number;
  gross_amount: number;
  fees: FeeBreakdown;
  net_amount: number;
  realized_pnl: number;
  executed_at: string;
}

export interface PerformanceMetrics {
  initial_cash: number;
  current_cash: number;
  holdings_value: number;
  total_portfolio_value: number;
  gross_profit: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_fees_paid: number;
  net_pnl: number;
  net_return_pct: number;
  peak_value: number;
  max_drawdown_pct: number;
  total_trades_count: number;
  winning_trades_count: number;
  losing_trades_count: number;
  win_rate_pct: number;
  cost_drag_pct: number;
}

export interface Portfolio {
  id: number;
  user_id: number;
  initial_cash: number;
  cash_balance: number;
  holdings_value: number;
  total_portfolio_value: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_fees_paid: number;
  net_pnl: number;
  net_return_pct: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  is_kill_switched: boolean;
  is_paper_trading: boolean;
  positions: Position[];
  recent_trades: Trade[];
  metrics: PerformanceMetrics;
  updated_at: string;
}

export interface Quote {
  symbol: string;
  company_name: string;
  current_price: number;
  open: number;
  high: number;
  low: number;
  previous_close: number;
  change: number;
  change_pct: number;
  bid: number;
  ask: number;
  spread_pct: number;
  volume: number;
  timestamp: string;
  is_stale: boolean;
  is_demo: boolean;
  disclaimer: string;
}

export interface Candle {
  symbol: string;
  timeframe: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  is_demo: boolean;
}

export interface CostGateResult {
  passed: boolean;
  multiplier_k: number;
  expected_move_pct: number;
  round_trip_cost_pct: number;
  spread_pct: number;
  slippage_pct: number;
  total_friction_pct: number;
  hurdle_rate_pct: number;
  reason: string;
}

export interface StrategySignal {
  strategy_name: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';
  confidence: number;
  rationale: string;
  timestamp: string;
  price: number;
  suggested_quantity: number;
  cost_gate: CostGateResult;
  is_actionable: boolean;
}

export interface ScannerOpportunity {
  symbol: string;
  company_name: string;
  current_price: number;
  eligible_for_capital: boolean;
  max_affordable_shares: number;
  spread_pct: number;
  volume_24h: number;
  momentum_score: number;
  rsi_14: number;
  trend_direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strategy_recommendation?: string;
  expected_move_pct: number;
  estimated_roundtrip_cost_pct: number;
  cost_gate_passed: boolean;
  is_actionable: boolean;
  rejection_reason_short?: string;
}

export interface NoTradeReason {
  symbol: string;
  stage: string;
  reason: string;
  details: Record<string, any>;
}

export interface ScannerResponse {
  available_cash: number;
  total_scanned: number;
  eligible_under_capital_count: number;
  actionable_count: number;
  scanner_decision?: string;
  opportunities: ScannerOpportunity[];
  no_trade_reasons: NoTradeReason[];
  scanned_at: string;
  is_demo: boolean;
}

export interface StrategyInfo {
  name: string;
  display_name: string;
  description: string;
  entry_conditions: string[];
  exit_conditions: string[];
  assumptions: string[];
  risk_limits: string[];
  required_market_data: string[];
  known_limitations: string[];
  default_parameters: Record<string, any>;
  is_active: boolean;
}

export interface Order {
  id: number;
  portfolio_id: number;
  user_id: number;
  idempotency_key: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  order_type: 'MARKET' | 'LIMIT';
  requested_quantity: number;
  filled_quantity: number;
  price: number;
  executed_price?: number;
  status: 'SUBMITTED' | 'FILLED' | 'REJECTED' | 'CANCELLED';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskConfig {
  max_position_size_pct: number;
  max_daily_loss_pct: number;
  max_portfolio_drawdown_pct: number;
  stale_data_threshold_seconds: number;
  cost_gate_multiplier: number;
  is_emergency_stopped: boolean;
}

export interface RiskStatus {
  is_emergency_stopped: boolean;
  current_drawdown_pct: number;
  max_drawdown_limit_pct: number;
  today_realized_loss: number;
  today_loss_pct: number;
  max_daily_loss_limit_pct: number;
  open_positions_count: number;
  portfolio_value: number;
  audit_logs_count: number;
  risk_state: 'HEALTHY' | 'WARNING' | 'HALTED' | 'EMERGENCY_STOP';
  config: RiskConfig;
}

export interface AuditLog {
  id: number;
  user_id: number;
  event_type: string;
  symbol?: string;
  decision: string;
  reason: string;
  details_json: string;
  timestamp: string;
}

export interface BacktestSplit {
  split_name: string;
  start_date: string;
  end_date: string;
  total_trades: number;
  win_rate_pct: number;
  gross_profit: number;
  total_fees: number;
  net_profit: number;
  max_drawdown_pct: number;
  profit_factor: number;
}

export interface BacktestResponse {
  strategy_name: string;
  symbol: string;
  initial_capital: number;
  final_equity: number;
  gross_return_pct: number;
  net_return_pct: number;
  total_fees_paid: number;
  cost_drag_pct: number;
  total_trades: number;
  win_rate_pct: number;
  max_drawdown_pct: number;
  profit_factor: number;
  sharpe_ratio: number;
  splits: BacktestSplit[];
  equity_curve: { timestamp: string; equity: number; cash: number; split: string }[];
  sample_trades: any[];
  assumptions_disclaimer: string;
}

export interface AIStatus {
  status: 'INITIALIZING' | 'SCANNING' | 'HOLDING' | 'PAUSED' | 'HALTED' | 'MARKET_CLOSED' | 'RUNNING';
  message: string;
  best_stock?: string | null;
  best_score?: number;
  active_positions_count?: number;
  target_profit?: number | null;
  stop_loss?: number | null;
  autopilot_enabled?: boolean;
  updated_at?: string;
}
