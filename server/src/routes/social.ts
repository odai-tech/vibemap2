import type { App } from '../lib/http.ts';
import { HttpError } from '../lib/http.ts';
import { q } from '../lib/db.ts';
import { requireAuth } from '../lib/auth.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { asRecord, bool, str } from '../lib/validate.ts';
import {
  friendshipRow,
  pairKey,
  sharedInterests,
  sharedPinContexts,
  toPublicUser,
  userRow,
  type UserRow,
} from '../lib/repo.ts';
import { notify } from '../lib/notify.ts';
import type { FriendsPayload, FriendState, PersonCard } from '../../../shared/types.ts';

type UserRelRow = UserRow & { rel_status: string | null; rel_requested_by: string | null };

function relState(userId: string, row: UserRelRow): FriendState {
  if (row.rel_status === 'accepted') return 'friends';
  if (row.rel_status === 'pending') return row.rel_requested_by === userId ? 'outgoing' : 'incoming';
  return 'none';
}

function toCard(row: UserRelRow, meInterests: string[], contexts: Map<string, string>, state: FriendState): PersonCard {
  const user = toPublicUser(row);
  return {
    user,
    sharedInterests: sharedInterests(user.interests, meInterests),
    friendState: state,
    context: contexts.get(row.id) ?? null,
  };
}

/** Everyone except me, with their friendship row joined in — one query. */
function usersWithRelation(userId: string): UserRelRow[] {
  return q(
    `SELECT u.*, f.status AS rel_status, f.requested_by AS rel_requested_by
     FROM users u
     LEFT JOIN friendships f ON f.a = MIN(u.id, ?) AND f.b = MAX(u.id, ?)
     WHERE u.id != ?`,
  ).all(userId, userId, userId) as unknown as UserRelRow[];
}

export function socialRoutes(app: App): void {
  /** Discovery: people open to meet or with overlapping interests, ranked. */
  app.get('/api/people', (ctx) => {
    const userId = requireAuth(ctx);
    const me = toPublicUser(userRow(userId)!);
    const contexts = sharedPinContexts(userId);

    const cards: PersonCard[] = [];
    for (const row of usersWithRelation(userId)) {
      const state = relState(userId, row);
      if (state === 'friends') continue;
      if (state === 'incoming') continue; // surfaced in the requests section instead
      const card = toCard(row, me.interests, contexts, state);
      if (!card.user.openToMeet && card.sharedInterests.length === 0) continue;
      cards.push(card);
    }
    cards.sort(
      (a, b) =>
        Number(b.user.openToMeet) - Number(a.user.openToMeet) ||
        b.sharedInterests.length - a.sharedInterests.length ||
        b.user.lastSeen - a.user.lastSeen,
    );
    return { people: cards.slice(0, 30) };
  });

  app.get('/api/friends', (ctx) => {
    const userId = requireAuth(ctx);
    const me = toPublicUser(userRow(userId)!);
    const contexts = sharedPinContexts(userId);

    const payload: FriendsPayload = { friends: [], incoming: [], outgoing: [] };
    for (const row of usersWithRelation(userId)) {
      const state = relState(userId, row);
      if (state === 'none') continue;
      const card = toCard(row, me.interests, contexts, state);
      if (state === 'friends') payload.friends.push(card);
      else if (state === 'outgoing') payload.outgoing.push(card);
      else payload.incoming.push(card);
    }
    payload.friends.sort((a, b) => b.user.lastSeen - a.user.lastSeen);
    return payload;
  });

  /** "Wave" — send a friend request. */
  app.post('/api/friends/request', (ctx) => {
    const userId = requireAuth(ctx);
    rateLimit(`wave:${userId}`, 20, 10 * 60_000);
    const targetId = str(asRecord(ctx.body).userId, 'userId', { min: 1, max: 64 });
    if (targetId === userId) throw new HttpError(400, 'You are already friends with yourself');
    if (!userRow(targetId)) throw new HttpError(404, 'User not found');

    const existing = friendshipRow(userId, targetId);
    if (existing?.status === 'accepted') throw new HttpError(409, 'Already friends');
    if (existing?.status === 'pending') {
      if (existing.requested_by === userId) return { state: 'outgoing' satisfies FriendState };
      // They waved first — auto-accept.
      const [a, b] = pairKey(userId, targetId);
      q("UPDATE friendships SET status = 'accepted', updated_at = ? WHERE a = ? AND b = ?").run(Date.now(), a, b);
      notify(targetId, 'accept', { actorId: userId, body: `${userRow(userId)!.name} waved back — you are now connected` });
      return { state: 'friends' satisfies FriendState };
    }

    const [a, b] = pairKey(userId, targetId);
    q('INSERT INTO friendships (a, b, status, requested_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      a,
      b,
      'pending',
      userId,
      Date.now(),
      Date.now(),
    );
    const meRow = userRow(userId)!;
    const shared = sharedInterests(
      JSON.parse(meRow.interests) as string[],
      toPublicUser(userRow(targetId)!).interests,
    );
    notify(targetId, 'wave', {
      actorId: userId,
      body:
        shared.length > 0
          ? `${meRow.name} waved at you — you both love ${shared.slice(0, 2).join(' and ')}`
          : `${meRow.name} waved at you`,
    });
    return { state: 'outgoing' satisfies FriendState };
  });

  app.post('/api/friends/respond', (ctx) => {
    const userId = requireAuth(ctx);
    const body = asRecord(ctx.body);
    const targetId = str(body.userId, 'userId', { min: 1, max: 64 });
    const accept = bool(body.accept, 'accept');

    const rel = friendshipRow(userId, targetId);
    if (!rel || rel.status !== 'pending' || rel.requested_by === userId) {
      throw new HttpError(404, 'No pending wave from this person');
    }
    const [a, b] = pairKey(userId, targetId);
    if (accept) {
      q("UPDATE friendships SET status = 'accepted', updated_at = ? WHERE a = ? AND b = ?").run(Date.now(), a, b);
      notify(targetId, 'accept', { actorId: userId, body: `${userRow(userId)!.name} accepted your wave` });
      return { state: 'friends' satisfies FriendState };
    }
    q('DELETE FROM friendships WHERE a = ? AND b = ?').run(a, b);
    return { state: 'none' satisfies FriendState };
  });
}
