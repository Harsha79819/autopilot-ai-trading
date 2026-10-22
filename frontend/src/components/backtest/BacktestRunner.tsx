import React, { useState } from 'react';
import { Sliders, Play, AlertCircle } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { BacktestResponse } from '../../types';
import { api } from '../../services/api';
import { BacktestResults } from './BacktestResults';

export const BacktestRunner: React.FC = () => {
  const [strategyName, setStrategyName] = useState<string>('MomentumBreakout');
  const [symbol, setSymbol] = useState<string>('SUZLON');
  const [initialCapital, setInitialCapital] = useState<number>(100.0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setError(null);
    try {
      const data = await api.runBacktest({
        strategy_name: strategyName,
        symbol,
        initial_capital: initialCapital,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Backtest failed to execute');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard glow="violet">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center text-accent-violet">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Quantitative Backtesting Lab</h2>
            <p className="text-xs text-slate-400">
              Chronological train/validation/test splits preventing look-ahead and survivorship bias
            </p>
          </div>
        </div>

        <form onSubmit={handleRun} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Strategy</label>
            <select
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-accent-violet"
            >
              <option value="MomentumBreakout" className="bg-slate-900">Momentum EMA Breakout</option>
              <option value="MeanReversionRSI" className="bg-slate-900">RSI Mean Reversion</option>
              <option value="TrendFollowing" className="bg-slate-900">Supertrend ATR Rider</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Stock Universe Symbol</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-accent-violet"
            >
              <option value="SUZLON" className="bg-slate-900">SUZLON (₹54.50)</option>
              <option value="IDEA" className="bg-slate-900">IDEA (₹7.50)</option>
              <option value="YESBANK" className="bg-slate-900">YESBANK (₹19.20)</option>
              <option value="ZOMATO" className="bg-slate-900">ZOMATO (₹92.80)</option>
              <option value="TATAMOTORS" className="bg-slate-900">TATAMOTORS (₹845.00)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Virtual Capital (INR)</label>
            <input
              type="number"
              min="10"
              step="10"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-accent-violet font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isRunning}
              className="w-full py-2.5 rounded-xl font-bold bg-accent-violet hover:bg-violet-600 text-white shadow-glass-glow-violet transition-all flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunning ? 'Simulating...' : 'Run Backtest'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </GlassCard>

      {result && <BacktestResults result={result} />}
    </div>
  );
};
