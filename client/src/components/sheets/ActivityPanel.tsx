import { useEffect } from 'react';
import { clsx } from 'clsx';
import { BellOff, Hand, HeartHandshake, Sparkles, UserPlus, type LucideIcon } from 'lucide-react';
import type { NotificationKind } from '@shared/types';
import { ago } from '@/lib/format';
import { useStore } from '@/state/store';
import { markAllRead, selectPin, setTab } from '@/state/actions';
import { Sheet } from '@/components/ui/Sheet';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, RowSkeleton } from '@/components/ui/bits';

const KIND_META: Record<NotificationKind, { icon: LucideIcon; color: string; bg: string }> = {
  wave: { icon: Hand, color: '#FFB45C', bg: 'rgba(255,180,92,0.15)' },
  join: { icon: UserPlus, color: '#34D399', bg: 'rgba(52,211,153,0.14)' },
  accept: { icon: HeartHandshake, color: '#F472B6', bg: 'rgba(244,114,182,0.14)' },
  system: { icon: Sparkles, color: '#22D3EE', bg: 'rgba(34,211,238,0.12)' },
};

export function ActivityPanel() {
  const open = useStore((s) => s.tab === 'activity');
  const notifications = useStore((s) => s.notifications);
  const loaded = useStore((s) => s.notifLoaded);
  const unread = useStore((s) => s.unread);

  useEffect(() => {
    if (!open || unread === 0) return;
    const timer = setTimeout(() => void markAllRead(), 1200);
    return () => clearTimeout(timer);
  }, [open, unread]);

  return (
    <Sheet open={open} onClose={() => setTab('map')} label="Activity" height="tall">
      <div className="px-5 pb-6">
        <h2 className="font-display font-bold text-2xl mb-1">Activity</h2>
        <p className="text-sm text-mist mb-4">Waves, joins, and everything happening around you.</p>

        {!loaded ? (
          <RowSkeleton count={4} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<BellOff size={24} />}
            title="All quiet for now"
            hint="Join a vibe or wave at someone — activity finds the active."
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const meta = KIND_META[n.kind] ?? KIND_META.system;
              const Icon = meta.icon;
              const clickable = !!n.pin;
              return (
                <button
                  key={n.id}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (!n.pin) return;
                    setTab('map');
                    selectPin(n.pin.id);
                  }}
                  className={clsx(
                    'w-full text-left rounded-2xl p-3 flex items-start gap-3 transition-colors duration-200 border',
                    !n.read ? 'bg-accent/8 border-accent/25' : 'glass',
                    clickable ? 'cursor-pointer hover:border-accent/40' : 'cursor-default',
                  )}
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-frost/95 leading-snug">{n.body}</span>
                    <span className="block text-[10px] text-faint mt-0.5">{ago(n.createdAt)} ago</span>
                  </span>
                  {n.actor && <Avatar id={n.actor.id} name={n.actor.name} size="sm" />}
                  {!n.read && <span className="w-2 h-2 rounded-full gradient-brand mt-1.5 shrink-0" aria-label="Unread" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}
