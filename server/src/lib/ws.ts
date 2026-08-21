/**
 * WebSocket hub: session-authenticated connections, per-pin chat rooms,
 * presence counting, and targeted/broadcast pushes.
 */
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';
import { sessionUserId } from './auth.ts';
import { config } from '../config.ts';
import type { ClientEvent, ServerEvent } from '../../../shared/types.ts';

interface Client {
  ws: WebSocket;
  userId: string;
  subs: Set<string>;
  alive: boolean;
  msgTimes: number[];
}

const clients = new Set<Client>();
const wss = new WebSocketServer({ noServer: true });

export function onlineCount(): number {
  return new Set([...clients].map((c) => c.userId)).size;
}

export function broadcast(event: ServerEvent): void {
  const payload = JSON.stringify(event);
  for (const c of clients) if (c.ws.readyState === WebSocket.OPEN) c.ws.send(payload);
}

export function toUser(userId: string, event: ServerEvent): void {
  const payload = JSON.stringify(event);
  for (const c of clients) {
    if (c.userId === userId && c.ws.readyState === WebSocket.OPEN) c.ws.send(payload);
  }
}

export function toRoom(pinId: string, event: ServerEvent): void {
  const payload = JSON.stringify(event);
  for (const c of clients) {
    if (c.subs.has(pinId) && c.ws.readyState === WebSocket.OPEN) c.ws.send(payload);
  }
}

let presenceTimer: NodeJS.Timeout | null = null;
function schedulePresenceBroadcast() {
  if (presenceTimer) return;
  presenceTimer = setTimeout(() => {
    presenceTimer = null;
    broadcast({ t: 'presence', online: onlineCount() });
  }, 400);
}

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser client
  try {
    const o = new URL(origin);
    if (o.host === req.headers.host) return true;
    // Vite dev server proxies WS but browsers may connect directly during dev.
    if (!config.production && (o.hostname === 'localhost' || o.hostname === '127.0.0.1')) return true;
    return false;
  } catch {
    return false;
  }
}

export function attachWebSockets(server: HttpServer): void {
  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname !== '/ws' || !originAllowed(req)) {
      socket.destroy();
      return;
    }
    const userId = sessionUserId(parseCookie(req.headers.cookie, config.sessionCookie));
    if (!userId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const client: Client = { ws, userId, subs: new Set(), alive: true, msgTimes: [] };
      clients.add(client);
      ws.send(JSON.stringify({ t: 'hello', online: onlineCount() } satisfies ServerEvent));
      schedulePresenceBroadcast();

      ws.on('pong', () => {
        client.alive = true;
      });

      ws.on('message', (data) => {
        const text = data.toString();
        if (text.length > 1024) return;
        // Cheap flood guard: max 20 control messages / 5s.
        const now = Date.now();
        client.msgTimes = client.msgTimes.filter((t) => now - t < 5000);
        if (client.msgTimes.length >= 20) return;
        client.msgTimes.push(now);

        let event: ClientEvent;
        try {
          event = JSON.parse(text) as ClientEvent;
        } catch {
          return;
        }
        if (event.t === 'sub' && typeof event.pinId === 'string') {
          if (client.subs.size < 8) client.subs.add(event.pinId);
        } else if (event.t === 'unsub' && typeof event.pinId === 'string') {
          client.subs.delete(event.pinId);
        }
        // 'ping' needs no handling — any frame proves liveness.
      });

      ws.on('close', () => {
        clients.delete(client);
        schedulePresenceBroadcast();
      });
      ws.on('error', () => ws.close());
    });
  });

  const heartbeat = setInterval(() => {
    for (const c of clients) {
      if (!c.alive) {
        c.ws.terminate();
        clients.delete(c);
        continue;
      }
      c.alive = false;
      c.ws.ping();
    }
  }, 30_000);
  heartbeat.unref();
}
