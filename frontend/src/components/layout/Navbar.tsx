import React, { useState } from 'react';
import {
  Activity,
  Layers,
  LineChart,
  ShieldAlert,
  RotateCcw,
  Radio,
  Sliders,
  TrendingUp,
  User,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';
import { AccountModal } from './AccountModal';

export const Navbar: React.FC = () => {
  const { portfolio, activeTab, setActiveTab, resetCapital, toggleKillSwitch, riskStatus } = useTrading();
  const [showAccount, setShowAccount] = useState(false);

  const isStopped = portfolio?.is_kill_switched || riskStatus?.is_emergency_stopped;

  return (
    <header className="sticky top-0 z-40 bg-[#080B12]/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-blue via-accent-violet to-accent-cyan p-[1px] shadow-glass-glow-blue">
              <div className="w-full h-full bg-[#080B12] rounded-[11px] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent-cyan" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">AutoPilot AI</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Paper
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Automated Quantitative Simulator</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'scanner', label: 'Market Scanner', icon: Radio },
              { id: 'strategies', label: 'Strategy Lab', icon: Layers },
              { id: 'orders', label: 'Paper Orders', icon: LineChart },
              { id: 'backtest', label: 'Backtesting', icon: Sliders },
            ].map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white shadow-sm border border-white/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Controls: Account, Reset Virtual Portfolio & Emergency Kill Switch */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAccount(true)}
              title="Account & Login Details"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/20 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                Account (₹{portfolio?.initial_cash ? portfolio.initial_cash.toFixed(0) : '500'})
              </span>
            </button>

            <button
              onClick={() => {
                const initial = portfolio?.initial_cash || 500.00;
                if (window.confirm(`Reset virtual paper portfolio to initial balance of exactly INR ${initial.toFixed(2)}?`)) {
                  resetCapital(initial);
                }
              }}
              title={`Reset virtual capital to INR ${(portfolio?.initial_cash || 500).toFixed(2)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">
                Reset ₹{portfolio?.initial_cash ? portfolio.initial_cash.toFixed(0) : '500'}
              </span>
            </button>

            {/* Emergency Kill Switch */}
            <button
              onClick={() => toggleKillSwitch(!isStopped)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isStopped
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 shadow-lg shadow-rose-500/20 animate-pulse'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isStopped ? 'HALTED (RESUME)' : 'KILL SWITCH'}</span>
            </button>
          </div>
        </div>
      </div>
      {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}
    </header>
  );
};
