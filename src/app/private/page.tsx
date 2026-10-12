"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import {
  addPackageFromRepo,
  getForgeFeatures,
  getStoredAdminKey,
  listLocalPackages,
  removeLocalPackage,
  storeAdminKey,
  type LocalPackage,
} from "@/api/pantry";
import { cn } from "@/lib/utils";

const inputClass = cn(
  "mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm",
  "text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]",
  "focus:border-[var(--color-primary)] focus:outline-none"
);

function errorText(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string }; status?: number }; message?: string };
  if (err.response?.status === 401) return "The admin key is missing or wrong.";
  return err.response?.data?.detail || err.message || "Request failed";
}

export default function PrivatePackagesPage() {
  // null while checking; false means this Pantry has no admin key, so the feature is off.
  const [available, setAvailable] = useState<boolean | null>(null);
  const [packages, setPackages] = useState<LocalPackage[]>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [ref, setRef] = useState("");
  const [token, setToken] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const refresh = useCallback(() => {
    listLocalPackages().then(setPackages).catch(() => setPackages([]));
  }, []);

  useEffect(() => {
    getForgeFeatures().then((f) => setAvailable(f.private_packages));
    setAdminKey(getStoredAdminKey());
    refresh();
  }, [refresh]);

  async function add() {
    setBusy(true);
    setStatus(null);
    storeAdminKey(adminKey.trim());
    try {
      const r = await addPackageFromRepo({
        github_repo_url: repoUrl.trim(),
        ref: ref.trim() || undefined,
        token: token.trim() || undefined,
      });
      setStatus({
        kind: "ok",
        text: `Added ${r.command_name} ${r.version}${r.git_commit_sha ? ` (commit ${r.git_commit_sha.slice(0, 7)})` : ""}.`,
      });
      setRepoUrl("");
      setRef("");
      setToken("");
      refresh();
    } catch (e) {
      setStatus({ kind: "error", text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(name: string) {
    if (!window.confirm(`Unpublish ${name}? Nodes will no longer be able to install it from this Pantry.`)) return;
    storeAdminKey(adminKey.trim());
    try {
      await removeLocalPackage(name);
      setStatus({ kind: "ok", text: `Unpublished ${name}.` });
      refresh();
    } catch (e) {
      setStatus({ kind: "error", text: errorText(e) });
    }
  }

  if (available === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (!available) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Private packages are not available: this Pantry has no admin key set (<code>ADMIN_API_KEY</code>).
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text)]">
        <Lock className="h-6 w-6 text-[var(--color-primary)]" />
        Private packages
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Publish a package from your own Git repository to this Pantry. Nodes that use this Pantry can then install it
        next to the public ones. <strong>There is no security review or container test</strong>, and nodes run what
        you add, so only add code you trust.
      </p>

      <div className="mt-6 space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)]">Repository URL</label>
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/you/jarvis-cmd-thing"
            className={inputClass}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-[var(--color-text-muted)]">Tag or branch (optional)</label>
            <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="v1.0.0" className={inputClass} />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs font-medium text-[var(--color-text-muted)]">
              GitHub token (private repositories only)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Used once to clone; never stored"
              className={inputClass}
              autoComplete="off"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)]">Admin key</label>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Kept for this browser session only"
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <button
          onClick={add}
          disabled={busy || !repoUrl.trim() || !adminKey.trim()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white",
            "hover:opacity-90 disabled:opacity-50"
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add package
        </button>
        {status && (
          <p className={cn("flex items-start gap-1.5 text-sm", status.kind === "ok" ? "text-green-600" : "text-red-600")}>
            {status.kind === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {status.text}
          </p>
        )}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-[var(--color-text)]">On this Pantry</h2>
      {packages.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">No private packages yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
          {packages.map((p) => (
            <li key={p.command_name} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--color-text)]">
                  {p.display_name || p.command_name}{" "}
                  <span className="text-xs text-[var(--color-text-muted)]">v{p.latest_version}</span>
                </p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">{p.description}</p>
              </div>
              <button
                onClick={() => remove(p.command_name)}
                className="text-[var(--color-text-muted)] hover:text-red-600"
                title="Unpublish"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
