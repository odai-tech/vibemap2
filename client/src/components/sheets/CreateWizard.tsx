import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Minus, Plus, Sparkles, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PIN_TYPES, VIBE_CATEGORIES, type PinType, type VibeCategory } from '@shared/types';
import { CATEGORY_META, TYPE_META } from '@shared/vibes';
import { useStore, toast } from '@/state/store';
import { cancelCreating, createPin } from '@/state/actions';
import { confettiBurst } from '@/lib/confetti';
import { timeUntil } from '@/lib/format';
import { Sheet } from '@/components/ui/Sheet';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CoverArt } from '@/components/ui/CoverArt';
import { GradientButton, CategoryChip } from '@/components/ui/bits';

const TYPE_ICONS: Record<PinType, LucideIcon> = {
  TABLE: Users,
  EVENT: CalendarDays,
  MOMENT: Sparkles,
  DROP: MapPin,
};

type TimePreset = 'now' | 'hour' | 'tonight' | 'tomorrow';

function presetToTs(preset: TimePreset): number | null {
  const now = new Date();
  switch (preset) {
    case 'now':
      return Date.now() + 10 * 60_000;
    case 'hour':
      return Date.now() + 3600_000;
    case 'tonight': {
      const d = new Date(now);
      d.setHours(20, 0, 0, 0);
      if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
      return d.getTime();
    }
    case 'tomorrow': {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(19, 0, 0, 0);
      return d.getTime();
    }
  }
}

export function CreateWizard() {
  const draftLocation = useStore((s) => s.draftLocation);
  const me = useStore((s) => s.me);

  const [step, setStep] = useState(0);
  const [type, setType] = useState<PinType>('TABLE');
  const [category, setCategory] = useState<VibeCategory>('CHILL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [timePreset, setTimePreset] = useState<TimePreset>('tonight');
  const [capacity, setCapacity] = useState(6);
  const [capped, setCapped] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep(0);
    setType('TABLE');
    setCategory('CHILL');
    setTitle('');
    setDescription('');
    setTags([]);
    setTimePreset('tonight');
    setCapacity(6);
    setCapped(false);
  };

  const close = () => {
    cancelCreating();
    reset();
  };

  const suggestedTags = useMemo(() => {
    const pool = [...CATEGORY_META[category].impliedTags, ...(me?.interests ?? [])];
    return [...new Set(pool)].slice(0, 10);
  }, [category, me]);

  const scheduled = type === 'TABLE' || type === 'EVENT';
  const startsAt = scheduled ? presetToTs(timePreset) : null;
  const finalCapacity = type === 'TABLE' ? capacity : type === 'EVENT' && capped ? capacity : null;

  const canNext = step === 0 ? true : step === 1 ? title.trim().length >= 3 : true;

  const submit = async () => {
    if (!draftLocation) return;
    setBusy(true);
    try {
      await createPin({
        type,
        category,
        lat: draftLocation.lat,
        lng: draftLocation.lng,
        title: title.trim(),
        description: description.trim(),
        tags,
        startsAt,
        capacity: finalCapacity,
      });
      confettiBurst(window.innerWidth / 2, window.innerHeight * 0.4);
      reset();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not drop the pin', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!draftLocation} onClose={close} label="Create a pin">
      <div className="px-5 pb-6 pt-1">
        {/* Progress */}
        <div className="flex items-center justify-center gap-1.5 mb-4" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={clsx(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-6 gradient-brand' : 'w-1.5 bg-line',
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <div>
            <h2 className="font-display font-bold text-xl mb-1">What are you putting on the map?</h2>
            <p className="text-sm text-mist mb-4">Tables are where friendships actually happen.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {PIN_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t];
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={clsx(
                      'text-left rounded-2xl p-3.5 cursor-pointer transition-all duration-200 border',
                      active ? 'bg-accent/15 border-accent/60 ring-glow' : 'glass hover:border-accent/30',
                    )}
                  >
                    <Icon size={20} className={active ? 'text-accent2' : 'text-mist'} />
                    <p className="mt-2 font-display font-bold text-sm">{TYPE_META[t].label}</p>
                    <p className="mt-0.5 text-[11px] text-mist leading-snug">{TYPE_META[t].tagline}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display font-bold text-xl mb-1">Give it a vibe</h2>
              <p className="text-sm text-mist">Pick a category and make the title irresistible.</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {VIBE_CATEGORIES.map((cat) => {
                const active = category === cat;
                const meta = CATEGORY_META[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={clsx(
                      'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-200 border',
                      active ? 'text-ink' : 'glass text-mist hover:text-frost',
                    )}
                    style={active ? { background: meta.color, borderColor: meta.color } : undefined}
                  >
                    <CategoryIcon category={cat} size={13} />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <div>
              <label htmlFor="pin-title" className="text-xs font-semibold text-mist block mb-1.5">
                Title
              </label>
              <input
                id="pin-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={70}
                placeholder={type === 'TABLE' ? "e.g. Strangers' dinner, 6 seats" : 'e.g. Rooftop sunset jam'}
                className="w-full bg-ink/55 border border-line rounded-xl px-3.5 py-3 text-sm text-frost placeholder-faint outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="pin-desc" className="text-xs font-semibold text-mist block mb-1.5">
                Description <span className="text-faint font-normal">(optional)</span>
              </label>
              <textarea
                id="pin-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={400}
                rows={2}
                placeholder="What should people expect?"
                className="w-full bg-ink/55 border border-line rounded-xl px-3.5 py-3 text-sm text-frost placeholder-faint outline-none focus:border-accent/50 transition-colors resize-none"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-mist mb-1.5">Tags (up to 4)</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedTags.map((t) => {
                  const active = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setTags((cur) => (active ? cur.filter((x) => x !== t) : cur.length < 4 ? [...cur, t] : cur))
                      }
                      className={clsx(
                        'rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors duration-200 border',
                        active ? 'bg-accent/20 border-accent/50 text-accent2' : 'glass text-mist hover:text-frost',
                      )}
                    >
                      #{t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display font-bold text-xl mb-1">Set the scene</h2>
              <p className="text-sm text-mist">
                {scheduled ? 'When does it start?' : `${TYPE_META[type].label}s go live the moment you drop them.`}
              </p>
            </div>

            {scheduled && (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['now', 'Right now'],
                    ['hour', 'In an hour'],
                    ['tonight', 'Tonight 8 PM'],
                    ['tomorrow', 'Tomorrow 7 PM'],
                  ] as Array<[TimePreset, string]>
                ).map(([preset, label]) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTimePreset(preset)}
                    className={clsx(
                      'rounded-xl px-3 py-2.5 text-sm font-semibold cursor-pointer transition-all duration-200 border',
                      timePreset === preset ? 'bg-accent/15 border-accent/60 text-accent2' : 'glass text-mist hover:text-frost',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {type === 'TABLE' && (
              <Stepper label="Seats at the table" value={capacity} min={2} max={8} onChange={setCapacity} />
            )}
            {type === 'EVENT' && (
              <div className="glass rounded-2xl p-3.5 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-semibold">Cap the crowd</span>
                  <input
                    type="checkbox"
                    checked={capped}
                    onChange={(e) => setCapped(e.target.checked)}
                    className="w-4 h-4 accent-[#FF6A3C] cursor-pointer"
                  />
                </label>
                {capped && <Stepper label="Max people" value={capacity} min={4} max={200} step={4} onChange={setCapacity} />}
              </div>
            )}

            {/* Preview */}
            <div className="glass rounded-2xl overflow-hidden">
              <CoverArt category={category} cover={3} className="h-16" iconSize={48} />
              <div className="p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-faint">{TYPE_META[type].label}</span>
                  <CategoryChip category={category} small />
                </div>
                <p className="font-display font-bold text-sm">{title.trim() || 'Your title here'}</p>
                <p className="text-[11px] text-mist mt-1">
                  {scheduled && startsAt ? timeUntil(startsAt, false) : 'Live immediately'}
                  {finalCapacity !== null && ` · ${finalCapacity} spots`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex gap-2.5 mt-5">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="glass rounded-2xl px-4 cursor-pointer text-mist hover:text-frost transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          {step < 2 ? (
            <GradientButton onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext} className="flex-1">
              Continue <ArrowRight size={17} />
            </GradientButton>
          ) : (
            <GradientButton onClick={() => void submit()} loading={busy} className="flex-1">
              <MapPin size={17} /> Drop the pin
            </GradientButton>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="glass rounded-2xl p-3.5 flex items-center justify-between">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        <StepBtn onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} label="Decrease">
          <Minus size={15} />
        </StepBtn>
        <span className="font-display font-bold text-lg w-8 text-center tabular-nums">{value}</span>
        <StepBtn onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} label="Increase">
          <Plus size={15} />
        </StepBtn>
      </div>
    </div>
  );
}

function StepBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-8 h-8 rounded-full bg-elev border border-line flex items-center justify-center text-frost cursor-pointer transition-colors hover:border-accent/50 disabled:opacity-35 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
