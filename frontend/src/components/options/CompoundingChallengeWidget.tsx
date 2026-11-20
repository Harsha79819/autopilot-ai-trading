import React, { useState, useEffect } from 'react';
import { Trophy, Award, Flame, Target, ChevronRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { ChallengeProgress } from '../../types';

export const CompoundingChallengeWidget: React.FC = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<ChallengeProgress | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchChallenge = async () => {
    try {
      const res = await api.getChallengeProgress();
      setData(res);
    } catch (err) {
      console.error('Failed to fetch compounding challenge:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenge();
    const interval = setInterval(fetchChallenge, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 animate-pulse">
        <div className="h-5 bg-slate-800 rounded w-1/4 mb-3"></div>
        <div className="h-20 bg-slate-800 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-amber-500/30 hover:border-amber-500/50 transition-all rounded-2xl p-5 shadow-xl backdrop-blur-sm relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl text-slate-950 shadow-md shadow-amber-500/20">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                {t('30-రోజుల ₹5,000 కాంపౌండింగ్ ఛాలెంజ్', '30-Day ₹5k Capital Compounding Challenge')}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Goal: 3x
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {t('టాప్ 7% ఇన్వెస్టర్ మైండ్‌సెట్‌తో క్రమశిక్షణతో కూడిన వృద్ధి', 'Discipline milestone journey to join the elite SEBI Top 7%')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-medium">
            {t(`డే ${data.days_active} / 30`, `Day ${data.days_active} of 30`)}
          </span>
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
            {data.roi_pct >= 0 ? `+${data.roi_pct}%` : `${data.roi_pct}%`}
          </span>
        </div>
      </div>

      {/* Progress Bar & Value Overview */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">
              {t('ప్రస్తుత క్యాపిటల్ (ఈక్విటీ)', 'Current Options Capital')}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-100">
                ₹{data.current_equity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-500">
                / ₹{data.target_capital.toLocaleString('en-IN')} {t('లక్ష్యం', 'Target')}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-amber-400 font-mono">
              {data.progress_pct}% {t('పూర్తయింది', 'Reached')}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {data.total_trades} {t('ట్రేడ్స్', 'trades')} • {data.win_rate_pct}% {t('విన్ రేట్', 'win rate')}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
          <div
            className="bg-gradient-to-r from-amber-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm shadow-amber-500/40"
            style={{ width: `${Math.max(data.progress_pct, 4)}%` }}
          />
        </div>
      </div>

      {/* 4 Stages Ladder */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {data.stages.map((stg) => (
          <div
            key={stg.level}
            className={`p-3 rounded-xl border transition-all ${
              stg.unlocked
                ? 'bg-indigo-950/30 border-indigo-500/40 text-slate-200'
                : 'bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Stage {stg.level}
              </span>
              {stg.unlocked ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <span className="text-[10px] font-mono text-slate-500">🔒</span>
              )}
            </div>
            <div className="text-xs font-bold font-mono text-amber-300">
              {stg.target}
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
              {stg.name}
            </p>
          </div>
        ))}
      </div>

      {/* Unlocked Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          {t('క్రమశిక్షణ బ్యాడ్జీలు:', 'Discipline Badges:')}
        </span>
        {data.badges.map((b) => (
          <div
            key={b.id}
            title={b.desc}
            className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
              b.earned
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-600 grayscale'
            }`}
          >
            <span>{b.icon}</span>
            <span className="font-medium text-[11px]">{b.name}</span>
          </div>
        ))}
      </div>

      {/* Daily Compounding Wisdom */}
      <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2">
        <span className="text-amber-400 text-sm">💡</span>
        <div className="leading-relaxed">
          <span className="font-semibold text-amber-400 mr-1.5">
            {t('ఈ రోజు కాంపౌండింగ్ సూత్రం:', 'Today’s Compounding Rule:')}
          </span>
          {t(data.daily_advice_telugu, data.daily_advice_en)}
        </div>
      </div>
    </div>
  );
};
