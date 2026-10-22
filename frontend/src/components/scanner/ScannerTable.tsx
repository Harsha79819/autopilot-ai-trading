import React, { useState } from 'react';
import { Radio, Filter, CheckCircle, AlertCircle, ShoppingCart, RefreshCw } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { useTrading } from '../../context/TradingContext';
import { formatINR, formatPct } from '../../utils/currency';
import { NoTradeReasons } from './NoTradeReasons';

export const ScannerTable: React.FC = () => {
  const { scannerData, refreshScanner, placeOrder, portfolio } = useTrading();
  const [filterEligibleOnly, setFilterEligibleOnly] = useState(false);
  const [showNoTradeDrawer, setShowNoTradeDrawer] = useState(false);

  if (!scannerData) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-accent-cyan" />
      </div>
    );
  }

  const opportunities = filterEligibleOnly
    ? scannerData.opportunities.filter((o) => o.eligible_for_capital)
    : scannerData.opportunities;

  return (
    <div className="space-y-4">
      <GlassCard glow="cyan">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">2-Stage Market Scanner</h2>
              <p className="text-xs text-slate-400">
                Universe filtered by available virtual cash (₹{scannerData.available_cash.toFixed(2)}) & Cost Gate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterEligibleOnly(!filterEligibleOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filterEligibleOnly
                  ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40 font-semibold'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>≤ ₹{scannerData.available_cash.toFixed(0)} Only ({scannerData.eligible_under_capital_count})</span>
            </button>

            <button
              onClick={() => setShowNoTradeDrawer(!showNoTradeDrawer)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>No-Trade Log ({scannerData.no_trade_reasons.length})</span>
            </button>

            <button
              onClick={() => refreshScanner()}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
              title="Rescan market universe"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scanner Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 font-medium">
                <th className="pb-3 pl-2">Stock</th>
                <th className="pb-3 text-right">LTP</th>
                <th className="pb-3 text-right">Cash Affordability</th>
                <th className="pb-3 text-right">Momentum / RSI</th>
                <th className="pb-3 text-right">Cost Gate Hurdle</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 pr-2 text-right">Simulate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {opportunities.map((item) => {
                return (
                  <tr key={item.symbol} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {item.symbol}
                        <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">NSE</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{item.company_name}</div>
                    </td>

                    <td className="py-3 text-right font-semibold text-white">
                      {formatINR(item.current_price)}
                    </td>

                    {/* Capital Eligibility & Whole-share count */}
                    <td className="py-3 text-right">
                      {item.eligible_for_capital ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" />
                            {item.max_affordable_shares} sh max
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            0 sh (&gt; ₹{scannerData.available_cash.toFixed(0)})
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Technical stats */}
                    <td className="py-3 text-right">
                      <div className="font-medium text-slate-200">
                        RSI: <span className={item.rsi_14 < 35 ? 'text-emerald-400 font-bold' : ''}>{item.rsi_14}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.trend_direction} ({formatPct(item.momentum_score)})
                      </div>
                    </td>

                    {/* Cost Gate Status */}
                    <td className="py-3 text-right">
                      <div className="font-mono text-[11px] text-slate-300">
                        {item.estimated_roundtrip_cost_pct.toFixed(2)}% friction
                      </div>
                      <div className="text-[10px]">
                        {item.cost_gate_passed ? (
                          <span className="text-emerald-400 font-medium">Edge &gt; 3x Cost</span>
                        ) : (
                          <span className="text-amber-400/80">Edge &lt; 3x Cost</span>
                        )}
                      </div>
                    </td>

                    {/* Actionable or No-Trade */}
                    <td className="py-3 text-center">
                      {item.is_actionable ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-pulse">
                          BUY READY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          NO TRADE
                        </span>
                      )}
                    </td>

                    {/* Action button */}
                    <td className="py-3 pr-2 text-right">
                      {item.eligible_for_capital ? (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Simulate paper BUY for 1 whole share of ${item.symbol} @ ₹${item.current_price.toFixed(2)}?`)) {
                              await placeOrder({
                                symbol: item.symbol,
                                side: 'BUY',
                                quantity: 1,
                                order_type: 'MARKET',
                              });
                            }
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/30 transition-all flex items-center gap-1 ml-auto"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          Buy 1
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Too expensive</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* No Trade Reasons Breakdown Drawer */}
      {showNoTradeDrawer && (
        <NoTradeReasons
          reasons={scannerData.no_trade_reasons}
          onClose={() => setShowNoTradeDrawer(false)}
        />
      )}
    </div>
  );
};
