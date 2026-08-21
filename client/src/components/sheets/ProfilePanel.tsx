import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Compass,
  Crown,
  Flame,
  HeartHandshake,
  LogOut,
  PartyPopper,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { INTEREST_POOL, type UserStats } from '@shared/types';
import { api } from '@/lib/api';
import { useStore, setState, toast } from '@/state/store';
import { logout } from '@/state/actions';
import { Sheet } from '@/components/ui/Sheet';
import { Avatar } from '@/components/ui/Avatar';
import { GhostButton, GradientButton, Verified } from '@/components/ui/bits';

interface Badge {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  earned: (s: UserStats) => boolean;
}

const BADGES: Badge[] = [
  { id: 'first', label: 'First Vibe', hint: 'Join your first pin', icon: Sparkles, earned: (s) => s.joined >= 1 },
  { id: 'butterfly', label: 'Social Butterfly', hint: 'Join 5 vibes', icon: PartyPopper, earned: (s) => s.joined >= 5 },
  { id: 'host', label: 'Host', hint: 'Host your first vibe', icon: Crown, earned: (s) => s.hosted >= 1 },
  { id: 'magnet', label: 'Crowd Magnet', hint: 'Host 3 vibes', icon: Flame, earned: (s) => s.hosted >= 3 },
  { id: 'connector', label: 'Connector', hint: 'Make 3 friends', icon: HeartHandshake, earned: (s) => s.friends >= 3 },
  { id: 'explorer', label: 'Scene Explorer', hint: 'Try 4 categories', icon: Compass, earned: (s) => s.categories >= 4 },
];

export function ProfilePanel() {
  const open = useStore((s) => s.profileOpen);
  const me = useStore((s) => s.me);
  const [interests, setInterests] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  if (!me) return null;
  const draft = interests ?? me.interests;
  const dirty = interests !== null && JSON.stringify(interests) !== JSON.stringify(me.interests);

  const toggleInterest = (i: string) => {
    setInterests((cur) => {
      const base = cur ?? me.interests;
      return base.includes(i) ? base.filter((x) => x !== i) : base.length < 12 ? [...base, i] : base;
    });
  };

  const save = async () => {
    if (!interests || interests.length < 3) {
      toast('Keep at least 3 interests', 'error');
      return;
    }
    setSaving(true);
    try {
      const { user } = await api.updateMe({ interests });
      setState({ me: user });
      setInterests(null);
      toast('Profile updated — recommendations will follow', 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={() => setState({ profileOpen: false })} label="Your profile" height="tall">
      <div className="px-5 pb-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center pt-2 pb-5">
          <Avatar id={me.id} name={me.name} size="xl" className="shadow-[0_0_36px_rgba(255,106,60,0.3)]" />
          <h2 className="mt-3 font-display font-bold text-xl flex items-center gap-1.5">
            {me.name} {me.verified && <Verified size={17} />}
          </h2>
          <p className="text-sm text-mist">@{me.handle}</p>
          {me.bio && <p className="mt-2 text-[13px] text-mist max-w-[300px] leading-relaxed">{me.bio}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <StatCard value={me.stats.joined} label="Vibes joined" />
          <StatCard value={me.stats.hosted} label="Hosted" />
          <StatCard value={me.stats.friends} label="Friends" />
        </div>

        {/* Badges */}
        <SectionLabel>Badges</SectionLabel>
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {BADGES.map((b) => {
            const earned = b.earned(me.stats);
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                title={b.hint}
                className={clsx(
                  'rounded-2xl p-3 flex flex-col items-center text-center gap-1.5 border transition-colors',
                  earned ? 'bg-accent/10 border-accent/30' : 'glass opacity-45',
                )}
              >
                <Icon size={19} className={earned ? 'text-accent2' : 'text-faint'} />
                <p className="text-[10px] font-bold leading-tight">{b.label}</p>
                {!earned && <p className="text-[9px] text-faint leading-tight">{b.hint}</p>}
              </div>
            );
          })}
        </div>

        {/* Interests */}
        <SectionLabel>
          Your interests <span className="normal-case tracking-normal text-faint">(drives your matches)</span>
        </SectionLabel>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {INTEREST_POOL.map((i) => {
            const active = draft.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleInterest(i)}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-200 border',
                  active ? 'bg-accent/20 border-accent/50 text-accent2' : 'glass text-mist hover:text-frost',
                )}
              >
                {i}
              </button>
            );
          })}
        </div>
        {dirty && (
          <GradientButton onClick={() => void save()} loading={saving} className="w-full mb-5">
            Save interests
          </GradientButton>
        )}

        <GhostButton onClick={() => void logout()} className="w-full mt-2">
          <span className="flex items-center justify-center gap-2 text-rose-300/90">
            <LogOut size={15} /> Sign out
          </span>
        </GhostButton>
      </div>
    </Sheet>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="glass rounded-2xl p-3.5 text-center">
      <p className="font-display font-bold text-2xl text-gradient">{value}</p>
      <p className="text-[10px] text-mist font-semibold mt-0.5">{label}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-faint mb-2">{children}</p>;
}
