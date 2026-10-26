import React, { useState } from 'react';
import {
  Settings,
  Globe,
  ShieldCheck,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Lock,
  Cpu
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';

export const SettingsView: React.FC = () => {
  const { portfolio, resetCapital } = useTrading();
  const [language, setLanguage] = useState<'EN' | 'TE'>('EN');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-800 text-cyan-400 border border-white/10">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Platform Settings & Preferences
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              UI language, risk guardrails, simulated capital reset, and architectural security policies
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Language Selection */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Default Advisory Language</h3>
              <p className="text-xs text-slate-400">Select language for AI copilot insights and market commentary</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage('EN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                language === 'EN'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 border-white/5'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('TE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                language === 'TE'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 border-white/5'
              }`}
            >
              తెలుగు (Telugu)
            </button>
          </div>
        </div>

        {/* Safety & Execution Mode */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Safety Mode: Strict Paper Trading Only</h3>
              <p className="text-xs text-slate-400">Real money routing is permanently blocked in this software version</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Stop-Loss Target</span>
              <span className="font-bold text-slate-200">-1.5% Strict</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Take-Profit Target</span>
              <span className="font-bold text-emerald-400">+3.0% (1:2 RR)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Risk Per Trade</span>
              <span className="font-bold text-cyan-400">1.5% Van Tharp</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Max Position Cap</span>
              <span className="font-bold text-purple-400">20.0% Allocation</span>
            </div>
          </div>
        </div>

        {/* Reset Capital Option */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Reset Virtual Paper Capital</h3>
            <p className="text-xs text-slate-400">
              Clear paper trades and reset ledger balance to starting cash ({formatINR(portfolio?.initial_cash || 500)})
            </p>
          </div>
          <button
            onClick={() => {
              const initial = portfolio?.initial_cash || 500.00;
              if (window.confirm(`Reset virtual portfolio to initial cash of INR ${initial.toFixed(2)}?`)) {
                resetCapital(initial);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Balance</span>
          </button>
        </div>
      </div>
    </div>
  );
};
