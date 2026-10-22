import React from 'react';
import { useTrading } from '../../context/TradingContext';

interface BottomStatusGridProps {
  onOpenDiagnostics?: () => void;
}

export const BottomStatusGrid: React.FC<BottomStatusGridProps> = ({ onOpenDiagnostics }) => {
  const { riskStatus, toggleKillSwitch } = useTrading();
  const isStopped = riskStatus?.is_emergency_stopped || false;

  const handleToggleEmergencyStop = async () => {
    if (isStopped) {
      if (window.confirm('Resume trading automation?')) {
        await toggleKillSwitch(false);
      }
    } else {
      if (window.confirm('Trigger EMERGENCY STOP? This will immediately halt all autonomous trading.')) {
        await toggleKillSwitch(true);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {/* Card 1: Risk Status */}
      <div className="liquid-glass p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <span className="text-xs font-medium text-muted-labels block mb-1">Risk status</span>
          <div
            className={`text-base font-bold mb-1 ${
              isStopped
                ? 'text-loss'
                : riskStatus?.risk_state === 'WARNING'
                ? 'text-warning-demo'
                : 'text-profit'
            }`}
          >
            {isStopped ? 'Emergency stopped' : 'Within limits'}
          </div>
        </div>
        <p className="text-xs text-muted-labels leading-relaxed">
          Daily loss threshold ₹10 is a trigger, not a guaranteed cap.
        </p>
      </div>

      {/* Card 2: Data Source */}
      <div className="liquid-glass p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <span className="text-xs font-medium text-muted-labels block mb-1">Data source</span>
          <div className="text-base font-bold text-emerald-400 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live NSE Feed
            </span>
            {onOpenDiagnostics && (
              <button
                type="button"
                onClick={onOpenDiagnostics}
                className="text-[11px] text-accent-cyan hover:underline font-semibold cursor-pointer"
              >
                Diagnostics →
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-labels leading-relaxed">
          Real-time exchange quotes with paper execution. Whole-share orders with 0.075% slippage buffer.
        </p>
      </div>

      {/* Card 3: Emergency Control */}
      <div className="liquid-glass p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <span className="text-xs font-medium text-muted-labels block mb-3">
            Emergency control
          </span>
          <button
            onClick={handleToggleEmergencyStop}
            className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
              isStopped
                ? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 hover:bg-rose-900/80 border-rose-500/40 text-rose-200'
            }`}
          >
            {isStopped ? 'Resume trading' : 'Emergency stop'}
          </button>
        </div>
      </div>
    </div>
  );
};
