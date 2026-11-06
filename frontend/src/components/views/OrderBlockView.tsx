import React, { useState, useEffect } from 'react';
import { MarketPictureBar } from '../orderblock/MarketPictureBar';
import { OrderBlockBoard } from '../orderblock/OrderBlockBoard';
import { OrderBlockModal } from '../orderblock/OrderBlockModal';
import { MarketBreadth, OrderBlockSetup } from '../../types/orderblock';

export const OrderBlockView: React.FC = () => {
  const [breadth, setBreadth] = useState<MarketBreadth | null>(null);
  const [bullish, setBullish] = useState<OrderBlockSetup[]>([]);
  const [bearish, setBearish] = useState<OrderBlockSetup[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/v1/orderblock/board');
      const data = await res.json();
      setBullish(data.bullish || []);
      setBearish(data.bearish || []);
      
      const bRes = await fetch('/api/v1/orderblock/market-picture');
      const bData = await bRes.json();
      setBreadth(bData);
    } catch (err) {
      console.error('Failed to load OrderBlock board:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // 1-minute live tick
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl animate-in fade-in duration-300">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white">◬</span>
            Live Order Block & Liquidity Terminal
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tracking 200+ Indian F&O Stocks. 5-Minute Finished Candles with BOS & Fair Value Gaps.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-cyan-400 flex items-center gap-2 cursor-pointer transition-all"
        >
          ↻ Refresh Board
        </button>
      </div>

      <MarketPictureBar data={breadth} />
      <OrderBlockBoard bullish={bullish} bearish={bearish} onSelectSymbol={setSelectedSymbol} />
      <OrderBlockModal symbol={selectedSymbol} onClose={() => setSelectedSymbol(null)} />
    </div>
  );
};
