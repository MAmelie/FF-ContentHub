// lib/auth.ts
import type { AppUser } from "./types";

export interface User {
  id: number;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
}

const MOCK_USER: AppUser = { id: "dev-user", username: "DevUser" };
const AUTH_COOKIE_NAME = "ff_auth";

/** First name from email (e.g. ameli@example.com → "Ameli"), or username if no email. */
export function getDisplayName(user: User | null): string {
  if (!user) return "";
  if (user.email && user.email.includes("@")) {
    const local = user.email.split("@")[0].trim();
    const parts = local.split(/[._-]+/).filter(Boolean);
    const clean = (value: string) => value.replace(/[^a-zA-Z]/g, "");
    const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    const first = clean(parts[0] ?? "");
    const last = clean(parts[parts.length - 1] ?? "");

    if (parts.length >= 2 && first && last) {
      return `${capitalize(first)} ${capitalize(last)}`;
    }

    if (parts.length >= 1 && first) {
      return capitalize(first);
    }
  }
  return user.username;
}

/** True when running on localhost (local dev) or when bypass env is set. */
function isLocalOrBypass(): boolean {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") return true;
  return process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";
}

/** Returns the current user for personalization. Uses stored user when authenticated; in dev can return mock. */
export function getCurrentUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  const user = getUser();
  if (user) {
    return {
      id: String(user.id),
      username: getDisplayName(user),
      avatarUrl: (user as User & { avatarUrl?: string }).avatarUrl,
    };
  }
  if (isLocalOrBypass()) {
    return MOCK_USER;
  }
  return null;
}

/** Sets auth state for a test user so you can develop without Discord. Call from LoginModal "Use test user". */
export function loginWithTestUser(): void {
  if (typeof window === "undefined") return;
  setAuthData("dev-jwt", {
    id: 0,
    username: MOCK_USER.username,
    email: "",
    confirmed: true,
    blocked: false,
    createdAt: "",
    updatedAt: "",
  });
}

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jwt');
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = (): boolean => {
  // Local dev: skip Discord auth on localhost; production requires real login
  if (typeof window !== "undefined" && window.location.hostname === "localhost") return true;
  if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") return true;
  return !!getAuthToken();
};

export const logout = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('jwt');
  localStorage.removeItem('user');
  document.cookie = `${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  window.location.href = '/auth/login';
};

export const setAuthData = (jwt: string, user: User): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('jwt', jwt);
  localStorage.setItem('user', JSON.stringify(user));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE_NAME}=1; Max-Age=${60 * 60 * 24 * 7}; Path=/; SameSite=Lax${secure}`;
};
