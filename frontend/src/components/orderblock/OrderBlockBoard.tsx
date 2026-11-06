import React from 'react';
import { OrderBlockSetup } from '../../types/orderblock';

interface Props {
  bullish: OrderBlockSetup[];
  bearish: OrderBlockSetup[];
  onSelectSymbol: (symbol: string) => void;
}

export const OrderBlockBoard: React.FC<Props> = ({ bullish, bearish, onSelectSymbol }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bullish Board */}
      <div className="bg-[#0b1322]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-4">
          <h3 className="text-emerald-400 font-bold flex items-center gap-2 text-base">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Top Bullish Order Blocks
          </h3>
          <span className="text-xs text-slate-400 font-mono">Ranked by Clean Strength</span>
        </div>

        <div className="space-y-2">
          {bullish.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-500">Scanning for Bullish Accumulation Blocks...</div>
          ) : (
            bullish.map((item, idx) => (
              <div
                key={item.symbol}
                onClick={() => onSelectSymbol(item.symbol)}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500 font-bold w-5">{String(idx + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">{item.symbol}</span>
                      {item.is_pick && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          PICK
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Z: ₹{item.zone_z} | S1: ₹{item.invalidation}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-emerald-400">+{item.day_pct}%</span>
                  <div className="text-[11px] font-mono text-slate-400">R:R 1:{item.rr_ratio}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bearish Board */}
      <div className="bg-[#180d15]/80 backdrop-blur-xl border border-rose-500/20 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-rose-500/20 mb-4">
          <h3 className="text-rose-400 font-bold flex items-center gap-2 text-base">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
            Top Bearish Order Blocks
          </h3>
          <span className="text-xs text-slate-400 font-mono">Ranked by Clean Strength</span>
        </div>

        <div className="space-y-2">
          {bearish.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-500">Scanning for Bearish Distribution Blocks...</div>
          ) : (
            bearish.map((item, idx) => (
              <div
                key={item.symbol}
                onClick={() => onSelectSymbol(item.symbol)}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500 font-bold w-5">{String(idx + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white group-hover:text-rose-400 transition-colors">{item.symbol}</span>
                      {item.is_pick && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30">
                          PICK
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Z: ₹{item.zone_z} | R1: ₹{item.invalidation}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-rose-400">{item.day_pct}%</span>
                  <div className="text-[11px] font-mono text-slate-400">R:R 1:{item.rr_ratio}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
