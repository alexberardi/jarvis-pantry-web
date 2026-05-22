"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type AuthUser,
  getGitHubAuthUrl,
  exchangeGitHubCode,
  getCurrentUser,
} from "@/api/pantry";

const TOKEN_KEY = "pantry_github_token";
const USER_KEY = "pantry_github_user";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser(): AuthUser | null {
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

export function useAuth() {
  // Initial state must match SSR output (no window, no localStorage) — reading
  // localStorage from a useState initializer makes the server render `null` and
  // the client hydrate with a stored value, which is a guaranteed mismatch.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage after mount, and resolve any pending OAuth callback.
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    setUser(storedUser);
    setToken(storedToken);

    const code = new URLSearchParams(window.location.search).get("code");
    if (!code || storedToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    exchangeGitHubCode(code)
      .then((result) => {
        if (cancelled) return;
        localStorage.setItem(TOKEN_KEY, result.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        setToken(result.access_token);
        setUser(result.user);
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
  }, []);

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
    setToken(null);
    setUser(null);
  }, []);

  const validate = useCallback(async () => {
    if (!token) return false;
    try {
      const u = await getCurrentUser(token);
      setUser(u);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      return true;
    } catch {
      logout();
      return false;
    }
  }, [token, logout]);

  return { user, token, loading, login, logout, validate };
}
