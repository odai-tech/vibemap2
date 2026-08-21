import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Flame, Radar, X } from 'lucide-react';
import { useStore } from '@/state/store';
import { flyTo } from '@/state/store';
import { dismissRadar, selectPin } from '@/state/actions';
import { CATEGORY_META } from '@shared/vibes';
import { CategoryChip } from '@/components/ui/bits';

export function RadarCard() {
  const radar = useStore((s) => s.radar);
  const pins = useStore((s) => s.pins);
  const report = radar.report;

  const openPick = () => {
    if (!report?.recommendedPinId) return;
    const pin = pins[report.recommendedPinId];
    dismissRadar();
    selectPin(report.recommendedPinId);
    if (pin) flyTo(pin.lat - 0.0022, pin.lng, 15.5);
  };

  return (
    <AnimatePresence>
      {radar.phase === 'done' && report && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="absolute top-28 inset-x-3 z-[505] max-w-md mx-auto"
        >
          <div className="glass-strong rounded-3xl p-4 shadow-2xl shadow-black/50 ring-glow">
            {/* Header */}
            <div className="flex items-center justify-between mb-2.5">
              <span className="flex items-center gap-1.5 text-[10px] font-display font-bold tracking-[0.22em] uppercase text-radar">
                <Radar size={12} /> Vibe Radar
              </span>
              <button
                type="button"
                onClick={dismissRadar}
                aria-label="Dismiss radar report"
                className="text-mist hover:text-frost cursor-pointer p-1 -m-1 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="font-display font-bold text-lg leading-snug">{report.headline}</p>

            {/* Energy meter */}
            <div className="mt-2.5 flex items-center gap-2.5">
              <div className="flex-1 h-2 rounded-full bg-ink/70 overflow-hidden">
                <motion.div
                  className="h-full rounded-full gradient-brand"
                  initial={{ width: 0 }}
                  animate={{ width: `${report.energy}%` }}
                  transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
              <span className="text-xs font-bold text-frost tabular-nums">{report.energy}</span>
              <span className="text-[10px] text-mist font-semibold uppercase tracking-wider">energy</span>
            </div>

            <p className="mt-2.5 text-[13px] text-mist leading-relaxed">{report.summary}</p>

            {/* Category breakdown */}
            {report.breakdown.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {report.breakdown.map((row) => {
                  const max = report.breakdown[0].people || 1;
                  return (
                    <div key={row.category} className="flex items-center gap-2">
                      <span className="w-20 shrink-0">
                        <CategoryChip category={row.category} small />
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-ink/70 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(8, (row.people / max) * 100)}%`,
                            background: CATEGORY_META[row.category].color,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-mist tabular-nums w-10 text-right">{row.people} ppl</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recommendation */}
            <button
              type="button"
              onClick={openPick}
              disabled={!report.recommendedPinId}
              className="mt-3 w-full text-left rounded-2xl bg-accent/12 border border-accent/30 px-3.5 py-3 cursor-pointer transition-colors duration-200 hover:bg-accent/20 disabled:cursor-default group"
            >
              <span className="text-[13px] text-accent2 leading-snug flex items-start gap-2">
                <span className="flex-1">{report.recommendation}</span>
                {report.recommendedPinId && (
                  <ArrowRight size={15} className="shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5" />
                )}
              </span>
            </button>

            {/* Hotspot */}
            {report.hotspot && (
              <button
                type="button"
                onClick={() => {
                  flyTo(report.hotspot!.lat, report.hotspot!.lng, 16);
                  dismissRadar();
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300/90 hover:text-amber-200 cursor-pointer transition-colors"
              >
                <Flame size={13} /> Hotspot {report.hotspot.label} — jump there
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
