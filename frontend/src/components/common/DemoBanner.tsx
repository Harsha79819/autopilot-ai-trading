import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';

interface DemoBannerProps {
  isDemo?: boolean;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ isDemo = false }) => {
  const { portfolio } = useTrading();
  const initialCash = portfolio?.initial_cash || 500.00;

  return (
    <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-bold tracking-wide bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px] uppercase">
          {isDemo ? 'DEMO DATA' : 'REAL FEED (PAPER EXECUTION)'}
        </span>
        <span className="text-emerald-200/90 hidden sm:inline">
          {isDemo
            ? 'Operating in simulated paper-trading mode with synthetic market data.'
            : 'Connected to Real-Time Live NSE feed. Execution runs strictly in paper simulation mode.'}
        </span>
      </div>

      <div className="flex items-center gap-3 ml-auto text-[11px] text-emerald-200/80">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300 font-medium">Virtual Capital: {formatINR(initialCash)}</span>
        </span>
        <span className="text-emerald-500/50 hidden md:inline">•</span>
        <span className="hidden md:inline text-emerald-300/80">Live Broker Orders Disabled</span>
      </div>
    </div>
  );
};
