import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { formatINR, formatPct } from '../../utils/currency';

export const HeroPortfolioCard: React.FC = () => {
  const { portfolio } = useTrading();

  if (!portfolio) {
    return (
      <div className="liquid-glass p-8 h-48 animate-pulse flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading portfolio ledger...</span>
      </div>
    );
  }

  const { metrics } = portfolio;
  const netPnL = metrics.net_pnl;
  const netReturnPct = metrics.net_return_pct;
  const isPositive = netPnL >= 0;

  // Win rate display: based strictly on closed round-trip trades
  const winRateText =
    metrics.total_trades_count > 0
      ? `${metrics.win_rate_pct.toFixed(0)}% (${metrics.winning_trades_count}/${metrics.total_trades_count})`
      : '0% (0 closed)';

  return (
    <div className="liquid-glass hero-card p-6 sm:p-8 relative">
      {/* Diagonal slow sheen sweep */}
      <div className="hero-sheen" />

      {/* Desktop Layout */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        {/* Left: Total Value & Net return */}
        <div>
          <span className="text-xs sm:text-sm font-medium text-muted-labels tracking-wide">
            Total portfolio value
          </span>

          <div className="text-4xl sm:text-[56px] font-bold tracking-tight text-white leading-tight mt-1 mb-2">
            {formatINR(metrics.total_portfolio_value)}
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-profit">
            <span>
              {isPositive ? '+' : ''}
              {formatINR(netPnL)} net after costs
            </span>
            <span>·</span>
            <span>{formatPct(netReturnPct)}</span>
          </div>
        </div>

        {/* Right KPIs (Desktop) */}
        <div className="hidden md:flex items-center gap-8 lg:gap-12 pb-1">
          <div>
            <div className="text-xs font-medium text-muted-labels mb-1">Starting capital</div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {formatINR(metrics.initial_cash)}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-labels mb-1">Available cash</div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {formatINR(metrics.current_cash)}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-labels mb-1">Max drawdown</div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {metrics.max_drawdown_pct.toFixed(1)}%
            </div>
          </div>

          <div>
            <div
              className="text-xs font-medium text-muted-labels mb-1"
              title="Win rate calculated strictly from completed/closed round-trip trades"
            >
              Win rate (closed)
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {winRateText}
            </div>
          </div>
        </div>

        {/* Mobile KPIs (matching media_1792471364220.png) */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10 md:hidden">
          <div>
            <div className="text-[11px] font-medium text-muted-labels">Cash</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {formatINR(metrics.current_cash)}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-muted-labels">Costs</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {formatINR(metrics.total_fees_paid)}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-muted-labels">Drawdown</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {metrics.max_drawdown_pct.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
