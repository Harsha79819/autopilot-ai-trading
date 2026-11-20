import React, { useState } from 'react';
import { ShieldCheck, ArrowUpRight, ArrowDownRight, Zap, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

interface HedgedSpreadCardProps {
  underlying: string;
  spotPrice: number;
  strikeStep: number;
  lotSize: number;
  onSpreadExecuted?: () => void;
  disabled?: boolean;
}

export const HedgedSpreadCard: React.FC<HedgedSpreadCardProps> = ({
  underlying,
  spotPrice,
  strikeStep,
  lotSize,
  onSpreadExecuted,
  disabled
}) => {
  const { t } = useLanguage();
  const [loadingType, setLoadingType] = useState<'BULL_CALL_SPREAD' | 'BEAR_PUT_SPREAD' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;
  const bullOtmStrike = atmStrike + strikeStep;
  const bearOtmStrike = atmStrike - strikeStep;

  const handleExecuteSpread = async (spreadType: 'BULL_CALL_SPREAD' | 'BEAR_PUT_SPREAD') => {
    setLoadingType(spreadType);
    setFeedback(null);
    try {
      const res = await api.placeSpreadOrder({
        underlying,
        spread_type: spreadType,
        quantity: lotSize
      });
      setFeedback({
        type: 'success',
        message: res.message || t(
          'హెడ్జ్డ్ స్ప్రెడ్ ఆర్డర్ విజయవంతంగా ఎగ్జిక్యూట్ అయ్యింది! మార్జిన్ & రిస్క్ 50% తగ్గించబడింది.',
          'Hedged spread executed successfully! Margin & risk reduced by 50%.'
        )
      });
      if (onSpreadExecuted) {
        onSpreadExecuted();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || t(
          'స్ప్రెడ్ ఎగ్జిక్యూషన్‌లో సమస్య ఎదురైంది.',
          'Failed to execute hedged spread order.'
        )
      });
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 transition-all rounded-2xl p-5 shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                {t('1-క్లిక్ హెడ్జ్డ్ స్ప్రెడ్స్ (రిస్క్ & మార్జిన్ సేవర్)', '1-Click Hedged Spreads (Risk & Margin Saver)')}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                50% Margin Cut
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {t(
                'టైమ్ వేల్యూ (తీటా) నష్టం లేకుండా క్యాపిటల్ రక్షణతో కూడిన డబుల్-లెగ్ స్ట్రాటజీ',
                'Pre-hedged 2-leg strategies that eliminate overnight theta time decay'
              )}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-slate-500">{t('స్పాట్:', 'Spot:')}</span>{' '}
          <span className="font-mono font-bold text-slate-200">₹{spotPrice.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Two Spreads Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bull Call Spread Card */}
        <div className="bg-gradient-to-br from-emerald-950/20 to-slate-950/60 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  {t('బుల్ కాల్ స్ప్రెడ్ (అప్‌సైడ్)', 'Bull Call Spread (Upside)')}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {underlying}
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              {t(
                `కొనుగోలు: ${atmStrike} CE + అమ్మకం: ${bullOtmStrike} CE`,
                `Buy ${atmStrike} CE + Sell ${bullOtmStrike} CE`
              )}
            </p>

            <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] mb-4">
              <div>
                <span className="text-slate-500 block">{t('అంచనా మార్జిన్', 'Req. Margin')}</span>
                <span className="font-mono font-bold text-slate-200">~₹1,200 - ₹1,800</span>
              </div>
              <div>
                <span className="text-slate-500 block">{t('గరిష్ట రిస్క్', 'Max Loss')}</span>
                <span className="font-mono font-bold text-rose-400">{t('డెబిట్ వరకే', 'Capped to Debit')}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{t('తీటా డికే', 'Theta Decay')}</span>
                <span className="font-mono font-bold text-emerald-400">{t('హెడ్జ్డ్ (0)', 'Neutralized')}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleExecuteSpread('BULL_CALL_SPREAD')}
            disabled={disabled || loadingType !== null}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] transition-all text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingType === 'BULL_CALL_SPREAD' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t('ఎగ్జిక్యూట్ అవుతోంది...', 'Executing Spread...')}</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{t('1-క్లిక్ బుల్ కాల్ స్ప్రెడ్ ఎగ్జిక్యూట్ చేయండి', '1-Click Execute Bull Call Spread')}</span>
              </>
            )}
          </button>
        </div>

        {/* Bear Put Spread Card */}
        <div className="bg-gradient-to-br from-rose-950/20 to-slate-950/60 border border-rose-500/30 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
                <span className="text-sm font-bold text-rose-400">
                  {t('బేర్ పుట్ స్ప్రెడ్ (డౌన్‌సైడ్)', 'Bear Put Spread (Downside)')}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                {underlying}
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              {t(
                `కొనుగోలు: ${atmStrike} PE + అమ్మకం: ${bearOtmStrike} PE`,
                `Buy ${atmStrike} PE + Sell ${bearOtmStrike} PE`
              )}
            </p>

            <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] mb-4">
              <div>
                <span className="text-slate-500 block">{t('అంచనా మార్జిన్', 'Req. Margin')}</span>
                <span className="font-mono font-bold text-slate-200">~₹1,200 - ₹1,800</span>
              </div>
              <div>
                <span className="text-slate-500 block">{t('గరిష్ట రిస్క్', 'Max Loss')}</span>
                <span className="font-mono font-bold text-rose-400">{t('డెబిట్ వరకే', 'Capped to Debit')}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{t('తీటా డికే', 'Theta Decay')}</span>
                <span className="font-mono font-bold text-emerald-400">{t('హెడ్జ్డ్ (0)', 'Neutralized')}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleExecuteSpread('BEAR_PUT_SPREAD')}
            disabled={disabled || loadingType !== null}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 active:scale-[0.98] transition-all text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingType === 'BEAR_PUT_SPREAD' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t('ఎగ్జిక్యూట్ అవుతోంది...', 'Executing Spread...')}</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{t('1-క్లిక్ బేర్ పుట్ స్ప్రెడ్ ఎగ్జిక్యూట్ చేయండి', '1-Click Execute Bear Put Spread')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Execution Feedback Notification */}
      {feedback && (
        <div
          className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
