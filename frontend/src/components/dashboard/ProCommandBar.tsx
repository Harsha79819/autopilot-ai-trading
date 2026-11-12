import React, { useState } from 'react';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  ArrowDownToLine, 
  Globe, 
  Sliders, 
  Sparkles, 
  Mic, 
  Compass, 
  Activity, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatINR, formatPct } from '../../utils/currency';

interface ProCommandBarProps {
  onOpenInvest: () => void;
  onOpenWithdraw: () => void;
  onOpenPortfolio: () => void;
  onOpenDiagnostics: () => void;
  onOpenChat: () => void;
  onOpenVoice: () => void;
  onOpenTour: () => void;
  isExpandedView: boolean;
  onToggleExpandedView: () => void;
}

export const ProCommandBar: React.FC<ProCommandBarProps> = ({
  onOpenInvest,
  onOpenWithdraw,
  onOpenPortfolio,
  onOpenDiagnostics,
  onOpenChat,
  onOpenVoice,
  onOpenTour,
  isExpandedView,
  onToggleExpandedView
}) => {
  const { portfolio, deployAllCapital, refreshPortfolio, aiStatus } = useTrading();
  const { language, toggleLanguage, t } = useLanguage();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployFeedback, setDeployFeedback] = useState<string | null>(null);

  const metrics = portfolio?.metrics;
  const totalVal = metrics?.total_portfolio_value ?? portfolio?.total_portfolio_value ?? 0;
  const cashVal = metrics?.current_cash ?? portfolio?.cash_balance ?? 0;
  const investedVal = metrics?.holdings_value ?? portfolio?.holdings_value ?? Math.max(0, totalVal - cashVal);
  const netPnL = metrics?.net_pnl ?? portfolio?.net_pnl ?? 0;
  const netReturnPct = metrics?.net_return_pct ?? portfolio?.net_return_pct ?? 0;
  const isPositive = netPnL >= 0;
  const isRunning = aiStatus?.status !== 'PAUSED' && aiStatus?.status !== 'HALTED';

  const handleDeployAllCash = async () => {
    try {
      setIsDeploying(true);
      setDeployFeedback(null);
      const res = await deployAllCapital();
      await refreshPortfolio();
      const count = res?.deployed_count ?? res?.result?.deployed_count ?? 0;
      if (count > 0) {
        setDeployFeedback(t(`✅ ${count} షేర్లు కొనుగోలు చేయబడ్డాయి!`, `✅ Deployed into ${count} stocks!`));
      } else {
        setDeployFeedback(t('⚡ క్యాపిటల్ ఇప్పటికే గరిష్టంగా ఉంది', '⚡ Capital already optimal'));
      }
      setTimeout(() => setDeployFeedback(null), 3500);
    } catch (err: any) {
      setDeployFeedback(err?.message || 'Deploy error');
      setTimeout(() => setDeployFeedback(null), 3500);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-2.5 sm:p-3 shadow-xl transition-all">
      {/* Top Strip: Live Status, Portfolio Value, Available Cash, Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        
        {/* Left: Brand + Status Pill + Key Financial Metrics */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white hidden sm:inline">
              AutoPilot AI
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              PAPER TRADING
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* Metric 1: Total Portfolio Value */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">
              {t('పోర్ట్‌ఫోలియో:', 'Portfolio:')}
            </span>
            <span className="text-base sm:text-lg font-bold text-white font-mono tracking-tight">
              {formatINR(totalVal)}
            </span>
            <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{formatPct(netReturnPct)}
            </span>
          </div>

          {/* Metric 2: Available Cash */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">
              {t('నగదు:', 'Cash:')}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-cyan-300 font-mono">
              {formatINR(cashVal)}
            </span>
          </div>

          {/* Metric 3: Invested in Stocks */}
          <div className="hidden sm:flex items-baseline gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">
              {t('షేర్లలో:', 'Invested:')}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-emerald-300 font-mono">
              {formatINR(investedVal)}
            </span>
          </div>
        </div>

        {/* Right: Quick Action Buttons (Add, Withdraw, Deploy, Tour, Voice, AI) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Feedback badge */}
          {deployFeedback && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 animate-fade-in">
              {deployFeedback}
            </span>
          )}

          {/* ⚡ Instant Deploy Idle Cash */}
          <button
            type="button"
            onClick={handleDeployAllCash}
            disabled={isDeploying}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title={t('మిగిలిన క్యాష్‌ను వెంటనే ఉత్తమ Nifty 50 షేర్లలో ఇన్వెస్ట్ చేయండి', 'Immediately deploy available idle cash into top candidate stocks')}
          >
            <Zap className={`w-3.5 h-3.5 ${isDeploying ? 'animate-spin' : ''}`} />
            <span>{isDeploying ? t('ఇన్వెస్ట్ అవుతోంది...', 'Deploying...') : t('⚡ డెప్లాయ్ క్యాష్', '⚡ Deploy Cash')}</span>
          </button>

          {/* + Add Money */}
          <button
            type="button"
            onClick={onOpenInvest}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer active:scale-95"
            title={t('వర్చువల్ క్యాపిటల్ జోడించండి', 'Add simulated virtual capital')}
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('+ డిపాజిట్', '+ Add')}</span>
          </button>

          {/* Withdraw */}
          <button
            type="button"
            onClick={onOpenWithdraw}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-white/10 transition-all cursor-pointer active:scale-95"
            title={t('విత్‌డ్రా చేయండి', 'Simulated withdrawal')}
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('విత్‌డ్రా', 'Withdraw')}</span>
          </button>

          {/* AI Copilot */}
          <button
            type="button"
            onClick={onOpenChat}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 border border-violet-500/30 transition-all cursor-pointer"
            title={t('AI చాట్ అసిస్టెంట్', 'AI Copilot Assistant')}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>AI Bot</span>
          </button>

          {/* Voice */}
          <button
            type="button"
            onClick={onOpenVoice}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-pink-500/15 text-pink-300 hover:bg-pink-500/25 border border-pink-500/30 transition-all cursor-pointer"
            title={t('వాయిస్ మోడ్ ("హే డార్లింగ్")', 'Voice Copilot')}
          >
            <Mic className="w-3.5 h-3.5 text-pink-400" />
            <span>Voice</span>
          </button>

          {/* Language Switch */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
            title="Switch Language"
          >
            <Globe className="w-3 h-3 text-emerald-400" />
            <span>{language === 'en' ? 'తెలుగు' : 'English'}</span>
          </button>

          {/* Toggle Expanded Cards mode */}
          <button
            type="button"
            onClick={onToggleExpandedView}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              isExpandedView 
                ? 'bg-blue-500/20 text-blue-200 border-blue-400/50' 
                : 'bg-slate-800/60 text-slate-400 hover:text-white border-white/10'
            }`}
            title={isExpandedView ? t('కాంపాక్ట్ వ్యూకి మార్చండి', 'Switch to compact view') : t('పెద్ద హీరో కార్డ్స్ చూపించు', 'Show large hero cards')}
          >
            {isExpandedView ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span className="hidden md:inline">{isExpandedView ? t('హీరో దాచు', 'Hide Hero') : t('హీరో కార్డ్', 'Hero Cards')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
