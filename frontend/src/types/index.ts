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
  intraday_only?: boolean;
  kill_switch_closes_positions?: boolean;
  is_realtime?: boolean;
  data_delay_seconds?: number;
  updated_at?: string;
}

export interface TradingJournalEntry {
  id: number;
  portfolio_id: number;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  exit_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward_ratio: number;
  risk_amount: number;
  realized_pnl: number;
  realized_pnl_pct: number;
  setup_reason: string;
  exit_reason: string;
  emotion_tag: 'DISCIPLINED' | 'FOMO' | 'GREED' | 'FEAR' | 'REVENGE';
  ai_critique?: string | null;
  holding_seconds: number;
  created_at: string;
  closed_at: string;
}

export interface TradingJournalSummary {
  total_trades_logged: number;
  disciplined_trades_pct: number;
  avg_risk_reward_ratio: number;
  net_realized_pnl: number;
  win_rate_pct: number;
  entries: TradingJournalEntry[];
}

export interface DailyLedgerEntry {
  day_number: number;
  day_label: string;
  date: string;
  opening_capital: number;
  buys_count: number;
  sells_count: number;
  total_trades: number;
  stocks_traded: string;
  gross_pnl: number;
  charges_fees: number;
  net_pnl: number;
  closing_capital: number;
  total_equity?: number;
  day_return_pct: number;
  cumulative_return_pct: number;
  compounding_target?: number;
  compounding_achieved?: boolean;
  discipline_status: 'TARGET_HIT' | 'CAPITAL_PRESERVED' | 'DISCIPLINED' | 'MARKET_STANDBY';
  ai_decision_summary: string;
}

export interface DailyLedgerResponse {
  portfolio_id: number;
  total_days: number;
  days: DailyLedgerEntry[];
}

export interface OptionGreeksInfo {
  symbol: string;
  ltp: number;
  iv: number;
  delta: number;
  theta: number;
  oi: number;
  lot_size: number;
  margin_required: number;
}

export interface OptionStrikeItem {
  strike: number;
  is_atm: boolean;
  ce: OptionGreeksInfo;
  pe: OptionGreeksInfo;
}

export interface OptionChainResponse {
  underlying: string;
  underlying_name?: string;
  underlying_type?: string;
  spot_price: number;
  change_pct: number;
  expiry_date: string;
  lot_size: number;
  strike_step?: number;
  atm_strike: number;
  strikes: OptionStrikeItem[];
  server_time_ist: string;
}

export interface OptionPosition {
  id: number;
  symbol: string;
  underlying: string;
  strike_price: number;
  option_type: 'CE' | 'PE';
  strategy_type?: string;
  paired_strike?: number;
  net_debit?: number;
  expiry_date: string;
  lot_size: number;
  quantity: number;
  entry_premium: number;
  current_premium: number;
  stop_loss_premium: number;
  target_premium: number;
  trailing_stop_premium: number;
  trailing_activated: boolean;
  is_open: boolean;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  invested_margin: number;
  created_at: string;
}

export interface OptionTrade {
  id: number;
  symbol: string;
  underlying: string;
  strike_price: number;
  option_type: 'CE' | 'PE';
  expiry_date: string;
  lot_size: number;
  quantity: number;
  entry_premium: number;
  exit_premium: number;
  realized_pnl: number;
  return_pct: number;
  fees: number;
  entry_time: string;
  exit_time: string;
  exit_reason: string;
  trade_notes?: string;
}

export interface OptionsPortfolio {
  initial_capital: number;
  cash_balance: number;
  realized_pnl: number;
  total_fees: number;
  peak_equity: number;
  current_equity: number;
  unrealized_pnl: number;
  total_portfolio_value: number;
  is_autopilot_enabled: boolean;
  whatsapp_phone?: string;
  whatsapp_alerts_enabled?: boolean;
  broker_name?: string;
  broker_client_code?: string;
  is_live_broker_routing?: boolean;
  open_positions: OptionPosition[];
  recent_trades: OptionTrade[];
  win_rate_pct: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
}

export interface SegmentPerformance {
  name: string;
  initial_capital: number;
  current_equity: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  realized_pnl: number;
  total_fees: number;
  roi_pct: number;
  profit_factor: number;
  risk_profile: string;
  holding_type: string;
}

export interface OptionsComparisonResponse {
  equity: SegmentPerformance;
  options: SegmentPerformance;
  ai_insight_telugu: string;
}

export interface OptionAISignal {
  underlying?: string;
  spot_price: number;
  change_pct: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence_pct: number;
  recommended_strike: number;
  recommended_type: 'CE' | 'PE' | 'NONE';
  recommended_symbol?: string | null;
  reason: string;
}

export interface UnderlyingInfo {
  symbol: string;
  name: string;
  type: 'INDEX' | 'STOCK';
  spot_price: number;
  change_pct: number;
  lot_size: number;
  strike_step: number;
}

export interface PCRPainLevel {
  strike: number;
  total_loss_cr: number;
  is_max_pain: boolean;
}

export interface PCRMaxPainData {
  underlying: string;
  spot_price: number;
  pcr: number;
  pcr_sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  max_pain_strike: number;
  total_ce_oi: number;
  total_pe_oi: number;
  pain_levels: PCRPainLevel[];
  ai_interpretation: string;
  ai_interpretation_telugu: string;
}

export interface SpreadOrderPayload {
  underlying: string;
  spread_type: 'BULL_CALL_SPREAD' | 'BEAR_PUT_SPREAD';
  quantity?: number;
}

export interface WhatsAppConfig {
  whatsapp_phone: string;
  whatsapp_phone_number_id?: string;
  has_meta_token?: boolean;
  whatsapp_api_key?: string;
  whatsapp_provider?: string;
  whatsapp_alerts_enabled: boolean;
}

export interface WhatsAppTestResponse {
  status: string;
  phone: string;
  wa_link: string;
  whatsapp_link?: string;
  message: string;
  timestamp: string;
}

export interface ChallengeStage {
  level: number;
  name: string;
  target: string;
  desc: string;
  unlocked: boolean;
}

export interface ChallengeBadge {
  id: string;
  name: string;
  icon: string;
  desc: string;
  earned: boolean;
}

export interface ChallengeProgress {
  initial_capital: number;
  current_equity: number;
  target_capital: number;
  progress_pct: number;
  roi_pct: number;
  days_active: number;
  total_trades: number;
  win_rate_pct: number;
  current_stage_name: string;
  current_stage_level: number;
  stages: ChallengeStage[];
  badges: ChallengeBadge[];
  daily_advice_en: string;
  daily_advice_telugu: string;
}

export interface TradeReplayStep {
  step_index: number;
  time_offset_min: number;
  spot_price: number;
  option_premium: number;
  trailing_stop: number;
  unrealized_pnl: number;
  pnl_pct: number;
  event_note?: string;
}

export interface TradeReplayData {
  trade_id: number;
  symbol: string;
  underlying: string;
  option_type: string;
  strike_price: number;
  entry_premium: number;
  exit_premium: number;
  realized_pnl: number;
  return_pct: number;
  exit_reason: string;
  entry_time: string;
  exit_time: string;
  trajectory: TradeReplayStep[];
  post_mortem_en: string;
  post_mortem_telugu: string;
}

export interface SupportedBroker {
  id: string;
  name: string;
  is_virtual: boolean;
  description: string;
}

export interface BrokerBridgeConfig {
  broker_name: string;
  broker_client_code: string;
  is_live_broker_routing: boolean;
  has_api_key: boolean;
  supported_brokers: SupportedBroker[];
}


