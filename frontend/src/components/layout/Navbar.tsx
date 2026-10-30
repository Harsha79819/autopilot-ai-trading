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
  BrainCircuit,
  Star,
  Briefcase,
  PieChart,
  Newspaper,
  Bell,
  FileText,
  Receipt,
  Settings,
  ChevronDown,
  Compass
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';
import { AccountModal } from './AccountModal';

interface NavbarProps {
  onOpenTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenTour }) => {
  const { portfolio, activeTab, setActiveTab, resetCapital, toggleKillSwitch, riskStatus } = useTrading();
  const [showAccount, setShowAccount] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isStopped = portfolio?.is_kill_switched || riskStatus?.is_emergency_stopped;

  const PRIMARY_NAV = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'ai-adviser', label: 'AI Adviser', icon: BrainCircuit },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'watchlist', label: 'Watchlist', icon: Star },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'orders', label: 'Paper Trading', icon: LineChart },
    { id: 'risk-centre', label: 'Risk Centre', icon: ShieldAlert },
    { id: 'research', label: 'Research', icon: Newspaper },
    { id: 'planner', label: 'Planner', icon: PieChart },
  ];

  const SECONDARY_NAV = [
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'reports', label: 'Reports', icon: Receipt },
    { id: 'scanner', label: 'Scanner', icon: Radio },
    { id: 'strategies', label: 'Strategies', icon: Layers },
    { id: 'backtest', label: 'Backtesting', icon: Sliders },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#080B12]/90 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveTab('dashboard')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent-blue via-accent-violet to-accent-cyan p-[1px] shadow-glass-glow-blue">
              <div className="w-full h-full bg-[#080B12] rounded-[11px] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-accent-cyan" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">AutoPilot</span>
                <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  AI Finance
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/[0.02] p-1 rounded-xl border border-white/[0.06] overflow-x-auto scrollbar-none">
            {PRIMARY_NAV.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    setShowMoreMenu(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 shadow-sm border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}

            {/* Dropdown for More / Intelligence Tools */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  SECONDARY_NAV.some((n) => n.id === activeTab)
                    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <span>Tools</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-slate-900 border border-white/10 shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5">
                  {SECONDARY_NAV.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setActiveTab(id);
                        setShowMoreMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                        activeTab === id
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right Controls: Account, Capital & Emergency Control */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Guided Tour Launcher */}
            {onOpenTour && (
              <button
                onClick={onOpenTour}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer shadow-sm"
                title="Open Interactive Feature Walkthrough Tour (గైడెడ్ టూర్)"
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Guide / ఫీచర్స్</span>
              </button>
            )}

            <button
              onClick={() => setShowAccount(true)}
              title="Account & Balance"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/20 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-bold">
                {formatINR(portfolio?.cash_balance ?? 1604)}
              </span>
            </button>

            {/* Kill switch button */}
            <button
              onClick={() => toggleKillSwitch(!isStopped)}
              title={isStopped ? 'Resume Paper Trading' : 'Emergency Stop Paper Trading'}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isStopped
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 animate-pulse'
                  : 'bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-rose-950/20 border border-white/10'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isStopped ? 'HALTED' : 'Stop'}</span>
            </button>
          </div>
        </div>
      </div>

      {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}
    </header>
  );
};
