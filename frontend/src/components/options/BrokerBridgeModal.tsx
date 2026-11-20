import React, { useState, useEffect } from 'react';
import { X, Cpu, ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw, Key, UserCheck, Activity, Lock } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { BrokerBridgeConfig, SupportedBroker } from '../../types';

interface BrokerBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const BrokerBridgeModal: React.FC<BrokerBridgeModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<BrokerBridgeConfig | null>(null);
  const [selectedBroker, setSelectedBroker] = useState<string>('PAPER');
  const [apiKey, setApiKey] = useState<string>('');
  const [clientCode, setClientCode] = useState<string>('');
  const [isLiveRouting, setIsLiveRouting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ status: string; message: string; latency_ms?: number } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const res = await api.getBrokerBridgeConfig();
      setConfig(res);
      setSelectedBroker(res.broker_name || 'PAPER');
      setClientCode(res.broker_client_code || '');
      setIsLiveRouting(res.is_live_broker_routing || false);
    } catch (err) {
      console.error('Failed to load broker config:', err);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setFeedback(null);
    try {
      const res = await api.testBrokerBridgeConnection({
        broker_name: selectedBroker,
        broker_api_key: apiKey.trim(),
        broker_client_code: clientCode.trim(),
        is_live_broker_routing: isLiveRouting
      });
      setTestResult(res);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || t('బ్రోకర్ కనెక్షన్ టెస్ట్ విఫలమైంది.', 'Broker ping test failed.')
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      await api.configureBrokerBridge({
        broker_name: selectedBroker,
        broker_api_key: apiKey.trim() || undefined,
        broker_client_code: clientCode.trim(),
        is_live_broker_routing: isLiveRouting
      });
      setFeedback({
        type: 'success',
        message: t(
          `బ్రోకర్ గేట్‌వే విజయవంతంగా సేవ్ చేయబడింది. రౌటింగ్: ${isLiveRouting ? 'లైవ్ డీమ్యాట్' : 'పేపర్ ట్రేడింగ్ సాండ్‌బాక్స్'}.`,
          `Broker gateway saved. Routing: ${isLiveRouting ? 'LIVE DEMAT' : 'PAPER TRADING SANDBOX'}.`
        )
      });
      if (onConfigSaved) onConfigSaved();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || t('బ్రోకర్ సెట్టింగ్స్ సేవ్ చేయడంలో సమస్య ఏర్పడింది.', 'Failed to save broker settings.')
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                {t('1-క్లిక్ రియల్ బ్రోకర్ బ్రిడ్జ్ గేట్‌వే', '1-Click Real Broker Bridge Gateway')}
              </h3>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                isLiveRouting
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {isLiveRouting ? '🔴 LIVE DEMAT' : '🟢 PAPER SANDBOX'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {t('Zerodha Kite, Angel One, Dhan లేదా రిస్క్-ఫ్రీ పేపర్ ట్రేడింగ్ కనెక్ట్ చేయండి', 'Connect Zerodha, Angel One, Dhan, or retain safe paper trading')}
            </p>
          </div>
        </div>

        {/* Broker Selection Tabs */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              {t('బ్రోకర్ ఎంచుకోండి (Select Broker Gateway):', 'Select Broker Gateway:')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'PAPER', name: 'Paper Sandbox', desc: 'Zero Risk Virtual Funds', icon: '🛡️' },
                { id: 'ZERODHA', name: 'Zerodha Kite', desc: 'Kite Connect API v3', icon: '🪁' },
                { id: 'ANGEL_ONE', name: 'Angel One', desc: 'SmartAPI Algorithmic', icon: '👼' },
                { id: 'DHAN', name: 'Dhan HQ', desc: 'Fastest Options OMS', icon: '🎯' }
              ].map((brk) => (
                <button
                  type="button"
                  key={brk.id}
                  onClick={() => setSelectedBroker(brk.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedBroker === brk.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-slate-100 ring-1 ring-indigo-500/50'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{brk.icon}</span>
                    <span className="text-xs font-bold text-slate-100">{brk.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">{brk.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Paper Mode Notice vs API Inputs */}
          {selectedBroker === 'PAPER' ? (
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">
                  {t('సేఫ్ పేపర్ ట్రేడింగ్ సాండ్‌బాక్స్ యాక్టివ్', 'Safe Virtual Paper Trading Sandbox Active')}
                </span>
                <span className="text-slate-400 leading-relaxed">
                  {t(
                    '₹5,000 వర్చువల్ క్యాపిటల్‌తో రియల్-టైమ్ మార్కెట్ ప్రైస్‌ల ఆధారంగా జీరో రిస్క్‌తో నడుస్తుంది. నిజమైన డీమ్యాట్ నిధులు వాడబడవు.',
                    'Zero capital risk. Trades execute in simulated sandbox with real Black-Scholes greeks and live index spot.'
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                    {t('క్లయింట్ కోడ్ / User ID', 'Client Code / User ID')}
                  </label>
                  <input
                    type="text"
                    value={clientCode}
                    onChange={(e) => setClientCode(e.target.value)}
                    placeholder="e.g. AB1234 or CL98765"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    {t('API Key / App Secret', 'Broker API Key')}
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Live Demat Safety Switch */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-rose-400 block flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    {t('లైవ్ డీమ్యాట్ రౌటింగ్ స్విచ్', 'Live Demat Order Routing')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {t('ఆర్డర్లను నేరుగా బ్రోకర్‌కు పంపుతుంది (SEBI రిస్క్ నియమాలు వర్తిస్తాయి)', 'Route actual capital orders directly to your real broker account')}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isLiveRouting}
                  onChange={(e) => setIsLiveRouting(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Test Ping Result Banner */}
          {testResult && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{testResult.message}</span>
              </div>
              {testResult.latency_ms && (
                <span className="font-mono text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
                  {testResult.latency_ms}ms
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || (selectedBroker !== 'PAPER' && !clientCode)}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('కనెక్ట్ చేస్తోంది...', 'Testing Handshake...')}</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5" />
                  <span>{t('కనెక్షన్ టెస్ట్ చేయండి', 'Test Connection Ping')}</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950/40 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('సేవ్ అవుతోంది...', 'Saving...')}</span>
                </>
              ) : (
                <span>{t('గేట్‌వే సేవ్ చేయండి', 'Save Broker Gateway')}</span>
              )}
            </button>
          </div>
        </form>

        {/* Global Feedback */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
