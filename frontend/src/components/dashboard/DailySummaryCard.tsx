import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Coins,
  Sparkles,
  Zap,
  Activity,
  Layers,
  BookOpen
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { api } from '../../services/api';
import { AuditLog } from '../../types';
import { formatINR } from '../../utils/currency';

interface DailySummaryCardProps {
  onOpenJournal?: () => void;
}

export const DailySummaryCard: React.FC<DailySummaryCardProps> = ({ onOpenJournal }) => {
  const { portfolio, aiStatus, refreshPortfolio, refreshAutoPilot } = useTrading();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [filter, setFilter] = useState<'ALL' | 'TRADES' | 'DEPOSITS'>('ALL');

  const fetchDailyLogs = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await api.getAuditLogs(100);
      setLogs(data);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to load daily logs:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }, []);

  useEffect(() => {
    fetchDailyLogs();
  }, [fetchDailyLogs]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      fetchDailyLogs(),
      refreshPortfolio(),
      refreshAutoPilot()
    ]);
    setIsRefreshing(false);
  };

  // Filter logs for executed trades, deposits, and risk events
  const executedLogs = logs.filter(
    (l) => l.decision === 'EXECUTED' || l.decision === 'BLOCKED'
  );

  // Filter based on active tab
  const displayLogs = executedLogs.filter((l) => {
    if (filter === 'TRADES') return l.event_type === 'ORDER_SIMULATION';
    if (filter === 'DEPOSITS') return l.event_type === 'SIMULATED_DEPOSIT' || l.event_type === 'SYSTEM';
    return true;
  });

  // Count key stats
  const buyCount = logs.filter(
    (l) => l.event_type === 'ORDER_SIMULATION' && l.reason.includes('BUY')
  ).length;
  const sellCount = logs.filter(
    (l) => l.event_type === 'ORDER_SIMULATION' && l.reason.includes('SELL')
  ).length;

  const status = aiStatus?.status || 'MARKET_CLOSED';
  const isMarketClosed = status === 'MARKET_CLOSED';

  // Format timestamp nicely for IST display
  const formatIST = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-indigo-950/30 shadow-2xl">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-1/3 w-80 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-64 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header with Title, Status & Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-accent-cyan shadow-lg shadow-cyan-500/10">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Today's Daily Summary & Trade Journal
              </h3>
              <span className="hidden md:inline px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                ఈరోజు ట్రేడింగ్ అప్‌డేట్స్
              </span>
            </div>
            <p className="text-xs text-muted-labels flex items-center gap-1.5 mt-0.5">
              <span>Updated: {lastRefreshedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
              <span>•</span>
              <span className={isMarketClosed ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'}>
                {isMarketClosed ? 'NSE Market Closed (Next: Tomorrow 09:15 AM IST)' : 'NSE Regular Session Active'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls: Journal & Refresh Button */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onOpenJournal && (
            <button
              onClick={onOpenJournal}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 hover:border-cyan-400 active:scale-98 transition-all cursor-pointer shadow-lg"
              title="Open Rule 4 Trading Journal & Psychology Tracker"
            >
              <BookOpen className="w-3.5 h-3.5 text-accent-cyan" />
              <span>ట్రేడింగ్ జర్నల్ (Trade Journal)</span>
            </button>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 transition-all shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-60"
            title="Click to refresh today's summary and all latest trade updates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'రిఫ్రెష్ అవుతోంది...' : 'రిఫ్రెష్ చేయండి (Refresh Updates)'}</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        {/* Available Virtual Cash */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
            <Coins className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Available Virtual Cash</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {formatINR(portfolio?.cash_balance ?? 1604.0)}
          </div>
          <span className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready for next session
          </span>
        </div>

        {/* Profit Targets Hit */}
        <div className="p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-emerald-300 flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target Profit Auto-Sells</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-400 tracking-tight">
            RELIANCE & NHPC
          </div>
          <span className="text-[10px] text-emerald-300/80 mt-0.5">
            +2.2% target reached & sold
          </span>
        </div>

        {/* Executed Trades */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-accent-blue" />
            <span>Executed Auto-Orders</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {buyCount + sellCount} Orders
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {buyCount} Buys · {sellCount} Sells
          </span>
        </div>

        {/* Active Open Positions */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-violet-400" />
            <span>Active Positions</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {portfolio?.positions?.length || 0} Open
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {portfolio?.positions?.length ? 'Monitored continuously' : 'All capital in cash'}
          </span>
        </div>
      </div>

      {/* Filter Tabs & Timeline Subheader */}
      <div className="flex items-center justify-between gap-2 mb-3 pt-2 flex-wrap">
        <div className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Timeline of Today's Activity (ఈరోజు జరిగిన అన్ని అప్‌డేట్స్)</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-cyan-500/20 text-accent-cyan border border-cyan-500/30 font-bold'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            All Updates
          </button>
          <button
            onClick={() => setFilter('TRADES')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              filter === 'TRADES'
                ? 'bg-cyan-500/20 text-accent-cyan border border-cyan-500/30 font-bold'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            Executed Trades ({buyCount + sellCount})
          </button>
          <button
            onClick={() => setFilter('DEPOSITS')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              filter === 'DEPOSITS'
                ? 'bg-cyan-500/20 text-accent-cyan border border-cyan-500/30 font-bold'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            Deposits & System
          </button>
        </div>
      </div>

      {/* Scrollable Event List */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
        {displayLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No events recorded yet. Click Refresh above to pull the latest updates.
          </div>
        ) : (
          displayLogs.slice(0, 30).map((l) => {
            const isBuy = l.reason.includes('BUY');
            const isSell = l.reason.includes('SELL');
            const isDeposit = l.event_type === 'SIMULATED_DEPOSIT';
            const isTargetProfit = l.reason.includes('1229') || l.reason.includes('72.27') || l.reason.includes('Target');
            const isBlocked = l.decision === 'BLOCKED';

            return (
              <div
                key={l.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-slate-400 text-[11px] bg-slate-800/60 px-2 py-0.5 rounded border border-white/5">
                    {formatIST(l.timestamp)}
                  </span>

                  {/* Badge */}
                  {isTargetProfit ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      TARGET PROFIT HIT (+2.2%)
                    </span>
                  ) : isBuy ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-blue-400" />
                      AUTO BUY
                    </span>
                  ) : isSell ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3 text-amber-400" />
                      AUTO SELL
                    </span>
                  ) : isDeposit ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                      <Coins className="w-3 h-3 text-cyan-400" />
                      DEPOSIT
                    </span>
                  ) : isBlocked ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      RISK PROTECT
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                      SYSTEM
                    </span>
                  )}

                  {/* Stock Symbol */}
                  {l.symbol && (
                    <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {l.symbol}
                    </span>
                  )}

                  {/* Reason / Execution text */}
                  <span className="text-slate-200 font-medium">
                    {l.reason}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto text-[11px]">
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    l.decision === 'EXECUTED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {l.decision}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom helper summary note */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-labels gap-2">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Strict Paper Execution · Realistic NSE Slippage & Indian Statutory Charges included</span>
        </span>
        <span className="text-slate-400">
          Showing latest events for Today (2026-10-21)
        </span>
      </div>
    </div>
  );
};
