import { useState, type FormEvent } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { MapPin, Radar, Users, Zap } from 'lucide-react';
import { INTEREST_POOL } from '@shared/types';
import { login, loginDemo, register } from '@/state/actions';
import { GradientButton } from '@/components/ui/bits';

type Mode = 'landing' | 'signin' | 'signup';

export function Welcome() {
  const [mode, setMode] = useState<Mode>('landing');
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  const runDemo = async () => {
    setDemoBusy(true);
    setError('');
    try {
      await loginDemo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo unavailable');
      setDemoBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') await login(email, password);
      else await register({ email, password, name, handle: handle.toLowerCase(), interests });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink flex items-center justify-center px-5 py-10">
      {/* Ambient background */}
      <div aria-hidden className="absolute inset-0">
        <div className="bg-grid absolute inset-0" />
        <div className="blob w-[420px] h-[420px] bg-accent/45 -top-24 -left-24" />
        <div className="blob w-[380px] h-[380px] bg-radar/30 -bottom-28 -right-20" style={{ animationDelay: '-8s' }} />
        <div className="blob w-[280px] h-[280px] bg-accent2/35 top-1/3 right-1/4" style={{ animationDelay: '-4s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-7 justify-center">
          <span className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center shadow-[0_0_36px_rgba(255,106,60,0.5)]">
            <Zap size={22} className="text-white fill-white relative z-10" />
          </span>
          <span className="font-display font-bold text-3xl tracking-tight">VibeMap</span>
        </div>

        <div className="glass-strong rounded-[28px] p-6 sm:p-8 shadow-2xl shadow-black/60">
          {mode === 'landing' && (
            <>
              <h1 className="font-display font-bold text-[26px] leading-[1.15] text-center">
                Your city is full of people
                <br />
                <span className="text-gradient">you haven't met yet.</span>
              </h1>
              <p className="mt-3 text-sm text-mist text-center leading-relaxed">
                A live map of what's happening around you. Join a table, catch a moment, leave with friends.
              </p>

              <div className="mt-6 space-y-3">
                <ValueRow icon={<MapPin size={15} />} text="See what's alive around you, right now" />
                <ValueRow icon={<Users size={15} />} text="Small tables with capped seats — real conversations" />
                <ValueRow icon={<Radar size={15} />} text="A vibe radar that reads the room — private, no ad-tech" />
              </div>

              <GradientButton onClick={() => void runDemo()} loading={demoBusy} className="w-full mt-7">
                <Zap size={17} className="fill-white" /> Explore the demo city
              </GradientButton>
              <p className="mt-2 text-[11px] text-faint text-center leading-relaxed">
                Drops you into a living San Francisco — 9 locals, tables tonight, radar armed.
              </p>

              <div className="flex items-center gap-3 my-5" aria-hidden>
                <span className="flex-1 h-px bg-line" />
                <span className="text-[11px] text-faint font-semibold">or</span>
                <span className="flex-1 h-px bg-line" />
              </div>

              <div className="flex gap-2.5">
                <ModeButton onClick={() => setMode('signin')}>Sign in</ModeButton>
                <ModeButton onClick={() => setMode('signup')}>Create account</ModeButton>
              </div>
            </>
          )}

          {mode !== 'landing' && (
            <form onSubmit={(e) => void submit(e)}>
              <h1 className="font-display font-bold text-2xl">{mode === 'signin' ? 'Welcome back' : 'Join the map'}</h1>
              <p className="mt-1 text-sm text-mist">
                {mode === 'signin' ? 'The city kept moving without you.' : 'Three interests minimum — that is how we find your people.'}
              </p>

              <div className="mt-5 space-y-3">
                {mode === 'signup' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Name" id="f-name" value={name} onChange={setName} placeholder="Alex Rivera" />
                    <Field
                      label="Handle"
                      id="f-handle"
                      value={handle}
                      onChange={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="alex"
                      prefix="@"
                    />
                  </div>
                )}
                <Field label="Email" id="f-email" type="email" value={email} onChange={setEmail} placeholder="you@city.com" />
                <Field
                  label="Password"
                  id="f-pass"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                />

                {mode === 'signup' && (
                  <div>
                    <p className="text-xs font-semibold text-mist mb-1.5">
                      Interests <span className={clsx('font-bold', interests.length >= 3 ? 'text-emerald-400' : 'text-faint')}>({interests.length}/3+)</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scroll-thin pr-1">
                      {INTEREST_POOL.map((i) => {
                        const active = interests.includes(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() =>
                              setInterests((cur) => (active ? cur.filter((x) => x !== i) : cur.length < 12 ? [...cur, i] : cur))
                            }
                            className={clsx(
                              'rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors duration-150 border',
                              active ? 'bg-accent/20 border-accent/50 text-accent2' : 'glass text-mist hover:text-frost',
                            )}
                          >
                            {i}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mt-3 text-[13px] text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3.5 py-2.5"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}

              <GradientButton
                type="submit"
                loading={busy}
                disabled={mode === 'signup' && interests.length < 3}
                className="w-full mt-5"
              >
                {mode === 'signin' ? 'Sign in' : 'Create my map'}
              </GradientButton>

              <div className="mt-4 flex items-center justify-between text-[12px]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('landing');
                    setError('');
                  }}
                  className="text-faint hover:text-mist cursor-pointer font-semibold transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setError('');
                  }}
                  className="text-accent2 hover:text-white cursor-pointer font-semibold transition-colors"
                >
                  {mode === 'signin' ? 'New here? Create account' : 'Have an account? Sign in'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-faint">
          Self-hosted & private — your data lives in one SQLite file, no third-party APIs.
        </p>
      </motion.div>
    </div>
  );
}

function ValueRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-xl bg-accent/12 border border-accent/25 flex items-center justify-center text-accent2 shrink-0">
        {icon}
      </span>
      <span className="text-[13px] text-frost/85">{text}</span>
    </div>
  );
}

function ModeButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 glass rounded-2xl py-3 text-sm font-display font-bold text-frost cursor-pointer transition-colors duration-200 hover:border-white/30"
    >
      {children}
    </button>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  prefix,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  prefix?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-mist block mb-1.5">
        {label}
      </label>
      <div className="flex items-center glass-well rounded-xl px-3.5 focus-within:border-accent/50 transition-colors">
        {prefix && <span className="text-faint text-sm mr-0.5">{prefix}</span>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className="w-full bg-transparent py-3 text-sm text-frost placeholder-faint outline-none"
        />
      </div>
    </div>
  );
}
