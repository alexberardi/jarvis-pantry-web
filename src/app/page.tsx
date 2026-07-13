"use client";

import { useState } from "react";
import { Sparkles, Package } from "lucide-react";
import Link from "next/link";
import { useSearchCommands, useCategories } from "@/hooks/useCommands";
import { CommandCard } from "@/components/catalog/CommandCard";
import { SearchBar } from "@/components/catalog/SearchBar";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { cn } from "@/lib/utils";

export default function BrowsePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState("popular");

  const { data, isLoading } = useSearchCommands({
    q: query || undefined,
    category: category || undefined,
    sort,
    // The API defaults to per_page=20 and this page has no pagination control,
    // so the catalog rendered only the first 20 packages while the header
    // printed `data.total` — the store said "25 commands" and showed 20, and
    // the missing five (incl. Philips Hue) were unreachable in the browser.
    // Ask for the whole catalog; add real pagination when it outgrows this.
    per_page: 100,
  });
  const { data: categories } = useCategories();

  const commands = data?.commands || [];
  const isEmpty = !isLoading && commands.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text)]">
          Jarvis Pantry
        </h1>
        <p className="mt-3 text-lg text-[var(--color-text-muted)]">
          Community voice commands for your Jarvis assistant
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/forge"
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium",
              "bg-[var(--color-primary)] text-white transition-colors",
              "hover:bg-[var(--color-primary)]/90"
            )}
          >
            <Sparkles className="h-4 w-4" />
            Build with Forge
          </Link>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="mb-6 space-y-4">
        <SearchBar value={query} onChange={setQuery} />
        {categories && categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selected={category}
            onSelect={setCategory}
          />
        )}
      </div>

      {/* Sort tabs */}
      <div className="mb-6 flex items-center gap-4 border-b border-[var(--color-border)]">
        {[
          { key: "popular", label: "Popular" },
          { key: "newest", label: "Newest" },
          { key: "name", label: "A-Z" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSort(tab.key)}
            className={cn(
              "border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
              sort === tab.key
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            )}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-[var(--color-text-muted)]">
          {data?.total ?? 0} commands
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg bg-[var(--color-surface-alt)]"
            />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="py-20 text-center">
          <Package className="mx-auto h-12 w-12 text-[var(--color-text-muted)]" />
          <p className="mt-4 text-lg font-medium text-[var(--color-text)]">
            No commands yet
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Be the first to publish a command, or build one with{" "}
            <Link
              href="/forge"
              className="text-[var(--color-primary)] underline"
            >
              Forge
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {commands.map((cmd) => (
            <CommandCard key={cmd.command_name} command={cmd} />
          ))}
        </div>
      )}
    </div>
  );
}
