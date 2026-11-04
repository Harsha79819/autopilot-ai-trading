import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { formatINR, formatPct } from '../../utils/currency';
import { useLanguage } from '../../context/LanguageContext';

export const OpenPositionsCard: React.FC = () => {
  const { portfolio } = useTrading();
  const { t } = useLanguage();

  const positions = portfolio?.positions || [];
  const hasLivePositions = positions.length > 0;

  // Reconcile dynamic gross, costs, net across all open positions
  const grossPnl = hasLivePositions
    ? positions.reduce((acc, pos) => acc + (pos.gross_pnl ?? pos.unrealized_pnl), 0)
    : 0.0;

  const costs = hasLivePositions
    ? positions.reduce((acc, pos) => acc + (pos.estimated_exit_costs ?? 0.0), 0)
    : 0.0;

  const netPnl = hasLivePositions
    ? positions.reduce((acc, pos) => acc + (pos.net_pnl ?? ((pos.gross_pnl ?? pos.unrealized_pnl) - (pos.estimated_exit_costs ?? 0))), 0)
    : 0.0;

  return (
    <div className="liquid-glass p-4 sm:p-5 flex flex-col justify-between rounded-2xl border border-white/10 shadow-xl">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>{t('ఓపెన్ పొజిషన్లు', 'Open Positions')}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </h3>
          <span className="text-xs text-muted-labels font-medium">
            {hasLivePositions
              ? `${positions.length} ${t('యాక్టివ్ షేర్లు', 'active position(s)')}`
              : t('ఓపెన్ పొజిషన్లు లేవు', 'No open positions')}
          </span>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto touch-scroll">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="text-muted-labels border-b border-white/10 pb-1.5 text-[11px]">
                <th className="font-semibold pb-1.5">{t('సింబల్', 'Symbol')}</th>
                <th className="font-semibold pb-1.5">{t('క్వాంటిటీ', 'Qty')}</th>
                <th className="font-semibold pb-1.5">{t('కొన్న ధర', 'Avg Entry')}</th>
                <th className="font-semibold pb-1.5">{t('లైవ్ ధర', 'Last Price')}</th>
                <th className="font-semibold pb-1.5 text-right">{t('అన్‌రియలైజ్డ్ P&L', 'Unrealized')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {hasLivePositions ? (
                positions.map((pos) => {
                  const pnl = pos.unrealized_pnl;
                  const isPos = pnl >= 0;
                  return (
                    <tr key={pos.symbol} className="text-white hover:bg-white/[0.02]">
                      <td className="py-2 font-bold text-white tracking-wide">{pos.symbol}</td>
                      <td className="py-2 text-slate-300">{pos.quantity}</td>
                      <td className="py-2 text-slate-300 font-mono">{formatINR(pos.average_buy_price)}</td>
                      <td className="py-2 text-slate-300 font-mono">{formatINR(pos.current_price)}</td>
                      <td
                        className={`py-2 text-right font-bold font-mono ${
                          isPos ? 'text-profit' : 'text-loss'
                        }`}
                      >
                        {isPos ? '+' : ''}
                        {formatINR(pnl)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-5 text-center text-slate-400">
                    {t('ఓపెన్ పొజిషన్లు లేవు. స్కానర్ ఉత్తమ అవకాశాల కోసం వెతుకుతోంది.', 'No open positions. Scanner is evaluating market for opportunities.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden py-1 divide-y divide-white/5">
          {hasLivePositions ? (
            positions.map((pos) => {
              const pnl = pos.unrealized_pnl;
              const isPos = pnl >= 0;
              return (
                <div key={pos.symbol} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-xs font-bold text-white">
                      {pos.symbol} · {pos.quantity} sh
                    </div>
                    <div className="text-[11px] text-muted-labels mt-0.5 font-mono">
                      Avg {formatINR(pos.average_buy_price)} · Last {formatINR(pos.current_price)}
                    </div>
                  </div>
                  <div className={`text-xs font-bold font-mono ${isPos ? 'text-profit' : 'text-loss'}`}>
                    {isPos ? '+' : ''}
                    {formatINR(pnl)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-3 text-center text-xs text-slate-400">
              {t('ఓపెన్ పొజిషన్లు లేవు.', 'No open positions.')}
            </div>
          )}
        </div>
      </div>

      {/* Badges Below Table */}
      <div className="flex flex-wrap items-center gap-2 pt-3 mt-2 border-t border-white/10 text-xs font-semibold">
        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200">
          {t('గ్రోస్', 'Gross')} {grossPnl >= 0 ? '+' : ''}
          {formatINR(grossPnl)}
        </span>

        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
          {t('ఖర్చులు', 'Costs')} -{formatINR(costs)}
        </span>

        <span className={`px-2.5 py-1 rounded-lg border font-semibold ${
          netPnl > 0
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : netPnl < 0
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-white/5 border-white/10 text-slate-300'
        }`}>
          {t('నెట్', 'Net')} {netPnl >= 0 ? '+' : ''}
          {formatINR(netPnl)}
        </span>
      </div>
    </div>
  );
};
