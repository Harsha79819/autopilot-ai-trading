import React, { useState } from 'react';
import { ShoppingCart, AlertCircle, ShieldCheck, Check } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';

export const OrderForm: React.FC = () => {
  const { quotes, portfolio, placeOrder } = useTrading();
  const [symbol, setSymbol] = useState<string>('SUZLON');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(1);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const quote = quotes[symbol];
  const curPrice = quote ? quote.current_price : 54.50;
  const cash = portfolio ? portfolio.cash_balance : 100.00;
  const maxAffordable = Math.floor(cash / curPrice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await placeOrder({
        symbol,
        side,
        quantity,
        order_type: orderType,
        price: orderType === 'LIMIT' && limitPrice ? Number(limitPrice) : undefined,
      });

      if (res.status === 'FILLED') {
        setStatusMessage({
          type: 'success',
          text: `Simulated order FILLED: ${side} ${quantity} ${symbol} @ ₹${res.executed_price?.toFixed(2)}`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Order ${res.status}: ${res.rejection_reason || 'Rejected by simulator'}`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to place order',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard glow="cyan">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan">
          <ShoppingCart className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Manual Paper Order Execution</h3>
          <p className="text-xs text-slate-400">Virtual execution simulator with whole-share enforcement</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {/* Symbol & Side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Select Instrument</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-accent-cyan"
            >
              {Object.keys(quotes).map((sym) => {
                const q = quotes[sym];
                const affordable = q.current_price <= cash;
                return (
                  <option key={sym} value={sym} className="bg-slate-900 text-white">
                    {sym} - ₹{q.current_price.toFixed(2)} {affordable ? '(Eligible)' : '(> ₹100)'}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Side</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`py-1.5 rounded-lg font-bold transition-all ${
                  side === 'BUY'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`py-1.5 rounded-lg font-bold transition-all ${
                  side === 'SELL'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SELL
              </button>
            </div>
          </div>
        </div>

        {/* Quantity (Whole Shares) */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-slate-300 font-medium">Whole Share Quantity (integer ≥ 1)</label>
            <span className="text-slate-400">Max affordable: {maxAffordable} sh</span>
          </div>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-accent-cyan"
          />
        </div>

        {/* Cost Preview */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-slate-300">
          <div className="flex justify-between">
            <span>Estimated Turnover:</span>
            <span className="font-semibold text-white">{formatINR(quantity * curPrice)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Available Cash Balance:</span>
            <span>{formatINR(cash)}</span>
          </div>
        </div>

        {/* Status message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2.5 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 ${
            side === 'BUY'
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-glass-glow-emerald'
              : 'bg-rose-500 hover:bg-rose-600 text-white'
          }`}
        >
          {isSubmitting ? 'Simulating Execution...' : `Submit Simulated ${side} Order`}
        </button>
      </form>
    </GlassCard>
  );
};
