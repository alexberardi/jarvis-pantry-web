"use client";

import Link from "next/link";
import { Download, Package, Shield, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommandSummary, PackageComponent } from "@/api/pantry";

const COMPONENT_TYPE_LABELS: Record<string, string> = {
  command: "Command",
  agent: "Agent",
  device_protocol: "Protocol",
  device_manager: "Manager",
};

function ComponentBadges({ components }: { components: PackageComponent[] }) {
  if (!components || components.length <= 1) return null;

  const counts: Record<string, number> = {};
  for (const c of components) {
    const label = COMPONENT_TYPE_LABELS[c.type] || c.type;
    counts[label] = (counts[label] || 0) + 1;
  }

  const parts = Object.entries(counts).map(
    ([label, count]) => `${count} ${label}${count > 1 ? "s" : ""}`
  );

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
      <Package className="h-3 w-3" />
      {parts.join(" + ")}
    </span>
  );
}

function DangerBadge({ rating }: { rating: number | null }) {
  if (rating === null) return null;

  const colors: Record<number, string> = {
    1: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    2: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    3: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    4: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    5: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", colors[rating] || colors[3])}>
      {rating}/5
    </span>
  );
}

export function CommandCard({ command }: { command: CommandSummary }) {
  return (
    <Link
      href={`/commands/${command.command_name}`}
      className={cn(
        "group flex flex-col rounded-lg border border-[var(--color-border)]",
        "bg-[var(--color-surface)] p-5 transition-all",
        "hover:border-[var(--color-primary)]/40 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
            {command.display_name || command.command_name}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {command.author && `by ${command.author}`}
          </p>
        </div>
        <div className="ml-3 flex items-center gap-2">
          {command.verified ? (
            <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
          ) : (
            <Shield className="h-4 w-4 text-[var(--color-text-muted)]" />
          )}
          <DangerBadge rating={command.danger_rating} />
        </div>
      </div>

      <p className="mt-2 line-clamp-2 flex-1 text-sm text-[var(--color-text-muted)]">
        {command.description}
      </p>

      {command.package_type === "bundle" && (
        <div className="mt-2">
          <ComponentBadges components={command.components} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            {command.install_count.toLocaleString("en-US")}
          </span>
          <span>v{command.latest_version}</span>
        </div>
        <div className="flex gap-1.5">
          {command.categories.slice(0, 2).map((cat) => (
            <span
              key={cat}
              className="rounded-full bg-[var(--color-surface-alt)] px-2 py-0.5"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
