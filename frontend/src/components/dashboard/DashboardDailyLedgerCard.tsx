import React, { useState, useEffect, useMemo } from 'react';
import { 
  Table, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Sparkles, 
  Calendar, 
  Filter, 
  ChevronRight, 
  Info, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowUpDown, 
  HelpCircle 
} from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { api } from '../../services/api';
import { DailyLedgerEntry } from '../../types';
import { formatINR } from '../../utils/currency';
import { useLanguage } from '../../context/LanguageContext';
import { useTrading } from '../../context/TradingContext';

export const DashboardDailyLedgerCard: React.FC = () => {
  const { language, t } = useLanguage();
  const { portfolio, lastPortfolioUpdate } = useTrading();
  const [ledgerDays, setLedgerDays] = useState<DailyLedgerEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<DailyLedgerEntry | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'TRADES_ONLY' | 'PROFIT_DAYS'>('ALL');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  useEffect(() => {
    let isMounted = true;
    const fetchLedger = async () => {
      try {
        setLoading(true);
        const data = await api.getDailyLedger();
        if (isMounted && data && Array.isArray(data.days)) {
          setLedgerDays(data.days);
        }
      } catch (err) {
        console.error('Failed to load daily ledger in card:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLedger();
    return () => { isMounted = false; };
  }, [lastPortfolioUpdate]);

  const displayData = useMemo(() => {
    let filtered = ledgerDays;
    if (filterMode === 'TRADES_ONLY') {
      filtered = ledgerDays.filter(d => (d.total_trades ?? (d.buys_count + d.sells_count)) > 0);
    } else if (filterMode === 'PROFIT_DAYS') {
      filtered = ledgerDays.filter(d => d.net_pnl > 0);
    }
    const sorted = [...filtered].sort((a, b) => {
      return sortOrder === 'DESC' ? b.day_number - a.day_number : a.day_number - b.day_number;
    });
    return sorted;
  }, [ledgerDays, filterMode, sortOrder]);

  const maxRecordedDay = useMemo(() => {
    if (ledgerDays.length === 0) return 1;
    return Math.max(...ledgerDays.map(d => d.day_number), 1);
  }, [ledgerDays]);

  const handleDownload = async () => {
    if (ledgerDays.length === 0) return;
    try {
      setIsDownloading(true);
      await api.downloadDailyLedgerCsv();
    } catch (err) {
      console.error('Download failed, generating client-side CSV:', err);
      // Client-side fallback CSV download
      const headers = ['Day', 'Date', 'Opening Capital', 'Buys', 'Sells', 'Stocks Traded', 'Gross PnL', 'Fees', 'Net PnL', 'Closing Cash', 'Total Equity', 'Status', 'AI Decision Rationale'];
      const rows = ledgerDays.map(d => [
        d.day_number,
        d.date,
        d.opening_capital,
        d.buys_count,
        d.sells_count,
        `"${d.stocks_traded || 'None'}"`,
        d.gross_pnl,
        d.charges_fees,
        d.net_pnl,
        d.closing_capital,
        d.total_equity ?? d.closing_capital,
        d.discipline_status,
        `"${(d.ai_decision_summary || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'AutoPilot_Trading_Daily_Ledger.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <GlassCard className="p-3.5 sm:p-6 mb-8 border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Decorative ambient accent */}
      <div className="absolute top-0 right-1/4 w-96 h-28 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-1/4 w-96 h-28 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {t('రోజువారీ ట్రేడింగ్ లెడ్జర్ (Excel షీట్ వ్యూ)', 'Daily Trading Ledger (Excel Sheet View)')}
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {t('100% పారదర్శకత', '100% Transparent')}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  'ప్రారంభ మూలధనం నుండి నేటి వరకు ప్రతి రోజు లెక్కలు, ఆర్డర్లు, లాభాలు, ఖర్చులు మరియు పోర్ట్‌ఫోలియో వివరాలు.',
                  'Complete Day-by-Day ledger: newest days displayed first with instant sort toggle and Excel export.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Distinct Radio Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Distinct Radio Filter Pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-white/10 text-xs">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`flex items-center px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/60 shadow-sm font-bold ring-1 ring-cyan-400/40'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full mr-1.5 inline-block ${filterMode === 'ALL' ? 'bg-cyan-400 ring-2 ring-cyan-400/50' : 'border border-slate-500'}`} />
              <span>{t('అన్నీ (రోజువారీ)', 'All Days')}</span>
            </button>

            <button
              onClick={() => setFilterMode('TRADES_ONLY')}
              className={`flex items-center px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterMode === 'TRADES_ONLY'
                  ? 'bg-blue-500/20 text-blue-200 border border-blue-400/60 shadow-sm font-bold ring-1 ring-blue-400/40'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full mr-1.5 inline-block ${filterMode === 'TRADES_ONLY' ? 'bg-blue-400 ring-2 ring-blue-400/50' : 'border border-slate-500'}`} />
              <span>{t('ట్రేడ్స్ మాత్రమే', 'Trades Only')}</span>
            </button>

            <button
              onClick={() => setFilterMode('PROFIT_DAYS')}
              className={`flex items-center px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterMode === 'PROFIT_DAYS'
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/60 shadow-sm font-bold ring-1 ring-emerald-400/40'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full mr-1.5 inline-block ${filterMode === 'PROFIT_DAYS' ? 'bg-emerald-400 ring-2 ring-emerald-400/50' : 'border border-slate-500'}`} />
              <span>{t('లాభాల రోజులు', 'Profitable Days')}</span>
            </button>
          </div>

          {/* Sort Order Toggle Button (Latest First vs Oldest First) */}
          <button
            onClick={() => setSortOrder(prev => (prev === 'DESC' ? 'ASC' : 'DESC'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/50 border border-cyan-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
            title={t('క్రమాన్ని మార్చు (నవీన రోజులు పైన / పాత రోజులు పైన)', 'Toggle Sort Order')}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {sortOrder === 'DESC'
                ? t(`🔥 నవీన రోజులు పైన (Day ${maxRecordedDay} → 1)`, `Latest First (Day ${maxRecordedDay} → 1)`)
                : t(`పాత రోజులు పైన (Day 1 → ${maxRecordedDay})`, `Oldest First (Day 1 → ${maxRecordedDay})`)}
            </span>
          </button>

          {/* 1-Click Excel CSV Export */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/30 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Download Full Ledger in Excel CSV format"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? t('డౌన్‌లోడ్ అవుతోంది...', 'Downloading...') : t('Excel CSV డౌన్‌లోడ్', 'Excel CSV Export')}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      {(() => {
        const totalDeposit = portfolio?.initial_cash ?? 0;
        const currentEquity = portfolio?.total_portfolio_value ?? (portfolio?.cash_balance ?? 0);
        const liquidCash = portfolio?.cash_balance ?? 0;
        const holdingsVal = Math.max(0, currentEquity - liquidCash);
        const netLifetimeGain = currentEquity - totalDeposit;
        const netLifetimeReturnPct = totalDeposit > 0 ? (netLifetimeGain / totalDeposit) * 100 : 0;

        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                {t('ప్రారంభ డిపాజిట్', 'Initial Deposit')}
              </div>
              <div className="text-base font-bold text-white mt-0.5">{formatINR(totalDeposit)}</div>
              <div className="text-[10px] text-slate-500">{t('కేటాయించిన మూలధనం', 'Allocated capital')}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                {t('ప్రస్తుత నికర విలువ', 'Current Net Equity')}
              </div>
              <div className="text-base font-bold text-white mt-0.5">{formatINR(currentEquity)}</div>
              <div className="text-[10px] text-slate-500">{t(`నగదు ${formatINR(liquidCash)} + షేర్లు ${formatINR(holdingsVal)}`, `Cash ${formatINR(liquidCash)} + Stock ${formatINR(holdingsVal)}`)}</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
              <div className="text-[11px] text-emerald-300 uppercase tracking-wider font-semibold">
                {t('మొత్తం నికర లాభం', 'Lifetime Net Return')}
              </div>
              <div className="text-base font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                {netLifetimeGain >= 0 ? `+${formatINR(netLifetimeGain)}` : formatINR(netLifetimeGain)}
                <span className="text-xs font-semibold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                  {netLifetimeReturnPct >= 0 ? `+${netLifetimeReturnPct.toFixed(2)}%` : `${netLifetimeReturnPct.toFixed(2)}%`}
                </span>
              </div>
              <div className="text-[10px] text-emerald-500/80">{t('లైవ్ నికర లాభం / నష్టం', 'Live verified net P&L')}</div>
            </div>

            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20">
              <div className="text-[11px] text-blue-300 uppercase tracking-wider font-semibold">
                {t('రికార్డ్ అయిన రోజులు', 'Recorded Ledger Days')}
              </div>
              <div className="text-base font-bold text-blue-400 mt-0.5 flex items-center gap-1">
                {ledgerDays.length} {t('రోజులు', 'Days')}
              </div>
              <div className="text-[10px] text-blue-500/80">{t('డేటాబేస్ డైలీ లెడ్జర్', 'Database verified ledger')}</div>
            </div>
          </div>
        );
      })()}

      {/* Mobile Swipe Guidance Banner */}
      <div className="sm:hidden flex items-center justify-between text-[11px] text-blue-300 bg-blue-950/50 border border-blue-500/20 px-3 py-1.5 rounded-lg mb-2.5">
        <span className="flex items-center gap-1.5 font-medium">
          <span>👈 👉</span>
          <span>{t('అన్ని 11 కాలమ్స్ చూడటానికి స్క్రోల్ చేయండి', 'Swipe horizontally to view all 11 columns')}</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono">11 {t('కాలమ్స్', 'Cols')}</span>
      </div>

      {/* Main Table Responsive Container */}
      <div className="overflow-x-auto touch-scroll rounded-xl border border-white/10 bg-slate-950/60 shadow-inner">
        <table className="w-full min-w-[880px] text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-900/90 text-slate-300 border-b border-white/10 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-3 px-3.5 font-bold sticky left-0 bg-slate-900 z-20 shadow-r border-r border-white/10">{t('రోజు / తేది', 'Day / Date')}</th>
              <th className="py-3 px-3 font-semibold text-right">{t('ప్రారంభ నగదు', 'Open Capital')}</th>
              <th className="py-3 px-3 font-semibold text-center">{t('ఆర్డర్లు (Buy / Sell)', 'Orders (B/S)')}</th>
              <th className="py-3 px-3 font-semibold">{t('స్టాక్స్', 'Stocks')}</th>
              <th className="py-3 px-3 font-semibold text-right">{t('గ్రోస్ P&L', 'Gross P&L')}</th>
              <th className="py-3 px-3 font-semibold text-right">{t('ఖర్చులు', 'Fees')}</th>
              <th className="py-3 px-3 font-semibold text-right">{t('నెట్ P&L', 'Net P&L')}</th>
              <th className="py-3 px-3 font-semibold text-right">{t('ముగింపు నగదు', 'Closing Cash')}</th>
              <th className="py-3 px-3 font-semibold text-right text-white font-bold">{t('మొత్తం ఈక్విటీ', 'Total Equity')}</th>
              <th className="py-3 px-3 font-semibold text-center">{t('క్రమశిక్షణ స్థితి', 'Discipline Status')}</th>
              <th className="py-3 px-4 font-semibold">{t('AI నిర్ణయ కారణం', 'AI Decision Rationale')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {displayData.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400">
                  <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">{loading ? t('లోడ్ అవుతోంది...', 'Loading daily ledger...') : t('డేటా లభించలేదు', 'No daily ledger records yet')}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('రోజువారీ ట్రేడింగ్ ముగిసిన తర్వాత నివేదిక ఇక్కడ కనిపిస్తుంది.', 'Daily trading ledgers will populate automatically after each market session.')}</p>
                </td>
              </tr>
            ) : null}
            {displayData.map((row) => {
              const isProfit = row.net_pnl > 0;
              const isLoss = row.net_pnl < 0;
              const isSelected = selectedDay?.day_number === row.day_number;

              return (
                <tr 
                  key={row.day_number}
                  onClick={() => setSelectedDay(isSelected ? null : row)}
                  className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-950/40 border-l-2 border-l-blue-400' : ''
                  }`}
                >
                  {/* Day / Date with Latest Day Badge */}
                  <td className="py-3 px-3.5 font-semibold text-white sticky left-0 bg-slate-950 z-10 shadow-r border-r border-white/10 flex items-center gap-2">
                    <span className={`w-7 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                      row.day_number === maxRecordedDay
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                        : 'bg-white/5 text-slate-200'
                    }`}>
                      D{row.day_number}
                    </span>
                    <span className="text-slate-300">{row.date}</span>
                    {row.day_number === maxRecordedDay && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse shrink-0">
                        🔥 {t('నేటి రోజు', 'Today / Latest')}
                      </span>
                    )}
                  </td>

                  {/* Open Capital */}
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {formatINR(row.opening_capital)}
                  </td>

                  {/* Trades (Buy / Sell) */}
                  <td className="py-3 px-3 text-center">
                    {(row.buys_count > 0 || row.sells_count > 0) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {row.buys_count}B / {row.sells_count}S
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">—</span>
                    )}
                  </td>

                  {/* Stocks */}
                  <td className="py-3 px-3">
                    {row.stocks_traded && row.stocks_traded !== 'None' ? (
                      <span className="font-medium text-slate-200 text-xs">
                        {row.stocks_traded}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">{t('లేదు', 'None')}</span>
                    )}
                  </td>

                  {/* Gross PnL */}
                  <td className={`py-3 px-3 text-right font-mono ${
                    row.gross_pnl > 0 ? 'text-emerald-400' : row.gross_pnl < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {row.gross_pnl > 0 ? `+${formatINR(row.gross_pnl)}` : formatINR(row.gross_pnl)}
                  </td>

                  {/* Fees */}
                  <td className="py-3 px-3 text-right font-mono text-slate-400">
                    {row.charges_fees > 0 ? `₹${row.charges_fees.toFixed(2)}` : '₹0.00'}
                  </td>

                  {/* Net PnL */}
                  <td className={`py-3 px-3 text-right font-mono font-bold ${
                    isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {isProfit ? `+${formatINR(row.net_pnl)}` : formatINR(row.net_pnl)}
                  </td>

                  {/* Closing Capital */}
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {formatINR(row.closing_capital)}
                  </td>

                  {/* Total Equity */}
                  <td className="py-3 px-3 text-right font-mono text-white font-bold bg-white/[0.02]">
                    {formatINR(row.total_equity ?? row.closing_capital)}
                  </td>

                  {/* Discipline Status */}
                  <td className="py-3 px-3 text-center">
                    {row.discipline_status === 'TARGET_HIT' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        🎯 {t('+1% టార్గెట్ హిట్', '+1% Target Hit')}
                      </span>
                    ) : row.discipline_status === 'CAPITAL_PRESERVED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        <ShieldCheck className="w-3 h-3 text-blue-400" />
                        🛡️ {t('స్టాప్-లాస్ క్రమశిక్షణ', 'Capital Protected')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        <Clock className="w-3 h-3" />
                        ⏸️ {t('స్టాండ్‌బై / నో ట్రేడ్', 'Market Standby')}
                      </span>
                    )}
                  </td>

                  {/* AI Decision Rationale */}
                  <td className="py-3 px-4 max-w-xs truncate text-slate-300 text-[11px]" title={row.ai_decision_summary}>
                    {row.ai_decision_summary}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Day Deep Dive Pill */}
      {selectedDay && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-blue-500/30 animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Day {selectedDay.day_number} ({selectedDay.date})</span>
                <span className="text-xs font-mono text-emerald-400">
                  {selectedDay.net_pnl >= 0 ? `+${formatINR(selectedDay.net_pnl)}` : formatINR(selectedDay.net_pnl)}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {selectedDay.ai_decision_summary}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedDay(null)}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/10"
          >
            {t('మూసివేయి', 'Close')}
          </button>
        </div>
      )}
    </GlassCard>
  );
};
