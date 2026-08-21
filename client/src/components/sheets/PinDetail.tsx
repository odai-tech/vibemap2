import { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import {
  Clock,
  Hand,
  Lightbulb,
  LogOut,
  MessageCircle,
  RefreshCw,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { ChatMessage, PinDetail as PinDetailType } from '@shared/types';
import { TYPE_META } from '@shared/vibes';
import { api } from '@/lib/api';
import { ago, seatsText, timeUntil } from '@/lib/format';
import { confettiBurst } from '@/lib/confetti';
import { onChat, subscribePin } from '@/lib/ws';
import { openMessages } from '@/lib/dm';
import { useStore, toast } from '@/state/store';
import { deletePin, joinPin, leavePin, openProfile, selectPin } from '@/state/actions';
import { Sheet } from '@/components/ui/Sheet';
import { Avatar, AvatarStack } from '@/components/ui/Avatar';
import { CoverArt } from '@/components/ui/CoverArt';
import { CategoryChip, GradientButton, GhostButton, Verified } from '@/components/ui/bits';

export function PinDetailSheet() {
  const pinId = useStore((s) => s.selectedPinId);
  const me = useStore((s) => s.me);
  const summary = useStore((s) => (s.selectedPinId ? s.pins[s.selectedPinId] : undefined));

  const [detail, setDetail] = useState<PinDetailType | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [waved, setWaved] = useState(false);
  const [ibIndex, setIbIndex] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => selectPin(null), []);

  useEffect(() => {
    if (!pinId) {
      setDetail(null);
      setMessages([]);
      setDraft('');
      setWaved(false);
      setIbIndex(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [{ pin }, { messages: msgs }] = await Promise.all([api.pin(pinId), api.messages(pinId)]);
        if (cancelled) return;
        setDetail(pin);
        setMessages(msgs);
      } catch {
        if (!cancelled) {
          toast('This vibe has faded away', 'info');
          selectPin(null);
        }
      }
    })();

    const unsubRoom = subscribePin(pinId);
    const unsubChat = onChat((m) => {
      if (m.pinId !== pinId) return;
      setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
    });
    return () => {
      cancelled = true;
      unsubRoom();
      unsubChat();
    };
  }, [pinId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  const pin = detail ?? (summary ? { ...summary, members: summary.memberPreview, icebreakers: [] } : null);
  if (!pin) return <Sheet open={false} onClose={close} label="Pin details"><div /></Sheet>;

  const isMine = me?.id === pin.author.id;
  const joined = detail?.joined ?? summary?.joined ?? false;
  const attendees = summary?.attendees ?? pin.attendees;
  const seats = seatsText(pin.capacity, attendees);
  const isFull = pin.capacity !== null && attendees >= pin.capacity && !joined;

  const handleJoin = async () => {
    setBusy(true);
    try {
      if (joined) {
        await leavePin(pin.id);
        setDetail((d) => (d ? { ...d, joined: false } : d));
        toast('Left quietly', 'info');
      } else {
        await joinPin(pin.id);
        setDetail((d) => (d ? { ...d, joined: true } : d));
        confettiBurst(window.innerWidth / 2, window.innerHeight * 0.55);
        toast(`You're in — say hi in the chat`, 'success');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    setDraft('');
    try {
      const { message } = await api.sendMessage(pin.id, body);
      setMessages((cur) => (cur.some((x) => x.id === message.id) ? cur : [...cur, message]));
    } catch (err) {
      setDraft(body);
      toast(err instanceof Error ? err.message : 'Message failed', 'error');
    }
  };

  const handleWaveHost = async () => {
    try {
      await api.wave(pin.author.id);
      setWaved(true);
      toast(`Waved at ${pin.author.name.split(' ')[0]}`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not wave', 'error');
    }
  };

  return (
    <Sheet open={!!pinId} onClose={close} label={pin.title} height="tall">
      {/* Cover */}
      <div className="relative">
        <CoverArt category={pin.category} cover={pin.cover} className="h-32 mx-4 rounded-2xl" iconSize={84} />
        <div className="absolute top-2.5 left-6 flex items-center gap-1.5">
          <span className="glass rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-frost">
            {TYPE_META[pin.type].label}
          </span>
          <CategoryChip category={pin.category} small />
          {pin.live && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/20 text-rose-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" /> Live
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-2.5 right-6 w-7 h-7 rounded-full glass flex items-center justify-center text-mist hover:text-frost cursor-pointer transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-5 pt-3.5 pb-5 space-y-4">
        {/* Title + time */}
        <div>
          <h2 className="font-display font-bold text-xl leading-tight">{pin.title}</h2>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-mist font-medium">
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-accent2" />
              {timeUntil(pin.startsAt, pin.live)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-accent2" />
              {attendees} in{seats ? ` · ${seats}` : ''}
            </span>
          </div>
        </div>

        {/* Host */}
        <div className="glass rounded-2xl p-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => openProfile(pin.author.id)}
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer text-left rounded-xl transition-opacity hover:opacity-80"
            aria-label={`View ${pin.author.name}'s profile`}
          >
            <Avatar id={pin.author.id} name={pin.author.name} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold flex items-center gap-1">
                {pin.author.name} {pin.author.verified && <Verified />}
              </p>
              <p className="text-xs text-mist">@{pin.author.handle} · hosting · tap for profile</p>
            </div>
          </button>
          {!isMine && (
            <div className="flex gap-1.5 shrink-0">
              <GhostButton onClick={() => openMessages(pin.author)} className="!px-3 !py-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <MessageCircle size={14} /> Message
                </span>
              </GhostButton>
              <GhostButton onClick={handleWaveHost} disabled={waved} className="!px-3 !py-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <Hand size={14} /> {waved ? 'Waved' : 'Wave'}
                </span>
              </GhostButton>
            </div>
          )}
        </div>

        {pin.description && <p className="text-sm text-mist leading-relaxed">{pin.description}</p>}

        {pin.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pin.tags.map((t) => (
              <span key={t} className="rounded-full bg-elev border border-line px-2.5 py-1 text-[11px] font-semibold text-mist">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Capacity bar + attendees */}
        <div className="flex items-center justify-between gap-3">
          <AvatarStack users={pin.members.length > 0 ? pin.members : pin.memberPreview} total={attendees} />
          {pin.capacity !== null && (
            <div className="flex-1 max-w-[140px] h-1.5 rounded-full bg-ink/70 overflow-hidden">
              <div
                className="h-full rounded-full gradient-brand transition-all duration-500"
                style={{ width: `${Math.min(100, (attendees / pin.capacity) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* CTA */}
        {!isMine && (
          <GradientButton onClick={() => void handleJoin()} loading={busy} disabled={isFull} className="w-full">
            {joined ? (
              <>
                <LogOut size={17} /> Leave quietly
              </>
            ) : isFull ? (
              'This table is full'
            ) : (
              <>
                <UserPlus size={17} /> {pin.type === 'TABLE' ? 'Take a seat' : 'Count me in'}
              </>
            )}
          </GradientButton>
        )}

        {/* Icebreaker */}
        {pin.icebreakers.length > 0 && (joined || isMine) && (
          <div className="rounded-2xl bg-amber-400/8 border border-amber-300/20 p-3.5 flex items-start gap-2.5">
            <Lightbulb size={16} className="text-amber-300 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80 mb-1">Icebreaker</p>
              <p className="text-[13px] text-amber-100/90 leading-snug">{pin.icebreakers[ibIndex % pin.icebreakers.length]}</p>
            </div>
            <button
              type="button"
              onClick={() => setIbIndex((i) => i + 1)}
              aria-label="Next icebreaker"
              className="text-amber-300/70 hover:text-amber-200 cursor-pointer p-1 -m-1 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}

        {/* Chat */}
        <div>
          <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-faint mb-2">
            {pin.type === 'TABLE' ? 'Table talk' : 'The thread'}
          </p>
          <div className="space-y-3 max-h-56 overflow-y-auto scroll-thin pr-1">
            {messages.length === 0 && (
              <p className="text-xs text-faint italic py-2">No messages yet — break the ice.</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => openProfile(m.user.id)}
                  aria-label={`View ${m.user.name}'s profile`}
                  className="cursor-pointer rounded-full transition-transform hover:scale-105 shrink-0"
                >
                  <Avatar id={m.user.id} name={m.user.name} size="xs" />
                </button>
                <div className="min-w-0">
                  <p className="text-[11px] text-mist">
                    <span className="font-semibold text-frost">{m.user.id === me?.id ? 'You' : m.user.name.split(' ')[0]}</span>
                    <span className="text-faint"> · {ago(m.createdAt)}</span>
                  </p>
                  <p className="text-[13px] text-frost/90 leading-snug break-words">{m.body}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {joined || isMine ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Say something…"
                aria-label="Chat message"
                maxLength={500}
                className="flex-1 bg-ink/55 border border-line rounded-xl px-3.5 py-2.5 text-sm text-frost placeholder-faint outline-none focus:border-accent/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!draft.trim()}
                aria-label="Send message"
                className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white cursor-pointer transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-faint glass rounded-xl px-3.5 py-2.5">
              Join this vibe to unlock the chat.
            </p>
          )}
        </div>

        {isMine && (
          <button
            type="button"
            onClick={() => void deletePin(pin.id)}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-400/80 hover:text-rose-300 cursor-pointer transition-colors"
          >
            <Trash2 size={13} /> Take down this pin
          </button>
        )}
      </div>
    </Sheet>
  );
}
