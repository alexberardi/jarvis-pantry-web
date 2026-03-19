"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  FileCode,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { forgeGenerate, forgeCreateRepo, getForgeModels, type ForgeFile, type ForgeResult, type ForgeModel, type ForgeValidation } from "@/api/pantry";
import { useAuthContext } from "@/hooks/AuthContext";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ForgePage() {
  const router = useRouter();
  const { user, token, login } = useAuthContext();
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("sonnet");
  const [models, setModels] = useState<ForgeModel[]>([]);
  const [input, setInput] = useState("");

  // Load available models on mount
  useEffect(() => {
    getForgeModels().then(setModels).catch(() => {
      // Fallback if endpoint isn't available yet
      setModels([
        { id: "sonnet", display_name: "Claude Sonnet 4", provider: "anthropic", estimated_cost: "~$0.108", estimated_cost_usd: 0.108 },
      ]);
    });
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [files, setFiles] = useState<ForgeFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [packageInfo, setPackageInfo] = useState<{ name: string; displayName: string } | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [validation, setValidation] = useState<ForgeValidation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const currentModel = models.find((m) => m.id === selectedModel);
  const currentProvider = currentModel?.provider || "anthropic";
  const hasApiKey = apiKey.trim().length > 0;
  const canSend = hasApiKey && input.trim().length > 0 && !loading;
  const hasFiles = files.length > 0;

  const handleFileEdit = useCallback((filename: string, content: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.filename === filename ? { ...f, content } : f))
    );
  }, []);

  async function handleSend() {
    if (!canSend) return;

    const userMessage = input.trim();
    setInput("");
    setShowSettings(false);

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const history = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await forgeGenerate({
        description: userMessage,
        model: selectedModel,
        llm_api_key: apiKey.trim(),
        conversation_history: history.slice(0, -1),
      });

      setMessages([
        ...newMessages,
        { role: "assistant", content: result.explanation },
      ]);

      // Update files — merge new files in, update existing
      setFiles((prev) => {
        const merged = [...prev];
        for (const newFile of result.files) {
          const idx = merged.findIndex((f) => f.filename === newFile.filename);
          if (idx >= 0) {
            merged[idx] = newFile;
          } else {
            merged.push(newFile);
          }
        }
        return merged;
      });

      if (!activeFile && result.files.length > 0) {
        setActiveFile(result.files[0].filename);
      }

      setPackageInfo({
        name: result.package_name,
        displayName: result.display_name,
      });

      setValidation(result.validation || null);
    } catch (err: unknown) {
      console.error("Forge error:", err);
      let errorText = "Generation failed — an unexpected error occurred.";
      if (err && typeof err === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosErr = err as any;
        if (axiosErr.response?.data?.detail) {
          const detail = axiosErr.response.data.detail;
          errorText =
            typeof detail === "string" ? detail : JSON.stringify(detail);
        } else if (axiosErr.response?.data) {
          errorText =
            typeof axiosErr.response.data === "string"
              ? axiosErr.response.data
              : JSON.stringify(axiosErr.response.data);
        } else if (axiosErr.code === "ECONNABORTED") {
          errorText =
            "Request timed out — the LLM took too long to respond. Try again.";
        } else if (axiosErr.message) {
          errorText = axiosErr.message;
        }
      }

      setMessages([
        ...newMessages,
        { role: "assistant", content: `Error: ${errorText}` },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handlePublish() {
    if (!token || !packageInfo || files.length === 0) return;

    setPublishing(true);
    setPublishError("");

    try {
      const result = await forgeCreateRepo({
        package_name: packageInfo.name,
        files: files.map((f) => ({ filename: f.filename, content: f.content })),
        github_token: token,
      });

      // Navigate to submit page with the repo URL pre-filled
      router.push(`/submit?repo_url=${encodeURIComponent(result.repo_url)}`);
    } catch (err: unknown) {
      console.error("Publish error:", err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosErr = err as any;
      const detail = axiosErr?.response?.data?.detail;
      setPublishError(
        typeof detail === "string"
          ? detail
          : "Failed to create GitHub repo. Make sure you're signed in with repo permissions."
      );
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Left: Chat panel ── */}
      <div
        className={cn(
          "flex flex-col border-r border-[var(--color-border)] bg-[var(--color-background)] transition-all duration-200",
          chatCollapsed ? "w-12" : hasFiles ? "w-[420px]" : "w-full max-w-2xl mx-auto"
        )}
      >
        {chatCollapsed ? (
          <button
            onClick={() => setChatCollapsed(false)}
            className="flex h-full items-start justify-center pt-4"
            title="Show chat"
          >
            <PanelLeftOpen className="h-4 w-4 text-[var(--color-text-muted)]" />
          </button>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  Forge
                </span>
                {packageInfo && (
                  <code className="text-xs text-[var(--color-primary)]">
                    {packageInfo.name}
                  </code>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    "rounded-md p-1.5 text-[var(--color-text-muted)]",
                    "hover:bg-[var(--color-surface-alt)] transition-colors",
                    showSettings && "bg-[var(--color-surface-alt)]"
                  )}
                  title="API settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
                {hasFiles && (
                  <button
                    onClick={() => setChatCollapsed(true)}
                    className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-colors"
                    title="Collapse chat"
                  >
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Settings panel */}
            {showSettings && (
              <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                      Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className={cn(
                        "mt-1 w-full rounded border border-[var(--color-border)]",
                        "bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text)]",
                        "focus:border-[var(--color-primary)] focus:outline-none"
                      )}
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.display_name} ({m.estimated_cost}/gen)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-[2]">
                    <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                      {currentProvider === "anthropic" ? "Anthropic" : "OpenAI"} API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        currentProvider === "anthropic" ? "sk-ant-api03-..." : "sk-..."
                      }
                      className={cn(
                        "mt-1 w-full rounded border border-[var(--color-border)]",
                        "bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text)]",
                        "placeholder:text-[var(--color-text-muted)]",
                        "focus:border-[var(--color-primary)] focus:outline-none"
                      )}
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] text-[var(--color-text-muted)]">
                  Sent to{" "}
                  {currentProvider === "anthropic" ? "Anthropic" : "OpenAI"} directly.
                  Never stored.
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <Sparkles className="h-8 w-8 text-[var(--color-primary)]/30" />
                  <p className="mt-3 text-sm font-medium text-[var(--color-text)]">
                    What should your command do?
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Describe it and the Forge will generate a complete package
                  </p>
                  <div className="mt-5 flex flex-col gap-1.5 w-full max-w-xs">
                    {[
                      "A command that fetches cryptocurrency prices",
                      "A command that checks my internet speed",
                      "A command that tells dad jokes",
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => setInput(example)}
                        className={cn(
                          "rounded-lg border border-[var(--color-border)] px-3 py-2",
                          "text-xs text-[var(--color-text-muted)] text-left",
                          "hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)]",
                          "transition-colors"
                        )}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-3">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        msg.role === "user"
                          ? "bg-[var(--color-primary)]/10 text-[var(--color-text)]"
                          : "bg-[var(--color-surface-alt)] text-[var(--color-text)]"
                      )}
                    >
                      <p className="whitespace-pre-wrap text-xs leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-muted)]">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-[var(--color-border)] p-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    hasApiKey
                      ? hasFiles
                        ? "Ask for changes..."
                        : "Describe what your command should do..."
                      : "Enter API key first"
                  }
                  disabled={!hasApiKey || loading}
                  rows={1}
                  className={cn(
                    "flex-1 resize-none rounded-lg border border-[var(--color-border)]",
                    "bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)]",
                    "placeholder:text-[var(--color-text-muted)]",
                    "focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]",
                    "disabled:opacity-50"
                  )}
                  style={{ minHeight: "36px", maxHeight: "100px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
                    "bg-[var(--color-primary)] text-white",
                    "hover:bg-[var(--color-primary)]/90",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Right: File editor panel ── */}
      {hasFiles && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* File tabs */}
          <div className="flex items-center gap-0 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
            {files.map((file) => {
              const Icon =
                file.language === "python"
                  ? FileCode
                  : file.language === "yaml"
                    ? Settings
                    : FileText;
              return (
                <button
                  key={file.filename}
                  onClick={() => setActiveFile(file.filename)}
                  className={cn(
                    "flex items-center gap-1.5 border-r border-[var(--color-border)] px-4 py-2.5 text-xs transition-colors",
                    activeFile === file.filename
                      ? "bg-[var(--color-surface)] text-[var(--color-text)] font-medium"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {file.filename}
                </button>
              );
            })}
            {packageInfo && (
              <div className="ml-auto flex items-center gap-2 px-4">
                <span className="text-xs font-medium text-[var(--color-text)]">
                  {packageInfo.displayName}
                </span>
                {user ? (
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      "bg-[var(--color-secondary)] text-white",
                      "hover:bg-[var(--color-secondary)]/90",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        Publish
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={login}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      "border border-[var(--color-border)] text-[var(--color-text-muted)]",
                      "hover:bg-[var(--color-surface-alt)]"
                    )}
                  >
                    Sign in to publish
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Validation results */}
          {validation && !validation.passed && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-2 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-xs font-medium text-red-800 dark:text-red-300">
                Validation failed — fix these before publishing:
              </p>
              <ul className="mt-1 list-disc pl-4 text-xs text-red-700 dark:text-red-400">
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {validation && validation.passed && (validation.warnings.length > 0 || validation.dangerous_patterns.length > 0) && (
            <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-2 dark:border-yellow-800 dark:bg-yellow-900/20">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                Validation passed with warnings:
              </p>
              <ul className="mt-1 list-disc pl-4 text-xs text-yellow-700 dark:text-yellow-400">
                {validation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {validation.dangerous_patterns.map((d, i) => (
                  <li key={`d-${i}`}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {validation && validation.passed && validation.warnings.length === 0 && validation.dangerous_patterns.length === 0 && (
            <div className="border-b border-green-200 bg-green-50 px-4 py-1.5 text-xs text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              All checks passed
            </div>
          )}

          {/* Publish error */}
          {publishError && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {publishError}
            </div>
          )}

          {/* Editor area */}
          {activeFile && (
            <FileEditor
              file={files.find((f) => f.filename === activeFile)!}
              onEdit={handleFileEdit}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Editable file component with CodeMirror ───────────────────────────

function FileEditor({
  file,
  onEdit,
}: {
  file: ForgeFile;
  onEdit: (filename: string, content: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [CodeMirrorEditor, setCodeMirrorEditor] = useState<React.ComponentType<any> | null>(null);
  const [langExtension, setLangExtension] = useState<any>(null);
  const [themes, setThemes] = useState<{ light: any; dark: any } | null>(null);

  // Dynamically load CodeMirror (client-only, avoids SSR issues)
  useEffect(() => {
    Promise.all([
      import("@uiw/react-codemirror"),
      import("@codemirror/lang-python"),
      import("@codemirror/lang-yaml"),
      import("@codemirror/lang-markdown"),
      import("@uiw/codemirror-theme-github"),
    ]).then(([cm, python, yaml, markdown, githubTheme]) => {
      setCodeMirrorEditor(() => cm.default);
      setThemes({ light: githubTheme.githubLight, dark: githubTheme.githubDark });

      // Map language to extension
      const langMap: Record<string, any> = {
        python: python.python(),
        yaml: yaml.yaml(),
        markdown: markdown.markdown(),
      };
      setLangExtension(langMap[file.language] || null);
    });
  }, [file.language]);

  async function handleCopy() {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5">
        <span className="text-xs text-[var(--color-text-muted)]">
          {file.content.split("\n").length} lines · {file.language}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            "hover:bg-[var(--color-surface-alt)] transition-colors"
          )}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        {CodeMirrorEditor && themes ? (
          <CodeMirrorEditor
            value={file.content}
            onChange={(value: string) => onEdit(file.filename, value)}
            extensions={langExtension ? [langExtension] : []}
            theme={isDark ? themes.dark : themes.light}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              bracketMatching: true,
              closeBrackets: true,
              tabSize: 4,
            }}
            style={{ fontSize: "12px", height: "100%" }}
          />
        ) : (
          // Fallback while CodeMirror loads
          <pre className="p-4 text-xs leading-relaxed text-[var(--color-text)] font-mono">
            <code>{file.content}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
