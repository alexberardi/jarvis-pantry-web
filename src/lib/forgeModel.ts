import Anthropic from "@anthropic-ai/sdk";
import type { BetaContentBlockParam, BetaMessageParam, BetaToolResultBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import axios from "axios";

import { forgeListPackageFiles, forgeReadPackageFile, forgeSearchPackages, type ForgePrompt } from "@/api/pantry";

/**
 * The Forge calls a hosted model from the browser with the user's own key: Pantry hands over the
 * system prompt (GET /v1/forge/prompt), the browser streams the reply, and Pantry applies it to the
 * package (POST /v1/forge/parse). No request through Pantry waits on a model, so a long generation
 * can't hit a proxy timeout, and the key never leaves the browser except to its provider.
 *
 * The model can also look at published packages through tools the browser runs against Pantry
 * (search, list files, read a file), so it reads a reference package instead of asking for it.
 */

export type ChatMessage = { role: "user" | "assistant"; content: string };

type ToolCall = { id: string; name: string; input: Record<string, unknown> };
type ToolResult = { call: ToolCall; output: string; error: boolean };

/** How a streamed turn ended: done, stopped at the output cap (the reply goes on in another call), or asking for tools. */
type Turn = { text: string; truncated: boolean; calls: ToolCall[] };

/** One model conversation in its provider's own message format. */
interface Conversation {
  turn(onText: (delta: string) => void, signal?: AbortSignal): Promise<Turn>;
  /** After a turn that asked for tools: send that turn back as it was, with the tools' results. */
  answer(results: ToolResult[]): void;
  /** After a turn cut off at the output cap: ask for the rest. */
  continueFrom(text: string): void;
}

export interface Progress {
  /** The reply so far, across continuations. */
  text: string;
  /** The file being written, from the last === FILE: … === marker. */
  file: string | null;
  /** 0 for the first call, then 1, 2, … for each continuation. */
  continuation: number;
  /** What the model looked at with its tools, one line each ("Read zwave: protocol.py"). */
  activity: string[];
}

/** How many times a reply cut off at the output cap is continued before giving up. */
export const MAX_CONTINUATIONS = 3;
/** How many rounds of tool calls a reply may make; past it the tools answer with an error. */
export const MAX_TOOL_ROUNDS = 8;

const TOOLS = [
  {
    name: "search_packages",
    description:
      "Search the published Jarvis packages in the Pantry by name or description. Returns each package's name, " +
      "description, type, components and latest version.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words to match, e.g. 'zwave' or 'weather'. Empty lists the most installed." },
        type: {
          type: "string",
          enum: ["command", "agent", "device_protocol", "device_manager", "bundle"],
          description: "Only packages holding a component of this type.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_package_files",
    description: "List a published package's files (path and size in bytes) at its latest published version.",
    parameters: {
      type: "object",
      properties: { package: { type: "string", description: "The package name from search_packages." } },
      required: ["package"],
    },
  },
  {
    name: "read_package_file",
    description: "Read one text file of a published package at its latest published version (up to 200 KB).",
    parameters: {
      type: "object",
      properties: {
        package: { type: "string", description: "The package name from search_packages." },
        path: { type: "string", description: "The file's path from list_package_files." },
      },
      required: ["package", "path"],
    },
  },
] as const;

/** Runs one tool against Pantry. Failures come back as error results for the model, never thrown. */
async function runTool(call: ToolCall): Promise<ToolResult & { line: string }> {
  const pkg = String(call.input.package ?? "");
  const path = String(call.input.path ?? "");
  const query = String(call.input.query ?? "");
  const type = typeof call.input.type === "string" && call.input.type ? call.input.type : undefined;
  const line =
    call.name === "search_packages" ? `Searched packages: ${query || "(all)"}${type ? ` (${type})` : ""}`
    : call.name === "list_package_files" ? `Listed ${pkg}`
    : call.name === "read_package_file" ? `Read ${pkg}: ${path}`
    : `Unknown tool ${call.name}`;
  try {
    let output: string;
    if (call.name === "search_packages") output = JSON.stringify(await forgeSearchPackages(query, type));
    else if (call.name === "list_package_files") output = JSON.stringify(await forgeListPackageFiles(pkg));
    else if (call.name === "read_package_file") output = (await forgeReadPackageFile(pkg, path)).content;
    else throw new Error(`Unknown tool: ${call.name}`);
    return { call, output, error: false, line };
  } catch (e) {
    const detail = axios.isAxiosError(e) ? (e.response?.data?.detail ?? e.message) : e instanceof Error ? e.message : String(e);
    return { call, output: `Error: ${detail}`, error: true, line: `${line} (failed: ${detail})` };
  }
}

const CONTINUE =
  "Your previous reply was cut off by the output limit. Continue it from exactly where it stopped: " +
  "start with the very next character, repeat nothing, and keep the same format through === END ===.";

/** The provider these settings call from the browser, or null for the server path (local models). */
export function browserProvider(p: Pick<ForgePrompt, "provider" | "api_type">): "anthropic" | "openai" | null {
  if (p.provider === "anthropic") return "anthropic";
  if (p.provider === "openai" && p.api_type === "responses") return "openai";
  return null;
}

/** The file a reply is writing now: the last FILE marker's path. */
export function currentFile(text: string): string | null {
  const all = [...text.matchAll(/^=== FILE: (.+?) ===[ \t]*$/gm)];
  return all.length ? all[all.length - 1][1].trim() : null;
}

// Every Claude model the Forge offers but Haiku takes server-side fallbacks: a refusal reruns on
// another model in the same call instead of ending the generation.
const FALLBACK_MODELS = new Set(["claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-1"]);

function claudeConversation(p: ForgePrompt, apiKey: string, history: ChatMessage[]): Conversation {
  // The user's own key, in the user's own browser: the SDK's browser guard is about shipping a
  // shared key to visitors, which this isn't.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const fallback = FALLBACK_MODELS.has(p.api_model);
  const messages: BetaMessageParam[] = [...history];
  let lastContent: BetaContentBlockParam[] = [];
  return {
    async turn(onText, signal) {
      const stream = client.beta.messages.stream(
        {
          model: p.api_model,
          max_tokens: p.max_tokens,
          system: p.system,
          messages,
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })),
          // Auto only: forcing a tool is refused on models with thinking.
          tool_choice: { type: "auto" },
          ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
        },
        { signal },
      );
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") onText(event.delta.text);
      }
      const message = await stream.finalMessage();
      if (message.stop_reason === "refusal") throw new Error("The model declined this request.");
      // Sent back unchanged on a tool round: thinking blocks must be returned as they came.
      lastContent = message.content as BetaContentBlockParam[];
      // After a fallback, the reply is what the model that took over wrote.
      const last = message.content.map((b) => b.type).lastIndexOf("fallback");
      const after = message.content.slice(last + 1);
      const text = after.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      const calls = message.stop_reason === "tool_use"
        ? after.flatMap((b) => (b.type === "tool_use" ? [{ id: b.id, name: b.name, input: (b.input ?? {}) as Record<string, unknown> }] : []))
        : [];
      return { text, truncated: message.stop_reason === "max_tokens", calls };
    },
    answer(results) {
      const blocks: BetaToolResultBlockParam[] = results.map((r) => ({
        type: "tool_result",
        tool_use_id: r.call.id,
        content: r.output,
        ...(r.error ? { is_error: true } : {}),
      }));
      messages.push({ role: "assistant", content: lastContent }, { role: "user", content: blocks });
    },
    continueFrom(text) {
      messages.push({ role: "assistant", content: text }, { role: "user", content: CONTINUE });
    },
  };
}

type OpenAIItem = { type: string; call_id?: string; name?: string; arguments?: string } & Record<string, unknown>;

function openaiConversation(p: ForgePrompt, apiKey: string, history: ChatMessage[]): Conversation {
  const input: unknown[] = [{ role: "system", content: p.system }, ...history];
  let lastOutput: OpenAIItem[] = [];
  return {
    async turn(onText, signal) {
      const resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: p.api_model,
          input,
          max_output_tokens: p.max_tokens,
          tools: TOOLS.map((t) => ({ type: "function", name: t.name, description: t.description, parameters: t.parameters })),
          stream: true,
        }),
        signal,
      });
      const turn = await readOpenAIStream(resp, onText);
      lastOutput = turn.output;
      const calls = turn.output.flatMap((item) => {
        if (item.type !== "function_call") return [];
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(item.arguments || "{}");
        } catch {
          // Bad arguments still get an answer: the tool reports what is missing.
        }
        return [{ id: String(item.call_id), name: String(item.name), input: args }];
      });
      return { text: turn.text, truncated: turn.truncated, calls };
    },
    answer(results) {
      // The turn's output items (reasoning, function calls) go back as they came, then each call's output.
      input.push(...lastOutput, ...results.map((r) => ({ type: "function_call_output", call_id: r.call.id, output: r.output })));
    },
    continueFrom(text) {
      input.push({ role: "assistant", content: text }, { role: "user", content: CONTINUE });
    },
  };
}

async function readOpenAIStream(
  resp: Response,
  onText: (delta: string) => void,
): Promise<{ text: string; truncated: boolean; output: OpenAIItem[] }> {
  if (!resp.ok || !resp.body) throw new Error(`OpenAI API error: ${resp.status} ${await resp.text().catch(() => "")}`);

  let text = "";
  let truncated = false;
  const output: OpenAIItem[] = [];
  let buffer = "";
  const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    // Server-sent events: blank-line separated, each with a "data:" JSON line.
    let cut: number;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const data = block
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (!data || data === "[DONE]") continue;
      const ev = JSON.parse(data) as { type: string; delta?: string; item?: OpenAIItem; response?: { incomplete_details?: { reason?: string } }; error?: { message?: string }; message?: string };
      if (ev.type === "response.output_item.done" && ev.item) {
        output.push(ev.item);
      } else if (ev.type === "response.output_text.delta" && ev.delta) {
        text += ev.delta;
        onText(ev.delta);
      } else if (ev.type === "response.incomplete") {
        truncated = ev.response?.incomplete_details?.reason === "max_output_tokens";
        if (!truncated) throw new Error(`OpenAI stopped: ${ev.response?.incomplete_details?.reason ?? "incomplete"}`);
      } else if (ev.type === "response.failed" || ev.type === "error") {
        throw new Error(ev.error?.message ?? ev.message ?? "OpenAI request failed");
      }
    }
  }
  return { text, truncated, output };
}

/**
 * Streams one Forge reply from the provider, continuing it in further calls while it stops at the
 * output cap (each continuation sends the reply so far and asks for the rest), and running the tools
 * a turn asks for before going on. Returns the whole reply and whether it still ended cut off.
 */
export async function streamForgeReply(opts: {
  prompt: ForgePrompt;
  apiKey: string;
  messages: ChatMessage[];
  onProgress?: (p: Progress) => void;
  signal?: AbortSignal;
}): Promise<{ text: string; truncated: boolean }> {
  const provider = browserProvider(opts.prompt);
  if (!provider) throw new Error(`${opts.prompt.model} isn't called from the browser`);
  const conversation = (provider === "anthropic" ? claudeConversation : openaiConversation)(opts.prompt, opts.apiKey, opts.messages);

  let reply = "";
  const activity: string[] = [];
  let continuation = 0;
  for (let toolRounds = 0; ; ) {
    let live = "";
    const { text, truncated, calls } = await conversation.turn((delta) => {
      live += delta;
      const sofar = reply + live;
      opts.onProgress?.({ text: sofar, file: currentFile(sofar), continuation, activity: [...activity] });
    }, opts.signal);
    if (calls.length) {
      // A turn that asks for tools is not part of the reply ("Let me look at zwave first").
      if (++toolRounds > MAX_TOOL_ROUNDS + 1) throw new Error("The model kept calling tools instead of replying.");
      const results = toolRounds > MAX_TOOL_ROUNDS
        ? calls.map((call) => ({ call, output: "Error: tool limit reached. Write the reply now.", error: true, line: "Tool limit reached" }))
        : await Promise.all(calls.map(runTool));
      activity.push(...results.map((r) => r.line));
      opts.onProgress?.({ text: reply, file: currentFile(reply), continuation, activity: [...activity] });
      conversation.answer(results);
      continue;
    }
    reply += text;
    if (!truncated || continuation >= MAX_CONTINUATIONS) return { text: reply, truncated };
    continuation++;
    conversation.continueFrom(text);
  }
}
