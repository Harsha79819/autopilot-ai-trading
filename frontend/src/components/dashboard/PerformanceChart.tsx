import React from 'react';
import { LineChart as ChartIcon, Sparkles } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';

export const PerformanceChart: React.FC = () => {
  const { portfolio } = useTrading();

  if (!portfolio) return null;

  const initial = portfolio.initial_cash || 500.00;
  const current = portfolio.total_portfolio_value || 500.00;
  const grossEquity = current + portfolio.total_fees_paid;

  // Generate a smooth sample curve starting at baseline initial capital and reaching current
  const steps = 10;
  const points: { x: number; netY: number; grossY: number }[] = [];
  const minVal = Math.min(initial * 0.95, current, grossEquity) * 0.98;
  const maxVal = Math.max(initial * 1.05, current, grossEquity) * 1.02;
  const range = maxVal - minVal || 1;

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    // Gradual interpolation with subtle realistic market wiggle
    const netVal = initial + (current - initial) * progress + (i > 0 && i < steps ? Math.sin(i * 1.5) * 0.4 : 0);
    const grossVal = initial + (grossEquity - initial) * progress + (i > 0 && i < steps ? Math.sin(i * 1.5) * 0.4 : 0);

    const x = (i / steps) * 100;
    const netY = 100 - ((netVal - minVal) / range) * 100;
    const grossY = 100 - ((grossVal - minVal) / range) * 100;
    points.push({ x, netY, grossY });
  }

  const netPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.netY}`).join(' ');
  const grossPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.grossY}`).join(' ');
  const areaPath = `${netPath} L 100 100 L 0 100 Z`;

  return (
    <GlassCard className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan">
            <ChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Equity Trajectory</h3>
            <p className="text-[11px] text-slate-400">Net Portfolio Capital vs Gross Edge</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan shadow-sm" />
            <span className="text-slate-300">Net Equity: {formatINR(current)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-violet shadow-sm" />
            <span className="text-slate-400">Gross (Before Fees): {formatINR(grossEquity)}</span>
          </div>
        </div>
      </div>

      {/* SVG Responsive Chart */}
      <div className="w-full h-48 sm:h-56 relative pt-2">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Baseline Initial Capital Guideline */}
          <line
            x1="0"
            y1={100 - ((initial - minVal) / range) * 100}
            x2="100"
            y2={100 - ((initial - minVal) / range) * 100}
            stroke="rgba(255, 255, 255, 0.12)"
            strokeDasharray="2,2"
            strokeWidth="0.5"
          />

          {/* Area fill */}
          <path d={areaPath} fill="url(#netGradient)" />

          {/* Gross Path */}
          <path d={grossPath} fill="none" stroke="#8B5CF6" strokeWidth="1.2" strokeDasharray="1.5,1.5" />

          {/* Net Path */}
          <path d={netPath} fill="none" stroke="#06B6D4" strokeWidth="1.8" />

          {/* Current point */}
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].netY} r="2" fill="#06B6D4" className="animate-ping opacity-75" />
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].netY} r="1.5" fill="#06B6D4" />
        </svg>

        <div className="absolute top-2 left-2 text-[10px] text-slate-500 font-mono">
          Baseline Virtual Capital: {formatINR(initial)}
        </div>
      </div>
    </GlassCard>
  );
};
