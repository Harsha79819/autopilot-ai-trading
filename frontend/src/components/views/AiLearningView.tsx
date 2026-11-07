import React, { useState, useEffect } from 'react';
import { BrainCircuit, Sparkles, ShieldAlert, Award, AlertTriangle, ArrowRight, Activity, BookOpen, Layers, RefreshCw, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { useTrading } from '../../context/TradingContext';
import { useLanguage } from '../../context/LanguageContext';
import { AiDailyLearningCard } from '../dashboard/AiDailyLearningCard';

export const AiLearningView: React.FC = () => {
  const { t } = useLanguage();
  const { portfolio } = useTrading();
  const [learningState, setLearningState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLearningState = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/autopilot/learning-state', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setLearningState(data);
      }
    } catch (e) {
      console.error('Failed to load learning state:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearningState();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-violet-500/25">
              <BrainCircuit className="w-6 h-6 animate-pulse" />
            </span>
            {t('AI లెర్నింగ్ మెకానిజం & సెల్ఫ్-కరెక్షన్ ఇంజిన్', 'AI Learning Mechanism & Self-Correction Engine')}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {t(
              'గత ట్రేడ్లలో జరిగిన తప్పుల నుండి AI ఎలా నేర్చుకుంటుంది? రిస్క్ తగ్గించి లాభాల ప్రాబబిలిటీని ఎలా పెంచుతుంది?',
              'How the AI learns from past trade outcomes, penalizes errors, and boosts high-probability patterns.'
            )}
          </p>
        </div>
        <button
          onClick={fetchLearningState}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-violet-300 flex items-center gap-2 cursor-pointer transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('రిఫ్రెష్ డేటా', 'Refresh State')}
        </button>
      </div>

      {/* 4-Stage Learning Cycle Visualizer */}
      <GlassCard className="p-6 rounded-2xl border border-violet-500/20 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-bold text-white">
            {t('AI ఎలా నేర్చుకుంటుంది? (4-దశల సెల్ఫ్-లెర్నింగ్ సైకిల్)', 'How AI Learns: 4-Stage Self-Correction Loop')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 relative">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs font-mono border border-cyan-500/30">
              01
            </div>
            <h3 className="font-bold text-white text-sm">
              {t('ట్రేడ్ అబ్జర్వేషన్', 'Trade Observation')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t(
                'ప్రతి ముగిసిన ట్రేడ్ యొక్క ఎంట్రీ, ఎగ్జిట్ ప్రైస్, హోల్డింగ్ సమయం, లాభం/నష్టం మరియు గ్యాప్ డెల్టాను ట్రేడింగ్ జర్నల్‌లో రికార్డ్ చేస్తుంది.',
                'Captures exact entry, exit, holding seconds, realized P&L, slippage, and gap-deltas into the immutable Trading Journal.'
              )}
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 relative">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold text-xs font-mono border border-violet-500/30">
              02
            </div>
            <h3 className="font-bold text-white text-sm">
              {t('పోస్ట్-మార్టం క్రిటిక్', 'Post-Mortem Critique')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t(
                'నష్టం ఎందుకు వచ్చింది? మార్కెట్ గ్యాప్ డౌన్ వల్లా? సెక్టార్ వీక్‌నెస్ వల్లా? లేదా న్యూస్ హెడ్‌విండ్స్ వల్లా? అని విశ్లేషిస్తుంది.',
                'Critiques root cause of drawdown: whether driven by opening gap, sector-wide distribution, or breaking news headwind.'
              )}
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 relative">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs font-mono border border-rose-500/30">
              03
            </div>
            <h3 className="font-bold text-white text-sm">
              {t('ఎర్రర్ పెనాల్టీ (-6 pts)', 'Error Penalty (-6 pts)')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t(
                'నష్టం తెచ్చిన స్టాక్ స్కోరుపై -6 పాయింట్ల పెనాల్టీ విధించి, 3 రోజుల కూల్‌డౌన్ విధిస్తుంది. మళ్లీ అదే తప్పు జరగకుండా ఆపుతుంది.',
                'Applies dynamic -6.0 point penalty (max -18.0) and a 3-day cooldown on failing symbols, preventing repeat stop-loss traps.'
              )}
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 relative">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs font-mono border border-emerald-500/30">
              04
            </div>
            <h3 className="font-bold text-white text-sm">
              {t('విన్ రీఇన్‌ఫోర్స్‌మెంట్ (+4 pts)', 'Win Boost (+4 pts)')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t(
                'విజయవంతమైన ట్రేడ్స్ (1:2 R:R లక్ష్యం చేరినవి) కి +4 పాయింట్ల ప్రాధాన్యతనిచ్చి భవిష్యత్తు ఎంట్రీలలో ఎక్కువ వెయిటేజీ ఇస్తుంది.',
                'Rewards winning setups (+4.0 boost, max +12.0) that achieved disciplined 1:2 R:R targets with higher conviction scoring.'
              )}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Live Active Penalties & Parameter Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              {t('యాక్టివ్ ఎర్రర్ పెనాల్టీలు (Active Penalties)', 'Active Error Penalties')}
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Score Reductions</span>
          </div>

          <div className="space-y-2">
            {learningState?.active_penalties && Object.keys(learningState.active_penalties).length > 0 ? (
              Object.entries(learningState.active_penalties).map(([sym, pts]: any) => (
                <div key={sym} className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="font-bold text-white text-xs">{sym}</span>
                  <span className="font-mono text-xs font-bold text-rose-400">-{pts} pts penalty</span>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 text-center text-xs text-slate-400 font-mono">
                {t('ప్రస్తుతం ఎటువంటి నెగటివ్ పెనాల్టీలు లేవు', 'No active symbol penalties right now.')}
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {t('నష్టపోయిన స్టాక్స్ మళ్లీ స్క్రీనింగ్‌లో 55 పాయింట్ల కంటే ఎక్కువ స్కోర్ చేయలేవు.', 'Penalized stocks cannot trigger buy entries until penalty decays.')}
          </p>
        </GlassCard>

        <GlassCard className="p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              {t('యాక్టివ్ విన్ బూస్ట్‌లు (Active Win Boosts)', 'Active Win Boosts')}
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Score Enhancements</span>
          </div>

          <div className="space-y-2">
            {learningState?.active_boosts && Object.keys(learningState.active_boosts).length > 0 ? (
              Object.entries(learningState.active_boosts).map(([sym, pts]: any) => (
                <div key={sym} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="font-bold text-white text-xs">{sym}</span>
                  <span className="font-mono text-xs font-bold text-emerald-400">+{pts} pts boost</span>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 text-center text-xs text-slate-400 font-mono">
                {t('మొదటి టేక్-ప్రాఫిట్ తర్వాత ఇక్కడ విన్ బూస్ట్‌లు కనిపిస్తాయి', 'Win boosts will appear here once Take-Profit is triggered.')}
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {t('విజయవంతమైన స్టాక్స్‌కు క్రమంగా ఎక్కువ క్యాపిటల్ కేటాయించబడుతుంది.', 'Winning stocks get prioritized capital allocation.')}
          </p>
        </GlassCard>

        <GlassCard className="p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              {t('లెర్నింగ్ రూల్స్ & పారామీటర్లు', 'Learning Rules & Parameters')}
            </h3>
            <span className="text-[10px] font-mono text-emerald-400">Calibrated</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between p-2 rounded-lg bg-slate-900/50">
              <span className="text-slate-400">{t('నష్టానికి పెనాల్టీ', 'Penalty Per Loss')}:</span>
              <span className="text-rose-400 font-bold">-6.0 Points</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-900/50">
              <span className="text-slate-400">{t('గరిష్ట పెనాల్టీ సీలింగ్', 'Max Penalty Ceiling')}:</span>
              <span className="text-rose-400 font-bold">-18.0 Points</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-900/50">
              <span className="text-slate-400">{t('లాభానికి బూస్ట్', 'Boost Per Win')}:</span>
              <span className="text-emerald-400 font-bold">+4.0 Points</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-900/50">
              <span className="text-slate-400">{t('కూల్‌డౌన్ సమయం', 'Cooldown Cooldown')}:</span>
              <span className="text-amber-300 font-bold">3 Trading Days</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Embedded Live Learning Card with Audit Logs */}
      <div>
        <AiDailyLearningCard />
      </div>
    </div>
  );
};
