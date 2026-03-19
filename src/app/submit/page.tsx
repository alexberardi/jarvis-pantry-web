"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  GitBranch,
  Minus,
  Circle,
} from "lucide-react";
import {
  quickSubmit,
  type SubmissionStage,
  type QuickSubmitResult,
  type CostEstimate,
} from "@/api/pantry";
import { useSubmission } from "@/hooks/useSubmission";
import { useAuthContext } from "@/hooks/AuthContext";
import { RepoPicker } from "@/components/RepoPicker";
import { cn } from "@/lib/utils";

type SubmitState = "idle" | "submitting" | "preview" | "confirming" | "pipeline" | "error";

export default function SubmitPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" /></div>}>
      <SubmitPageInner />
    </Suspense>
  );
}

function SubmitPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, loading: authLoading, login } = useAuthContext();
  const [repoUrl, setRepoUrl] = useState("");

  // Pre-fill repo URL from query params (e.g., from Forge)
  useEffect(() => {
    const url = searchParams.get("repo_url");
    if (url) setRepoUrl(url);
  }, [searchParams]);
  const [llmProvider, setLlmProvider] = useState<"claude" | "openai">("claude");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [preview, setPreview] = useState<QuickSubmitResult | null>(null);
  const [error, setError] = useState("");

  const { data: submissionStatus } = useSubmission(submissionId);

  const isValidUrl = repoUrl.startsWith("https://github.com/");

  function extractError(err: unknown): string {
    const message =
      err && typeof err === "object" && "response" in err
        ? (err as { response: { data: { detail: string | { message: string } } } })
            .response?.data?.detail
        : null;
    if (typeof message === "string") return message;
    if (typeof message === "object" && message && "message" in message)
      return (message as { message: string }).message;
    return "Submission failed — check your URL and try again";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidUrl) return;

    setState("submitting");
    setError("");
    setPreview(null);
    setSubmissionId(null);

    try {
      // Step 1: dry run — validate + cost estimate
      const res = await quickSubmit({
        repo_url: repoUrl.trim(),
        llm_provider: llmProvider,
        llm_api_key: llmApiKey.trim() || undefined,
        confirm: false,
      }, token!);
      setPreview(res);
      setState("preview");
    } catch (err: unknown) {
      setError(extractError(err));
      setState("error");
    }
  }

  async function handleConfirm() {
    setState("confirming");
    setError("");

    try {
      // Step 2: confirm — enqueue for real
      const res = await quickSubmit({
        repo_url: repoUrl.trim(),
        llm_provider: llmProvider,
        llm_api_key: llmApiKey.trim() || undefined,
        confirm: true,
      }, token!);
      setSubmissionId(res.submission_id);
      setState("pipeline");
    } catch (err: unknown) {
      setError(extractError(err));
      setState("error");
    }
  }

  const isTerminal =
    submissionStatus?.status === "published" ||
    submissionStatus?.status === "rejected" ||
    submissionStatus?.status === "pending_review";

  // Auth gate — show sign-in prompt if not logged in
  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="text-center">
          <GitBranch className="mx-auto h-10 w-10 text-[var(--color-primary)]" />
          <h1 className="mt-4 text-3xl font-bold text-[var(--color-text)]">
            Submit a Package
          </h1>
          <p className="mt-2 text-[var(--color-text-muted)]">
            Sign in with GitHub to submit packages to the Pantry
          </p>
          <button
            onClick={login}
            className={cn(
              "mt-8 inline-flex items-center gap-2 rounded-lg px-6 py-3",
              "bg-[var(--color-primary)] text-sm font-medium text-white",
              "hover:bg-[var(--color-primary)]/90 transition-colors"
            )}
          >
            Sign in with GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center">
        <GitBranch className="mx-auto h-10 w-10 text-[var(--color-primary)]" />
        <h1 className="mt-4 text-3xl font-bold text-[var(--color-text)]">
          Submit a Package
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Link your GitHub repo to add it to the Pantry
        </p>
      </div>

      {/* Form */}
      {(state === "idle" || state === "submitting" || state === "error") && (
        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          {/* Repo picker */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)]">
              Repository
            </label>
            <div className="mt-1.5">
              <RepoPicker
                token={token!}
                value={repoUrl}
                onChange={setRepoUrl}
                disabled={state === "submitting"}
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
              Repo must contain: <code>command.py</code>,{" "}
              <code>jarvis_command.yaml</code>, <code>README.md</code>,{" "}
              <code>LICENSE</code>
            </p>
          </div>

          {/* Submitting as */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)]">
              Submitting as
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-2.5 text-sm text-[var(--color-text)]">
              {user?.avatar_url && (
                <img src={user.avatar_url} alt="" className="h-5 w-5 rounded-full" />
              )}
              {user?.github_username}
            </div>
          </div>

          {/* LLM Provider */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)]">
              AI Security Review Provider
            </label>
            <select
              value={llmProvider}
              onChange={(e) => setLlmProvider(e.target.value as "claude" | "openai")}
              disabled={state === "submitting"}
              className={cn(
                "mt-1.5 w-full rounded-lg border border-[var(--color-border)]",
                "bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)]",
                "focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]",
                "disabled:opacity-50"
              )}
            >
              <option value="claude">Claude (Sonnet 4)</option>
              <option value="openai">GPT-4o</option>
            </select>
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
              Your API key is used for one security review call, then discarded.
            </p>
          </div>

          {/* LLM API Key */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)]">
              API Key (for security review)
            </label>
            <input
              type="password"
              value={llmApiKey}
              onChange={(e) => setLlmApiKey(e.target.value)}
              placeholder={
                llmProvider === "claude"
                  ? "sk-ant-api03-..."
                  : "sk-..."
              }
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
              Used once for security review. Never stored.
            </p>
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
                Validating...
              </span>
            ) : (
              "Submit Package"
            )}
          </button>
        </form>
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

      {/* Preview / cost estimate confirmation */}
      {(state === "preview" || state === "confirming") && preview && (
        <div className="mt-10 space-y-4">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="font-medium text-[var(--color-text)]">
              Validation Passed
            </h3>
            <div className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
              <p>
                <span className="font-medium text-[var(--color-text)]">
                  {preview.command_name}
                </span>{" "}
                v{preview.version}
              </p>
              <p>
                Static analysis: {preview.static_analysis.checks_passed} checks
                passed
                {preview.static_analysis.warnings.length > 0 &&
                  `, ${preview.static_analysis.warnings.length} warning(s)`}
              </p>
              {preview.static_analysis.dangerous_patterns.length > 0 && (
                <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 p-3 text-xs dark:border-yellow-800 dark:bg-yellow-900/20">
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">
                    Flagged patterns:
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-yellow-700 dark:text-yellow-400">
                    {preview.static_analysis.dangerous_patterns.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {preview.cost_estimate && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                AI security review will use approximately{" "}
                <span className="font-medium">
                  {preview.cost_estimate.input_tokens + preview.cost_estimate.output_tokens}
                </span>{" "}
                tokens on your{" "}
                {llmProvider === "claude" ? "Claude" : "OpenAI"} API key.
              </p>
              <p className="mt-1 text-sm font-medium text-blue-900 dark:text-blue-200">
                Estimated cost: {preview.cost_estimate.formatted}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setState("idle");
                setPreview(null);
              }}
              className={cn(
                "flex-1 rounded-lg border border-[var(--color-border)] px-5 py-3",
                "text-sm font-medium text-[var(--color-text)]",
                "hover:bg-[var(--color-surface-alt)]",
                "disabled:opacity-50"
              )}
              disabled={state === "confirming"}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={state === "confirming"}
              className={cn(
                "flex-1 rounded-lg px-5 py-3 text-sm font-medium transition-colors",
                "bg-[var(--color-primary)] text-white",
                "hover:bg-[var(--color-primary)]/90",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {state === "confirming" ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                "Confirm & Submit"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Pipeline progress */}
      {state === "pipeline" && submissionStatus && (
        <div className="mt-10 space-y-0">
          <PipelineStage
            label="Queued"
            detail={
              submissionStatus.stages.queue.status === "done"
                ? "Submission accepted"
                : "Waiting in queue..."
            }
            status={submissionStatus.stages.queue.status === "done" ? "passed" : "in_progress"}
          />
          <PipelineStage
            label="Static Analysis"
            detail={_staticDetail(submissionStatus.stages.static_analysis)}
            status={submissionStatus.stages.static_analysis.status}
          />
          <PipelineStage
            label={`AI Security Review${submissionStatus.stages.ai_review.provider ? ` (${submissionStatus.stages.ai_review.provider === "claude" ? "Claude" : "OpenAI"})` : ""}`}
            detail={_aiDetail(submissionStatus.stages.ai_review)}
            status={submissionStatus.stages.ai_review.status}
          />
          <PipelineStage
            label="Container Testing"
            detail={_containerDetail(submissionStatus.stages.container_test)}
            status={submissionStatus.stages.container_test.status}
          />

          {/* Result */}
          {submissionStatus.status === "published" && submissionStatus.result && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">
                    Published!
                  </p>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                    {submissionStatus.result.display_name || submissionStatus.result.command_name} v
                    {submissionStatus.result.version} is live in the Pantry
                  </p>
                  <button
                    onClick={() =>
                      router.push(
                        `/commands/${submissionStatus.result!.command_name}`
                      )
                    }
                    className="mt-3 text-sm font-medium text-green-700 underline dark:text-green-300"
                  >
                    View in Pantry
                  </button>
                </div>
              </div>
            </div>
          )}

          {submissionStatus.status === "rejected" && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-300">
                    Rejected
                  </p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                    {submissionStatus.result?.reason || "Submission did not pass validation"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit another */}
          {isTerminal && (
            <button
              onClick={() => {
                setState("idle");
                setSubmissionId(null);
                setRepoUrl("");
                setLlmApiKey("");
              }}
              className="mt-6 text-sm font-medium text-[var(--color-primary)] underline"
            >
              Submit another package
            </button>
          )}
        </div>
      )}

      {/* Pipeline loading state */}
      {state === "pipeline" && !submissionStatus && (
        <div className="mt-10 flex items-center justify-center gap-2 text-[var(--color-text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pipeline status...
        </div>
      )}

      {/* Help */}
      {(state === "idle" || state === "error") && (
        <div className="mt-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="font-medium text-[var(--color-text)]">How it works</h3>
          <ol className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
            <li>1. Create a public GitHub repo with your package</li>
            <li>
              2. Include your entry file (e.g.{" "}
              <code className="rounded bg-[var(--color-surface-alt)] px-1">
                command.py
              </code>
              ),{" "}
              <code className="rounded bg-[var(--color-surface-alt)] px-1">
                jarvis_command.yaml
              </code>
              ,{" "}
              <code className="rounded bg-[var(--color-surface-alt)] px-1">
                README.md
              </code>
              , and{" "}
              <code className="rounded bg-[var(--color-surface-alt)] px-1">
                LICENSE
              </code>
            </li>
            <li>3. Paste the URL above, provide your LLM API key, and submit</li>
            <li>
              4. Your package goes through static analysis, AI security review, and
              container testing
            </li>
            <li>
              5. If it passes, it&apos;s published to the Pantry automatically
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

// ── Pipeline Stage Component ──────────────────────────────────────────

function PipelineStage({
  label,
  detail,
  status,
}: {
  label: string;
  detail: string;
  status: string;
}) {
  const isPassed = status === "passed" || status === "done";
  const isFailed = status === "failed";
  const isActive = status === "in_progress";
  const isSkipped = status === "skipped";
  const isPending = status === "pending" || status === "waiting";

  return (
    <div
      className={cn(
        "flex items-start gap-3 border-l-2 py-4 pl-4",
        isPassed && "border-green-500",
        isFailed && "border-red-500",
        isActive && "border-[var(--color-primary)]",
        isSkipped && "border-[var(--color-text-muted)]",
        isPending && "border-[var(--color-border)]"
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        {isPassed && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
        {isFailed && <XCircle className="h-5 w-5 text-red-500" />}
        {isActive && (
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
        )}
        {isSkipped && (
          <Minus className="h-5 w-5 text-[var(--color-text-muted)]" />
        )}
        {isPending && (
          <Circle className="h-5 w-5 text-[var(--color-border)]" />
        )}
      </div>
      <div>
        <p
          className={cn(
            "text-sm font-medium",
            isPassed && "text-green-700 dark:text-green-400",
            isFailed && "text-red-700 dark:text-red-400",
            isActive && "text-[var(--color-text)]",
            (isPending || isSkipped) && "text-[var(--color-text-muted)]"
          )}
        >
          {label}
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {detail}
        </p>
      </div>
    </div>
  );
}

// ── Stage detail helpers ──────────────────────────────────────────────

function _staticDetail(stage: SubmissionStage): string {
  if (stage.status === "passed") {
    const warnings = stage.warnings?.length ?? 0;
    if (warnings > 0) return `Passed with ${warnings} warning(s)`;
    return `Code structure verified, ${stage.checks_passed ?? 0} checks passed`;
  }
  if (stage.status === "failed") {
    return "Static analysis failed";
  }
  if (stage.status === "in_progress") {
    return "Checking syntax, structure, and safety patterns...";
  }
  return "Waiting...";
}

function _aiDetail(stage: SubmissionStage): string {
  if (stage.status === "passed") return "Security review passed";
  if (stage.status === "failed") return "Security review flagged issues";
  if (stage.status === "skipped") return "Skipped (dev mode)";
  if (stage.status === "in_progress") {
    const provider = stage.provider === "openai" ? "OpenAI" : "Claude";
    return `${provider} is reviewing your code...`;
  }
  return "Waiting...";
}

function _containerDetail(stage: SubmissionStage): string {
  if (stage.status === "passed") {
    return `${stage.pass_count ?? 0}/${stage.test_count ?? 0} tests passed`;
  }
  if (stage.status === "failed") {
    return `${stage.fail_count ?? 0} test(s) failed`;
  }
  if (stage.status === "in_progress") {
    return "Running isolated environment tests...";
  }
  return "Waiting...";
}
