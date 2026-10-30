import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Receipt,
  Scale,
  TrendingUp,
  Percent,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Database
} from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/currency';
import { DailyLedgerEntry } from '../../types';

export const ReportsView: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<DailyLedgerEntry[]>([]);
  const [compounding, setCompounding] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [sumRes, ledgerRes, compRes] = await Promise.all([
        api.getReportSummary().catch((e) => {
          console.error(e);
          return null;
        }),
        api.getDailyLedger().catch((e) => {
          console.error(e);
          return null;
        }),
        api.getCompoundingTracker().catch((e) => {
          console.error(e);
          return null;
        }),
      ]);
      if (sumRes) setSummary(sumRes);
      if (ledgerRes && ledgerRes.days) setLedgerEntries(ledgerRes.days);
      if (compRes) setCompounding(compRes);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchReportsData();
  }, []);

  const handleDownloadDailyLedger = async () => {
    try {
      setDownloading(true);
      await api.downloadDailyLedgerCsv();
    } catch (err) {
      console.error('Failed to download daily ledger:', err);
      alert('Failed to download ledger CSV. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleExportRawTradesCSV = async () => {
    try {
      const res = await fetch('/api/reports/export-csv');
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autopilot_raw_trades_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export raw trades CSV:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TARGET_HIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            🎯 Target Hit
          </span>
        );
      case 'CAPITAL_PRESERVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            🛡️ Capital Preserved
          </span>
        );
      case 'DISCIPLINED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            ⚖️ Disciplined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            ⏸️ Market Standby
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-wide">
                Day-to-Day Excel Ledger & Portfolio Reports
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                1st Day to Future
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              రోజువారీ ట్రేడింగ్ అప్‌డేట్స్, నిధుల లెక్కలు, లాభనష్టాలు మరియు 1-క్లిక్ ఎక్సెల్ షీట్ డౌన్‌లోడ్ (.csv)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadDailyLedger}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 shadow-lg shadow-emerald-950/40 cursor-pointer transition-all disabled:opacity-50"
            title="Download full Day 1 to present & future daily ledger Excel sheet"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Downloading...' : '📥 Download Excel Sheet (.csv)'}</span>
          </button>

          <button
            onClick={handleExportRawTradesCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 cursor-pointer transition-all"
            title="Export raw order executions"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Raw Trades</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Overview */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Capital & Balance
              </span>
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                Active Capital
              </span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Total Portfolio Value</span>
                <span className="font-bold text-white">{formatINR(summary.portfolio_overview.total_portfolio_value_inr)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Available Liquid Cash</span>
                <span className="font-bold text-emerald-400">{formatINR(summary.portfolio_overview.current_cash_inr)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Holdings Value</span>
                <span className="font-bold text-slate-200">{formatINR(summary.portfolio_overview.holdings_value_inr)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Net Realized PnL</span>
                <span className={`font-bold ${summary.portfolio_overview.net_pnl_inr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatINR(summary.portfolio_overview.net_pnl_inr)} ({summary.portfolio_overview.net_return_pct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Tax & Charges Friction Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-400" />
              <span>Modeled Taxes & Fees (Friction)</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Total Fees & Drag</span>
                <span className="font-bold text-rose-400">{formatINR(summary.tax_and_friction_breakdown.total_fees_paid_inr)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Securities Transaction Tax (STT)</span>
                <span className="font-bold text-slate-300">{formatINR(summary.tax_and_friction_breakdown.estimated_stt_inr)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">GST (18% on Brokerage & Turnover)</span>
                <span className="font-bold text-slate-300">{formatINR(summary.tax_and_friction_breakdown.estimated_gst_inr)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Exchange & SEBI Turnover</span>
                <span className="font-bold text-slate-300">
                  {formatINR(summary.tax_and_friction_breakdown.estimated_exchange_charges_inr + summary.tax_and_friction_breakdown.estimated_sebi_charges_inr)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Execution Stats */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              <span>Execution Discipline</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Total Executed Trades</span>
                <span className="font-bold text-white">{summary.trade_statistics.total_trades}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Win Rate</span>
                <span className="font-bold text-emerald-400">{summary.trade_statistics.win_rate_pct}%</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Profitable / Losing Trades</span>
                <span className="font-bold text-slate-200">
                  {summary.trade_statistics.win_trades_count}W / {summary.trade_statistics.loss_trades_count}L
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Trading Journal Logs</span>
                <span className="font-bold text-purple-400">{summary.trade_statistics.total_journal_entries}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DAILY COMPOUNDING GROWTH TRACKER CARD (+1% DAILY COMPOUND FORMULA) */}
      {compounding && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-emerald-500/30 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    📈 డైలీ కాంపౌండింగ్ ఫార్ములా (+1% Daily Compound Growth Tracker)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active Formula
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">
                  సూత్రం: <strong>C<sub>t</sub> = C<sub>0</sub> × (1 + 0.01)<sup>t</sup></strong> &nbsp;|&nbsp;
                  <span className="text-emerald-400">₹100 పెట్టుబడి → రోజుకు కనీసం ₹1 లాభం (101) → ₹101 తో కాంపౌండింగ్ వృద్ధి</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                🔥 {compounding.compounding_streak_days} Days Profit Streak
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[11px]">బేస్ మూలధనం (Base Capital)</span>
              <div className="text-base font-bold text-white font-mono">{formatINR(compounding.base_capital_inr)}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[11px]">మొత్తం పోర్ట్‌ఫోలియో (Net Equity)</span>
              <div className="text-base font-bold text-emerald-400 font-mono">{formatINR(compounding.total_portfolio_equity_inr)}</div>
              <div className="text-[10px] text-slate-400 font-sans">క్యాష్ + ఓపెన్ షేర్ల విలువ</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[11px]">కాంపౌండింగ్ టార్గెట్ (Target)</span>
              <div className="text-base font-bold text-cyan-300 font-mono">{formatINR(compounding.target_equity_inr)}</div>
              <div className="text-[10px] text-emerald-400 font-bold font-sans">
                {compounding.target_achieved ? '✅ Target Reached!' : 'In Progress'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[11px]">అప్‌గ్రేడ్ తర్వాత నికర లాభం</span>
              <div className="text-base font-bold text-emerald-300 font-mono">
                +{formatINR(compounding.total_profit_since_upgrade_inr)} (+{compounding.compounding_yield_pct}%)
              </div>
              <div className="text-[10px] text-slate-400 font-sans">రేపటి టార్గెట్: +{formatINR(compounding.next_day_target_profit_inr)}</div>
            </div>
          </div>
        </div>
      )}

      {/* DAY-TO-DAY EXCEL LEDGER TABLE */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                📅 Day-to-Day Trading & Performance Ledger (ఎక్సెల్ షీట్ టేబుల్)
              </h3>
              <p className="text-xs text-slate-400">
                Day 1 నుండి నేటి వరకు మరియు రాబోయే రోజులకు సంబంధించిన రోజువారీ నిధులు, ట్రేడ్ వివరాలు, మరియు వివరణాత్మక రికార్డు
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              Total Recorded Days: <strong className="text-white">{ledgerEntries.length}</strong>
            </span>
            <button
              onClick={handleDownloadDailyLedger}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save .CSV</span>
            </button>
          </div>
        </div>

        {/* Informational Guidance Box */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-indigo-500/20 text-xs text-slate-300 flex items-start gap-3">
          <Database className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong className="text-indigo-300">స్పష్టమైన రోజువారీ వివరణ:</strong> ఈ షీట్ ప్రతిరోజూ మార్కెట్ ప్రారంభం నుండి ముగిసే వరకు ఓపెనింగ్ క్యాపిటల్, జరిగిన బై/సెల్ ట్రేడ్స్, ఫీజులు, నెట్ P&L మరియు AI ట్రేడింగ్ నిర్ణయాన్ని ట్రాక్ చేస్తుంది. ఎవరైనా చదివినా సులభంగా అర్థమయ్యేలా రూపొందించబడింది.
            </p>
            <p className="text-[11px] text-slate-400">
              గమనిక: 2026-10-27 న యూజర్ సూచన మేరకు నాణ్యమైన Nifty 50 లార్జ్ క్యాప్ షేర్లు (Infosys, Reliance, ITC, BEL, Coal India, PowerGrid) కొనుగోలు సులభతరం చేయడానికి వర్చువల్ క్యాపిటల్ ₹5,000 కు పెంచబడింది.
            </p>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-white/10">
                <th className="py-3 px-3 font-semibold">Day & Date</th>
                <th className="py-3 px-3 font-semibold">Opening Cap (₹)</th>
                <th className="py-3 px-3 font-semibold">Trades (B/S)</th>
                <th className="py-3 px-3 font-semibold">Stocks Traded</th>
                <th className="py-3 px-3 font-semibold">Gross P&L (₹)</th>
                <th className="py-3 px-3 font-semibold">Charges (₹)</th>
                <th className="py-3 px-3 font-semibold">Net P&L (₹)</th>
                <th className="py-3 px-3 font-semibold">Closing Cap (₹)</th>
                <th className="py-3 px-3 font-semibold">+1% Target (₹)</th>
                <th className="py-3 px-3 font-semibold">Day Ret %</th>
                <th className="py-3 px-3 font-semibold">Discipline Status</th>
                <th className="py-3 px-4 font-semibold min-w-[280px]">AI Strategy & Decision Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {ledgerEntries.map((entry) => {
                const isPositive = entry.net_pnl > 0;
                const isNegative = entry.net_pnl < 0;


                return (
                  <tr
                    key={entry.day_number}
                    className="hover:bg-slate-800/40 transition-colors text-slate-300"
                  >
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-white">{entry.day_label}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{entry.date}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-200">
                      ₹{entry.opening_capital.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {entry.total_trades > 0 ? (
                        <span className="text-cyan-300">
                          {entry.buys_count}B / {entry.sells_count}S
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-sans text-xs">
                      {entry.stocks_traded !== 'None (Standby)' ? (
                        <span className="text-indigo-300 font-semibold">{entry.stocks_traded}</span>
                      ) : (
                        <span className="text-slate-500">Standby</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      ₹{entry.gross_pnl.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-400">
                      ₹{entry.charges_fees.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-bold">
                      <span className={isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-400'}>
                        {isPositive ? '+' : ''}₹{entry.net_pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-bold text-white">
                      ₹{entry.closing_capital.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {entry.compounding_target ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300">₹{entry.compounding_target.toFixed(2)}</span>
                          {entry.compounding_achieved && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" title="Daily +1% Compounding Target Achieved">
                              ✓ Hit
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={entry.day_return_pct > 0 ? 'text-emerald-400' : entry.day_return_pct < 0 ? 'text-rose-400' : 'text-slate-400'}>
                        {entry.day_return_pct > 0 ? '+' : ''}{entry.day_return_pct.toFixed(2)}%
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap font-sans">
                      {getStatusBadge(entry.discipline_status)}
                    </td>
                    <td className="py-3 px-4 font-sans text-xs text-slate-300 leading-relaxed">
                      {entry.ai_decision_summary}
                    </td>
                  </tr>
                );
              })}

              {ledgerEntries.length === 0 && !loading && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                    No ledger entries found. Click Refresh or run market simulation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Notes */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 pt-2 gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel Compatible: UTF-8 BOM encoding ensures proper symbols in MS Excel & Google Sheets.</span>
          </div>
          <div>
            <span>Dynamic updates: All future trading days will automatically append to this ledger.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
