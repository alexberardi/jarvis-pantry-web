"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2, GitBranch } from "lucide-react";
import { quickSubmit } from "@/api/pantry";
import { cn } from "@/lib/utils";

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function SubmitPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [authorGithub, setAuthorGithub] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [result, setResult] = useState<{
    command_name?: string;
    display_name?: string;
    version?: string;
    description?: string;
  } | null>(null);
  const [error, setError] = useState("");

  const isValidUrl =
    repoUrl.startsWith("https://github.com/") && repoUrl.split("/").length >= 5;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidUrl) return;

    setState("submitting");
    setError("");
    setResult(null);

    try {
      const res = await quickSubmit({
        repo_url: repoUrl.trim(),
        author_github: authorGithub.trim() || undefined,
      });
      setResult(res);
      setState("success");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { detail: string } } }).response?.data
              ?.detail || "Submission failed"
          : "Submission failed — check your URL and try again";
      setError(message);
      setState("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center">
        <GitBranch className="mx-auto h-10 w-10 text-[var(--color-primary)]" />
        <h1 className="mt-4 text-3xl font-bold text-[var(--color-text)]">
          Submit a Command
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Link your GitHub repo to add it to the Pantry
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        {/* Repo URL */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]">
            GitHub Repository URL
          </label>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/jarvis-command-my-command"
            disabled={state === "submitting"}
            className={cn(
              "mt-1.5 w-full rounded-lg border border-[var(--color-border)]",
              "bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)]",
              "placeholder:text-[var(--color-text-muted)]",
              "focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]",
              "disabled:opacity-50"
            )}
          />
          <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
            Repo must contain: <code>command.py</code>,{" "}
            <code>jarvis_command.yaml</code>, <code>README.md</code>,{" "}
            <code>LICENSE</code>
          </p>
        </div>

        {/* Author GitHub username */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]">
            GitHub Username (optional)
          </label>
          <input
            type="text"
            value={authorGithub}
            onChange={(e) => setAuthorGithub(e.target.value)}
            placeholder="your-github-username"
            disabled={state === "submitting"}
            className={cn(
              "mt-1.5 w-full rounded-lg border border-[var(--color-border)]",
              "bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)]",
              "placeholder:text-[var(--color-text-muted)]",
              "focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]",
              "disabled:opacity-50"
            )}
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!isValidUrl || state === "submitting"}
          className={cn(
            "w-full rounded-lg px-5 py-3 text-sm font-medium transition-colors",
            "bg-[var(--color-primary)] text-white",
            "hover:bg-[var(--color-primary)]/90",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {state === "submitting" ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating repo...
            </span>
          ) : (
            "Submit Command"
          )}
        </button>
      </form>

      {/* Success */}
      {state === "success" && result && (
        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">
                Published: {result.display_name || result.command_name}
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                v{result.version} — {result.description}
              </p>
              <button
                onClick={() =>
                  router.push(`/commands/${result.command_name}`)
                }
                className="mt-3 text-sm font-medium text-green-700 underline dark:text-green-300"
              >
                View in Pantry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">
                Submission failed
              </p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help */}
      <div className="mt-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h3 className="font-medium text-[var(--color-text)]">
          How it works
        </h3>
        <ol className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
          <li>1. Create a public GitHub repo with your command</li>
          <li>
            2. Include <code className="rounded bg-[var(--color-surface-alt)] px-1">command.py</code> (implementing IJarvisCommand),{" "}
            <code className="rounded bg-[var(--color-surface-alt)] px-1">jarvis_command.yaml</code>,{" "}
            <code className="rounded bg-[var(--color-surface-alt)] px-1">README.md</code>, and{" "}
            <code className="rounded bg-[var(--color-surface-alt)] px-1">LICENSE</code>
          </li>
          <li>3. Paste the URL above and submit</li>
          <li>
            4. Install on your node:{" "}
            <code className="rounded bg-[var(--color-surface-alt)] px-1">
              jarvis pantry install --url &lt;repo&gt;
            </code>
          </li>
        </ol>
      </div>
    </div>
  );
}
