/**
 * The Vibe Engine — VibeMap's on-device intelligence.
 *
 * Everything here is deterministic, instant, private, and free:
 * no external AI APIs. Radar analyses an area, Explore scores pins
 * against a person, and the icebreaker generator warms up new tables.
 */
import { CATEGORY_META } from '../../../shared/vibes.ts';
import type {
  ExploreItem,
  PinSummary,
  PublicUser,
  RadarBreakdownRow,
  RadarReport,
  VibeCategory,
} from '../../../shared/types.ts';

/* ------------------------------------------------------------------ */
/* Radar                                                               */
/* ------------------------------------------------------------------ */

const ENERGY_BANDS: Array<{ min: number; headlines: string[] }> = [
  {
    min: 75,
    headlines: [
      'This area is electric right now',
      'Peak hours — the grid is glowing',
      'Big energy in every direction',
    ],
  },
  {
    min: 50,
    headlines: ['Solid buzz around you', 'The night is warming up here', 'Good signals all around'],
  },
  {
    min: 25,
    headlines: ['A calm hum with bright spots', 'Quietly social around here', 'Low-key, in the best way'],
  },
  { min: 0, headlines: ['Still waters tonight', 'Quiet zone — be the spark', 'The map is yours to light up'] },
];

const CATEGORY_FLAVOR: Record<VibeCategory, string> = {
  CHILL: 'slow conversations and easy company',
  PARTY: 'dance floors and loud laughter',
  STUDY: 'laptops, focus and shared grind',
  OUTDOOR: 'fresh air and moving feet',
  NETWORKING: 'business cards and bold ideas',
  FOOD: 'good plates and better company',
  MUSIC: 'live sets and warm acoustics',
  SPORT: 'heart rates and high fives',
};

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

export function radarReport(
  pins: PinSummary[],
  center: { lat: number; lng: number },
  personalPick: ExploreItem | null,
): RadarReport {
  const now = Date.now();
  const seed = Math.floor(now / 60_000); // stable within a minute

  const live = pins.filter((p) => p.live);
  const peopleNow = pins.reduce((sum, p) => sum + p.attendees, 0);

  const byCategory = new Map<VibeCategory, { count: number; people: number }>();
  for (const p of pins) {
    const entry = byCategory.get(p.category) || { count: 0, people: 0 };
    entry.count += 1;
    entry.people += p.attendees;
    byCategory.set(p.category, entry);
  }
  const breakdown: RadarBreakdownRow[] = [...byCategory.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((x, y) => y.people - x.people || y.count - x.count)
    .slice(0, 4);

  const tagCounts = new Map<string, number>();
  for (const p of pins) for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);

  const energy = Math.max(
    4,
    Math.min(100, Math.round(live.length * 13 + peopleNow * 0.75 + pins.length * 3.5)),
  );

  const band = ENERGY_BANDS.find((b) => energy >= b.min) || ENERGY_BANDS[ENERGY_BANDS.length - 1];
  const headline = pick(band.headlines, seed);

  const dominant = breakdown[0]?.category;
  let summary: string;
  if (pins.length === 0) {
    summary = 'No vibes in this area yet. Drop the first pin and watch who shows up.';
  } else if (dominant) {
    const flavor = CATEGORY_FLAVOR[dominant];
    const liveBit = live.length > 0 ? `${live.length} happening right now` : 'more starting soon';
    summary = `${pins.length} vibes nearby, leaning ${CATEGORY_META[dominant].label.toLowerCase()} — ${flavor} — with ${liveBit} and ~${peopleNow} people out.`;
  } else {
    summary = `${pins.length} vibes nearby with ~${peopleNow} people out.`;
  }

  // Hotspot: densest cell of a 4×4 grid (weighted by people), labeled by its biggest pin.
  let hotspot: RadarReport['hotspot'] = null;
  if (pins.length > 0) {
    const lats = pins.map((p) => p.lat);
    const lngs = pins.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats) + 1e-9;
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs) + 1e-9;
    const cells = new Map<string, { weight: number; best: PinSummary }>();
    for (const p of pins) {
      const gx = Math.min(3, Math.floor(((p.lat - minLat) / (maxLat - minLat)) * 4));
      const gy = Math.min(3, Math.floor(((p.lng - minLng) / (maxLng - minLng)) * 4));
      const key = `${gx},${gy}`;
      const cell = cells.get(key);
      const weight = p.attendees + 2;
      if (!cell) cells.set(key, { weight, best: p });
      else {
        cell.weight += weight;
        if (p.attendees > cell.best.attendees) cell.best = p;
      }
    }
    const top = [...cells.values()].sort((a, b) => b.weight - a.weight)[0];
    if (top && top.weight > 4) {
      hotspot = { label: `around “${top.best.title}”`, lat: top.best.lat, lng: top.best.lng };
    }
  }

  let recommendation: string;
  let recommendedPinId: string | null = null;
  if (personalPick) {
    recommendedPinId = personalPick.pin.id;
    const reason = personalPick.reasons[0]?.toLowerCase() || 'it matches your vibe';
    recommendation = `Your move: “${personalPick.pin.title}” — ${reason}.`;
  } else if (pins.length > 0) {
    const busiest = [...pins].sort((a, b) => b.attendees - a.attendees)[0];
    recommendation = `“${busiest.title}” is pulling the biggest crowd (${busiest.attendees} in).`;
    recommendedPinId = busiest.id;
  } else {
    recommendation = 'Drop a Table and let the city come to you.';
  }

  return {
    energy,
    headline,
    summary,
    recommendation,
    recommendedPinId,
    hotspot,
    breakdown,
    topTags,
    peopleNow,
    liveCount: live.length,
    scannedPins: pins.length,
  };
}

/* ------------------------------------------------------------------ */
/* Explore — personal recommendation scoring                           */
/* ------------------------------------------------------------------ */

interface ScoreContext {
  user: PublicUser;
  friendIds: Set<string>;
  /** Categories this user has joined ≥2 times. */
  affinityCategories: Set<VibeCategory>;
  origin: { lat: number; lng: number } | null;
}

function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function scorePin(pin: PinSummary, ctx: ScoreContext): ExploreItem | null {
  const now = Date.now();
  let score = 10;
  const reasons: Array<{ weight: number; text: string }> = [];

  // Interest overlap against tags + the category's implied tags.
  const pinTags = new Set([...pin.tags, ...CATEGORY_META[pin.category].impliedTags].map((t) => t.toLowerCase()));
  const overlap = ctx.user.interests.filter((i) => pinTags.has(i.toLowerCase()));
  if (overlap.length > 0) {
    score += Math.min(54, overlap.length * 18);
    reasons.push({
      weight: 60,
      text: overlap.length === 1 ? `Matches your ${overlap[0]} interest` : `Matches ${overlap.slice(0, 2).join(' + ')}`,
    });
  }

  // Friends going.
  const friendsIn = pin.memberPreview.filter((m) => ctx.friendIds.has(m.id));
  const friendsGoing = friendsIn.length;
  if (friendsGoing > 0) {
    score += Math.min(24, friendsGoing * 12);
    reasons.push({
      weight: 55,
      text: friendsGoing === 1 ? `${friendsIn[0].name.split(' ')[0]} is going` : `${friendsGoing} friends are going`,
    });
  }

  // Category affinity from history.
  if (ctx.affinityCategories.has(pin.category)) {
    score += 10;
    reasons.push({ weight: 25, text: `You love ${CATEGORY_META[pin.category].label.toLowerCase()} vibes` });
  }

  // Timing.
  if (pin.live) {
    score += 16;
    reasons.push({ weight: 40, text: 'Happening right now' });
  } else if (pin.startsAt) {
    const hours = (pin.startsAt - now) / 3600_000;
    if (hours > 0 && hours <= 6) {
      score += 14;
      reasons.push({ weight: 35, text: `Starts in ${Math.max(1, Math.round(hours))}h` });
    } else if (hours > 0 && hours <= 30) {
      score += 8;
    } else if (hours > 0) {
      score += 3;
    }
  }

  // Proximity.
  if (ctx.origin) {
    const km = kmBetween(ctx.origin.lat, ctx.origin.lng, pin.lat, pin.lng);
    if (km < 1) {
      score += 8;
      reasons.push({ weight: 20, text: 'A short walk away' });
    } else if (km < 3) score += 4;
  }

  // Seats.
  if (pin.capacity !== null) {
    const left = pin.capacity - pin.attendees;
    if (left <= 0 && !pin.joined) return null; // full — don't recommend
    if (left > 0 && left <= 2) {
      score += 6;
      reasons.push({ weight: 30, text: left === 1 ? 'Last seat left' : `Only ${left} seats left` });
    }
  }

  // Small-group tables are friendship machines.
  if (pin.type === 'TABLE') score += 6;

  const sortedReasons = reasons
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((r) => r.text);

  return {
    pin,
    match: Math.max(8, Math.min(99, Math.round(score))),
    reasons: sortedReasons.length > 0 ? sortedReasons : ['Something new to try'],
  };
}

export function explore(pins: PinSummary[], ctx: ScoreContext, limit = 12): ExploreItem[] {
  const items: ExploreItem[] = [];
  for (const pin of pins) {
    if (pin.author.id === ctx.user.id) continue;
    const item = scorePin(pin, ctx);
    if (item) items.push(item);
  }
  return items.sort((a, b) => b.match - a.match).slice(0, limit);
}

export type { ScoreContext };

/* ------------------------------------------------------------------ */
/* Icebreakers                                                         */
/* ------------------------------------------------------------------ */

const ICEBREAKERS_BY_CATEGORY: Record<VibeCategory, string[]> = {
  CHILL: ['What does a perfect lazy Sunday look like for you?', 'Best place in this city to do absolutely nothing?'],
  PARTY: ['What song gets you on the floor every single time?', 'Best night out you have ever had — go.'],
  STUDY: ['What are you building or learning right now?', 'Tabs open right now: how many? Be honest.'],
  OUTDOOR: ['Sunrise hike or sunset walk?', 'What outdoor spot here is criminally underrated?'],
  NETWORKING: ['What are you working on that you could talk about for an hour?', 'Boldest idea you believe that few do?'],
  FOOD: ['One dish from this city you would defend with your life?', 'Sweet or savory — and your proof?'],
  MUSIC: ['First concert you ever went to?', 'A song you wish you could hear again for the first time?'],
  SPORT: ['What is your sport, and what got you into it?', 'Morning workout or evening session?'],
};

export function icebreakers(category: VibeCategory, tags: string[]): string[] {
  const out = [...ICEBREAKERS_BY_CATEGORY[category]];
  const tag = tags[0];
  if (tag) out.unshift(`Everyone here picked “${tag}” — what's your story with it?`);
  out.push('Two truths and a lie. Winner picks the next spot.');
  return out.slice(0, 3);
}
