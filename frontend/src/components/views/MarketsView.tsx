import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Star,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';

export const MarketsView: React.FC = () => {
  const { quotes, refreshQuotes } = useTrading();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'GAINERS' | 'LOSERS'>('ALL');

  const quoteList = Object.values(quotes);

  const filteredQuotes = quoteList.filter((q) => {
    const matchesSearch = q.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedFilter === 'GAINERS') return q.change_pct > 0;
    if (selectedFilter === 'LOSERS') return q.change_pct < 0;
    return true;
  });

  const gainersCount = quoteList.filter((q) => q.change_pct > 0).length;
  const losersCount = quoteList.filter((q) => q.change_pct < 0).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              NSE Indian Equities & Market Overview
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live price feeds, market breadth indicators, bid-ask spreads, and volume analysis
            </p>
          </div>
        </div>

        <button
          onClick={refreshQuotes}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-white/10 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Quotes</span>
        </button>
      </div>

      {/* Market Breadth Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
          <span className="text-[11px] text-slate-400 block">Nifty 50 Benchmark</span>
          <span className="text-lg font-bold text-white mt-1 block">24,850.20</span>
          <span className="text-[10px] text-emerald-400 font-semibold">+0.62% (+152.40 pts)</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
          <span className="text-[11px] text-slate-400 block">BSE Sensex</span>
          <span className="text-lg font-bold text-white mt-1 block">81,420.50</span>
          <span className="text-[10px] text-emerald-400 font-semibold">+0.58% (+470.10 pts)</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
          <span className="text-[11px] text-slate-400 block">Market Advances</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block">{gainersCount} Stocks</span>
          <span className="text-[10px] text-slate-400">Bullish Breadth</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
          <span className="text-[11px] text-slate-400 block">Market Declines</span>
          <span className="text-lg font-bold text-rose-400 mt-1 block">{losersCount} Stocks</span>
          <span className="text-[10px] text-slate-400">Pullback Counters</span>
        </div>
      </div>

      {/* Table & Controls */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ticker (e.g. INFY, TCS)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {(['ALL', 'GAINERS', 'LOSERS'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedFilter === filter
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-950 text-slate-400 border-white/5 hover:border-white/10'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/40">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-900/80 text-[10px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Symbol</th>
                <th className="p-3">Live Price</th>
                <th className="p-3">Change %</th>
                <th className="p-3">Bid / Ask</th>
                <th className="p-3">Spread %</th>
                <th className="p-3">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredQuotes.map((q) => {
                const isPositive = q.change_pct >= 0;
                return (
                  <tr key={q.symbol} className="hover:bg-white/[0.02]">
                    <td className="p-3 font-bold text-white">{q.symbol}</td>
                    <td className="p-3 font-semibold text-slate-200">₹{q.current_price?.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                      }`}>
                        {isPositive ? '+' : ''}{q.change_pct?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-slate-400">
                      ₹{q.bid?.toFixed(2)} / ₹{q.ask?.toFixed(2)}
                    </td>
                    <td className="p-3 text-[11px] text-slate-400">{q.spread_pct?.toFixed(3)}%</td>
                    <td className="p-3 text-[11px] text-slate-400">{q.volume?.toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
