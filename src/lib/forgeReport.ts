import type { ForgeFile, ForgeReport, ForgeTestRun } from "@/api/pantry";

/** A run failed when its command answered success: false. */
export function runFailed(run: ForgeTestRun): boolean {
  return typeof run.output === "object" && run.output !== null && (run.output as { success?: unknown }).success === false;
}

/** One line for the chat: what the report says at a glance. */
export function reportSummary(r: ForgeReport): string {
  if (r.install.status !== "completed") {
    return `Test install ${r.install.status}${r.install.error ? `: ${r.install.error}` : ""}`;
  }
  const events = r.events ?? [];
  const problems = events.filter((e) => e.kind === "log" ? ["WARNING", "ERROR", "CRITICAL"].includes(String(e.level)) : e.error).length;
  const logs = events.length ? `; ${events.length} log/device event${events.length === 1 ? "" : "s"}${problems ? `, ${problems} problem${problems === 1 ? "" : "s"}` : ""}` : "";
  const failed = r.runs.filter(runFailed).length;
  const runs = `${r.runs.length} run${r.runs.length === 1 ? "" : "s"}`;
  const head = r.runs.length === 0 ? (events.length ? "Installed" : "Installed, not run yet") : failed ? `${runs}, ${failed} failed` : `${runs}, all succeeded`;
  return head + logs;
}

/**
 * The message the model gets: the report as sent, plus the package as it is now. The Forge's
 * history carries only explanations, so without the files a revision can't see the code to fix.
 */
export function fixPrompt(r: ForgeReport, files: ForgeFile[]): string {
  const report = { install: r.install, runs: r.runs, events: r.events ?? [], note: r.note ?? null };
  return withCurrentFiles(
    [
      "I test-installed this package on my Jarvis node. Here is what happened: the install result, every run of its commands (the arguments Jarvis passed and what the command returned), and its events on the node (its own log lines, device scans with what they found, and device controls with their results).",
      r.note ? `My note: ${r.note}` : "",
      "```json\n" + JSON.stringify(report, null, 2) + "\n```",
      "Find the cause of anything that went wrong and fix it.",
    ].filter(Boolean).join("\n\n"),
    files,
  );
}

/**
 * A revision request with the package as it is now. The model replies with only the files it
 * changes; Pantry keeps the rest (LICENSE is Pantry's, so it isn't sent).
 */
export function withCurrentFiles(request: string, files: ForgeFile[]): string {
  const code = files
    .filter((f) => f.filename !== "LICENSE")
    .map((f) => `=== FILE: ${f.filename} ===\n${f.content}`)
    .join("\n");
  return `${request}\n\nWrite only the files you add or change. The package's current files:\n\n${code}\n=== END ===`;
}
