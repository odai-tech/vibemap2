import type { PinType, VibeCategory } from './types.ts';

/** Category metadata shared by the vibe engine (labels) and the client (colors). */
export const CATEGORY_META: Record<
  VibeCategory,
  { label: string; color: string; soft: string; impliedTags: string[] }
> = {
  CHILL: {
    label: 'Chill',
    color: '#38BDF8',
    soft: 'rgba(56,189,248,0.16)',
    impliedTags: ['Coffee', 'Books', 'Yoga', 'Film'],
  },
  PARTY: {
    label: 'Party',
    color: '#F472B6',
    soft: 'rgba(244,114,182,0.16)',
    impliedTags: ['Cocktails', 'Dancing'],
  },
  STUDY: {
    label: 'Study',
    color: '#818CF8',
    soft: 'rgba(129,140,248,0.16)',
    impliedTags: ['Coding', 'Books', 'AI', 'Languages'],
  },
  OUTDOOR: {
    label: 'Outdoor',
    color: '#34D399',
    soft: 'rgba(52,211,153,0.16)',
    impliedTags: ['Hiking', 'Running', 'Climbing', 'Photography'],
  },
  NETWORKING: {
    label: 'Network',
    color: '#FBBF24',
    soft: 'rgba(251,191,36,0.16)',
    impliedTags: ['Startups', 'Crypto', 'AI', 'Design'],
  },
  FOOD: {
    label: 'Food',
    color: '#FB923C',
    soft: 'rgba(251,146,60,0.16)',
    impliedTags: ['Foodie', 'Street Food', 'Coffee'],
  },
  MUSIC: {
    label: 'Music',
    color: '#A78BFA',
    soft: 'rgba(167,139,250,0.16)',
    impliedTags: ['Jazz', 'Live Music', 'Dancing'],
  },
  SPORT: {
    label: 'Sport',
    color: '#F87171',
    soft: 'rgba(248,113,113,0.16)',
    impliedTags: ['Running', 'Climbing', 'Yoga', 'Gaming'],
  },
};

export const TYPE_META: Record<
  PinType,
  { label: string; tagline: string; defaultTtlMs: number | null; capped: boolean }
> = {
  TABLE: {
    label: 'Table',
    tagline: 'Small group, real conversations. 2–8 seats.',
    defaultTtlMs: null,
    capped: true,
  },
  EVENT: {
    label: 'Event',
    tagline: 'Open gathering — the more the merrier.',
    defaultTtlMs: null,
    capped: false,
  },
  MOMENT: {
    label: 'Moment',
    tagline: 'Happening right now. Expires in 4 hours.',
    defaultTtlMs: 4 * 3600_000,
    capped: false,
  },
  DROP: {
    label: 'Drop',
    tagline: 'Leave a vibe note on the map. Fades in 24 hours.',
    defaultTtlMs: 24 * 3600_000,
    capped: false,
  },
};

/** How long a scheduled pin stays on the map after it starts. */
export const EVENT_LINGER_MS = 4 * 3600_000;
