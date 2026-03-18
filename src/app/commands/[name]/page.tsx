"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Cpu,
  Download,
  ExternalLink,
  Package,
  RefreshCw,
  Shield,
  ShieldCheck,
  Star,
  Clock,
  Tag,
  Terminal,
  Trash2,
  Wifi,
} from "lucide-react";
import { useCommand, useVersions, useReviews } from "@/hooks/useCommands";
import { useAuthContext } from "@/hooks/AuthContext";
import { deleteCommand } from "@/api/pantry";
import { cn } from "@/lib/utils";

export default function CommandDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const router = useRouter();
  const { user, token } = useAuthContext();
  const { data: command, isLoading, isError } = useCommand(name);
  const { data: versionsData } = useVersions(name);
  const { data: reviewsData } = useReviews(name);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner =
    user &&
    command?.author &&
    user.github_username === command.author.github;

  async function handleDelete() {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteCommand(name, token);
      router.push("/");
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-surface-alt)]" />
        <div className="mt-4 h-4 w-96 animate-pulse rounded bg-[var(--color-surface-alt)]" />
        <div className="mt-8 h-64 animate-pulse rounded-lg bg-[var(--color-surface-alt)]" />
      </div>
    );
  }

  if (isError || !command) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-lg text-[var(--color-text-muted)]">
          Command not found
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1 text-[var(--color-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>
      </div>
    );
  }

  const versions = versionsData?.versions || [];
  const reviews = reviewsData?.reviews || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Back link */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[var(--color-text)]">
              {command.display_name || command.command_name}
            </h1>
            {command.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-alt)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                <Shield className="h-3.5 w-3.5" /> Unverified
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {command.author
              ? `by ${command.author.display_name || command.author.github}`
              : "Unknown author"}
          </p>
        </div>

        {/* Install CTA + management */}
        <div className="flex flex-col items-end gap-2">
          <code className="block rounded bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text)]">
            jarvis pantry install {command.command_name}
          </code>
          {isOwner && (
            <div className="flex gap-2">
              <Link
                href={`/submit?update=${command.command_name}&repo=${encodeURIComponent(command.github_repo_url)}`}
                className="flex items-center gap-1 rounded border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Update
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1 rounded border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Are you sure you want to delete {command.display_name || command.command_name}?
          </p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            This will permanently remove the command, all versions, reviews, and security reports.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)]"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </button>
          </div>
        </div>
      )}

      {/* Description */}
      <p className="mt-6 text-[var(--color-text)]">{command.description}</p>

      {/* Stats bar */}
      <div className="mt-6 flex flex-wrap gap-6 text-sm text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1.5">
          <Download className="h-4 w-4" />
          {command.install_count.toLocaleString()} installs
        </span>
        <span className="flex items-center gap-1.5">
          <Tag className="h-4 w-4" />v{command.latest_version}
        </span>
        {command.avg_rating && (
          <span className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {command.avg_rating} ({command.review_count} reviews)
          </span>
        )}
        {command.danger_rating && (
          <span>Danger: {command.danger_rating}/5</span>
        )}
        <span>{command.license}</span>
      </div>

      {/* Categories */}
      {command.categories.length > 0 && (
        <div className="mt-4 flex gap-2">
          {command.categories.map((cat) => (
            <Link
              key={cat}
              href={`/?category=${cat}`}
              className="rounded-full bg-[var(--color-surface-alt)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              {cat}
            </Link>
          ))}
        </div>
      )}

      {/* GitHub link */}
      {command.github_repo_url && (
        <a
          href={command.github_repo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          View on GitHub
        </a>
      )}

      {/* Components (bundles) */}
      {command.package_type === "bundle" && command.components?.length > 0 && (
        <div className="mt-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
            <Package className="h-5 w-5" />
            Components
          </h2>
          <div className="mt-3 space-y-2">
            {command.components.map((comp) => {
              const icons: Record<string, typeof Terminal> = {
                command: Terminal,
                agent: Bot,
                device_protocol: Wifi,
                device_manager: Cpu,
              };
              const Icon = icons[comp.type] || Terminal;
              const labels: Record<string, string> = {
                command: "Command",
                agent: "Agent",
                device_protocol: "Device Protocol",
                device_manager: "Device Manager",
              };
              return (
                <div
                  key={comp.name}
                  className="flex items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-2.5"
                >
                  <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                  <div>
                    <span className="font-medium text-[var(--color-text)]">
                      {comp.name}
                    </span>
                    <span className="ml-2 rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                      {labels[comp.type] || comp.type}
                    </span>
                    {comp.description && (
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                        {comp.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Security report */}
      {command.security_report && (
        <div className="mt-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Security Review
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {command.security_report.summary}
          </p>
          {command.security_report.concerns.length > 0 && (
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[var(--color-text-muted)]">
              {command.security_report.concerns.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Versions */}
      {versions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Versions
          </h2>
          <div className="mt-3 space-y-2">
            {versions.map((v) => (
              <div
                key={v.version}
                className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-[var(--color-text)]">
                  v{v.version}
                </span>
                <span className="flex items-center gap-4 text-[var(--color-text-muted)]">
                  {v.min_jarvis_version && (
                    <span>Jarvis {v.min_jarvis_version}+</span>
                  )}
                  {v.published_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(v.published_at).toLocaleDateString()}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Reviews
          </h2>
          <div className="mt-3 space-y-4">
            {reviews.map((r, i) => (
              <div
                key={i}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--color-text)]">
                    {r.title}
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className={cn(
                          "h-4 w-4",
                          j < r.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-[var(--color-border)]"
                        )}
                      />
                    ))}
                  </div>
                </div>
                {r.body && (
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    {r.body}
                  </p>
                )}
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  {r.author}
                  {r.created_at &&
                    ` - ${new Date(r.created_at).toLocaleDateString()}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
