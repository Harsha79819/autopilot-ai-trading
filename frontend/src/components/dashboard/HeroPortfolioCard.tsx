import React, { useState } from 'react';
import { Zap, TrendingUp, ShieldAlert, Sparkles, PieChart, CheckCircle2 } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { formatINR, formatPct } from '../../utils/currency';
import { useLanguage } from '../../context/LanguageContext';

export const HeroPortfolioCard: React.FC = () => {
  const { portfolio, deployAllCapital, refreshPortfolio } = useTrading();
  const { t } = useLanguage();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployFeedback, setDeployFeedback] = useState<string | null>(null);

  if (!portfolio) {
    return (
      <div className="liquid-glass p-6 h-36 animate-pulse flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading portfolio ledger...</span>
      </div>
    );
  }

  const { metrics } = portfolio;
  const netPnL = metrics.net_pnl;
  const netReturnPct = metrics.net_return_pct;
  const isPositive = netPnL >= 0;

  // Capital allocation breakdown
  const totalVal = Math.max(metrics.total_portfolio_value, 1.0);
  const investedAmount = Math.max(0, metrics.total_portfolio_value - metrics.current_cash);
  const investedPct = Math.min(100, Math.max(0, (investedAmount / totalVal) * 100));
  const cashPct = Math.max(0, 100 - investedPct);

  // Win rate display: based strictly on closed round-trip trades
  const winRateText =
    metrics.total_trades_count > 0
      ? `${metrics.win_rate_pct.toFixed(0)}% (${metrics.winning_trades_count}/${metrics.total_trades_count})`
      : '0% (0 closed)';

  const handleDeployAllCash = async () => {
    try {
      setIsDeploying(true);
      setDeployFeedback(null);
      const res = await deployAllCapital();
      await refreshPortfolio();
      const count = res?.deployed_count ?? res?.result?.deployed_count ?? 0;
      if (count > 0) {
        setDeployFeedback(t(`✅ ₹ నగదుతో ${count} షేర్లు విజయవంతంగా కొనుగోలు చేయబడ్డాయి!`, `✅ Deployed idle cash into ${count} top candidate stocks!`));
      } else {
        setDeployFeedback(t('⚡ క్యాపిటల్ ఇప్పటికే గరిష్టంగా ఇన్వెస్ట్ చేయబడింది.', '⚡ Capital is already optimal. Monitoring open positions.'));
      }
      setTimeout(() => setDeployFeedback(null), 4000);
    } catch (err: any) {
      setDeployFeedback(err?.message || 'Deployment error');
      setTimeout(() => setDeployFeedback(null), 4000);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="liquid-glass hero-card p-4 sm:p-5.5 relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
      {/* Diagonal slow sheen sweep */}
      <div className="hero-sheen" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col gap-4">
        {/* Top Row: Portfolio Title + Total Value + Quick Deploy Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t('మొత్తం పోర్ట్‌ఫోలియో విలువ', 'Total Portfolio Value')}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Live Ledger
              </span>
            </div>

            <div className="flex items-baseline gap-3 mt-0.5">
              <div className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight text-white leading-tight">
                {formatINR(metrics.total_portfolio_value)}
              </div>

              <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span>
                  {isPositive ? '+' : ''}
                  {formatINR(netPnL)} {t('నికర లాభం', 'net')}
                </span>
                <span>·</span>
                <span>{formatPct(netReturnPct)}</span>
              </div>
            </div>
          </div>

          {/* Action Trigger: Deploy Remaining Cash */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDeployAllCash}
              disabled={isDeploying}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border border-cyan-400/30 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Deploy remaining idle cash into top Nifty 50 stocks"
            >
              <Zap className={`w-3.5 h-3.5 text-cyan-300 ${isDeploying ? 'animate-spin' : ''}`} />
              <span>
                {isDeploying
                  ? t('ఇన్వెస్ట్ అవుతోంది...', 'Deploying Cash...')
                  : t('⚡ మిగిలిన నగదు మొత్తం ఇన్వెస్ట్ చేయి', '⚡ Deploy All Idle Cash')}
              </span>
            </button>
          </div>
        </div>

        {/* Feedback Alert if triggered */}
        {deployFeedback && (
          <div className="text-xs px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{deployFeedback}</span>
          </div>
        )}

        {/* Capital Allocation Bar: Active Holdings vs Cash Reserve */}
        <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium">
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{t('షేర్లలో పెట్టుబడి', 'Invested in Shares')}: {formatINR(investedAmount)} ({investedPct.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>{t('మిగిలిన నగదు', 'Available Cash')}: {formatINR(metrics.current_cash)} ({cashPct.toFixed(0)}%)</span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${investedPct}%` }}
              title={`Invested: ${investedPct.toFixed(1)}%`}
            />
            <div
              className="h-full bg-cyan-500/60 transition-all duration-500"
              style={{ width: `${cashPct}%` }}
              title={`Available Cash: ${cashPct.toFixed(1)}%`}
            />
          </div>
        </div>

        {/* Compact KPI Strip (Unified Desktop & Mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[11px] font-medium text-slate-400">{t('ప్రారంభ మూలధనం', 'Starting Capital')}</div>
            <div className="text-sm font-bold text-white mt-0.5">{formatINR(metrics.initial_cash)}</div>
          </div>

          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[11px] font-medium text-slate-400">{t('అందుబాటు నగదు', 'Available Cash')}</div>
            <div className="text-sm font-bold text-cyan-300 mt-0.5">{formatINR(metrics.current_cash)}</div>
          </div>

          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[11px] font-medium text-slate-400">{t('గరిష్ట డ్రాడౌన్', 'Max Drawdown')}</div>
            <div className="text-sm font-bold text-amber-300 mt-0.5">{metrics.max_drawdown_pct.toFixed(1)}%</div>
          </div>

          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[11px] font-medium text-slate-400">{t('గెలుపు రేటు (ముగిసినవి)', 'Win Rate (Closed)')}</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{winRateText}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
