import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useStore, setState, getState } from '@/state/store';
import { boot, cancelCreating } from '@/state/actions';
import { Welcome } from '@/components/onboarding/Welcome';
import { MapView } from '@/components/map/MapView';
import { RadarCard } from '@/components/map/RadarCard';
import { TopBar } from '@/components/shell/TopBar';
import { BottomNav, MapFabs, SideRail } from '@/components/shell/Nav';
import { Toasts } from '@/components/shell/Toasts';
import { PinDetailSheet } from '@/components/sheets/PinDetail';
import { CreateWizard } from '@/components/sheets/CreateWizard';
import { ExplorePanel } from '@/components/sheets/ExplorePanel';
import { PeoplePanel } from '@/components/sheets/PeoplePanel';
import { ActivityPanel } from '@/components/sheets/ActivityPanel';
import { ProfilePanel } from '@/components/sheets/ProfilePanel';
import { UserProfileSheet } from '@/components/sheets/UserProfileSheet';
import { MessagesSheet } from '@/components/sheets/MessagesSheet';
import { GradientButton, GhostButton } from '@/components/ui/bits';

/** Confirm bar shown while aiming the crosshair at a location. */
function CreateConfirmBar() {
  const creating = useStore((s) => s.creating);
  return (
    <AnimatePresence>
      {creating && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed bottom-24 md:bottom-10 inset-x-4 z-[515] flex justify-center"
        >
          <div className="glass-strong rounded-2xl p-3 flex items-center gap-3 shadow-2xl shadow-black/50 max-w-sm w-full">
            <p className="flex-1 text-[13px] text-mist leading-snug pl-1">
              Move the map to aim, then drop your pin.
            </p>
            <GhostButton onClick={cancelCreating} className="!px-3 !py-2 text-xs">
              Cancel
            </GhostButton>
            <GradientButton
              onClick={() => {
                const bbox = getState().bbox;
                if (!bbox) return;
                const [w, s, e, n] = bbox.split(',').map(Number);
                setState({ draftLocation: { lat: (s + n) / 2, lng: (w + e) / 2 }, creating: false });
              }}
              className="!px-4 !py-2 text-sm !rounded-xl"
            >
              Drop here
            </GradientButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Splash() {
  return (
    <div className="min-h-dvh bg-ink flex items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center shadow-[0_0_44px_rgba(255,106,60,0.55)]"
      >
        <Zap size={26} className="text-white fill-white relative z-10" />
      </motion.div>
    </div>
  );
}

export default function App() {
  const bootState = useStore((s) => s.boot);

  useEffect(() => {
    void boot();
  }, []);

  if (bootState === 'loading') return <Splash />;
  if (bootState === 'guest') return <Welcome />;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-ink">
      <MapView />
      <TopBar />
      <RadarCard />
      <MapFabs />
      <CreateConfirmBar />
      <BottomNav />
      <SideRail />

      <PinDetailSheet />
      <CreateWizard />
      <ExplorePanel />
      <PeoplePanel />
      <ActivityPanel />
      <ProfilePanel />
      <UserProfileSheet />
      <MessagesSheet />

      <Toasts />
    </div>
  );
}
