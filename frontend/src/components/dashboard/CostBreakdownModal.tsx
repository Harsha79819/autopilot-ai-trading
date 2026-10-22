import React from 'react';
import { X, Receipt, Info, TrendingUp, TrendingDown, PieChart, ShieldCheck } from 'lucide-react';
import { Portfolio } from '../../types';
import { formatINR, formatPct } from '../../utils/currency';

interface CostBreakdownModalProps {
  portfolio: Portfolio;
  onClose: () => void;
}

export const CostBreakdownModal: React.FC<CostBreakdownModalProps> = ({ portfolio, onClose }) => {
  const { metrics } = portfolio;

  // Keyboard shortcut: Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Aggregate fees from all recent trades
  const totals = portfolio.recent_trades.reduce(
    (acc, t) => {
      acc.brokerage += t.fees.brokerage;
      acc.stt += t.fees.stt;
      acc.exchange += t.fees.exchange_charges;
      acc.gst += t.fees.gst;
      acc.sebi += t.fees.sebi_charges;
      acc.stamp += t.fees.stamp_duty;
      acc.dp += t.fees.dp_charges;
      acc.slippage += t.fees.slippage_amount;
      acc.spread += t.fees.spread_amount;
      return acc;
    },
    { brokerage: 0, stt: 0, exchange: 0, gst: 0, sebi: 0, stamp: 0, dp: 0, slippage: 0, spread: 0 }
  );

  const isNetPositive = metrics.net_pnl >= 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass max-w-xl w-full p-6 sm:p-7 relative border border-white/20 shadow-2xl my-8"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-400">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Portfolio / Profit & Loss</h3>
              <p className="text-xs text-muted-labels">
                Double-Entry Accounting & Indian Statutory Cost Model
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary PnL KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[11px] text-muted-labels block">Starting Capital</span>
            <span className="text-sm font-bold text-white">{formatINR(metrics.initial_cash)}</span>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[11px] text-muted-labels block">Available Cash</span>
            <span className="text-sm font-bold text-white">{formatINR(metrics.current_cash)}</span>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[11px] text-muted-labels block">Holdings Value</span>
            <span className="text-sm font-bold text-white">{formatINR(metrics.holdings_value)}</span>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[11px] text-muted-labels block">Total Portfolio</span>
            <span className="text-sm font-bold text-white">{formatINR(metrics.total_portfolio_value)}</span>
          </div>
        </div>

        {/* Gross vs Net PnL Highlight */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 mb-5 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-labels">Gross Profit / Loss (Before Costs):</span>
            <span className="text-white font-semibold">{formatINR(metrics.gross_profit)}</span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-muted-labels">Total Deducted Charges & Taxes:</span>
            <span className="text-loss font-semibold">-{formatINR(metrics.total_fees_paid)}</span>
          </div>

          <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold">
            <span className="text-white">Net P&L (After Costs):</span>
            <span className={isNetPositive ? 'text-profit' : 'text-loss'}>
              {isNetPositive ? '+' : ''}
              {formatINR(metrics.net_pnl)} ({formatPct(metrics.net_return_pct)})
            </span>
          </div>
        </div>

        {/* Informative Note */}
        <div className="mb-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-200 flex items-start gap-2">
          <Info className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
          <span>
            Every simulated order precisely models real SEBI and NSE statutory taxation. On a <strong>₹500 micro-account</strong>, transaction friction represents a major drag. Our <strong>Cost-Aware Gate</strong> enforces expected moves $\ge 3\times$ friction to safeguard capital.
          </span>
        </div>

        {/* Charge Breakdown Table */}
        <div className="space-y-1.5 text-xs mb-5">
          <div className="text-[11px] font-bold text-muted-labels uppercase tracking-wider mb-2">
            Itemized Statutory Charges
          </div>

          <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
            <span>Brokerage (0.03% or ₹20/order max):</span>
            <span className="font-semibold text-white">{formatINR(totals.brokerage)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
            <span>STT / CTT (Securities Transaction Tax):</span>
            <span className="font-semibold text-white">{formatINR(totals.stt)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
            <span>NSE Exchange Charges (0.00325%):</span>
            <span className="font-semibold text-white">{formatINR(totals.exchange)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
            <span>GST (18% on Brokerage + Exchange):</span>
            <span className="font-semibold text-white">{formatINR(totals.gst)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
            <span>SEBI Turnover Fees (₹10/crore):</span>
            <span className="font-semibold text-white">{formatINR(totals.sebi)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
            <span>Stamp Duty (0.003% buy side):</span>
            <span className="font-semibold text-white">{formatINR(totals.stamp)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
            <span>Simulated Slippage (5 bps):</span>
            <span className="font-semibold text-white">{formatINR(totals.slippage)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
            <span>Bid-Ask Spread Friction (10 bps):</span>
            <span className="font-semibold text-white">{formatINR(totals.spread)}</span>
          </div>

          <div className="flex justify-between pt-2 text-xs font-bold text-violet-400">
            <span>Total Itemized Friction:</span>
            <span>{formatINR(portfolio.total_fees_paid)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-all cursor-pointer"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
