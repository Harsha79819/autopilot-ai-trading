import React, { useState } from 'react';
import {
  Settings,
  Globe,
  ShieldCheck,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Lock,
  Cpu,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  Check,
  Activity
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { formatINR } from '../../utils/currency';
import { api } from '../../services/api';

export const SettingsView: React.FC = () => {
  const { portfolio, resetCapital } = useTrading();
  const [language, setLanguage] = useState<'EN' | 'TE'>('EN');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Gemini API Key state
  const [geminiKey, setGeminiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSaveGeminiKey = () => {
    if (geminiKey.trim()) {
      localStorage.setItem('gemini_api_key', geminiKey.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestGemini = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await api.chatWithAi([
        { role: 'user', content: 'హలో, కనెక్షన్ టెస్ట్. AutoPilot AI ఎలా పనిచేస్తుంది?' }
      ]);
      setTestResult(res?.reply ? '✅ Gemini / Copilot AI కనెక్ట్ అయింది! స్పందన లభించింది.' : 'Connected');
    } catch (err: any) {
      setTestResult(`⚠️ టెస్ట్ విఫలమైంది: ${err.message || 'Error'}`);
    } finally {
      setTestingKey(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-800 text-cyan-400 border border-white/10">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Platform Settings & Preferences
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              UI language, Gemini AI API integration, risk guardrails, simulated capital reset
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Gemini AI API Key Integration */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Google Gemini AI Engine (Optional API Key)</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Bilingual Voice & Chat
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Provide your personal Google Gemini API key (Gemini 1.5/2.0 Flash) for 100% fluent generative conversational chat in Telugu & English.
                  If empty, AutoPilot uses its built-in quantitative financial reasoning & error diagnostics engine.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy... (Paste Gemini API Key here)"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono tracking-wider pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={handleSaveGeminiKey}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-lg shadow-indigo-950/40"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Save Key</span>
                  </>
                )}
              </button>

              <button
                onClick={handleTestGemini}
                disabled={testingKey}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>{testingKey ? 'Testing...' : 'Test AI'}</span>
              </button>
            </div>

            {testResult && (
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-indigo-500/20 text-xs text-slate-300">
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* Language Selection */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Default Advisory Language</h3>
              <p className="text-xs text-slate-400">Select language for AI copilot insights and market commentary</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage('EN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                language === 'EN'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 border-white/5'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('TE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                language === 'TE'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 border-white/5'
              }`}
            >
              తెలుగు (Telugu)
            </button>
          </div>
        </div>

        {/* Safety & Execution Mode */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Safety Mode: Strict Paper Trading Only</h3>
              <p className="text-xs text-slate-400">Real money routing is permanently blocked in this software version</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Stop-Loss Target</span>
              <span className="font-bold text-slate-200">-1.5% Strict</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Take-Profit Target</span>
              <span className="font-bold text-emerald-400">+3.0% (1:2 RR)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Risk Per Trade</span>
              <span className="font-bold text-cyan-400">1.5% Van Tharp</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Max Capital Balance</span>
              <span className="font-bold text-emerald-400">{formatINR(portfolio?.cash_balance || 5000)}</span>
            </div>
          </div>
        </div>

        {/* Reset Capital Option */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Reset Virtual Paper Capital</h3>
            <p className="text-xs text-slate-400">
              Clear paper trades and reset ledger balance to starting cash ({formatINR(portfolio?.initial_cash || 5000)})
            </p>
          </div>
          <button
            onClick={() => {
              const initial = portfolio?.initial_cash || 5000.00;
              if (window.confirm(`Reset virtual portfolio to initial cash of INR ${initial.toFixed(2)}?`)) {
                resetCapital(initial);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Balance</span>
          </button>
        </div>
      </div>
    </div>
  );
};
