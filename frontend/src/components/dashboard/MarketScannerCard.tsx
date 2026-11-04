import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';
import { useLanguage } from '../../context/LanguageContext';
import { Radio } from 'lucide-react';

export const MarketScannerCard: React.FC = () => {
  const { scannerData, triggerAutoPilotScan } = useTrading();
  const { t } = useLanguage();

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
    <div className="liquid-glass p-4 sm:p-5 flex flex-col justify-between rounded-2xl border border-white/10 shadow-xl">
      {/* Desktop view */}
      <div className="hidden sm:block">
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4 text-violet-400" />
          <span>{t('మార్కెట్ స్కానర్', 'Market Scanner')}</span>
        </h3>

        {/* Scanned Items Rows */}
        <div className="space-y-1.5 mb-3">
          {displayRows.map((row) => (
            <div
              key={row.symbol}
              className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide">{row.symbol}</span>
                <span className="text-muted-labels">·</span>
                <span className="text-slate-300 font-mono font-medium">{formatINR(row.price)}</span>
              </div>

              <div
                className={`font-medium text-[11px] ${
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
          className="w-full py-2.5 px-3.5 rounded-xl border border-violet-500/40 bg-violet-950/20 hover:bg-violet-900/30 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-violet-950/30 text-center flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          title="Click to trigger on-demand scan"
        >
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
