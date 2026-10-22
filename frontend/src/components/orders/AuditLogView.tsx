import React, { useEffect, useState } from 'react';
import { ShieldCheck, Filter, Clock } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { AuditLog } from '../../types';
import { api } from '../../services/api';
import { formatTimeOnly } from '../../utils/formatters';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await api.getAuditLogs(60);
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = filterType === 'ALL' ? logs : logs.filter((l) => l.event_type === filterType);

  return (
    <GlassCard className="mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Immutable Decision Audit Trail</h3>
            <p className="text-xs text-slate-400">Chronological verification of every automated evaluation</p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'RISK_CHECK', 'ORDER_SIMULATION', 'KILL_SWITCH'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                filterType === t
                  ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40 font-bold'
                  : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">No audit events recorded yet.</div>
        ) : (
          filteredLogs.map((l) => {
            const isBlocked = l.decision === 'BLOCKED' || l.decision === 'REJECTED';
            const isExecuted = l.decision === 'EXECUTED';
            return (
              <div
                key={l.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-500 text-[11px]">{formatTimeOnly(l.timestamp)}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10">
                    {l.event_type}
                  </span>
                  {l.symbol && <span className="font-bold text-white">{l.symbol}</span>}
                  <span className="text-slate-300">{l.reason}</span>
                </div>

                <span
                  className={`self-start sm:self-auto px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isBlocked
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : isExecuted
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {l.decision}
                </span>
              </div>
            );
          })
        )}
      </div>
    </GlassCard>
  );
};
