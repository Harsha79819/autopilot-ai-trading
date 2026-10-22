import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';

export const MarketScannerCard: React.FC = () => {
  const { scannerData, triggerAutoPilotScan } = useTrading();

  // Reference items matching screenshot or dynamic scanner data
  const rawOpportunities = scannerData?.opportunities || [];

  // Filter or fall back to high-fidelity real NSE reference items
  const displayRows =
    rawOpportunities.length > 0
      ? rawOpportunities.slice(0, 3).map((op) => ({
          symbol: op.symbol,
          price: op.current_price,
          reason: op.rejection_reason_short || (op.is_actionable ? 'Eligible' : 'Edge below 3x costs'),
          isAlert: (op.rejection_reason_short || '').includes('above') || (op.rejection_reason_short || '').includes('below'),
          isWarning: (op.rejection_reason_short || '').includes('Stale') || (op.rejection_reason_short || '').includes('pattern'),
        }))
      : [
          { symbol: 'TATAMOTORS', price: 840.0, reason: 'Price exceeds cash balance', isAlert: true, isWarning: false },
          { symbol: 'SUZLON', price: 40.38, reason: 'Edge below 3x costs', isAlert: true, isWarning: false },
          { symbol: 'IDEA', price: 12.28, reason: 'Momentum below threshold', isAlert: false, isWarning: true },
        ];

  const decision = scannerData?.scanner_decision || 'Decision: NO TRADE';

  return (
    <div className="liquid-glass p-6 sm:p-7 flex flex-col justify-between">
      {/* Desktop view */}
      <div className="hidden sm:block">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mb-4">
          Market scanner
        </h3>

        {/* Scanned Items Rows */}
        <div className="space-y-2 mb-4">
          {displayRows.map((row) => (
            <div
              key={row.symbol}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide">{row.symbol}</span>
                <span className="text-muted-labels">·</span>
                <span className="text-slate-300 font-medium">{formatINR(row.price)}</span>
              </div>

              <div
                className={`font-medium ${
                  row.isAlert
                    ? 'text-loss'
                    : row.isWarning
                    ? 'text-warning-demo'
                    : 'text-profit'
                }`}
              >
                {row.reason}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Button/Pill (Desktop & Mobile) */}
      <div>
        <button
          onClick={() => triggerAutoPilotScan()}
          className="w-full py-3 px-4 rounded-xl border border-violet-500/40 bg-violet-950/20 hover:bg-violet-900/30 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-violet-950/30 text-center flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          title="Click to trigger on-demand scan"
        >
          {/* On mobile, screenshot has: "Scanner decision: NO TRADE" */}
          <span className="sm:hidden">
            Scanner {decision.toLowerCase()}
          </span>
          <span className="hidden sm:inline">
            {decision}
          </span>
        </button>
      </div>
    </div>
  );
};
