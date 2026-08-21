import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { CATEGORY_META } from '@shared/vibes';
import type { VibeCategory } from '@shared/types';

/* ---------------- Buttons ---------------- */

export function GradientButton({
  children,
  onClick,
  disabled,
  loading,
  className,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'relative gradient-brand text-white font-display font-bold rounded-2xl px-5 py-3.5 cursor-pointer',
        'shadow-[0_8px_30px_-6px_rgba(255,106,60,0.5)] transition-all duration-200',
        'hover:shadow-[0_10px_36px_-4px_rgba(255,106,60,0.65)] hover:brightness-110 active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2',
        className,
      )}
    >
      <span className={clsx('relative z-10 flex items-center justify-center gap-2', loading && 'opacity-0')}>{children}</span>
      {loading && (
        <span className="absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="animate-spin" size={20} />
        </span>
      )}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'glass rounded-2xl px-4 py-2.5 text-sm font-semibold text-frost cursor-pointer',
        'transition-colors duration-200 hover:border-white/30 hover:text-white',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- Chips ---------------- */

export function CategoryChip({ category, small }: { category: VibeCategory; small?: boolean }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      )}
      style={{ background: meta.soft, color: meta.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function ReasonChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent/15 text-accent2 px-2 py-0.5 text-[10px] font-semibold">
      {children}
    </span>
  );
}

export function Verified({ size = 14 }: { size?: number }) {
  return <BadgeCheck size={size} className="text-accent shrink-0" aria-label="Verified" />;
}

/* ---------------- Match ring ---------------- */

export function MatchRing({ value, size = 46 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#matchGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <defs>
          <linearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFC24B" />
            <stop offset="100%" stopColor="#FF6A3C" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-display font-bold text-frost">
        {value}
      </span>
    </div>
  );
}

/* ---------------- Empty & skeleton states ---------------- */

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6 gap-3">
      <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-mist">{icon}</div>
      <p className="font-display font-bold text-frost">{title}</p>
      <p className="text-sm text-mist max-w-[240px] leading-relaxed">{hint}</p>
    </div>
  );
}

export function RowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 px-1" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass rounded-2xl p-3.5 flex items-center gap-3">
          <div className="skeleton w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-2/3 rounded-full" />
            <div className="skeleton h-3 w-1/3 rounded-full" />
          </div>
          <div className="skeleton w-10 h-10 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Switch ---------------- */

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer shrink-0',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        checked ? 'gradient-brand' : 'bg-elev border border-line',
      )}
    >
      <span
        className={clsx(
          'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}
