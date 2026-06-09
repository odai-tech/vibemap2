export enum PinType {
  STORY = 'STORY',
  EVENT = 'EVENT',
  MOMENT = 'MOMENT',
  BUSINESS = 'BUSINESS'
}

export enum VibeCategory {
  CHILL = 'CHILL',
  PARTY = 'PARTY',
  STUDY = 'STUDY',
  OUTDOOR = 'OUTDOOR',
  NETWORKING = 'NETWORKING',
  FOOD = 'FOOD'
}

export interface User {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  isVerified?: boolean;
  bio?: string;
  followers?: number;
  following?: number;
  // New fields for AI matching
  persona?: string; 
  interests?: string[];
}

export interface Pin {
  id: string;
  type: PinType;
  category: VibeCategory;
  lat: number;
  lng: number;
  title?: string; // Optional for stories
  description?: string;
  mediaUrl?: string; // Image or Video
  author: User;
  createdAt: number;
  expiresAt?: number; // For stories/moments
  eventTime?: number; // For events
  attendees?: number;
  price?: number; // 0 for free
  isLive?: boolean;
  tags?: string[];
}

export interface MapViewport {
  center: [number, number];
  zoom: number;
}

export interface AIRadarResponse {
  vibeSummary: string;
  recommendation: string;
  hotspot: string;
}