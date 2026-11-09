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
  const failed = r.runs.filter(runFailed).length;
  const runs = `${r.runs.length} run${r.runs.length === 1 ? "" : "s"}`;
  return r.runs.length === 0 ? "Installed, not run yet" : failed ? `${runs}, ${failed} failed` : `${runs}, all succeeded`;
}

/**
 * The message the model gets: the report as sent, plus the package as it is now. The Forge's
 * history carries only explanations, so without the files a revision can't see the code to fix.
 */
export function fixPrompt(r: ForgeReport, files: ForgeFile[]): string {
  const report = { install: r.install, runs: r.runs, note: r.note ?? null };
  const code = files.map((f) => `--- ${f.filename} ---\n${f.content}`).join("\n\n");
  return [
    "I test-installed this package on my Jarvis node. Here is what happened (the install result and every run of its commands: the arguments Jarvis passed and what the command returned).",
    r.note ? `My note: ${r.note}` : "",
    "```json\n" + JSON.stringify(report, null, 2) + "\n```",
    "Find the cause of anything that went wrong and fix it. Return the complete updated files. The current files:",
    code,
  ].filter(Boolean).join("\n\n");
}
