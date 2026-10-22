import React from 'react';
import { X, ArrowUp, AlertTriangle, ShieldCheck, Clock, Lock } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose }) => {
  const { portfolio } = useTrading();

  // Keyboard shortcut: Escape to close
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass max-w-lg w-full p-6 sm:p-7 relative border border-white/20 shadow-2xl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 flex items-center justify-center">
            <ArrowUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Withdraw Money</h2>
            <span className="text-xs font-semibold text-violet-300">
              PAPER TRADING COMPLIANCE
            </span>
          </div>
        </div>

        {/* Primary Clear Warning Card */}
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white mb-1">
              Virtual Funds Cannot Be Withdrawn
            </h4>
            <p className="text-xs leading-relaxed text-amber-200/90">
              You are currently operating in <strong>Strict Paper Trading</strong> mode with virtual starting capital. These simulated balances represent fictitious test funds and have zero monetary value.
            </p>
            <p className="text-[11px] text-amber-300/80 mt-1.5 font-medium">
              * Note: We do not generate fake withdrawal records to make the demo appear real.
            </p>
          </div>
        </div>

        {/* Simulated Account Breakdown */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 mb-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-labels">Virtual Cash Balance:</span>
            <span className="text-white font-semibold">
              {formatINR(portfolio?.cash_balance ?? 500.0)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-labels">Withdrawable Amount:</span>
            <span className="text-rose-400 font-bold">₹0.00 (Paper Trading)</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-labels">Invested in Open Positions:</span>
            <span className="text-slate-300">
              {formatINR(portfolio?.holdings_value ?? 0.0)}
            </span>
          </div>
        </div>

        {/* Future Real Money Mode Workflow Explanation */}
        <div className="space-y-3 pt-3 border-t border-white/10">
          <h4 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Future Real Money Mode Architecture
          </h4>

          <div className="space-y-2 text-[11px] text-slate-300">
            <div className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Verified Broker Withdrawable Funds:</strong> In live mode, withdrawable balances will be queried directly and confirmed via your authorized broker API.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Indian Exchange Settlement (T+1):</strong> Sales proceeds are subject to exchange clearing cycles. Funds become withdrawable only after trade settlement.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Explicit User Authorization:</strong> The AI will NEVER automatically withdraw funds. Every real withdrawal will require your explicit authentication.
              </span>
            </div>
          </div>
        </div>

        {/* Close Button at Bottom */}
        <div className="mt-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
