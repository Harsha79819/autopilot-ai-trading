import React from 'react';
import { VoiceState } from '../../types/voice';
import { Sparkles, Mic, Volume2, Moon } from 'lucide-react';

interface VoiceVisualizerOrbProps {
  state: VoiceState;
  wakeWordEnabled: boolean;
  onOrbClick?: () => void;
}

export const VoiceVisualizerOrb: React.FC<VoiceVisualizerOrbProps> = ({
  state,
  wakeWordEnabled,
  onOrbClick,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center py-6 select-none">
      {/* Outer Glow Halo & Pulse Waves */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
        {/* Animated Ripple 1 */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-700 pointer-events-none ${
            state === 'LISTENING'
              ? 'animate-ping opacity-25 bg-gradient-to-r from-cyan-500 to-blue-600 scale-125'
              : state === 'SPEAKING'
              ? 'animate-pulse opacity-30 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 scale-115'
              : state === 'STANDBY_WAKE'
              ? 'opacity-15 bg-amber-400 scale-105 animate-pulse'
              : 'opacity-10 bg-slate-500 scale-95'
          }`}
        />

        {/* Animated Ripple 2 */}
        <div
          className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full transition-all duration-500 pointer-events-none ${
            state === 'LISTENING'
              ? 'animate-pulse opacity-40 bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 blur-md'
              : state === 'SPEAKING'
              ? 'animate-ping opacity-35 bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 blur-md'
              : state === 'THINKING'
              ? 'animate-spin opacity-45 bg-gradient-to-r from-amber-400 via-cyan-400 to-indigo-500 blur-sm'
              : 'opacity-15 bg-slate-700 blur-sm'
          }`}
        />

        {/* Core Glowing Orb Button */}
        <button
          onClick={onOrbClick}
          className={`relative z-10 w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center transition-all duration-500 cursor-pointer shadow-2xl border ${
            state === 'LISTENING'
              ? 'bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-700 border-cyan-300/50 shadow-cyan-500/50 scale-105'
              : state === 'SPEAKING'
              ? 'bg-gradient-to-tr from-pink-600 via-violet-600 to-indigo-700 border-pink-300/50 shadow-purple-500/50 scale-105'
              : state === 'THINKING'
              ? 'bg-gradient-to-tr from-indigo-700 via-purple-700 to-cyan-700 border-violet-400/50 shadow-indigo-500/50 animate-pulse'
              : state === 'STANDBY_WAKE'
              ? 'bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border-amber-500/40 shadow-amber-500/20'
              : 'bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border-white/20 shadow-black/60'
          }`}
          title="Click to toggle speaking or listening"
        >
          {/* Inner Light Reflection */}
          <div className="absolute top-2 w-20 h-10 rounded-full bg-white/20 blur-sm pointer-events-none" />

          {/* Center Graphic */}
          {state === 'LISTENING' && (
            <div className="flex flex-col items-center gap-1.5 animate-fade-in text-white">
              <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-200 animate-bounce" />
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-4 bg-cyan-200 rounded-full animate-pulse" />
                <span className="w-1.5 h-6 bg-cyan-100 rounded-full animate-pulse delay-75" />
                <span className="w-1.5 h-8 bg-white rounded-full animate-pulse delay-150" />
                <span className="w-1.5 h-6 bg-cyan-100 rounded-full animate-pulse delay-75" />
                <span className="w-1.5 h-4 bg-cyan-200 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {state === 'SPEAKING' && (
            <div className="flex flex-col items-center gap-1.5 animate-fade-in text-white">
              <Volume2 className="w-8 h-8 sm:w-10 sm:h-10 text-pink-200 animate-pulse" />
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-7 bg-pink-300 rounded-full animate-bounce delay-100" />
                <span className="w-1.5 h-10 bg-violet-200 rounded-full animate-bounce delay-200" />
                <span className="w-1.5 h-5 bg-cyan-200 rounded-full animate-bounce delay-75" />
                <span className="w-1.5 h-9 bg-pink-200 rounded-full animate-bounce delay-300" />
                <span className="w-1.5 h-4 bg-violet-300 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          )}

          {state === 'THINKING' && (
            <div className="flex flex-col items-center gap-2 animate-fade-in text-cyan-200">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-cyan-300" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-cyan-100">
                Thinking...
              </span>
            </div>
          )}

          {state === 'STANDBY_WAKE' && (
            <div className="flex flex-col items-center gap-1 animate-fade-in text-amber-200">
              <Moon className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 animate-pulse" />
              <span className="text-[10px] font-semibold tracking-wide text-amber-200/90 text-center px-3">
                Say &ldquo;Hey Darling&rdquo;
              </span>
            </div>
          )}

          {state === 'IDLE' && (
            <div className="flex flex-col items-center gap-1 animate-fade-in text-slate-300">
              <Mic className="w-8 h-8 text-slate-400 group-hover:text-white" />
              <span className="text-[11px] font-medium text-slate-400">
                Tap to Speak
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Dynamic Status Pill */}
      <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-white/10 shadow-lg text-xs">
        <span
          className={`w-2 h-2 rounded-full ${
            state === 'LISTENING'
              ? 'bg-cyan-400 animate-ping'
              : state === 'SPEAKING'
              ? 'bg-pink-400 animate-pulse'
              : state === 'THINKING'
              ? 'bg-amber-400 animate-spin'
              : state === 'STANDBY_WAKE'
              ? 'bg-amber-300 animate-pulse'
              : 'bg-slate-500'
          }`}
        />
        <span className="font-semibold text-slate-200 tracking-wide">
          {state === 'LISTENING' && 'Listening to you (No rush, take your time)...'}
          {state === 'SPEAKING' && 'Speaking in Female Voice...'}
          {state === 'THINKING' && 'Analyzing financial data & market...'}
          {state === 'STANDBY_WAKE' && 'Hands-Free: Listening for "Hey Darling"...'}
          {state === 'IDLE' && 'Voice Copilot Ready'}
        </span>
      </div>
    </div>
  );
};
