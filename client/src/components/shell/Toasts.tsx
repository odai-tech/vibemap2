import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { useStore } from '@/state/store';

const ICONS = {
  success: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
  info: <Info size={16} className="text-sky-400 shrink-0" />,
  error: <AlertTriangle size={16} className="text-rose-400 shrink-0" />,
} as const;

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="fixed top-[4.6rem] inset-x-0 z-[800] flex flex-col items-center gap-2 px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: 'spring', damping: 24, stiffness: 350 }}
            className="glass-strong rounded-2xl px-4 py-2.5 flex items-center gap-2.5 max-w-sm shadow-xl shadow-black/40"
          >
            {ICONS[t.kind]}
            <span className="text-[13px] font-medium text-frost leading-snug">{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
