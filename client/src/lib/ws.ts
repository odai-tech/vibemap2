/** Reconnecting WebSocket client wired into the store. */
import { setState, toast, upsertPins, removePin, getState } from '@/state/store';
import { handleDmEvent } from './dm';
import type { ChatMessage, ClientEvent, ServerEvent } from '@shared/types';

let socket: WebSocket | null = null;
let retries = 0;
let closedByUs = false;

type ChatListener = (message: ChatMessage) => void;
const chatListeners = new Set<ChatListener>();

export function onChat(listener: ChatListener): () => void {
  chatListeners.add(listener);
  return () => chatListeners.delete(listener);
}

export function wsSend(event: ClientEvent): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
}

export function subscribePin(pinId: string): () => void {
  wsSend({ t: 'sub', pinId });
  return () => wsSend({ t: 'unsub', pinId });
}

function handle(event: ServerEvent): void {
  switch (event.t) {
    case 'hello':
    case 'presence':
      setState({ online: Math.max(1, event.online) });
      break;
    case 'pin:new': {
      upsertPins([event.pin]);
      const me = getState().me;
      if (me && event.pin.author.id !== me.id) {
        toast(`New vibe dropped: “${event.pin.title}”`, 'info');
      }
      break;
    }
    case 'pin:update':
      setState((s) => {
        const pin = s.pins[event.pinId];
        if (!pin) return {};
        return {
          pins: {
            ...s.pins,
            [event.pinId]: { ...pin, attendees: event.attendees, memberPreview: event.memberPreview },
          },
        };
      });
      break;
    case 'pin:remove':
      removePin(event.pinId);
      break;
    case 'chat':
      for (const l of chatListeners) l(event.message);
      break;
    case 'dm':
      handleDmEvent(event.message, event.from);
      break;
    case 'notification':
      setState((s) => ({
        unread: s.unread + 1,
        notifications: s.notifLoaded ? [event.notification, ...s.notifications] : s.notifications,
      }));
      toast(event.notification.body, 'info');
      break;
  }
}

export function connectWs(): void {
  closedByUs = false;
  open();
}

function open(): void {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(`${proto}://${location.host}/ws`);

  socket.onopen = () => {
    retries = 0;
  };
  socket.onmessage = (e) => {
    try {
      handle(JSON.parse(e.data as string) as ServerEvent);
    } catch {
      /* ignore malformed frames */
    }
  };
  socket.onclose = () => {
    socket = null;
    if (closedByUs || getState().boot !== 'ready') return;
    const delay = Math.min(15_000, 800 * 2 ** retries);
    retries += 1;
    setTimeout(open, delay);
  };
  socket.onerror = () => socket?.close();
}

export function disconnectWs(): void {
  closedByUs = true;
  socket?.close();
  socket = null;
}
