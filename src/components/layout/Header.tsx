"use client";

import Link from "next/link";
import { Package, Sparkles, Plus, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/hooks/AuthContext";

export function Header() {
  const { user, loading, login, logout } = useAuthContext();

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Package className="h-7 w-7 text-[var(--color-primary)]" />
          <span className="text-xl font-bold text-[var(--color-text)]">
            Pantry
          </span>
          <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
            beta
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            Browse
          </Link>
          <Link
            href="/submit"
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            <Plus className="h-4 w-4" />
            Submit
          </Link>
          <Link
            href="/forge"
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition-colors",
              "text-[var(--color-primary)] hover:text-[var(--color-primary)]/80"
            )}
          >
            <Sparkles className="h-4 w-4" />
            Forge
          </Link>
          <a
            href="https://github.com/alexberardi/jarvis"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            {/* Inline GitHub mark — lucide v1 dropped brand icons (trademark) */}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </a>

          {/* Auth */}
          {!loading && (
            user ? (
              <div className="flex items-center gap-2">
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.github_username}
                    className="h-7 w-7 rounded-full"
                  />
                )}
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {user.github_username}
                </span>
                <button
                  onClick={logout}
                  className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-alt)]"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </button>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
