import type { App } from '../lib/http.ts';
import { HttpError } from '../lib/http.ts';
import { q } from '../lib/db.ts';
import { newId, requireAuth } from '../lib/auth.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { asRecord, num, oneOf, optNum, optStr, str, strArray } from '../lib/validate.ts';
import {
  activePinRows,
  attendeeCount,
  chatMessages,
  isPinActive,
  memberPreview,
  toChatMessage,
  toLite,
  toPinSummaries,
  toPinSummary,
  userRow,
  type PinRow,
} from '../lib/repo.ts';
import { icebreakers } from '../lib/vibe.ts';
import { broadcast, toRoom } from '../lib/ws.ts';
import { notify } from '../lib/notify.ts';
import { PIN_TYPES, VIBE_CATEGORIES, type VibeCategory } from '../../../shared/types.ts';
import { TYPE_META } from '../../../shared/vibes.ts';

function getActivePin(id: string): PinRow {
  const row = q('SELECT * FROM pins WHERE id = ? AND deleted = 0').get(id) as PinRow | undefined;
  if (!row || !isPinActive(row, Date.now())) throw new HttpError(404, 'This vibe has faded away');
  return row;
}

export function pinRoutes(app: App): void {
  app.get('/api/pins', (ctx) => {
    const userId = requireAuth(ctx);
    let rows = activePinRows();

    const bbox = ctx.query.get('bbox');
    if (bbox) {
      const [w, s, e, n] = bbox.split(',').map(Number);
      if ([w, s, e, n].some((v) => !Number.isFinite(v))) throw new HttpError(400, 'Bad bbox');
      rows = rows.filter((r) => r.lat >= s && r.lat <= n && r.lng >= w && r.lng <= e);
    }
    const category = ctx.query.get('category');
    if (category) rows = rows.filter((r) => r.category === category);

    rows.sort((a, b) => b.created_at - a.created_at);
    return { pins: toPinSummaries(rows.slice(0, 200), userId) };
  });

  app.post('/api/pins', (ctx) => {
    const userId = requireAuth(ctx);
    rateLimit(`pin:${userId}`, 12, 10 * 60_000);
    const body = asRecord(ctx.body);

    const type = oneOf(body.type, 'type', PIN_TYPES);
    const category = oneOf(body.category, 'category', VIBE_CATEGORIES);
    const lat = num(body.lat, 'lat', { min: -90, max: 90 });
    const lng = num(body.lng, 'lng', { min: -180, max: 180 });
    const title = str(body.title, 'title', { min: 3, max: 70 });
    const description = optStr(body.description, 'description', { max: 400 });
    const tags = strArray(body.tags, 'tags', { maxItems: 6, maxLen: 24 });
    const startsAt = optNum(body.startsAt, 'startsAt', { min: Date.now() - 3600_000, max: Date.now() + 30 * 86400_000 });
    let capacity = optNum(body.capacity, 'capacity', { min: 2, max: 500 });

    if (type === 'TABLE') {
      if (capacity === null) capacity = 6;
      if (capacity > 8) throw new HttpError(400, 'Tables keep it intimate — max 8 seats');
    }

    const ttl = TYPE_META[type].defaultTtlMs;
    const now = Date.now();
    const expiresAt = ttl !== null ? now + ttl : null;
    const id = newId('p');

    q(
      `INSERT INTO pins (id, type, category, lat, lng, title, description, tags, author_id, created_at, starts_at, expires_at, capacity, cover, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    ).run(
      id,
      type,
      category,
      lat,
      lng,
      title,
      description,
      JSON.stringify(tags),
      userId,
      now,
      startsAt,
      expiresAt,
      capacity,
      Math.floor(Math.random() * 8),
    );
    // The host is always in.
    q('INSERT INTO pin_members (pin_id, user_id, joined_at) VALUES (?, ?, ?)').run(id, userId, now);

    const pin = toPinSummary(q('SELECT * FROM pins WHERE id = ?').get(id) as unknown as PinRow, userId);
    broadcast({ t: 'pin:new', pin });
    return { pin };
  });

  app.get('/api/pins/:id', (ctx) => {
    const userId = requireAuth(ctx);
    const row = getActivePin(ctx.params.id);
    const summary = toPinSummary(row, userId);
    const members = (
      q(
        `SELECT u.id, u.handle, u.name, u.verified FROM pin_members m JOIN users u ON u.id = m.user_id
         WHERE m.pin_id = ? ORDER BY m.joined_at ASC LIMIT 50`,
      ).all(row.id) as Array<{ id: string; handle: string; name: string; verified: number }>
    ).map(toLite);
    return {
      pin: {
        ...summary,
        members,
        icebreakers: icebreakers(row.category as VibeCategory, JSON.parse(row.tags) as string[]),
      },
    };
  });

  app.delete('/api/pins/:id', (ctx) => {
    const userId = requireAuth(ctx);
    const row = getActivePin(ctx.params.id);
    if (row.author_id !== userId) throw new HttpError(403, 'Only the host can take this down');
    q('UPDATE pins SET deleted = 1 WHERE id = ?').run(row.id);
    broadcast({ t: 'pin:remove', pinId: row.id });
    return { ok: true };
  });

  const announceMembership = (pinId: string) => {
    broadcast({ t: 'pin:update', pinId, attendees: attendeeCount(pinId), memberPreview: memberPreview(pinId) });
  };

  app.post('/api/pins/:id/join', (ctx) => {
    const userId = requireAuth(ctx);
    rateLimit(`join:${userId}`, 30, 10 * 60_000);
    const row = getActivePin(ctx.params.id);

    if (q('SELECT 1 AS x FROM pin_members WHERE pin_id = ? AND user_id = ?').get(row.id, userId)) {
      return { pin: toPinSummary(row, userId) };
    }
    if (row.capacity !== null && attendeeCount(row.id) >= row.capacity) {
      throw new HttpError(409, 'This table is full');
    }
    q('INSERT INTO pin_members (pin_id, user_id, joined_at) VALUES (?, ?, ?)').run(row.id, userId, Date.now());

    const joiner = userRow(userId)!;
    notify(row.author_id, 'join', {
      actorId: userId,
      pinId: row.id,
      body: `${joiner.name} joined “${row.title}”`,
    });
    announceMembership(row.id);
    return { pin: toPinSummary(row, userId) };
  });

  app.post('/api/pins/:id/leave', (ctx) => {
    const userId = requireAuth(ctx);
    const row = getActivePin(ctx.params.id);
    if (row.author_id === userId) throw new HttpError(400, 'Hosts cannot leave — delete the pin instead');
    q('DELETE FROM pin_members WHERE pin_id = ? AND user_id = ?').run(row.id, userId);
    announceMembership(row.id);
    return { pin: toPinSummary(row, userId) };
  });

  /* ----- chat ----- */

  app.get('/api/pins/:id/messages', (ctx) => {
    requireAuth(ctx);
    const row = getActivePin(ctx.params.id);
    const before = Number(ctx.query.get('before') || Date.now() + 1);
    return { messages: chatMessages(row.id, before) };
  });

  app.post('/api/pins/:id/messages', (ctx) => {
    const userId = requireAuth(ctx);
    rateLimit(`chat:${userId}`, 25, 30_000);
    const row = getActivePin(ctx.params.id);
    if (!q('SELECT 1 AS x FROM pin_members WHERE pin_id = ? AND user_id = ?').get(row.id, userId)) {
      throw new HttpError(403, 'Join this vibe to chat');
    }
    const body = str(asRecord(ctx.body).body, 'message', { min: 1, max: 500 });
    const id = newId('m');
    q('INSERT INTO messages (id, pin_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      row.id,
      userId,
      body,
      Date.now(),
    );
    const message = toChatMessage(q('SELECT * FROM messages WHERE id = ?').get(id) as never);
    toRoom(row.id, { t: 'chat', message });
    return { message };
  });
}
