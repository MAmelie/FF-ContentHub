// lib/api.ts
import axios, { AxiosInstance } from "axios";
import { getAuthToken } from "./auth";

// Use Strapi URL from env; in local dev fall back to localhost so the app works without .env
const strapiUrl =
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:1337" : "");

export const api: AxiosInstance = axios.create({
  baseURL: strapiUrl,
});

// Fake token used by "Use test user" in dev; Strapi would reject it, so don't send it.
const DEV_FAKE_JWT = "dev-jwt";

// Add auth token to requests if available (skip fake dev token so Strapi treats request as public)
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && token !== DEV_FAKE_JWT) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get all tiles. Returns { tiles: [] } on error so the app can render when backend is unreachable.
export const getAllTiles = async (searchQuery: string = "") => {
  try {
    const searchFilter = searchQuery
      ? `&filters[title][$containsi]=${searchQuery}`
      : "";
    // Strapi v5 populate syntax: use nested object format instead of array indices
    const response = await api.get(
      `api/tiles?populate[cover]=true&populate[list_items][populate][attachment]=true&populate[docs]=true${searchFilter}`
    );
    return {
      tiles: response.data.data,
    };
  } catch (error) {
    console.warn("Tiles not available (backend may be down):", error instanceof Error ? error.message : error);
    return { tiles: [] };
  }
};

// Get tile by slug
export const getTileBySlug = async (slug: string) => {
  try {
    // Strapi v5 populate syntax: use nested object format instead of array indices
    const response = await api.get(
      `api/tiles?filters[slug]=${slug}&populate[cover]=true&populate[list_items][populate][attachment]=true&populate[docs]=true` // &populate[recommendations]=true — commented out; only list items (e.g. 4 PDFs) shown on Additional content
    ); // Fetch a single tile using the slug parameter with proper nested population
    if (response.data.data.length > 0) {
      // If tile exists
      return response.data.data[0]; // Return the tile data
    }
    throw new Error("Tile not found.");
  } catch (error) {
    console.error("Error fetching tile:", error);
    throw new Error("Server error");
  }
};

// Get homepage hero content. Returns null on error so the app can render when backend is unreachable.
// Tries singular path first (single types in some Strapi setups use singular API ID).
export const getHomepageHero = async () => {
  for (const path of ["api/homepage-hero?populate=cover", "api/homepage-heroes?populate=cover"]) {
    try {
      const response = await api.get(path);
      const data = response.data?.data;
      return data ?? null;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) continue;
      console.warn("Homepage hero not available (backend may be down):", err instanceof Error ? err.message : err);
      return null;
    }
  }
  return null;
};

// Normalize one logo media item (Strapi v4/v5 can return { url } or { data: { attributes: { url } } }).
function normalizeLogoItem(media: unknown): { url: string; mime?: string; name?: string; alternativeText?: string } | null {
  if (!media || typeof media !== "object") return null;
  const m = media as Record<string, unknown>;
  const dataAttrs = (m.data as Record<string, unknown>)?.attributes as Record<string, unknown> | undefined;
  const url =
    (m.url as string) ??
    (m.attributes as Record<string, unknown>)?.url ??
    dataAttrs?.url;
  const urlStr = typeof url === "string" ? url : "";
  if (!urlStr) return null;
  const attrs = (m.attributes ?? (m.data as Record<string, unknown>)?.attributes) as Record<string, unknown> | undefined;
  return {
    url: urlStr,
    mime: (m.mime ?? attrs?.mime ?? m.mimeType ?? attrs?.mimeType) as string | undefined,
    name: (m.name ?? attrs?.name) as string | undefined,
    alternativeText: (m.alternativeText ?? attrs?.alternativeText) as string | undefined,
  };
}

// Get logo content. Returns null on network/API error. Normalizes logo to always be an array of { url, ... } (Strapi v4/v5).
// Tries singular path first (single types in some Strapi setups use singular API ID).
export const getLogo = async (): Promise<{ id: number; logo: { url: string; mime?: string; name?: string; alternativeText?: string }[]; createdAt: string; updatedAt: string; publishedAt: string } | null> => {
  // Do not send populate from client: Strapi 5 can reject with "Invalid key related at logo.related".
  // The backend logo controller forces a safe populate so media is still returned.
  for (const path of ["api/logo", "api/logos"]) {
    try {
      const response = await api.get(path);
      const data = response.data?.data;
      if (!data || typeof data !== "object") continue;
      const raw = data as Record<string, unknown>;
      const attrs = (raw.attributes ?? raw) as Record<string, unknown>;
      const logoRaw = raw.logo ?? attrs.logo;
      let logoArray: unknown[] = [];
      if (Array.isArray(logoRaw)) {
        logoArray = logoRaw;
      } else if (logoRaw && typeof logoRaw === "object" && Array.isArray((logoRaw as Record<string, unknown>).data)) {
        logoArray = (logoRaw as { data: unknown[] }).data;
      }
      const logo = logoArray.map(normalizeLogoItem).filter((item): item is NonNullable<typeof item> => item !== null);
      return {
        id: (raw.id as number) ?? 0,
        logo,
        createdAt: (raw.createdAt as string) ?? (attrs.createdAt as string) ?? "",
        updatedAt: (raw.updatedAt as string) ?? (attrs.updatedAt as string) ?? "",
        publishedAt: (raw.publishedAt as string) ?? (attrs.publishedAt as string) ?? "",
      };
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) continue;
      console.warn("Logo not available (backend may be down):", err instanceof Error ? err.message : err);
      return null;
    }
  }
  return null;
};

// Get all users
export const getUsers = async () => {
  try {
    const response = await api.get("api/users");
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Server error");
  }
};

// Normalize Strapi v4/v5 document and media shape so frontend always gets { id, title, file: { url, mime, mimeType } }
function normalizeFile(file: unknown): { url: string; mime?: string; mimeType?: string; name?: string; size?: number; alternativeText?: string } {
  if (!file || typeof file !== "object") return { url: "" };
  const f = file as Record<string, unknown>;
  if (f.url && typeof f.url === "string") {
    return {
      url: f.url,
      mime: (f.mime as string) ?? (f.mimeType as string),
      mimeType: (f.mimeType as string) ?? (f.mime as string),
      name: f.name as string,
      size: f.size as number,
      alternativeText: f.alternativeText as string,
    };
  }
  const attrs = (f.attributes ?? (f.data as Record<string, unknown>)?.attributes) as Record<string, unknown> | undefined;
  if (attrs) {
    return {
      url: (attrs.url as string) ?? "",
      mime: (attrs.mime as string) ?? (attrs.mimeType as string),
      mimeType: (attrs.mimeType as string) ?? (attrs.mime as string),
      name: attrs.name as string,
      size: attrs.size as number,
      alternativeText: attrs.alternativeText as string,
    };
  }
  return { url: "" };
}

function normalizeDocument(raw: Record<string, unknown>): {
  id: number | string;
  title: string;
  description?: string | null;
  file: ReturnType<typeof normalizeFile>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  order?: number | null;
  publishedDate?: string | null;
} {
  const attrs = raw.attributes as Record<string, unknown> | undefined;
  const title = (raw.title as string) ?? (attrs?.title as string) ?? "";
  const file = normalizeFile(raw.file ?? attrs?.file);
  const orderRaw = raw.order ?? attrs?.order;
  const order = typeof orderRaw === "number" && !Number.isNaN(orderRaw) ? orderRaw : null;
  const publishedDate = (raw.publishedDate as string) ?? (attrs?.publishedDate as string) ?? null;
  return {
    id: (raw.id as number) ?? (raw.documentId as string) ?? 0,
    title,
    description: (raw.description as string) ?? (attrs?.description as string) ?? null,
    file,
    createdAt: (raw.createdAt as string) ?? (attrs?.createdAt as string) ?? "",
    updatedAt: (raw.updatedAt as string) ?? (attrs?.updatedAt as string) ?? "",
    publishedAt: (raw.publishedAt as string) ?? (attrs?.publishedAt as string) ?? "",
    order: order ?? undefined,
    publishedDate: publishedDate ?? undefined,
  };
}

// Get all documents (used for /documents page and /podcasts – podcasts = documents with audio file)
export const getAllDocuments = async () => {
  try {
    const response = await api.get("api/documents?populate=file&pagination[pageSize]=100");
    const data = response.data?.data;
    const rawList = Array.isArray(data) ? data : [];
    const documents = rawList.map((item: Record<string, unknown>) => normalizeDocument(item));
    return { documents };
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw new Error("Server error");
  }
};

// Normalize a single media object (photo) from Strapi v4/v5
function normalizeMedia(media: unknown): { url: string; mime?: string; mimeType?: string; name?: string; alternativeText?: string } | undefined {
  if (!media || typeof media !== "object") return undefined;
  const m = media as Record<string, unknown>;
  const dataAttrs = (m.data as Record<string, unknown>)?.attributes as Record<string, unknown> | undefined;
  const url =
    (m.url as string)
    ?? dataAttrs?.["url"]
    ?? (m.attributes as Record<string, unknown>)?.["url"];
  if (!url) return undefined;
  const attrs = (m.attributes as Record<string, unknown>) ?? (m.data as Record<string, unknown>)?.attributes as Record<string, unknown> | undefined;
  return {
    url,
    mime: (m.mime as string) ?? attrs?.mime as string ?? (m.mimeType as string),
    mimeType: (m.mimeType as string) ?? attrs?.mimeType as string ?? (m.mime as string),
    name: (m.name as string) ?? attrs?.name as string,
    alternativeText: (m.alternativeText as string) ?? attrs?.alternativeText as string,
  };
}

// Normalize one expert bio from Strapi v4/v5 (relation item can be flat or under attributes)
function normalizeExpertBio(raw: Record<string, unknown>): {
  id: number | string;
  order?: number | null;
  name: string;
  slug?: string;
  title: string;
  photo?: ReturnType<typeof normalizeMedia>;
  bio: string;
  advisory_topics?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
} {
  const attrs = raw.attributes as Record<string, unknown> | undefined;
  const name = (raw.name as string) ?? (attrs?.name as string) ?? "";
  const title = (raw.title as string) ?? (attrs?.title as string) ?? "";
  const bio = (raw.bio as string) ?? (attrs?.bio as string) ?? "";
  const photo = normalizeMedia(raw.photo ?? attrs?.photo);
  const orderRaw = raw.order ?? attrs?.order;
  const order = typeof orderRaw === "number" && !Number.isNaN(orderRaw) ? orderRaw : null;
  return {
    id: (raw.id as number) ?? (raw.documentId as string) ?? 0,
    order: order ?? undefined,
    name,
    slug: (raw.slug as string) ?? (attrs?.slug as string),
    title,
    photo,
    bio,
    advisory_topics: (raw.advisory_topics as string) ?? (attrs?.advisory_topics as string) ?? null,
    createdAt: (raw.createdAt as string) ?? (attrs?.createdAt as string) ?? "",
    updatedAt: (raw.updatedAt as string) ?? (attrs?.updatedAt as string) ?? "",
    publishedAt: (raw.publishedAt as string) ?? (attrs?.publishedAt as string) ?? "",
  };
}

// Get expert-net content (single type with relation expert_bios)
export const getExpertNet = async () => {
  try {
    const response = await api.get(
      "api/expert-net?populate[expert_bios][populate]=photo"
    );
    const data = response.data?.data as Record<string, unknown> | undefined;
    if (!data) return null;
    const attrs = data.attributes as Record<string, unknown> | undefined;
    const rawBios = (data.expert_bios ?? attrs?.expert_bios) as unknown;
    const biosArray = Array.isArray(rawBios)
      ? rawBios
      : Array.isArray((rawBios as Record<string, unknown>)?.data)
        ? (rawBios as { data: Record<string, unknown>[] }).data
        : [];
    const expert_bios = biosArray
      .map((b: Record<string, unknown>) => normalizeExpertBio(b))
      .sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
      });
    return {
      id: (data.id as number) ?? (data.documentId as string) ?? 0,
      title: (data.title as string) ?? (attrs?.title as string),
      description: (data.description as string) ?? (attrs?.description as string),
      expert_bios,
      createdAt: (data.createdAt as string) ?? (attrs?.createdAt as string) ?? "",
      updatedAt: (data.updatedAt as string) ?? (attrs?.updatedAt as string) ?? "",
      publishedAt: (data.publishedAt as string) ?? (attrs?.publishedAt as string) ?? "",
    };
  } catch (error) {
    console.error("Error fetching expert-net:", error);
    throw new Error("Server error");
  }
};

// Get a single expert by slug (for dedicated profile pages).
// If no expert has that slug in Strapi yet, falls back to matching by name-derived slug
// so profile pages work before you've re-saved each Expert-Bio in the admin.
export const getExpertBySlug = async (slug: string) => {
  try {
    const response = await api.get(
      `api/expert-bios?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=photo`
    );
    const data = response.data?.data;
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    // Fallback: fetch expert-net and find by slug derived from name (for when slug isn't set in Strapi yet)
    const expertNet = await getExpertNet();
    const bios = expertNet?.expert_bios ?? [];
    const slugFromName = (name: string) =>
      name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/(^-|-$)/g, "");
    const match = bios.find(
      (bio: { name?: string; slug?: string }) =>
        (bio.slug && bio.slug === slug) || slugFromName(bio.name ?? "") === slug
    );
    return match ?? null;
  } catch (error) {
    console.error("Error fetching expert by slug:", error);
    throw new Error("Server error");
  }
};

// --- Appointments (expert booking) ---

export const createAppointment = async (data: {
  expert: number;
  email: string;
  company?: string;
  requested_experts?: string;
  session_date_time?: string;
  preferred_date?: string;
  preferred_time?: string;
  focus: string;
  key_questions: string;
  desired_format: string;
  attendee_count?: string;
  attendee_who?: string;
  attendee_genai_familiarity?: string;
  model_access: string;
  additional_notes?: string;
  message?: string;
}) => {
  try {
    const response = await api.post("api/appointments", {
      data: {
        expert: data.expert,
        email: data.email,
        company: data.company ?? null,
        requested_experts: data.requested_experts ?? null,
        session_date_time: data.session_date_time ?? null,
        preferred_date: data.preferred_date ?? null,
        preferred_time: data.preferred_time ?? null,
        focus: data.focus,
        key_questions: data.key_questions,
        desired_format: data.desired_format,
        attendee_count: data.attendee_count ?? null,
        attendee_who: data.attendee_who ?? null,
        attendee_genai_familiarity: data.attendee_genai_familiarity ?? null,
        model_access: data.model_access,
        additional_notes: data.additional_notes ?? null,
        message: data.message ?? null,
      },
    });
    return response.data;
  } catch (error: unknown) {
    const msg =
      error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { error?: { message?: string } } } })
            .response?.data?.error?.message
        : null;
    console.error("Error creating appointment:", error);
    throw new Error(msg ?? "Failed to submit booking request");
  }
};

export const getMyAppointments = async () => {
  try {
    const response = await api.get(
      "api/appointments?populate[expert][populate]=photo"
    );
    return response.data.data ?? [];
  } catch (error) {
    console.error("Error fetching appointments:", error);
    throw new Error("Failed to load your appointments");
  }
};
