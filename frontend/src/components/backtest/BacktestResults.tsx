import React from 'react';
import { TrendingUp, Award, AlertTriangle, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { BacktestResponse } from '../../types';
import { formatINR, formatPct, getPnLColor } from '../../utils/currency';
import { formatTimeOnly } from '../../utils/formatters';

interface BacktestResultsProps {
  result: BacktestResponse;
}

export const BacktestResults: React.FC<BacktestResultsProps> = ({ result }) => {
  const initial = result.initial_capital;
  const final = result.final_equity;
  const netGain = final - initial;

  // Render SVG equity curve
  const curve = result.equity_curve || [];
  const minEq = Math.min(...curve.map((c) => c.equity), initial * 0.95);
  const maxEq = Math.max(...curve.map((c) => c.equity), initial * 1.05);
  const range = maxEq - minEq || 1;

  const points = curve.map((c, i) => {
    const x = (i / Math.max(curve.length - 1, 1)) * 100;
    const y = 100 - ((c.equity - minEq) / range) * 100;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <GlassCard className="p-3.5">
          <span className="text-slate-400 block mb-1">Net P&L (After Costs):</span>
          <span className={`text-lg font-bold ${getPnLColor(netGain)}`}>
            {formatINR(netGain)} ({formatPct(result.net_return_pct)})
          </span>
        </GlassCard>

        <GlassCard className="p-3.5">
          <span className="text-slate-400 block mb-1">Win Rate:</span>
          <span className="text-lg font-bold text-white">{result.win_rate_pct.toFixed(1)}%</span>
        </GlassCard>

        <GlassCard className="p-3.5">
          <span className="text-slate-400 block mb-1">Max Drawdown:</span>
          <span className="text-lg font-bold text-rose-400">{result.max_drawdown_pct.toFixed(2)}%</span>
        </GlassCard>

        <GlassCard className="p-3.5">
          <span className="text-slate-400 block mb-1">Cost Drag Ratio:</span>
          <span className="text-lg font-bold text-amber-400">{result.cost_drag_pct.toFixed(1)}%</span>
        </GlassCard>
      </div>

      {/* Chronological Train / Val / Test Partition Cards */}
      <GlassCard glow="violet">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-accent-violet" />
          Chronological Out-of-Sample Performance Splits
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          To prevent survivorship and look-ahead bias, historical data is partitioned sequentially:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {result.splits.map((s) => (
            <div key={s.split_name} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{s.split_name} Split</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-300">
                  {s.total_trades} Trades
                </span>
              </div>

              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Net Profit:</span>
                  <span className={`font-semibold ${getPnLColor(s.net_profit)}`}>{formatINR(s.net_profit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Win Rate:</span>
                  <span className="font-semibold text-slate-200">{s.win_rate_pct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Drawdown:</span>
                  <span className="font-semibold text-rose-400">{s.max_drawdown_pct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Fees Paid:</span>
                  <span className="font-semibold text-slate-400">{formatINR(s.total_fees)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* SVG Backtest Equity Curve */}
      {curve.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-white">Backtest Equity Curve ({result.symbol})</span>
            <span className="text-slate-400 font-mono">
              ₹{initial.toFixed(2)} ➔ ₹{final.toFixed(2)}
            </span>
          </div>

          <div className="w-full h-40 relative">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <path d={points} fill="none" stroke="#8B5CF6" strokeWidth="1.8" />
            </svg>
          </div>
        </GlassCard>
      )}

      {/* Scientific Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2.5">
        <FileText className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">{result.assumptions_disclaimer}</p>
      </div>
    </div>
  );
};
