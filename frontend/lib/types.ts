// lib/types.ts
// export Interface for Image Data
export interface ImageData {
  url: string;
  mime?: string;
  mimeType?: string; // Strapi v5 sometimes returns this instead of mime
  alternativeText?: string;
  name?: string;
  size?: number;
}

export interface ListItem {
  id: number;
  title: string;
  date?: string;
  link?: string;
  description?: string;
  attachment?: ImageData;
}

export interface Doc {
  id: number;
  subtitle?: string;
  content: string; // rich markdown content
  slug: string;
}

export type RecommendationCategory =
  | "What to read"
  | "What to watch"
  | "What to listen to"
  | "Who to follow";

export interface Recommendation {
  id: number;
  category: RecommendationCategory;
  title: string;
  description?: string;
  recommended_by?: string;
  link?: string;
}

export interface Tile {
  id: number;
  title: string;
  slug: string;
  description: string;
  docs?: Doc[]; // Array of Doc content
  createdAt: string; // ISO date string
  cover: ImageData; // Featured image for the tile
  link: string; // External or internal link
  link_to_single_type: boolean; // Boolean indicating if tile should link to single type page
  list_items?: ListItem[]; // Direct list items on the tile
  recommendations?: Recommendation[]; // Curated read/watch/listen/follow entries
  category: "archive" | "tool" | "dashboard" | "content" | "experts"; // Category enumeration
}

export interface HomepageHero {
  id: number;
  cover?: ImageData;
  description?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Logo {
  id: number;
  logo?: ImageData[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ExpertBio {
  id: number | string;
  order?: number | null;
  name: string;
  slug?: string;
  title: string;
  photo?: ImageData;
  bio: string;
  advisory_topics?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ExpertNet {
  id: number | string;
  title?: string;
  description?: string;
  expert_bios?: ExpertBio[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Document {
  id: number | string; // Strapi v5 uses documentId (string)
  title: string;
  description?: string | null;
  file: ImageData;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  /** Display order (lower = first). Used for podcasts list. */
  order?: number | null;
  /** Episode publish date; shown in UI, fallback to publishedAt if unset. */
  publishedDate?: string | null;
  /** Meeting readoutss page: which section header (matches MEMBER_SESSION_GROUPS id). */
  sessionGroup?: string | null;
  /** Meeting readoutss page: optional subgroup (e.g. general-model-updates, coding-agents). */
  sessionSubGroup?: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
}

/** User identity for app personalization (Discord or mock). id is string for Discord compatibility. */
export interface AppUser {
  id: string;
  username: string;
  avatarUrl?: string;
}

export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface Appointment {
  id?: number;
  documentId?: string;
  expert: number | ExpertBio;
  user?: number;
  preferred_date: string;
  preferred_time?: string | null;
  message?: string | null;
  status: AppointmentStatus;
  createdAt?: string;
  updatedAt?: string;
}
