import React from 'react';
import { MarketBreadth } from '../../types/orderblock';

interface Props {
  data: MarketBreadth | null;
}

export const MarketPictureBar: React.FC<Props> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-[#0c101c]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        {/* Counts */}
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Market Picture</span>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-mono font-bold text-sm">
            ▲ {data.counts.bullish} Bullish
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 font-mono font-bold text-sm">
            ▼ {data.counts.bearish} Bearish
          </div>
        </div>

        {/* Sectors */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
            <span className="text-slate-400 mr-2">Leading:</span>
            <b className="text-emerald-400">{data.leading_sector.sector}</b>
            <span className="ml-1 text-emerald-400">+{data.leading_sector.avg_pct}%</span>
          </div>
          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
            <span className="text-slate-400 mr-2">Lagging:</span>
            <b className="text-rose-400">{data.lagging_sector.sector}</b>
            <span className="ml-1 text-rose-400">{data.lagging_sector.avg_pct}%</span>
          </div>
        </div>
      </div>

      {/* Interactive Dot-Plot Strip */}
      <div className="relative h-10 w-full bg-slate-900/60 rounded-xl border border-white/5 overflow-hidden flex items-center px-4">
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20 z-0" />
        <div className="relative w-full h-full flex items-center">
          {data.dots.slice(0, 100).map((d, idx) => {
            // Map -5% to +5% onto 0% to 100%
            const clamped = Math.max(-5, Math.min(5, d.pct));
            const leftPct = ((clamped + 5) / 10) * 100;
            return (
              <div
                key={idx}
                title={`${d.symbol} (${d.pct}%)`}
                style={{ left: `${leftPct}%` }}
                className={`absolute w-2 h-2 rounded-full transform -translate-x-1/2 transition-all hover:scale-150 cursor-pointer ${
                  d.is_bullish ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
