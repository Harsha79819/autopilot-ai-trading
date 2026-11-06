import React, { useEffect, useState } from 'react';

interface Props {
  symbol: string | null;
  onClose: () => void;
}

export const OrderBlockModal: React.FC<Props> = ({ symbol, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`/api/v1/orderblock/popup/${symbol}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [symbol]);

  if (!symbol) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b0f19] border border-white/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-white">{symbol}</h2>
              <span className="text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-semibold">
                {data?.sector || 'F&O'}
              </span>
              <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                Alignment: {data?.alignment_score || '4/4'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">10-Second Order Block & Liquidity Check</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {loading || !data ? (
          <div className="p-12 text-center text-slate-400 font-mono">Loading Order Block Anatomy...</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* 6-Step Metric Ladder */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Zone (Z)</span>
                <span className="text-lg font-mono font-bold text-cyan-400">₹{data.levels.zone_z}</span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Stop (S1 / R1)</span>
                <span className="text-lg font-mono font-bold text-rose-400">₹{data.levels.invalidation_s1}</span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Risk / Share</span>
                <span className="text-lg font-mono font-bold text-amber-400">₹{data.levels.risk_per_share}</span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target 1 (R1)</span>
                <span className="text-lg font-mono font-bold text-emerald-400">₹{data.levels.target_r1}</span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target 2 (R2)</span>
                <span className="text-lg font-mono font-bold text-emerald-300">₹{data.levels.target_r2}</span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Risk : Reward</span>
                <span className="text-lg font-mono font-bold text-purple-400">1 : {data.levels.rr_ratio}</span>
              </div>
            </div>

            {/* Candlestick Stage Preview */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/10 relative overflow-hidden">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
                <span>5M Price vs Order Block Zone</span>
                <span className="text-cyan-400">VWAP: ₹{data.vwap}</span>
              </div>
              <svg viewBox="0 0 400 120" className="w-full h-32 overflow-visible">
                {/* Zone Box */}
                <rect x="120" y="55" width="260" height="25" fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" strokeDasharray="3 3" />
                <text x="125" y="50" fill="#06b6d4" fontSize="10" fontFamily="monospace">Zone Z: ₹{data.levels.zone_z}</text>
                
                {/* Stop Loss Line */}
                <line x1="0" y1="80" x2="400" y2="80" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 2" />
                <text x="5" y="93" fill="#f43f5e" fontSize="9" fontFamily="monospace">Invalidation S1: ₹{data.levels.invalidation_s1}</text>

                {/* Target Lines */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="#10b981" strokeWidth="1.5" />
                <text x="5" y="16" fill="#10b981" fontSize="9" fontFamily="monospace">Liquidity Target R2: ₹{data.levels.target_r2}</text>
              </svg>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Paper Order triggered for ${symbol} at Zone Z`);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/25 cursor-pointer"
              >
                Paper Trade at Zone Z
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
