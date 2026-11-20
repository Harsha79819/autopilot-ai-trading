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
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatINR } from '../../utils/currency';
import { AccountModal } from './AccountModal';
import { WhatsAppSettingsModal } from '../options/WhatsAppSettingsModal';

interface NavbarProps {
  onOpenTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenTour }) => {
  const { portfolio, activeTab, setActiveTab, resetCapital, toggleKillSwitch, riskStatus } = useTrading();
  const { language, toggleLanguage, t } = useLanguage();
  const [showAccount, setShowAccount] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isStopped = portfolio?.is_kill_switched || riskStatus?.is_emergency_stopped;

  const MORE_HUBS = [
    { id: 'ai-adviser', labelTe: 'AI కోపైలట్', labelEn: 'AI Copilot', icon: BrainCircuit },
    { id: 'markets', labelTe: 'మార్కెట్స్ & స్కానర్', labelEn: 'Markets & Scanner', icon: TrendingUp },
    { id: 'risk-centre', labelTe: 'రిస్క్ & రిపోర్ట్స్', labelEn: 'Risk & Reports', icon: ShieldAlert },
    { id: 'orderblock', labelTe: 'ఆర్డర్ బ్లాక్స్', labelEn: 'Order Blocks', icon: Layers },
    { id: 'ai-learning', labelTe: 'AI లెర్నింగ్', labelEn: 'AI Learning', icon: Sparkles },
    { id: 'planner', labelTe: 'టూల్స్ & ప్లానర్', labelEn: 'Tools & Planner', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#080B12]/95 backdrop-blur-md border-b border-white/[0.08]">
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

          {/* Desktop Navigation: 2 Master Hubs (1. Main Trading | 2. Options Trading) */}
          <nav className="hidden md:flex items-center gap-2 bg-slate-900/90 p-1 rounded-xl border border-white/10 shadow-lg">
            {/* Master Tab 1: Main Equity Trading */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                setShowMoreMenu(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-500/20 border border-cyan-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>1. {t('మెయిన్ ట్రేడింగ్', 'Main Trading')}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeTab === 'dashboard' ? 'bg-white/20 text-white font-bold' : 'bg-slate-800 text-slate-400'
              }`}>
                {t('ఈక్విటీ', 'Equity')}
              </span>
            </button>

            {/* Master Tab 2: Options F&O Trading */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('options');
                setShowMoreMenu(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'options'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/20 border border-amber-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-300" />
              <span>2. {t('ఆప్షన్స్ ట్రేడింగ్', 'Options Trading')}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeTab === 'options' ? 'bg-white/20 text-white font-bold' : 'bg-amber-500/10 text-amber-300'
              }`}>
                {t('F&O నిఫ్టీ', 'F&O')}
              </span>
            </button>

            {/* More Tools Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  MORE_HUBS.some(h => h.id === activeTab)
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{t('మరిన్ని టూల్స్', 'More Tools')}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
              </button>

              {showMoreMenu && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5">
                  {MORE_HUBS.map(({ id, labelTe, labelEn, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setActiveTab(id);
                        setShowMoreMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                        activeTab === id
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{t(labelTe, labelEn)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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

            {/* Global WhatsApp Live Alerts Engine */}
            <button
              onClick={() => setShowWhatsApp(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-all cursor-pointer shadow-sm"
              title={t('మొబైల్ వాట్సాప్ రియల్-టైమ్ అలర్ట్స్ (అన్ని ట్రేడ్లు)', 'Mobile WhatsApp Real-Time Alerts (All Trades)')}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-bold">{t('వాట్సాప్', 'WhatsApp')}</span>
            </button>

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
      <WhatsAppSettingsModal isOpen={showWhatsApp} onClose={() => setShowWhatsApp(false)} />
    </header>
  );
};
