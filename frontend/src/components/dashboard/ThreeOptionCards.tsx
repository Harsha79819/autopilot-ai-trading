import React from 'react';
import { Plus, BarChart2, ArrowUp } from 'lucide-react';

interface ThreeOptionCardsProps {
  onOpenInvest: () => void;
  onOpenPortfolio: () => void;
  onOpenWithdraw: () => void;
}

export const ThreeOptionCards: React.FC<ThreeOptionCardsProps> = ({
  onOpenInvest,
  onOpenPortfolio,
  onOpenWithdraw,
}) => {
  return (
    <>
      {/* Desktop View: Three Large Liquid Glass Cards */}
      <div className="hidden sm:grid grid-cols-3 gap-5">
        {/* Card 1: Invest / Add Money */}
        <button
          onClick={onOpenInvest}
          className="liquid-glass liquid-glass-interactive p-6 text-left cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight mb-2">
              Invest / Add Money
            </h3>
            <p className="text-xs text-muted-labels leading-relaxed">
              Add simulated capital or reset the virtual account. Every action is recorded in the audit log.
            </p>
          </div>
        </button>

        {/* Card 2: Portfolio / Profit & Loss */}
        <button
          onClick={onOpenPortfolio}
          className="liquid-glass liquid-glass-interactive p-6 text-left cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight mb-2">
              Portfolio / Profit & Loss
            </h3>
            <p className="text-xs text-muted-labels leading-relaxed">
              Gross and net results, costs, positions and drawdown, all calculated on the backend ledger.
            </p>
          </div>
        </button>

        {/* Card 3: Withdraw Money */}
        <button
          onClick={onOpenWithdraw}
          className="liquid-glass liquid-glass-interactive p-6 text-left cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <ArrowUp className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight mb-2">
              Withdraw Money
            </h3>
            <p className="text-xs text-muted-labels leading-relaxed">
              Paper Trading funds are virtual and cannot be withdrawn.
            </p>
          </div>
        </button>
      </div>

      {/* Mobile View: Three Compact Option Buttons (matching media_1792471364220.png) */}
      <div className="grid grid-cols-3 gap-2.5 sm:hidden">
        <button
          onClick={onOpenInvest}
          className="liquid-glass liquid-glass-interactive p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer min-h-[72px]"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">Invest</span>
        </button>

        <button
          onClick={onOpenPortfolio}
          className="liquid-glass liquid-glass-interactive p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer min-h-[72px]"
        >
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-400 flex items-center justify-center">
            <BarChart2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">Portfolio</span>
        </button>

        <button
          onClick={onOpenWithdraw}
          className="liquid-glass liquid-glass-interactive p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer min-h-[72px]"
        >
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 flex items-center justify-center">
            <ArrowUp className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">Withdraw</span>
        </button>
      </div>
    </>
  );
};
