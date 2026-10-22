import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-white/[0.02] border border-white/[0.04]">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-slate-200 mb-1">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="text-xs px-3.5 py-1.5 rounded-lg bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25 border border-accent-blue/30 transition-all font-medium"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
