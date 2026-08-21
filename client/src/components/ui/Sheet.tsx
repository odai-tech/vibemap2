import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * Bottom sheet with spring physics + drag-to-dismiss.
 * On desktop it becomes a centered floating glass card.
 */
export function Sheet({
  open,
  onClose,
  children,
  height = 'auto',
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 'auto' for content-sized, 'tall' for near-full panels */
  height?: 'auto' | 'tall';
  label: string;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/45 z-[600]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="fixed inset-x-0 bottom-0 z-[610] md:bottom-6 md:mx-auto md:w-[min(540px,calc(100vw-3rem))]"
            initial={reduceMotion ? { opacity: 0 } : { y: '105%', opacity: 1 }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '105%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose();
            }}
          >
            <div
              className={`glass-strong rounded-t-[28px] md:rounded-[28px] shadow-2xl shadow-black/60 flex flex-col overflow-hidden ${
                height === 'tall' ? 'h-[82dvh] md:h-[78dvh]' : 'max-h-[88dvh] md:max-h-[82dvh]'
              }`}
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1.5 rounded-full bg-line" />
              </div>
              <div className={`overflow-y-auto scroll-thin overscroll-contain pb-safe${height === 'tall' ? ' flex-1 min-h-0' : ''}`}>
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
