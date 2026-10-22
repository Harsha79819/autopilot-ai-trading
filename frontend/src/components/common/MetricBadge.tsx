import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricBadgeProps {
  value: number;
  suffix?: string;
  isPercent?: boolean;
}

export const MetricBadge: React.FC<MetricBadgeProps> = ({
  value,
  suffix = '',
  isPercent = false,
}) => {
  const isPositive = value > 0;
  const isZero = Math.abs(value) < 0.001;

  if (isZero) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
        <Minus className="w-3 h-3" />
        0.00{suffix}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        isPositive
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      }`}
    >
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isPositive ? '+' : ''}
      {value.toFixed(2)}
      {isPercent ? '%' : suffix}
    </span>
  );
};
