import React, { useState } from 'react';
import {
  Activity,
  BrainCircuit,
  TrendingUp,
  Briefcase,
  Menu,
  X,
  Star,
  LineChart,
  ShieldAlert,
  Newspaper,
  PieChart,
  Bell,
  FileText,
  Receipt,
  Settings
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export const MobileTabs: React.FC = () => {
  const { activeTab, setActiveTab } = useTrading();
  const [showDrawer, setShowDrawer] = useState(false);

  const MAIN_MOBILE = [
    { id: 'dashboard', label: 'Home', icon: Activity },
    { id: 'ai-adviser', label: 'AI Adviser', icon: BrainCircuit },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  ];

  const ALL_VIEWS = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: Activity },
    { id: 'ai-adviser', label: 'AI Financial Adviser', icon: BrainCircuit },
    { id: 'markets', label: 'NSE Equities & Markets', icon: TrendingUp },
    { id: 'watchlist', label: 'Custom Watchlist', icon: Star },
    { id: 'portfolio', label: 'Portfolio Intelligence', icon: Briefcase },
    { id: 'orders', label: 'Paper Trading Simulator', icon: LineChart },
    { id: 'risk-centre', label: 'Risk Centre & Stress Test', icon: ShieldAlert },
    { id: 'research', label: 'News & Market Research', icon: Newspaper },
    { id: 'planner', label: 'Personal Finance Planner', icon: PieChart },
    { id: 'alerts', label: 'Alerts & Notifications', icon: Bell },
    { id: 'documents', label: 'Document Intelligence', icon: FileText },
    { id: 'reports', label: 'Tax & PnL Reports', icon: Receipt },
    { id: 'settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Modal for All Views */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-end p-3 animate-fade-in md:hidden">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 max-h-[80vh] overflow-y-auto space-y-2">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-bold text-white text-sm">All Platform Views</span>
              <button onClick={() => setShowDrawer(false)} className="p-1 rounded bg-slate-800 text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {ALL_VIEWS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    setShowDrawer(false);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                    activeTab === id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Nav */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className="bg-[#080B12]/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 flex items-center justify-around">
          {MAIN_MOBILE.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] tracking-tight">{label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowDrawer(true)}
            className="flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl text-slate-400 hover:text-slate-200"
          >
            <Menu className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </div>
      </div>
    </>
  );
};
