const M = 60_000;
const H = 3600_000;
const D = 24 * H;

export function ago(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < M) return 'now';
  if (diff < H) return `${Math.floor(diff / M)}m`;
  if (diff < D) return `${Math.floor(diff / H)}h`;
  return `${Math.floor(diff / D)}d`;
}

function clockTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "Live now" / "Starts in 45m" / "Tonight 7:30 PM" / "Tomorrow 6:30 AM" / "Sat 8:00 PM" */
export function timeUntil(startsAt: number | null, live: boolean): string {
  if (live) return 'Live now';
  if (startsAt === null) return 'Happening now';
  const now = Date.now();
  const diff = startsAt - now;
  if (diff <= 0) return 'Started';
  if (diff < H) return `Starts in ${Math.max(1, Math.round(diff / M))}m`;
  if (diff < 6 * H) return `Starts in ${Math.round(diff / H)}h`;

  const d = new Date(startsAt);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + D);
  if (d.toDateString() === today.toDateString()) return `Tonight ${clockTime(d)}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${clockTime(d)}`;
  return `${d.toLocaleDateString([], { weekday: 'short' })} ${clockTime(d)}`;
}

export function seatsText(capacity: number | null, attendees: number): string | null {
  if (capacity === null) return null;
  const left = capacity - attendees;
  if (left <= 0) return 'Full';
  if (left === 1) return 'Last seat';
  return `${left} of ${capacity} seats left`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/** Online if seen in the last 10 minutes. */
export function isOnline(lastSeen: number): boolean {
  return Date.now() - lastSeen < 10 * M;
}
