import type { App } from '../lib/http.ts';
import { HttpError } from '../lib/http.ts';
import { q } from '../lib/db.ts';
import { requireAuth } from '../lib/auth.ts';
import { activePinRows, friendIdsOf, toPinSummaries, toPublicUser, userRow } from '../lib/repo.ts';
import { explore, radarReport, type ScoreContext } from '../lib/vibe.ts';
import { onlineCount } from '../lib/ws.ts';
import type { PinSummary, VibeCategory } from '../../../shared/types.ts';

function buildScoreContext(userId: string): ScoreContext {
  const me = toPublicUser(userRow(userId)!);
  const history = q(
    'SELECT p.category, COUNT(*) AS n FROM pin_members m JOIN pins p ON p.id = m.pin_id WHERE m.user_id = ? GROUP BY p.category',
  ).all(userId) as Array<{ category: VibeCategory; n: number }>;
  const affinityCategories = new Set(history.filter((h) => h.n >= 2).map((h) => h.category));
  const meRaw = userRow(userId)!;
  const origin = meRaw.last_lat !== null && meRaw.last_lng !== null ? { lat: meRaw.last_lat, lng: meRaw.last_lng } : null;
  return { user: me, friendIds: new Set(friendIdsOf(userId)), affinityCategories, origin };
}

function filterByWhen(pins: PinSummary[], when: string | null): PinSummary[] {
  if (!when || when === 'all') return pins;
  const now = Date.now();
  if (when === 'now') return pins.filter((p) => p.live);
  if (when === 'today') {
    const end = new Date();
    end.setHours(29, 59, 59, 999); // through 5:59am next day — nights count
    return pins.filter((p) => p.live || (p.startsAt !== null && p.startsAt <= end.getTime()));
  }
  if (when === 'week') {
    return pins.filter((p) => p.live || p.startsAt === null || p.startsAt <= now + 7 * 86400_000);
  }
  return pins;
}

export function discoveryRoutes(app: App): void {
  app.get('/api/explore', (ctx) => {
    const userId = requireAuth(ctx);
    const ctxScore = buildScoreContext(userId);
    const pins = filterByWhen(toPinSummaries(activePinRows(), userId), ctx.query.get('when'));
    return { items: explore(pins, ctxScore) };
  });

  app.get('/api/radar', (ctx) => {
    const userId = requireAuth(ctx);
    const bbox = ctx.query.get('bbox');
    if (!bbox) throw new HttpError(400, 'bbox required');
    const [w, s, e, n] = bbox.split(',').map(Number);
    if ([w, s, e, n].some((v) => !Number.isFinite(v))) throw new HttpError(400, 'Bad bbox');

    const inBox = activePinRows().filter((r) => r.lat >= s && r.lat <= n && r.lng >= w && r.lng <= e);
    const pins = toPinSummaries(inBox, userId);

    const ctxScore = buildScoreContext(userId);
    const picks = explore(pins, ctxScore, 1);
    return {
      report: radarReport(pins, { lat: (s + n) / 2, lng: (w + e) / 2 }, picks[0] ?? null),
    };
  });

  app.get('/api/presence', () => ({ online: onlineCount() }));
}
