import React from 'react';
import { Sparkles, Mic } from 'lucide-react';

interface FloatingChatButtonProps {
  onClick: () => void;
  onOpenVoice?: () => void;
  isOpen: boolean;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onClick, onOpenVoice, isOpen }) => {
  if (isOpen) return null;

  return (
    <div className="fixed right-4 sm:right-6 bottom-20 md:bottom-6 z-40 flex items-center gap-2">
      {/* Voice Mode Quick Launch Button ("Hey Darling") */}
      {onOpenVoice && (
        <button
          onClick={onOpenVoice}
          className="p-3 sm:p-3.5 rounded-full bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-2xl shadow-purple-500/40 border border-pink-400/30 transition-all transform hover:scale-110 active:scale-95 cursor-pointer relative group"
          title="Open Voice Mode (Say 'Hey Darling')"
        >
          <Mic className="w-5 h-5 text-white animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-400 rounded-full border-2 border-slate-900 animate-ping" />
          <span className="absolute -top-8 right-0 bg-slate-900 text-pink-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg border border-pink-500/30 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Hey Darling (Voice)
          </span>
        </button>
      )}

      {/* Main AI Copilot Chat Button */}
      <button
        onClick={onClick}
        className="flex items-center gap-2.5 px-4 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm shadow-2xl shadow-indigo-500/40 border border-white/20 transition-all transform hover:scale-105 active:scale-95 cursor-pointer group"
        title="Open AutoPilot AI Copilot"
      >
        <div className="relative">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
        </div>
        <span className="tracking-wide">AI Copilot</span>
      </button>
    </div>
  );
};

