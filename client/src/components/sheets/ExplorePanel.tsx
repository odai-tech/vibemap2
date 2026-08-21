import { clsx } from 'clsx';
import { Compass, ShieldCheck, Users } from 'lucide-react';
import { useStore, type ExploreWhen } from '@/state/store';
import { loadExplore, openPinFromList, setTab } from '@/state/actions';
import { timeUntil } from '@/lib/format';
import { CATEGORY_META } from '@shared/vibes';
import { Sheet } from '@/components/ui/Sheet';
import { CoverArt } from '@/components/ui/CoverArt';
import { MatchRing, ReasonChip, EmptyState, RowSkeleton } from '@/components/ui/bits';

const WHEN_OPTIONS: Array<[ExploreWhen, string]> = [
  ['now', 'Live now'],
  ['today', 'Today'],
  ['week', 'This week'],
  ['all', 'Everything'],
];

export function ExplorePanel() {
  const open = useStore((s) => s.tab === 'explore');
  const { when, items, loading } = useStore((s) => s.explore);

  return (
    <Sheet open={open} onClose={() => setTab('map')} label="For you" height="tall">
      <div className="px-5 pb-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display font-bold text-2xl">For you</h2>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-faint">
            <ShieldCheck size={12} className="text-emerald-400/80" /> Ranked privately, on your data
          </span>
        </div>
        <p className="text-sm text-mist mb-4">Matched to your interests, friends, and timing — no ad model.</p>

        {/* When filter */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {WHEN_OPTIONS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => void loadExplore(value)}
              className={clsx(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-200 border',
                when === value ? 'gradient-brand text-white border-transparent' : 'glass text-mist hover:text-frost',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && items.length === 0 ? (
          <RowSkeleton count={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Compass size={24} />}
            title="Nothing matches yet"
            hint="Try a wider time window — or drop your own pin and let people come to you."
          />
        ) : (
          <div className="space-y-2.5">
            {items.map(({ pin, match, reasons }) => (
              <button
                key={pin.id}
                type="button"
                onClick={() => openPinFromList(pin)}
                className="w-full text-left glass rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:border-accent/40 hover:bg-accent/5"
              >
                <CoverArt category={pin.category} cover={pin.cover} className="w-14 h-14 rounded-xl shrink-0" iconSize={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm truncate">{pin.title}</p>
                  <p className="text-[11px] text-mist mt-0.5 flex items-center gap-1.5">
                    <span className={pin.live ? 'text-rose-300 font-semibold' : ''}>{timeUntil(pin.startsAt, pin.live)}</span>
                    <span className="text-faint">·</span>
                    <span style={{ color: CATEGORY_META[pin.category].color }}>{CATEGORY_META[pin.category].label}</span>
                    <span className="text-faint">·</span>
                    <span className="flex items-center gap-0.5">
                      <Users size={11} /> {pin.attendees}
                    </span>
                  </p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {reasons.slice(0, 2).map((r) => (
                      <ReasonChip key={r}>{r}</ReasonChip>
                    ))}
                  </div>
                </div>
                <MatchRing value={match} />
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
