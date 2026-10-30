/**
 * API Client for AutoPilot AI Trading Platform
 */
import {
  Portfolio,
  Quote,
  Candle,
  ScannerResponse,
  StrategyInfo,
  StrategySignal,
  Order,
  RiskStatus,
  AuditLog,
  BacktestResponse,
  AIStatus,
  TradingJournalEntry,
  TradingJournalSummary,
  DailyLedgerEntry,
  DailyLedgerResponse
} from '../types';

const BASE_URL = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('autopilot_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  async register(email: string, password: string, fullName?: string) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  // Portfolio
  async getPortfolio(): Promise<Portfolio> {
    const res = await fetch(`${BASE_URL}/portfolio`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch portfolio');
    return res.json();
  },

  async resetPortfolio(capital: number = 500.00): Promise<Portfolio> {
    const res = await fetch(`${BASE_URL}/portfolio/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ capital }),
    });
    if (!res.ok) throw new Error('Failed to reset portfolio');
    return res.json();
  },

  async depositVirtualFunds(amount: number, note: string = "Simulated deposit"): Promise<Portfolio> {
    const res = await fetch(`${BASE_URL}/portfolio/deposit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, note }),
    });
    if (!res.ok) throw new Error('Failed to deposit virtual funds');
    return res.json();
  },

  // Market
  async getQuotes(): Promise<Quote[]> {
    const res = await fetch(`${BASE_URL}/market/quotes`);
    if (!res.ok) throw new Error('Failed to fetch quotes');
    return res.json();
  },

  async getCandles(symbol: string, timeframe: string = '1m', limit: number = 60): Promise<Candle[]> {
    const res = await fetch(`${BASE_URL}/market/candles/${symbol}?timeframe=${timeframe}&limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to fetch candles for ${symbol}`);
    return res.json();
  },

  async toggleMarketGate(): Promise<{ gate_enabled: boolean; is_market_open: boolean; session_message: string }> {
    const res = await fetch(`${BASE_URL}/market/toggle-gate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle market session gate');
    return res.json();
  },

  // Scanner
  async getScannerOpportunities(): Promise<ScannerResponse> {
    const res = await fetch(`${BASE_URL}/scanner/opportunities`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch scanner opportunities');
    return res.json();
  },

  // Strategies
  async getStrategies(): Promise<StrategyInfo[]> {
    const res = await fetch(`${BASE_URL}/strategies`);
    if (!res.ok) throw new Error('Failed to fetch strategies');
    return res.json();
  },

  async evaluateStrategy(symbol: string, strategyName?: string): Promise<StrategySignal[]> {
    const res = await fetch(`${BASE_URL}/strategies/evaluate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ symbol, strategy_name: strategyName }),
    });
    if (!res.ok) throw new Error('Failed to evaluate strategies');
    return res.json();
  },

  // Orders
  async createOrder(order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    order_type?: 'MARKET' | 'LIMIT';
    quantity: number;
    price?: number;
  }): Promise<Order> {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...order,
        order_type: order.order_type || 'MARKET'
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to place order');
    }
    return res.json();
  },

  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${BASE_URL}/orders`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  // Risk
  async getRiskStatus(): Promise<RiskStatus> {
    const res = await fetch(`${BASE_URL}/risk/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch risk status');
    return res.json();
  },

  async triggerKillSwitch(activate: boolean, reason?: string) {
    const res = await fetch(`${BASE_URL}/risk/kill-switch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ activate, reason }),
    });
    if (!res.ok) throw new Error('Failed to update kill switch');
    return res.json();
  },

  async getAuditLogs(limit: number = 40): Promise<AuditLog[]> {
    const res = await fetch(`${BASE_URL}/risk/audit-logs?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Backtest
  async runBacktest(req: {
    strategy_name: string;
    symbol: string;
    initial_capital?: number;
  }): Promise<BacktestResponse> {
    const res = await fetch(`${BASE_URL}/backtest/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...req,
        initial_capital: req.initial_capital || 100.0,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Backtest failed');
    }
    return res.json();
  },

  // AutoPilot Bot
  async getAutoPilotStatus(): Promise<AIStatus> {
    const res = await fetch(`${BASE_URL}/autopilot/status`);
    if (!res.ok) throw new Error('Failed to fetch autopilot status');
    return res.json();
  },

  async toggleAutoPilot(enabled: boolean): Promise<any> {
    const res = await fetch(`${BASE_URL}/autopilot/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error('Failed to toggle autopilot');
    return res.json();
  },

  async triggerAutoPilotScan(): Promise<any> {
    const res = await fetch(`${BASE_URL}/autopilot/scan`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to trigger autopilot scan');
    return res.json();
  },

  // AI Market Copilot Chat
  async chatWithAi(messages: { role: string; content: string }[]): Promise<{
    reply: string;
    warnings: { level: string; code: string; message: string }[];
    portfolio_snapshot: { cash_balance: number; total_portfolio_value: number; open_positions_count: number; status: string };
    is_market_open: boolean;
    timestamp: string;
  }> {
    const geminiKey = localStorage.getItem('gemini_api_key') || undefined;
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ messages, include_context: true, gemini_api_key: geminiKey }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to communicate with AI Copilot');
    }
    return res.json();
  },

  // Trading Journal (Rule 4: Setup, Exit, 1:2 RR, Emotion & AI Critique)
  async getTradingJournal(limit = 50): Promise<TradingJournalSummary> {
    const res = await fetch(`${BASE_URL}/journal?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch trading journal');
    }
    return res.json();
  },

  async updateJournalEmotion(entryId: number, emotionTag: string): Promise<TradingJournalEntry> {
    const res = await fetch(`${BASE_URL}/journal/${entryId}/emotion`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ emotion_tag: emotionTag }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update journal emotion');
    }
    return res.json();
  },

  // Financial Planner & Calculators
  async calculateSIP(req: { monthly_investment: number; expected_annual_return_pct: number; tenure_years: number; annual_inflation_pct?: number }) {
    const res = await fetch(`${BASE_URL}/planner/calculate/sip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('SIP calculation failed');
    return res.json();
  },

  async calculateEMI(req: { principal: number; annual_interest_rate_pct: number; tenure_months: number }) {
    const res = await fetch(`${BASE_URL}/planner/calculate/emi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('EMI calculation failed');
    return res.json();
  },

  async getExpenses() {
    const res = await fetch(`${BASE_URL}/planner/expenses`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch expenses');
    return res.json();
  },

  async addExpense(expense: { category: string; amount: number; description?: string; is_recurring?: boolean }) {
    const res = await fetch(`${BASE_URL}/planner/expenses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(expense),
    });
    if (!res.ok) throw new Error('Failed to add expense');
    return res.json();
  },

  async getGoals() {
    const res = await fetch(`${BASE_URL}/planner/goals`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch savings goals');
    return res.json();
  },

  async createGoal(goal: { goal_name: string; target_amount: number; current_amount?: number; monthly_contribution?: number; category?: string }) {
    const res = await fetch(`${BASE_URL}/planner/goals`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error('Failed to create goal');
    return res.json();
  },

  // Watchlist & Alerts
  async getWatchlist() {
    const res = await fetch(`${BASE_URL}/watchlist`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch watchlist');
    return res.json();
  },

  async addToWatchlist(item: { symbol: string; target_buy_price?: number; target_sell_price?: number; notes?: string }) {
    const res = await fetch(`${BASE_URL}/watchlist`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to add to watchlist');
    return res.json();
  },

  async removeFromWatchlist(symbol: string) {
    const res = await fetch(`${BASE_URL}/watchlist/${symbol}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to remove from watchlist');
    return res.json();
  },

  async getAlerts() {
    const res = await fetch(`${BASE_URL}/watchlist/alerts`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  async createAlert(alert: { symbol?: string; alert_type: string; threshold_value: number }) {
    const res = await fetch(`${BASE_URL}/watchlist/alerts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(alert),
    });
    if (!res.ok) throw new Error('Failed to create alert');
    return res.json();
  },

  async deleteAlert(alertId: number) {
    const res = await fetch(`${BASE_URL}/watchlist/alerts/${alertId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete alert');
    return res.json();
  },

  // Market Research & News
  async getNews(symbol?: string) {
    const url = symbol ? `${BASE_URL}/research/news?symbol=${symbol}` : `${BASE_URL}/research/news`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch news');
    return res.json();
  },

  async getCompanyProfile(symbol: string) {
    const res = await fetch(`${BASE_URL}/research/company/${symbol}`);
    if (!res.ok) throw new Error('Failed to fetch company profile');
    return res.json();
  },

  async compareCompanies(symbols = 'INFY,TCS,ITC,BEL') {
    const res = await fetch(`${BASE_URL}/research/compare?symbols=${symbols}`);
    if (!res.ok) throw new Error('Failed to compare companies');
    return res.json();
  },

  // Scenario Simulator
  async simulateMarketShock(dropPct = -10.0) {
    const res = await fetch(`${BASE_URL}/scenario/market-shock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ drop_pct: dropPct }),
    });
    if (!res.ok) throw new Error('Failed to run market shock scenario');
    return res.json();
  },

  // Document Intelligence
  async uploadDocument(file: File, docType = 'TRANSACTION_CSV') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    const token = localStorage.getItem('autopilot_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },

  async getDocuments() {
    const res = await fetch(`${BASE_URL}/documents`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async askDocument(documentId: number, question: string) {
    const res = await fetch(`${BASE_URL}/documents/ask`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ document_id: documentId, question }),
    });
    if (!res.ok) throw new Error('Failed to query document');
    return res.json();
  },

  // Reports
  async getReportSummary() {
    const res = await fetch(`${BASE_URL}/reports/summary`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch report summary');
    return res.json();
  },

  async getDailyLedger(): Promise<DailyLedgerResponse> {
    const res = await fetch(`${BASE_URL}/reports/daily-ledger`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch daily ledger');
    return res.json();
  },

  async downloadDailyLedgerCsv(): Promise<void> {
    const res = await fetch(`${BASE_URL}/reports/daily-ledger/download`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to download daily ledger CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AutoPilot_Trading_Daily_Ledger.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async getCompoundingTracker(): Promise<any> {
    const res = await fetch(`${BASE_URL}/reports/compounding-tracker`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch compounding tracker');
    return res.json();
  },
};


