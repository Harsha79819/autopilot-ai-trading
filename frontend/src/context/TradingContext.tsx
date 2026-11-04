import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Portfolio, Quote, ScannerResponse, RiskStatus, AIStatus } from '../types';
import { api } from '../services/api';
import { wsClient } from '../services/ws';

interface TradingContextType {
  portfolio: Portfolio | null;
  quotes: Record<string, Quote>;
  scannerData: ScannerResponse | null;
  riskStatus: RiskStatus | null;
  aiStatus: AIStatus | null;
  isWsConnected: boolean;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  refreshPortfolio: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
  refreshScanner: () => Promise<void>;
  refreshAutoPilot: () => Promise<void>;
  toggleAutoPilot: (enabled: boolean) => Promise<void>;
  triggerAutoPilotScan: () => Promise<void>;
  deployAllCapital: () => Promise<any>;
  resetCapital: (capital?: number) => Promise<void>;
  depositCapital: (amount: number, note?: string) => Promise<void>;
  toggleKillSwitch: (activate: boolean) => Promise<void>;
  lastPortfolioUpdate: number;
  placeOrder: (order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    order_type?: 'MARKET' | 'LIMIT';
    price?: number;
  }) => Promise<any>;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const PORTFOLIO_CACHE_KEY = 'autopilot_portfolio_cache';

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously initialize portfolio from localStorage cache if available for 0ms instant loading
  const [portfolio, setPortfolio] = useState<Portfolio | null>(() => {
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem(PORTFOLIO_CACHE_KEY) : null;
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_) {}
    return null;
  });
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [scannerData, setScannerData] = useState<ScannerResponse | null>(null);
  const [riskStatus, setRiskStatus] = useState<RiskStatus | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' ? !localStorage.getItem(PORTFOLIO_CACHE_KEY) : true;
    } catch (_) {
      return true;
    }
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [lastPortfolioUpdate, setLastPortfolioUpdate] = useState<number>(Date.now());

  const refreshPortfolio = useCallback(async () => {
    try {
      const data = await api.getPortfolio();
      setPortfolio(data);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(PORTFOLIO_CACHE_KEY, JSON.stringify(data));
        }
      } catch (_) {}
    } catch (err) {
      console.error('Error fetching portfolio:', err);
    }
  }, []);

  const refreshQuotes = useCallback(async () => {
    try {
      const data = await api.getQuotes();
      if (Array.isArray(data)) {
        const quoteMap: Record<string, Quote> = {};
        data.forEach((q: Quote) => {
          quoteMap[q.symbol] = q;
        });
        setQuotes((prev) => ({ ...prev, ...quoteMap }));
      }
    } catch (err) {
      console.error('Error fetching quotes:', err);
    }
  }, []);

  const refreshScanner = useCallback(async () => {
    try {
      const data = await api.getScannerOpportunities();
      setScannerData(data);
    } catch (err) {
      console.error('Error fetching scanner data:', err);
    }
  }, []);

  const refreshRisk = useCallback(async () => {
    try {
      const data = await api.getRiskStatus();
      setRiskStatus(data);
    } catch (err) {
      console.error('Error fetching risk status:', err);
    }
  }, []);

  const refreshAutoPilot = useCallback(async () => {
    try {
      const data = await api.getAutoPilotStatus();
      setAiStatus(data);
    } catch (err) {
      console.error('Error fetching autopilot status:', err);
    }
  }, []);

  // Initial load: fast-path for portfolio and risk, non-blocking background for scanner & quotes
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.allSettled([
          refreshPortfolio(),
          refreshRisk(),
          refreshAutoPilot()
        ]);
      } finally {
        setIsLoading(false);
      }

      // Fetch heavier scanner opportunities and quotes in background without blocking screen
      Promise.allSettled([
        refreshQuotes(),
        refreshScanner()
      ]).catch(console.error);
    };
    init();

    // Connect WebSocket
    wsClient.connect();
    setIsWsConnected(true);

    const unsubscribe = wsClient.subscribe((msg) => {
      if (msg.type === 'TICK_UPDATE' && Array.isArray(msg.quotes)) {
        const quoteMap: Record<string, Quote> = {};
        msg.quotes.forEach((q: Quote) => {
          quoteMap[q.symbol] = q;
        });
        setQuotes((prev) => ({ ...prev, ...quoteMap }));
      } else if (msg.type === 'PORTFOLIO_UPDATE') {
        refreshPortfolio();
        refreshRisk();
        setLastPortfolioUpdate(Date.now());
      } else if (msg.type === 'AI_STATUS') {
        setAiStatus(msg as unknown as AIStatus);
      }
    });

    // Smart periodic poll fallback (60s poll fallback, pauses when tab is hidden)
    const interval = setInterval(() => {
      if (document.hidden) return; // Pause polling when tab is in background to keep CPU cool
      refreshPortfolio();
      refreshQuotes();
      refreshScanner();
      refreshRisk();
      refreshAutoPilot();
    }, 60000);

    // Refresh immediately when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshPortfolio();
        refreshQuotes();
        refreshScanner();
        refreshRisk();
        refreshAutoPilot();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wsClient.disconnect();
    };
  }, [refreshPortfolio, refreshQuotes, refreshScanner, refreshRisk, refreshAutoPilot]);

  const toggleAutoPilot = async (enabled: boolean) => {
    await api.toggleAutoPilot(enabled);
    await refreshAutoPilot();
  };

  const triggerAutoPilotScan = async () => {
    await api.triggerAutoPilotScan();
    await Promise.allSettled([refreshAutoPilot(), refreshPortfolio()]);
  };

  const deployAllCapital = async () => {
    const res = await api.deployAllCapital();
    await Promise.allSettled([refreshPortfolio(), refreshAutoPilot(), refreshRisk(), refreshScanner()]);
    return res;
  };

  const resetCapital = async (capital: number = 500.0) => {
    const updated = await api.resetPortfolio(capital);
    setPortfolio(updated);
    try {
      localStorage.setItem(PORTFOLIO_CACHE_KEY, JSON.stringify(updated));
    } catch (_) {}
    await Promise.allSettled([refreshRisk(), refreshScanner(), refreshAutoPilot()]);
  };

  const depositCapital = async (amount: number, note?: string) => {
    const updated = await api.depositVirtualFunds(amount, note);
    setPortfolio(updated);
    try {
      localStorage.setItem(PORTFOLIO_CACHE_KEY, JSON.stringify(updated));
    } catch (_) {}
    await Promise.allSettled([refreshRisk(), refreshScanner(), refreshAutoPilot()]);
  };

  const toggleKillSwitch = async (activate: boolean) => {
    await api.triggerKillSwitch(activate);
    await Promise.allSettled([refreshRisk(), refreshPortfolio(), refreshAutoPilot()]);
  };

  const placeOrder = async (order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    order_type?: 'MARKET' | 'LIMIT';
    price?: number;
  }) => {
    const res = await api.createOrder(order);
    await refreshPortfolio();
    await refreshRisk();
    await refreshScanner();
    return res;
  };

  return (
    <TradingContext.Provider
      value={{
        portfolio,
        quotes,
        scannerData,
        riskStatus,
        aiStatus,
        isWsConnected,
        isLoading,
        activeTab,
        setActiveTab,
        refreshPortfolio,
        refreshQuotes,
        refreshScanner,
        refreshAutoPilot,
        toggleAutoPilot,
        triggerAutoPilotScan,
        deployAllCapital,
        resetCapital,
        depositCapital,
        toggleKillSwitch,
        lastPortfolioUpdate,
        placeOrder,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) throw new Error('useTrading must be used within a TradingProvider');
  return context;
};
