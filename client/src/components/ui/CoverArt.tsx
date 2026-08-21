import { clsx } from 'clsx';
import { CATEGORY_META } from '@shared/vibes';
import type { VibeCategory } from '@shared/types';
import { CategoryIcon } from './CategoryIcon';

/** Generated cover art: layered gradients + ghosted icon. No image CDNs, always on-brand. */
const POSITIONS = [
  ['15% 20%', '85% 85%'],
  ['80% 15%', '20% 90%'],
  ['50% 0%', '50% 100%'],
  ['10% 80%', '90% 20%'],
  ['90% 60%', '15% 25%'],
  ['30% 100%', '75% 10%'],
  ['0% 40%', '100% 70%'],
  ['65% 90%', '25% 15%'],
] as const;

export function CoverArt({
  category,
  cover,
  className,
  iconSize = 56,
}: {
  category: VibeCategory;
  cover: number;
  className?: string;
  iconSize?: number;
}) {
  const meta = CATEGORY_META[category];
  const [p1, p2] = POSITIONS[Math.abs(cover) % POSITIONS.length];
  return (
    <div
      className={clsx('relative overflow-hidden', className)}
      style={{
        background: [
          `radial-gradient(circle at ${p1}, ${meta.color}55, transparent 55%)`,
          `radial-gradient(circle at ${p2}, #FF7A3D33, transparent 60%)`,
          'linear-gradient(160deg, #181D26, #090B10)',
        ].join(', '),
      }}
      aria-hidden
    >
      <div
        className="absolute -right-2 -bottom-3 opacity-[0.16]"
        style={{ color: meta.color, transform: `rotate(${(cover % 3) * 6 - 6}deg)` }}
      >
        <CategoryIcon category={category} size={iconSize} />
      </div>
    </div>
  );
}
