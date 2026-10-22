import React from 'react';
import { Briefcase, ArrowRight, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { EmptyState } from '../common/EmptyState';
import { useTrading } from '../../context/TradingContext';
import { formatINR, formatPct, getPnLColor, getPnLBg } from '../../utils/currency';

export const ActivePositions: React.FC = () => {
  const { portfolio, quotes, placeOrder, setActiveTab } = useTrading();

  if (!portfolio) return null;

  const positions = portfolio.positions;

  return (
    <GlassCard className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Active Virtual Holdings</h3>
            <p className="text-[11px] text-slate-400">Open positions in paper portfolio</p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 font-medium text-slate-300">
          {positions.length} {positions.length === 1 ? 'Holding' : 'Holdings'}
        </span>
      </div>

      {positions.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No Active Holdings"
          description="Your virtual portfolio currently holds 100% cash. Explore the Market Scanner to find setups that clear our Cost-Aware Gate."
          actionText="Open Market Scanner"
          onAction={() => setActiveTab('scanner')}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 font-medium">
                <th className="pb-3 pl-2">Instrument</th>
                <th className="pb-3 text-right">Qty</th>
                <th className="pb-3 text-right">Avg Entry</th>
                <th className="pb-3 text-right">LTP</th>
                <th className="pb-3 text-right">Holdings Value</th>
                <th className="pb-3 text-right">Unrealized P&L</th>
                <th className="pb-3 pr-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {positions.map((pos) => {
                const liveQuote = quotes[pos.symbol];
                const curPrice = liveQuote ? liveQuote.current_price : pos.current_price;
                const curValue = roundTo(pos.quantity * curPrice, 2);
                const pnl = roundTo((curPrice - pos.average_buy_price) * pos.quantity, 2);
                const costBasis = pos.quantity * pos.average_buy_price;
                const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100.0 : 0.0;

                return (
                  <tr key={pos.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-white">{pos.symbol}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                        {liveQuote?.company_name || 'NSE Stock'}
                      </div>
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-200">
                      {pos.quantity} sh
                    </td>
                    <td className="py-3 text-right text-slate-300">
                      {formatINR(pos.average_buy_price)}
                    </td>
                    <td className="py-3 text-right font-medium text-white">
                      {formatINR(curPrice)}
                    </td>
                    <td className="py-3 text-right font-semibold text-white">
                      {formatINR(curValue)}
                    </td>
                    <td className="py-3 text-right">
                      <div className={`font-bold ${getPnLColor(pnl)}`}>{formatINR(pnl)}</div>
                      <div className="text-[10px] text-slate-400">{formatPct(pnlPct)}</div>
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <button
                        onClick={async () => {
                          if (window.confirm(`Simulate Market Sell for ${pos.quantity} shares of ${pos.symbol}?`)) {
                            await placeOrder({
                              symbol: pos.symbol,
                              side: 'SELL',
                              quantity: pos.quantity,
                              order_type: 'MARKET',
                            });
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                      >
                        Exit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
};

function roundTo(num: number, dec: number): number {
  return Number(Math.round(Number(num + 'e' + dec)) + 'e-' + dec);
}
