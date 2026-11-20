import React, { useState, useEffect } from 'react';
import {
  Receipt,
  ShieldAlert,
  Percent,
  TrendingUp,
  AlertTriangle,
  Building2,
  Scale,
  CheckCircle2,
  FileText,
  HelpCircle,
  X,
  Coins,
  ArrowRight,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

interface TaxAndChargesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaxAndChargesModal: React.FC<TaxAndChargesModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'REALITY_CHECK' | 'TRADE_SLIPS'>('SUMMARY');
  const [selectedTaxSlab, setSelectedTaxSlab] = useState<'30' | '20'>('30');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .getTaxAndChargesBreakdown()
        .then((res) => setData(res))
        .catch((err) => console.error('Failed to load tax breakdown:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const s = data?.summary || {};
  const r = data?.reality_check || {};
  const slips = data?.trade_slips || [];

  const selectedIncomeTax = selectedTaxSlab === '30' ? (s.estimated_income_tax_30pct || 0) : (s.estimated_income_tax_20pct || 0);
  const selectedTakeHome = (s.net_pnl_after_charges || 0) - selectedIncomeTax;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-slate-950 shadow-md shadow-amber-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {t('🏛️ భారత ప్రభుత్వ పన్నులు, చార్జీలు & వాస్తవ లాభాలు', '🏛️ Indian F&O Taxes, Cutoffs & Reality Check')}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  NSE & BUDGET 2024
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  'STT, GST, స్టాంప్ డ్యూటీ, ఎక్స్ఛేంజ్ ఫీజులు, ఆదాయపు పన్ను మరియు నిజమైన మార్కెట్ పోలిక',
                  'Exact STT, GST, Stamp Duty, Exchange Charges, Income Tax & Real Market Reality'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('SUMMARY')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'SUMMARY'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>{t('పన్నులు & నికర లాభం (Summary)', 'Taxes & Net Profit')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REALITY_CHECK')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'REALITY_CHECK'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{t('💡 రియల్ మనీ వాస్తవాలు (Reality Check)', '💡 Real Money vs Simulation')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRADE_SLIPS')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'TRADE_SLIPS'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('ట్రేడ్ వారీ టాక్స్ రశీదులు (Trade Slips)', 'Trade-by-Trade Slips')}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 touch-scroll">
          {loading ? (
            <div className="py-16 text-center text-slate-400 animate-pulse">
              <Receipt className="w-8 h-8 mx-auto text-amber-400 animate-bounce mb-2" />
              <p className="text-xs font-semibold">
                {t('భారతీయ పన్నులు & చార్జీలు లెక్కిస్తున్నాం...', 'Computing Indian F&O Statutory Charges...')}
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: SUMMARY OF TAXES & IN-HAND PROFIT */}
              {activeTab === 'SUMMARY' && (
                <div className="space-y-4">
                  {/* High-Impact 5-Step Waterfall Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Card 1: Gross PnL */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 shadow">
                      <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        {t('1. స్థూల సిమ్యులేటెడ్ లాభం (Gross P&L)', '1. Gross Simulated P&L')}
                      </div>
                      <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                        +₹{(s.gross_realized_pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {s.total_trades || 0} {t('ట్రేడ్ల మొత్తం టర్నోవర్: ₹', 'trades, Total Turnover: ₹')}
                        {(s.total_turnover || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>

                    {/* Card 2: Regulatory & Broker Charges */}
                    <div className="bg-slate-950/70 border border-rose-500/30 rounded-xl p-3.5 shadow">
                      <div className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">
                        {t('2. చార్జీలు & కట్‌ఆఫ్స్ (Charges & Levies)', '2. Regulatory & Broker Levies')}
                      </div>
                      <div className="text-xl font-black font-mono text-rose-400 mt-1">
                        -₹{(s.total_charges_and_taxes || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        STT, GST, బ్రోకరేజ్, ఎక్స్ఛేంజ్ & సెబీ ఫీజులు
                      </div>
                    </div>

                    {/* Card 3: Net After Charges */}
                    <div className="bg-slate-950/70 border border-indigo-500/30 rounded-xl p-3.5 shadow">
                      <div className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider">
                        {t('3. చార్జీల తర్వాతి లాభం (Net P&L)', '3. Net P&L After Charges')}
                      </div>
                      <div className="text-xl font-black font-mono text-indigo-300 mt-1">
                        ₹{(s.net_pnl_after_charges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {t('ఇన్‌కమ్ ట్యాక్స్ లెక్కించడానికి ఉపయోగపడే నికర లాభం', 'Taxable Non-Speculative Business Income')}
                      </div>
                    </div>

                    {/* Card 4: Estimated Income Tax */}
                    <div className="bg-slate-950/70 border border-amber-500/40 rounded-xl p-3.5 shadow">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                          {t('4. అంచనా ఆదాయపు పన్ను (Income Tax)', '4. Estimated Income Tax')}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] bg-slate-900 border border-slate-700 p-0.5 rounded">
                          <button
                            type="button"
                            onClick={() => setSelectedTaxSlab('30')}
                            className={`px-1.5 py-0.5 rounded cursor-pointer ${
                              selectedTaxSlab === '30' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'
                            }`}
                          >
                            30%
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTaxSlab('20')}
                            className={`px-1.5 py-0.5 rounded cursor-pointer ${
                              selectedTaxSlab === '20' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'
                            }`}
                          >
                            20%
                          </button>
                        </div>
                      </div>
                      <div className="text-xl font-black font-mono text-amber-300 mt-1">
                        -₹{selectedIncomeTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {t(
                          `బిజినెస్ ఇన్‌కమ్ స్లాబ్ (${selectedTaxSlab}% + 4% సెస్ = ${selectedTaxSlab === '30' ? '31.2%' : '20.8%'})`,
                          `Non-Speculative Business Slab (${selectedTaxSlab}% + 4% Cess)`
                        )}
                      </div>
                    </div>

                    {/* Card 5: Final Take Home In-Hand */}
                    <div className="bg-gradient-to-br from-emerald-950/70 to-teal-950/70 border-2 border-emerald-500/60 rounded-xl p-3.5 shadow-lg sm:col-span-2 lg:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-emerald-300 font-black uppercase tracking-wider flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-emerald-400" />
                          <span>{t('5. చేతికి వచ్చే నికర నగదు (Real In-Hand Take-Home)', '5. Real In-Hand Take-Home Profit')}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          ALL DEDUCTIONS PAID
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-300 mt-1">
                        ₹{selectedTakeHome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-300 mt-1">
                        {t(
                          `ప్రభుత్వ పన్నులు (STT, GST, Cess), ఎక్స్ఛేంజ్ చార్జీలు, బ్రోకరేజ్ మరియు ఆదాయపు పన్ను తీసివేసిన తర్వాత మిగిలేది.`,
                          `Exact remaining net profit after all statutory levies, GST, brokerage, and income tax provision.`
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Statutory Deductions Itemized Breakdown Table */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span>{t('భారతీయ చట్టబద్ధ పన్నులు & చార్జీల పూర్తి జాబితా (Itemized Tax Slip):', 'Itemized Regulatory & Broker Charges Slip:')}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Line 1: STT */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div>
                          <span className="font-bold text-slate-200 block">{t('STT (సెక్యూరిటీస్ ట్రాన్సాక్షన్ ట్యాక్స్)', 'STT (Securities Transaction Tax)')}</span>
                          <span className="text-[10px] text-slate-400">0.1% on Sell-Side Premium Turnover</span>
                        </div>
                        <span className="font-mono font-bold text-amber-300">
                          ₹{(s.total_stt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Line 2: Brokerage */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div>
                          <span className="font-bold text-slate-200 block">{t('బ్రోకరేజ్ (Brokerage)', 'Flat Brokerage')}</span>
                          <span className="text-[10px] text-slate-400">₹20 Buy + ₹20 Sell (₹40 per round trip)</span>
                        </div>
                        <span className="font-mono font-bold text-indigo-300">
                          ₹{(s.total_brokerage || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Line 3: Exchange Turnover Charges */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div>
                          <span className="font-bold text-slate-200 block">{t('ఎక్స్ఛేంజ్ టర్నోవర్ చార్జీలు (NSE)', 'Exchange Turnover Charges (NSE)')}</span>
                          <span className="text-[10px] text-slate-400">0.03503% of Total Premium Turnover</span>
                        </div>
                        <span className="font-mono font-bold text-slate-300">
                          ₹{(s.total_exchange_charges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Line 4: GST */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div>
                          <span className="font-bold text-slate-200 block">{t('GST (వస్తు సేవల పన్ను)', 'GST (Goods & Services Tax)')}</span>
                          <span className="text-[10px] text-slate-400">18% on (Brokerage + Exchange + SEBI)</span>
                        </div>
                        <span className="font-mono font-bold text-rose-300">
                          ₹{(s.total_gst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Line 5: Stamp Duty */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div>
                          <span className="font-bold text-slate-200 block">{t('స్టాంప్ డ్యూటీ (Stamp Duty)', 'Stamp Duty')}</span>
                          <span className="text-[10px] text-slate-400">0.003% on Buy Premium Turnover</span>
                        </div>
                        <span className="font-mono font-bold text-slate-300">
                          ₹{(s.total_stamp_duty || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Line 6: SEBI Charges */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div>
                          <span className="font-bold text-slate-200 block">{t('SEBI టర్నోవర్ ఫీజు (SEBI Charges)', 'SEBI Turnover Charges')}</span>
                          <span className="text-[10px] text-slate-400">₹10 per Crore of Total Turnover</span>
                        </div>
                        <span className="font-mono font-bold text-slate-300">
                          ₹{(s.total_sebi_charges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">{t('మొత్తం చట్టబద్ధ ఖర్చులు (Total Regulatory Deductions):', 'Total Deductions:')}</span>
                      <span className="font-mono font-black text-rose-400 text-sm">
                        ₹{(s.total_charges_and_taxes || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: REALITY CHECK — REAL MONEY VS SIMULATION */}
              {activeTab === 'REALITY_CHECK' && (
                <div className="space-y-4">
                  {/* Reality Comparison Banner */}
                  <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-amber-950/70 border border-indigo-500/40 rounded-xl p-4 shadow">
                    <div className="flex items-center gap-2 text-amber-400 font-black text-sm mb-1">
                      <Scale className="w-4 h-4" />
                      <span>{t('రియల్ ఆప్షన్స్ ట్రేడింగ్ వాస్తవాలు (Real Options Trading Architecture):', 'Real Money vs Simulation Reality Check:')}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {t(
                        'సంస్థాగత ఆప్షన్స్ ట్రేడింగ్ ఆర్కిటెక్చర్, ఎక్స్ఛేంజ్ నిబంధనలు మరియు రిస్క్ మేనేజ్‌మెంట్ సూత్రాల పూర్తి విశ్లేషణ:',
                        'Institutional options trading architecture, exchange frictions, and capital risk management principles:'
                      )}
                    </p>
                  </div>

                  {/* Side-by-Side Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Simulated Reality */}
                    <div className="bg-slate-950/80 border border-indigo-500/40 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-indigo-300">
                          {t('🧪 పేపర్ సిమ్యులేషన్ (Sandbox)', '🧪 Paper Simulation (Sandbox)')}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                          SANDBOX
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1.5 pt-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">{t('ప్రారంభ నగదు:', 'Initial Capital:')}</span>
                          <span className="font-mono font-bold text-white">₹5,000.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{t('సిమ్యులేటెడ్ లాభం:', 'Simulated P&L:')}</span>
                          <span className="font-mono font-bold text-emerald-400">₹{(s.gross_realized_pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{t('రిటర్న్ (ROI):', 'Simulated ROI:')}</span>
                          <span className="font-mono font-bold text-emerald-400">{r.simulated_roi_pct ? `+${r.simulated_roi_pct}%` : '0.0%'}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-amber-300/90 pt-2 border-t border-slate-800/80 leading-relaxed">
                        {t(
                          '⚠️ ఇది సిద్ధాంతపరమైన (Theoretical) అల్గోరిథం మోడల్. మార్కెట్ స్లిప్పేజ్, లిక్విడిటీ లేకపోవడం మరియు ఎక్స్ఛేంజ్ సర్క్యూట్ ఫ్రీజ్‌లు పరిగణించబడవు.',
                          '⚠️ Uses theoretical Black-Scholes pricing without real-market liquidity frictions or circuit limits.'
                        )}
                      </div>
                    </div>

                    {/* Real Market Reality */}
                    <div className="bg-slate-950/80 border-2 border-emerald-500/50 rounded-xl p-4 space-y-2 shadow-lg shadow-emerald-950/30">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-emerald-400">
                          {t('🏦 రియల్ మార్కెట్ వాస్తవం (Actual Trading)', '🏦 Real Market Reality (Actual Trading)')}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                          PRODUCTION
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1.5 pt-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">{t('కేటాయించిన మూలధనం:', 'Capital Deployed:')}</span>
                          <span className="font-mono font-bold text-white">₹5,000.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{t('వాస్తవ రోజువారీ లక్ష్యం:', 'Target Daily Return:')}</span>
                          <span className="font-mono font-bold text-emerald-400">1.0% - 2.5% (₹50 - ₹125)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{t('నెలవారీ చక్రవడ్డీ లాభం:', 'Monthly Compounding:')}</span>
                          <span className="font-mono font-bold text-emerald-400">10% - 20% (₹500 - ₹1,000)</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-emerald-300 pt-2 border-t border-slate-800/80 leading-relaxed font-medium">
                        {t(
                          '✅ ప్రపంచంలోనే టాప్ హెడ్జ్ ఫండ్స్ కూడా నెలకు 5% నుండి 15% మాత్రమే లక్ష్యంగా పెట్టుకుంటాయి. క్రమశిక్షణతో కూడిన నికర ఆదాయమే నిజమైన సంపద.',
                          '✅ Top professional funds aim for 15-30% annual compounding. Safe, disciplined 1-2% daily gains is the realistic path to wealth.'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4 Reasons Why Real Differs from Simulation */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      <span>{t('రియల్ ఆప్షన్స్ మార్కెట్ వాస్తవాలు (4 ముఖ్య స్తంభాలు):', 'Institutional Options Realities (4 Core Principles):')}</span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="font-bold text-amber-400 block mb-0.5">
                          1. ఎక్స్ఛేంజ్ సర్క్యూట్ లిమిట్స్ (Exchange Price Bands & Circuit Limits):
                        </span>
                        {t(
                          'NSE/BSE ఎక్స్ఛేంజ్ నిబంధనల ప్రకారం స్టాక్స్ మరియు ఇండెక్స్‌లకు రోజువారీ సర్క్యూట్ పరిమితులు ఉంటాయి. అనూహ్య మార్కెట్ మూవ్స్‌లో సర్క్యూట్ బ్రేకర్లు అమలులోకి వచ్చి ట్రేడింగ్ నిలిపివేస్తారు. కాబట్టి క్రమశిక్షణతో కూడిన స్టాప్‌లాస్ అత్యంత ముఖ్యం.',
                          'NSE/BSE regulations enforce daily price bands and circuit limits. Sudden volatility triggers exchange halts, making strict stop-loss rules essential.'
                        )}
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="font-bold text-indigo-400 block mb-0.5">
                          2. బిడ్-ఆస్క్ స్ప్రెడ్ & స్లిప్పేజ్ (Bid-Ask Spread & Slippage):
                        </span>
                        {t(
                          'రియల్ మార్కెట్‌లో మీరు కొనాలనుకున్న ధరకు అమ్మేవారు ఉండరు. అమ్మేటప్పుడు కొనేవారు తక్కువ ధరకు అడుగుతారు. దీనివల్ల మార్కెట్ ఆర్డర్లలో స్లిప్పేజ్ ప్రభావం ఉంటుంది.',
                          'Retail option market orders suffer 5-15% slippage and wide spreads, requiring disciplined limit orders.'
                        )}
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="font-bold text-rose-400 block mb-0.5">
                          3. తీటా డికే (Theta Decay / సమయం గడిచేకొద్దీ నష్టం):
                        </span>
                        {t(
                          'రియల్ ఆప్షన్స్ లో సమయం గడిచేకొద్దీ ప్రీమియం కరిగిపోతుంది. మార్కెట్ సైడ్‌వేస్‌లో ఉంటే OTM ఆప్షన్ల విలువ వేగంగా క్షీణిస్తుంది.',
                          'Option buyers face relentless theta decay. Sideways market movement erodes premium values.'
                        )}
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="font-bold text-emerald-400 block mb-0.5">
                          4. సెబీ అధికారిక గణాంకాలు (SEBI F&O Risk Study):
                        </span>
                        {t(
                          'సెబీ అధికారిక సర్వే ప్రకారం, భారతదేశంలో ఆప్షన్స్ ట్రేడింగ్ చేసే రిటైలర్లలో 93% మంది నష్టాల్లోనే ఉన్నారు. అందుకే మన ఆటోమేటెడ్ ఇంజిన్ -20% కఠినమైన స్టాప్ లాస్ మరియు క్యాపిటల్ సేఫ్టీ వాల్ట్ ద్వారా మీ అసలు పెట్టుబడిని కాపాడుతుంది.',
                          'SEBI reports 93% of retail F&O traders make net losses. Our strict -20% stop loss and safe capital vault protect your core capital.'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TRADE-BY-TRADE TAX SLIPS */}
              {activeTab === 'TRADE_SLIPS' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">
                    {t(
                      'ప్రతి క్లోజ్డ్ ట్రేడ్ పై పడిన ఖచ్చితమైన STT, GST, బ్రోకరేజ్ మరియు నికర లాభం రశీదులు:',
                      'Itemized regulatory slips for every closed option trade:'
                    )}
                  </div>

                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 touch-scroll">
                    {slips.map((tr: any) => (
                      <div
                        key={tr.trade_id}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">{tr.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {tr.underlying} | Qty: {tr.quantity}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              tr.gross_pnl >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {tr.exit_reason}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">{tr.exit_time}</span>
                        </div>

                        {/* Trade Financials */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Entry ➔ Exit:</span>
                            <span className="font-mono font-bold text-slate-200">
                              ₹{tr.entry_premium} ➔ ₹{tr.exit_premium}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Gross P&L:</span>
                            <span className={`font-mono font-black ${tr.gross_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {tr.gross_pnl >= 0 ? '+' : ''}₹{tr.gross_pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">All Taxes & Levies:</span>
                            <span className="font-mono font-bold text-rose-300">
                              -₹{tr.total_charges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Net After Taxes:</span>
                            <span className={`font-mono font-black ${tr.net_pnl_after_charges >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                              ₹{tr.net_pnl_after_charges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Charges breakdown chip row */}
                        <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            STT: <strong className="text-amber-300 font-mono">₹{tr.stt}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            Brokerage: <strong className="text-indigo-300 font-mono">₹{tr.brokerage}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            Exchange: <strong className="text-slate-200 font-mono">₹{tr.exchange_charges}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            GST (18%): <strong className="text-rose-300 font-mono">₹{tr.gst}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            Stamp: <strong className="text-slate-200 font-mono">₹{tr.stamp_duty}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            SEBI: <strong className="text-slate-200 font-mono">₹{tr.sebi_charges}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{t('సెబీ & ఆదాయపు పన్ను చట్టం 1961 ప్రకారం రూపొందించబడింది.', 'Compliant with SEBI norms & Indian Income Tax Act 1961.')}</span>
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition cursor-pointer"
          >
            {t('ముగించు (Close)', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
