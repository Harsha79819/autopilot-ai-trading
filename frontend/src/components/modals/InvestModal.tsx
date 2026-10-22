import React, { useState } from 'react';
import { X, Plus, RotateCcw, ShieldCheck, AlertCircle, Coins, CheckCircle2 } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';

interface InvestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvestModal: React.FC<InvestModalProps> = ({ isOpen, onClose }) => {
  const { portfolio, depositCapital, resetCapital } = useTrading();
  const [customAmount, setCustomAmount] = useState<string>('500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const handleDeposit = async (amount: number) => {
    try {
      setIsSubmitting(true);
      await depositCapital(amount, `User added virtual simulated funds`);
      setSuccessMsg(`Successfully added ${formatINR(amount)} virtual cash!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Deposit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetTo500 = async () => {
    if (window.confirm('Reset virtual portfolio to clean ₹500.00 cash and wipe previous trades?')) {
      try {
        setIsSubmitting(true);
        await resetCapital(500.0);
        setSuccessMsg('Portfolio reset to clean ₹500.00 cash!');
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
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
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Invest / Add Money</h2>
            <span className="text-xs font-semibold text-violet-300">
              SIMULATED PAPER TRADING MODE
            </span>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Current Available Balance */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 mb-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-labels block">Current Available Cash</span>
            <span className="text-2xl font-bold text-white">
              {formatINR(portfolio?.cash_balance ?? 500.0)}
            </span>
          </div>
          <Coins className="w-8 h-8 text-blue-400 opacity-80" />
        </div>

        {/* Quick Deposit Options */}
        <div className="mb-5">
          <label className="text-xs font-medium text-slate-300 mb-2 block">
            Add Virtual Funds (Simulation Only)
          </label>
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {[500, 1000, 5000].map((amt) => (
              <button
                key={amt}
                onClick={() => handleDeposit(amt)}
                disabled={isSubmitting}
                className="py-2.5 px-3 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/40 text-white transition-all active:scale-95 disabled:opacity-50"
              >
                +{formatINR(amt)}
              </button>
            ))}
          </div>

          {/* Custom Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = parseFloat(customAmount);
              if (val > 0) handleDeposit(val);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min="10"
                max="50000"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Custom amount"
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-medium focus:border-blue-500/60 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>

        {/* Reset Virtual Account */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white mb-0.5">Reset Virtual Account</h4>
              <p className="text-[11px] text-muted-labels">
                Restore capital to fresh ₹500.00 and wipe test trades.
              </p>
            </div>
            <button
              onClick={handleResetTo500}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ₹500
            </button>
          </div>
        </div>

        {/* Disclaimers & Future Live Mode */}
        <div className="space-y-2 text-[11px] text-slate-400 pt-2 border-t border-white/10">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Virtual Money:</strong> All funds are simulated. Virtual money cannot be withdrawn, transferred, or exchanged for real currency. Every simulated action is recorded in the immutable audit log.
            </span>
          </div>

          <div className="flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Future Real Money Mode:</strong> Verified trading capital will link via an authorized SEBI-registered broker gateway. Sensitive credentials (bank passwords, UPI PINs) are never collected.
            </span>
          </div>
        </div>

        {/* Modal Close Action */}
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer active:scale-98"
          >
            <X className="w-4 h-4" />
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
