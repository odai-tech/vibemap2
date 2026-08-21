# VibeMap

**A live social map of your city. Drop pins, join tables, make friends.**

VibeMap turns the city into a real-time canvas: people drop **Tables** (small,
seat-capped meetups), **Events**, **Moments** (happening right now) and
**Drops** (vibe notes that fade in 24h). A built-in **Vibe Radar** reads the
energy of the area around you, and a personal **For You** engine matches pins
to your interests, friends and timing.

The whole platform is **self-contained**: no AI APIs, no auth providers, no
database servers, no image CDNs.

## Quick start

```bash
npm install
npm run dev          # API on :8787 + app on :3000
```

Open **http://localhost:3000** and hit **“Explore the demo city”** — it drops
you into a living San Francisco with 9 locals, tables tonight, chat history,
and a radar that reads the room. (Demo account: `demo@vibemap.app` /
`vibemap123`.)

## Production

```bash
npm run build        # builds the client bundle
npm start            # one process serves the app + API on :8787
```

Useful flags: `PORT=…`, `HOST=…`, `DEMO=0` (disable one-tap demo login),
`npm run seed` (reset and re-seed the demo world).

## What's inside

| Layer | Tech | Notes |
|---|---|---|
| Frontend | React 19, Vite, Tailwind 4, framer-motion, react-leaflet | Dark-glass design system, spring-physics sheets, custom map markers, self-hosted fonts |
| Backend | Node ≥ 23.6, zero-framework HTTP router | TypeScript executed natively by Node (type stripping) |
| Database | `node:sqlite` (built into Node) | One WAL-mode file in `server/data/` |
| Auth | `node:crypto` scrypt + hashed session cookies | HttpOnly, SameSite, origin-checked mutations, rate-limited |
| Realtime | `ws` (the only backend dependency) | Presence, live pins, per-pin chat rooms, notification push |
| Intelligence | Local "vibe engine" | Radar area analysis, explore scoring with reasons, icebreakers — deterministic, instant, private |

### Features

- **Live map** — custom category markers with live pulse rings, attendance
  counts, density heatmap, search and category filters.
- **Vibe Radar** — animated sweep, then a report: area energy score, category
  breakdown, hotspot jump, and a personal pick with the reason why.
- **For You** — recommendations ranked on interest overlap, friends going,
  timing, proximity and seat scarcity. Every card explains itself
  ("Matches Coffee + Coding", "Yuki is going", "Last seat left").
- **Tables** — 2–8 seat meetups with capacity bars, member-only group chat,
  and auto-generated icebreakers.
- **People** — an "open to meet" beacon with a status line, nearby people
  ranked by shared interests, one-tap **waves** (mutual wave = instant
  friends), and a friends circle with "both in …" context.
- **Activity** — real-time notifications (waves, joins, accepts) over
  WebSockets, with unread badges and toasts.
- **Profile** — stats, earned badges (Host, Connector, Scene Explorer…), and
  an interest editor that immediately retunes your recommendations.

### Repo layout

```
client/   React app (Vite)
server/   Node API + WebSocket hub + SQLite + vibe engine
shared/   Types and category metadata used by both
scripts/  Dev orchestrator
```

The only external service at runtime is the CARTO basemap tile CDN
(key-free). Swap the `TileLayer` URL in `client/src/components/map/MapView.tsx`
to self-host tiles if you want zero external calls.
