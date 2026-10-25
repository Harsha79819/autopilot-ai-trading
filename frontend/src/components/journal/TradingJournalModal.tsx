import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  BookOpen,
  Award,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Smile,
  Frown,
  Flame,
  BrainCircuit,
  RefreshCw,
  Scale,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';
import { TradingJournalEntry, TradingJournalSummary } from '../../types';
import { formatINR } from '../../utils/currency';

interface TradingJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOTION_OPTIONS = [
  { value: 'DISCIPLINED', label: 'Disciplined', icon: Smile, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'FOMO', label: 'FOMO Entry', icon: Flame, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'GREED', label: 'Greed / Overstay', icon: TrendingUp, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { value: 'FEAR', label: 'Fear / Panic Exit', icon: Frown, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { value: 'REVENGE', label: 'Revenge Trade', icon: AlertTriangle, color: 'text-red-500 bg-red-500/10 border-red-500/30' },
];

export const TradingJournalModal: React.FC<TradingJournalModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<TradingJournalSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchJournal = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getTradingJournal(50);
      setData(res);
    } catch (err) {
      console.error('Failed to load trading journal:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchJournal();
    }
  }, [isOpen, fetchJournal]);

  const handleUpdateEmotion = async (entryId: number, newEmotion: string) => {
    try {
      setUpdatingId(entryId);
      const updated = await api.updateJournalEmotion(entryId, newEmotion);
      setData((prev) => {
        if (!prev) return null;
        const updatedEntries = prev.entries.map((e) => (e.id === entryId ? updated : e));
        const disciplinedCount = updatedEntries.filter((e) => e.emotion_tag === 'DISCIPLINED').length;
        const total = updatedEntries.length;
        return {
          ...prev,
          disciplined_trades_pct: total > 0 ? Math.round((disciplinedCount / total) * 1000) / 10 : 0,
          entries: updatedEntries,
        };
      });
    } catch (err) {
      console.error('Failed to update emotion:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl my-8 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  15-Day Trading Journal & Psychology Tracker
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                  Rule 4 Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated trade rationale, 1:2 Risk-Reward verification, emotional state tagging, and AI critique
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchJournal}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Refresh Journal"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Golden Rules Quick Card */}
        <div className="p-4 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-indigo-950/40 border-b border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">Rule 1: Equity Only</span>
                <span className="text-[11px] text-slate-400">Zero Options on ₹5,000 capital</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-start gap-2">
              <Scale className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">Rule 2: Strict 1:2 RR</span>
                <span className="text-[11px] text-slate-400">TP: +3.0% / SL: -1.5%</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-start gap-2">
              <Award className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">Rule 3: 1.5% Risk</span>
                <span className="text-[11px] text-slate-400">Van Tharp Capital Sizing</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-start gap-2">
              <BrainCircuit className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">Rule 4: Auto Journal</span>
                <span className="text-[11px] text-slate-400">AI Critique + Psychology</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-950/40 border-b border-white/5">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
              <span className="text-[11px] text-slate-400 font-medium">Logged Trades</span>
              <p className="text-lg font-bold text-white mt-0.5">{data.total_trades_logged}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
              <span className="text-[11px] text-slate-400 font-medium">Win Rate</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">{data.win_rate_pct}%</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
              <span className="text-[11px] text-slate-400 font-medium">Avg Risk-Reward</span>
              <p className="text-lg font-bold text-cyan-400 mt-0.5">1 : {data.avg_risk_reward_ratio}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
              <span className="text-[11px] text-slate-400 font-medium">Disciplined %</span>
              <p className="text-lg font-bold text-indigo-400 mt-0.5">{data.disciplined_trades_pct}%</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 font-medium">Net Realized PnL</span>
              <p className={`text-lg font-bold mt-0.5 ${data.net_realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatINR(data.net_realized_pnl)}
              </p>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading && !data && (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-cyan-400" />
              Loading trading journal records...
            </div>
          )}

          {data && data.entries.length === 0 && (
            <div className="py-16 text-center rounded-xl border border-white/5 bg-slate-900/40 p-6">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Journaled Trades Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                When the AutoPilot bot or manual swing trades execute and close on Take-Profit (+3.0%) or Stop-Loss (-1.5%),
                complete journal records with AI critiques will automatically appear here.
              </p>
            </div>
          )}

          {data && data.entries.map((entry) => {
            const isProfit = entry.realized_pnl >= 0;
            const currentEmotion = EMOTION_OPTIONS.find((e) => e.value === entry.emotion_tag) || EMOTION_OPTIONS[0];

            return (
              <div
                key={entry.id}
                className="p-4 rounded-xl bg-slate-800/30 border border-white/5 hover:border-white/10 transition-colors space-y-3"
              >
                {/* Top Row: Symbol, Side, Prices, PnL */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-800 text-white border border-white/10">
                      {entry.symbol}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      entry.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {entry.side} {entry.quantity} shares
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      1 : {entry.risk_reward_ratio} RR
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`text-sm font-bold flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
                        {formatINR(entry.realized_pnl)} ({entry.realized_pnl_pct > 0 ? '+' : ''}{entry.realized_pnl_pct.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Entry/Exit & Risk Numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Entry Price</span>
                    <span className="font-medium text-slate-200">₹{entry.entry_price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Exit Price</span>
                    <span className="font-medium text-slate-200">₹{entry.exit_price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Stop Loss / Target</span>
                    <span className="font-medium text-slate-300">
                      ₹{entry.stop_loss.toFixed(2)} / ₹{entry.take_profit.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Risk at Stake</span>
                    <span className="font-medium text-slate-300">₹{entry.risk_amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Setup & Exit Rationale */}
                <div className="text-xs space-y-1 text-slate-300">
                  <div>
                    <span className="text-slate-400 font-semibold">Setup Reason: </span>
                    <span className="text-slate-300">{entry.setup_reason}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Exit Trigger: </span>
                    <span className="text-slate-300">{entry.exit_reason}</span>
                  </div>
                </div>

                {/* AI Critique & Emotional Tag */}
                <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2 text-xs text-slate-400 flex-1">
                    <BrainCircuit className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-cyan-300">AI Critique:</strong> {entry.ai_critique || 'Trade strictly executed within risk boundary and automated parameters.'}
                    </span>
                  </div>

                  {/* Emotion Tag Picker */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400">Psychology:</span>
                    <select
                      value={entry.emotion_tag}
                      disabled={updatingId === entry.id}
                      onChange={(e) => handleUpdateEmotion(entry.id, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border bg-slate-900 cursor-pointer transition-colors ${currentEmotion.color}`}
                    >
                      {EMOTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
