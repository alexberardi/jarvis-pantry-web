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

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // Corrupted — clear
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  // Handle OAuth callback (code in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code || token) return;

    (async () => {
      try {
        const result = await exchangeGitHubCode(code);
        localStorage.setItem(TOKEN_KEY, result.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        setToken(result.access_token);
        setUser(result.user);
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname);
      } catch {
        console.error("GitHub OAuth callback failed");
      }
    })();
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
    setToken(null);
    setUser(null);
  }, []);

  const validate = useCallback(async () => {
    if (!token) return false;
    try {
      const user = await getCurrentUser(token);
      setUser(user);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return true;
    } catch {
      logout();
      return false;
    }
  }, [token, logout]);

  return { user, token, loading, login, logout, validate };
}
