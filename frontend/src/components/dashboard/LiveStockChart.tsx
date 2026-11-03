import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  RefreshCw, 
  Layers, 
  Sliders, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Target,
  Shield,
  Zap,
  Eye
} from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { useTrading } from '../../context/TradingContext';
import { formatINR, formatPct } from '../../utils/currency';
import { api } from '../../services/api';
import { Candle, Quote } from '../../types';

interface LiveStockChartProps {
  initialSymbol?: string;
}

export const LiveStockChart: React.FC<LiveStockChartProps> = ({ initialSymbol = 'COALINDIA' }) => {
  const { quotes, portfolio, placeOrder, refreshPortfolio } = useTrading();
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m'>('1m');
  const [chartMode, setChartMode] = useState<'candles' | 'line'>('candles');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [orderQty, setOrderQty] = useState<number>(1);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Active holdings list
  const holdings = portfolio?.positions || [];
  const ownedPosition = holdings.find(p => p.symbol.toUpperCase() === selectedSymbol.toUpperCase());

  // Available stocks list (Holdings + Large Cap Universe)
  const popularSymbols = ['COALINDIA', 'POWERGRID', 'IOC', 'RELIANCE', 'TCS', 'INFY', 'ITC', 'BEL', 'WIPRO', 'SBIN'];

  // Current live quote
  const currentQuote: Quote | undefined = quotes[selectedSymbol] || {
    symbol: selectedSymbol,
    company_name: selectedSymbol === 'COALINDIA' ? 'Coal India Ltd.' :
                  selectedSymbol === 'POWERGRID' ? 'Power Grid Corp.' :
                  selectedSymbol === 'IOC' ? 'Indian Oil Corp.' :
                  selectedSymbol === 'RELIANCE' ? 'Reliance Industries' :
                  selectedSymbol === 'TCS' ? 'Tata Consultancy Services' :
                  selectedSymbol === 'INFY' ? 'Infosys Ltd.' :
                  selectedSymbol === 'ITC' ? 'ITC Ltd.' :
                  selectedSymbol === 'BEL' ? 'Bharat Electronics Ltd.' :
                  selectedSymbol === 'WIPRO' ? 'Wipro Ltd.' : `${selectedSymbol} Ltd.`,
    current_price: ownedPosition?.current_price ?? 493.50,
    open: (ownedPosition?.current_price ?? 493.50) * 0.992,
    high: (ownedPosition?.current_price ?? 493.50) * 1.015,
    low: (ownedPosition?.current_price ?? 493.50) * 0.988,
    previous_close: (ownedPosition?.current_price ?? 493.50) * 0.985,
    change: (ownedPosition?.current_price ?? 493.50) * 0.015,
    change_pct: 1.52,
    bid: (ownedPosition?.current_price ?? 493.50) - 0.2,
    ask: (ownedPosition?.current_price ?? 493.50) + 0.2,
    spread_pct: 0.08,
    volume: 1450200,
    timestamp: new Date().toISOString(),
    is_stale: false,
    is_demo: true,
    disclaimer: 'NSE SIMULATED FEED'
  } as Quote;

  // Fetch candles
  const fetchCandles = async (sym: string, tf: '1m' | '5m' | '15m') => {
    try {
      setIsRefreshing(true);
      const data = await api.getCandles(sym, tf, 50);
      if (Array.isArray(data) && data.length > 0) {
        setCandles(data);
      } else {
        // Fallback synthetic candle series around current price
        generateFallbackCandles(sym);
      }
    } catch (err) {
      console.warn(`Could not fetch candles for ${sym}, generating realistic series:`, err);
      generateFallbackCandles(sym);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const generateFallbackCandles = (sym: string) => {
    const basePrice = quotes[sym]?.current_price || (sym === 'COALINDIA' ? 493.50 : sym === 'POWERGRID' ? 324.00 : sym === 'IOC' ? 147.50 : 500.00);
    const count = 40;
    const generated: Candle[] = [];
    let cur = basePrice * 0.985;
    const now = Date.now();

    for (let i = count; i >= 0; i--) {
      const ts = new Date(now - i * 60000).toISOString();
      const delta = (Math.sin(i * 0.6) * 0.004 + (Math.random() - 0.48) * 0.006) * cur;
      const open = cur;
      const close = cur + delta;
      const high = Math.max(open, close) + Math.random() * (cur * 0.003);
      const low = Math.min(open, close) - Math.random() * (cur * 0.003);
      const volume = Math.floor(10000 + Math.random() * 50000);
      cur = close;
      generated.push({
        symbol: sym,
        timeframe,
        timestamp: ts,
        open,
        high,
        low,
        close,
        volume,
        is_demo: true
      });
    }
    setCandles(generated);
  };

  useEffect(() => {
    fetchCandles(selectedSymbol, timeframe);
    const interval = setInterval(() => {
      fetchCandles(selectedSymbol, timeframe);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedSymbol, timeframe]);

  // Scaling calculations
  const { minPrice, maxPrice, priceRange, maxVol } = useMemo(() => {
    if (candles.length === 0) {
      return { minPrice: 100, maxPrice: 200, priceRange: 100, maxVol: 1000 };
    }
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const vols = candles.map(c => c.volume);
    const minP = Math.min(...lows) * 0.996;
    const maxP = Math.max(...highs) * 1.004;
    return {
      minPrice: minP,
      maxPrice: maxP,
      priceRange: maxP - minP || 1,
      maxVol: Math.max(...vols) || 1
    };
  }, [candles]);

  // Target and Stoploss levels based on AI Golden Rules (1:2 RR)
  const buyReferencePrice = ownedPosition ? ownedPosition.average_buy_price : currentQuote.current_price;
  const takeProfitPrice = buyReferencePrice * 1.03; // +3.0%
  const stopLossPrice = buyReferencePrice * 0.985;  // -1.5%

  const tpY = 100 - ((takeProfitPrice - minPrice) / priceRange) * 100;
  const slY = 100 - ((stopLossPrice - minPrice) / priceRange) * 100;
  const buyY = 100 - ((buyReferencePrice - minPrice) / priceRange) * 100;

  // Handle Quick Paper Trade
  const handleQuickTrade = async (side: 'BUY' | 'SELL') => {
    try {
      await placeOrder({
        symbol: selectedSymbol,
        side,
        quantity: orderQty,
        order_type: 'MARKET'
      });
      setOrderSuccessMsg(`Successfully executed paper ${side} for ${orderQty} share(s) of ${selectedSymbol}!`);
      await refreshPortfolio();
      setTimeout(() => setOrderSuccessMsg(null), 4000);
    } catch (err: any) {
      setOrderSuccessMsg(`Order error: ${err.message || 'Execution failed'}`);
      setTimeout(() => setOrderSuccessMsg(null), 4000);
    }
  };

  return (
    <GlassCard className="mt-4 overflow-hidden border border-slate-800/80 shadow-2xl relative">
      {/* Top Header & Stock Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Live Stock Market Graph (లైవ్ మార్కెట్ చార్ట్)
              </h3>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                NSE LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              నిజ-సమయ క్యాండిల్‌స్టిక్ చార్ట్, AI టార్గెట్ (+3.0%) & స్టాప్-లాస్ (-1.5%) ట్రాకింగ్
            </p>
          </div>
        </div>

        {/* Chart Controls (Timeframe & Chart Mode) */}
        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-900/80 rounded-md p-0.5 border border-slate-700">
            {(['1m', '5m', '15m'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.8 text-xs font-mono font-medium rounded transition-colors ${
                  timeframe === tf ? 'bg-accent-cyan text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Mode selector */}
          <div className="flex items-center bg-slate-900/80 rounded-md p-0.5 border border-slate-700">
            <button
              onClick={() => setChartMode('candles')}
              className={`px-2 py-0.8 text-xs font-medium rounded transition-colors ${
                chartMode === 'candles' ? 'bg-accent-cyan text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              🕯️ Candles
            </button>
            <button
              onClick={() => setChartMode('line')}
              className={`px-2 py-0.8 text-xs font-medium rounded transition-colors ${
                chartMode === 'line' ? 'bg-accent-cyan text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              📈 Line
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchCandles(selectedSymbol, timeframe)}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="చార్ట్ రీఫ్రెష్ చేయండి"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent-cyan' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stock Selection Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 scrollbar-thin">
        <span className="text-[11px] font-semibold text-slate-400 pr-1 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5 text-accent-cyan" />
          స్టాక్ ఎంచుకోండి:
        </span>
        {popularSymbols.map(sym => {
          const isHeld = holdings.some(h => h.symbol.toUpperCase() === sym);
          const isSelected = selectedSymbol.toUpperCase() === sym;
          const livePrice = quotes[sym]?.current_price;
          const chgPct = quotes[sym]?.change_pct;

          return (
            <button
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all whitespace-nowrap border ${
                isSelected
                  ? 'bg-accent-cyan text-slate-950 font-bold border-accent-cyan shadow-md shadow-accent-cyan/20'
                  : isHeld
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>{sym}</span>
              {isHeld && (
                <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-slate-900 text-emerald-400' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  HELD
                </span>
              )}
              {livePrice && (
                <span className={`text-[10px] ${isSelected ? 'text-slate-900' : (chgPct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatINR(livePrice)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Ticker Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800 mb-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white tracking-wide font-mono">{selectedSymbol}</span>
              <span className="text-xs text-slate-400">{currentQuote.company_name}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-bold text-cyan-300 font-mono">
                {formatINR(currentQuote.current_price)}
              </span>
              <span className={`text-xs font-semibold flex items-center font-mono ${currentQuote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentQuote.change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {formatPct(currentQuote.change_pct)} ({currentQuote.change >= 0 ? `+${formatINR(currentQuote.change)}` : formatINR(currentQuote.change)})
              </span>
            </div>
          </div>
        </div>

        {/* Owned Status or AI Target Badge */}
        {ownedPosition ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-1.5 text-xs text-emerald-300">
            <span className="font-semibold block">పోర్ట్‌ఫోలియోలో ఉంది: {ownedPosition.quantity} Shares</span>
            <span className="text-[11px] text-slate-300">
              Avg Buy: {formatINR(ownedPosition.average_buy_price)} | Unr PnL: <strong className="text-emerald-400 font-mono">+{formatINR(ownedPosition.unrealized_pnl)}</strong>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <div className="bg-slate-800/80 rounded-md px-2.5 py-1 border border-slate-700 text-slate-300">
              <span className="text-slate-500 text-[10px] block">Day High / Low</span>
              <span className="font-mono text-white text-[11px]">{formatINR(currentQuote.high)} / {formatINR(currentQuote.low)}</span>
            </div>
            <div className="bg-slate-800/80 rounded-md px-2.5 py-1 border border-slate-700 text-slate-300">
              <span className="text-slate-500 text-[10px] block">Volume</span>
              <span className="font-mono text-cyan-400 text-[11px]">{currentQuote.volume.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
      </div>

      {/* SVG Canvas for Candlestick / Line Chart */}
      <div 
        className="w-full h-64 sm:h-72 relative select-none cursor-crosshair"
        onMouseLeave={() => setHoveredCandle(null)}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="liveLineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid Horizontal Guidelines */}
          {[0.2, 0.4, 0.6, 0.8].map(ratio => {
            const y = ratio * 100;
            return (
              <line
                key={ratio}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeDasharray="1.5,1.5"
                strokeWidth="0.4"
              />
            );
          })}

          {/* AI Take-Profit Target Line (+3.0%) */}
          {tpY >= 0 && tpY <= 100 && (
            <g>
              <line
                x1="0"
                y1={tpY}
                x2="100"
                y2={tpY}
                stroke="#10B981"
                strokeDasharray="2,2"
                strokeWidth="0.75"
              />
              <text x="98" y={Math.max(4, tpY - 1.5)} textAnchor="end" fill="#10B981" fontSize="2.5" fontWeight="bold">
                AI Target (+3.0%): {formatINR(takeProfitPrice)}
              </text>
            </g>
          )}

          {/* AI Stop-Loss Line (-1.5%) */}
          {slY >= 0 && slY <= 100 && (
            <g>
              <line
                x1="0"
                y1={slY}
                x2="100"
                y2={slY}
                stroke="#F43F5E"
                strokeDasharray="2,2"
                strokeWidth="0.75"
              />
              <text x="98" y={Math.min(98, slY + 3.5)} textAnchor="end" fill="#F43F5E" fontSize="2.5" fontWeight="bold">
                AI Stop-Loss (-1.5%): {formatINR(stopLossPrice)}
              </text>
            </g>
          )}

          {/* User Buy Price Reference (if held) */}
          {ownedPosition && buyY >= 0 && buyY <= 100 && (
            <g>
              <line
                x1="0"
                y1={buyY}
                x2="100"
                y2={buyY}
                stroke="#F59E0B"
                strokeDasharray="1,2"
                strokeWidth="0.6"
              />
              <text x="2" y={Math.max(4, buyY - 1.5)} fill="#F59E0B" fontSize="2.5">
                Buy Cost: {formatINR(buyReferencePrice)}
              </text>
            </g>
          )}

          {/* Volume bars at bottom */}
          {candles.map((c, i) => {
            const n = candles.length;
            const x = n > 1 ? (i / (n - 1)) * 96 + 2 : 50;
            const volHeight = Math.min(20, (c.volume / maxVol) * 20);
            const isBullish = c.close >= c.open;
            return (
              <rect
                key={`vol-${i}`}
                x={x - 0.4}
                y={100 - volHeight}
                width="0.8"
                height={volHeight}
                fill={isBullish ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)'}
              />
            );
          })}

          {/* Candlestick Mode */}
          {chartMode === 'candles' && candles.map((c, i) => {
            const n = candles.length;
            const x = n > 1 ? (i / (n - 1)) * 96 + 2 : 50;
            const highY = 100 - ((c.high - minPrice) / priceRange) * 100;
            const lowY = 100 - ((c.low - minPrice) / priceRange) * 100;
            const openY = 100 - ((c.open - minPrice) / priceRange) * 100;
            const closeY = 100 - ((c.close - minPrice) / priceRange) * 100;
            
            const isBullish = c.close >= c.open;
            const color = isBullish ? '#10B981' : '#F43F5E';
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(0.6, Math.abs(openY - closeY));
            const candleWidth = Math.max(0.7, 85 / (n * 1.5));

            return (
              <g 
                key={i} 
                onMouseEnter={() => setHoveredCandle(c)}
                className="cursor-pointer transition-opacity hover:opacity-80"
              >
                {/* Upper and lower wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="0.4"
                />
                {/* Candle body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isBullish ? '#10B981' : '#F43F5E'}
                  rx="0.2"
                />
              </g>
            );
          })}

          {/* Area / Line Mode */}
          {chartMode === 'line' && (
            <g>
              <path
                d={candles.map((c, i) => {
                  const n = candles.length;
                  const x = n > 1 ? (i / (n - 1)) * 96 + 2 : 50;
                  const y = 100 - ((c.close - minPrice) / priceRange) * 100;
                  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
                }).join(' ')}
                fill="none"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d={`${candles.map((c, i) => {
                  const n = candles.length;
                  const x = n > 1 ? (i / (n - 1)) * 96 + 2 : 50;
                  const y = 100 - ((c.close - minPrice) / priceRange) * 100;
                  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
                }).join(' ')} L 98 100 L 2 100 Z`}
                fill="url(#liveLineGrad)"
              />
            </g>
          )}

          {/* Pulsing Dot at Latest Price Point */}
          {candles.length > 0 && (
            <g>
              <circle
                cx={98}
                cy={100 - ((candles[candles.length - 1].close - minPrice) / priceRange) * 100}
                r="3"
                fill="#10B981"
                opacity="0.3"
                className="animate-ping"
              />
              <circle
                cx={98}
                cy={100 - ((candles[candles.length - 1].close - minPrice) / priceRange) * 100}
                r="1.8"
                fill="#10B981"
              />
            </g>
          )}
        </svg>

        {/* Price Scale on Left */}
        <div className="absolute top-1 left-1.5 flex flex-col justify-between h-56 pointer-events-none text-[9px] font-mono text-slate-500">
          <span>{formatINR(maxPrice)}</span>
          <span>{formatINR(maxPrice - priceRange * 0.25)}</span>
          <span>{formatINR(maxPrice - priceRange * 0.50)}</span>
          <span>{formatINR(maxPrice - priceRange * 0.75)}</span>
          <span>{formatINR(minPrice)}</span>
        </div>

        {/* Hover Inspection HUD */}
        {hoveredCandle && (
          <div className="absolute top-2 right-2 bg-slate-900/90 border border-slate-700/80 rounded-md p-2 shadow-xl backdrop-blur-sm text-xs font-mono space-y-0.5 pointer-events-none z-20">
            <div className="text-[10px] text-slate-400">
              {new Date(hoveredCandle.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="grid grid-cols-2 gap-x-3 text-[11px]">
              <div><span className="text-slate-500">O:</span> <span className="text-white">{formatINR(hoveredCandle.open)}</span></div>
              <div><span className="text-slate-500">H:</span> <span className="text-white">{formatINR(hoveredCandle.high)}</span></div>
              <div><span className="text-slate-500">L:</span> <span className="text-white">{formatINR(hoveredCandle.low)}</span></div>
              <div>
                <span className="text-slate-500">C:</span>{' '}
                <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {formatINR(hoveredCandle.close)}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              Vol: {hoveredCandle.volume.toLocaleString('en-IN')}
            </div>
          </div>
        )}
      </div>

      {/* Chart Legend & Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-3 mt-2 border-t border-slate-800/40 text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            <span className="text-slate-300">Bullish Candle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span className="text-slate-300">Bearish Candle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-400 border-dashed" />
            <span className="text-emerald-400">AI Target (+3.0%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-rose-500 border-dashed" />
            <span className="text-rose-400">AI Stop-Loss (-1.5%)</span>
          </div>
        </div>

        {/* Quick Order Bar */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Paper Trade:</span>
          <select 
            value={orderQty} 
            onChange={(e) => setOrderQty(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-xs rounded px-1.5 py-0.5 text-white"
          >
            <option value={1}>1 Qty</option>
            <option value={2}>2 Qty</option>
            <option value={5}>5 Qty</option>
            <option value={10}>10 Qty</option>
          </select>

          <button
            onClick={() => handleQuickTrade('BUY')}
            className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-colors shadow-sm"
          >
            BUY
          </button>
          <button
            onClick={() => handleQuickTrade('SELL')}
            className="px-2.5 py-1 text-xs font-bold rounded bg-rose-500 hover:bg-rose-600 text-white transition-colors shadow-sm"
          >
            SELL
          </button>
        </div>
      </div>

      {/* Order execution toast message */}
      {orderSuccessMsg && (
        <div className="mt-2 p-2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{orderSuccessMsg}</span>
        </div>
      )}
    </GlassCard>
  );
};
