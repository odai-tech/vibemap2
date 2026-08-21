import type {
  AppNotification,
  ChatMessage,
  CreatePinBody,
  DmMessage,
  DmThread,
  ExploreItem,
  FriendsPayload,
  FriendState,
  Me,
  PersonCard,
  PinDetail,
  PinSummary,
  RadarReport,
  RegisterBody,
  UserLite,
  UserProfile,
} from '@shared/types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, typeof data.error === 'string' ? data.error : `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  /* auth */
  me: () => request<{ user: Me; unread: number; unreadDm: number }>('/api/me'),
  register: (body: RegisterBody) => request<{ user: Me }>('/api/auth/register', { method: 'POST', body }),
  login: (email: string, password: string) =>
    request<{ user: Me }>('/api/auth/login', { method: 'POST', body: { email, password } }),
  demo: () => request<{ user: Me }>('/api/auth/demo', { method: 'POST' }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  updateMe: (patch: Partial<{ name: string; bio: string; statusLine: string; openToMeet: boolean; interests: string[] }>) =>
    request<{ user: Me }>('/api/me', { method: 'PATCH', body: patch }),
  beacon: (lat: number, lng: number) => request<{ ok: true }>('/api/me/location', { method: 'POST', body: { lat, lng } }),

  /* pins */
  pins: (bbox?: string, category?: string) => {
    const params = new URLSearchParams();
    if (bbox) params.set('bbox', bbox);
    if (category && category !== 'ALL') params.set('category', category);
    const qs = params.toString();
    return request<{ pins: PinSummary[] }>(`/api/pins${qs ? `?${qs}` : ''}`);
  },
  pin: (id: string) => request<{ pin: PinDetail }>(`/api/pins/${id}`),
  createPin: (body: CreatePinBody) => request<{ pin: PinSummary }>('/api/pins', { method: 'POST', body }),
  deletePin: (id: string) => request<{ ok: true }>(`/api/pins/${id}`, { method: 'DELETE' }),
  joinPin: (id: string) => request<{ pin: PinSummary }>(`/api/pins/${id}/join`, { method: 'POST' }),
  leavePin: (id: string) => request<{ pin: PinSummary }>(`/api/pins/${id}/leave`, { method: 'POST' }),
  messages: (pinId: string) => request<{ messages: ChatMessage[] }>(`/api/pins/${pinId}/messages`),
  sendMessage: (pinId: string, body: string) =>
    request<{ message: ChatMessage }>(`/api/pins/${pinId}/messages`, { method: 'POST', body: { body } }),

  /* discovery */
  explore: (when: string) => request<{ items: ExploreItem[] }>(`/api/explore?when=${when}`),
  radar: (bbox: string) => request<{ report: RadarReport }>(`/api/radar?bbox=${bbox}`),

  /* social */
  profile: (userId: string) => request<{ profile: UserProfile }>(`/api/users/${userId}`),
  people: () => request<{ people: PersonCard[] }>('/api/people'),
  friends: () => request<FriendsPayload>('/api/friends'),
  wave: (userId: string) => request<{ state: FriendState }>('/api/friends/request', { method: 'POST', body: { userId } }),
  respond: (userId: string, accept: boolean) =>
    request<{ state: FriendState }>('/api/friends/respond', { method: 'POST', body: { userId, accept } }),

  /* direct messages */
  dmThreads: () => request<{ threads: DmThread[] }>('/api/dm'),
  dmMessages: (userId: string) => request<{ user: UserLite; messages: DmMessage[] }>(`/api/dm/${userId}`),
  dmSend: (userId: string, body: string) =>
    request<{ message: DmMessage }>(`/api/dm/${userId}`, { method: 'POST', body: { body } }),
  dmRead: (userId: string) => request<{ ok: true }>(`/api/dm/${userId}/read`, { method: 'POST' }),

  /* notifications */
  notifications: () => request<{ notifications: AppNotification[] }>('/api/notifications'),
  markRead: () => request<{ ok: true }>('/api/notifications/read', { method: 'POST' }),
};
