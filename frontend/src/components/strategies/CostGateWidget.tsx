import React, { useState } from 'react';
import { ShieldCheck, Percent, HelpCircle, ArrowRight } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { formatINR } from '../../utils/currency';

export const CostGateWidget: React.FC = () => {
  const [testPrice, setTestPrice] = useState<number>(54.50); // Suzlon default
  const [multiplierK, setMultiplierK] = useState<number>(3.0);

  // Approximate round-trip fee calculation
  const turnover = testPrice;
  const brokerage = Math.min(turnover * 0.0003, 20.0);
  const stt = turnover * 0.00025;
  const exchange = turnover * 0.0000325;
  const gst = (brokerage + exchange) * 0.18;
  const stamp = turnover * 0.00003;
  const statutoryFees = brokerage + stt + exchange + gst + stamp;
  const statutoryPct = (statutoryFees / testPrice) * 100.0;

  const spreadPct = 0.10;
  const slippagePct = 0.10;
  const totalFrictionPct = statutoryPct + spreadPct + slippagePct;
  const requiredHurdlePct = multiplierK * totalFrictionPct;

  return (
    <GlassCard glow="violet" className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center text-accent-violet">
          <Percent className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Cost-Aware Gate Simulator</h3>
          <p className="text-xs text-slate-400">Pre-trade Hurdle Rate: Expected Move ≥ K × Total Friction</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Controls */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Test Stock Price:</span>
              <span className="font-bold text-accent-cyan">{formatINR(testPrice)}</span>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              step="1"
              value={testPrice}
              onChange={(e) => setTestPrice(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-white/10 rounded-lg h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>₹5 (IDEA)</span>
              <span>₹54 (SUZLON)</span>
              <span>₹92 (ZOMATO)</span>
              <span>₹150 (&gt; ₹100)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Safety Multiplier (K):</span>
              <span className="font-bold text-accent-violet">{multiplierK.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1.5"
              max="5.0"
              step="0.5"
              value={multiplierK}
              onChange={(e) => setMultiplierK(Number(e.target.value))}
              className="w-full accent-violet-400 bg-white/10 rounded-lg h-2 cursor-pointer"
            />
          </div>
        </div>

        {/* Diagnostic Output */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Estimated Statutory Fees:</span>
              <span className="font-semibold text-slate-200">{statutoryPct.toFixed(3)}%</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Spread & Slippage Friction:</span>
              <span className="font-semibold text-slate-200">{(spreadPct + slippagePct).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-slate-300 pt-1 border-t border-white/5">
              <span>Total Friction per Round-Trip:</span>
              <span className="font-bold text-amber-400">{totalFrictionPct.toFixed(2)}%</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-between">
            <span className="font-semibold text-accent-violet">Minimum Required Move:</span>
            <span className="text-sm font-bold text-white">+{requiredHurdlePct.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
