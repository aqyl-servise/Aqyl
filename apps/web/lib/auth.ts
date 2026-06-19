// Token storage for the B2C flow.
//
// - accessToken: kept in memory + sessionStorage (NOT localStorage), and mirrored into the
//   `aqyl-token` cookie so the Next.js middleware can gate /dashboard/b2c.
// - refreshToken: kept in localStorage under `aqyl_refresh_token`.
//
// getValidAccessToken() transparently refreshes an expired access token using the refresh token.

import { api } from "./api";

const ACCESS_KEY = "aqyl_access_token";
const REFRESH_KEY = "aqyl_refresh_token";
const COOKIE_NAME = "aqyl-token";

let accessTokenInMemory: string | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function setCookie(token: string) {
  // 30-day cookie; the JWT inside still governs validity (middleware checks exp).
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=2592000; SameSite=Strict`;
}

function clearCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

export function getAccessToken(): string | null {
  if (accessTokenInMemory) return accessTokenInMemory;
  if (!isBrowser()) return null;
  accessTokenInMemory = sessionStorage.getItem(ACCESS_KEY);
  return accessTokenInMemory;
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setAccessToken(token: string) {
  accessTokenInMemory = token;
  if (!isBrowser()) return;
  sessionStorage.setItem(ACCESS_KEY, token);
  setCookie(token);
}

export function setTokens(pair: { accessToken: string; refreshToken: string }) {
  setAccessToken(pair.accessToken);
  if (isBrowser()) localStorage.setItem(REFRESH_KEY, pair.refreshToken);
}

export function clearTokens() {
  accessTokenInMemory = null;
  if (!isBrowser()) return;
  sessionStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  clearCookie();
}

/** Milliseconds-since-epoch of the token's `exp` claim, or 0 if unreadable. */
function tokenExpiryMs(token: string): number {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/**
 * Returns a non-expired access token, refreshing via the refresh token when needed.
 * Returns null if there is no valid session (caller should redirect to login).
 */
export async function getValidAccessToken(): Promise<string | null> {
  const access = getAccessToken();
  // 30s safety buffer so we don't hand back a token that expires mid-request.
  if (access && tokenExpiryMs(access) > Date.now() + 30_000) return access;

  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const pair = await api.refreshToken(refresh);
    setTokens(pair);
    return pair.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

/** Revoke the refresh token server-side and clear local storage. */
export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  const access = getAccessToken();
  if (refresh && access) {
    try {
      await api.logout(access, refresh);
    } catch {
      /* ignore — clear locally regardless */
    }
  }
  clearTokens();
}
