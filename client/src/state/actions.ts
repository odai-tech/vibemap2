import { api, ApiError } from '@/lib/api';
import { connectWs, disconnectWs } from '@/lib/ws';
import { flyTo, getState, removePin, resetStore, setState, toast, upsertPins, type ExploreWhen, type Tab } from './store';
import type { CreatePinBody, PersonCard, PinSummary, RegisterBody } from '@shared/types';

/* ---------------- boot & auth ---------------- */

export async function boot(): Promise<void> {
  try {
    const { user, unread, unreadDm } = await api.me();
    setState((s) => ({ boot: 'ready', me: user, unread, dm: { ...s.dm, unread: unreadDm } }));
    connectWs();
    void refreshPins();
  } catch {
    setState({ boot: 'guest' });
  }
}

async function enter(user: Awaited<ReturnType<typeof api.me>>['user'], greeting: string): Promise<void> {
  setState({ boot: 'ready', me: user });
  connectWs();
  await refreshPins();
  const { unread, unreadDm } = await api.me().catch(() => ({ unread: 0, unreadDm: 0 }));
  setState((s) => ({ unread, dm: { ...s.dm, unread: unreadDm } }));
  toast(greeting, 'success');
}

export async function loginDemo(): Promise<void> {
  const { user } = await api.demo();
  await enter(user, `Welcome back, ${user.name.split(' ')[0]} — the city is live`);
}

export async function login(email: string, password: string): Promise<void> {
  const { user } = await api.login(email, password);
  await enter(user, `Good to see you, ${user.name.split(' ')[0]}`);
}

export async function register(body: RegisterBody): Promise<void> {
  const { user } = await api.register(body);
  await enter(user, 'Welcome to VibeMap — drop your first pin');
}

export async function logout(): Promise<void> {
  await api.logout().catch(() => undefined);
  disconnectWs();
  resetStore();
}

/* ---------------- pins ---------------- */

export async function refreshPins(): Promise<void> {
  try {
    const { pins } = await api.pins();
    setState(() => {
      const map: Record<string, PinSummary> = {};
      for (const p of pins) map[p.id] = p;
      return { pins: map };
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) setState({ boot: 'guest' });
  }
}

export function selectPin(pinId: string | null): void {
  setState({ selectedPinId: pinId, creating: false });
}

export function openPinFromList(pin: PinSummary): void {
  setState({ tab: 'map', selectedPinId: pin.id });
  // Offset south so the bottom sheet doesn't cover the marker.
  flyTo(pin.lat - 0.0022, pin.lng, 15.5);
}

export async function createPin(body: CreatePinBody): Promise<PinSummary> {
  const { pin } = await api.createPin(body);
  upsertPins([pin]);
  setState({ draftLocation: null, creating: false, selectedPinId: pin.id });
  toast('Pin dropped — you are hosting', 'success');
  return pin;
}

export async function joinPin(pinId: string): Promise<void> {
  const { pin } = await api.joinPin(pinId);
  upsertPins([pin]);
  invalidateExplore();
}

export async function leavePin(pinId: string): Promise<void> {
  const { pin } = await api.leavePin(pinId);
  upsertPins([pin]);
}

export async function deletePin(pinId: string): Promise<void> {
  await api.deletePin(pinId);
  removePin(pinId);
  toast('Pin removed', 'info');
}

/* ---------------- radar ---------------- */

export async function runRadar(): Promise<void> {
  const { bbox, radar } = getState();
  if (!bbox || radar.phase === 'scanning') return;
  setState({ radar: { phase: 'scanning', report: null } });
  const started = Date.now();
  try {
    const { report } = await api.radar(bbox);
    // Let the sweep animation breathe even when the engine is instant.
    const minSweep = 1700;
    const wait = Math.max(0, minSweep - (Date.now() - started));
    setTimeout(() => setState({ radar: { phase: 'done', report } }), wait);
  } catch {
    setState({ radar: { phase: 'idle', report: null } });
    toast('Radar failed — try again', 'error');
  }
}

export function dismissRadar(): void {
  setState({ radar: { phase: 'idle', report: null } });
}

/* ---------------- explore / people / friends ---------------- */

export function invalidateExplore(): void {
  setState((s) => ({ explore: { ...s.explore, loadedAt: 0 } }));
}

export async function loadExplore(when?: ExploreWhen): Promise<void> {
  const s = getState();
  const target = when ?? s.explore.when;
  if (when === undefined && s.explore.loadedAt > Date.now() - 45_000) return;
  setState({ explore: { ...s.explore, when: target, loading: true } });
  try {
    const { items } = await api.explore(target);
    setState((cur) => ({ explore: { when: target, items, loading: false, loadedAt: Date.now() } }));
  } catch {
    setState((cur) => ({ explore: { ...cur.explore, loading: false } }));
  }
}

export async function loadPeople(force = false): Promise<void> {
  const s = getState();
  if (!force && s.people.loadedAt > Date.now() - 45_000) return;
  setState({ people: { ...s.people, loading: true } });
  try {
    const [{ people }, friends] = await Promise.all([api.people(), api.friends()]);
    setState({ people: { cards: people, loading: false, loadedAt: Date.now() }, friends });
  } catch {
    setState((cur) => ({ people: { ...cur.people, loading: false } }));
  }
}

export async function wave(card: PersonCard): Promise<void> {
  const { state: newState } = await api.wave(card.user.id);
  setState((s) => ({
    people: {
      ...s.people,
      cards: s.people.cards.map((c) => (c.user.id === card.user.id ? { ...c, friendState: newState } : c)),
    },
  }));
  if (newState === 'friends') toast(`You and ${card.user.name.split(' ')[0]} are connected`, 'success');
  else toast(`Waved at ${card.user.name.split(' ')[0]}`, 'success');
  void loadPeople(true);
}

export async function respondToWave(userId: string, accept: boolean): Promise<void> {
  await api.respond(userId, accept);
  if (accept) toast('New friend added', 'success');
  await loadPeople(true);
}

/* ---------------- notifications ---------------- */

export async function loadNotifications(): Promise<void> {
  const { notifications } = await api.notifications();
  setState({ notifications, notifLoaded: true });
}

export async function markAllRead(): Promise<void> {
  await api.markRead().catch(() => undefined);
  setState((s) => ({
    unread: 0,
    notifications: s.notifications.map((n) => ({ ...n, read: true })),
  }));
}

/* ---------------- profiles ---------------- */

export function openProfile(userId: string): void {
  setState({ viewProfileId: userId });
}

export function closeProfile(): void {
  setState({ viewProfileId: null });
}

/* ---------------- ui ---------------- */

export function setTab(tab: Tab): void {
  setState({ tab, profileOpen: false });
  if (tab === 'explore') void loadExplore();
  if (tab === 'people') void loadPeople();
  if (tab === 'activity') void loadNotifications();
}

export function startCreating(): void {
  setState({ creating: true, selectedPinId: null, tab: 'map', draftLocation: null });
}

export function cancelCreating(): void {
  setState({ creating: false, draftLocation: null });
}

export function locateMe(): void {
  if (!('geolocation' in navigator)) {
    toast('Location is not available in this browser', 'error');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      flyTo(latitude, longitude, 15);
      void api.beacon(latitude, longitude).catch(() => undefined);
    },
    () => toast('Could not get your location', 'error'),
    { enableHighAccuracy: true, timeout: 8000 },
  );
}
