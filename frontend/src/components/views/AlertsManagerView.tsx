import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';

export const AlertsManagerView: React.FC = () => {
  const [data, setData] = useState<{ rules: any[]; notifications: any[] }>({ rules: [], notifications: [] });
  const [symbol, setSymbol] = useState('');
  const [alertType, setAlertType] = useState('PRICE_ABOVE');
  const [threshold, setThreshold] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAlerts = () => {
    api.getAlerts().then(setData).catch(console.error);
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threshold) return;
    try {
      setLoading(true);
      await api.createAlert({
        symbol: symbol.trim().toUpperCase() || undefined,
        alert_type: alertType,
        threshold_value: parseFloat(threshold)
      });
      setSymbol('');
      setThreshold('');
      loadAlerts();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteAlert(id);
      loadAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Alerts & Risk Notification Centre
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Price threshold alarms, maximum daily loss warnings, portfolio concentration triggers
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create Alert */}
        <form onSubmit={handleCreate} className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white">Configure New Alert Rule</h3>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Symbol (Optional for Portfolio)</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. INFY, TCS"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white uppercase placeholder-slate-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Trigger Condition</label>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
            >
              <option value="PRICE_ABOVE">Price Crosses Above (₹)</option>
              <option value="PRICE_BELOW">Price Crosses Below (₹)</option>
              <option value="DAILY_CHANGE_PCT">Daily Move Exceeds (%)</option>
              <option value="DRAWDOWN_BREACH">Portfolio Drawdown Exceeds (%)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Threshold Value</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g. 1500 or 5.0"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !threshold}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg cursor-pointer disabled:opacity-40"
          >
            Create Alert Rule
          </button>
        </form>

        {/* Right Column: Active Rules & Log */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-white">Active Alert Rules ({data.rules.length})</h3>
            <div className="space-y-2">
              {data.rules.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">No active alert triggers. Set up a price alarm on the left!</div>
              ) : (
                data.rules.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white">{r.symbol || 'PORTFOLIO'}: </span>
                      <span className="text-cyan-400">{r.alert_type} @ {r.threshold_value}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
