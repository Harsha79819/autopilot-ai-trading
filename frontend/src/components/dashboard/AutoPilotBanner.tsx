import React, { useState } from 'react';
import {
  Cpu,
  Play,
  Pause,
  Zap,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Target,
  ShieldAlert,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export const AutoPilotBanner: React.FC = () => {
  const { aiStatus, toggleAutoPilot, triggerAutoPilotScan, resetCapital, portfolio } = useTrading();
  const [isScanning, setIsScanning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isEnabled = aiStatus?.autopilot_enabled !== false;
  const statusType = aiStatus?.status || 'INITIALIZING';

  const handleScanNow = async () => {
    try {
      setIsScanning(true);
      await triggerAutoPilotScan();
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setTimeout(() => setIsScanning(false), 600);
    }
  };

  const handleReset = async () => {
    const initial = portfolio?.initial_cash || 500.0;
    if (window.confirm(`Reset virtual portfolio to clean ₹${initial.toFixed(2)} cash and restart AI AutoPilot?`)) {
      try {
        setIsResetting(true);
        await resetCapital(initial);
      } finally {
        setIsResetting(false);
      }
    }
  };

  const getStatusBadge = () => {
    switch (statusType) {
      case 'MARKET_CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Pause className="w-3 h-3" />
            MARKET CLOSED (PAPER PAUSED)
          </span>
        );
      case 'HOLDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            AI POSITION ACTIVE
          </span>
        );
      case 'SCANNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-accent-cyan border border-cyan-500/30">
            <span className="w-2 h-2 rounded-full bg-accent-cyan" />
            AUTONOMOUS SCANNING
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Pause className="w-3 h-3" />
            AI PAUSED
          </span>
        );
      case 'HALTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3 h-3" />
            KILL SWITCH HALTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-accent-blue border border-blue-500/30">
            <Cpu className="w-3 h-3" />
            INITIALIZING
          </span>
        );
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 border border-white/10 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-indigo-950/40 backdrop-blur-xl shadow-2xl">
      {/* Background glow effects */}
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-64 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Column: AI Identity & Live Message */}
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-accent-cyan shadow-inner">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                AutoPilot AI Autonomous Engine
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  PAPER TRADING
                </span>
              </h1>
            </div>
            {getStatusBadge()}
          </div>

          {/* Real-time AI Status Message */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-sm text-slate-200 flex items-start gap-2.5 shadow-inner">
            <Sparkles className="w-4 h-4 text-accent-cyan flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-slate-100">
                {aiStatus?.message || 'AI AutoPilot is continuously monitoring market ticks...'}
              </p>
              {aiStatus?.target_profit && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Target className="w-3 h-3" />
                    Target (+2.2%): ₹{aiStatus.target_profit.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1 text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    <ShieldAlert className="w-3 h-3" />
                    Stop Loss (-1.5%): ₹{aiStatus.stop_loss?.toFixed(2)}
                  </span>
                  <span className="text-slate-400">
                    Auto-sells immediately when target or stop is reached.
                  </span>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            🤖 <strong className="text-slate-300">100% Automated Execution:</strong> Zero manual clicks required. The quantitative engine continuously scans live NSE ticks, evaluates RSI, Trend, Momentum & Regulatory Cost Gates, auto-buys the best affordable whole-share stock, and realizes profits at target (+2.2%).
          </p>
        </div>

        {/* Right Column: Instant Controls */}
        <div className="flex flex-wrap md:flex-col lg:flex-row items-center gap-2.5 justify-end">
          {/* Pause / Resume Toggle */}
          <button
            onClick={() => toggleAutoPilot(!isEnabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border shadow-lg ${
              isEnabled
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {isEnabled ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pause AI
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Resume AI
              </>
            )}
          </button>

          {/* Trigger Scan & Auto-Trade Button */}
          <button
            onClick={handleScanNow}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/30 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            title="Force immediate market evaluation and auto-buy"
          >
            <Zap className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Evaluating...' : 'Scan & Auto-Trade Now'}
          </button>

          {/* Dynamic Reset Button */}
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 shadow-lg transition-all"
            title={`Reset to clean ₹${(portfolio?.initial_cash || 500).toFixed(2)} starting cash`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            Reset to ₹{portfolio?.initial_cash ? portfolio.initial_cash.toFixed(0) : '500'}
          </button>
        </div>
      </div>
    </div>
  );
};
