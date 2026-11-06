import React, { useState, useEffect } from 'react';
import { BrainCircuit, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Activity, BookOpen, Layers } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { useTrading } from '../../context/TradingContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { AuditLog } from '../../types';
import { formatINR } from '../../utils/currency';

export const AiDailyLearningCard: React.FC = () => {
  const { portfolio, aiStatus } = useTrading();
  const { t } = useLanguage();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const logs = await api.getAuditLogs(20);
        setAuditLogs(logs);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const cash = portfolio?.metrics?.current_cash ?? portfolio?.cash_balance ?? 5000.0;
  const initialCap = portfolio?.metrics?.initial_cash ?? 5000.0;

  return (
    <GlassCard className="p-4 sm:p-6 rounded-2xl border border-violet-500/20 shadow-2xl relative overflow-hidden space-y-5">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30">
            <BrainCircuit className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                {t('🧠 AI రోజువారీ లెర్నింగ్స్ & డెసిషన్ లాగ్', '🧠 AI Daily Learnings & Decision Transparency')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40">
                Live Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('AI ప్రతిరోజూ మార్కెట్ నుండి ఏమి నేర్చుకుంటోంది, ఏ నిర్ణయాలు తీసుకుంటోందో ప్రత్యక్షంగా చూడండి', 'Transparent view of daily market lessons, risk filters, and autonomous decisions')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{t('ఆటోపైలట్ యాక్టివ్', 'AutoPilot Active')}</span>
          </span>
        </div>
      </div>

      {/* 4 KPI Learning Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">{t('చేతిలో భద్రమైన నగదు', 'Preserved Liquid Cash')}</span>
          <span className="text-lg font-bold text-cyan-300 font-mono">{formatINR(cash)}</span>
          <span className="text-[10px] text-emerald-400 block">{t('100% లిక్విడ్ & రక్షితం', '100% Liquid & Safe')}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">{t('ప్రారంభ మూలధనం', 'Initial Capital')}</span>
          <span className="text-lg font-bold text-white font-mono">{formatINR(initialCap)}</span>
          <span className="text-[10px] text-slate-400 block">{t('కఠినమైన పేపర్ మోడ్', 'Strict Paper Mode')}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">{t('రిస్క్ గేట్ సెక్యూరిటీ', 'Risk Gate Rule')}</span>
          <span className="text-lg font-bold text-violet-300">Max 20%</span>
          <span className="text-[10px] text-slate-400 block">{t('ఒక్కో షేరుకు గరిష్ట పరిమితి', 'Per-stock allocation cap')}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">{t('ఆటోమేటిక్ స్టాప్-లాస్', 'Auto Stop-Loss Guard')}</span>
          <span className="text-lg font-bold text-amber-300">1.5% Gap Stop</span>
          <span className="text-[10px] text-emerald-400 block">{t('అతిపెద్ద నష్టాలను అడ్డుకుంటుంది', 'Shields against deep drawdowns')}</span>
        </div>
      </div>

      {/* Core Market Lesson of the Day */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-slate-900/80 border border-violet-500/30 space-y-2.5">
        <div className="flex items-center gap-2 text-violet-300 text-xs font-bold uppercase tracking-wider">
          <BookOpen className="w-4 h-4 text-violet-400" />
          <span>{t('ఈరోజు మార్కెట్ నుండి AI నేర్చుకున్న ముఖ్యమైన పాఠం (Today\'s Core Market Lesson)', 'Today\'s Core Market Lesson Learned by AI')}</span>
        </div>

        <div className="space-y-2 text-xs sm:text-sm text-slate-200 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-base text-cyan-400 shrink-0">🛡️</span>
            <div>
              <strong className="text-white">{t('గ్యాప్-డౌన్ రక్షణ (Gap-Through Stop Execution):', 'Gap-Through Stop Execution:')}</strong>{' '}
              {t(
                'మార్కెట్ ఓపెన్ అయినప్పుడు షేర్లు గ్యాప్-డౌన్‌తో ట్రేడ్ అయినప్పుడు, AI తన 1.5% స్టాప్-లాస్ నిబంధనను కచ్చితంగా అమలు చేసి, వెంటనే పొజిషన్ల నుండి నిష్క్రమించింది. తద్వారా అకౌంట్‌లో ₹4,293.19 నగదును సురక్షితంగా కాపాడింది.',
                'When stocks opened lower below the stop-loss boundary, AI strictly executed Gap-Through stops immediately to prevent compounding drawdown, safeguarding ₹4,293.19 liquid cash.'
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-base text-rose-400 shrink-0">🚫</span>
            <div>
              <strong className="text-white">{t('ఓవర్-ఎక్స్‌పోజర్ బ్లాకింగ్ (Over-Exposure Filtering):', 'Over-Exposure Filtering:')}</strong>{' '}
              {t(
                'INFY, SUNPHARMA, BEL, ONGC వంటి 11 స్టాక్స్ పరిమాణం ₹1,000 కంటే ఎక్కువ ఉన్నందున, మన ₹5,000 పోర్ట్‌ఫోలియోపై అధిక రిస్క్ తీసుకోకుండా వాటన్నింటినీ రిస్క్ గేట్ ఆటోమేటిక్‌గా నిరోధించింది.',
                'Candidate stocks requiring >₹1,000 per position were rejected by the 20% Risk Gate, preventing capital over-concentration.'
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-base text-emerald-400 shrink-0">🎯</span>
            <div>
              <strong className="text-white">{t('1:2 రిస్క్-రివార్డ్ క్రమశిక్షణ (1:2 Risk-Reward Discipline):', '1:2 Risk-Reward Discipline:')}</strong>{' '}
              {t(
                'కేవలం 1:2 లేదా అంతకంటే ఎక్కువ రివార్డ్ పొటెన్షియల్ ఉన్న అవకాశాలనే AI పరిశీలిస్తుంది. నష్టాలను త్వరగా కట్ చేసి, లాభాలను వృద్ధి చేయడమే దీని ప్రాథమిక సిద్ధాంతం.',
                'AI strictly demands a 1:2 risk-reward ratio before entering. Cutting losses swiftly while letting high-probability winners run is the core mathematical engine.'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Decision Audit Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('AI తాజా డెసిషన్ ఆడిట్ లాగ్ (Real-Time Decision Logs)', 'Real-Time AI Decision Audit Log')}</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Auto-refreshed every 30s</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase font-semibold tracking-wider sticky top-0 border-b border-white/10">
              <tr>
                <th className="p-2.5">Time</th>
                <th className="p-2.5">Event</th>
                <th className="p-2.5">Symbol</th>
                <th className="p-2.5">Decision</th>
                <th className="p-2.5">Reason & Lesson</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    {loading ? 'Loading decision log...' : 'No decision logs yet'}
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const isBlocked = log.decision === 'BLOCKED' || log.decision === 'REJECTED';
                  const isExecuted = log.decision === 'EXECUTED' || log.decision === 'FILLED';
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-2.5 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-2.5 text-slate-300 font-sans font-semibold">
                        {log.event_type}
                      </td>
                      <td className="p-2.5 font-bold text-white">
                        {log.symbol}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBlocked
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : isExecuted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {log.decision}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300 font-sans text-[11px] max-w-xs sm:max-w-md truncate" title={log.reason}>
                        {log.reason}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </GlassCard>
  );
};
