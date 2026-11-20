import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, TrendingUp, TrendingDown, Clock, ShieldCheck, Award, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { TradeReplayData } from '../../types';

interface TradeReplayModalProps {
  tradeId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TradeReplayModal: React.FC<TradeReplayModalProps> = ({
  tradeId,
  isOpen,
  onClose
}) => {
  const { t } = useLanguage();
  const [data, setData] = useState<TradeReplayData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && tradeId) {
      loadReplay(tradeId);
    } else {
      setData(null);
      setCurrentStepIndex(0);
      setIsPlaying(false);
    }
  }, [isOpen, tradeId]);

  const loadReplay = async (id: number) => {
    setLoading(true);
    try {
      const res = await api.getTradeReplay(id);
      setData(res);
      setCurrentStepIndex(0);
    } catch (err) {
      console.error('Failed to load trade replay:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-play animation
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && data && data.trajectory.length > 0) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= data.trajectory.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, data]);

  if (!isOpen) return null;

  const currentStep = data?.trajectory[currentStepIndex];
  const isWin = (data?.realized_pnl || 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Glow */}
        <div
          className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
            isWin ? 'bg-emerald-500/10' : 'bg-rose-500/10'
          }`}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {loading || !data ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-3" />
            <p className="text-sm font-medium">
              {t('టిక్-బై-టిక్ ట్రేడ్ రిప్లే లోడ్ అవుతోంది...', 'Loading Tick-by-Tick Trade Replay...')}
            </p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Trade Replay #{data.trade_id}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      isWin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {isWin ? '🎉 WIN' : '🛑 STOP-LOSS EXIT'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 font-mono">
                  {data.symbol}
                </h3>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">{t('ఫైనల్ ఫలితం', 'Final Result')}</span>
                <span
                  className={`text-lg font-black font-mono ${
                    isWin ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isWin ? '+' : ''}₹{data.realized_pnl.toFixed(2)} ({isWin ? '+' : ''}
                  {data.return_pct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Current Tick Scrubber Status Box */}
            {currentStep && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    T + {currentStep.time_offset_min}m (Step {currentStep.step_index}/{data.trajectory.length})
                  </span>
                  <span className="font-mono text-slate-300">
                    Spot: ₹{currentStep.spot_price.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">{t('ఆప్షన్ ప్రీమియం', 'Option Premium')}</span>
                    <span className="text-base font-bold font-mono text-slate-100">
                      ₹{currentStep.option_premium.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">{t('అన్‌రియలైజ్డ్ P&L', 'Unrealized P&L')}</span>
                    <span
                      className={`text-base font-bold font-mono ${
                        currentStep.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {currentStep.unrealized_pnl >= 0 ? '+' : ''}₹{currentStep.unrealized_pnl.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">{t('ట్రైలింగ్ SL ఫ్లోర్', 'Trailing SL Floor')}</span>
                    <span className="text-base font-bold font-mono text-amber-400">
                      ₹{currentStep.trailing_stop.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Event Note Banner */}
                {currentStep.event_note && (
                  <div className="text-xs bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 p-2 rounded-lg flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>{currentStep.event_note}</span>
                  </div>
                )}
              </div>
            )}

            {/* Visual Trajectory Timeline */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{t('ఎంట్రీ: ₹', 'Entry: ₹')}{data.entry_premium.toFixed(2)}</span>
                <span className="font-mono">
                  {t('ఎగ్జిట్: ₹', 'Exit: ₹')}{data.exit_premium.toFixed(2)} ({data.exit_reason})
                </span>
              </div>

              {/* Step dots */}
              <div className="flex items-center gap-1.5 py-1">
                {data.trajectory.map((step, idx) => {
                  const isCurrent = idx === currentStepIndex;
                  const isPast = idx <= currentStepIndex;
                  return (
                    <button
                      key={step.step_index}
                      onClick={() => {
                        setCurrentStepIndex(idx);
                        setIsPlaying(false);
                      }}
                      className={`flex-1 h-2 rounded-full transition-all ${
                        isCurrent
                          ? 'bg-amber-400 ring-2 ring-amber-400/50 scale-y-125'
                          : isPast
                          ? isWin ? 'bg-emerald-500' : 'bg-rose-500'
                          : 'bg-slate-800'
                      }`}
                      title={`Step ${step.step_index}: ₹${step.option_premium}`}
                    />
                  );
                })}
              </div>

              {/* Range Slider for Manual Scrubbing */}
              <input
                type="range"
                min={0}
                max={data.trajectory.length - 1}
                value={currentStepIndex}
                onChange={(e) => {
                  setCurrentStepIndex(Number(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <button
                onClick={() => {
                  setCurrentStepIndex(0);
                  setIsPlaying(false);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                title="Restart Replay"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="py-2 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? t('పాజ్ చేయండి', 'Pause') : t('ప్లే చేయండి (Auto-Play)', 'Play Simulation')}</span>
              </button>
            </div>

            {/* AI Post-Mortem Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>{t('AI పోస్ట్-మార్టం & రూల్స్ ఆడిట్', 'AI Post-Mortem & Discipline Audit')}</span>
              </div>
              <p className="leading-relaxed">
                {t(data.post_mortem_telugu, data.post_mortem_en)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
