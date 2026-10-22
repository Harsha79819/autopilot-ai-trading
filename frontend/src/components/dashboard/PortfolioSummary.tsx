import React, { useState } from 'react';
import {
  Wallet,
  Coins,
  TrendingUp,
  Percent,
  Receipt,
  AlertTriangle,
  Info,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { MetricBadge } from '../common/MetricBadge';
import { useTrading } from '../../context/TradingContext';
import { formatINR, formatPct, getPnLColor, getPnLBg } from '../../utils/currency';
import { CostBreakdownModal } from './CostBreakdownModal';

export const PortfolioSummary: React.FC = () => {
  const { portfolio } = useTrading();
  const [showCostModal, setShowCostModal] = useState(false);

  if (!portfolio) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
        ))}
      </div>
    );
  }

  const { metrics } = portfolio;
  const isHighCostDrag = metrics.cost_drag_pct > 50.0 && metrics.gross_profit > 0;

  return (
    <>
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Value */}
        <GlassCard glow="cyan" className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-accent-cyan" />
              Total Portfolio Value
            </span>
            <MetricBadge value={metrics.net_return_pct} isPercent />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
              {formatINR(metrics.total_portfolio_value)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Initial Capital:</span>
              <span className="text-slate-300 font-medium">{formatINR(metrics.initial_cash)}</span>
            </div>
          </div>
        </GlassCard>

        {/* Available Virtual Cash */}
        <GlassCard glow="blue" className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-accent-blue" />
              Available Virtual Cash
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-accent-blue border border-blue-500/20 font-medium">
              Liquid
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
              {formatINR(metrics.current_cash)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Invested in Shares:</span>
              <span className="text-slate-300 font-medium">{formatINR(metrics.holdings_value)}</span>
            </div>
          </div>
        </GlassCard>

        {/* Net Profit & Loss (After Costs) */}
        <GlassCard glow={metrics.net_pnl >= 0 ? 'emerald' : 'none'} className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Net P&L (After Costs)
            </span>
            <div className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getPnLBg(metrics.net_pnl)}`}>
              {formatPct(metrics.net_return_pct)}
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 ${getPnLColor(metrics.net_pnl)}`}>
              {formatINR(metrics.net_pnl)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Realized / Unrealized:</span>
              <span className="text-slate-300 font-medium">
                {formatINR(metrics.realized_pnl)} / {formatINR(metrics.unrealized_pnl)}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Simulated Fees & Market Friction */}
        <GlassCard
          glow={isHighCostDrag ? 'none' : 'violet'}
          interactive
          className="flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2" onClick={() => setShowCostModal(true)}>
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-accent-violet" />
              Simulated Fees & Taxes
            </span>
            <span className="text-[10px] text-accent-violet hover:underline cursor-pointer flex items-center gap-1">
              Details <Info className="w-3 h-3" />
            </span>
          </div>
          <div onClick={() => setShowCostModal(true)}>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-200 mb-1">
              {formatINR(metrics.total_fees_paid)}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Cost Drag Ratio:</span>
              <span className={`font-semibold ${isHighCostDrag ? 'text-amber-400' : 'text-slate-300'}`}>
                {metrics.cost_drag_pct.toFixed(1)}% of gross
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* High Cost Drag Warning Banner */}
      {isHighCostDrag && (
        <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Capital Friction Alert:</strong> On an account of {formatINR(metrics.initial_cash)}, transaction fees (STT, GST, brokerage, spread) represent {metrics.cost_drag_pct.toFixed(0)}% of gross profits. Our <strong>Cost-Aware Gate</strong> has automatically tightened trade entry requirements to protect remaining capital.
          </span>
        </div>
      )}

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="glass-panel-subtle rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">Win Rate:</span>
          <span className="text-sm font-bold text-white">
            {metrics.total_trades_count > 0 ? `${metrics.win_rate_pct.toFixed(1)}%` : 'N/A'}
          </span>
        </div>

        <div className="glass-panel-subtle rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">Max Drawdown:</span>
          <span className={`text-sm font-bold ${metrics.max_drawdown_pct > 10 ? 'text-rose-400' : 'text-slate-200'}`}>
            {metrics.max_drawdown_pct.toFixed(2)}%
          </span>
        </div>

        <div className="glass-panel-subtle rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">Executed Trades:</span>
          <span className="text-sm font-bold text-slate-200">{metrics.total_trades_count}</span>
        </div>

        <div className="glass-panel-subtle rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">Simulation Status:</span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active
          </span>
        </div>
      </div>

      {/* Modal */}
      {showCostModal && (
        <CostBreakdownModal
          portfolio={portfolio}
          onClose={() => setShowCostModal(false)}
        />
      )}
    </>
  );
};
