/** sessionStorage key: where to send the user after Discord OAuth completes (same tab). */
export const POST_LOGIN_RETURN_STORAGE_KEY = "ff_post_login_return";

export const DEFAULT_POST_LOGIN_PATH = "/home";

const MAX_RETURN_PATH_LENGTH = 2048;

/** Path prefixes that must not be used as post-login targets (avoid loops / auth pages). */
const DENIED_PATH_PREFIXES = [
  "/auth/login",
  "/connect/discord/redirect",
  "/auth/callback",
  "/auth/error",
  "/auth/success",
] as const;

/**
 * Returns a safe same-origin path+optional search for post-login redirect, or null.
 * Rejects open redirects, scheme tricks, path traversal, and auth/OAuth routes.
 */
export function sanitizeReturnPath(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_RETURN_PATH_LENGTH) return null;
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//") || trimmed.includes("\\")) return null;

  const qOrHash = trimmed.search(/[?#]/);
  const pathPart = qOrHash === -1 ? trimmed : trimmed.slice(0, qOrHash);
  if (pathPart.includes(":")) return null;
  if (pathPart.includes("..")) return null;

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(pathPart);
  } catch {
    return null;
  }
  if (decodedPath.includes("..") || decodedPath.startsWith("//")) return null;

  const normalizedPath =
    decodedPath.length > 1 && decodedPath.endsWith("/")
      ? decodedPath.slice(0, -1)
      : decodedPath;

  for (const prefix of DENIED_PATH_PREFIXES) {
    if (normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)) {
      return null;
    }
  }

  return trimmed;
}

export function setStoredPostLoginReturn(raw: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const safe = sanitizeReturnPath(raw);
  if (safe) {
    try {
      sessionStorage.setItem(POST_LOGIN_RETURN_STORAGE_KEY, safe);
    } catch {
      /* storage blocked */
    }
  } else {
    try {
      sessionStorage.removeItem(POST_LOGIN_RETURN_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Reads and clears the stored path; returns default if missing or invalid. */
export function takeStoredPostLoginReturn(): string {
  if (typeof window === "undefined") return DEFAULT_POST_LOGIN_PATH;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(POST_LOGIN_RETURN_STORAGE_KEY);
    sessionStorage.removeItem(POST_LOGIN_RETURN_STORAGE_KEY);
  } catch {
    return DEFAULT_POST_LOGIN_PATH;
  }
  return sanitizeReturnPath(raw) ?? DEFAULT_POST_LOGIN_PATH;
}

export function clearStoredPostLoginReturn(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(POST_LOGIN_RETURN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
