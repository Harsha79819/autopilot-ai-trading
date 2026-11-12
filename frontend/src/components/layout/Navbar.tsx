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
  Compass,
  Globe,
  Sparkles
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatINR } from '../../utils/currency';
import { AccountModal } from './AccountModal';

interface NavbarProps {
  onOpenTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenTour }) => {
  const { portfolio, activeTab, setActiveTab, resetCapital, toggleKillSwitch, riskStatus } = useTrading();
  const { language, toggleLanguage, t } = useLanguage();
  const [showAccount, setShowAccount] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isStopped = portfolio?.is_kill_switched || riskStatus?.is_emergency_stopped;

  const CORE_HUBS = [
    { 
      id: 'dashboard', 
      labelTe: 'ట్రేడింగ్ డెస్క్', 
      labelEn: 'Trading Desk', 
      icon: Activity,
      subIds: ['dashboard', 'orders', 'portfolio'] 
    },
    { 
      id: 'ai-adviser', 
      labelTe: 'AI కోపైలట్', 
      labelEn: 'AI Copilot', 
      icon: BrainCircuit,
      subIds: ['ai-adviser'] 
    },
    { 
      id: 'markets', 
      labelTe: 'మార్కెట్స్ & స్కానర్', 
      labelEn: 'Markets & Scanner', 
      icon: TrendingUp,
      subIds: ['markets', 'watchlist', 'scanner', 'research'] 
    },
    { 
      id: 'risk-centre', 
      labelTe: 'రిస్క్ & రిపోర్ట్స్', 
      labelEn: 'Risk & Reports', 
      icon: ShieldAlert,
      subIds: ['risk-centre', 'reports', 'strategies', 'backtest'] 
    },
    { 
      id: 'orderblock', 
      labelTe: 'ఆర్డర్ బ్లాక్స్', 
      labelEn: 'Order Blocks', 
      icon: Layers,
      subIds: ['orderblock'] 
    },
    { 
      id: 'ai-learning', 
      labelTe: 'AI లెర్నింగ్', 
      labelEn: 'AI Learning', 
      icon: Sparkles,
      subIds: ['ai-learning'] 
    },
    { 
      id: 'planner', 
      labelTe: 'టూల్స్ & ప్లానర్', 
      labelEn: 'Tools & Planner', 
      icon: Sliders,
      subIds: ['planner', 'alerts', 'documents', 'settings'] 
    },
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

          {/* Desktop Navigation Tabs - Consolidated 5 Core Hubs */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 bg-white/[0.02] p-1 xl:p-1.5 rounded-xl border border-white/[0.06] overflow-x-auto no-scrollbar max-w-[55vw]">
            {CORE_HUBS.map(({ id, labelTe, labelEn, icon: Icon, subIds }) => {
              const isActive = activeTab === id || subIds.includes(activeTab);
              return (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    setShowMoreMenu(false);
                  }}
                  className={`flex items-center gap-1 xl:gap-1.5 px-2 xl:px-3 py-1.5 rounded-lg text-[11px] xl:text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 shadow-sm border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t(labelTe, labelEn)}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Account, Capital & Emergency Control */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Switcher: Telugu ⇄ English */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-850 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all cursor-pointer shadow-sm"
              title={t('భాషను మార్చుకోండి (తెలుగు ⇄ English)', 'Switch Language (English ⇄ Telugu)')}
            >
              <Globe className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="font-mono text-[11px] font-bold">{language === 'te' ? 'తెలుగు' : 'EN'}</span>
            </button>

            {/* Guided Tour Launcher */}
            {onOpenTour && (
              <button
                onClick={onOpenTour}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer shadow-sm"
                title={t('గైడెడ్ టూర్ ప్రారంభించు', 'Take Guided Tour')}
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{t('గైడ్ (ఫీచర్స్)', 'Guide Tour')}</span>
              </button>
            )}

            <button
              onClick={() => setShowAccount(true)}
              title="Account & Balance"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/20 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-bold">
                {formatINR(portfolio?.cash_balance ?? 0)}
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
