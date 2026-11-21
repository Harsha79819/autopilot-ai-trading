import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare, Smartphone, CheckCircle2, AlertCircle, RefreshCw, Send, ExternalLink, Bell, ChevronDown, ChevronUp, Shield, Key, Moon, Calendar, Clock, Play } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

interface WhatsAppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const WhatsAppSettingsModal: React.FC<WhatsAppSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const { t } = useLanguage();
  const [phone, setPhone] = useState<string>('');
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [metaPhoneId, setMetaPhoneId] = useState<string>('');
  const [metaToken, setMetaToken] = useState<string>('');
  const [hasMetaToken, setHasMetaToken] = useState<boolean>(false);
  const [showMetaSetup, setShowMetaSetup] = useState<boolean>(false);
  const [callmebotKey, setCallmebotKey] = useState<string>('');
  const [showCallmebotSetup, setShowCallmebotSetup] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testingSlot, setTestingSlot] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [showScheduleDetails, setShowScheduleDetails] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastWaLink, setLastWaLink] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const [cfg, sched] = await Promise.allSettled([
        api.getWhatsAppConfig(),
        api.getWhatsAppSchedule()
      ]);
      if (cfg.status === 'fulfilled') {
        setPhone(cfg.value.whatsapp_phone || '');
        setAlertsEnabled(cfg.value.whatsapp_alerts_enabled !== false);
        setMetaPhoneId(cfg.value.whatsapp_phone_number_id || '');
        setHasMetaToken(Boolean(cfg.value.has_meta_token));
        setCallmebotKey(cfg.value.whatsapp_api_key || '');
      }
      if (sched.status === 'fulfilled') {
        setScheduleData(sched.value);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp config/schedule:', err);
    }
  };

  const handleTestScheduleSlot = async (slotKey: string, slotName: string) => {
    setTestingSlot(slotKey);
    setFeedback(null);
    try {
      await api.testWhatsAppScheduleSlot(slotKey);
      playAlertChime();
      setFeedback({
        type: 'success',
        message: t(
          `✅ "${slotName}" వాట్సాప్ మెసేజ్ & అను వాయిస్ నోట్ విజయవంతంగా పంపబడ్డాయి!`,
          `✅ "${slotName}" WhatsApp alert & Anu voice note sent successfully!`
        )
      });
      // Refresh schedule
      const updated = await api.getWhatsAppSchedule().catch(() => null);
      if (updated) setScheduleData(updated);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || t('షెడ్యూల్డ్ స్లాట్ టెస్ట్ చేయడంలో సమస్య ఎదురైంది.', 'Failed to trigger schedule test slot.')
      });
    } finally {
      setTestingSlot(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      await api.configureWhatsApp({
        phone: phone.trim(),
        alerts_enabled: alertsEnabled,
        phone_number_id: metaPhoneId.trim(),
        access_token: metaToken.trim(),
        api_key: callmebotKey.trim()
      });
      if (metaToken.trim()) setHasMetaToken(true);
      setFeedback({
        type: 'success',
        message: t('WhatsApp అలర్ట్స్ సెట్టింగ్స్ విజయవంతంగా సేవ్ చేయబడ్డాయి!', 'WhatsApp alert settings saved successfully!')
      });
      if (onConfigSaved) onConfigSaved();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || t('సెట్టింగ్స్ సేవ్ చేయడంలో సమస్య ఏర్పడింది.', 'Failed to save WhatsApp settings.')
      });
    } finally {
      setLoading(false);
    }
  };

  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const handleTestAlert = async () => {
    if (!phone || phone.trim().length < 10) {
      setFeedback({
        type: 'error',
        message: t('దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి.', 'Please enter a valid 10-digit mobile number.')
      });
      return;
    }

    setTesting(true);
    setFeedback(null);
    try {
      playAlertChime();
      const res = await api.testWhatsAppAlert({ phone: phone.trim() });
      const link = res.wa_link || res.whatsapp_link || '';
      setLastWaLink(link);
      
      // Automatically open WhatsApp so user doesn't have to click another link
      if (link) {
        window.open(link, '_blank');
      }

      // Also trigger native desktop/mobile notification if supported
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('AutoPilot AI WhatsApp Alert', {
            body: `Trade alert dispatched for ${phone.trim()}`,
            icon: '/vite.svg'
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }

      setFeedback({
        type: 'success',
        message: t(
          'వాట్సాప్ అలర్ట్ ట్రిగ్గర్ చేయబడింది! వాట్సాప్ విండో ఆటోమేటిక్‌గా ఓపెన్ అవుతుంది.',
          'WhatsApp alert triggered! WhatsApp opens automatically.'
        )
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || t('టెస్ట్ అలర్ట్ పంపడంలో సమస్య ఎదురైంది.', 'Failed to trigger test WhatsApp alert.')
      });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-5 sm:p-6 relative my-auto scrollbar-thin">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {t('WhatsApp రియల్-టైమ్ అలర్ట్స్ ఇంజిన్', 'WhatsApp Real-Time Alerts Engine')}
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {t('మీ మొబైల్ వాట్సాప్‌కు స్టాక్స్, ఆప్షన్లు, లాభాలు, నష్టాల లైవ్ మెసేజ్‌లు', 'Instant mobile WhatsApp updates on Equity, Options, SL, and Profit targets')}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              {t('వాట్సాప్ మొబైల్ నంబర్ (WhatsApp Mobile Number)', 'WhatsApp Mobile Number')}
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210 or 919876543210"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition-all"
              />
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              {t('భారతదేశ నంబర్లకు +91 లేదా 10 అంకెల మొబైల్ నంబర్ ఇవ్వవచ్చు.', 'Indian 10-digit numbers or international formats with country code.')}
            </span>
          </div>

          {/* Toggle Checkbox */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  {t('లైవ్ ట్రేడ్ అలర్ట్స్ ఎనేబుల్ చేయండి', 'Enable Live Trade Alerts')}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t('ప్రతి బై, సెల్, స్టాప్ లాస్ హిట్ అయినప్పుడు అలర్ట్ వస్తుంది', 'Receive WhatsApp pings whenever trades open, exit, or trail')}
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={alertsEnabled}
              onChange={(e) => setAlertsEnabled(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          {/* Option 1: CallMeBot Free Direct Push (10-Second Setup, No Developer Account) */}
          <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-3.5 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowCallmebotSetup(!showCallmebotSetup)}
            >
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span>{t('🌟 CallMeBot ఉచిత డైరెక్ట్ పుష్ (10 సెకన్ల సెటప్)', '🌟 Free Direct Push Gateway (10-Sec Setup)')}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      100% Free
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    {callmebotKey
                      ? t('✅ CallMeBot కీ యాక్టివ్‌గా ఉంది — డైరెక్ట్ సైలెంట్ మెసేజ్‌లు వస్తాయి', '✅ Direct push active — messages land automatically in WhatsApp')
                      : t('డెవలపర్ అకౌంట్ లేకుండా 10 సెకన్లలో ఆటోమేటిక్ పుష్ అలర్ట్స్', 'Instant automatic push without Meta developer account')}
                  </span>
                </div>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-200">
                {showCallmebotSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showCallmebotSetup && (
              <div className="space-y-3 pt-2 border-t border-slate-800 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {t('CallMeBot API Key', 'CallMeBot API Key')}
                  </label>
                  <input
                    type="text"
                    value={callmebotKey}
                    onChange={(e) => setCallmebotKey(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                  <div className="font-semibold text-cyan-300 flex items-center justify-between">
                    <span>{t('🔑 ఉచిత API Key పొందే 2 సులభ దశలు:', '🔑 Get Your Free API Key in 2 Steps:')}</span>
                    <a
                      href="https://api.whatsapp.com/send?phone=34644444444&text=I%20allow%20callmebot%20to%20send%20me%20messages"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      WhatsApp లో మెసేజ్ చేయండి <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div>1. {t('మీ వాట్సాప్ నుండి +34 644 44 44 44 కు "I allow callmebot to send me messages" అని మెసేజ్ పంపండి.', 'Send "I allow callmebot to send me messages" to +34 644 44 44 44 on WhatsApp.')}</div>
                  <div>2. {t('వాళ్ళు రిప్లై ఇచ్చే 6 అంకెల API Key ని పైన పేస్ట్ చేసి "Save" నొక్కండి!', 'Paste the 6-digit API key you receive in reply and click "Save"!')}</div>
                </div>
              </div>
            )}
          </div>

          {/* Meta WhatsApp Cloud API Section (Option 2 - Enterprise Official Push) */}
          <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-3.5 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowMetaSetup(!showMetaSetup)}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span>{t('Meta Official Cloud API (డైరెక్ట్ పుష్)', 'Meta Official Cloud API (Direct Push)')}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      1,000 Free/Mo
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    {hasMetaToken
                      ? t('✅ Meta Cloud API యాక్టివ్‌గా ఉంది — డైరెక్ట్ మెసేజ్‌లు వస్తాయి', '✅ Meta Cloud API active — messages land directly in WhatsApp')
                      : t('స్విగ్గీ/జొమాటో లాగా డైరెక్ట్ వాట్సాప్ మెసేజ్ సెటప్', 'Direct automatic push without clicking links')}
                  </span>
                </div>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-200">
                {showMetaSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Weekend Sleep Mode Indicator */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300">
              <div className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('వీకెండ్ స్లీప్ మోడ్ (శని & ఆదివారం)', 'Weekend Sleep Mode (Sat & Sun)')}</span>
              </div>
              <span className="font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                {t('1-2 EOD సమ్మరీ మాత్రమే', 'Max 1-2 Digest Msgs')}
              </span>
            </div>

            {/* Expandable Meta Config Inputs */}
            {showMetaSetup && (
              <div className="space-y-3 pt-2 border-t border-slate-800 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {t('Meta Phone Number ID', 'Meta Phone Number ID')}
                  </label>
                  <input
                    type="text"
                    value={metaPhoneId}
                    onChange={(e) => setMetaPhoneId(e.target.value)}
                    placeholder="e.g. 104859602847592"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>{t('Meta Access Token (Bearer)', 'Meta Access Token (Bearer)')}</span>
                    <a
                      href="https://developers.facebook.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                    >
                      developers.facebook.com <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </label>
                  <input
                    type="password"
                    value={metaToken}
                    onChange={(e) => setMetaToken(e.target.value)}
                    placeholder={hasMetaToken ? '•••••••••••••••••••• (Saved)' : 'EAABw...'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">
                    {t('3 సులభమైన దశలు (3 Quick Steps):', '3 Quick Setup Steps:')}
                  </div>
                  <div>1. {t('developers.facebook.com లో లాగిన్ అయి "WhatsApp" యాప్ తెరవండి.', 'Login to developers.facebook.com > WhatsApp > API Setup.')}</div>
                  <div>2. {t('Phone Number ID మరియు Access Token కాపీ చేయండి.', 'Copy your Phone Number ID and Access Token.')}</div>
                  <div>3. {t('ఇక్కడ పేస్ట్ చేసి Save నొక్కండి — ఇంక నేరుగా మీ వాట్సాప్‌కే మెసేజ్ వస్తుంది!', 'Paste here and click Save — messages will land directly in your WhatsApp inbox!')}</div>
                </div>
              </div>
            )}
          </div>

          {/* Feature List Preview - Total Platform Catalog */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>{t('మొత్తం ప్లాట్‌ఫామ్ అలర్ట్స్ (Total Live Alerts):', 'Total Live Alerts Catalog:')}</span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">All Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-mono">📈</span>
              <span>{t('ఈక్విటీ స్టాక్ ఆర్డర్లు (BUY & SELL with Realized P&L)', 'Equity Stock BUY & SELL orders with Realized P&L')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-mono">⚡</span>
              <span>{t('ఆప్షన్ కొనుగోలు & 1-క్లిక్ హెడ్జ్డ్ స్ప్రెడ్స్', 'Option BUY orders & Hedged Spreads')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-rose-400 font-mono">🛑</span>
              <span>{t('-20% హార్డ్ స్టాప్ లాస్ క్యాపిటల్ షీల్డ్ ఎగ్జిట్', '-20% Hard Stop-Loss Capital Shield exit')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-mono">🎯</span>
              <span>{t('+40% టార్గెట్ 1 & మల్టీబ్యాగర్ ప్రాఫిట్ బుకింగ్', '+40% Target 1 & Multibagger Profit Booking')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 font-mono">🟡</span>
              <span>{t('ట్రైలింగ్ స్టాప్ లాస్ అప్‌గ్రేడ్స్ (లాభాలు లాక్ చేయడం)', 'Trailing Stop-Loss floor elevations (85% gains locked)')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-mono">🚨</span>
              <span>{t('ఎమర్జెన్సీ కిల్-స్విచ్ & రిస్క్ ప్రొటెక్షన్ అలర్ట్స్', 'Emergency Kill-Switch & Portfolio Risk alerts')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-mono">🕒</span>
              <span>{t('15:10 IST ఇంట్రాడే స్క్వేర్-ఆఫ్ (నో తీటా డికే)', '15:10 IST EOD Square-off (Zero overnight decay)')}</span>
            </div>
          </div>

          {/* Automated Daily & Weekend Schedule Timeline */}
          <div className="bg-slate-950/70 border border-indigo-500/30 rounded-xl p-3.5 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowScheduleDetails(!showScheduleDetails)}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    <span>{t('📅 ఆటోమేటిక్ డైలీ టైమింగ్స్ & వీకెండ్ షెడ్యూల్', '📅 Automated Daily & Weekend Schedule')}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {scheduleData?.is_trading_day ? t('ట్రేడింగ్ డే', 'Trading Day') : t('వీకెండ్ సెలవు', 'Market Holiday')}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    {scheduleData?.next_scheduled_dispatch || t('నిర్ణీత సమయాల్లో ఆటోమేటిక్ వాట్సాప్ మెసేజ్‌లు & వాయిస్ నోట్స్', 'Scheduled WhatsApp briefings & audio notes at exact market hours')}
                  </span>
                </div>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-200">
                {showScheduleDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showScheduleDetails && (
              <div className="space-y-2 pt-2 border-t border-slate-800 animate-fadeIn text-xs">
                {/* Notice banner */}
                <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-200 flex items-center justify-between">
                  <span>
                    {t(
                      '🔔 ఏ ట్రేడ్స్ జరగకపోయినా, ఈ సమయాల్లో ఆటోమేటిక్ అప్‌డేట్ & వాయిస్ నోట్ తప్పకుండా వస్తుంది:',
                      '🔔 Even if no trades execute, automated status & audio briefing arrives at these set times:'
                    )}
                  </span>
                </div>

                {/* 5 Schedule Slots */}
                <div className="space-y-2">
                  {/* Slot 1: 09:00 AM Morning Briefing */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>09:00 AM IST</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {t('మార్కెట్ రోజులు (Mon-Fri)', 'Market Days')}
                        </span>
                      </div>
                      <div className="text-slate-200 font-semibold text-xs">
                        {t('🌅 మార్నింగ్ ప్రీ-మార్కెట్ బ్రీఫింగ్', 'Morning Pre-Market Briefing')}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t('నిఫ్టీ అవుట్‌లుక్, ₹5,000 క్యాపిటల్ రెడీనెస్, -20% SL & +40% టార్గెట్ చెక్', 'Nifty levels, ₹5k capital check, active guardrails verification')}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={testingSlot === 'MORNING_BRIEF' || !phone}
                      onClick={() => handleTestScheduleSlot('MORNING_BRIEF', 'Morning Pre-Market Briefing')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {testingSlot === 'MORNING_BRIEF' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      <span>{t('టెస్ట్', 'Test')}</span>
                    </button>
                  </div>

                  {/* Slot 2: 09:15 - 15:15 IST Live Trades */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>09:15 - 15:15 IST</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {t('లైవ్ మార్కెట్', 'Live Market')}
                        </span>
                      </div>
                      <div className="text-slate-200 font-semibold text-xs">
                        {t('⚡ తక్షణ లైవ్ ట్రేడ్ అలర్ట్స్ (Real-Time)', 'Instant Real-Time Trade Alerts')}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t('ప్రతి BUY, SELL, -20% స్టాప్ లాస్, +40% టార్గెట్, ట్రైలింగ్ SL హిట్ అయిన క్షణమే వస్తుంది', 'Instant WhatsApp push on every Buy, Sell, Stop-Loss, or Target')}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      ⚡ INSTANT
                    </span>
                  </div>

                  {/* Slot 3: 03:30 PM Market Close Wrap */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>03:30 PM IST</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {t('మార్కెట్ రోజులు (Mon-Fri)', 'Market Days')}
                        </span>
                      </div>
                      <div className="text-slate-200 font-semibold text-xs">
                        {t('🏁 మార్కెట్ ముగింపు & స్క్వేర్-ఆఫ్ ర్యాప్', 'Market Close & Square-Off Wrap')}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t('15:10 IST ఆటో స్క్వేర్-ఆఫ్ నిర్ధారణ, నేటి ట్రేడ్ల సారాంశం, జీరో ఓవర్‌నైట్ రిస్క్', 'Day closed, positions squared off, zero overnight gap risk')}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={testingSlot === 'MARKET_WRAP' || !phone}
                      onClick={() => handleTestScheduleSlot('MARKET_WRAP', 'Market Close & Square-Off Wrap')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {testingSlot === 'MARKET_WRAP' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      <span>{t('టెస్ట్', 'Test')}</span>
                    </button>
                  </div>

                  {/* Slot 4: 07:00 PM Evening EOD Digest */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>07:00 PM IST</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {t('మార్కెట్ రోజులు (Mon-Fri)', 'Market Days')}
                        </span>
                      </div>
                      <div className="text-slate-200 font-semibold text-xs">
                        {t('📊 ఈవెనింగ్ EOD పోర్ట్‌ఫోలియో డైజెస్ట్', 'Evening EOD Portfolio Digest')}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t('ఆప్షన్స్ + ఈక్విటీ పూర్తి P&L, వాల్ట్ బ్యాలెన్స్, 30-రోజుల ఛాలెంజ్ పురోగతి', 'Comprehensive portfolio P&L, safe vault status & next-day plan')}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={testingSlot === 'EVENING_DIGEST' || !phone}
                      onClick={() => handleTestScheduleSlot('EVENING_DIGEST', 'Evening EOD Portfolio Digest')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {testingSlot === 'EVENING_DIGEST' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      <span>{t('టెస్ట్', 'Test')}</span>
                    </button>
                  </div>

                  {/* Slot 5: 10:00 AM & 06:00 PM Weekend Briefings */}
                  <div className="p-2.5 rounded-lg bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-purple-300 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>10:00 AM & 06:00 PM IST</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {t('వీకెండ్స్ (Sat & Sun)', 'Weekends (Sat & Sun)')}
                        </span>
                      </div>
                      <div className="text-slate-200 font-semibold text-xs">
                        {t('🏖️ వీకెండ్ స్టేటస్ & ఈవెనింగ్ బ్రీఫింగ్', 'Weekend Standby & Evening Wrap')}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t('మార్కెట్ సెలవులో ఉన్నా ₹5,000 క్యాపిటల్ సేఫ్టీ ధృవీకరణ & సోమవారం మార్కెట్ కౌంట్‌డౌన్', 'Capital safety audit, system heartbeat, Monday market countdown')}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={testingSlot === 'WEEKEND_EVENING' || !phone}
                      onClick={() => handleTestScheduleSlot('WEEKEND_EVENING', 'Weekend Evening Wrap')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {testingSlot === 'WEEKEND_EVENING' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      <span>{t('టెస్ట్', 'Test')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleTestAlert}
              disabled={testing || !phone}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('పరీక్షిస్తోంది...', 'Testing...')}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('టెస్ట్ అలర్ట్ పంపండి', 'Test Instant Alert')}</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('సేవ్ అవుతోంది...', 'Saving...')}</span>
                </>
              ) : (
                <span>{t('సెట్టింగ్స్ సేవ్ చేయండి', 'Save Settings')}</span>
              )}
            </button>
          </div>
        </form>

        {/* Feedback & WhatsApp Link */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex flex-col gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>

            {lastWaLink && (
              <a
                href={lastWaLink}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all w-fit self-start"
              >
                <span>{t('వాట్సాప్ ఓపెన్ చేసి మెసేజ్ చూడండి', 'Open WhatsApp Message Now')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
