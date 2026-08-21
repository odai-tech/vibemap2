/**
 * Direct messages. Conversations are keyed by the user-id pair (a < b);
 * dm_threads keeps one row per conversation so the inbox and unread badges
 * never scan the message table.
 */
import type { App } from '../lib/http.ts';
import { HttpError } from '../lib/http.ts';
import { q, transaction } from '../lib/db.ts';
import { newId, requireAuth } from '../lib/auth.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { asRecord, str } from '../lib/validate.ts';
import { pairKey, toLite, userRow } from '../lib/repo.ts';
import { toUser } from '../lib/ws.ts';
import type { DmMessage, DmThread } from '../../../shared/types.ts';

interface DmRow {
  id: string;
  a: string;
  b: string;
  sender_id: string;
  body: string;
  created_at: number;
}

function toDm(row: DmRow): DmMessage {
  return {
    id: row.id,
    from: row.sender_id,
    to: row.sender_id === row.a ? row.b : row.a,
    body: row.body,
    createdAt: row.created_at,
  };
}

function clearUnread(userId: string, a: string, b: string): void {
  if (userId === a) q('UPDATE dm_threads SET unread_a = 0 WHERE a = ? AND b = ?').run(a, b);
  else q('UPDATE dm_threads SET unread_b = 0 WHERE a = ? AND b = ?').run(a, b);
}

export function unreadDmCount(userId: string): number {
  const row = q(
    `SELECT COALESCE(SUM(CASE WHEN a = ? THEN unread_a ELSE unread_b END), 0) AS n
     FROM dm_threads WHERE a = ? OR b = ?`,
  ).get(userId, userId, userId) as { n: number };
  return row.n;
}

export function dmRoutes(app: App): void {
  /** Inbox: one row per conversation, newest first. */
  app.get('/api/dm', (ctx) => {
    const userId = requireAuth(ctx);
    const rows = q(
      `SELECT t.a, t.b, t.last_sender, t.last_body, t.last_at, t.unread_a, t.unread_b,
              u.id AS uid, u.handle, u.name, u.verified
       FROM dm_threads t
       JOIN users u ON u.id = CASE WHEN t.a = ? THEN t.b ELSE t.a END
       WHERE t.a = ? OR t.b = ?
       ORDER BY t.last_at DESC LIMIT 100`,
    ).all(userId, userId, userId) as unknown as Array<{
      a: string;
      b: string;
      last_sender: string;
      last_body: string;
      last_at: number;
      unread_a: number;
      unread_b: number;
      uid: string;
      handle: string;
      name: string;
      verified: number;
    }>;
    const threads: DmThread[] = rows.map((r) => ({
      user: { id: r.uid, handle: r.handle, name: r.name, verified: !!r.verified },
      lastBody: r.last_body,
      lastFromMe: r.last_sender === userId,
      lastAt: r.last_at,
      unread: r.a === userId ? r.unread_a : r.unread_b,
    }));
    return { threads };
  });

  /** Conversation with one user. Opening it clears your unread counter. */
  app.get('/api/dm/:userId', (ctx) => {
    const userId = requireAuth(ctx);
    const other = userRow(ctx.params.userId);
    if (!other) throw new HttpError(404, 'User not found');
    const [a, b] = pairKey(userId, other.id);
    const before = Number(ctx.query.get('before') || Date.now() + 1);
    const rows = q(
      'SELECT * FROM dm_messages WHERE a = ? AND b = ? AND created_at < ? ORDER BY created_at DESC LIMIT 50',
    ).all(a, b, before) as unknown as DmRow[];
    clearUnread(userId, a, b);
    return { user: toLite(other), messages: rows.map(toDm).reverse() };
  });

  /** Messages arriving while the thread is open are acked here. */
  app.post('/api/dm/:userId/read', (ctx) => {
    const userId = requireAuth(ctx);
    const [a, b] = pairKey(userId, ctx.params.userId);
    clearUnread(userId, a, b);
    return { ok: true };
  });

  app.post('/api/dm/:userId', (ctx) => {
    const userId = requireAuth(ctx);
    rateLimit(`dm:${userId}`, 30, 30_000);
    const other = userRow(ctx.params.userId);
    if (!other) throw new HttpError(404, 'User not found');
    if (other.id === userId) throw new HttpError(400, 'You cannot message yourself');
    const body = str(asRecord(ctx.body).body, 'message', { min: 1, max: 1000 });

    const [a, b] = pairKey(userId, other.id);
    const now = Date.now();
    const id = newId('dm');
    transaction(() => {
      q('INSERT INTO dm_messages (id, a, b, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        id,
        a,
        b,
        userId,
        body,
        now,
      );
      q(
        `INSERT INTO dm_threads (a, b, last_sender, last_body, last_at, unread_a, unread_b)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(a, b) DO UPDATE SET
           last_sender = excluded.last_sender,
           last_body = excluded.last_body,
           last_at = excluded.last_at,
           unread_a = unread_a + excluded.unread_a,
           unread_b = unread_b + excluded.unread_b`,
      ).run(a, b, userId, body.slice(0, 140), now, other.id === a ? 1 : 0, other.id === b ? 1 : 0);
    });

    const message: DmMessage = { id, from: userId, to: other.id, body, createdAt: now };
    const sender = toLite(userRow(userId)!);
    toUser(other.id, { t: 'dm', message, from: sender });
    // Echo to the sender's other tabs/devices so every session stays in sync.
    toUser(userId, { t: 'dm', message, from: sender });
    return { message };
  });
}
