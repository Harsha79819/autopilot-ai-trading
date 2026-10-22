import React, { useEffect, useState } from 'react';
import { LineChart, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { EmptyState } from '../common/EmptyState';
import { Order } from '../../types';
import { api } from '../../services/api';
import { formatINR } from '../../utils/currency';
import { formatTimeOnly } from '../../utils/formatters';

import { useTrading } from '../../context/TradingContext';

export const OrderHistory: React.FC = () => {
  const { lastPortfolioUpdate } = useTrading();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api.getOrders();
        setOrders(data);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [lastPortfolioUpdate]);

  return (
    <GlassCard className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Paper Order Execution Log</h3>
            <p className="text-xs text-slate-400">Virtual order audit log with slippage records</p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 font-medium text-slate-300">
          {orders.length} Orders
        </span>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No Orders Submitted Yet"
          description="Your virtual order book is empty. Simulated orders placed manually or via AutoPilot will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 font-medium">
                <th className="pb-3 pl-2">Time</th>
                <th className="pb-3">Instrument</th>
                <th className="pb-3">Side</th>
                <th className="pb-3 text-right">Qty</th>
                <th className="pb-3 text-right">Price</th>
                <th className="pb-3 text-right">Exec Price</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 pr-2 text-left">Details / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {orders.map((o) => {
                const isFilled = o.status === 'FILLED';
                return (
                  <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pl-2 text-slate-400 font-mono text-[11px]">
                      {formatTimeOnly(o.created_at)}
                    </td>
                    <td className="py-2.5 font-bold text-white">{o.symbol}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          o.side === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {o.side}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-200">
                      {o.requested_quantity} sh
                    </td>
                    <td className="py-2.5 text-right text-slate-300">{formatINR(o.price)}</td>
                    <td className="py-2.5 text-right font-bold text-white">
                      {o.executed_price ? formatINR(o.executed_price) : '--'}
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isFilled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {isFilled ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-slate-400 text-[11px] max-w-xs truncate">
                      {o.rejection_reason || 'Filled at simulated bid/ask with slippage'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
};
