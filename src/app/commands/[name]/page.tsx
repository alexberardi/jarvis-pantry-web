"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  Shield,
  ExternalLink,
  Star,
  Clock,
  Tag,
} from "lucide-react";
import { useCommand, useVersions, useReviews } from "@/hooks/useCommands";
import { cn } from "@/lib/utils";

export default function CommandDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const { data: command, isLoading, isError } = useCommand(name);
  const { data: versionsData } = useVersions(name);
  const { data: reviewsData } = useReviews(name);

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

        {/* Install CTA */}
        <div className="text-right">
          <code className="block rounded bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text)]">
            jarvis pantry install {command.command_name}
          </code>
        </div>
      </div>

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
