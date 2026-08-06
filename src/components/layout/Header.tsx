"use client";

import Link from "next/link";
import { Package, Sparkles, Plus, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/hooks/AuthContext";

// lucide-react dropped its brand icons (incl. Github), so inline the mark to
// keep the GitHub link's visual without depending on a removed export.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

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
            <GithubIcon className="h-5 w-5" />
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
