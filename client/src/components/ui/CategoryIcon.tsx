import {
  Armchair,
  Briefcase,
  Dumbbell,
  Laptop,
  Mountain,
  Music,
  PartyPopper,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { VibeCategory } from '@shared/types';

export const CATEGORY_ICONS: Record<VibeCategory, LucideIcon> = {
  CHILL: Armchair,
  PARTY: PartyPopper,
  STUDY: Laptop,
  OUTDOOR: Mountain,
  NETWORKING: Briefcase,
  FOOD: UtensilsCrossed,
  MUSIC: Music,
  SPORT: Dumbbell,
};

export function CategoryIcon({
  category,
  size = 16,
  className,
}: {
  category: VibeCategory;
  size?: number;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon size={size} className={className} aria-hidden />;
}
