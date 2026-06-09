import React from 'react';
import clsx from 'clsx';
import { VibeCategory } from '../../types';

interface BadgeProps {
  category: VibeCategory | string;
  className?: string;
}

const colorMap: Record<string, string> = {
  [VibeCategory.PARTY]: 'bg-red-500/20 text-red-300 border-red-500/50',
  [VibeCategory.CHILL]: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
  [VibeCategory.STUDY]: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
  [VibeCategory.OUTDOOR]: 'bg-green-500/20 text-green-300 border-green-500/50',
  [VibeCategory.NETWORKING]: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
};

export const Badge: React.FC<BadgeProps> = ({ category, className }) => {
  const styles = colorMap[category] || 'bg-gray-500/20 text-gray-300 border-gray-500/50';
  
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium border", styles, className)}>
      {category}
    </span>
  );
};
