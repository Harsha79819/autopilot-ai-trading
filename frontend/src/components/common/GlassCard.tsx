import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'violet' | 'blue' | 'emerald' | 'none';
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = 'none',
  interactive = false,
}) => {
  const glowStyles = {
    none: '',
    cyan: 'shadow-glass-glow-cyan border-cyan-500/20',
    violet: 'shadow-glass-glow-violet border-violet-500/20',
    blue: 'shadow-glass-glow-blue border-blue-500/20',
    emerald: 'shadow-glass-glow-emerald border-emerald-500/20',
  }[glow];

  return (
    <div
      className={`glass-panel rounded-2xl p-5 relative overflow-hidden ${
        interactive ? 'glass-panel-interactive cursor-pointer' : ''
      } ${glowStyles} ${className}`}
    >
      {/* Subtle top glare highlight inspired by Apple OS */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
