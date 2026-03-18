"use client";

import Link from "next/link";
import { Package, Sparkles, Plus, GithubIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
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
        </nav>
      </div>
    </header>
  );
}
