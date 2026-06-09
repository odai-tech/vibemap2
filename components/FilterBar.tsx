import React from 'react';
import { VibeCategory } from '../types';

interface FilterBarProps {
  activeFilter: VibeCategory | 'ALL';
  onFilterChange: (filter: VibeCategory | 'ALL') => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ activeFilter, onFilterChange }) => {
  const filters = ['ALL', ...Object.values(VibeCategory)];

  return (
    <div className="absolute top-16 md:top-4 left-0 right-0 z-[400] flex justify-center pointer-events-none">
      <div className="flex gap-2 overflow-x-auto px-4 py-2 pointer-events-auto max-w-full md:max-w-2xl scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f as any)}
            className={`
              flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-lg transition-all transform hover:scale-105
              ${activeFilter === f 
                ? 'bg-white text-black scale-105' 
                : 'bg-black/40 text-white border border-white/10 hover:bg-black/60'}
            `}
          >
            {f === 'ALL' ? '🔥 All Vibes' : f}
          </button>
        ))}
      </div>
    </div>
  );
};
