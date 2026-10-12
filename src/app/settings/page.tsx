"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Save, Server, CheckCircle2, AlertCircle } from "lucide-react";
import {
  detectLocalLlmModels,
  getForgeFeatures,
  getLocalLlmSettings,
  getStoredAdminKey,
  saveLocalLlmSettings,
  storeAdminKey,
  type LocalLlmSettings,
} from "@/api/pantry";
import { cn } from "@/lib/utils";

const inputClass = cn(
  "mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm",
  "text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]",
  "focus:border-[var(--color-primary)] focus:outline-none"
);

function errorText(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string }; status?: number }; message?: string };
  if (err.response?.status === 401) {
    return "The Pantry's admin key is missing or wrong. This is not the model server's API key: enter the Pantry's ADMIN_API_KEY in the Admin key field.";
  }
  if (err.response?.status === 403) {
    return "This Pantry has no admin key set, so these settings cannot be changed. Set ADMIN_API_KEY on the Pantry.";
  }
  return err.response?.data?.detail || err.message || "Request failed";
}

export default function SettingsPage() {
  const [saved, setSaved] = useState<LocalLlmSettings | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [savingNow, setSavingNow] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // null while checking; false means the Pantry has local LLM support switched off.
  const [enabled, setEnabled] = useState<boolean | null>(null);

  // Saving and probing need the Pantry's admin key, so the Pantry must have one configured.
  const [adminConfigured, setAdminConfigured] = useState(true);

  useEffect(() => {
    getForgeFeatures().then((f) => {
      setEnabled(f.local_llm);
      setAdminConfigured(f.admin_key_configured);
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setAdminKey(getStoredAdminKey());
    getLocalLlmSettings()
      .then((s) => {
        setSaved(s);
        setBaseUrl(s.base_url);
        setDefaultModel(s.default_model);
        // Detecting needs the admin key: only do it on load when one is already stored for this session.
        if (s.base_url && getStoredAdminKey()) void detect(s.base_url, undefined, s.default_model);
      })
      .catch((e) => setStatus({ kind: "error", text: errorText(e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  async function detect(url = baseUrl, key?: string, keep = defaultModel) {
    setDetecting(true);
    setStatus(null);
    // The request reads the admin key from sessionStorage, which Save used to be the only thing to fill. Without
    // this, typing the key and pressing Detect models sent no key and the Pantry answered 401.
    if (adminKey.trim()) storeAdminKey(adminKey.trim());
    try {
      const result = await detectLocalLlmModels({ base_url: url, api_key: key });
      if (!result.ok) {
        setModels([]);
        setStatus({ kind: "error", text: result.error || "Could not list models" });
        return;
      }
      setModels(result.models);
      // Keep the chosen model when the server still offers it, otherwise fall back to the first one.
      setDefaultModel(result.models.includes(keep) ? keep : result.models[0] || "");
      setStatus({
        kind: "ok",
        text: `Found ${result.models.length} model${result.models.length === 1 ? "" : "s"} on the server.`,
      });
    } catch (e) {
      setModels([]);
      setStatus({ kind: "error", text: errorText(e) });
    } finally {
      setDetecting(false);
    }
  }

  async function save() {
    setSavingNow(true);
    setStatus(null);
    storeAdminKey(adminKey.trim());
    try {
      const result = await saveLocalLlmSettings({
        base_url: baseUrl,
        // undefined keeps the stored key; "" clears it
        api_key: clearKey ? "" : apiKey.trim() ? apiKey.trim() : undefined,
        default_model: defaultModel,
      });
      setSaved(result);
      setApiKey("");
      setClearKey(false);
      setStatus({ kind: "ok", text: "Saved. The Forge model list now uses this server." });
    } catch (e) {
      setStatus({ kind: "error", text: errorText(e) });
    } finally {
      setSavingNow(false);
    }
  }

  if (enabled === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          This page is not available: local LLM support is switched off on this Pantry.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text)]">
        <Server className="h-6 w-6 text-[var(--color-primary)]" />
        Local LLM server
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Point the Forge at an OpenAI-compatible server on your network (llama-swap, llama.cpp, vLLM, Ollama). Its
        models are detected from <code>/v1/models</code> and appear first in the Forge. Nothing is sent to a
        paid service.
      </p>

      <div className="mt-6 space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)]">Server address</label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://10.0.0.20:8080"
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
            Must be reachable from the Pantry server, not from this browser. A trailing <code>/v1</code> is fine.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)]">
            API key {saved?.has_api_key && !clearKey && <span>(one is saved; leave blank to keep it)</span>}
          </label>
          <input
            type="password"
            value={apiKey}
            disabled={clearKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={saved?.has_api_key ? "••••••••" : "Optional"}
            className={inputClass}
            autoComplete="off"
          />
          {saved?.has_api_key && (
            <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
              <input type="checkbox" checked={clearKey} onChange={(e) => setClearKey(e.target.checked)} />
              Remove the saved key
            </label>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-[var(--color-text-muted)]">Default model</label>
            <button
              onClick={() => detect(baseUrl, apiKey.trim() || undefined)}
              disabled={detecting || !baseUrl.trim()}
              className={cn(
                "flex items-center gap-1.5 rounded border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium",
                "text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] disabled:opacity-50"
              )}
            >
              {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Detect models
            </button>
          </div>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            disabled={models.length === 0}
            className={inputClass}
          >
            {models.length === 0 && <option value="">Press Detect models</option>}
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
            Every detected model stays selectable in the Forge; this one is chosen first.
          </p>
        </div>

        {!adminConfigured && (
          <p className="flex items-start gap-1.5 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            This Pantry has no admin key set, so these settings cannot be changed or tested. Set{" "}
            <code>ADMIN_API_KEY</code> on the Pantry and restart it.
          </p>
        )}

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)]">
            Admin key (the Pantry&apos;s <code>ADMIN_API_KEY</code>; required to save or detect)
          </label>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Kept for this browser session only"
            className={inputClass}
            autoComplete="off"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={savingNow || !baseUrl.trim()}
            className={cn(
              "flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white",
              "hover:opacity-90 disabled:opacity-50"
            )}
          >
            {savingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
          {saved && saved.source !== "none" && (
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Currently from {saved.source === "database" ? "saved settings" : "the server's environment"}
            </span>
          )}
        </div>

        {status && (
          <p
            className={cn(
              "flex items-start gap-1.5 text-sm",
              status.kind === "ok" ? "text-green-600" : "text-red-600"
            )}
          >
            {status.kind === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {status.text}
          </p>
        )}
      </div>
    </div>
  );
}
