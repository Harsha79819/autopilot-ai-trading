import React from 'react';
import { Activity, Sparkles, Mic } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

interface HeaderBarProps {
  onOpenDiagnostics?: () => void;
  onOpenChat?: () => void;
  onOpenVoice?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenDiagnostics, onOpenChat, onOpenVoice }) => {
  const { aiStatus, toggleAutoPilot } = useTrading();
  const isEnabled = aiStatus?.autopilot_enabled !== false;
  const status = aiStatus?.status || 'RUNNING';

  const isRunning = isEnabled && status !== 'PAUSED' && status !== 'HALTED';

  return (
    <header className="w-full mb-6">
      {/* Desktop Header */}
      <div className="hidden sm:flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">AutoPilot AI</span>
        </div>

        {/* Badges and Automation status */}
        <div className="flex items-center gap-2.5">
          {/* Voice Mode Button */}
          {onOpenVoice && (
            <button
              type="button"
              onClick={onOpenVoice}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-pink-500/40 text-pink-200 bg-gradient-to-r from-pink-950/50 via-purple-950/50 to-indigo-950/50 hover:from-pink-900/60 hover:to-indigo-900/60 transition-all cursor-pointer shadow-lg shadow-pink-950/30 active:scale-95"
              title="Voice Mode (Say 'Hey Darling')"
            >
              <Mic className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              <span>Voice (Hey Darling)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenChat}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border border-violet-500/40 text-violet-200 bg-gradient-to-r from-violet-950/50 to-indigo-950/50 hover:from-violet-900/60 hover:to-indigo-900/60 transition-all cursor-pointer shadow-lg shadow-violet-950/30 active:scale-95"
            title="Chat with AutoPilot AI Copilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>AI Copilot (చాట్ బాట్)</span>
          </button>

          <span className="px-3.5 py-1 rounded-full text-xs font-semibold tracking-wide border border-violet-500/40 text-violet-300 bg-violet-950/30">
            PAPER TRADING — VIRTUAL MONEY
          </span>

          <button
            type="button"
            onClick={onOpenDiagnostics}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold tracking-wide border cursor-pointer transition-all hover:scale-105 ${
              status === 'MARKET_CLOSED'
                ? 'border-amber-500/40 text-amber-300 bg-amber-950/30 hover:bg-amber-900/40'
                : 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40'
            }`}
            title="Click to view real-time diagnostics"
          >
            {status === 'MARKET_CLOSED' ? 'MARKET CLOSED (PAPER PAUSED)' : 'REAL FEED (PAPER EXECUTION)'}
          </button>

          <button
            type="button"
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-cyan-500/40 text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/40 transition-all cursor-pointer"
            title="Real-time system diagnostics and issue finder"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Diagnostics
          </button>

          <button
            onClick={() => toggleAutoPilot(!isEnabled)}
            className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 transition-all cursor-pointer"
            title="Click to toggle automation"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning
                  ? 'bg-emerald-400 animate-pulse'
                  : status === 'PAUSED'
                  ? 'bg-amber-400'
                  : status === 'MARKET_CLOSED'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span>
              {isRunning
                ? 'Automation running'
                : status === 'PAUSED'
                ? 'Automation paused'
                : status === 'MARKET_CLOSED'
                ? 'Market closed'
                : 'Emergency halted'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Header (matching screenshot media_1792471364220.png) */}
      <div className="flex sm:hidden flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">AutoPilot AI</span>
          </div>

          <button
            onClick={() => toggleAutoPilot(!isEnabled)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-white/10 bg-slate-900/60 text-slate-200"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{isRunning ? 'Running' : status === 'MARKET_CLOSED' ? 'Closed' : 'Paused'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {onOpenVoice && (
            <button
              type="button"
              onClick={onOpenVoice}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-pink-500/40 text-pink-200 bg-pink-950/40 whitespace-nowrap cursor-pointer active:scale-95"
              title="Voice Mode (Hey Darling)"
            >
              <Mic className="w-3 h-3 text-pink-400 animate-pulse" />
              Voice
            </button>
          )}
          <button
            type="button"
            onClick={onOpenChat}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-violet-500/40 text-violet-200 bg-violet-950/40 whitespace-nowrap cursor-pointer active:scale-95"
            title="Chat with AutoPilot AI Copilot"
          >
            <Sparkles className="w-3 h-3 text-violet-400 animate-pulse" />
            AI Bot
          </button>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-violet-500/40 text-violet-300 bg-violet-950/30 whitespace-nowrap">
            PAPER — VIRTUAL MONEY
          </span>
          <button
            type="button"
            onClick={onOpenDiagnostics}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap cursor-pointer ${
              status === 'MARKET_CLOSED'
                ? 'border-amber-500/40 text-amber-300 bg-amber-950/30'
                : 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30'
            }`}
          >
            {status === 'MARKET_CLOSED' ? 'MARKET CLOSED' : 'REAL FEED'}
          </button>
          <button
            type="button"
            onClick={onOpenDiagnostics}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-cyan-500/40 text-cyan-300 bg-cyan-950/30 whitespace-nowrap cursor-pointer flex items-center gap-1"
          >
            <Activity className="w-3 h-3" />
            Diagnostics
          </button>
        </div>
      </div>
    </header>
  );
};
