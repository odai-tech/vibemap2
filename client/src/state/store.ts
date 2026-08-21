import { useSyncExternalStore } from 'react';
import type {
  AppNotification,
  DmThread,
  ExploreItem,
  FriendsPayload,
  Me,
  PersonCard,
  PinSummary,
  RadarReport,
  UserLite,
  VibeCategory,
} from '@shared/types';

export type Tab = 'map' | 'explore' | 'people' | 'activity';
export type ExploreWhen = 'now' | 'today' | 'week' | 'all';
export type MapStyleId = 'satellite' | 'midnight' | 'daylight';

const MAP_STYLE_KEY = 'vibemap.mapStyle';

function loadMapStyle(): MapStyleId {
  const v = localStorage.getItem(MAP_STYLE_KEY);
  return v === 'midnight' || v === 'daylight' ? v : 'satellite';
}

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'error';
  text: string;
}

export interface AppState {
  boot: 'loading' | 'guest' | 'ready';
  me: Me | null;
  online: number;

  tab: Tab;
  profileOpen: boolean;
  /** Someone else's profile being viewed (sheet). */
  viewProfileId: string | null;

  dm: {
    open: boolean;
    /** Open conversation partner; null = inbox list. */
    withUser: UserLite | null;
    threads: DmThread[];
    threadsLoaded: boolean;
    unread: number;
  };

  pins: Record<string, PinSummary>;
  filterCategory: VibeCategory | 'ALL';
  searchQuery: string;
  heatmap: boolean;
  mapStyle: MapStyleId;

  selectedPinId: string | null;
  creating: boolean;
  draftLocation: { lat: number; lng: number } | null;

  radar: { phase: 'idle' | 'scanning' | 'done'; report: RadarReport | null };
  explore: { when: ExploreWhen; items: ExploreItem[]; loading: boolean; loadedAt: number };
  people: { cards: PersonCard[]; loading: boolean; loadedAt: number };
  friends: FriendsPayload | null;
  notifications: AppNotification[];
  notifLoaded: boolean;
  unread: number;

  toasts: Toast[];
  /** One-shot fly-to request consumed by the map. */
  flyTo: { lat: number; lng: number; zoom?: number; ts: number } | null;
  /** Last known map bbox "w,s,e,n" — used by radar. */
  bbox: string | null;
}

const initial: AppState = {
  boot: 'loading',
  me: null,
  online: 1,
  tab: 'map',
  profileOpen: false,
  viewProfileId: null,
  dm: { open: false, withUser: null, threads: [], threadsLoaded: false, unread: 0 },
  pins: {},
  filterCategory: 'ALL',
  searchQuery: '',
  heatmap: false,
  mapStyle: loadMapStyle(),
  selectedPinId: null,
  creating: false,
  draftLocation: null,
  radar: { phase: 'idle', report: null },
  explore: { when: 'today', items: [], loading: false, loadedAt: 0 },
  people: { cards: [], loading: false, loadedAt: 0 },
  friends: null,
  notifications: [],
  notifLoaded: false,
  unread: 0,
  toasts: [],
  flyTo: null,
  bbox: null,
};

let state: AppState = initial;
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...next };
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export function resetStore(): void {
  state = { ...initial, boot: 'guest' };
  for (const l of listeners) l();
}

/* ---------------- helpers used across actions ---------------- */

let toastSeq = 1;
export function toast(text: string, kind: Toast['kind'] = 'info'): void {
  const id = toastSeq++;
  setState((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
  setTimeout(() => {
    setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }, 3800);
}

export function upsertPins(pins: PinSummary[]): void {
  setState((s) => {
    const next = { ...s.pins };
    for (const p of pins) next[p.id] = p;
    return { pins: next };
  });
}

export function removePin(pinId: string): void {
  setState((s) => {
    const next = { ...s.pins };
    delete next[pinId];
    return { pins: next, selectedPinId: s.selectedPinId === pinId ? null : s.selectedPinId };
  });
}

export function flyTo(lat: number, lng: number, zoom?: number): void {
  setState({ flyTo: { lat, lng, zoom, ts: Date.now() } });
}

export function setMapStyle(id: MapStyleId): void {
  localStorage.setItem(MAP_STYLE_KEY, id);
  setState({ mapStyle: id });
}
