import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-white/[0.03] border border-white/[0.05] rounded-xl w-full" />
      ))}
    </div>
  );
};
