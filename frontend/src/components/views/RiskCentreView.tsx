import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Scale,
  TrendingDown,
  AlertTriangle,
  Flame,
  CheckCircle2,
  RefreshCw,
  Coins
} from 'lucide-react';
import { api } from '../../services/api';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';

export const RiskCentreView: React.FC = () => {
  const { portfolio, riskStatus } = useTrading();

  // Position Sizing Calculator state
  const [accountSize, setAccountSize] = useState(portfolio?.cash_balance || 5000);
  const [riskPerTradePct, setRiskPerTradePct] = useState(1.5);
  const [stockPrice, setStockPrice] = useState(1500);
  const [stopLossPct, setStopLossPct] = useState(1.5);

  // Stress Test State
  const [crashDropPct, setCrashDropPct] = useState(-10);
  const [simResult, setSimResult] = useState<any>(null);
  const [loadingSim, setLoadingSim] = useState(false);

  // Position Sizing Math
  const capitalAtRisk = accountSize * (riskPerTradePct / 100.0);
  const riskPerShare = stockPrice * (stopLossPct / 100.0);
  const recommendedQuantity = riskPerShare > 0 ? Math.floor(capitalAtRisk / riskPerShare) : 0;
  const maxAllocation = accountSize * 0.20;
  const maxAllowedQtyByCap = stockPrice > 0 ? Math.floor(maxAllocation / stockPrice) : 0;
  const finalQuantity = Math.min(recommendedQuantity, maxAllowedQtyByCap);
  const totalTradeValue = finalQuantity * stockPrice;

  // Run stress simulation
  const runSimulation = async (pct: number) => {
    try {
      setLoadingSim(true);
      const res = await api.simulateMarketShock(pct);
      setSimResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSim(false);
    }
  };

  useEffect(() => {
    runSimulation(crashDropPct);
  }, [crashDropPct]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Risk Management Centre & Stress Testing
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Van Tharp 1.5% position sizing, what-if market shocks, downside stress modeling, and circuit breaker guardrails
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Van Tharp Position Sizing Calculator */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <Scale className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Van Tharp 1.5% Capital Sizing Calculator</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Account Size: {formatINR(accountSize)}
              </label>
              <input
                type="range"
                min="500"
                max="500000"
                step="500"
                value={accountSize}
                onChange={(e) => setAccountSize(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Stock Price: {formatINR(stockPrice)}
              </label>
              <input
                type="range"
                min="100"
                max="10000"
                step="50"
                value={stockPrice}
                onChange={(e) => setStockPrice(Number(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Max Risk: {riskPerTradePct}%</label>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={riskPerTradePct}
                  onChange={(e) => setRiskPerTradePct(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Stop Loss: -{stopLossPct}%</label>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={stopLossPct}
                  onChange={(e) => setStopLossPct(Number(e.target.value))}
                  className="w-full accent-rose-400"
                />
              </div>
            </div>
          </div>

          {/* Sizing Results */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Capital at Stake</span>
                <span className="font-bold text-rose-400">{formatINR(capitalAtRisk)}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Recommended Qty</span>
                <span className="font-bold text-cyan-400 text-sm">{finalQuantity} Shares</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-white/5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block">Total Allocation</span>
                <span className="font-bold text-white">{formatINR(totalTradeValue)}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              🛡️ Even if the stop-loss is hit immediately, your account will only lose {formatINR(capitalAtRisk)} ({riskPerTradePct}%), leaving {formatINR(accountSize - capitalAtRisk)} fully protected.
            </p>
          </div>
        </div>

        {/* Right Card: Market Shock & Crash Simulator */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">What-If Market Crash Simulator</h3>
            </div>
            <span className="text-xs font-bold text-rose-400">{crashDropPct}% Drop</span>
          </div>

          <div className="space-y-3">
            <label className="text-xs text-slate-400 block">Hypothetical Index Shock:</label>
            <div className="flex items-center gap-2">
              {[-5, -10, -15, -20, -25].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setCrashDropPct(pct)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    crashDropPct === pct
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-lg'
                      : 'bg-slate-950 text-slate-400 border-white/5 hover:border-white/10'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Output */}
          {simResult && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Current Portfolio Value</span>
                  <span className="text-base font-bold text-white">{formatINR(simResult.starting_portfolio_value)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Projected Value After Drop</span>
                  <span className="text-base font-bold text-rose-400">{formatINR(simResult.projected_portfolio_value)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-300">Estimated Portfolio Loss:</span>
                  <span className="text-rose-400">-{formatINR(simResult.estimated_loss_inr)} ({simResult.portfolio_impact_pct}%)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Projected Peak Drawdown:</span>
                  <span className="text-amber-400">{simResult.projected_drawdown_pct}%</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Risk Status:</span>
                  <span className="font-bold text-indigo-400">{simResult.risk_assessment}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
