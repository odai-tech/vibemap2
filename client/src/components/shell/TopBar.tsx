import { useState } from 'react';
import { clsx } from 'clsx';
import { MessageCircle, Search, X, Zap } from 'lucide-react';
import { useStore, setState } from '@/state/store';
import { openMessages } from '@/lib/dm';
import { Avatar } from '@/components/ui/Avatar';
import { VIBE_CATEGORIES } from '@shared/types';
import { CATEGORY_META } from '@shared/vibes';

export function TopBar() {
  const me = useStore((s) => s.me);
  const online = useStore((s) => s.online);
  const dmUnread = useStore((s) => s.dm.unread);
  const searchQuery = useStore((s) => s.searchQuery);
  const filterCategory = useStore((s) => s.filterCategory);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="absolute top-0 inset-x-0 z-[500] pointer-events-none">
      <div className="px-3 pt-3 md:px-5 md:pt-4 space-y-2.5">
        {/* Bar */}
        <div className="glass-strong rounded-2xl pl-3 pr-2 py-2 flex items-center gap-3 max-w-3xl mx-auto pointer-events-auto shadow-xl shadow-black/30">
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer shrink-0"
            onClick={() => setState({ searchQuery: '', filterCategory: 'ALL' })}
            aria-label="VibeMap home"
          >
            <span className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-[0_0_18px_rgba(255,106,60,0.45)]">
              <Zap size={16} className="text-white fill-white relative z-10" />
            </span>
            <span className={clsx('font-display font-bold text-lg tracking-tight', searchOpen && 'hidden sm:inline')}>
              VibeMap
            </span>
          </button>

          {/* Search */}
          <div className={clsx('flex items-center gap-2 flex-1 min-w-0', !searchOpen && 'justify-end sm:justify-start')}>
            <div
              className={clsx(
                'flex items-center gap-2 glass-well rounded-xl px-3 transition-all duration-200 focus-within:border-accent/40',
                searchOpen ? 'flex-1 py-2' : 'flex-none sm:flex-1 py-2',
              )}
            >
              <Search size={15} className="text-mist shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setState({ searchQuery: e.target.value })}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setSearchOpen(false)}
                placeholder="Search vibes, tags, people…"
                aria-label="Search the map"
                className={clsx(
                  'bg-transparent outline-none text-sm text-frost placeholder-faint min-w-0',
                  searchOpen ? 'w-full' : 'w-0 sm:w-full',
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setState({ searchQuery: '' })}
                  className="text-mist hover:text-frost cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Presence + profile */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={clsx(
                'items-center gap-1.5 text-[11px] font-semibold text-mist glass-well rounded-full px-2.5 py-1.5',
                searchOpen ? 'hidden md:flex' : 'hidden xs:flex sm:flex',
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-live shadow-[0_0_8px_#3DDC97]" />
              {online} live
            </span>
            <button
              type="button"
              onClick={() => openMessages()}
              aria-label={dmUnread > 0 ? `Messages, ${dmUnread} unread` : 'Messages'}
              className="relative w-9 h-9 rounded-xl glass-well flex items-center justify-center text-mist hover:text-frost cursor-pointer transition-colors"
            >
              <MessageCircle size={17} />
              {dmUnread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full gradient-brand text-white text-[9px] font-bold flex items-center justify-center">
                  <span className="relative z-10">{dmUnread > 9 ? '9+' : dmUnread}</span>
                </span>
              )}
            </button>
            {me && (
              <button
                type="button"
                onClick={() => setState({ profileOpen: true })}
                className="cursor-pointer rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-accent"
                aria-label="Open profile"
              >
                <Avatar id={me.id} name={me.name} size="sm" />
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-3xl mx-auto pointer-events-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip active={filterCategory === 'ALL'} onClick={() => setState({ filterCategory: 'ALL' })} color="#FFB45C">
            All vibes
          </FilterChip>
          {VIBE_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat}
              active={filterCategory === cat}
              onClick={() => setState({ filterCategory: filterCategory === cat ? 'ALL' : cat })}
              color={CATEGORY_META[cat].color}
            >
              {CATEGORY_META[cat].label}
            </FilterChip>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer border flex items-center gap-1.5',
        active ? 'text-ink shadow-lg' : 'glass text-mist hover:text-frost',
      )}
      style={active ? { background: color, borderColor: color } : undefined}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? '#05070B' : color }} />
      {children}
    </button>
  );
}
