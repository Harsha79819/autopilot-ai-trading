import React from 'react';
import { Activity, Radio, Layers, LineChart, Sliders } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export const MobileTabs: React.FC = () => {
  const { activeTab, setActiveTab } = useTrading();

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Activity },
    { id: 'scanner', label: 'Scanner', icon: Radio },
    { id: 'strategies', label: 'Strategies', icon: Layers },
    { id: 'orders', label: 'Orders', icon: LineChart },
    { id: 'backtest', label: 'Backtest', icon: Sliders },
  ];

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-50">
      <div className="bg-[#080B12]/85 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-1.5 flex items-center justify-around">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-white/10 text-accent-cyan font-medium border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
