import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Bell,
  Star,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/currency';

export const WatchlistView: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newTargetBuy, setNewTargetBuy] = useState('');
  const [newTargetSell, setNewTargetSell] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const loadWatchlist = () => {
    api.getWatchlist().then(setItems).catch(console.error);
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    try {
      setLoading(true);
      await api.addToWatchlist({
        symbol: newSymbol.trim().toUpperCase(),
        target_buy_price: newTargetBuy ? parseFloat(newTargetBuy) : undefined,
        target_sell_price: newTargetSell ? parseFloat(newTargetSell) : undefined,
        notes: newNotes
      });
      setNewSymbol('');
      setNewTargetBuy('');
      setNewTargetSell('');
      setNewNotes('');
      loadWatchlist();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (symbol: string) => {
    try {
      await api.removeFromWatchlist(symbol);
      loadWatchlist();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Custom Watchlist & Price Tracking
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized watchlists with real-time quotes, buy/sell target price alarms, and notes
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Add to Watchlist */}
        <form onSubmit={handleAdd} className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white">Add Security to Watchlist</h3>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Symbol (NSE)</label>
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="e.g. INFY, TCS, BEL"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white uppercase placeholder-slate-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Buy (₹)</label>
              <input
                type="number"
                value={newTargetBuy}
                onChange={(e) => setNewTargetBuy(e.target.value)}
                placeholder="e.g. 1450"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Sell (₹)</label>
              <input
                type="number"
                value={newTargetSell}
                onChange={(e) => setNewTargetSell(e.target.value)}
                placeholder="e.g. 1550"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Setup / Strategy Note</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Waiting for 20 EMA pullback on daily chart"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !newSymbol.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-xs font-bold text-white shadow-lg cursor-pointer disabled:opacity-40"
          >
            Add to Watchlist
          </button>
        </form>

        {/* Right Column: Watchlist Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Tracked Equities ({items.length})</h3>
            <span className="text-[10px] text-slate-400">NSE Regular Market Quotes</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/40">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-900/80 text-[10px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Symbol</th>
                  <th className="p-3">Live Price</th>
                  <th className="p-3">Daily Change</th>
                  <th className="p-3">Buy / Sell Targets</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      No stocks in your watchlist yet. Add symbols using the form on the left.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isPositive = item.change_pct >= 0;
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-bold text-white">{item.symbol}</td>
                        <td className="p-3 font-semibold text-slate-200">₹{item.current_price?.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                          }`}>
                            {isPositive ? '+' : ''}{item.change_pct?.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-400">
                          {item.target_buy_price ? `Buy: ₹${item.target_buy_price}` : '-'} / {item.target_sell_price ? `Sell: ₹${item.target_sell_price}` : '-'}
                        </td>
                        <td className="p-3 text-[11px] text-slate-400 max-w-xs truncate">{item.notes || '-'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleRemove(item.symbol)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Remove from watchlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
    </div>
  );
};
