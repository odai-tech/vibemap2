import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, MessageCircle, Send, X } from 'lucide-react';
import type { DmMessage, DmThread, UserLite } from '@shared/types';
import { api } from '@/lib/api';
import { backToInbox, closeMessages, loadDmThreads, onDm } from '@/lib/dm';
import { ago } from '@/lib/format';
import { useStore, setState, toast } from '@/state/store';
import { openProfile } from '@/state/actions';
import { Sheet } from '@/components/ui/Sheet';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, RowSkeleton, Verified } from '@/components/ui/bits';

export function MessagesSheet() {
  const dm = useStore((s) => s.dm);
  return (
    <Sheet open={dm.open} onClose={closeMessages} label="Messages" height="tall">
      {dm.withUser ? <Thread other={dm.withUser} /> : <Inbox threads={dm.threads} loaded={dm.threadsLoaded} />}
    </Sheet>
  );
}

/* ---------------- inbox ---------------- */

function Inbox({ threads, loaded }: { threads: DmThread[]; loaded: boolean }) {
  return (
    <div className="px-5 pb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-bold text-2xl">Messages</h2>
        <button
          type="button"
          onClick={closeMessages}
          aria-label="Close messages"
          className="w-7 h-7 rounded-full glass flex items-center justify-center text-mist hover:text-frost cursor-pointer transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <p className="text-sm text-mist mb-4">Conversations start on a pin or a profile.</p>

      {!loaded ? (
        <RowSkeleton count={3} />
      ) : threads.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={24} />}
          title="No messages yet"
          hint="Open someone's profile — the host of any vibe is one tap away."
        />
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <button
              key={t.user.id}
              type="button"
              onClick={() => setState((s) => ({ dm: { ...s.dm, withUser: t.user } }))}
              className="w-full glass rounded-2xl p-3 flex items-center gap-3 cursor-pointer text-left transition-colors hover:border-white/25"
            >
              <Avatar id={t.user.id} name={t.user.name} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold flex items-center gap-1 truncate">
                  {t.user.name} {t.user.verified && <Verified size={13} />}
                  <span className="ml-auto text-[10px] font-medium text-faint shrink-0">{ago(t.lastAt)}</span>
                </p>
                <p className={clsx('text-xs truncate mt-0.5', t.unread > 0 ? 'text-frost font-semibold' : 'text-mist')}>
                  {t.lastFromMe ? 'You: ' : ''}
                  {t.lastBody}
                </p>
              </div>
              {t.unread > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full gradient-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  <span className="relative z-10">{t.unread > 9 ? '9+' : t.unread}</span>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- one conversation ---------------- */

function Thread({ other }: { other: UserLite }) {
  const me = useStore((s) => s.me);
  const [messages, setMessages] = useState<DmMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setMessages(null);
    void (async () => {
      try {
        const { messages: msgs } = await api.dmMessages(other.id);
        if (cancelled) return;
        setMessages(msgs);
        void loadDmThreads(); // the GET cleared this thread's unread — resync the badge
      } catch {
        if (!cancelled) {
          toast('Could not load this conversation', 'error');
          backToInbox();
        }
      }
    })();
    const unsub = onDm((m) => {
      if (m.from !== other.id && m.to !== other.id) return;
      setMessages((cur) => (cur && !cur.some((x) => x.id === m.id) ? [...cur, m] : cur));
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [other.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages?.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      const { message } = await api.dmSend(other.id, body);
      setMessages((cur) => (cur && !cur.some((x) => x.id === message.id) ? [...cur, message] : cur));
    } catch (err) {
      setDraft(body);
      toast(err instanceof Error ? err.message : 'Message failed', 'error');
    }
  };

  return (
    <div className="px-5 pb-5 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-line shrink-0">
        <button
          type="button"
          onClick={backToInbox}
          aria-label="Back to messages"
          className="w-8 h-8 rounded-full glass flex items-center justify-center text-mist hover:text-frost cursor-pointer transition-colors shrink-0"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            closeMessages();
            openProfile(other.id);
          }}
          className="flex items-center gap-2.5 cursor-pointer min-w-0 rounded-xl transition-opacity hover:opacity-80"
          aria-label={`View ${other.name}'s profile`}
        >
          <Avatar id={other.id} name={other.name} size="md" />
          <span className="min-w-0 text-left">
            <span className="text-sm font-semibold flex items-center gap-1 truncate">
              {other.name} {other.verified && <Verified size={13} />}
            </span>
            <span className="block text-[11px] text-mist truncate">@{other.handle}</span>
          </span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin py-4 space-y-2.5">
        {messages === null ? (
          <RowSkeleton count={3} />
        ) : messages.length === 0 ? (
          <p className="text-xs text-faint italic text-center py-8">
            Say hi — {other.name.split(' ')[0]} will get it instantly.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.from === me?.id;
            return (
              <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={clsx(
                    'max-w-[78%] rounded-2xl px-3.5 py-2.5',
                    mine ? 'gradient-brand text-white rounded-br-md' : 'glass text-frost rounded-bl-md',
                  )}
                >
                  <p className="relative z-10 text-[13px] leading-snug break-words whitespace-pre-wrap">{m.body}</p>
                  <p className={clsx('relative z-10 text-[9px] mt-1', mine ? 'text-white/70' : 'text-faint')}>
                    {ago(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 pt-2 shrink-0">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={`Message ${other.name.split(' ')[0]}…`}
          aria-label="Direct message"
          maxLength={1000}
          className="flex-1 bg-ink/55 border border-line rounded-xl px-3.5 py-2.5 text-sm text-frost placeholder-faint outline-none focus:border-accent/50 transition-colors"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!draft.trim()}
          aria-label="Send message"
          className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white cursor-pointer transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
