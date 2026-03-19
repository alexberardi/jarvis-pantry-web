"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, GitBranch, Lock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface GitHubRepo {
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  stargazers_count: number;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface RepoPickerProps {
  token: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function RepoPicker({ token, value, onChange, disabled }: RepoPickerProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch repos on first open
  useEffect(() => {
    if (!open || repos.length > 0 || loading) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch up to 100 repos, sorted by most recently pushed
        const resp = await fetch(
          "https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
            },
          }
        );
        if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
        const data: GitHubRepo[] = await resp.json();
        setRepos(data);
      } catch (e) {
        setError("Failed to load repositories");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, token, repos.length, loading]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = repos.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.full_name.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  // Display value — show repo name if we have a URL match
  const selectedRepo = repos.find((r) => r.html_url === value);
  const displayValue = selectedRepo
    ? selectedRepo.full_name
    : value
      ? value.replace("https://github.com/", "")
      : "";

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-[var(--color-border)]",
          "bg-[var(--color-surface)] px-4 py-2.5 text-left text-sm",
          "focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]",
          "disabled:opacity-50",
          value ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedRepo && (
            <img
              src={selectedRepo.owner.avatar_url}
              alt=""
              className="h-4 w-4 rounded-full"
            />
          )}
          {displayValue || "Select a repository..."}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-muted)] transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
            <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              autoFocus
              className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </div>

          {/* Repo list */}
          <div className="max-h-72 overflow-y-auto">
            {loading && (
              <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                Loading repositories...
              </div>
            )}

            {error && (
              <div className="px-4 py-6 text-center text-sm text-red-500">
                {error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                {search ? "No matching repositories" : "No repositories found"}
              </div>
            )}

            {filtered.map((repo) => (
              <button
                key={repo.full_name}
                type="button"
                onClick={() => {
                  onChange(repo.html_url);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
                  "hover:bg-[var(--color-surface-alt)]",
                  repo.html_url === value && "bg-[var(--color-primary)]/5"
                )}
              >
                <img
                  src={repo.owner.avatar_url}
                  alt=""
                  className="mt-0.5 h-5 w-5 rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-[var(--color-text)]">
                      {repo.full_name}
                    </span>
                    {repo.private && (
                      <Lock className="h-3 w-3 flex-shrink-0 text-[var(--color-text-muted)]" />
                    )}
                  </div>
                  {repo.description && (
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                      {repo.description}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                    {repo.stargazers_count > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3" />
                        {repo.stargazers_count}
                      </span>
                    )}
                    <span>
                      Updated {new Date(repo.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Manual URL fallback */}
          <div className="border-t border-[var(--color-border)] px-3 py-2">
            <button
              type="button"
              onClick={() => {
                const url = prompt("Enter GitHub repository URL:");
                if (url && url.startsWith("https://github.com/")) {
                  onChange(url);
                  setOpen(false);
                }
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <GitBranch className="h-3.5 w-3.5" />
              Enter URL manually...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
