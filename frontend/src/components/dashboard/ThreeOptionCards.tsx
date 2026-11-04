import React from 'react';
import { Plus, BarChart2, ArrowUp, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ThreeOptionCardsProps {
  onOpenInvest: () => void;
  onOpenPortfolio: () => void;
  onOpenWithdraw: () => void;
}

export const ThreeOptionCards: React.FC<ThreeOptionCardsProps> = ({
  onOpenInvest,
  onOpenPortfolio,
  onOpenWithdraw,
}) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
      {/* Tile 1: Invest / Add Capital */}
      <button
        onClick={onOpenInvest}
        className="liquid-glass liquid-glass-interactive p-3 sm:p-3.5 text-left cursor-pointer group flex items-center justify-between rounded-xl border border-white/10 hover:border-blue-500/40 transition-all shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug">
              {t('ఇన్వెస్ట్ / మూలధనం జోడించు', 'Invest / Add Capital')}
            </h3>
            <p className="text-[11px] text-slate-400 line-clamp-1">
              {t('వర్చువల్ నిధులు లేదా ఖాతా రీసెట్', 'Add simulated funds or reset virtual account')}
            </p>
          </div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
      </button>

      {/* Tile 2: Portfolio / Profit & Loss */}
      <button
        onClick={onOpenPortfolio}
        className="liquid-glass liquid-glass-interactive p-3 sm:p-3.5 text-left cursor-pointer group flex items-center justify-between rounded-xl border border-white/10 hover:border-violet-500/40 transition-all shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug">
              {t('పోర్ట్‌ఫోలియో / లాభనష్టాలు', 'Portfolio / Profit & Loss')}
            </h3>
            <p className="text-[11px] text-slate-400 line-clamp-1">
              {t('గ్రోస్, ఫీజులు, హోల్డింగ్స్ మరియు నెట్ P&L', 'Gross, friction fees, holdings & net PnL')}
            </p>
          </div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
      </button>

      {/* Tile 3: Withdraw Money */}
      <button
        onClick={onOpenWithdraw}
        className="liquid-glass liquid-glass-interactive p-3 sm:p-3.5 text-left cursor-pointer group flex items-center justify-between rounded-xl border border-white/10 hover:border-cyan-500/40 transition-all shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <ArrowUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug">
              {t('విత్‌డ్రా / నగదు వివరాలు', 'Withdraw Virtual Funds')}
            </h3>
            <p className="text-[11px] text-slate-400 line-clamp-1">
              {t('సిమ్యులేటెడ్ పేపర్ ట్రేడింగ్ రికార్డు', 'Virtual funds & audit ledger summary')}
            </p>
          </div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
      </button>
    </div>
  );
};
