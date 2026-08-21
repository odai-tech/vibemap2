import { useState } from 'react';
import { clsx } from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, Compass, Flame, Layers, LocateFixed, Map as MapIcon, Plus, Radar, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useStore, setState, setMapStyle } from '@/state/store';
import { runRadar, setTab, startCreating, cancelCreating, locateMe } from '@/state/actions';
import { MAP_STYLE_META, type MapStyleId } from '@/components/map/mapStyles';
import type { Tab } from '@/state/store';

const TABS: Array<{ id: Tab; label: string; icon: typeof MapIcon }> = [
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'explore', label: 'For You', icon: Compass },
  { id: 'people', label: 'People', icon: Users },
  { id: 'activity', label: 'Activity', icon: Bell },
];

export function BottomNav() {
  const tab = useStore((s) => s.tab);
  const unread = useStore((s) => s.unread);
  const creating = useStore((s) => s.creating);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[520] md:hidden pointer-events-none"
      aria-label="Primary"
    >
      <div className="mx-3 mb-3 pb-safe pointer-events-auto">
        <div className="glass-strong rounded-3xl px-2 py-2 flex items-center justify-between shadow-2xl shadow-black/50">
          {TABS.slice(0, 2).map((t) => (
            <NavButton key={t.id} {...t} active={tab === t.id} unread={0} />
          ))}

          {/* Create */}
          <button
            type="button"
            onClick={() => (creating ? cancelCreating() : startCreating())}
            aria-label={creating ? 'Cancel pin creation' : 'Create a pin'}
            className={clsx(
              'relative -mt-7 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-[0_8px_30px_-4px_rgba(255,106,60,0.6)]',
              creating ? 'bg-ember rotate-45' : 'gradient-brand hover:brightness-110 active:scale-95',
            )}
          >
            <Plus size={26} className="text-white relative z-10" />
          </button>

          {TABS.slice(2).map((t) => (
            <NavButton key={t.id} {...t} active={tab === t.id} unread={t.id === 'activity' ? unread : 0} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavButton({
  id,
  label,
  icon: Icon,
  active,
  unread,
  vertical = false,
}: {
  id: Tab;
  label: string;
  icon: typeof MapIcon;
  active: boolean;
  unread: number;
  vertical?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => setTab(active && id !== 'map' ? 'map' : id)}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl cursor-pointer transition-colors duration-200',
        active ? 'text-frost' : 'text-faint hover:text-mist',
        vertical && 'w-12 h-12 justify-center px-0',
      )}
    >
      {active && (
        <motion.span
          layoutId={vertical ? 'rail-pill' : 'nav-pill'}
          className="absolute inset-0 rounded-2xl bg-white/10 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          transition={{ type: 'spring', damping: 26, stiffness: 380 }}
        />
      )}
      <span className="relative">
        <Icon size={vertical ? 21 : 20} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full gradient-brand text-white text-[9px] font-bold flex items-center justify-center">
            <span className="relative z-10">{unread > 9 ? '9+' : unread}</span>
          </span>
        )}
      </span>
      {!vertical && <span className="relative text-[10px] font-semibold">{label}</span>}
    </button>
  );
}

/** Desktop left rail. */
export function SideRail() {
  const tab = useStore((s) => s.tab);
  const unread = useStore((s) => s.unread);
  const me = useStore((s) => s.me);
  const creating = useStore((s) => s.creating);

  return (
    <nav
      className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-[520] flex-col items-center gap-2 glass-strong rounded-3xl p-2 shadow-2xl shadow-black/50"
      aria-label="Primary"
    >
      {TABS.map((t) => (
        <NavButton key={t.id} {...t} active={tab === t.id} unread={t.id === 'activity' ? unread : 0} vertical />
      ))}
      <div className="w-8 h-px bg-line my-1" />
      <button
        type="button"
        onClick={() => (creating ? cancelCreating() : startCreating())}
        aria-label={creating ? 'Cancel pin creation' : 'Create a pin'}
        className={clsx(
          'w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 shadow-[0_6px_24px_-4px_rgba(255,106,60,0.55)]',
          creating ? 'bg-ember rotate-45' : 'gradient-brand hover:brightness-110 active:scale-95',
        )}
      >
        <Plus size={24} className="text-white relative z-10" />
      </button>
      {me && (
        <button
          type="button"
          onClick={() => setState({ profileOpen: true })}
          className="mt-1 cursor-pointer rounded-full transition-transform hover:scale-105"
          aria-label="Open profile"
        >
          <Avatar id={me.id} name={me.name} size="md" />
        </button>
      )}
    </nav>
  );
}

/** Picker for the basemap look — satellite / midnight / daylight. */
function StyleSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const current = useStore((s) => s.mapStyle);
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[508]" onClick={onClose} aria-hidden />
          <motion.div
            initial={{ opacity: 0, x: 12, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="absolute right-14 bottom-0 z-[512] glass-strong rounded-2xl p-1.5 w-52 shadow-2xl shadow-black/60 origin-bottom-right"
            role="menu"
            aria-label="Map style"
          >
            {(Object.keys(MAP_STYLE_META) as MapStyleId[]).map((id) => {
              const meta = MAP_STYLE_META[id];
              const active = id === current;
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setMapStyle(id);
                    onClose();
                  }}
                  className={clsx(
                    'w-full flex items-center gap-2.5 rounded-xl p-2 cursor-pointer transition-colors duration-150 text-left',
                    active ? 'bg-white/10' : 'hover:bg-white/5',
                  )}
                >
                  <span
                    className="w-9 h-9 rounded-lg border border-white/15 shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                    style={{ background: meta.thumb }}
                    aria-hidden
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-frost">{meta.label}</span>
                    <span className="block text-[10px] text-mist">{meta.hint}</span>
                  </span>
                  {active && <Check size={15} className="text-accent2 shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Floating action buttons: radar, map style, heatmap, locate. */
export function MapFabs() {
  const radarPhase = useStore((s) => s.radar.phase);
  const heatmap = useStore((s) => s.heatmap);
  const [styleOpen, setStyleOpen] = useState(false);

  return (
    <div className="fixed right-3 md:right-5 bottom-28 md:bottom-10 z-[510] flex flex-col gap-2.5 items-end">
      <Fab label="Vibe radar" active={radarPhase !== 'idle'} onClick={() => void runRadar()} glow>
        <Radar size={20} className={radarPhase === 'scanning' ? 'animate-spin' : ''} />
      </Fab>
      <Fab label="Heatmap" active={heatmap} onClick={() => setState((s) => ({ heatmap: !s.heatmap }))}>
        <Flame size={20} />
      </Fab>
      <div className="relative">
        <Fab label="Map style" active={styleOpen} onClick={() => setStyleOpen((v) => !v)}>
          <Layers size={20} />
        </Fab>
        <StyleSwitcher open={styleOpen} onClose={() => setStyleOpen(false)} />
      </div>
      <Fab label="My location" onClick={locateMe}>
        <LocateFixed size={20} />
      </Fab>
    </div>
  );
}

function Fab({
  children,
  label,
  onClick,
  active = false,
  glow = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  glow?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        'group relative w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95',
        active
          ? 'gradient-brand text-white shadow-[0_0_24px_rgba(255,106,60,0.5)]'
          : 'glass-strong text-mist hover:text-frost hover:border-white/25',
        glow && !active && 'text-radar',
      )}
    >
      <span className="relative z-10 flex items-center justify-center">{children}</span>
      <span className="absolute right-14 px-2.5 py-1.5 rounded-xl glass-strong text-xs font-semibold text-frost whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none hidden md:block">
        {label}
      </span>
    </button>
  );
}
