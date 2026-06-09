import { Pin, PinType, VibeCategory, User } from './types';

// Default Location: Union Square, San Francisco
export const DEFAULT_CENTER: [number, number] = [37.7879, -122.4075];
export const DEFAULT_ZOOM = 16;

export const CURRENT_USER: User = {
  id: 'me',
  name: 'Alex Rivera',
  handle: '@arivera',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
  isVerified: true,
  followers: 1205,
  following: 450,
  bio: 'Digital nomad exploring the city. Coffee addict ☕️',
  // AI Persona Data
  persona: 'Software Engineer and Tech Enthusiast. Introverted but enjoys small group discussions, coding sessions, and finding quiet, aesthetic coffee shops. Avoids loud nightclubs.',
  interests: ['Coding', 'Startups', 'Coffee', 'Jazz', 'Tech']
};

const USERS: Record<string, User> = {
  sarah: {
    id: 'u2',
    name: 'Sarah Jenkins',
    handle: '@sarahj',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150',
    isVerified: true
  },
  david: {
    id: 'u3',
    name: 'David Chen',
    handle: '@dchen_dev',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150',
    isVerified: false
  },
  skate: {
    id: 'u4',
    name: 'Bay Area Skaters',
    handle: '@bayskate',
    avatarUrl: 'https://images.unsplash.com/photo-1520013573759-99c562e84126?auto=format&fit=crop&w=150&h=150',
    isVerified: false
  },
  club: {
    id: 'b1',
    name: 'The Grand',
    handle: '@thegrand_sf',
    avatarUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=150&h=150',
    isVerified: true
  }
};

export const INITIAL_PINS: Pin[] = [
  {
    id: 'p1',
    type: PinType.EVENT,
    category: VibeCategory.PARTY,
    lat: 37.7885,
    lng: -122.4085,
    title: 'Rooftop Sunset Jam',
    description: 'Live jazz, cocktails, and good vibes. Come through before 8pm for free entry!',
    mediaUrl: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&w=600&h=400',
    author: USERS.sarah,
    createdAt: Date.now(),
    eventTime: Date.now() + 3600000,
    attendees: 142,
    price: 15,
    isLive: true,
    tags: ['Music', 'Rooftop', 'Cocktails']
  },
  {
    id: 'p2',
    type: PinType.MOMENT,
    category: VibeCategory.STUDY,
    lat: 37.7870,
    lng: -122.4060,
    title: 'Late Night Code Sesh',
    description: 'Grinding on the new VibeMap update. Anyone want to join? Quiet table in the back.',
    mediaUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&h=400',
    author: USERS.david,
    createdAt: Date.now() - 1800000,
    attendees: 3,
    price: 0,
    tags: ['Coding', 'Study', 'Coffee']
  },
  {
    id: 'p3',
    type: PinType.STORY,
    category: VibeCategory.OUTDOOR,
    lat: 37.7895,
    lng: -122.4090,
    description: 'Sunset at Union Square is undefeated today 🌅',
    mediaUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=600&h=800', // Portrait for stories
    author: USERS.skate,
    createdAt: Date.now() - 7200000,
    expiresAt: Date.now() + 86400000,
    isLive: false,
    tags: ['Skate', 'Sunset', 'Chill']
  },
  {
    id: 'p4',
    type: PinType.BUSINESS,
    category: VibeCategory.PARTY,
    lat: 37.7865,
    lng: -122.4045,
    title: 'Flash Deal: 2-for-1 Drinks',
    description: 'Show this pin at the bar for a discount!',
    mediaUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&h=400',
    author: USERS.club,
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000,
    price: 0,
    isLive: true
  },
  {
    id: 'p5',
    type: PinType.STORY,
    category: VibeCategory.FOOD,
    lat: 37.7875,
    lng: -122.4070,
    description: 'Best tacos in the city right here 🌮',
    mediaUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&h=800',
    author: USERS.sarah,
    createdAt: Date.now() - 3600000,
    expiresAt: Date.now() + 86400000
  }
];