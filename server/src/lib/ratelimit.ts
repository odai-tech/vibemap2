/** In-memory fixed-window rate limiter. */
import { HttpError } from './http.ts';

const windows = new Map<string, { count: number; resetAt: number }>();
let lastPrune = Date.now();

export function rateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  if (now - lastPrune > 60_000) {
    for (const [k, w] of windows) if (w.resetAt < now) windows.delete(k);
    lastPrune = now;
  }
  const win = windows.get(key);
  if (!win || win.resetAt < now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  win.count += 1;
  if (win.count > max) throw new HttpError(429, 'Too many requests — slow down a little');
}
