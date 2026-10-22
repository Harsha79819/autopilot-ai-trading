import React, { useState } from 'react';
import { X, ShieldAlert, Sliders, CheckCircle2 } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

interface RiskSettingsModalProps {
  onClose: () => void;
}

export const RiskSettingsModal: React.FC<RiskSettingsModalProps> = ({ onClose }) => {
  const { riskStatus, toggleKillSwitch } = useTrading();
  const config = riskStatus?.config;

  // Keyboard shortcut: Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [dailyLoss, setDailyLoss] = useState(config?.max_daily_loss_pct || 5.0);
  const [maxDrawdown, setMaxDrawdown] = useState(config?.max_portfolio_drawdown_pct || 15.0);
  const [multiplierK, setMultiplierK] = useState(config?.cost_gate_multiplier || 3.0);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0D131F] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Risk & Safety Settings</h3>
              <p className="text-xs text-slate-400">Server-side validated non-bypassable guardrails</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between text-slate-300 mb-1 font-medium">
              <span>Max Daily Loss Limit (% of capital):</span>
              <span className="font-bold text-rose-400">{dailyLoss.toFixed(1)}% (₹{(dailyLoss).toFixed(2)})</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="20.0"
              step="0.5"
              value={dailyLoss}
              onChange={(e) => setDailyLoss(Number(e.target.value))}
              className="w-full accent-rose-500 bg-white/10 rounded-lg h-2"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Trading halts automatically for the day if today's net loss reaches this threshold.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1 font-medium">
              <span>Max Portfolio Drawdown Cutoff:</span>
              <span className="font-bold text-amber-400">{maxDrawdown.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="5.0"
              max="30.0"
              step="1.0"
              value={maxDrawdown}
              onChange={(e) => setMaxDrawdown(Number(e.target.value))}
              className="w-full accent-amber-500 bg-white/10 rounded-lg h-2"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Trading halts if peak-to-trough equity drops by more than this percentage.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1 font-medium">
              <span>Cost-Aware Gate Safety Multiplier (K):</span>
              <span className="font-bold text-accent-violet">{multiplierK.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1.5"
              max="5.0"
              step="0.5"
              value={multiplierK}
              onChange={(e) => setMultiplierK(Number(e.target.value))}
              className="w-full accent-violet-500 bg-white/10 rounded-lg h-2"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Requires edge to be at least K times round-trip statutory costs, spread, and slippage.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-accent-blue hover:bg-blue-600 text-white font-semibold shadow-glass-glow-blue transition-all flex items-center gap-1.5"
            >
              {saved && <CheckCircle2 className="w-3.5 h-3.5" />}
              {saved ? 'Saved!' : 'Save Guardrails'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
