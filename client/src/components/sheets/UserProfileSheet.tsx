import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Check, Hand, MessageCircle, Users, X } from 'lucide-react';
import type { FriendState, PinSummary, UserProfile } from '@shared/types';
import { api } from '@/lib/api';
import { openMessages } from '@/lib/dm';
import { ago, isOnline, timeUntil } from '@/lib/format';
import { useStore, toast } from '@/state/store';
import { closeProfile, openPinFromList } from '@/state/actions';
import { Sheet } from '@/components/ui/Sheet';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryChip, GhostButton, GradientButton, RowSkeleton, Verified } from '@/components/ui/bits';

export function UserProfileSheet() {
  const viewId = useStore((s) => s.viewProfileId);
  const me = useStore((s) => s.me);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!viewId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    void api
      .profile(viewId)
      .then(({ profile: p }) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) {
          toast('Could not load this profile', 'error');
          closeProfile();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [viewId]);

  const isMe = me !== null && viewId === me.id;

  return (
    <Sheet open={!!viewId} onClose={closeProfile} label="Profile" height="tall">
      <button
        type="button"
        onClick={closeProfile}
        aria-label="Close profile"
        className="absolute top-4 right-5 z-10 w-7 h-7 rounded-full glass flex items-center justify-center text-mist hover:text-frost cursor-pointer transition-colors"
      >
        <X size={14} />
      </button>

      {!profile ? (
        <div className="px-5 pt-8">
          <RowSkeleton count={3} />
        </div>
      ) : (
        <div className="px-5 pb-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center pt-2 pb-4">
            <div className="relative">
              <Avatar id={profile.user.id} name={profile.user.name} size="xl" />
              {isOnline(profile.user.lastSeen) && (
                <span
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-panel"
                  aria-label="Online"
                />
              )}
            </div>
            <h2 className="mt-3 font-display font-bold text-xl flex items-center gap-1.5">
              {profile.user.name} {profile.user.verified && <Verified size={17} />}
            </h2>
            <p className="text-sm text-mist">
              @{profile.user.handle} · {isOnline(profile.user.lastSeen) ? 'online now' : `seen ${ago(profile.user.lastSeen)} ago`}
            </p>
            {profile.user.statusLine && (
              <p className="mt-1.5 text-[13px] text-accent2 italic">“{profile.user.statusLine}”</p>
            )}
            {profile.user.bio && (
              <p className="mt-2 text-[13px] text-mist max-w-[300px] leading-relaxed">{profile.user.bio}</p>
            )}
            {profile.context && <p className="mt-2 text-[11px] text-faint">{profile.context}</p>}
          </div>

          {/* Actions */}
          {!isMe && (
            <div className="flex gap-2 mb-5">
              <GradientButton
                onClick={() => {
                  closeProfile();
                  openMessages(profile.user);
                }}
                className="flex-1 !py-3"
              >
                <MessageCircle size={16} /> Message
              </GradientButton>
              <WaveButton
                userId={profile.user.id}
                name={profile.user.name}
                state={profile.friendState}
                onChange={(state) => setProfile((p) => (p ? { ...p, friendState: state } : p))}
              />
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <Stat value={profile.stats.hosted} label="Hosted" />
            <Stat value={profile.stats.joined} label="Vibes joined" />
            <Stat value={profile.stats.friends} label="Friends" />
          </div>

          {/* Interests */}
          {profile.user.interests.length > 0 && (
            <>
              <SectionLabel>
                Interests
                {profile.sharedInterests.length > 0 && (
                  <span className="normal-case tracking-normal text-faint"> ({profile.sharedInterests.length} shared with you)</span>
                )}
              </SectionLabel>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {profile.user.interests.map((i) => {
                  const shared = profile.sharedInterests.some((s) => s.toLowerCase() === i.toLowerCase());
                  return (
                    <span
                      key={i}
                      className={clsx(
                        'rounded-full px-3 py-1.5 text-xs font-semibold border',
                        shared ? 'bg-accent/20 border-accent/50 text-accent2' : 'glass text-mist',
                      )}
                    >
                      {i}
                    </span>
                  );
                })}
              </div>
            </>
          )}

          {/* Hosting */}
          {profile.pins.length > 0 && (
            <>
              <SectionLabel>Hosting ({profile.pins.length})</SectionLabel>
              <div className="space-y-2">
                {profile.pins.map((pin) => (
                  <HostedPinRow key={pin.id} pin={pin} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

function WaveButton({
  userId,
  name,
  state,
  onChange,
}: {
  userId: string;
  name: string;
  state: FriendState;
  onChange: (state: FriendState) => void;
}) {
  const wave = async () => {
    try {
      const { state: next } = await api.wave(userId);
      onChange(next);
      toast(next === 'friends' ? `You and ${name.split(' ')[0]} are connected` : `Waved at ${name.split(' ')[0]}`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not wave', 'error');
    }
  };

  if (state === 'friends') {
    return (
      <GhostButton disabled className="!px-4">
        <span className="flex items-center gap-1.5 text-emerald-300">
          <Check size={15} /> Friends
        </span>
      </GhostButton>
    );
  }
  return (
    <GhostButton onClick={() => void wave()} disabled={state === 'outgoing'} className="!px-4">
      <span className="flex items-center gap-1.5">
        <Hand size={15} /> {state === 'outgoing' ? 'Waved' : state === 'incoming' ? 'Wave back' : 'Wave'}
      </span>
    </GhostButton>
  );
}

function HostedPinRow({ pin }: { pin: PinSummary }) {
  return (
    <button
      type="button"
      onClick={() => {
        closeProfile();
        openPinFromList(pin);
      }}
      className="w-full glass rounded-2xl p-3 flex items-center gap-3 cursor-pointer text-left transition-colors hover:border-white/25"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{pin.title}</p>
        <p className="text-[11px] text-mist mt-0.5 flex items-center gap-2">
          {timeUntil(pin.startsAt, pin.live)}
          <span className="flex items-center gap-1">
            <Users size={11} /> {pin.attendees}
          </span>
        </p>
      </div>
      <CategoryChip category={pin.category} small />
    </button>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
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
