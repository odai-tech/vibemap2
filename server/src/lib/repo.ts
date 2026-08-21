/**
 * Row → shared-type mappers and common queries.
 *
 * Hydration is batched: turning N pins into summaries costs a fixed handful
 * of queries, never N+1. Dynamic IN(...) lists are padded to power-of-two
 * buckets so the prepared-statement cache stays small.
 */
import { q } from './db.ts';
import { EVENT_LINGER_MS } from '../../../shared/vibes.ts';
import type {
  AppNotification,
  ChatMessage,
  Me,
  NotificationKind,
  PinSummary,
  PublicUser,
  UserLite,
  UserStats,
  VibeCategory,
} from '../../../shared/types.ts';

/* ---------------- batching helpers ---------------- */

const CHUNK = 256;

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

/** Pads to the next power of two (duplicates are harmless in IN lists). */
function pad(ids: string[]): string[] {
  let size = 1;
  while (size < ids.length) size *= 2;
  const out = ids.slice();
  while (out.length < size) out.push(out[out.length - 1]);
  return out;
}

function marks(n: number): string {
  return Array(n).fill('?').join(',');
}

/* ---------------- users ---------------- */

export interface UserRow {
  id: string;
  email: string;
  handle: string;
  name: string;
  bio: string;
  interests: string;
  verified: number;
  open_to_meet: number;
  status_line: string;
  last_lat: number | null;
  last_lng: number | null;
  last_seen: number;
}

type LiteRow = Pick<UserRow, 'id' | 'handle' | 'name' | 'verified'>;

export function userRow(id: string): UserRow | undefined {
  return q('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function toLite(row: LiteRow): UserLite {
  return { id: row.id, handle: row.handle, name: row.name, verified: !!row.verified };
}

function ghost(id: string): UserLite {
  return { id, handle: 'ghost', name: 'Ghost', verified: false };
}

/** Batched UserLite lookup — one query per 256 ids. */
export function litesById(ids: string[]): Map<string, UserLite> {
  const out = new Map<string, UserLite>();
  const unique = [...new Set(ids)];
  for (const chunk of chunks(unique)) {
    const padded = pad(chunk);
    const rows = q(`SELECT id, handle, name, verified FROM users WHERE id IN (${marks(padded.length)})`).all(
      ...padded,
    ) as unknown as LiteRow[];
    for (const r of rows) out.set(r.id, toLite(r));
  }
  return out;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    ...toLite(row),
    bio: row.bio,
    interests: JSON.parse(row.interests) as string[],
    openToMeet: !!row.open_to_meet,
    statusLine: row.status_line,
    lastSeen: row.last_seen,
  };
}

export function userStats(userId: string): UserStats {
  return q(
    `SELECT
       (SELECT COUNT(*) FROM pin_members WHERE user_id = ?) AS joined,
       (SELECT COUNT(*) FROM pins WHERE author_id = ? AND deleted = 0) AS hosted,
       (SELECT COUNT(*) FROM friendships WHERE status = 'accepted' AND (a = ? OR b = ?)) AS friends,
       (SELECT COUNT(*) FROM messages WHERE user_id = ?) AS messages,
       (SELECT COUNT(DISTINCT p.category) FROM pin_members m JOIN pins p ON p.id = m.pin_id WHERE m.user_id = ?) AS categories`,
  ).get(userId, userId, userId, userId, userId, userId) as unknown as UserStats;
}

export function toMe(row: UserRow): Me {
  return { ...toPublicUser(row), email: row.email, stats: userStats(row.id) };
}

export function sharedInterests(a: string[], b: string[]): string[] {
  const set = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => set.has(x.toLowerCase()));
}

/* ---------------- pins ---------------- */

export interface PinRow {
  id: string;
  type: string;
  category: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  tags: string;
  author_id: string;
  created_at: number;
  starts_at: number | null;
  expires_at: number | null;
  capacity: number | null;
  cover: number;
}

export function isPinActive(row: PinRow, now: number): boolean {
  if (row.expires_at !== null && row.expires_at < now) return false;
  if (row.starts_at !== null && row.starts_at + EVENT_LINGER_MS < now) return false;
  return true;
}

export function isPinLive(row: PinRow, now: number): boolean {
  if (row.type === 'MOMENT') return true;
  if (row.starts_at === null) return false;
  return row.starts_at - 30 * 60_000 <= now && now <= row.starts_at + EVENT_LINGER_MS;
}

export function memberPreview(pinId: string): UserLite[] {
  const rows = q(
    `SELECT u.id, u.handle, u.name, u.verified
     FROM pin_members m JOIN users u ON u.id = m.user_id
     WHERE m.pin_id = ? ORDER BY m.joined_at ASC LIMIT 4`,
  ).all(pinId) as unknown as LiteRow[];
  return rows.map(toLite);
}

export function attendeeCount(pinId: string): number {
  return (q('SELECT COUNT(*) AS n FROM pin_members WHERE pin_id = ?').get(pinId) as { n: number }).n;
}

/** Hydrates many pins with a fixed number of queries (not 4 per pin). */
export function toPinSummaries(rows: PinRow[], viewerId: string | null, now = Date.now()): PinSummary[] {
  if (rows.length === 0) return [];

  const authors = litesById(rows.map((r) => r.author_id));
  const counts = new Map<string, number>();
  const previews = new Map<string, UserLite[]>();
  const joined = new Set<string>();

  for (const chunk of chunks(rows.map((r) => r.id))) {
    const padded = pad(chunk);
    const ph = marks(padded.length);

    const countRows = q(
      `SELECT pin_id, COUNT(*) AS n FROM pin_members WHERE pin_id IN (${ph}) GROUP BY pin_id`,
    ).all(...padded) as unknown as Array<{ pin_id: string; n: number }>;
    for (const r of countRows) counts.set(r.pin_id, r.n);

    const previewRows = q(
      `SELECT pin_id, id, handle, name, verified FROM (
         SELECT m.pin_id, u.id, u.handle, u.name, u.verified,
                ROW_NUMBER() OVER (PARTITION BY m.pin_id ORDER BY m.joined_at ASC) AS rn
         FROM pin_members m JOIN users u ON u.id = m.user_id
         WHERE m.pin_id IN (${ph})
       ) WHERE rn <= 4`,
    ).all(...padded) as unknown as Array<LiteRow & { pin_id: string }>;
    for (const r of previewRows) {
      const list = previews.get(r.pin_id) ?? [];
      list.push(toLite(r));
      previews.set(r.pin_id, list);
    }

    if (viewerId) {
      const joinedRows = q(`SELECT pin_id FROM pin_members WHERE user_id = ? AND pin_id IN (${ph})`).all(
        viewerId,
        ...padded,
      ) as unknown as Array<{ pin_id: string }>;
      for (const r of joinedRows) joined.add(r.pin_id);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    type: row.type as PinSummary['type'],
    category: row.category as VibeCategory,
    lat: row.lat,
    lng: row.lng,
    title: row.title,
    description: row.description,
    tags: JSON.parse(row.tags) as string[],
    author: authors.get(row.author_id) ?? ghost(row.author_id),
    createdAt: row.created_at,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    capacity: row.capacity,
    attendees: counts.get(row.id) ?? 0,
    memberPreview: previews.get(row.id) ?? [],
    joined: joined.has(row.id),
    live: isPinLive(row, now),
    cover: row.cover,
  }));
}

export function toPinSummary(row: PinRow, viewerId: string | null, now = Date.now()): PinSummary {
  return toPinSummaries([row], viewerId, now)[0];
}

/** Active pins, filtered in SQL (no full-table load + JS filter). */
export function activePinRows(now = Date.now()): PinRow[] {
  return q(
    `SELECT * FROM pins
     WHERE deleted = 0
       AND (expires_at IS NULL OR expires_at >= ?)
       AND (starts_at IS NULL OR starts_at + ${EVENT_LINGER_MS} >= ?)`,
  ).all(now, now) as unknown as PinRow[];
}

/* ---------------- chat ---------------- */

interface MessageRow {
  id: string;
  pin_id: string;
  user_id: string;
  body: string;
  created_at: number;
}

export function toChatMessage(row: MessageRow): ChatMessage {
  const user = userRow(row.user_id);
  return {
    id: row.id,
    pinId: row.pin_id,
    user: user ? toLite(user) : ghost(row.user_id),
    body: row.body,
    createdAt: row.created_at,
  };
}

/** One query: messages + sender info joined. Oldest-first. */
export function chatMessages(pinId: string, before: number, limit = 50): ChatMessage[] {
  const rows = q(
    `SELECT m.id, m.pin_id, m.user_id, m.body, m.created_at, u.handle, u.name, u.verified
     FROM messages m LEFT JOIN users u ON u.id = m.user_id
     WHERE m.pin_id = ? AND m.created_at < ?
     ORDER BY m.created_at DESC LIMIT ?`,
  ).all(pinId, before, limit) as unknown as Array<MessageRow & { handle: string | null; name: string | null; verified: number | null }>;
  return rows
    .map((r) => ({
      id: r.id,
      pinId: r.pin_id,
      user: r.handle !== null ? { id: r.user_id, handle: r.handle, name: r.name!, verified: !!r.verified } : ghost(r.user_id),
      body: r.body,
      createdAt: r.created_at,
    }))
    .reverse();
}

/* ---------------- notifications ---------------- */

interface NotificationRow {
  id: string;
  user_id: string;
  kind: string;
  actor_id: string | null;
  pin_id: string | null;
  body: string;
  created_at: number;
  read: number;
}

export function toNotification(row: NotificationRow): AppNotification {
  const actor = row.actor_id ? userRow(row.actor_id) : undefined;
  const pin = row.pin_id
    ? (q('SELECT id, title, category FROM pins WHERE id = ?').get(row.pin_id) as
        | { id: string; title: string; category: string }
        | undefined)
    : undefined;
  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    actor: actor ? toLite(actor) : null,
    pin: pin ? { id: pin.id, title: pin.title, category: pin.category as VibeCategory } : null,
    body: row.body,
    createdAt: row.created_at,
    read: !!row.read,
  };
}

/** One query: notifications with actor + pin joined. */
export function notificationsFor(userId: string, limit = 50): AppNotification[] {
  const rows = q(
    `SELECT n.id, n.kind, n.actor_id, n.pin_id, n.body, n.created_at, n.read,
            u.handle AS a_handle, u.name AS a_name, u.verified AS a_verified,
            p.title AS p_title, p.category AS p_category
     FROM notifications n
     LEFT JOIN users u ON u.id = n.actor_id
     LEFT JOIN pins p ON p.id = n.pin_id
     WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?`,
  ).all(userId, limit) as unknown as Array<
    NotificationRow & {
      a_handle: string | null;
      a_name: string | null;
      a_verified: number | null;
      p_title: string | null;
      p_category: string | null;
    }
  >;
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as NotificationKind,
    actor:
      r.actor_id && r.a_handle !== null
        ? { id: r.actor_id, handle: r.a_handle, name: r.a_name!, verified: !!r.a_verified }
        : null,
    pin: r.pin_id && r.p_title !== null ? { id: r.pin_id, title: r.p_title, category: r.p_category as VibeCategory } : null,
    body: r.body,
    createdAt: r.created_at,
    read: !!r.read,
  }));
}

/* ---------------- friendships ---------------- */

export function pairKey(u1: string, u2: string): [string, string] {
  return u1 < u2 ? [u1, u2] : [u2, u1];
}

export function friendshipRow(u1: string, u2: string) {
  const [a, b] = pairKey(u1, u2);
  return q('SELECT * FROM friendships WHERE a = ? AND b = ?').get(a, b) as
    | { a: string; b: string; status: string; requested_by: string }
    | undefined;
}

export function friendIdsOf(userId: string): string[] {
  const rows = q("SELECT a, b FROM friendships WHERE status = 'accepted' AND (a = ? OR b = ?)").all(
    userId,
    userId,
  ) as Array<{ a: string; b: string }>;
  return rows.map((r) => (r.a === userId ? r.b : r.a));
}

/** First pin both users are members of — friendly context line. */
export function sharedPinContext(u1: string, u2: string): string | null {
  const row = q(
    `SELECT p.title FROM pin_members m1
     JOIN pin_members m2 ON m1.pin_id = m2.pin_id AND m2.user_id = ?
     JOIN pins p ON p.id = m1.pin_id AND p.deleted = 0
     WHERE m1.user_id = ? LIMIT 1`,
  ).get(u2, u1) as { title: string } | undefined;
  return row ? `Both in “${row.title}”` : null;
}

/** Batched version: userId → context line, for everyone sharing a pin with `userId`. */
export function sharedPinContexts(userId: string): Map<string, string> {
  const rows = q(
    `SELECT other_id, title FROM (
       SELECT m2.user_id AS other_id, p.title,
              ROW_NUMBER() OVER (PARTITION BY m2.user_id ORDER BY p.created_at DESC) AS rn
       FROM pin_members m1
       JOIN pin_members m2 ON m2.pin_id = m1.pin_id AND m2.user_id != m1.user_id
       JOIN pins p ON p.id = m1.pin_id AND p.deleted = 0
       WHERE m1.user_id = ?
     ) WHERE rn = 1`,
  ).all(userId) as unknown as Array<{ other_id: string; title: string }>;
  const out = new Map<string, string>();
  for (const r of rows) out.set(r.other_id, `Both in “${r.title}”`);
  return out;
}
