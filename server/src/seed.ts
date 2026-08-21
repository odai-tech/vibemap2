/**
 * Seeds a believable demo world: 10 people, ~15 vibes across San Francisco,
 * friendships, chat history and notifications — so the app feels alive on
 * first launch. Runs automatically when the database is empty.
 *
 * CLI: `npm run seed` (wipes and re-seeds everything).
 */
import { pathToFileURL } from 'node:url';
import { db, q, transaction } from './lib/db.ts';
import { hashPassword, newId } from './lib/auth.ts';

export const DEMO_USER_ID = 'su_alex';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

interface SeedUser {
  id: string;
  email: string;
  handle: string;
  name: string;
  bio: string;
  interests: string[];
  verified?: boolean;
  openToMeet?: boolean;
  statusLine?: string;
  at: [number, number];
  seenAgoMin: number;
}

const USERS: SeedUser[] = [
  {
    id: DEMO_USER_ID,
    email: 'demo@vibemap.app',
    handle: 'alex',
    name: 'Alex Rivera',
    bio: 'New in town. Collecting people and places.',
    interests: ['Coffee', 'Jazz', 'Coding', 'Photography', 'Hiking'],
    verified: true,
    statusLine: 'Free most evenings — coffee or a walk?',
    at: [37.788, -122.4075],
    seenAgoMin: 0,
  },
  {
    id: 'su_sarah',
    email: 'sarah@vibemap.app',
    handle: 'sarahj',
    name: 'Sarah Jenkins',
    bio: 'I host things. Show up early.',
    interests: ['Live Music', 'Jazz', 'Dancing', 'Cocktails'],
    verified: true,
    statusLine: 'Rooftop season is officially open',
    at: [37.789, -122.406],
    seenAgoMin: 12,
  },
  {
    id: 'su_david',
    email: 'david@vibemap.app',
    handle: 'dchen',
    name: 'David Chen',
    bio: 'Shipping side projects and losing at board games.',
    interests: ['Coding', 'AI', 'Startups', 'Board Games'],
    statusLine: 'Down for a code sesh most nights',
    at: [37.778, -122.405],
    seenAgoMin: 4,
  },
  {
    id: 'su_yuki',
    email: 'yuki@vibemap.app',
    handle: 'yuki',
    name: 'Yuki Tanaka',
    bio: 'Chasing light around the city. Film over digital.',
    interests: ['Photography', 'Art', 'Coffee', 'Film'],
    statusLine: 'Golden hour walks, always',
    at: [37.7955, -122.3937],
    seenAgoMin: 2,
  },
  {
    id: 'su_marco',
    email: 'marco@vibemap.app',
    handle: 'marco',
    name: 'Marco Ruiz',
    bio: 'Will travel 45 minutes for tacos. Have done worse.',
    interests: ['Street Food', 'Foodie', 'Languages', 'Travel'],
    statusLine: 'Ask me where to eat',
    at: [37.7596, -122.4269],
    seenAgoMin: 25,
  },
  {
    id: 'su_lina',
    email: 'lina@vibemap.app',
    handle: 'lina',
    name: 'Lina Haddad',
    bio: 'Sunrise runs, slow afternoons, good books.',
    interests: ['Yoga', 'Hiking', 'Books', 'Running'],
    statusLine: 'Training for a half marathon',
    at: [37.806, -122.431],
    seenAgoMin: 41,
  },
  {
    id: 'su_noor',
    email: 'noor@vibemap.app',
    handle: 'noor',
    name: 'Noor Al-Sayed',
    bio: 'Design partner at a tiny fund. Coffee snob, recovering.',
    interests: ['Startups', 'Design', 'AI', 'Coffee'],
    verified: true,
    statusLine: 'Building something new — ask',
    at: [37.7765, -122.4244],
    seenAgoMin: 8,
  },
  {
    id: 'su_jay',
    email: 'jay@vibemap.app',
    handle: 'jaypark',
    name: 'Jay Park',
    bio: 'V5 on a good day. Mario Kart world class every day.',
    interests: ['Climbing', 'Gaming', 'Running'],
    statusLine: 'Gym then food, the eternal loop',
    at: [37.7609, -122.435],
    seenAgoMin: 65,
  },
  {
    id: 'su_priya',
    email: 'priya@vibemap.app',
    handle: 'priya',
    name: 'Priya Sharma',
    bio: 'Vinyl collector. Quiet bars over loud clubs.',
    interests: ['Jazz', 'Books', 'Art', 'Cocktails'],
    statusLine: 'Hunting for the perfect listening bar',
    at: [37.7997, -122.4087],
    seenAgoMin: 18,
  },
  {
    id: 'su_omar',
    email: 'omar@vibemap.app',
    handle: 'omarv',
    name: 'Omar Vega',
    bio: 'Chef by night, beach volleyball by weekend.',
    interests: ['Foodie', 'Cocktails', 'Travel', 'Dancing'],
    openToMeet: false,
    at: [37.77, -122.44],
    seenAgoMin: 200,
  },
];

interface SeedPin {
  id: string;
  type: 'TABLE' | 'EVENT' | 'MOMENT' | 'DROP';
  category: string;
  at: [number, number];
  title: string;
  description: string;
  tags: string[];
  author: string;
  /** Hours from now; null = spontaneous (MOMENT/DROP). */
  startsInH: number | null;
  capacity?: number;
  members: string[];
  cover: number;
}

const PINS: SeedPin[] = [
  {
    id: 'sp_espresso',
    type: 'TABLE',
    category: 'STUDY',
    at: [37.7785, -122.4046],
    title: 'Espresso & Algorithms',
    description: 'Quiet corner table with outlets. Bring whatever you are building — we work, then we talk.',
    tags: ['Coding', 'Coffee', 'AI'],
    author: 'su_david',
    startsInH: 2,
    capacity: 6,
    members: ['su_david', 'su_noor'],
    cover: 2,
  },
  {
    id: 'sp_rooftop',
    type: 'EVENT',
    category: 'MUSIC',
    at: [37.7885, -122.4085],
    title: 'Rooftop Sunset Jam',
    description: 'Live trio, soft cocktails, the whole skyline. Come for golden hour, stay for the second set.',
    tags: ['Jazz', 'Live Music', 'Cocktails'],
    author: 'su_sarah',
    startsInH: 3,
    members: ['su_sarah', 'su_priya', 'su_marco', 'su_lina'],
    cover: 5,
  },
  {
    id: 'sp_pier',
    type: 'MOMENT',
    category: 'OUTDOOR',
    at: [37.7958, -122.394],
    title: 'Golden hour at the pier',
    description: 'The light is unreal right now. I have a spare film camera if anyone wants to learn.',
    tags: ['Photography', 'Sunset'],
    author: 'su_yuki',
    startsInH: null,
    members: ['su_yuki'],
    cover: 1,
  },
  {
    id: 'sp_tacos',
    type: 'TABLE',
    category: 'FOOD',
    at: [37.7601, -122.4214],
    title: "Strangers' Dinner: Mission Tacos",
    description: 'Six seats, one rule: no phones at the table. I order for everyone, you trust me.',
    tags: ['Street Food', 'Foodie'],
    author: 'su_marco',
    startsInH: 4,
    capacity: 6,
    members: ['su_marco', 'su_lina', 'su_jay'],
    cover: 0,
  },
  {
    id: 'sp_hack',
    type: 'EVENT',
    category: 'STUDY',
    at: [37.7812, -122.4043],
    title: 'Hack & Snack Night',
    description: 'Demo what you made, eat what we bring. Beginners loudly welcome.',
    tags: ['Coding', 'Startups', 'AI'],
    author: 'su_noor',
    startsInH: 26,
    members: ['su_noor', 'su_david'],
    cover: 3,
  },
  {
    id: 'sp_jazzcircle',
    type: 'TABLE',
    category: 'MUSIC',
    at: [37.7999, -122.409],
    title: 'Jazz Listening Circle',
    description: 'I bring the records (Mingus night), the bar brings the negronis. We just listen, then argue kindly.',
    tags: ['Jazz', 'Vinyl'],
    author: 'su_priya',
    startsInH: 5,
    capacity: 5,
    members: ['su_priya'],
    cover: 6,
  },
  {
    id: 'sp_runclub',
    type: 'EVENT',
    category: 'SPORT',
    at: [37.8055, -122.4295],
    title: 'Sunrise Run Club',
    description: '5k along the water, all paces. We regroup at every bridge photo-op, promise.',
    tags: ['Running', 'Hiking'],
    author: 'su_lina',
    startsInH: 18,
    members: ['su_lina', 'su_jay'],
    cover: 4,
  },
  {
    id: 'sp_boardgames',
    type: 'MOMENT',
    category: 'CHILL',
    at: [37.7768, -122.4233],
    title: 'Pop-up board games',
    description: 'Grabbed the big table at the café. Catan, Codenames, and zero mercy.',
    tags: ['Board Games', 'Coffee'],
    author: 'su_david',
    startsInH: null,
    members: ['su_david', 'su_jay'],
    cover: 7,
  },
  {
    id: 'sp_founders',
    type: 'EVENT',
    category: 'NETWORKING',
    at: [37.7942, -122.3962],
    title: 'Founders & Coffee',
    description: 'No pitches, no badges. Just people building things and very good espresso.',
    tags: ['Startups', 'Design', 'Coffee'],
    author: 'su_noor',
    startsInH: 20,
    members: ['su_noor', 'su_david', 'su_sarah'],
    cover: 1,
  },
  {
    id: 'sp_photowalk',
    type: 'TABLE',
    category: 'OUTDOOR',
    at: [37.7941, -122.4078],
    title: 'Photo Walk: Chinatown Lanterns',
    description: 'Slow walk, phone cameras welcome. I will show you my three favorite alleys.',
    tags: ['Photography', 'Art'],
    author: 'su_yuki',
    startsInH: 3.5,
    capacity: 8,
    members: ['su_yuki', 'su_priya'],
    cover: 2,
  },
  {
    id: 'sp_salsa',
    type: 'EVENT',
    category: 'PARTY',
    at: [37.7585, -122.4185],
    title: 'Salsa Social (beginners welcome)',
    description: 'First hour is a free lesson. After that the floor decides who you are.',
    tags: ['Dancing', 'Cocktails'],
    author: 'su_sarah',
    startsInH: 28,
    members: ['su_sarah', 'su_marco', 'su_omar'],
    cover: 0,
  },
  {
    id: 'sp_climb',
    type: 'EVENT',
    category: 'SPORT',
    at: [37.7654, -122.4109],
    title: 'Climbing after work',
    description: 'Top rope and bouldering. I will belay anyone who returns the favor.',
    tags: ['Climbing'],
    author: 'su_jay',
    startsInH: 6,
    members: ['su_jay', 'su_lina'],
    cover: 3,
  },
  {
    id: 'sp_bookclub',
    type: 'TABLE',
    category: 'CHILL',
    at: [37.7762, -122.4256],
    title: 'Silent Book Club',
    description: 'Bring whatever you are reading. One hour of silence, then snacks and spoilers.',
    tags: ['Books', 'Coffee'],
    author: 'su_lina',
    startsInH: 30,
    capacity: 8,
    members: ['su_lina', 'su_priya'],
    cover: 5,
  },
  {
    id: 'sp_tacodrop',
    type: 'DROP',
    category: 'FOOD',
    at: [37.7569, -122.4148],
    title: 'Secret taco window',
    description: 'Cash only, no sign, look for the green door. Al pastor is back. You did not hear it from me.',
    tags: ['Street Food'],
    author: 'su_marco',
    startsInH: null,
    members: ['su_marco'],
    cover: 6,
  },
  {
    id: 'sp_grove',
    type: 'DROP',
    category: 'OUTDOOR',
    at: [37.7714, -122.4544],
    title: 'Eucalyptus grove after rain',
    description: 'This corner of the park smells incredible right now. Worth the detour, trust.',
    tags: ['Hiking'],
    author: 'su_lina',
    startsInH: null,
    members: ['su_lina'],
    cover: 4,
  },
  {
    id: 'sp_coffeestranger',
    type: 'TABLE',
    category: 'CHILL',
    at: [37.7877, -122.4068],
    title: 'New in town — coffee with strangers?',
    description: 'I moved here three weeks ago and I am doing the brave thing. Worst case, great coffee.',
    tags: ['Coffee', 'Books'],
    author: DEMO_USER_ID,
    startsInH: 21,
    capacity: 4,
    members: [DEMO_USER_ID, 'su_yuki'],
    cover: 1,
  },
];

/** Direct-message history: keyed by [sender, recipient]. */
const DMS: Array<{ from: string; to: string; body: string; agoMin: number }> = [
  { from: 'su_david', to: DEMO_USER_ID, body: 'Yo — you coming to Espresso & Algorithms later?', agoMin: 160 },
  { from: DEMO_USER_ID, to: 'su_david', body: 'Planning on it. Saving me an outlet seat?', agoMin: 150 },
  { from: 'su_david', to: DEMO_USER_ID, body: 'Already taped your name on it. Bring the mechanical keyboard, Noor started it.', agoMin: 145 },
  { from: 'su_yuki', to: DEMO_USER_ID, body: 'Golden hour at the pier is unreal today. Come before 7 if you can', agoMin: 40 },
  { from: 'su_yuki', to: DEMO_USER_ID, body: 'I brought the spare film camera for you btw', agoMin: 38 },
];

const CHATS: Array<{ pin: string; user: string; body: string; agoMin: number }> = [
  { pin: 'sp_espresso', user: 'su_david', body: 'Got the corner table with all the outlets. Strategy.', agoMin: 95 },
  { pin: 'sp_espresso', user: 'su_noor', body: 'Bringing my loud keyboard. Fair warning.', agoMin: 80 },
  { pin: 'sp_espresso', user: 'su_david', body: 'Respect.', agoMin: 78 },
  { pin: 'sp_rooftop', user: 'su_sarah', body: 'Soundcheck done. Bring a light jacket — rooftop breeze is undefeated.', agoMin: 130 },
  { pin: 'sp_rooftop', user: 'su_priya', body: 'Saving me a seat near the band?', agoMin: 110 },
  { pin: 'sp_rooftop', user: 'su_sarah', body: 'Front row, already taped your name on it.', agoMin: 100 },
  { pin: 'sp_tacos', user: 'su_marco', body: 'They confirmed al pastor is back tonight.', agoMin: 60 },
  { pin: 'sp_tacos', user: 'su_lina', body: 'Say less.', agoMin: 55 },
  { pin: 'sp_coffeestranger', user: 'su_yuki', body: 'This is exactly how I made my first friend here. In.', agoMin: 30 },
];

export async function seed(): Promise<void> {
  const now = Date.now();
  const pass = await hashPassword('vibemap123');

  transaction(() => {
    for (const u of USERS) {
      q(
        `INSERT INTO users (id, email, handle, name, pass, bio, interests, verified, open_to_meet, status_line, last_lat, last_lng, last_seen, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        u.id,
        u.email,
        u.handle,
        u.name,
        pass,
        u.bio,
        JSON.stringify(u.interests),
        u.verified ? 1 : 0,
        u.openToMeet === false ? 0 : 1,
        u.statusLine ?? '',
        u.at[0],
        u.at[1],
        now - u.seenAgoMin * 60_000,
        now - 40 * DAY,
      );
    }

    for (const p of PINS) {
      const startsAt = p.startsInH !== null ? now + p.startsInH * HOUR : null;
      const expiresAt = p.type === 'MOMENT' ? now + 4 * HOUR : p.type === 'DROP' ? now + 24 * HOUR : null;
      q(
        `INSERT INTO pins (id, type, category, lat, lng, title, description, tags, author_id, created_at, starts_at, expires_at, capacity, cover, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      ).run(
        p.id,
        p.type,
        p.category,
        p.at[0],
        p.at[1],
        p.title,
        p.description,
        JSON.stringify(p.tags),
        p.author,
        now - 3 * HOUR,
        startsAt,
        expiresAt,
        p.capacity ?? null,
        p.cover,
      );
      p.members.forEach((m, i) => {
        q('INSERT INTO pin_members (pin_id, user_id, joined_at) VALUES (?, ?, ?)').run(
          p.id,
          m,
          now - 2 * HOUR + i * 9 * 60_000,
        );
      });
    }

    // Friendships: Alex ↔ David and Alex ↔ Yuki are friends; Sarah waved at Alex; Alex waved at Marco.
    const pair = (u1: string, u2: string): [string, string] => (u1 < u2 ? [u1, u2] : [u2, u1]);
    const addFriend = (u1: string, u2: string, status: string, requestedBy: string, agoH: number) => {
      const [a, b] = pair(u1, u2);
      q(
        'INSERT INTO friendships (a, b, status, requested_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(a, b, status, requestedBy, now - agoH * HOUR, now - agoH * HOUR);
    };
    addFriend(DEMO_USER_ID, 'su_david', 'accepted', 'su_david', 72);
    addFriend(DEMO_USER_ID, 'su_yuki', 'accepted', DEMO_USER_ID, 48);
    addFriend(DEMO_USER_ID, 'su_sarah', 'pending', 'su_sarah', 1.5);
    addFriend(DEMO_USER_ID, 'su_marco', 'pending', DEMO_USER_ID, 5);
    addFriend('su_david', 'su_noor', 'accepted', 'su_noor', 100);
    addFriend('su_lina', 'su_jay', 'accepted', 'su_lina', 90);

    for (const c of CHATS) {
      q('INSERT INTO messages (id, pin_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)').run(
        newId('m'),
        c.pin,
        c.user,
        c.body,
        now - c.agoMin * 60_000,
      );
    }

    // DM history (Yuki's two messages are unread → messages badge on first open).
    const pairOf = (u1: string, u2: string): [string, string] => (u1 < u2 ? [u1, u2] : [u2, u1]);
    const threads = new Map<string, { a: string; b: string; sender: string; body: string; at: number; unreadA: number; unreadB: number }>();
    for (const d of DMS) {
      const [a, b] = pairOf(d.from, d.to);
      const at = now - d.agoMin * 60_000;
      q('INSERT INTO dm_messages (id, a, b, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        newId('dm'),
        a,
        b,
        d.from,
        d.body,
        at,
      );
      const key = `${a}|${b}`;
      const t = threads.get(key) ?? { a, b, sender: d.from, body: d.body, at, unreadA: 0, unreadB: 0 };
      t.sender = d.from;
      t.body = d.body;
      t.at = at;
      threads.set(key, t);
    }
    // Only Yuki's thread is unread for the demo user; David's is read.
    const yukiThread = threads.get(pairOf(DEMO_USER_ID, 'su_yuki').join('|'));
    if (yukiThread) {
      if (DEMO_USER_ID === yukiThread.a) yukiThread.unreadA = 2;
      else yukiThread.unreadB = 2;
    }
    for (const t of threads.values()) {
      q(
        'INSERT INTO dm_threads (a, b, last_sender, last_body, last_at, unread_a, unread_b) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(t.a, t.b, t.sender, t.body.slice(0, 140), t.at, t.unreadA, t.unreadB);
    }

    // Notifications for the demo user (2 unread → badge on first open).
    const addNotif = (kind: string, actor: string | null, pin: string | null, body: string, agoMin: number, read: number) => {
      q(
        'INSERT INTO notifications (id, user_id, kind, actor_id, pin_id, body, created_at, read) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(newId('n'), DEMO_USER_ID, kind, actor, pin, body, now - agoMin * 60_000, read);
    };
    addNotif('wave', 'su_sarah', null, 'Sarah Jenkins waved at you — you both love Jazz', 90, 0);
    addNotif('join', 'su_yuki', 'sp_coffeestranger', 'Yuki Tanaka joined “New in town — coffee with strangers?”', 35, 0);
    addNotif('accept', 'su_david', null, 'David Chen accepted your wave', 70 * 60, 1);
    addNotif('system', null, null, 'Welcome to VibeMap. Drop a pin or join a table — your people are out there.', 72 * 60, 1);
  });

  console.log(`[seed] demo world created: ${USERS.length} people, ${PINS.length} vibes`);
}

export async function seedIfEmpty(): Promise<void> {
  const count = (q('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  if (count === 0) await seed();
  else refreshDemoTimes();
}

/**
 * Keeps the seeded demo evergreen: if seeded pins have drifted into the past
 * (e.g. the server was last run days ago), roll their times forward by whole
 * days. User-created pins are never touched.
 */
function refreshDemoTimes(): void {
  const now = Date.now();
  const rows = q("SELECT id, starts_at, expires_at FROM pins WHERE id LIKE 'sp\\_%' ESCAPE '\\' AND deleted = 0").all() as Array<{
    id: string;
    starts_at: number | null;
    expires_at: number | null;
  }>;
  let bumped = 0;
  for (const r of rows) {
    const anchor = r.starts_at ?? r.expires_at;
    if (anchor === null) continue;
    const horizon = r.starts_at !== null ? r.starts_at + 2 * HOUR : r.expires_at!;
    if (horizon >= now) continue;
    const days = Math.ceil((now - horizon) / DAY);
    const shift = days * DAY;
    q('UPDATE pins SET starts_at = CASE WHEN starts_at IS NULL THEN NULL ELSE starts_at + ? END, expires_at = CASE WHEN expires_at IS NULL THEN NULL ELSE expires_at + ? END WHERE id = ?').run(
      shift,
      shift,
      r.id,
    );
    bumped += 1;
  }
  if (bumped > 0) console.log(`[seed] refreshed ${bumped} demo pins to current dates`);
}

/* CLI entrypoint: `node src/seed.ts --reset` */
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  if (process.argv.includes('--reset')) {
    db.exec('DELETE FROM notifications; DELETE FROM dm_threads; DELETE FROM dm_messages; DELETE FROM messages; DELETE FROM friendships; DELETE FROM pin_members; DELETE FROM pins; DELETE FROM sessions; DELETE FROM users;');
    console.log('[seed] wiped existing data');
  }
  await seedIfEmpty();
}
