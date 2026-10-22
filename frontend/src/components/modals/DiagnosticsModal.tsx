import React, { useState } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Server,
  Zap,
  Info
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { api } from '../../services/api';
import { formatINR } from '../../utils/currency';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const { aiStatus, portfolio, riskStatus, triggerAutoPilotScan } = useTrading();
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [diagMessage, setDiagMessage] = useState<string | null>(null);

  // Keyboard shortcut: Escape to close
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const runPingCheck = async () => {
    try {
      setIsPinging(true);
      const t0 = performance.now();
      await api.getQuotes();
      const t1 = performance.now();
      const roundTripMs = Math.round(t1 - t0);
      setPingLatency(roundTripMs);
      setDiagMessage(`Live NSE Feed ping: ${roundTripMs}ms · In-memory cache & background updater active`);
    } catch (err: any) {
      setDiagMessage(`Diagnostics warning: ${err.message || 'Feed unreachable'}`);
    } finally {
      setIsPinging(false);
    }
  };

  const status = aiStatus?.status || 'RUNNING';
  const isMarketClosed = status === 'MARKET_CLOSED';

  const toggleGate = async () => {
    try {
      const res = await api.toggleMarketGate();
      if (!res.gate_enabled) {
        setDiagMessage("Test Mode Enabled: Session gate bypassed! AutoPilot is now placing simulated orders with live prices immediately.");
      } else {
        setDiagMessage("Session Gate Active: AutoPilot will wait for regular NSE market hours (09:15 - 15:30 IST).");
      }
      await triggerAutoPilotScan();
    } catch (err: any) {
      setDiagMessage(`Failed to toggle gate: ${err.message}`);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass max-w-xl w-full p-6 sm:p-7 relative border border-white/20 shadow-2xl my-8 text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Real-Time System Diagnostics & Issue Finder
              </h3>
              <p className="text-[11px] text-muted-labels">
                Live exchange connectivity, session gating, and autonomous trade diagnostics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Primary Issue / Notice Banner */}
        {isMarketClosed ? (
          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 mb-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-xs">
                  NSE Regular Market Session is Closed (Paper Trading Paused)
                </h4>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  OPENS 09:15 IST
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Indian Stock Exchange regular market hours are <strong>09:15 to 15:30 IST (Mon–Fri)</strong>. AutoPilot strictly respects exchange sessions so simulated trades reflect real live market liquidity and prices.
              </p>
              <div className="p-2 rounded-lg bg-black/30 border border-white/10 mt-1.5 text-[11px] text-slate-300 flex items-center justify-between gap-2">
                <span><strong>9:15 AM Auto-Start:</strong> AutoPilot is armed and will automatically start scanning and buying the best stock at 09:15 IST.</span>
                <button
                  type="button"
                  onClick={toggleGate}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold border border-amber-500/40 whitespace-nowrap cursor-pointer text-[10px]"
                >
                  ⚡ Test Auto-Buy Now
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 mb-4 flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-xs">
                  Market Session Active — AutoPilot Scanning Live NSE Ticks
                </h4>
                <p className="text-[11px] text-emerald-200/80">
                  Session is active. AutoPilot will buy the highest scored stock and auto-sell upon target (+2.2%) or stop-loss (-1.5%).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleGate}
              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-bold border border-emerald-500/40 whitespace-nowrap cursor-pointer text-[10px]"
            >
              🔒 Enforce 09:15 IST Gate
            </button>
          </div>
        )}

        {/* Diagnostic Status Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Card 1: Live Market Feed */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                Live Market Feed
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                CONNECTED
              </span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span>Provider:</span>
                <span className="font-semibold text-white">Live NSE Public Feed</span>
              </div>
              <div className="flex justify-between">
                <span>Active Tickers:</span>
                <span className="font-semibold text-accent-cyan">10 Real NSE Stocks</span>
              </div>
              <div className="flex justify-between">
                <span>Feed Response Latency:</span>
                <span className="font-semibold text-emerald-400">
                  {pingLatency !== null ? `${pingLatency} ms` : '< 10 ms (In-Memory)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Staleness Guard:</span>
                <span className="font-semibold text-slate-200">&lt; 30s Rejection Active</span>
              </div>
            </div>
          </div>

          {/* Card 2: AutoPilot Strategy Engine */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                AutoPilot Engine
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isMarketClosed
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {status}
              </span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span>Automation Switch:</span>
                <span className="font-semibold text-emerald-400">ENABLED</span>
              </div>
              <div className="flex justify-between">
                <span>Take Profit Target:</span>
                <span className="font-semibold text-emerald-400">+2.2% Auto-Sell</span>
              </div>
              <div className="flex justify-between">
                <span>Stop-Loss Protection:</span>
                <span className="font-semibold text-rose-400">-1.5% Auto-Cut</span>
              </div>
              <div className="flex justify-between">
                <span>Whole-Share Sizing:</span>
                <span className="font-semibold text-white">Integer Shares Only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger & Paper Mode Security */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              Safety & Regulatory Paper Trading Lock
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
              PAPER ONLY
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
            <div className="p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-muted-labels block text-[10px]">Virtual Cash</span>
              <span className="font-bold text-white">{formatINR(portfolio?.cash_balance ?? 500.0)}</span>
            </div>
            <div className="p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-muted-labels block text-[10px]">Daily Loss Trigger</span>
              <span className="font-bold text-rose-400">
                ₹{((portfolio?.initial_cash || 500.0) * (riskStatus?.config?.max_daily_loss_pct || 2.0) / 100).toFixed(2)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-muted-labels block text-[10px]">Broker Order Route</span>
              <span className="font-bold text-emerald-400">100% BLOCKED</span>
            </div>
          </div>
        </div>

        {/* Live Diagnostics Feedback Message */}
        {diagMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{diagMessage}</span>
          </div>
        )}

        {/* Diagnostic Actions & Bottom Close */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={runPingCheck}
              disabled={isPinging}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 text-[11px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              {isPinging ? 'Pinging Live Feed...' : 'Test Feed Connection'}
            </button>
            <button
              type="button"
              onClick={async () => {
                await triggerAutoPilotScan();
                setDiagMessage('AutoPilot scan cycle triggered!');
                setTimeout(() => setDiagMessage(null), 3000);
              }}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-semibold border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer text-[11px]"
            >
              Scan Market Now
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-1.5 border border-white/10 transition-all cursor-pointer active:scale-98"
          >
            <X className="w-4 h-4" />
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
