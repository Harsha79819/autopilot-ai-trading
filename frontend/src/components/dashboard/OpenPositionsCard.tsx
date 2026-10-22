import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { formatINR, formatPct } from '../../utils/currency';

export const OpenPositionsCard: React.FC = () => {
  const { portfolio } = useTrading();

  const positions = portfolio?.positions || [];
  const hasLivePositions = positions.length > 0;

  // Reconcile dynamic gross, costs, net across all open positions
  const grossPnl = hasLivePositions
    ? positions.reduce((acc, pos) => acc + (pos.gross_pnl ?? pos.unrealized_pnl), 0)
    : 0.0;

  const costs = hasLivePositions
    ? positions.reduce((acc, pos) => acc + (pos.estimated_exit_costs ?? 0.0), 0)
    : 0.0;

  const netPnl = hasLivePositions
    ? positions.reduce((acc, pos) => acc + (pos.net_pnl ?? ((pos.gross_pnl ?? pos.unrealized_pnl) - (pos.estimated_exit_costs ?? 0))), 0)
    : 0.0;

  return (
    <div className="liquid-glass p-6 sm:p-7 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Open position
          </h3>
          <span className="text-xs text-muted-labels font-medium">
            {hasLivePositions ? `${positions.length} active paper position${positions.length > 1 ? 's' : ''}` : 'No open positions'}
          </span>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-labels border-b border-white/10 pb-2">
                <th className="font-medium pb-2">Symbol</th>
                <th className="font-medium pb-2">Qty</th>
                <th className="font-medium pb-2">Avg entry</th>
                <th className="font-medium pb-2">Last price</th>
                <th className="font-medium pb-2 text-right">Unrealized</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {hasLivePositions ? (
                positions.map((pos) => {
                  const pnl = pos.unrealized_pnl;
                  const isPos = pnl >= 0;
                  return (
                    <tr key={pos.symbol} className="text-white">
                      <td className="py-3 font-bold text-white tracking-wide">{pos.symbol}</td>
                      <td className="py-3 text-slate-300">{pos.quantity}</td>
                      <td className="py-3 text-slate-300">{formatINR(pos.average_buy_price)}</td>
                      <td className="py-3 text-slate-300">{formatINR(pos.current_price)}</td>
                      <td
                        className={`py-3 text-right font-bold ${
                          isPos ? 'text-profit' : 'text-loss'
                        }`}
                      >
                        {isPos ? '+' : ''}
                        {formatINR(pnl)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No open positions. Scanner is evaluating market for opportunities.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden py-1">
          {hasLivePositions ? (
            positions.map((pos) => {
              const pnl = pos.unrealized_pnl;
              const isPos = pnl >= 0;
              return (
                <div key={pos.symbol} className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-sm font-bold text-white">
                      {pos.symbol} · {pos.quantity} sh
                    </div>
                    <div className="text-xs text-muted-labels mt-0.5">
                      Avg {formatINR(pos.average_buy_price)} · Last {formatINR(pos.current_price)}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${isPos ? 'text-profit' : 'text-loss'}`}>
                    {isPos ? '+' : ''}
                    {formatINR(pnl)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">
              No open positions. Scanner is evaluating market for opportunities.
            </div>
          )}
        </div>
      </div>

      {/* Badges Below Table */}
      <div className="flex items-center gap-2.5 pt-4 mt-2 border-t border-white/10 text-xs font-semibold">
        <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-200">
          Gross P&L {grossPnl >= 0 ? '+' : ''}
          {formatINR(grossPnl)}
        </span>

        <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300">
          Costs -{formatINR(costs)}
        </span>

        <span className={`px-3 py-1 rounded-xl border font-semibold ${
          netPnl > 0
            ? 'bg-emerald-500/10 border-emerald-500/20 text-profit'
            : netPnl < 0
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            : 'bg-white/5 border-white/10 text-slate-300'
        }`}>
          Net {netPnl >= 0 ? '+' : ''}
          {formatINR(netPnl)}
        </span>
      </div>
    </div>
  );
};
