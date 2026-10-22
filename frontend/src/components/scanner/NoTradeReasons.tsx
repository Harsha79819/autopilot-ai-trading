import React from 'react';
import { X, AlertCircle, ShieldAlert, DollarSign, Activity, Percent } from 'lucide-react';
import { NoTradeReason } from '../../types';

interface NoTradeReasonsProps {
  reasons: NoTradeReason[];
  onClose: () => void;
}

export const NoTradeReasons: React.FC<NoTradeReasonsProps> = ({ reasons, onClose }) => {
  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'STAGE_1_CAPITAL':
        return { label: 'Capital Limit (Whole Share)', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      case 'STAGE_1_LIQUIDITY':
        return { label: 'Liquidity & Spread', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'STAGE_2_COST_GATE':
        return { label: 'Cost-Aware Gate', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' };
      case 'STAGE_2_TECHNICAL':
        return { label: 'Technical Signal', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      default:
        return { label: stage, color: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="bg-[#0D131F] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Why "NO TRADE" Decisions Occur</h3>
              <p className="text-xs text-slate-400">Audit trail of non-actionable scanner evaluations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Educational Notice */}
        <div className="p-3 mb-4 rounded-xl bg-slate-800/60 border border-white/5 text-xs text-slate-300 leading-relaxed">
          The AutoPilot AI platform actively selects <strong>NO TRADE</strong> whenever risk limits, capital bounds, or transaction fees outweigh statistical edge. On micro-capital accounts, rejecting unviable trades is the primary driver of capital preservation.
        </div>

        {/* Reasons List */}
        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
          {reasons.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No rejections recorded.</div>
          ) : (
            reasons.map((r, i) => {
              const badge = getStageBadge(r.stage);
              return (
                <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all text-xs">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <span className="font-bold text-white text-sm">{r.symbol}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-normal">{r.reason}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-all"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};
