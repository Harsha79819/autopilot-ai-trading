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
  AIStatus
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
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ messages, include_context: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to communicate with AI Copilot');
    }
    return res.json();
  },
};
