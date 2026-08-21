/**
 * Shared contract between client and server.
 * Erasable-syntax-only TypeScript (no enums) so Node can strip types natively.
 */

export const PIN_TYPES = ['TABLE', 'EVENT', 'MOMENT', 'DROP'] as const;
export type PinType = (typeof PIN_TYPES)[number];

export const VIBE_CATEGORIES = [
  'CHILL',
  'PARTY',
  'STUDY',
  'OUTDOOR',
  'NETWORKING',
  'FOOD',
  'MUSIC',
  'SPORT',
] as const;
export type VibeCategory = (typeof VIBE_CATEGORIES)[number];

export const INTEREST_POOL = [
  'Coffee',
  'Coding',
  'Startups',
  'Jazz',
  'Live Music',
  'Hiking',
  'Running',
  'Climbing',
  'Photography',
  'Art',
  'Design',
  'Books',
  'Board Games',
  'Gaming',
  'Foodie',
  'Street Food',
  'Cocktails',
  'Dancing',
  'Languages',
  'Travel',
  'Film',
  'Yoga',
  'Crypto',
  'AI',
] as const;

export interface UserLite {
  id: string;
  handle: string;
  name: string;
  verified: boolean;
}

export interface PublicUser extends UserLite {
  bio: string;
  interests: string[];
  openToMeet: boolean;
  statusLine: string;
  lastSeen: number;
}

export interface UserStats {
  joined: number;
  hosted: number;
  friends: number;
  messages: number;
  categories: number;
}

export interface Me extends PublicUser {
  email: string;
  stats: UserStats;
}

export interface PinSummary {
  id: string;
  type: PinType;
  category: VibeCategory;
  lat: number;
  lng: number;
  title: string;
  description: string;
  tags: string[];
  author: UserLite;
  createdAt: number;
  /** Epoch ms. Null for spontaneous drops/moments (they are "now"). */
  startsAt: number | null;
  /** Epoch ms after which the pin disappears from the map. */
  expiresAt: number | null;
  /** Max members. Null = unlimited. */
  capacity: number | null;
  attendees: number;
  /** Up to 4 members for the avatar stack. */
  memberPreview: UserLite[];
  /** Whether the requesting user has joined. */
  joined: boolean;
  live: boolean;
  /** Deterministic cover-art variant seed. */
  cover: number;
}

export interface PinDetail extends PinSummary {
  members: UserLite[];
  icebreakers: string[];
}

export interface ChatMessage {
  id: string;
  pinId: string;
  user: UserLite;
  body: string;
  createdAt: number;
}

export const NOTIFICATION_KINDS = ['join', 'wave', 'accept', 'system'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  actor: UserLite | null;
  pin: { id: string; title: string; category: VibeCategory } | null;
  body: string;
  createdAt: number;
  read: boolean;
}

export interface RadarBreakdownRow {
  category: VibeCategory;
  count: number;
  people: number;
}

export interface RadarReport {
  /** 0..100 area energy score */
  energy: number;
  headline: string;
  summary: string;
  recommendation: string;
  recommendedPinId: string | null;
  hotspot: { label: string; lat: number; lng: number } | null;
  breakdown: RadarBreakdownRow[];
  topTags: string[];
  peopleNow: number;
  liveCount: number;
  scannedPins: number;
}

export interface ExploreItem {
  pin: PinSummary;
  /** 0..100 match percentage */
  match: number;
  reasons: string[];
}

export type FriendState = 'none' | 'outgoing' | 'incoming' | 'friends';

/** Full public profile page for a user. */
export interface UserProfile {
  user: PublicUser;
  stats: UserStats;
  friendState: FriendState;
  /** Interests the viewer has in common with this user. */
  sharedInterests: string[];
  /** e.g. "Both in “Rooftop Sunset Jam”" */
  context: string | null;
  /** Active pins this user is hosting. */
  pins: PinSummary[];
}

/* ---------------- direct messages ---------------- */

export interface DmMessage {
  id: string;
  /** Sender user id. */
  from: string;
  /** Recipient user id. */
  to: string;
  body: string;
  createdAt: number;
}

export interface DmThread {
  /** The other person in the conversation. */
  user: UserLite;
  lastBody: string;
  lastFromMe: boolean;
  lastAt: number;
  /** Unread count for the requesting user. */
  unread: number;
}

export interface PersonCard {
  user: PublicUser;
  sharedInterests: string[];
  friendState: FriendState;
  /** e.g. "Both going to Rooftop Sunset Jam" */
  context: string | null;
}

export interface FriendsPayload {
  friends: PersonCard[];
  incoming: PersonCard[];
  outgoing: PersonCard[];
}

/* ---------------- WebSocket protocol ---------------- */

export type ServerEvent =
  | { t: 'hello'; online: number }
  | { t: 'presence'; online: number }
  | { t: 'pin:new'; pin: PinSummary }
  | { t: 'pin:update'; pinId: string; attendees: number; memberPreview: UserLite[] }
  | { t: 'pin:remove'; pinId: string }
  | { t: 'chat'; message: ChatMessage }
  | { t: 'dm'; message: DmMessage; from: UserLite }
  | { t: 'notification'; notification: AppNotification };

export type ClientEvent =
  | { t: 'sub'; pinId: string }
  | { t: 'unsub'; pinId: string }
  | { t: 'ping' };

/* ---------------- API payloads ---------------- */

export interface RegisterBody {
  email: string;
  password: string;
  name: string;
  handle: string;
  interests: string[];
}

export interface CreatePinBody {
  type: PinType;
  category: VibeCategory;
  lat: number;
  lng: number;
  title: string;
  description: string;
  tags: string[];
  startsAt: number | null;
  capacity: number | null;
}

export interface ApiError {
  error: string;
}
