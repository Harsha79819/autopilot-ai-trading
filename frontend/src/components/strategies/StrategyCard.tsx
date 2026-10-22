import React, { useState } from 'react';
import { Layers, CheckCircle2, AlertOctagon, HelpCircle, Shield, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { StrategyInfo } from '../../types';

interface StrategyCardProps {
  strategy: StrategyInfo;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({ strategy }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard glow="blue" className="transition-all">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{strategy.display_name}</h3>
            <p className="text-xs text-slate-400">{strategy.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-slate-400 font-medium block mb-1">Primary Entry Rule:</span>
          <span className="text-slate-200">{strategy.entry_conditions[0] || 'See documentation'}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-slate-400 font-medium block mb-1">Primary Exit Rule:</span>
          <span className="text-slate-200">{strategy.exit_conditions[0] || 'See documentation'}</span>
        </div>
      </div>

      {/* Expandable Deep Documentation */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 text-xs">
          {/* Entry Conditions */}
          <div>
            <h4 className="text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5 text-accent-cyan">
              <CheckCircle2 className="w-3.5 h-3.5" /> Entry Criteria
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              {strategy.entry_conditions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>

          {/* Exit Conditions */}
          <div>
            <h4 className="text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5 text-accent-violet">
              <AlertOctagon className="w-3.5 h-3.5" /> Exit & Stop Criteria
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              {strategy.exit_conditions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>

          {/* Assumptions */}
          <div>
            <h4 className="text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5 text-slate-300">
              <HelpCircle className="w-3.5 h-3.5" /> Underlying Quantitative Assumptions
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              {strategy.assumptions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>

          {/* Risk Limits */}
          <div>
            <h4 className="text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5 text-rose-400">
              <Shield className="w-3.5 h-3.5" /> Built-in Risk Guardrails
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              {strategy.risk_limits.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>

          {/* Known Limitations */}
          <div>
            <h4 className="text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5 text-amber-400">
              <AlertOctagon className="w-3.5 h-3.5" /> Known Strategy Limitations
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              {strategy.known_limitations.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </GlassCard>
  );
};
