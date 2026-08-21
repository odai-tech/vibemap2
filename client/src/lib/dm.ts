/** Direct-message state: inbox loading, sheet navigation, and live WS events. */
import { api } from './api';
import { getState, setState, toast } from '@/state/store';
import type { DmMessage, UserLite } from '@shared/types';

type DmListener = (message: DmMessage) => void;
const listeners = new Set<DmListener>();

/** Live messages for whichever thread view is open. */
export function onDm(listener: DmListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadDmThreads(): Promise<void> {
  try {
    const { threads } = await api.dmThreads();
    setState((s) => ({
      dm: { ...s.dm, threads, threadsLoaded: true, unread: threads.reduce((n, t) => n + t.unread, 0) },
    }));
  } catch {
    /* transient — badge resyncs on next open */
  }
}

/** Open the messages sheet — on a thread when `withUser` is given, else the inbox. */
export function openMessages(withUser: UserLite | null = null): void {
  setState((s) => ({ dm: { ...s.dm, open: true, withUser } }));
  void loadDmThreads();
}

export function closeMessages(): void {
  setState((s) => ({ dm: { ...s.dm, open: false, withUser: null } }));
}

export function backToInbox(): void {
  setState((s) => ({ dm: { ...s.dm, withUser: null } }));
  void loadDmThreads();
}

/** Called by the WS client for every incoming 'dm' event. */
export function handleDmEvent(message: DmMessage, from: UserLite): void {
  const s = getState();
  const mine = s.me?.id === message.from;
  const viewingThread =
    s.dm.open && s.dm.withUser !== null && (s.dm.withUser.id === message.from || s.dm.withUser.id === message.to);

  for (const l of listeners) l(message);

  if (!mine && viewingThread) {
    // Seen live — ack so the server-side unread counter stays at zero.
    void api.dmRead(message.from).catch(() => undefined);
  } else if (!mine) {
    setState((cur) => ({ dm: { ...cur.dm, unread: cur.dm.unread + 1 } }));
    toast(`${from.name.split(' ')[0]}: ${message.body.slice(0, 80)}`, 'info');
  }
  if (s.dm.threadsLoaded) void loadDmThreads();
}
