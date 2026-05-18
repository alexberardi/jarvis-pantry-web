import { cn } from "@/lib/utils";
import type { Finding } from "@/api/pantry";

interface FindingCardProps {
  finding: Finding;
}

export function FindingCard({ finding }: FindingCardProps) {
  const isError = finding.severity === "error";
  const hasLocation = finding.file !== undefined;
  const description =
    finding.message ??
    (finding.primitive !== undefined
      ? `Disallowed primitive: ${finding.primitive}`
      : finding.value !== undefined
      ? `Invalid value: ${finding.value}`
      : null);

  return (
    <div
      className={cn(
        "rounded border p-3 text-xs",
        isError
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          : "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isError
              ? "bg-red-200 text-red-900 dark:bg-red-800/40 dark:text-red-200"
              : "bg-yellow-200 text-yellow-900 dark:bg-yellow-800/40 dark:text-yellow-200"
          )}
        >
          {finding.severity}
        </span>
        <code className="font-mono text-[11px]">{finding.reason_code}</code>
        {hasLocation && (
          <span className="font-mono text-[11px] opacity-80">
            {finding.file}
            {finding.line !== undefined ? `:${finding.line}` : ""}
          </span>
        )}
      </div>
      {description && <p className="mt-1.5">{description}</p>}
      {finding.snippet && (
        <pre
          className={cn(
            "mt-2 overflow-x-auto rounded p-2 text-[11px] font-mono",
            isError
              ? "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200"
              : "bg-yellow-100 text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200"
          )}
        >
          {finding.snippet}
        </pre>
      )}
      <a
        href={finding.doc_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-[11px] underline opacity-80 hover:opacity-100"
      >
        Learn more
      </a>
    </div>
  );
}
