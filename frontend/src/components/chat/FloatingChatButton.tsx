import React from 'react';
import { Sparkles, Bot } from 'lucide-react';

interface FloatingChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      className="fixed right-4 sm:right-6 bottom-20 md:bottom-6 z-40 flex items-center gap-2.5 px-4 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm shadow-2xl shadow-indigo-500/40 border border-white/20 transition-all transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md group"
      title="Open AutoPilot AI Copilot (ChatGPT/Claude style assistant)"
    >
      <div className="relative">
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
      </div>
      <span className="tracking-wide">AI Copilot (చాట్ బాట్)</span>
    </button>
  );
};
