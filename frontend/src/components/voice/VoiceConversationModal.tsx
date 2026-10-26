import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Globe,
  Sparkles,
  Square,
  Moon,
  MessageSquare
} from 'lucide-react';
import { VoiceState, VoiceConfig } from '../../types/voice';
import { VoiceEngine } from '../../services/voiceEngine';
import { VoiceVisualizerOrb } from './VoiceVisualizerOrb';
import { api } from '../../services/api';

interface VoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTextChat?: () => void;
}

export const VoiceConversationModal: React.FC<VoiceConversationModalProps> = ({
  isOpen,
  onClose,
  onOpenTextChat,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>(
    'హలో! నేను మీ AutoPilot వాయిస్ అసిస్టెంట్‌ని. నన్ను ఏమైనా అడగండి లేదా "Hey Darling" అని పిలవండి!'
  );
  const [wakeWordEnabled, setWakeWordEnabled] = useState<boolean>(true);
  const [language, setLanguage] = useState<'te-IN' | 'en-IN'>('te-IN');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const voiceEngineRef = useRef<VoiceEngine | null>(null);

  // Initialize Voice Engine
  useEffect(() => {
    if (!isOpen) {
      if (voiceEngineRef.current) {
        voiceEngineRef.current.stopListening();
        voiceEngineRef.current.stopSpeaking();
      }
      return;
    }

    const engine = new VoiceEngine(
      {
        onStateChange: (state) => {
          setVoiceState(state);
          if (state === 'LISTENING') {
            setErrorMessage(null);
          }
        },
        onTranscriptUpdate: (text, isFinal) => {
          setUserTranscript(text);
        },
        onWakeWordDetected: () => {
          setUserTranscript('Hey Darling! 👋');
        },
        onCompleteUtterance: async (fullText) => {
          await handleProcessVoiceQuery(fullText);
        },
        onError: (err) => {
          setErrorMessage(err);
        },
      },
      {
        wakeWordEnabled,
        language,
        silenceDelayMs: 1800,
        pitch: 1.15,
        rate: 1.05,
      }
    );

    voiceEngineRef.current = engine;

    // Start in standby wake mode or active listening
    if (wakeWordEnabled) {
      engine.startListening(true);
    } else {
      engine.startListening(false);
    }

    return () => {
      engine.stopListening();
      engine.stopSpeaking();
    };
  }, [isOpen, wakeWordEnabled, language]);

  // Process voice query with backend AI Copilot
  const handleProcessVoiceQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    try {
      setVoiceState('THINKING');
      const res = await api.chatWithAi([{ role: 'user', content: queryText }]);

      const cleanReply = res.reply || 'క్షమించండి, సమాధానం రాలేదు.';
      setAiResponse(cleanReply);

      // Speak reply in natural female voice
      if (voiceEngineRef.current && !isMuted) {
        voiceEngineRef.current.speak(cleanReply);
      } else {
        setVoiceState('IDLE');
      }
    } catch (err: any) {
      const errTxt = 'క్షమించండి, సర్వర్ స్పందనలో సమస్య వచ్చింది. దయచేసి మళ్లీ మాట్లాడండి.';
      setAiResponse(errTxt);
      if (voiceEngineRef.current && !isMuted) {
        voiceEngineRef.current.speak(errTxt);
      } else {
        setVoiceState('IDLE');
      }
    }
  };

  const handleToggleListening = () => {
    if (!voiceEngineRef.current) return;

    if (voiceState === 'SPEAKING') {
      voiceEngineRef.current.stopSpeaking();
      voiceEngineRef.current.startListening(false);
    } else if (voiceState === 'LISTENING' || voiceState === 'STANDBY_WAKE') {
      voiceEngineRef.current.stopListening();
    } else {
      voiceEngineRef.current.startListening(false);
    }
  };

  const handleToggleWakeWord = () => {
    const next = !wakeWordEnabled;
    setWakeWordEnabled(next);
    if (voiceEngineRef.current) {
      voiceEngineRef.current.updateConfig({ wakeWordEnabled: next });
      voiceEngineRef.current.startListening(next);
    }
  };

  const handleToggleLanguage = () => {
    const nextLang = language === 'te-IN' ? 'en-IN' : 'te-IN';
    setLanguage(nextLang);
    if (voiceEngineRef.current) {
      voiceEngineRef.current.updateConfig({ language: nextLang });
    }
  };

  const handleStopSpeaking = () => {
    if (voiceEngineRef.current) {
      voiceEngineRef.current.stopSpeaking();
      setVoiceState('IDLE');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass max-w-xl w-full flex flex-col relative border border-white/20 shadow-2xl rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-950"
      >
        {/* Top Header Strip */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                AutoPilot Voice Mode
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Female Voice AI
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Natural conversational speech with smart silence turn-taking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <button
              onClick={handleToggleLanguage}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                language === 'te-IN'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/5 text-slate-300 border-white/10'
              }`}
              title="Toggle Telugu / English language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'te-IN' ? 'తెలుగు' : 'English'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wake Word Banner Pill */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-slate-300">
              Wake Word: <strong className="text-amber-300">&ldquo;Hey Darling&rdquo;</strong>
            </span>
          </div>
          <button
            onClick={handleToggleWakeWord}
            className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              wakeWordEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
          >
            {wakeWordEnabled ? 'Enabled (ON)' : 'Disabled (OFF)'}
          </button>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Center Animated Voice Orb */}
        <div className="py-2">
          <VoiceVisualizerOrb
            state={voiceState}
            wakeWordEnabled={wakeWordEnabled}
            onOrbClick={handleToggleListening}
          />
        </div>

        {/* Interactive Speech Bubbles Display */}
        <div className="px-5 py-3 space-y-3 max-h-48 overflow-y-auto">
          {/* User Spoken Transcript */}
          {userTranscript && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-cyan-400 font-semibold mb-1 flex items-center gap-1">
                <Mic className="w-3 h-3" /> మీరు మాట్లాడినది (User Speech):
              </span>
              <div className="p-3 rounded-2xl rounded-tr-none bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm shadow-md max-w-[90%] leading-relaxed">
                {userTranscript}
              </div>
            </div>
          )}

          {/* AI Spoken Response */}
          {aiResponse && (
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-pink-400 font-semibold mb-1 flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> AutoPilot Female AI:
              </span>
              <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-900/90 text-slate-200 border border-white/10 text-xs sm:text-sm shadow-lg max-w-[92%] leading-relaxed max-h-28 overflow-y-auto">
                {aiResponse}
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-5 py-2.5 flex items-center gap-2 overflow-x-auto text-[11px] bg-slate-950/40 scrollbar-none">
          <button
            onClick={() => handleProcessVoiceQuery("ఈరోజు ట్రేడింగ్ సమ్మరీ చెప్పు (Today's summary)")}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 shrink-0 transition-all cursor-pointer whitespace-nowrap"
          >
            📊 ఈరోజు సమ్మరీ
          </button>
          <button
            onClick={() => handleProcessVoiceQuery("₹5,000 SIP ప్లాన్ 10 సంవత్సరాలకు లెక్కించు")}
            className="px-2.5 py-1 rounded-full bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 shrink-0 transition-all cursor-pointer whitespace-nowrap"
          >
            💡 ₹5,000 SIP ప్లాన్
          </button>
          <button
            onClick={() => handleProcessVoiceQuery("మార్కెట్ -10% పడిపోతే నా నష్టం ఎంత?")}
            className="px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 shrink-0 transition-all cursor-pointer whitespace-nowrap"
          >
            📉 మార్కెట్ క్రాష్ టెస్ట్
          </button>
          <button
            onClick={() => handleProcessVoiceQuery("నా క్యాష్ మరియు పోర్ట్‌ఫోలియో చెప్పు")}
            className="px-2.5 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 shrink-0 transition-all cursor-pointer whitespace-nowrap"
          >
            💰 క్యాష్ బ్యాలెన్స్
          </button>
        </div>

        {/* Bottom Conversation Controls Bar */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Mute/Unmute audio button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
              title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Switch to text chat */}
            {onOpenTextChat && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTextChat();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all cursor-pointer"
                title="Switch to Text Chat Modal"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">టెక్స్ట్ చాట్</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Stop speaking button (if AI is currently speaking) */}
            {voiceState === 'SPEAKING' && (
              <button
                onClick={handleStopSpeaking}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 transition-all cursor-pointer animate-pulse"
                title="Stop AI speech"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>ఆపు (Stop)</span>
              </button>
            )}

            {/* Tap to Speak / Mute Mic */}
            <button
              onClick={handleToggleListening}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xl transition-all cursor-pointer ${
                voiceState === 'LISTENING'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 ring-2 ring-cyan-400'
                  : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white shadow-indigo-500/25'
              }`}
            >
              {voiceState === 'LISTENING' ? (
                <>
                  <MicOff className="w-4 h-4 animate-spin" />
                  <span>వినడం ఆపు</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>మాట్లాడండి (Speak)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
