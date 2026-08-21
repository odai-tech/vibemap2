import type { App } from '../lib/http.ts';
import { HttpError } from '../lib/http.ts';
import { q } from '../lib/db.ts';
import { requireAuth } from '../lib/auth.ts';
import { asRecord, bool, num, optStr, strArray } from '../lib/validate.ts';
import {
  activePinRows,
  friendshipRow,
  notificationsFor,
  sharedInterests,
  sharedPinContext,
  toMe,
  toPinSummaries,
  toPublicUser,
  userRow,
  userStats,
} from '../lib/repo.ts';
import type { FriendState, UserProfile } from '../../../shared/types.ts';

export function userRoutes(app: App): void {
  app.patch('/api/me', (ctx) => {
    const userId = requireAuth(ctx);
    const body = asRecord(ctx.body);
    const current = userRow(userId)!;

    const name = body.name !== undefined ? optStr(body.name, 'name', { max: 40 }) || current.name : current.name;
    const bio = body.bio !== undefined ? optStr(body.bio, 'bio', { max: 200 }) : current.bio;
    const statusLine =
      body.statusLine !== undefined ? optStr(body.statusLine, 'statusLine', { max: 80 }) : current.status_line;
    const openToMeet = body.openToMeet !== undefined ? bool(body.openToMeet, 'openToMeet') : !!current.open_to_meet;
    const interests =
      body.interests !== undefined
        ? strArray(body.interests, 'interests', { maxItems: 12, maxLen: 30 })
        : (JSON.parse(current.interests) as string[]);

    q('UPDATE users SET name = ?, bio = ?, status_line = ?, open_to_meet = ?, interests = ? WHERE id = ?').run(
      name,
      bio,
      statusLine,
      openToMeet ? 1 : 0,
      JSON.stringify(interests),
      userId,
    );
    return { user: toMe(userRow(userId)!) };
  });

  /** Presence beacon — remembers roughly where you are for proximity ranking. */
  app.post('/api/me/location', (ctx) => {
    const userId = requireAuth(ctx);
    const body = asRecord(ctx.body);
    const lat = num(body.lat, 'lat', { min: -90, max: 90 });
    const lng = num(body.lng, 'lng', { min: -180, max: 180 });
    q('UPDATE users SET last_lat = ?, last_lng = ?, last_seen = ? WHERE id = ?').run(lat, lng, Date.now(), userId);
    return { ok: true };
  });

  /** Public profile: who they are, what they host, how you are connected. */
  app.get('/api/users/:id', (ctx) => {
    const userId = requireAuth(ctx);
    const row = userRow(ctx.params.id);
    if (!row) throw new HttpError(404, 'User not found');
    const user = toPublicUser(row);

    let friendState: FriendState = 'none';
    let shared: string[] = [];
    let context: string | null = null;
    if (row.id !== userId) {
      const rel = friendshipRow(userId, row.id);
      if (rel?.status === 'accepted') friendState = 'friends';
      else if (rel?.status === 'pending') friendState = rel.requested_by === userId ? 'outgoing' : 'incoming';
      shared = sharedInterests(user.interests, toPublicUser(userRow(userId)!).interests);
      context = sharedPinContext(userId, row.id);
    }

    const hosted = activePinRows()
      .filter((p) => p.author_id === row.id)
      .sort((a, b) => (a.starts_at ?? 0) - (b.starts_at ?? 0));
    const profile: UserProfile = {
      user,
      stats: userStats(row.id),
      friendState,
      sharedInterests: shared,
      context,
      pins: toPinSummaries(hosted.slice(0, 12), userId),
    };
    return { profile };
  });

  app.get('/api/notifications', (ctx) => {
    const userId = requireAuth(ctx);
    return { notifications: notificationsFor(userId) };
  });

  app.post('/api/notifications/read', (ctx) => {
    const userId = requireAuth(ctx);
    q('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
    return { ok: true };
  });
}
