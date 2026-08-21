import type { App } from '../lib/http.ts';
import { HttpError, setSessionCookie, clearSessionCookie } from '../lib/http.ts';
import { q } from '../lib/db.ts';
import { createSession, destroySession, hashPassword, newId, requireAuth, verifyPassword } from '../lib/auth.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { asRecord, str, strArray } from '../lib/validate.ts';
import { toMe, userRow } from '../lib/repo.ts';
import { notify } from '../lib/notify.ts';
import { unreadDmCount } from './dm.ts';
import { config } from '../config.ts';
import { DEMO_USER_ID } from '../seed.ts';

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function authRoutes(app: App): void {
  app.post('/api/auth/register', async (ctx) => {
    rateLimit(`reg:${ctx.ip}`, 8, 10 * 60_000);
    const body = asRecord(ctx.body);
    const email = str(body.email, 'email', { min: 5, max: 120, pattern: EMAIL_RE }).toLowerCase();
    const password = str(body.password, 'password', { min: 8, max: 200 });
    const name = str(body.name, 'name', { min: 2, max: 40 });
    const handle = str(body.handle, 'handle', { min: 3, max: 20, pattern: HANDLE_RE });
    const interests = strArray(body.interests, 'interests', { maxItems: 12, maxLen: 30 });
    if (interests.length < 3) throw new HttpError(400, 'Pick at least 3 interests so we can match you well');

    if (q('SELECT 1 AS x FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'Email already registered');
    if (q('SELECT 1 AS x FROM users WHERE handle = ?').get(handle)) throw new HttpError(409, 'Handle already taken');

    const id = newId('u');
    q(
      `INSERT INTO users (id, email, handle, name, pass, interests, verified, open_to_meet, last_seen, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
    ).run(id, email, handle, name, await hashPassword(password), JSON.stringify(interests), Date.now(), Date.now());

    notify(id, 'system', { body: 'Welcome to VibeMap. Drop a pin or join a table — your people are out there.' });
    setSessionCookie(ctx.res, createSession(id), config.sessionTtlMs);
    return { user: toMe(userRow(id)!) };
  });

  app.post('/api/auth/login', async (ctx) => {
    rateLimit(`login:${ctx.ip}`, 10, 5 * 60_000);
    const body = asRecord(ctx.body);
    const email = str(body.email, 'email', { min: 3, max: 120 }).toLowerCase();
    const password = str(body.password, 'password', { min: 1, max: 200 });

    const row = q('SELECT id, pass FROM users WHERE email = ?').get(email) as { id: string; pass: string } | undefined;
    const ok = row ? await verifyPassword(password, row.pass) : false;
    if (!row || !ok) throw new HttpError(401, 'Wrong email or password');

    setSessionCookie(ctx.res, createSession(row.id), config.sessionTtlMs);
    return { user: toMe(userRow(row.id)!) };
  });

  app.post('/api/auth/demo', (ctx) => {
    if (!config.demoEnabled) throw new HttpError(403, 'Demo login is disabled');
    rateLimit(`demo:${ctx.ip}`, 20, 10 * 60_000);
    const row = userRow(DEMO_USER_ID);
    if (!row) throw new HttpError(500, 'Demo world not seeded');
    setSessionCookie(ctx.res, createSession(row.id), config.sessionTtlMs);
    return { user: toMe(row) };
  });

  app.post('/api/auth/logout', (ctx) => {
    const token = ctx.cookies[config.sessionCookie];
    if (token) destroySession(token);
    clearSessionCookie(ctx.res);
    return { ok: true };
  });

  app.get('/api/me', (ctx) => {
    const userId = requireAuth(ctx);
    const unread = (q('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0').get(userId) as {
      n: number;
    }).n;
    return { user: toMe(userRow(userId)!), unread, unreadDm: unreadDmCount(userId) };
  });
}
