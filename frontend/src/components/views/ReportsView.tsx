import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Receipt,
  Scale,
  TrendingUp,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/currency';

export const ReportsView: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getReportSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/reports/export-csv');
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autopilot_trades_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Portfolio Reports, Tax P&L & Friction Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive transaction audit, modeled statutory charges (STT, GST, SEBI), and exportable CSV ledgers
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Trades CSV</span>
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Overview */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Capital & Performance</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Total Portfolio Value</span>
                <span className="font-bold text-white">{formatINR(summary.portfolio_overview.total_portfolio_value_inr)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400">Available Liquid Cash</span>
                <span className="font-bold text-slate-200">{formatINR(summary.portfolio_overview.current_cash_inr)}</span>
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
    </div>
  );
};
