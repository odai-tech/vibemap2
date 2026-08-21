import { useEffect, useState } from 'react';
import { Check, Hand, UsersRound, X } from 'lucide-react';
import type { PersonCard } from '@shared/types';
import { api } from '@/lib/api';
import { isOnline } from '@/lib/format';
import { useStore, setState } from '@/state/store';
import { loadPeople, openProfile, respondToWave, setTab, wave } from '@/state/actions';
import { Sheet } from '@/components/ui/Sheet';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, GhostButton, RowSkeleton, Switch, Verified } from '@/components/ui/bits';

export function PeoplePanel() {
  const open = useStore((s) => s.tab === 'people');
  const me = useStore((s) => s.me);
  const { cards, loading } = useStore((s) => s.people);
  const friends = useStore((s) => s.friends);
  const [statusDraft, setStatusDraft] = useState(me?.statusLine ?? '');

  useEffect(() => {
    setStatusDraft(me?.statusLine ?? '');
  }, [me?.statusLine]);

  const saveStatus = async () => {
    if (!me || statusDraft === me.statusLine) return;
    const { user } = await api.updateMe({ statusLine: statusDraft });
    setState({ me: user });
  };

  const toggleBeacon = async (value: boolean) => {
    if (!me) return;
    setState({ me: { ...me, openToMeet: value } });
    const { user } = await api.updateMe({ openToMeet: value });
    setState({ me: user });
    void loadPeople(true);
  };

  return (
    <Sheet open={open} onClose={() => setTab('map')} label="People" height="tall">
      <div className="px-5 pb-6">
        <h2 className="font-display font-bold text-2xl mb-1">People</h2>
        <p className="text-sm text-mist mb-4">Wave at someone — friendships here start with one tap.</p>

        {/* Beacon */}
        {me && (
          <div className="rounded-2xl p-[1px] gradient-brand mb-5">
            <div className="bg-panel rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display font-bold text-sm">Open to meet</p>
                  <p className="text-[11px] text-mist mt-0.5">Shown to people nearby with shared interests.</p>
                </div>
                <Switch checked={me.openToMeet} onChange={(v) => void toggleBeacon(v)} label="Open to meet" />
              </div>
              {me.openToMeet && (
                <input
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  onBlur={() => void saveStatus()}
                  maxLength={80}
                  placeholder="What are you up for? e.g. coffee after 6"
                  aria-label="Your availability status"
                  className="mt-3 w-full bg-ink/55 border border-line rounded-xl px-3.5 py-2.5 text-sm text-frost placeholder-faint outline-none focus:border-accent/50 transition-colors"
                />
              )}
            </div>
          </div>
        )}

        {/* Incoming waves */}
        {friends && friends.incoming.length > 0 && (
          <section className="mb-5">
            <SectionLabel>Waves for you</SectionLabel>
            <div className="space-y-2">
              {friends.incoming.map((card) => (
                <PersonRow key={card.user.id} card={card}>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => void respondToWave(card.user.id, true)}
                      aria-label={`Accept wave from ${card.user.name}`}
                      className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-white cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void respondToWave(card.user.id, false)}
                      aria-label={`Decline wave from ${card.user.name}`}
                      className="w-9 h-9 rounded-full glass flex items-center justify-center text-mist cursor-pointer hover:text-frost transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </PersonRow>
              ))}
            </div>
          </section>
        )}

        {/* Suggestions */}
        <section className="mb-5">
          <SectionLabel>Near your vibe</SectionLabel>
          {loading && cards.length === 0 ? (
            <RowSkeleton count={3} />
          ) : cards.length === 0 ? (
            <EmptyState
              icon={<UsersRound size={24} />}
              title="No one around right now"
              hint="Turn on your beacon and join a table — people find people who show up."
            />
          ) : (
            <div className="space-y-2">
              {cards.map((card) => (
                <PersonRow key={card.user.id} card={card}>
                  <GhostButton
                    onClick={() => void wave(card)}
                    disabled={card.friendState === 'outgoing'}
                    className="!px-3 !py-2 text-xs shrink-0"
                  >
                    <span className="flex items-center gap-1.5">
                      <Hand size={13} /> {card.friendState === 'outgoing' ? 'Waved' : 'Wave'}
                    </span>
                  </GhostButton>
                </PersonRow>
              ))}
            </div>
          )}
        </section>

        {/* Friends */}
        {friends && friends.friends.length > 0 && (
          <section>
            <SectionLabel>Your circle ({friends.friends.length})</SectionLabel>
            <div className="space-y-2">
              {friends.friends.map((card) => (
                <PersonRow key={card.user.id} card={card} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-faint mb-2">{children}</p>;
}

function PersonRow({
  card,
  children,
  compact = false,
}: {
  card: PersonCard;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  const { user, sharedInterests, context } = card;
  return (
    <div className="glass rounded-2xl p-3 flex items-center gap-3">
      <button
        type="button"
        onClick={() => openProfile(user.id)}
        aria-label={`View ${user.name}'s profile`}
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer text-left rounded-xl transition-opacity hover:opacity-80"
      >
        <div className="relative shrink-0">
          <Avatar id={user.id} name={user.name} size={compact ? 'md' : 'lg'} />
          {isOnline(user.lastSeen) && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-panel" aria-label="Online" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold flex items-center gap-1 truncate">
            {user.name} {user.verified && <Verified size={13} />}
          </p>
          {!compact && user.statusLine && <p className="text-[11px] text-mist italic truncate">“{user.statusLine}”</p>}
          {(sharedInterests.length > 0 || context) && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {sharedInterests.slice(0, 3).map((i) => (
                <span key={i} className="rounded-full bg-accent/12 text-accent2 px-2 py-0.5 text-[9px] font-bold">
                  {i}
                </span>
              ))}
              {context && <span className="text-[10px] text-faint truncate">{context}</span>}
            </div>
          )}
        </div>
      </button>
      {children}
    </div>
  );
}
