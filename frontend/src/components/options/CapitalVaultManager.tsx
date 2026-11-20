import React, { useState, useEffect } from 'react';
import {
  Vault,
  ShieldCheck,
  Moon,
  Zap,
  TrendingUp,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Power,
  Briefcase,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

interface CapitalVaultManagerProps {
  onTransferComplete?: () => void;
}

interface PendingTransfer {
  amount: number;
  fromDesk: 'OPTIONS' | 'VAULT' | 'EQUITY';
  toDesk: 'OPTIONS' | 'VAULT' | 'EQUITY';
  fromLabel: string;
  toLabel: string;
}

export const CapitalVaultManager: React.FC<CapitalVaultManagerProps> = ({ onTransferComplete }) => {
  const { t } = useLanguage();
  const [vaultData, setVaultData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [direction, setDirection] = useState<'OPTIONS_TO_VAULT' | 'VAULT_TO_OPTIONS' | 'EQUITY_VAULT'>('OPTIONS_TO_VAULT');

  // Input amounts
  const [transferAmount, setTransferAmount] = useState<number>(100000);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(25000);
  const [equityAmount, setEquityAmount] = useState<number>(1000);
  const [equityDirection, setEquityDirection] = useState<'EQUITY_TO_VAULT' | 'VAULT_TO_EQUITY'>('VAULT_TO_EQUITY');

  // History radio filter
  const [historyFilter, setHistoryFilter] = useState<'LATEST' | 'LAST_3' | 'ALL'>('LATEST');
  const [hasInitializedAmount, setHasInitializedAmount] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Security PIN Modal states
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [pinModalError, setPinModalError] = useState<string | null>(null);

  // Change PIN Modal states
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [changePinError, setChangePinError] = useState<string | null>(null);

  const fetchVault = async () => {
    try {
      const res = await api.getVaultStatus();
      setVaultData(res);
      if (!hasInitializedAmount && res.options_cash_balance > 0) {
        // Default to keeping ₹25,000 for tomorrow's trading, and setting transfer to the rest
        const defaultTransfer = Math.max(0, Math.floor(res.options_cash_balance) - 25000);
        setTransferAmount(defaultTransfer > 0 ? defaultTransfer : Math.floor(res.options_cash_balance));
        setWithdrawAmount(Math.min(25000, Math.floor(res.profit_vault_locked || 0)));
        setHasInitializedAmount(true);
      }
    } catch (err) {
      console.error('Failed to fetch vault status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVault();
    const interval = setInterval(fetchVault, 5000);
    return () => clearInterval(interval);
  }, []);

  const optionsCash = vaultData?.options_cash_balance || 0;
  const equityCash = vaultData?.main_equity_cash_balance || 0;
  const vaultLocked = vaultData?.profit_vault_locked || 0;
  const defaultPin = vaultData?.vault_pin_default || '7981';

  // Open PIN verification modal
  const requestTransferWithPin = (
    amount: number,
    fromDesk: 'OPTIONS' | 'VAULT' | 'EQUITY',
    toDesk: 'OPTIONS' | 'VAULT' | 'EQUITY',
    fromLabel: string,
    toLabel: string
  ) => {
    if (!amount || amount <= 0) {
      setFeedback({ type: 'error', message: 'దయచేసి ₹0 కంటే ఎక్కువ మొత్తం నమోదు చేయండి (Enter an amount > 0).' });
      return;
    }
    setPendingTransfer({
      amount,
      fromDesk,
      toDesk,
      fromLabel,
      toLabel
    });
    setPinInput('');
    setShowPin(false);
    setPinModalError(null);
    setShowPinModal(true);
  };

  // Confirm transfer with PIN
  const handleConfirmTransferWithPin = async () => {
    if (!pendingTransfer) return;
    if (!pinInput || pinInput.trim().length === 0) {
      setPinModalError('దయచేసి మీ 4-అంకెల వాల్ట్ సెక్యూరిటీ పిన్ ఎంటర్ చేయండి (Enter 4-digit PIN).');
      return;
    }

    setActionLoading(true);
    setPinModalError(null);

    try {
      const res = await api.transferProfitVault(
        pendingTransfer.amount,
        pendingTransfer.fromDesk,
        pendingTransfer.toDesk,
        pinInput.trim()
      );

      setShowPinModal(false);
      setPendingTransfer(null);
      setPinInput('');

      setFeedback({
        type: 'success',
        message:
          res.message ||
          `₹${pendingTransfer.amount.toLocaleString('en-IN')} విజయవంతంగా బదిలీ చేయబడింది! (${pendingTransfer.fromLabel} ➔ ${pendingTransfer.toLabel})`
      });

      await fetchVault();
      if (onTransferComplete) {
        onTransferComplete();
      }
    } catch (err: any) {
      setPinModalError(err.message || 'సెక్యూరిటీ వెరిఫికేషన్ విఫలమైంది. పిన్ సరిచూసుకోండి.');
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Last Transfer
  const handleUndo = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.undoLastVaultTransfer();
      setFeedback({
        type: 'success',
        message: res.message || 'చివరి బదిలీ విజయవంతంగా రద్దు చేయబడింది!'
      });
      await fetchVault();
      if (onTransferComplete) {
        onTransferComplete();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'బదిలీ రద్దు చేయడం విఫలమైంది' });
    } finally {
      setActionLoading(false);
    }
  };

  // Change PIN handler
  const handleChangePin = async () => {
    if (!currentPinInput.trim()) {
      setChangePinError('ప్రస్తుత పిన్ ఎంటర్ చేయండి (Enter current PIN).');
      return;
    }
    if (!newPinInput.trim() || newPinInput.trim().length < 4) {
      setChangePinError('కొత్త పిన్ కనీసం 4 అంకెలు ఉండాలి (New PIN must be at least 4 digits).');
      return;
    }
    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setChangePinError('కొత్త పిన్ మరియు నిర్ధారణ పిన్ సరిపోలడం లేదు (PINs do not match).');
      return;
    }

    setActionLoading(true);
    setChangePinError(null);

    try {
      const res = await api.updateVaultPin(currentPinInput.trim(), newPinInput.trim());
      setShowChangePinModal(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setFeedback({
        type: 'success',
        message: res.message || 'వాల్ట్ సెక్యూరిటీ పిన్ విజయవంతంగా మార్చబడింది!'
      });
      await fetchVault();
    } catch (err: any) {
      setChangePinError(err.message || 'పిన్ మార్చడం విఫలమైంది.');
    } finally {
      setActionLoading(false);
    }
  };

  // Strategy Toggle (Options 2 and 3)
  const handleToggle = async (strategyKey: string, currentEnabled: boolean) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      await api.toggleVaultStrategy(strategyKey, !currentEnabled);
      setFeedback({
        type: 'success',
        message: !currentEnabled ? 'స్ట్రాటజీ ఆన్ చేయబడింది (Active)' : 'స్ట్రాటజీ స్లీప్ మోడ్ లోకి మార్చబడింది (Sleep Mode 💤)'
      });
      await fetchVault();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to toggle strategy' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !vaultData) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 animate-pulse">
        <div className="h-5 bg-slate-800 rounded w-1/3 mb-3"></div>
        <div className="h-24 bg-slate-800 rounded w-full"></div>
      </div>
    );
  }

  const opt2 = vaultData?.strategies?.option_2_dynamic_spreads;
  const opt3 = vaultData?.strategies?.option_3_bluechip_swing;
  const isOpt2Active = opt2?.status === 'ACTIVE';
  const isOpt3Active = opt3?.status === 'ACTIVE';

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute -top-16 -right-16 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 relative">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-slate-950 shadow-md shadow-emerald-500/20">
            <Vault className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                {t('🔐 క్యాపిటల్ సేఫ్టీ వాల్ట్ & పిన్ లాక్ మేనేజర్', '🔐 Capital Safety Vault & PIN-Protected Desk Manager')}
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                PIN PROTECTED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t(
                'లాభాన్ని సేఫ్టీ వాల్ట్‌లో పాస్‌వర్డ్ తో దాచండి. వాల్ట్ నుండి నగదు మార్చడానికి ఖచ్చితంగా సెక్యూరిటీ కీ అడుగుతుంది.',
                'Safely lock profits in dedicated Vault with PIN security. Clear route & password required for every transfer.'
              )}
            </p>
          </div>
        </div>

        {/* Change PIN Button */}
        <button
          type="button"
          onClick={() => {
            setShowChangePinModal(true);
            setChangePinError(null);
            setCurrentPinInput('');
            setNewPinInput('');
            setConfirmPinInput('');
          }}
          className="self-start lg:self-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('🔑 వాల్ట్ పిన్ మార్చండి', 'Change Vault PIN')}</span>
        </button>
      </div>

      {/* 3 DISTINCT LIVE ENTITY BALANCES (Clean Separation) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {/* Entity 1: Capital Safety Vault (PIN LOCKED) */}
        <div className="bg-gradient-to-br from-emerald-950/60 to-slate-950/90 border-2 border-emerald-500/60 rounded-xl p-3.5 shadow-lg shadow-emerald-950/40 relative">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('🔐 సేఫ్టీ వాల్ట్ (లాక్ చేయబడింది)', 'Capital Safety Vault (Locked)')}</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-emerald-400" />
              <span>{t('పిన్ రక్షితం', 'PIN PROTECTED')}</span>
            </span>
          </div>
          <div className="font-mono font-black text-emerald-300 text-xl tracking-tight">
            ₹{vaultLocked.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{t('వాల్ట్ స్టేటస్:', 'Status:')}</span>
            <span className="text-emerald-400 font-semibold">{t('సురక్షితంగా తాళం వేయబడింది', '100% Protected & Safe')}</span>
          </div>
        </div>

        {/* Entity 2: Options Trading Desk (F&O Active Margin) */}
        <div className="bg-slate-950/80 border border-indigo-500/40 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('⚡ ఆప్షన్స్ ట్రేడింగ్ డెస్క్', 'Options Trading Desk')}</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              {t('క్రియాశీల నగదు', 'Active Cash')}
            </span>
          </div>
          <div className="font-mono font-black text-indigo-200 text-xl tracking-tight">
            ₹{optionsCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{t('రేపటి ప్లాన్:', 'Tomorrow Margin:')}</span>
            <span className="text-indigo-400 font-semibold">{t('ట్రేడింగ్ కోసం సిద్ధం', 'Ready for Active Trades')}</span>
          </div>
        </div>

        {/* Entity 3: Main Equity Desk (Normal Stocks) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('📈 ముఖ్య ఈక్విటీ డెస్క్', 'Main Equity Desk')}</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {t('షేర్ల డెస్క్', 'Stock Desk')}
            </span>
          </div>
          <div className="font-mono font-black text-white text-xl tracking-tight">
            ₹{equityCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{t('ఉపయోగం:', 'Purpose:')}</span>
            <span className="text-slate-300 font-semibold">{t('సాధారణ షేర్ల ట్రేడింగ్', 'Delivery & Swing Cash')}</span>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`mt-3 p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white px-2">
            ✕
          </button>
        </div>
      )}

      {/* Direction Switcher Tabs */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setDirection('OPTIONS_TO_VAULT')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
            direction === 'OPTIONS_TO_VAULT'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>{t('🛡️ 1. ఆప్షన్స్ ➔ సేఫ్టీ వాల్ట్‌కి', '🛡️ 1. Options ➔ Safe Vault')}</span>
        </button>

        <button
          type="button"
          onClick={() => setDirection('VAULT_TO_OPTIONS')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
            direction === 'VAULT_TO_OPTIONS'
              ? 'bg-indigo-500 text-white shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-amber-300" />
          <span>{t('🔄 2. వైస్-వెర్సా: వాల్ట్ ➔ ఆప్షన్స్‌కి', '🔄 2. Vault ➔ Options')}</span>
        </button>

        <button
          type="button"
          onClick={() => setDirection('EQUITY_VAULT')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
            direction === 'EQUITY_VAULT'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>{t('⚖️ 3. వాల్ట్ ⮂ మెయిన్ ఈక్విటీ', '⚖️ 3. Vault ⮂ Main Equity')}</span>
        </button>
      </div>

      {/* TAB 1: OPTIONS ➔ SAFETY VAULT */}
      {direction === 'OPTIONS_TO_VAULT' && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-emerald-500/40 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {t(
                    'రేపటి ట్రేడింగ్ కోసం ఆప్షన్స్ మార్జిన్ ఉంచి, మిగిలినది సేఫ్టీ వాల్ట్‌లోకి లాక్ చేయండి',
                    'Keep Tomorrow Trading Margin & Lock Rest in Safe Vault'
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  'మొత్తం బదిలీ చేస్తే రేపు ఆప్షన్స్ ట్రేడ్లు చేయడానికి మార్జిన్ ఉండదు. రేపటి కోసం ₹25k ఉంచి, మిగిలినది సేఫ్టీలోకి లాక్ చేయండి:',
                  'Leaving margin ensures active trading tomorrow. Pick a preset or enter custom amount:'
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block">{t('ప్రస్తుతం ఆప్షన్స్ నగదు', 'Current Options Cash')}</span>
              <span className="text-base font-bold font-mono text-indigo-300">
                ₹{optionsCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Tomorrow Margin Buffer Presets */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('💡 రేపటి ట్రేడింగ్ ప్లాన్ ఎంచుకోండి (Smart Tomorrow Buffer):', '💡 Choose Tomorrow Trading Buffer:')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Preset 1: Keep 25k */}
              <button
                type="button"
                onClick={() => {
                  const amt = Math.max(0, Math.floor(optionsCash) - 25000);
                  setTransferAmount(amt);
                }}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  transferAmount === Math.max(0, Math.floor(optionsCash) - 25000)
                    ? 'bg-emerald-500/20 border-emerald-400 ring-1 ring-emerald-400 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400">{t('రేపటి కోసం ₹25,000', 'Keep ₹25,000 Buffer')}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">సిఫార్సు</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {t('వాల్ట్‌లోకి వెళ్లేది:', 'Move to Vault:')}{' '}
                  <span className="font-mono font-bold text-white">
                    ₹{Math.max(0, Math.floor(optionsCash) - 25000).toLocaleString('en-IN')}
                  </span>
                </div>
              </button>

              {/* Preset 2: Keep 50k */}
              <button
                type="button"
                onClick={() => {
                  const amt = Math.max(0, Math.floor(optionsCash) - 50000);
                  setTransferAmount(amt);
                }}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  transferAmount === Math.max(0, Math.floor(optionsCash) - 50000)
                    ? 'bg-emerald-500/20 border-emerald-400 ring-1 ring-emerald-400 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-indigo-300">{t('రేపటి కోసం ₹50,000', 'Keep ₹50,000 Buffer')}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">సేఫ్</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {t('వాల్ట్‌లోకి వెళ్లేది:', 'Move to Vault:')}{' '}
                  <span className="font-mono font-bold text-white">
                    ₹{Math.max(0, Math.floor(optionsCash) - 50000).toLocaleString('en-IN')}
                  </span>
                </div>
              </button>

              {/* Preset 3: Keep 1L */}
              <button
                type="button"
                onClick={() => {
                  const amt = Math.max(0, Math.floor(optionsCash) - 100000);
                  setTransferAmount(amt);
                }}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  transferAmount === Math.max(0, Math.floor(optionsCash) - 100000)
                    ? 'bg-emerald-500/20 border-emerald-400 ring-1 ring-emerald-400 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300">{t('రేపటి కోసం ₹1,00,000', 'Keep ₹1,00,000 Buffer')}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">హై లిక్విడిటీ</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {t('వాల్ట్‌లోకి వెళ్లేది:', 'Move to Vault:')}{' '}
                  <span className="font-mono font-bold text-white">
                    ₹{Math.max(0, Math.floor(optionsCash) - 100000).toLocaleString('en-IN')}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Amount Field */}
          <div className="bg-slate-900/90 border border-emerald-500/40 focus-within:border-emerald-400 p-3 rounded-xl transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{t('లేదా నచ్చినంత మొత్తం మీరే టైప్ చేయండి (Custom Amount):', 'Or Type Custom Amount to Lock:')}</span>
              <span className="text-emerald-400 font-mono font-bold">
                {t('లభ్యత:', 'Available:')} ₹{optionsCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-black font-mono text-xl">₹</span>
              <input
                type="number"
                min={100}
                max={Math.floor(optionsCash)}
                step={500}
                value={transferAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTransferAmount(Math.max(0, Math.min(Math.floor(optionsCash), val)));
                }}
                className="w-full bg-transparent font-mono font-black text-xl text-white outline-none"
                placeholder="100000"
              />
            </div>
          </div>

          {/* Quick Fill Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[10000, 25000, 50000, 100000, 200000, 500000, Math.floor(optionsCash)].map((amt) => {
              if (amt <= 0 || amt > optionsCash) return null;
              const isMax = amt === Math.floor(optionsCash);
              const label = isMax ? 'MAX (ఆప్షన్స్ మొత్తం)' : `₹${amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}k`}`;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTransferAmount(amt)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md cursor-pointer transition ${
                    transferAmount === amt
                      ? 'bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Live Calculation Preview */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('💼 రేపటి ట్రేడింగ్‌కు ఆప్షన్స్‌లో మిగిలే నగదు:', 'Remaining in Options for Tomorrow:')}</span>
              </span>
              <span className="font-mono font-bold text-indigo-300 text-sm">
                ₹{Math.max(0, optionsCash - transferAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('🔐 సేఫ్టీ వాల్ట్‌లో కొత్త మొత్తం (లాక్ అవుతుంది):', 'New Capital Safety Vault Total:')}</span>
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                ₹{(vaultLocked + transferAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Transfer Button (Triggers PIN Modal) */}
          <div>
            <button
              type="button"
              onClick={() =>
                requestTransferWithPin(
                  transferAmount,
                  'OPTIONS',
                  'VAULT',
                  '⚡ ఆప్షన్స్ డెస్క్ (Options Desk)',
                  '🔐 క్యాపిటల్ సేఫ్టీ వాల్ట్ (Capital Vault)'
                )
              }
              disabled={actionLoading || transferAmount <= 0 || optionsCash < transferAmount}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2 cursor-pointer ring-2 ring-emerald-400/40"
            >
              <Lock className="w-4 h-4 text-slate-950" />
              <span>
                {t(
                  `⚡ ₹${transferAmount.toLocaleString('en-IN')} వాల్ట్‌కి పంపడానికి పిన్ ఎంటర్ చేయండి`,
                  `⚡ Transfer ₹${transferAmount.toLocaleString('en-IN')} to Safe Vault (PIN Required)`
                )}
              </span>
            </button>
            <div className="text-[11px] text-slate-400 mt-2 text-center flex items-center justify-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {t(
                  '🔒 బదిలీ క్లిక్ చేయగానే సెక్యూరిటీ పాస్‌వర్డ్ (4-అంకెల పిన్) అడుగుతుంది. సరైన పిన్ లేకుండా వాల్ట్ మారదు.',
                  '🔒 Requires 4-digit Vault PIN to confirm. Money cannot move without security verification.'
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VICE-VERSA: SAFETY VAULT ➔ RETURN TO OPTIONS DESK */}
      {direction === 'VAULT_TO_OPTIONS' && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-indigo-500/40 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                <span>
                  {t(
                    'వైస్-వెర్సా: సేఫ్టీ వాల్ట్ నుండి తిరిగి ఆప్షన్స్ ట్రేడింగ్ డెస్క్‌కి మార్చండి',
                    'Vice Versa: Pull Funds from Safe Vault Back to Options Desk'
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  'రేపు లేదా ఎప్పుడైనా ఆప్షన్స్ ట్రేడింగ్ కోసం ఎక్కువ నగదు కావాలనుకుంటే, వాల్ట్ పిన్ ఉపయోగించి తిరిగి తెచ్చుకోండి:',
                  'Whenever you want to increase trading margin, unlock funds back to Options Desk using your PIN:'
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block">{t('సేఫ్టీ వాల్ట్‌లో లభ్యం', 'Available in Safe Vault')}</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                ₹{vaultLocked.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Custom Amount to Return */}
          <div className="bg-slate-900/90 border border-indigo-500/40 focus-within:border-indigo-400 p-3 rounded-xl transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{t('తిరిగి ఆప్షన్స్‌కి పంపవలసిన మొత్తం (Amount to Return):', 'Amount to Return to Options Desk (INR):')}</span>
              <span className="text-emerald-400 font-mono font-bold">
                {t('వాల్ట్ నగదు:', 'Vault Cash:')} ₹{vaultLocked.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 font-black font-mono text-xl">₹</span>
              <input
                type="number"
                min={100}
                max={Math.floor(vaultLocked)}
                step={500}
                value={withdrawAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setWithdrawAmount(Math.max(0, Math.min(Math.floor(vaultLocked), val)));
                }}
                className="w-full bg-transparent font-mono font-black text-xl text-white outline-none"
                placeholder="25000"
              />
            </div>
          </div>

          {/* Quick Return Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[10000, 25000, 50000, 100000, 200000, Math.floor(vaultLocked)].map((amt) => {
              if (amt <= 0 || amt > vaultLocked) return null;
              const isMax = amt === Math.floor(vaultLocked);
              const label = isMax ? 'వాల్ట్ మొత్తం (ALL)' : `+₹${amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}k`}`;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setWithdrawAmount(amt)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md cursor-pointer transition ${
                    withdrawAmount === amt
                      ? 'bg-indigo-500 text-white font-black ring-1 ring-indigo-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Live Calculation Preview */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('⚡ ఆప్షన్స్ ట్రేడింగ్ కొత్త క్యాష్:', 'New Options Desk Cash Balance:')}</span>
              </span>
              <span className="font-mono font-bold text-indigo-300 text-sm">
                ₹{(optionsCash + withdrawAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Vault className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('🛡️ సేఫ్టీ వాల్ట్‌లో మిగిలే మొత్తం:', 'Remaining in Safe Vault:')}</span>
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                ₹{Math.max(0, vaultLocked - withdrawAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Return Button (Triggers PIN Modal) */}
          <div>
            <button
              type="button"
              onClick={() =>
                requestTransferWithPin(
                  withdrawAmount,
                  'VAULT',
                  'OPTIONS',
                  '🔐 క్యాపిటల్ సేఫ్టీ వాల్ట్ (Capital Vault)',
                  '⚡ ఆప్షన్స్ డెస్క్ (Options Desk)'
                )
              }
              disabled={actionLoading || withdrawAmount <= 0 || vaultLocked < withdrawAmount}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:to-purple-400 disabled:opacity-40 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-950/50 transition flex items-center justify-center gap-2 cursor-pointer ring-2 ring-indigo-400/40"
            >
              <Unlock className="w-4 h-4 text-white" />
              <span>
                {t(
                  `🔄 ₹${withdrawAmount.toLocaleString('en-IN')} తిరిగి ఆప్షన్స్‌కి మార్చడానికి పిన్ ఎంటర్ చేయండి`,
                  `🔄 Return ₹${withdrawAmount.toLocaleString('en-IN')} to Options (PIN Required)`
                )}
              </span>
            </button>
            <div className="text-[11px] text-slate-400 mt-2 text-center flex items-center justify-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                {t(
                  '🔒 వాల్ట్ నుండి బయటకు తీసేటప్పుడు కూడా పాస్‌వర్డ్ నిర్ధారణ తప్పనిసరి. పూర్తి రక్షణ.',
                  '🔒 PIN verification is required even when withdrawing from Vault for maximum security.'
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TWO-WAY BETWEEN VAULT & MAIN EQUITY */}
      {direction === 'EQUITY_VAULT' && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-amber-500/40 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                <span>{t('వాల్ట్ ⮂ ముఖ్య ఈక్విటీ డెస్క్ బదిలీలు', 'Safe Vault ⮂ Main Equity Desk Transfers')}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  'సేఫ్టీ వాల్ట్ లోని డబ్బులను మెయిన్ ఈక్విటీ స్టాక్స్ కోసం మార్చుకోవచ్చు లేదా ఈక్విటీ నగదును వాల్ట్‌లో దాచుకోవచ్చు:',
                  'Move funds between Safe Vault and Main Equity Desk with PIN protection:'
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block">{t('మెయిన్ ఈక్విటీ నగదు', 'Main Equity Cash')}</span>
              <span className="text-base font-bold font-mono text-white">
                ₹{equityCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Sub-direction toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setEquityDirection('VAULT_TO_EQUITY')}
              className={`py-2 px-3 rounded cursor-pointer transition ${
                equityDirection === 'VAULT_TO_EQUITY'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('వాల్ట్ ➔ మెయిన్ ఈక్విటీకి', 'Vault ➔ Main Equity')}
            </button>
            <button
              type="button"
              onClick={() => setEquityDirection('EQUITY_TO_VAULT')}
              className={`py-2 px-3 rounded cursor-pointer transition ${
                equityDirection === 'EQUITY_TO_VAULT'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('మెయిన్ ఈక్విటీ ➔ వాల్ట్‌కి', 'Main Equity ➔ Vault')}
            </button>
          </div>

          {/* Amount Input */}
          <div className="bg-slate-900/90 border border-amber-500/40 p-3 rounded-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{t('బదిలీ మొత్తం (Transfer Amount):', 'Amount to Transfer (INR):')}</span>
              <span className="text-amber-400 font-mono font-bold">
                {t('లభ్యం:', 'Max Available:')}{' '}
                ₹{(equityDirection === 'VAULT_TO_EQUITY' ? vaultLocked : equityCash).toLocaleString('en-IN', {
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-black font-mono text-xl">₹</span>
              <input
                type="number"
                min={100}
                max={Math.floor(equityDirection === 'VAULT_TO_EQUITY' ? vaultLocked : equityCash)}
                step={500}
                value={equityAmount}
                onChange={(e) => setEquityAmount(Number(e.target.value))}
                className="w-full bg-transparent font-mono font-black text-xl text-white outline-none"
                placeholder="5000"
              />
            </div>
          </div>

          {/* Transfer Button */}
          <button
            type="button"
            onClick={() => {
              if (equityDirection === 'VAULT_TO_EQUITY') {
                requestTransferWithPin(
                  equityAmount,
                  'VAULT',
                  'EQUITY',
                  '🔐 క్యాపిటల్ సేఫ్టీ వాల్ట్ (Capital Vault)',
                  '📈 ముఖ్య ఈక్విటీ డెస్క్ (Main Equity)'
                );
              } else {
                requestTransferWithPin(
                  equityAmount,
                  'EQUITY',
                  'VAULT',
                  '📈 ముఖ్య ఈక్విటీ డెస్క్ (Main Equity)',
                  '🔐 క్యాపిటల్ సేఫ్టీ వాల్ట్ (Capital Vault)'
                );
              }
            }}
            disabled={
              actionLoading ||
              equityAmount <= 0 ||
              (equityDirection === 'VAULT_TO_EQUITY' ? vaultLocked < equityAmount : equityCash < equityAmount)
            }
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Key className="w-4 h-4" />
            <span>
              {equityDirection === 'VAULT_TO_EQUITY'
                ? `₹${equityAmount.toLocaleString('en-IN')} మెయిన్ ఈక్విటీకి పంపు (పిన్ అవసరం)`
                : `₹${equityAmount.toLocaleString('en-IN')} వాల్ట్‌లోకి దాచు (పిన్ అవసరం)`}
            </span>
          </button>
        </div>
      )}

      {/* 3 Strategic Options Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5">
        {/* OPTION 1: User-Operated Two-Way Safety Vault Station */}
        <div className="bg-gradient-to-b from-emerald-950/50 via-slate-900/95 to-slate-900/95 border-2 border-emerald-500/70 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-emerald-950/40 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-black">
                1
              </span>
              <span>{t('ఆప్షన్ 1: పిన్ లాక్ వాల్ట్', 'Option 1: PIN Locked Vault')}</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/50">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              {t('కంట్రోల్ మీదే', 'USER MANAGED')}
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {t(
              'లాభాన్ని సురక్షితంగా సేఫ్టీ వాల్ట్‌లో దాచుకోండి లేదా రేపటి ట్రేడింగ్ కోసం ఎప్పుడైనా తిరిగి తెచ్చుకోండి. పాస్‌వర్డ్ తో 100% రక్షితం.',
              'Move profits to safety and pull back anytime for trading. 100% user-operated with PIN protection.'
            )}
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] flex justify-between text-slate-400">
            <span>{t('స్టేటస్:', 'Status:')}</span>
            <span className="text-emerald-400 font-bold">{t('సక్రియంగా ఉంది (Active)', 'Active & Ready')}</span>
          </div>
        </div>

        {/* OPTION 2: Dynamic Multi-Asset Hedged Spreads (SLEEP MODE) */}
        <div
          className={`bg-slate-900/80 border rounded-xl p-4 flex flex-col justify-between transition-all ${
            isOpt2Active ? 'border-indigo-500/50 shadow-lg shadow-indigo-950/20' : 'border-slate-800 opacity-90'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-black">
                2
              </span>
              <span>{t('ఆప్షన్ 2: డైనమిక్ స్ప్రెడ్స్', 'Option 2: Dynamic Spreads')}</span>
            </div>

            <span
              className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isOpt2Active
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isOpt2Active ? (
                <>
                  <Zap className="w-3 h-3 text-indigo-400" />
                  {t('యాక్టివ్', 'ACTIVE')}
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3 text-slate-400" />
                  {t('స్లీప్ మోడ్ 💤', 'SLEEP 💤')}
                </>
              )}
            </span>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-300 mt-1">
              {t('మల్టీ-అసెట్ హెడ్జ్డ్ స్ప్రెడ్స్ (NIFTY & BANKNIFTY)', 'Multi-Asset Hedged Spreads (NIFTY & BANKNIFTY)')}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t(
                '15% మార్జిన్ తో బుల్ కాల్ స్ప్రెడ్స్. ప్రస్తుతం స్లీప్ మోడ్ లో ఉంది — ఎలాంటి ట్రేడ్లు తీసుకోదు, మీ డబ్బు ఖర్చు కాదు.',
                'Currently sleeping to avoid deploying capital; toggle anytime if desired.'
              )}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {isOpt2Active ? t('రన్నింగ్ లో ఉంది', 'Active') : t('నిద్రాణ స్థితి (సున్నా రిస్క్)', 'Dormant (Zero risk)')}
            </span>
            <button
              type="button"
              onClick={() => handleToggle('dynamic_spreads', isOpt2Active)}
              disabled={actionLoading}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isOpt2Active
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{isOpt2Active ? t('స్లీప్ లో పెట్టు', 'Put to Sleep') : t('వేక్ అప్', 'Wake Up')}</span>
            </button>
          </div>
        </div>

        {/* OPTION 3: Blue-Chip Equity Swing Auto-Deploy (SLEEP MODE) */}
        <div
          className={`bg-slate-900/80 border rounded-xl p-4 flex flex-col justify-between transition-all ${
            isOpt3Active ? 'border-amber-500/50 shadow-lg shadow-amber-950/20' : 'border-slate-800 opacity-90'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-black">
                3
              </span>
              <span>{t('ఆప్షన్ 3: బ్లూ-చిప్ స్వింగ్', 'Option 3: Blue-Chip Swing')}</span>
            </div>

            <span
              className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isOpt3Active
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isOpt3Active ? (
                <>
                  <TrendingUp className="w-3 h-3 text-amber-400" />
                  {t('యాక్టివ్', 'ACTIVE')}
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3 text-slate-400" />
                  {t('స్లీప్ మోడ్ 💤', 'SLEEP 💤')}
                </>
              )}
            </span>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-300 mt-1">
              {t('బ్లూ-చిప్ ఈక్విటీ స్వింగ్ (NIFTY 50)', 'Blue-Chip Equity Swing (NIFTY 50)')}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t(
                'టాప్ నిఫ్టీ 50 షేర్లను -2% హార్డ్ SL తో కొనడం. ప్రస్తుతం స్లీప్ మోడ్ లో ఉంది — ఒక్క రూపాయి కూడా ఖర్చు కాదు.',
                'Large-cap equity accumulator. Currently sleeping to preserve liquidity.'
              )}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {isOpt3Active ? t('రన్నింగ్ లో ఉంది', 'Active') : t('నిద్రాణ స్థితి (సున్నా రిస్క్)', 'Dormant (Zero risk)')}
            </span>
            <button
              type="button"
              onClick={() => handleToggle('bluechip_swing', isOpt3Active)}
              disabled={actionLoading}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isOpt3Active
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{isOpt3Active ? t('స్లీప్ లో పెట్టు', 'Put to Sleep') : t('వేక్ అప్', 'Wake Up')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Past Vault Transfers Log with Radio Button Filter & Undo Action */}
      {vaultData?.recent_transfers && vaultData.recent_transfers.length > 0 && (
        <div className="mt-4 p-3.5 bg-slate-950/80 border border-emerald-500/30 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('గత బదిలీల రికార్డు & రద్దు ఆప్షన్ (Transfer History):', 'Past Vault Transfers History & Undo:')}</span>
            </div>

            {/* Radio / Pill Filter (Latest 1, Last 3, All) */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-[11px]">
              <label
                className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition select-none font-semibold ${
                  historyFilter === 'LATEST'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="historyFilter"
                  value="LATEST"
                  checked={historyFilter === 'LATEST'}
                  onChange={() => setHistoryFilter('LATEST')}
                  className="w-3 h-3 text-emerald-500 accent-emerald-500"
                />
                <span>{t('తాజా 1 (Latest 1)', 'Latest 1')}</span>
              </label>

              <label
                className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition select-none font-semibold ${
                  historyFilter === 'LAST_3'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="historyFilter"
                  value="LAST_3"
                  checked={historyFilter === 'LAST_3'}
                  onChange={() => setHistoryFilter('LAST_3')}
                  className="w-3 h-3 text-emerald-500 accent-emerald-500"
                />
                <span>{t('చివరి 3 (Last 3)', 'Last 3')}</span>
              </label>

              <label
                className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition select-none font-semibold ${
                  historyFilter === 'ALL'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="historyFilter"
                  value="ALL"
                  checked={historyFilter === 'ALL'}
                  onChange={() => setHistoryFilter('ALL')}
                  className="w-3 h-3 text-emerald-500 accent-emerald-500"
                />
                <span>{t('అన్ని (All)', 'All')}</span>
              </label>
            </div>
          </div>

          {/* List of transfers (Newest First) */}
          <div className="space-y-2 max-h-56 overflow-y-auto touch-scroll pr-1 no-scrollbar">
            {vaultData.recent_transfers
              .slice(0, historyFilter === 'LATEST' ? 1 : historyFilter === 'LAST_3' ? 3 : vaultData.recent_transfers.length)
              .map((tr: any, idx: number) => {
                const isLatest = idx === 0;
                const isUndoEvent = tr.event_type === 'FUNDS_TRANSFER_UNDO';

                // Human friendly Telugu & English desk names
                const formatDeskName = (desk: string) => {
                  if (desk === 'OPTIONS') return '⚡ OPTIONS';
                  if (desk === 'VAULT') return '🔐 VAULT';
                  if (desk === 'EQUITY') return '📈 MAIN EQUITY';
                  return desk;
                };

                return (
                  <div
                    key={tr.id || idx}
                    className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition ${
                      isLatest ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm' : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isLatest && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                          {t('తాజాది', 'LATEST')}
                        </span>
                      )}
                      <div>
                        <div className="font-mono text-[11px] text-slate-400">{tr.timestamp}</div>
                        <div className="font-bold text-white flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={isUndoEvent ? 'text-amber-300' : 'text-slate-200'}>
                            {isUndoEvent ? `↩️ రద్దు: ` : ''}
                            {formatDeskName(tr.from_desk)} ➔ {formatDeskName(tr.to_desk)}
                          </span>
                          <span className="font-mono text-emerald-400 font-black">
                            ₹{tr.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Undo Button on the Latest Transfer */}
                    {isLatest && !isUndoEvent && (
                      <button
                        type="button"
                        onClick={handleUndo}
                        disabled={actionLoading}
                        className="self-end sm:self-auto px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow disabled:opacity-40"
                        title={t('చివరి బదిలీని రద్దు చేసి నగదును వెనక్కి మార్చండి', 'Undo and reverse this transfer')}
                      >
                        {actionLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-300" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span>{t('↩️ చివరి బదిలీని రద్దు చేయి (Undo)', '↩️ Undo Last Transfer')}</span>
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Strategic Explanation Callout */}
      <div className="mt-4 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start gap-3 text-xs text-slate-300">
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-white">
            {t('💡 వాల్ట్ సెక్యూరిటీ పిన్ & డెస్క్ రక్షణ వ్యవస్థ:', '💡 Vault PIN Security & Desk Safety:')}
          </span>{' '}
          {t(
            `ఈ ప్లాట్‌ఫారమ్‌లో మూడు డెస్క్‌లు వేర్వేరుగా ఉంటాయి: (1) ఆప్షన్స్ ట్రేడింగ్ డెస్క్ (₹25,000 రేపటి కోసం సిద్ధంగా ఉంది), (2) క్యాపిటల్ సేఫ్టీ వాల్ట్ (లాక్ చేయబడిన ₹6.45L+ లాభాలు - పాస్‌వర్డ్ ఉంటేనే తెరుచుకుంటుంది), (3) మెయిన్ ఈక్విటీ డెస్క్ (సాధారణ షేర్ల కోసం ₹3,670). మీ అనుమతి లేకుండా లేదా పిన్ లేకుండా రూపాయి కూడా మారదు. ఎప్పుడైనా అవసరమైతే వైస్-వెర్సా ఆప్షన్ ద్వారా తిరిగి మార్చుకోవచ్చు!`,
            `The 3 entities are cleanly segregated: (1) Options Trading Desk (₹25k ready for tomorrow), (2) Capital Safety Vault (Locked profit requiring PIN to access), (3) Main Equity Desk (Normal stock cash). No funds move without your explicit PIN confirmation!`
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🔐 MODAL 1: SECURITY PIN VERIFICATION MODAL                */}
      {/* ========================================================= */}
      {showPinModal && pendingTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-md w-full p-5 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {t('🔐 వాల్ట్ సెక్యూరిటీ వెరిఫికేషన్', '🔐 Vault Security PIN Verification')}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('లావాదేవీని పూర్తి చేయడానికి వాల్ట్ పాస్‌వర్డ్ / కీ నమోదు చేయండి', 'Enter Vault PIN/Key to authenticate fund transfer')}
                </p>
              </div>
            </div>

            {/* Transaction Route Summary */}
            <div className="mt-4 p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2.5">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                {t('బదిలీ మార్గం (Transfer Route):', 'Transfer Route:')}
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                {/* Source */}
                <div className="bg-slate-900 border border-slate-700/80 p-2 rounded-lg flex-1 text-center">
                  <span className="text-[10px] text-slate-400 block">{t('ఎక్కడి నుండి (FROM)', 'FROM')}</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">{pendingTransfer.fromLabel}</span>
                </div>

                <div className="p-1.5 bg-emerald-500/20 rounded-full text-emerald-400 shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Destination */}
                <div className="bg-slate-900 border border-emerald-500/40 p-2 rounded-lg flex-1 text-center">
                  <span className="text-[10px] text-slate-400 block">{t('ఎక్కడికి (TO)', 'TO')}</span>
                  <span className="font-bold text-emerald-300 mt-0.5 block">{pendingTransfer.toLabel}</span>
                </div>
              </div>

              {/* Amount */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">{t('బదిలీ మొత్తం (Amount):', 'Transfer Amount:')}</span>
                <span className="font-mono font-black text-emerald-400 text-base">
                  ₹{pendingTransfer.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {pinModalError && (
              <div className="mt-3 p-2.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{pinModalError}</span>
              </div>
            )}

            {/* PIN Input Box */}
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('వాల్ట్ సెక్యూరిటీ పిన్ / కీ (Vault PIN):', 'Vault Security PIN / Key:')}</span>
                </span>
              </label>

              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={10}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinModalError) setPinModalError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmTransferWithPin();
                    }
                  }}
                  placeholder={t('4-అంకెల సెక్యూరిటీ పిన్ నమోదు చేయండి', 'Enter 4-digit Security PIN')}
                  className="w-full bg-slate-950 border border-emerald-500/50 focus:border-emerald-400 px-3.5 py-2.5 rounded-xl text-white font-mono text-base tracking-widest outline-none pr-10 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-[11px] text-slate-500 mt-1">
                {t(
                  '💡 వాల్ట్ లావాదేవీని ఆమోదించడానికి మీ 4-అంకెల సెక్యూరిటీ పిన్ నమోదు చేయండి.',
                  '💡 Enter your 4-digit security PIN to authorize this transfer.'
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPendingTransfer(null);
                  setPinInput('');
                  setPinModalError(null);
                }}
                disabled={actionLoading}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                {t('రద్దు చేయి (Cancel)', 'Cancel')}
              </button>

              <button
                type="button"
                onClick={handleConfirmTransferWithPin}
                disabled={actionLoading || !pinInput}
                className="py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
                <span>{t('ధృవీకరించి బదిలీ చేయి', 'Verify & Transfer')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🔑 MODAL 2: CHANGE VAULT PIN MODAL                        */}
      {/* ========================================================= */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-5 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {t('🔑 వాల్ట్ సెక్యూరిటీ పిన్ మార్చండి', 'Change Vault Security PIN')}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('మీకు నచ్చిన 4-అంకెల కొత్త పాస్‌వర్డ్ సెట్ చేసుకోండి', 'Set your custom 4-digit security PIN')}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {changePinError && (
              <div className="mt-3 p-2.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{changePinError}</span>
              </div>
            )}

            {/* Inputs */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {t('ప్రస్తుత పిన్ (Current PIN):', 'Current PIN:')}
                </label>
                <input
                  type="password"
                  maxLength={10}
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-white font-mono text-sm outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {t('కొత్త పిన్ (New PIN):', 'New PIN (4 digits):')}
                </label>
                <input
                  type="password"
                  maxLength={10}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-white font-mono text-sm outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {t('కొత్త పిన్ నిర్ధారణ (Confirm New PIN):', 'Confirm New PIN:')}
                </label>
                <input
                  type="password"
                  maxLength={10}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  placeholder="e.g. 1234"
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-white font-mono text-sm outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowChangePinModal(false)}
                disabled={actionLoading}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                {t('రద్దు చేయి (Cancel)', 'Cancel')}
              </button>

              <button
                type="button"
                onClick={handleChangePin}
                disabled={actionLoading || !currentPinInput || !newPinInput || !confirmPinInput}
                className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                <span>{t('పిన్ సేవ్ చేయి', 'Save New PIN')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
