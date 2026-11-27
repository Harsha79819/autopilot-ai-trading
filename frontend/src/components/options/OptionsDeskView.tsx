import React, { useState, useEffect } from 'react';
import {
  Zap,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Scale,
  Sparkles,
  Info,
  DollarSign,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  Cpu,
  Receipt,
  Download,
  FileArchive,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  OptionChainResponse,
  OptionAISignal,
  OptionsPortfolio,
  OptionsComparisonResponse,
  OptionStrikeItem,
  UnderlyingInfo,
  PCRMaxPainData
} from '../../types';
import { PCRMaxPainBar } from './PCRMaxPainBar';
import { HedgedSpreadCard } from './HedgedSpreadCard';
import { CompoundingChallengeWidget } from './CompoundingChallengeWidget';
import { CapitalVaultManager } from './CapitalVaultManager';
import { TradeReplayModal } from './TradeReplayModal';
import { BrokerBridgeModal } from './BrokerBridgeModal';
import { TaxAndChargesModal } from './TaxAndChargesModal';

export const OptionsDeskView: React.FC = () => {
  const { language, t } = useLanguage();
  const [selectedUnderlying, setSelectedUnderlying] = useState<string>('NIFTY');
  const [underlyings, setUnderlyings] = useState<UnderlyingInfo[]>([]);
  const [chain, setChain] = useState<OptionChainResponse | null>(null);
  const [signal, setSignal] = useState<OptionAISignal | null>(null);
  const [portfolio, setPortfolio] = useState<OptionsPortfolio | null>(null);
  const [comparison, setComparison] = useState<OptionsComparisonResponse | null>(null);
  const [pcrData, setPcrData] = useState<PCRMaxPainData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [showRulesGuide, setShowRulesGuide] = useState<boolean>(false);
  const [orderFeedback, setOrderFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState<boolean>(false);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState<boolean>(false);
  const [selectedReplayTradeId, setSelectedReplayTradeId] = useState<number | null>(null);
  const [isWeeklyArchiveModalOpen, setIsWeeklyArchiveModalOpen] = useState<boolean>(false);
  const [weeklyArchives, setWeeklyArchives] = useState<Array<{ week: string; filename: string; trade_count: number; file_size_kb: number; modified_at: string }>>([]);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const handleOpenWeeklyArchives = async () => {
    setIsWeeklyArchiveModalOpen(true);
    try {
      const data = await api.getOptionsAuditWeeks();
      setWeeklyArchives(data.archives || []);
    } catch (err) {
      console.error('Failed to load weekly archives:', err);
    }
  };

  const handleDownloadFullCsv = async () => {
    try {
      setIsDownloading(true);
      await api.downloadOptionsAuditCsv();
    } catch (err) {
      console.error('Failed to download full CSV:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadWeek = async (week: string) => {
    try {
      await api.downloadOptionsAuditWeek(week);
    } catch (err) {
      console.error(`Failed to download week ${week}:`, err);
    }
  };

  const fetchUnderlyings = async () => {
    try {
      const data = await api.getOptionsUnderlyings();
      setUnderlyings(data);
    } catch (err) {
      console.error('Error fetching underlyings:', err);
    }
  };

  const fetchData = async (underlyingSymbol?: string) => {
    const sym = underlyingSymbol || selectedUnderlying;
    try {
      const [chainData, sigData, portData, compData, pcrInfo] = await Promise.all([
        api.getOptionsChain(sym),
        api.getOptionsSignal(sym),
        api.getOptionsPortfolio(),
        api.getOptionsComparison(),
        api.getPCRMaxPain(sym).catch(() => null)
      ]);
      setChain(chainData);
      setSignal(sigData);
      setPortfolio(portData);
      setComparison(compData);
      if (pcrInfo) setPcrData(pcrInfo);
    } catch (err: any) {
      console.error('Error fetching options data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnderlyings();
    fetchData(selectedUnderlying);
    const interval = setInterval(() => {
      fetchData(selectedUnderlying);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedUnderlying]);

  const handleSelectUnderlying = (sym: string) => {
    setSelectedUnderlying(sym);
    setLoading(true);
    fetchData(sym);
  };

  const handleBuy = async (item: OptionStrikeItem, type: 'CE' | 'PE') => {
    const greeks = type === 'CE' ? item.ce : item.pe;
    if (!chain) return;

    setActionLoading(true);
    setOrderFeedback(null);
    try {
      const res = await api.placeOptionOrder({
        symbol: greeks.symbol,
        underlying: chain.underlying,
        strike_price: item.strike,
        option_type: type,
        expiry_date: chain.expiry_date,
        quantity: chain.lot_size
      });
      setOrderFeedback({
        type: 'success',
        message: res.message || t(
          `${greeks.symbol} 1 లాట్ ఆర్డర్ విజయవంతంగా ఎగ్జిక్యూట్ అయ్యింది!`,
          `Successfully executed 1 lot of ${greeks.symbol}!`
        )
      });
      await fetchData();
    } catch (err: any) {
      setOrderFeedback({
        type: 'error',
        message: err.message || t(
          'ఆర్డర్ ఎగ్జిక్యూషన్‌లో సమస్య ఎదురైంది.',
          'Error executing option order.'
        )
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSquareOff = async (positionId: number) => {
    setActionLoading(true);
    setOrderFeedback(null);
    try {
      const res = await api.squareOffOption(positionId);
      setOrderFeedback({
        type: 'success',
        message: res.message || t(
          'పొజిషన్ విజయవంతంగా స్క్వేర్-ఆఫ్ చేయబడింది.',
          'Position successfully squared off.'
        )
      });
      await fetchData();
    } catch (err: any) {
      setOrderFeedback({
        type: 'error',
        message: err.message || t(
          'స్క్వేర్-ఆఫ్ చేయడంలో సమస్య ఎదురైంది.',
          'Error squaring off position.'
        )
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAutopilot = async () => {
    setActionLoading(true);
    try {
      const res = await api.toggleOptionsAutopilot();
      setPortfolio(prev => prev ? { ...prev, is_autopilot_enabled: res.is_autopilot_enabled } : null);
      setOrderFeedback({
        type: 'success',
        message: t(
          `ఆప్షన్స్ ఆటోపైలట్ మోడ్ ${res.is_autopilot_enabled ? 'ఆన్ చేయబడింది' : 'ఆఫ్ చేయబడింది'}.`,
          `Options AutoPilot mode is now ${res.is_autopilot_enabled ? 'ENABLED' : 'DISABLED'}.`
        )
      });
    } catch (err: any) {
      setOrderFeedback({
        type: 'error',
        message: err.message || 'Failed to toggle autopilot'
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !chain) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] p-6 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-medium">
          {t('లైవ్ ఆప్షన్ చైన్ & గ్రీక్స్ లోడ్ అవుతున్నాయి...', 'Loading Live Option Chain & Greeks...')}
        </p>
      </div>
    );
  }

  const activePosition = portfolio?.open_positions && portfolio.open_positions.length > 0
    ? portfolio.open_positions[0]
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner & Statutory Safeguard */}
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border border-amber-600/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                {t('⚡ F&O వర్చువల్ డెస్క్', '⚡ F&O VIRTUAL DESK')}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                {t('₹5,000 స్వతంత్ర క్యాపిటల్', '₹5,000 Virtual Capital')}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {t('1 లాట్ క్యాప్డ్ (-20% SL)', '1-LOT CAPPED (-20% SL)')}
              </span>

              {/* AutoPilot Mode Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleAutopilot}
                disabled={actionLoading}
                className={`ml-1 text-xs px-2.5 py-1 rounded-full font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  portfolio?.is_autopilot_enabled
                    ? 'bg-indigo-600 text-white shadow ring-1 ring-indigo-400'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
                title={t('స్వయంచాలక BUY & SELL ఆటోపైలట్', 'Autonomous background BUY & SELL')}
              >
                {portfolio?.is_autopilot_enabled ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{t('ఆటోపైలట్: యాక్టివ్', 'AutoPilot: ON')}</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <span>{t('ఆటోపైలట్: ఆఫ్', 'AutoPilot: PAUSED')}</span>
                  </>
                )}
              </button>


              {/* Broker Bridge Trigger Button */}
              <button
                type="button"
                onClick={() => setIsBrokerModalOpen(true)}
                className="text-xs px-2.5 py-1 rounded-full font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 shadow-sm"
                title={t('రియల్ బ్రోకర్ గేట్‌వే లేదా పేపర్ సాండ్‌బాక్స్', 'Real broker bridge or paper trading')}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>🔌 {portfolio?.broker_name || 'PAPER'}</span>
                {portfolio?.is_live_broker_routing ? (
                  <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1 rounded font-mono">LIVE</span>
                ) : (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-mono">SANDBOX</span>
                )}
              </button>

              {/* Tax & Regulatory Charges Trigger Button */}
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(true)}
                className="text-xs px-2.5 py-1 rounded-full font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:border-amber-400 shadow-sm"
                title={t('భారతీయ పన్నులు & చార్జీల విశ్లేషణ', 'Indian F&O Statutory Taxes & Charges')}
              >
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('🏛️ పన్నులు & చార్జీలు', '🏛️ Taxes & Charges')}</span>
              </button>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-white mt-2 tracking-tight flex items-center gap-2">
              {chain?.underlying_name || chain?.underlying || 'NIFTY 50'} {t('ఆప్షన్స్ ట్రేడింగ్ డెస్క్', 'Options Trading Desk')}
              <span className="text-xs font-normal text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                {t('(చిన్న & పెద్ద అన్ని స్టాక్స్)', '(Multi-Asset Stock & Index Options)')}
              </span>
            </h1>

            <p className="text-xs md:text-sm text-slate-300 mt-1">
              {t(
                'సెబీ 93% నష్టాల నివారణకు -20% కఠినమైన స్టాప్ లాస్ మరియు 15:10 IST స్క్వేర్-ఆఫ్ తో రక్షించబడిన నిబంధనలు.',
                'Enforces SEBI top-7% investor rules: Strict -20% Stop-Loss, trailing gains, and mandatory 15:10 IST square-off against Theta decay.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/60 p-3.5 rounded-xl shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">{chain?.underlying} SPOT</div>
              <div className="text-lg font-black text-white font-mono flex items-center justify-end gap-1.5">
                {chain?.spot_price ? chain.spot_price.toLocaleString('en-IN') : '24,150.00'}
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  (chain?.change_pct || 0) >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {(chain?.change_pct || 0) >= 0 ? `+${chain?.change_pct}%` : `${chain?.change_pct}%`}
                </span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-700 mx-1" />
            <div>
              <div className="text-xs text-slate-400">{t('ఎక్స్‌పైరీ', 'EXPIRY')}</div>
              <div className="text-xs font-bold text-amber-300 font-mono bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                {chain?.expiry_date || 'WEEKLY'}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback alert */}
        {orderFeedback && (
          <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
            orderFeedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {orderFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{orderFeedback.message}</span>
            </div>
            <button
              onClick={() => setOrderFeedback(null)}
              className="text-slate-400 hover:text-white px-2 py-0.5 text-xs"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. Top Metric Cards (Virtual Cash Balance & Live Account Metrics at the very top) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Cash Balance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow">
          <div className="text-xs text-slate-400 font-medium">
            {t('వర్చువల్ క్యాష్ బ్యాలెన్స్', 'Virtual Cash Balance')}
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-white mt-1">
            ₹{portfolio?.cash_balance ? portfolio.cash_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '5,000.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{t('ప్రారంభం: ₹5,000', 'Initial: ₹5,000')}</span>
            <span className="text-emerald-400 font-medium">{t('100% సేఫ్ మోడ్', 'Safe Mode')}</span>
          </div>
        </div>

        {/* Realized P&L */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>{t('రియలైజ్డ్ లాభనష్టాలు (P&L)', 'Realized P&L')}</span>
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(true)}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30"
                title={t('పన్నులు & కట్‌ఆఫ్స్ చూడండి', 'View Taxes & Levies')}
              >
                <Receipt className="w-3 h-3" />
                <span>{t('పన్నులు', 'Taxes')}</span>
              </button>
            </div>
            <div className={`text-xl md:text-2xl font-bold font-mono mt-1 ${
              (portfolio?.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {(portfolio?.realized_pnl || 0) >= 0 ? '+' : ''}₹{portfolio?.realized_pnl.toFixed(2) || '0.00'}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>{t('విన్ రేట్:', 'Win Rate:')} {portfolio?.win_rate_pct || 0}%</span>
            <span className="text-rose-400 font-mono font-medium">
              {t('ఫీజులు:', 'Levies:')} -₹{(portfolio?.total_fees || 240).toFixed(0)}
            </span>
          </div>
        </div>

        {/* Active Position */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow">
          <div className="text-xs text-slate-400 font-medium">
            {t('సక్రియ కాంట్రాక్ట్ (Active Contract)', 'Active 1-Lot Position')}
          </div>
          <div className="text-base md:text-lg font-bold font-mono mt-1 truncate">
            {activePosition ? (
              <span className={activePosition.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {activePosition.symbol} ({activePosition.unrealized_pnl >= 0 ? '+' : ''}₹{activePosition.unrealized_pnl.toFixed(2)})
              </span>
            ) : (
              <span className="text-slate-400 font-normal">{t('ఓపెన్ ట్రేడ్లు లేవు', 'No Open Positions')}</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {activePosition ? (
              <span className="text-amber-400">{t('గరిష్ట రిస్క్: -20% SL', 'Max Risk: -20% Hard SL')}</span>
            ) : (
              <span>{t('మంచి ఆపర్చునిటీ కోసం వెయిటింగ్', 'AI Scanning Opportunities')}</span>
            )}
          </div>
        </div>

        {/* AI Market Bias */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow">
          <div className="text-xs text-slate-400 font-medium">
            {t('AI మొమెంటం సిగ్నల్', 'AI Momentum Bias')}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
              signal?.bias === 'BULLISH'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : signal?.bias === 'BEARISH'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {signal?.bias || 'NEUTRAL'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {signal?.confidence_pct || 50}% {t('కాన్ఫిడెన్స్', 'Confidence')}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {signal?.recommended_type === 'NONE'
              ? t('సైడ్‌వేస్ మార్కెట్ - తీటా డికే రిస్క్', 'Sideways - Theta Decay Risk')
              : `${signal?.recommended_type} ${t('స్ట్రైక్ అనుకూలం', 'Contract Favored')}`}
          </div>
        </div>
      </div>

      {/* 2b. Live Guardian Monitor (Placed right on top of Capital Safety Vault per trader request) */}
      {activePosition ? (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded animate-pulse">
                  🟢 {t('లైవ్ పొజిషన్ మానిటర్', 'LIVE GUARDIAN MONITOR')}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {t('పరిమాణం:', 'Size:')} {activePosition.quantity} {t('షేర్లు', 'shares')}
                </span>
              </div>
              <h2 className="text-xl font-black text-white font-mono mt-1">
                {activePosition.symbol} ({activePosition.option_type === 'CE' ? 'CALL OPTION' : 'PUT OPTION'})
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-400">{t('లైవ్ అన్‌రియలైజ్డ్ P&L', 'Live Unrealized P&L')}</div>
                <div className={`text-2xl font-black font-mono ${
                  activePosition.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {activePosition.unrealized_pnl >= 0 ? '+' : ''}₹{activePosition.unrealized_pnl.toFixed(2)}
                  <span className="text-xs ml-1.5 font-normal">
                    ({activePosition.unrealized_pnl_pct >= 0 ? '+' : ''}{activePosition.unrealized_pnl_pct.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <button
                disabled={actionLoading}
                onClick={() => handleSquareOff(activePosition.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {t('స్క్వేర్-ఆఫ్ (Exit Now)', 'Square-Off (Exit Now)')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="text-slate-400">{t('ఎంట్రీ ప్రీమియం', 'Entry Premium')}</div>
              <div className="text-white font-mono font-bold text-sm mt-0.5">₹{activePosition.entry_premium.toFixed(2)}</div>
              <div className="text-[11px] text-slate-500">{t('మార్జిన్:', 'Margin:')} ₹{activePosition.invested_margin.toFixed(2)}</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="text-slate-400">{t('ప్రస్తుత ప్రీమియం (LTP)', 'Current LTP')}</div>
              <div className="text-white font-mono font-bold text-sm mt-0.5">₹{activePosition.current_premium.toFixed(2)}</div>
              <div className="text-[11px] text-emerald-400">{t('బ్లాక్-స్కోల్స్ లైవ్ ధర', 'Live Pricing')}</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-rose-900/40">
              <div className="text-rose-400 font-medium">{t('హార్డ్ స్టాప్ లాస్ (-20%)', 'Hard Stop Loss (-20%)')}</div>
              <div className="text-rose-300 font-mono font-bold text-sm mt-0.5">₹{activePosition.stop_loss_premium.toFixed(2)}</div>
              <div className="text-[11px] text-slate-500">{t('ఆటోమేటిక్ ఎగ్జిట్ గ్యారంటీ', 'Guaranteed Exit')}</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-emerald-900/40">
              <div className="text-emerald-400 font-medium">{t('టార్గెట్ 1 (+40%)', 'Target 1 (+40%)')}</div>
              <div className="text-emerald-300 font-mono font-bold text-sm mt-0.5">₹{activePosition.target_premium.toFixed(2)}</div>
              <div className="text-[11px] text-slate-500">
                {t('ట్రెయిలింగ్ SL:', 'Trailing SL:')} {activePosition.trailing_activated ? t('యాక్టివ్', 'Active') : t('వెయిటింగ్', 'Waiting')}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              🟢 {t('లైవ్ పొజిషన్ మానిటర్', 'LIVE GUARDIAN MONITOR')}
            </span>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                {t('స్టాండ్‌బై మోడ్: ఓపెన్ రిస్క్ లేదు (0 కాంట్రాక్ట్‌లు)', 'Standby Mode: Zero Open Risk (0 Contracts Active)')}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {t('AI స్కానర్ నిరంతరం పర్యవేక్షిస్తోంది • కన్విక్షన్ ≥72% రాగానే లైవ్ మానిటరింగ్ ఆటోమేటిక్‌గా మొదలవుతుంది', 'AI actively scanning • Live monitoring activates instantly when high-conviction (≥72%) setup is filled')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="px-2.5 py-1 bg-slate-950/70 border border-slate-800 text-slate-300 rounded-lg text-[11px] font-mono">
              🛡️ {t('రక్షణ: -20% SL • 15:10 కట్‌ఆఫ్', 'Guard: -20% Hard SL • 15:10 EOD Cutoff')}
            </span>
          </div>
        </div>
      )}

      {/* 3. Capital Safety Vault & 2-Way Flow (Vice Versa Transfer Station) */}
      <CapitalVaultManager onTransferComplete={() => fetchData(selectedUnderlying)} />

      {/* 4. Institutional PCR & Max Pain Gauge */}
      <PCRMaxPainBar data={pcrData} loading={loading} />

      {/* 5. Multi-Underlying Asset Selector Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            {t('స్టాక్ లేదా ఇండెక్స్ ఎంచుకోండి:', 'Select Underlying Asset (Index / Stock):')}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {t('చిన్న & పెద్ద అన్ని స్టాక్స్ ఆప్షన్స్ చైన్లు', 'All large & mid-cap F&O options chains available')}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto touch-scroll no-scrollbar py-1">
          {underlyings.map((u) => {
            const isSelected = selectedUnderlying === u.symbol;
            return (
              <button
                key={u.symbol}
                type="button"
                onClick={() => handleSelectUnderlying(u.symbol)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400 shadow-md ring-1 ring-amber-400/50'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{u.symbol}</span>
                <span className="text-[11px] font-mono text-slate-300">₹{u.spot_price.toLocaleString('en-IN')}</span>
                <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                  u.change_pct >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                }`}>
                  {u.change_pct >= 0 ? `+${u.change_pct}%` : `${u.change_pct}%`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Educational Guide: Why Options Rules Differ from Equity (Collapsible) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow">
        <button
          type="button"
          onClick={() => setShowRulesGuide(prev => !prev)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold text-white">
              {t(
                '📖 ఆప్షన్స్ ట్రేడింగ్ రూల్స్ ఈక్విటీ కంటే ఎందుకు పూర్తిగా భిన్నంగా ఉంటాయి? (5 గోల్డెన్ రూల్స్)',
                '📖 Why Options Rules Differ from Equity Cash (The 5 Golden Rules of Options Trading)'
              )}
            </span>
          </div>
          {showRulesGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showRulesGuide && (
          <div className="p-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-3 bg-slate-950/60 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-300 block mb-1">
                  1. {t('తీటా డికే (Time Decay):', 'Theta / Time Decay:')}
                </span>
                <p>
                  {t(
                    'ఈక్విటీ షేర్ కదలకుండా ఉంటే నష్టం ఉండదు. కానీ ఆప్షన్లలో స్టాక్ కదలకుండా ఉంటే ప్రతి సెకను ప్రీమియం కరిగి ₹0 కి పడిపోతుంది.',
                    'In equity, flat stocks cause ₹0 loss. In options, a flat stock melts premium to ₹0 over time due to Theta decay.'
                  )}
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-indigo-300 block mb-1">
                  2. {t('ఎక్స్‌పైరీ గడువు (Expiry Deadlines):', 'Expiry Deadlines:')}
                </span>
                <p>
                  {t(
                    'ఈక్విటీని సంవత్సరాల తరబడి హోల్డ్ చేయవచ్చు. ఆప్షన్స్ ప్రతి వారం లేదా నెల గురువారం ఎక్స్‌పైర్ అయిపోతాయి.',
                    'Equity shares can be held for years. Options contracts strictly terminate on expiry Thursdays.'
                  )}
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-emerald-300 block mb-1">
                  3. {t('భారీ లెవరేజ్ & స్పీడ్ (High Leverage):', 'High Leverage & Speed:')}
                </span>
                <p>
                  {t(
                    'స్టాక్ లో 2% కదలిక వస్తే, ఆప్షన్ ప్రీమియం 50% నుండి 150% వరకు కొన్ని గంటల్లోనే దూసుకుపోతుంది.',
                    'A 2% stock move can generate a 50% to 150% jump in option premium within hours.'
                  )}
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-rose-300 block mb-1">
                  4. {t('-20% కఠినమైన స్టాప్ లాస్ (Strict Stop Loss):', 'Strict -20% Stop Loss:')}
                </span>
                <p>
                  {t(
                    'ఆప్షన్లలో "తిరిగి పెరుగుతుందిలే" అని వేచిచూడకూడదు. -20% వద్ద నష్టాన్ని కట్ చేయడం ద్వారా క్యాపిటల్ సురక్షితంగా ఉంటుంది.',
                    'Never hold losing options hoping for miracles. Cutting losses at -20% protects the ₹5,000 capital.'
                  )}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-200">
              <strong>5. {t('15:10 IST లోపు తప్పనిసరి స్క్వేర్-ఆఫ్:', 'Mandatory 15:10 IST Square-Off:')}</strong>{' '}
              {t(
                'సెబీ రిపోర్ట్ ప్రకారం 93% మంది నష్టపోయే ప్రధాన కారణం రాత్రికి (Overnight) హోల్డ్ చేయడం. మన ప్లాట్‌ఫామ్ 15:10 IST కి పొజిషన్ క్లోజ్ చేసి ఓవర్‌నైట్ రిస్క్‌ను నివారిస్తుంది.',
                'SEBI reports 93% of retail traders lose primarily due to overnight gap risk. Our platform auto squares off at 15:10 IST.'
              )}
            </div>
          </div>
        )}
      </div>



      {/* 5b. 30-Day ₹5,000 Capital Compounding Challenge */}
      <CompoundingChallengeWidget />

      {/* 6. AI Recommendation Box */}
      {signal && signal.bias !== 'NEUTRAL' && !activePosition && (
        <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                {t('AI సూచన:', 'AI Recommendation:')} {signal.bias} SETUP ({chain?.underlying})
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded font-mono">
                  {signal.confidence_pct}% Confidence
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">{signal.reason}</p>
            </div>
          </div>

          {chain && signal.recommended_symbol && (
            <div className="flex items-center gap-2 shrink-0">
              {(() => {
                const recStrike = chain.strikes.find(s => s.strike === signal.recommended_strike);
                if (!recStrike) return null;
                const recGreeks = signal.recommended_type === 'CE' ? recStrike.ce : recStrike.pe;
                return (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleBuy(recStrike, signal.recommended_type as 'CE' | 'PE')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {t('AI సిగ్నల్ ట్రేడ్ తీసుకోండి:', 'Execute AI Signal:')} {signal.recommended_symbol} (₹{recGreeks.ltp})
                  </button>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 6b. 1-Click Hedged Spreads (Bull Call & Bear Put Spread) */}
      <HedgedSpreadCard
        underlying={chain?.underlying || selectedUnderlying}
        spotPrice={chain?.spot_price || 24150}
        strikeStep={chain?.strike_step || 50}
        lotSize={chain?.lot_size || 25}
        onSpreadExecuted={fetchData}
        disabled={activePosition !== null}
      />

      {/* 7. Option Chain Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              {chain?.underlying_name || chain?.underlying} {t('ఆప్షన్ చైన్ (లైవ్ స్ట్రైక్స్ & గ్రీక్స్)', 'Option Chain (Live Strikes & Greeks)')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t(
                `లాట్ సైజ్: ${chain?.lot_size || 25} షేర్లు. ప్రీమియం మరియు మార్జిన్ చూసి 1-క్లిక్‌తో ఆర్డర్ చేయండి.`,
                `Lot Size: ${chain?.lot_size || 25} shares. 1-Click Buy with automatic -20% stop loss.`
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> ATM Strike
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Calls (CE)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> Puts (PE)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <th colSpan={5} className="py-2.5 px-3 text-center text-emerald-400 font-bold border-r border-slate-800">
                  {t('CALL OPTIONS (CE - అప్‌ట్రెండ్)', 'CALL OPTIONS (CE - Bullish)')}
                </th>
                <th className="py-2.5 px-4 text-center font-bold text-white bg-slate-900 border-x border-slate-800">
                  {t('స్ట్రైక్ (STRIKE)', 'STRIKE')}
                </th>
                <th colSpan={5} className="py-2.5 px-3 text-center text-rose-400 font-bold border-l border-slate-800">
                  {t('PUT OPTIONS (PE - డౌన్‌ట్రెండ్)', 'PUT OPTIONS (PE - Bearish)')}
                </th>
              </tr>
              <tr className="bg-slate-950/40 text-slate-400 text-[11px] border-b border-slate-800 font-mono">
                {/* CE Headers */}
                <th className="py-2 px-2 text-center">DELTA</th>
                <th className="py-2 px-2 text-center">THETA/D</th>
                <th className="py-2 px-2 text-right">LTP (₹)</th>
                <th className="py-2 px-2 text-right">MARGIN (₹)</th>
                <th className="py-2 px-2 text-center border-r border-slate-800">ACTION</th>

                {/* Strike Header */}
                <th className="py-2 px-4 text-center bg-slate-900/60 text-white font-bold border-x border-slate-800">
                  PRICE
                </th>

                {/* PE Headers */}
                <th className="py-2 px-2 text-center border-l border-slate-800">ACTION</th>
                <th className="py-2 px-2 text-left">MARGIN (₹)</th>
                <th className="py-2 px-2 text-left">LTP (₹)</th>
                <th className="py-2 px-2 text-center">THETA/D</th>
                <th className="py-2 px-2 text-center">DELTA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {chain?.strikes.map((s) => {
                const isAtm = s.is_atm;
                const canAffordCe = (portfolio?.cash_balance || 0) >= (s.ce.margin_required + 20);
                const canAffordPe = (portfolio?.cash_balance || 0) >= (s.pe.margin_required + 20);

                return (
                  <tr
                    key={s.strike}
                    className={`transition ${
                      isAtm ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* CE Columns */}
                    <td className="py-2.5 px-2 text-center text-slate-400">{s.ce.delta.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-center text-rose-400/80">₹{s.ce.theta.toFixed(1)}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-400">₹{s.ce.ltp.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-300">₹{s.ce.margin_required.toFixed(0)}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-800">
                      <button
                        disabled={actionLoading || !!activePosition || !canAffordCe}
                        onClick={() => handleBuy(s, 'CE')}
                        title={
                          activePosition
                            ? t('ఇప్పటికే 1 పొజిషన్ ఓపెన్‌లో ఉంది', 'An active position is already open')
                            : !canAffordCe
                            ? t('సరిపడా క్యాష్ లేదు', 'Insufficient cash balance')
                            : t('కాల్ కొనండి', 'Buy Call Option')
                        }
                        className="px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600/90 text-white text-[11px] font-bold rounded shadow transition cursor-pointer"
                      >
                        BUY CE
                      </button>
                    </td>

                    {/* Strike Center Column */}
                    <td className="py-2.5 px-4 text-center bg-slate-900 font-bold border-x border-slate-800 text-sm">
                      <span className={isAtm ? 'text-amber-400 font-black' : 'text-white'}>
                        {s.strike}
                      </span>
                      {isAtm && (
                        <span className="block text-[9px] text-amber-300/80 font-sans tracking-tight">
                          ATM STRIKE
                        </span>
                      )}
                    </td>

                    {/* PE Columns */}
                    <td className="py-2.5 px-2 text-center border-l border-slate-800">
                      <button
                        disabled={actionLoading || !!activePosition || !canAffordPe}
                        onClick={() => handleBuy(s, 'PE')}
                        title={
                          activePosition
                            ? t('ఇప్పటికే 1 పొజిషన్ ఓపెన్‌లో ఉంది', 'An active position is already open')
                            : !canAffordPe
                            ? t('సరిపడా క్యాష్ లేదు', 'Insufficient cash balance')
                            : t('పుట్ కొనండి', 'Buy Put Option')
                        }
                        className="px-2.5 py-1 bg-rose-600/90 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600/90 text-white text-[11px] font-bold rounded shadow transition cursor-pointer"
                      >
                        BUY PE
                      </button>
                    </td>
                    <td className="py-2.5 px-2 text-left text-slate-300">₹{s.pe.margin_required.toFixed(0)}</td>
                    <td className="py-2.5 px-2 text-left font-bold text-rose-400">₹{s.pe.ltp.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-center text-rose-400/80">₹{s.pe.theta.toFixed(1)}</td>
                    <td className="py-2.5 px-2 text-center text-slate-400">{s.pe.delta.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Side-by-Side Comparison Matrix (Equity vs Options) */}
      {comparison && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                  <Scale className="w-4 h-4" />
                </span>
                <h2 className="text-base md:text-lg font-bold text-white">
                  ⚖️ {t('ఈక్విటీ vs ఆప్షన్స్ టెలిమెట్రీ (లైవ్ కంపారిజన్)', 'Equity vs Options Telemetry (Side-by-Side Audit)')}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t(
                  'ఏ సెగ్మెంట్ ఎక్కువ క్రమశిక్షణతో, అధిక లాభాలతో రిస్క్-ఫ్రీగా నడుస్తుందో ఒకే స్క్రీన్ పై లైవ్ ఆడిట్.',
                  'Live comparative analytics evaluating Win Rate, Net ROI %, and Risk-adjusted Profit Factor across both trading arms.'
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {/* Equity Card */}
            <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-cyan-300">💼 {comparison.equity.name}</span>
                </div>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono">
                  {comparison.equity.win_rate_pct}% {t('విన్ రేట్', 'Win Rate')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">{t('క్యాపిటల్:', 'Capital:')}</span>
                  <div className="text-white font-mono font-bold">₹{comparison.equity.initial_capital.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-slate-400">{t('కరెంట్ ఈక్విటీ:', 'Current Equity:')}</span>
                  <div className="text-white font-mono font-bold">₹{comparison.equity.current_equity.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-slate-400">{t('నెట్ రియలైజ్డ్ P&L:', 'Net Realized P&L:')}</span>
                  <div className={`font-mono font-bold ${comparison.equity.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {comparison.equity.realized_pnl >= 0 ? '+' : ''}₹{comparison.equity.realized_pnl.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">{t('రిటర్న్ (ROI):', 'Return (ROI):')}</span>
                  <div className={`font-mono font-bold ${comparison.equity.roi_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {comparison.equity.roi_pct >= 0 ? '+' : ''}{comparison.equity.roi_pct.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">{t('ట్రేడ్లు (W/L):', 'Trades (W/L):')}</span>
                  <div className="text-slate-300 font-mono">
                    {comparison.equity.total_trades} ({comparison.equity.winning_trades}W / {comparison.equity.losing_trades}L)
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">{t('ప్రాఫిట్ ఫ్యాక్టర్:', 'Profit Factor:')}</span>
                  <div className="text-slate-300 font-mono font-bold">{comparison.equity.profit_factor}x</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-cyan-400 font-bold block mb-0.5">
                  {t('హోల్డింగ్ రకం:', 'Holding Type:')} {comparison.equity.holding_type}
                </span>
                {comparison.equity.risk_profile}
              </div>
            </div>

            {/* Options Card */}
            <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-amber-300">⚡ {comparison.options.name}</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
                  {comparison.options.win_rate_pct}% {t('విన్ రేట్', 'Win Rate')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">{t('క్యాపిటల్:', 'Capital:')}</span>
                  <div className="text-white font-mono font-bold">₹{comparison.options.initial_capital.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-slate-400">{t('కరెంట్ ఈక్విటీ:', 'Current Equity:')}</span>
                  <div className="text-white font-mono font-bold">₹{comparison.options.current_equity.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-slate-400">{t('నెట్ రియలైజ్డ్ P&L:', 'Net Realized P&L:')}</span>
                  <div className={`font-mono font-bold ${comparison.options.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {comparison.options.realized_pnl >= 0 ? '+' : ''}₹{comparison.options.realized_pnl.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">{t('రిటర్న్ (ROI):', 'Return (ROI):')}</span>
                  <div className={`font-mono font-bold ${comparison.options.roi_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {comparison.options.roi_pct >= 0 ? '+' : ''}{comparison.options.roi_pct.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">{t('ట్రేడ్లు (W/L):', 'Trades (W/L):')}</span>
                  <div className="text-slate-300 font-mono">
                    {comparison.options.total_trades} ({comparison.options.winning_trades}W / {comparison.options.losing_trades}L)
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">{t('ప్రాఫిట్ ఫ్యాక్టర్:', 'Profit Factor:')}</span>
                  <div className="text-slate-300 font-mono font-bold">{comparison.options.profit_factor}x</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-amber-400 font-bold block mb-0.5">
                  {t('హోల్డింగ్ రకం:', 'Holding Type:')} {comparison.options.holding_type}
                </span>
                {comparison.options.risk_profile}
              </div>
            </div>
          </div>

          {/* AI Insight Box */}
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs text-slate-300 space-y-1 whitespace-pre-line">
            {language === 'te' ? comparison.ai_insight_telugu : (
              "💡 **Professional Real Investor Telemetry Report:**\n" +
              "• **Equity:** Downward market swings are recoverable by holding quality companies over time; zero Theta time decay.\n" +
              "• **Options:** High leverage efficiency enables quick upside on low capital (₹5k), but avoiding the 93% retail loss statistic strictly requires non-negotiable -20% stop-losses and zero overnight carryover."
            )}
          </div>
        </div>
      )}

      {/* 9. Recent Options Closed Trades */}
      {portfolio?.recent_trades && portfolio.recent_trades.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{t('ఇటీవలి ఆప్షన్స్ ట్రేడ్ల చరిత్ర (Audit Log)', 'Recent Options Closed Trades (Audit Log)')}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                {t('లైవ్ 20 ట్రేడ్లు', 'Live 20 trades')}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadFullCsv}
                disabled={isDownloading}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium text-xs inline-flex items-center gap-1.5 transition-all border border-emerald-500/30 cursor-pointer disabled:opacity-50"
                title={t('పూర్తి ఆడిట్ లాగ్‌ను ఎక్సెల్ CSV గా డౌన్‌లోడ్ చేసుకోండి', 'Download complete audit log as CSV for Excel')}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isDownloading ? t('డౌన్‌లోడ్ అవుతోంది...', 'Exporting...') : t('ఎక్సెల్ CSV ఎక్స్‌పోర్ట్', 'Export CSV')}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenWeeklyArchives}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-medium text-xs inline-flex items-center gap-1.5 transition-all border border-indigo-500/30 cursor-pointer"
                title={t('వారం వారీ కంప్రెస్డ్ (.csv.gz) ఆర్కైవ్‌లను చూడండి', 'View weekly compressed (.csv.gz) archives')}
              >
                <FileArchive className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('వారం వారీ ఆర్కైవ్స్ (.csv.gz)', 'Weekly Archives (.csv.gz)')}</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-3">SYMBOL</th>
                  <th className="py-2 px-3">TYPE</th>
                  <th className="py-2 px-3 text-right">ENTRY</th>
                  <th className="py-2 px-3 text-right">EXIT</th>
                  <th className="py-2 px-3 text-right">REALIZED P&L</th>
                  <th className="py-2 px-3 text-right">RETURN %</th>
                  <th className="py-2 px-3">EXIT REASON</th>
                  <th className="py-2 px-3 text-center">REPLAY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono">
                {portfolio.recent_trades.map((tItem) => (
                  <tr key={tItem.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-bold text-white">{tItem.symbol}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        tItem.option_type === 'CE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {tItem.option_type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">₹{tItem.entry_premium.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-300">₹{tItem.exit_premium.toFixed(2)}</td>
                    <td className={`py-2 px-3 text-right font-bold ${
                      tItem.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {tItem.realized_pnl >= 0 ? '+' : ''}₹{tItem.realized_pnl.toFixed(2)}
                    </td>
                    <td className={`py-2 px-3 text-right ${
                      tItem.return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {tItem.return_pct >= 0 ? '+' : ''}{tItem.return_pct.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[11px] font-sans">
                      {tItem.exit_reason === 'STOP_LOSS_HIT' ? (
                        <span className="text-rose-400 font-medium">🔴 {t('స్టాప్-లాస్ (-20%)', 'Stop-Loss (-20%)')}</span>
                      ) : tItem.exit_reason === 'TARGET_HIT' ? (
                        <span className="text-emerald-400 font-medium">🟢 {t('టార్గెట్ (+40% / +100%)', 'Target (+40% / +100%)')}</span>
                      ) : tItem.exit_reason === 'TRAILING_STOP_HIT' ? (
                        <span className="text-amber-400 font-medium">🟡 {t('ట్రెయిలింగ్ స్టాప్ హిట్', 'Trailing Stop Hit')}</span>
                      ) : (
                        <span className="text-slate-400 font-medium">⚡ {t('15:10 IST స్క్వేర్-ఆఫ్', '15:10 IST EOD Exit')}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedReplayTradeId(tItem.id)}
                        className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold text-[11px] inline-flex items-center gap-1 transition-all border border-indigo-500/30 cursor-pointer"
                        title={t('ఈ ట్రేడ్‌ను టిక్-బై-టిక్ ప్లే చేసి చూడండి', 'Replay this trade tick-by-tick')}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{t('రిప్లే', 'Replay')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Advanced Modals */}
      <BrokerBridgeModal
        isOpen={isBrokerModalOpen}
        onClose={() => setIsBrokerModalOpen(false)}
        onConfigSaved={fetchData}
      />

      <TradeReplayModal
        isOpen={selectedReplayTradeId !== null}
        tradeId={selectedReplayTradeId}
        onClose={() => setSelectedReplayTradeId(null)}
      />

      <TaxAndChargesModal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
      />

      {/* Weekly Compressed Archives Modal */}
      {isWeeklyArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileArchive className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  {t('వారం వారీ కంప్రెస్డ్ ఆర్కైవ్‌లు (Gzip .csv.gz)', 'Weekly Compressed Archives (Gzip .csv.gz)')}
                </h3>
              </div>
              <button
                onClick={() => setIsWeeklyArchiveModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                {t(
                  '💡 ప్రతి క్లోజ్డ్ ట్రేడ్ మెట్రిక్స్ ఆటోమేటిక్‌గా 85%+ కంప్రెస్ అయి .csv.gz ఫార్మాట్‌లో స్టోర్ చేయబడతాయి. 10,000 ట్రేడ్లు కూడా కేవలం ~150 KB మెమరీలోనే సేవ్ అవుతాయి.',
                  '💡 Every closed trade metric is automatically compressed 85%+ into .csv.gz format. Even 10,000 trades take only ~150 KB of memory.'
                )}
              </div>

              {weeklyArchives.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  {t('ఆర్కైవ్‌లు ఇంకా ఏమీ అందుబాటులో లేవు', 'No weekly archives found yet')}
                </div>
              ) : (
                <div className="space-y-2">
                  {weeklyArchives.map((arch) => (
                    <div
                      key={arch.week}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white">{arch.week}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                            {arch.trade_count} {t('ట్రేడ్లు', 'trades')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {arch.filename} • {arch.file_size_kb} KB
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadWeek(arch.week)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold text-xs inline-flex items-center gap-1.5 transition-all border border-indigo-500/30 cursor-pointer"
                        title={t('డౌన్‌లోడ్', 'Download')}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.csv.gz</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-800 flex justify-end bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsWeeklyArchiveModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('మూసివేయి', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
