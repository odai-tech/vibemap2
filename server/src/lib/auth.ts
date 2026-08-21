/**
 * Password hashing (scrypt from node:crypto — no third-party crypto) and
 * cookie sessions stored hashed in SQLite.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { q } from './db.ts';
import { HttpError, type Ctx } from './http.ts';
import { config } from '../config.ts';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const SCRYPT_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, SCRYPT_LEN);
  return `s1$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [v, saltB64, hashB64] = stored.split('$');
  if (v !== 's1' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64url');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64url'), SCRYPT_LEN);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  q('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    now,
    now + config.sessionTtlMs,
  );
  // Opportunistic cleanup of expired sessions.
  q('DELETE FROM sessions WHERE expires_at < ?').run(now);
  return token;
}

export function destroySession(token: string): void {
  q('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function sessionUserId(token: string | undefined): string | null {
  if (!token) return null;
  const row = q('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(hashToken(token)) as
    | { user_id: string; expires_at: number }
    | undefined;
  if (!row || row.expires_at < Date.now()) return null;
  return row.user_id;
}

/**
 * last_seen only needs ~minute granularity (isOnline uses a 10-minute window),
 * so throttle the write instead of hitting the WAL on every request.
 */
const lastSeenFlushed = new Map<string, number>();
const LAST_SEEN_INTERVAL_MS = 60_000;

function touchLastSeen(userId: string): void {
  const now = Date.now();
  if ((lastSeenFlushed.get(userId) ?? 0) > now - LAST_SEEN_INTERVAL_MS) return;
  if (lastSeenFlushed.size > 50_000) lastSeenFlushed.clear();
  lastSeenFlushed.set(userId, now);
  q('UPDATE users SET last_seen = ? WHERE id = ?').run(now, userId);
}

/** Resolves the session for a ctx; throws 401 if absent. */
export function requireAuth(ctx: Ctx): string {
  const userId = sessionUserId(ctx.cookies[config.sessionCookie]);
  if (!userId) throw new HttpError(401, 'Sign in required');
  ctx.userId = userId;
  touchLastSeen(userId);
  return userId;
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
}
