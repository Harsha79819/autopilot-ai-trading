import React from 'react';
import { TrendingUp, TrendingDown, Activity, Anchor, BarChart2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { PCRMaxPainData } from '../../types';

interface PCRMaxPainBarProps {
  data: PCRMaxPainData | null;
  loading?: boolean;
}

export const PCRMaxPainBar: React.FC<PCRMaxPainBarProps> = ({ data, loading }) => {
  const { t } = useLanguage();

  if (loading || !data) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-slate-800 rounded w-full"></div>
      </div>
    );
  }

  const isBullish = data.pcr >= 1.15;
  const isBearish = data.pcr <= 0.80;
  const sentimentColor = isBullish
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : isBearish
    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
    : 'text-amber-400 bg-amber-500/10 border-amber-500/30';

  const diffFromSpot = Math.round(data.max_pain_strike - data.spot_price);
  const diffSign = diffFromSpot > 0 ? `+${diffFromSpot}` : `${diffFromSpot}`;

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 transition-all rounded-2xl p-5 shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                {t('ఇన్స్టిట్యూషనల్ PCR & మ్యాక్స్ పెయిన్ గేజ్', 'Institutional PCR & Max Pain Gauge')}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Smart Money
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {t(
                `${data.underlying} ఆప్షన్ రైటర్స్ సెంటిమెంట్ మరియు పిన్నింగ్ లెవల్`,
                `${data.underlying} institutional writer sentiment and strike magnet`
              )}
            </p>
          </div>
        </div>

        {/* Sentiment Badge */}
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto ${sentimentColor}`}>
          {isBullish ? <TrendingUp className="w-3.5 h-3.5" /> : isBearish ? <TrendingDown className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
          <span>
            {isBullish
              ? t('బుల్లిష్ (పుట్ రైటింగ్)', 'BULLISH (Put Writing Floor)')
              : isBearish
              ? t('బేరిష్ (కాల్ రైటింగ్)', 'BEARISH (Call Writing Ceiling)')
              : t('పరిమిత శ్రేణి / న్యూట్రల్', 'RANGEBOUND / Neutral')}
          </span>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* PCR Ratio */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            {t('పుట్-కాల్ రేషియో (PCR)', 'Put-Call Ratio (PCR)')}
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold font-mono ${isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-amber-400'}`}>
              {data.pcr.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500">
              {data.pcr >= 1.0 ? '> 1.0 (Puts > Calls)' : '< 1.0 (Calls > Puts)'}
            </span>
          </div>
          {/* PCR Visual Bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden flex">
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(Math.max((1 - data.pcr / 2) * 100, 15), 85)}%` }}
              title="Call Resistance"
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(Math.max((data.pcr / 2) * 100, 15), 85)}%` }}
              title="Put Support"
            />
          </div>
        </div>

        {/* Institutional Max Pain Strike */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            {t('మ్యాక్స్ పెయిన్ లెవల్', 'Max Pain Strike')}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-cyan-400">
              ₹{data.max_pain_strike.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              ({diffSign} pts)
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {t('రైటర్స్ కనిష్ట నష్ట స్థాయి', 'Strike with lowest writer loss')}
          </p>
        </div>

        {/* Total Call OI */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            {t('మొత్తం కాల్ OI (రెసిస్టెన్స్)', 'Total Call OI (Resistance)')}
          </span>
          <span className="text-lg font-bold font-mono text-rose-400">
            {(data.total_ce_oi / 1000).toFixed(0)}k
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {t('పైకి వెళ్లకుండా అడ్డుకట్ట', 'Overhead ceiling wall')}
          </span>
        </div>

        {/* Total Put OI */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            {t('మొత్తం పుట్ OI (సపోర్ట్)', 'Total Put OI (Support)')}
          </span>
          <span className="text-lg font-bold font-mono text-emerald-400">
            {(data.total_pe_oi / 1000).toFixed(0)}k
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {t('కింద పడకుండా రక్షణ గోడ', 'Downside safety cushion')}
          </span>
        </div>
      </div>

      {/* Pain Levels Visual Strike Strip */}
      <div className="bg-slate-950/40 border border-slate-800/40 rounded-xl p-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
          <span className="font-medium flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
            {t('స్ట్రైక్ వైజ్ రైటర్ లాస్ డిస్ట్రిబ్యూషన్ (కనిష్ట స్థాయి = మ్యాక్స్ పెయిన్)', 'Strike Loss Distribution (Lowest Loss = Magnet)')}
          </span>
          <span className="font-mono text-slate-500">
            Spot: ₹{data.spot_price.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
          {data.pain_levels.map((lvl) => {
            const isSpotNear = Math.abs(lvl.strike - data.spot_price) <= 25;
            return (
              <div
                key={lvl.strike}
                className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                  lvl.is_max_pain
                    ? 'bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 font-bold shadow-md shadow-cyan-500/20 scale-105'
                    : isSpotNear
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-[10px] font-mono leading-none mb-1">
                  {lvl.strike}
                </div>
                <div className="text-[9px] font-mono leading-none opacity-80">
                  {lvl.is_max_pain ? '🎯 PAIN' : `₹${lvl.total_loss_cr}Cr`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Interpretation Footer */}
      <div className="mt-3 text-xs bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-2.5 text-indigo-300 flex items-start gap-2">
        <span className="text-sm">💡</span>
        <span className="leading-relaxed">
          {t(data.ai_interpretation_telugu, data.ai_interpretation)}
        </span>
      </div>
    </div>
  );
};
