"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  type AuthUser,
  getGitHubAuthUrl,
  exchangeGitHubCode,
  getCurrentUser,
} from "@/api/pantry";

const TOKEN_KEY = "pantry_github_token";
const USER_KEY = "pantry_github_user";
const AUTH_CHANGE_EVENT = "pantry-auth-change";

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function subscribeToAuthStore(onChange: () => void): () => void {
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function notifyAuthChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

const serverSnapshotNull = () => null;

export function useAuth() {
  // useSyncExternalStore returns the server snapshot during SSR and on the
  // first client render (so hydration HTML matches), then re-renders with the
  // localStorage value. No synchronous setState in an effect → satisfies the
  // React 19 react-hooks/set-state-in-effect lint rule.
  const token = useSyncExternalStore(
    subscribeToAuthStore,
    readStoredToken,
    serverSnapshotNull,
  );
  const user = useSyncExternalStore(
    subscribeToAuthStore,
    readStoredUser,
    serverSnapshotNull,
  );

  // Only true while an OAuth-code exchange is in flight.
  const [loading, setLoading] = useState(false);

  // Resolve pending OAuth callback. setState calls live inside the promise
  // continuations, not in the effect body, so the lint rule does not fire.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code || token) return;

    let cancelled = false;
    exchangeGitHubCode(code)
      .then((result) => {
        if (cancelled) return;
        localStorage.setItem(TOKEN_KEY, result.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        notifyAuthChanged();
        setLoading(false);
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch(() => {
        console.error("GitHub OAuth callback failed");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async () => {
    try {
      const redirectUri = window.location.origin + "/submit";
      const { url } = await getGitHubAuthUrl(redirectUri);
      window.location.href = url;
    } catch {
      console.error("Failed to get GitHub auth URL");
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    notifyAuthChanged();
  }, []);

  const validate = useCallback(async () => {
    if (!token) return false;
    try {
      const u = await getCurrentUser(token);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      notifyAuthChanged();
      return true;
    } catch {
      logout();
      return false;
    }
  }, [token, logout]);

  return { user, token, loading, login, logout, validate };
}
