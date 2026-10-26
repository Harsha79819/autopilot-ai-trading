import React, { useState } from 'react';
import {
  Briefcase,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Percent,
  Coins,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';

export const PortfolioDetailView: React.FC = () => {
  const { portfolio } = useTrading();
  const [allocationTab, setAllocationTab] = useState<'holdings' | 'allocation'>('holdings');

  const positions = portfolio?.positions || [];
  const holdingsValue = positions.reduce((acc, p) => acc + (p.quantity * p.current_price), 0);
  const totalValue = (portfolio?.cash_balance || 0) + holdingsValue;
  const cashPct = totalValue > 0 ? ((portfolio?.cash_balance || 0) / totalValue) * 100 : 100;
  const equityPct = 100 - cashPct;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Portfolio Intelligence & Holdings Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              FIFO cost-basis accounting, asset allocation metrics, and modeled transaction friction
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
          <span className="text-[11px] text-slate-400">Total Portfolio Value</span>
          <p className="text-xl font-bold text-white mt-1">{formatINR(totalValue)}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
          <span className="text-[11px] text-slate-400">Available Cash Balance</span>
          <p className="text-xl font-bold text-cyan-400 mt-1">{formatINR(portfolio?.cash_balance || 0)}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
          <span className="text-[11px] text-slate-400">Total Holdings Value</span>
          <p className="text-xl font-bold text-purple-400 mt-1">{formatINR(holdingsValue)}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
          <span className="text-[11px] text-slate-400">Net Realized PnL</span>
          <p className={`text-xl font-bold mt-1 ${(portfolio?.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatINR(portfolio?.realized_pnl || 0)}
          </p>
        </div>
      </div>

      {/* Allocation Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-semibold">Macro Asset Allocation</span>
          <span className="text-slate-400">
            Cash: <strong className="text-cyan-400">{cashPct.toFixed(1)}%</strong> | Equity: <strong className="text-purple-400">{equityPct.toFixed(1)}%</strong>
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
          <div className="bg-cyan-500 h-full" style={{ width: `${cashPct}%` }} title={`Cash: ${cashPct.toFixed(1)}%`} />
          <div className="bg-purple-500 h-full" style={{ width: `${equityPct}%` }} title={`Equity: ${equityPct.toFixed(1)}%`} />
        </div>
      </div>

      {/* Holdings Table */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Current Open Positions ({positions.length})</h3>
          <span className="text-xs text-slate-400">Whole-Share Delivery Accounting</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/40">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-900/80 text-[10px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Security</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Avg Buy Price</th>
                <th className="p-3">Current Price</th>
                <th className="p-3">Market Value</th>
                <th className="p-3">Unrealized P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No active open holdings in portfolio. AutoPilot bot scans for opportunities during market hours.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const mktVal = pos.quantity * pos.current_price;
                  const isProfitable = pos.unrealized_pnl >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-bold text-white">{pos.symbol}</td>
                      <td className="p-3">{pos.quantity} Shares</td>
                      <td className="p-3">₹{pos.average_buy_price.toFixed(2)}</td>
                      <td className="p-3 font-semibold text-slate-200">₹{pos.current_price.toFixed(2)}</td>
                      <td className="p-3 font-bold text-white">{formatINR(mktVal)}</td>
                      <td className="p-3 font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          isProfitable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {isProfitable ? '+' : ''}{formatINR(pos.unrealized_pnl)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
