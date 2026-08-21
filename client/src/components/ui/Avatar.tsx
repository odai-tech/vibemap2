import { clsx } from 'clsx';
import { initials } from '@/lib/format';

/** Deterministic gradient avatars — beautiful, instant, and zero external image services. */
const GRADIENTS = [
  ['#FFB45C', '#F5484D'],
  ['#22D3EE', '#2563EB'],
  ['#FF7A3D', '#D946EF'],
  ['#3DDC97', '#0EA5E9'],
  ['#FACC15', '#F97316'],
  ['#F472B6', '#FB7185'],
  ['#2DD4BF', '#84CC16'],
  ['#60A5FA', '#34D399'],
] as const;

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h);
}

const SIZES = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-20 h-20 text-xl',
} as const;

export function Avatar({
  id,
  name,
  size = 'md',
  ring = false,
  className,
}: {
  id: string;
  name: string;
  size?: keyof typeof SIZES;
  ring?: boolean;
  className?: string;
}) {
  const [from, to] = GRADIENTS[hashString(id) % GRADIENTS.length];
  return (
    <div
      aria-hidden
      className={clsx(
        'rounded-full flex items-center justify-center font-display font-bold text-white shrink-0 select-none',
        SIZES[size],
        ring && 'ring-2 ring-ink',
        className,
      )}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {initials(name)}
    </div>
  );
}

export function AvatarStack({
  users,
  total,
  size = 'sm',
}: {
  users: Array<{ id: string; name: string }>;
  total?: number;
  size?: 'xs' | 'sm';
}) {
  const extra = (total ?? users.length) - users.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {users.slice(0, 4).map((u) => (
          <Avatar key={u.id} id={u.id} name={u.name} size={size} ring />
        ))}
      </div>
      {extra > 0 && <span className="ml-1.5 text-xs text-mist font-medium">+{extra}</span>}
    </div>
  );
}
