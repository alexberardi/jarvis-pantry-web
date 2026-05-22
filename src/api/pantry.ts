import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_PANTRY_API_URL || "";

export const pantryApi = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// ── Types ──────────────────────────────────────────────────────────────

export interface PackageComponent {
  type: "command" | "agent" | "device_protocol" | "device_manager";
  name: string;
  path?: string;
  description?: string;
}

export interface CommandSummary {
  command_name: string;
  display_name: string;
  description: string;
  author: string | null;
  latest_version: string;
  categories: string[];
  install_count: number;
  danger_rating: number | null;
  verified: boolean;
  icon_url: string | null;
  package_type: string;
  components: PackageComponent[];
}

export interface CommandAuthor {
  github: string;
  display_name: string;
  avatar_url: string | null;
}

export interface CommandDetail extends Omit<CommandSummary, "author"> {
  github_repo_url: string;
  platforms: string[];
  license: string;
  package_type: string;
  components: PackageComponent[];
  created_at: string | null;
  updated_at: string | null;
  security_report: SecurityReport | null;
  review_count: number;
  avg_rating: number | null;
  author: CommandAuthor | null;
}

export interface SecurityReport {
  summary: string;
  danger_score: number;
  concerns: string[];
  recommendation: string;
  reviewed_at: string | null;
}

export interface CommandVersion {
  version: string;
  git_tag: string;
  danger_rating: number | null;
  min_jarvis_version: string;
  published_at: string | null;
}

export interface Review {
  author: string | null;
  rating: number;
  title: string;
  body: string;
  created_at: string | null;
}

export interface Category {
  name: string;
  count: number;
}

export interface CommandsResponse {
  commands: CommandSummary[];
  total: number;
  page: number;
  per_page: number;
}

export interface AuthUser {
  github_id: number;
  github_username: string;
  display_name: string;
  avatar_url: string | null;
}

// ── Auth functions ────────────────────────────────────────────────────

export async function getGitHubAuthUrl(
  redirectUri: string
): Promise<{ url: string }> {
  const { data } = await pantryApi.get("/v1/auth/github", {
    params: { redirect_uri: redirectUri },
  });
  return data;
}

export async function exchangeGitHubCode(
  code: string
): Promise<{ access_token: string; user: AuthUser }> {
  const { data } = await pantryApi.post("/v1/auth/github/callback", { code });
  return data;
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const { data } = await pantryApi.get("/v1/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function deleteCommand(
  name: string,
  token: string
): Promise<{ status: string; command_name: string }> {
  const { data } = await pantryApi.delete(`/v1/commands/${name}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

// ── API functions ──────────────────────────────────────────────────────

export async function searchCommands(params: {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  per_page?: number;
}): Promise<CommandsResponse> {
  const { data } = await pantryApi.get("/v1/commands", { params });
  return data;
}

export async function getCommand(name: string): Promise<CommandDetail> {
  const { data } = await pantryApi.get(`/v1/commands/${name}`);
  return data;
}

export async function getVersions(
  name: string
): Promise<{ command_name: string; versions: CommandVersion[] }> {
  const { data } = await pantryApi.get(`/v1/commands/${name}/versions`);
  return data;
}

export async function getReviews(
  name: string
): Promise<{ command_name: string; reviews: Review[] }> {
  const { data } = await pantryApi.get(`/v1/commands/${name}/reviews`);
  return data;
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await pantryApi.get("/v1/categories");
  return data.categories;
}

export interface CostEstimate {
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  formatted: string;
}

// Structured rejection finding — per roadmap#18. Replaces the prior
// flat-string `errors` / `warnings` / `dangerous_patterns` lists.
export interface Finding {
  reason_code: string;
  severity: "error" | "warning";
  file?: string;
  line?: number;
  snippet?: string;
  doc_url: string;
  primitive?: string;
  value?: string;
  message?: string;
}

export interface QuickSubmitResult {
  submission_id: number;
  status: string;
  command_name: string;
  version: string;
  static_analysis: {
    passed: boolean;
    // Structured errors (severity=error). Optional — older preview payloads
    // may omit it entirely.
    findings?: Finding[];
    // Structured warnings (severity=warning). The backend emits this under
    // `warnings_structured`. The legacy `warnings: string[]` key still exists
    // on the wire but is intentionally not surfaced here (per #18 hard-cut).
    warnings_structured?: Finding[];
    reason_codes?: string[];
    message?: string;
    checks_passed: number;
  };
  cost_estimate: CostEstimate | null;
}

export interface SubmissionStage {
  status: string;
  checks_passed?: number;
  findings?: Finding[];
  warnings?: Finding[];
  reason_codes?: string[];
  message?: string;
  provider?: string;
  pass_count?: number;
  fail_count?: number;
  test_count?: number;
}

export interface SubmissionStatus {
  submission_id: number;
  status: string;
  command_name: string | null;
  stages: {
    queue: SubmissionStage;
    static_analysis: SubmissionStage;
    ai_review: SubmissionStage;
    container_test: SubmissionStage;
  };
  result: {
    command_name?: string;
    display_name?: string;
    version?: string;
    reason?: string;
  } | null;
}

export async function quickSubmit(
  params: {
    repo_url: string;
    llm_provider?: string;
    llm_api_key?: string;
    confirm?: boolean;
  },
  token: string
): Promise<QuickSubmitResult> {
  const { data } = await pantryApi.post("/v1/commands/quick-submit", params, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function getSubmissionStatus(
  submissionId: number
): Promise<SubmissionStatus> {
  const { data } = await pantryApi.get(
    `/v1/submissions/${submissionId}/status`
  );
  return data;
}

// ── Forge types & functions ───────────────────────────────────────────

export interface ForgeFile {
  filename: string;
  content: string;
  language: string;
}

export interface ForgeValidation {
  passed: boolean;
  findings: Finding[];
  warnings: Finding[];
  reason_codes?: string[];
  message?: string;
}

export interface ForgeResult {
  package_name: string;
  display_name: string;
  explanation: string;
  files: ForgeFile[];
  validation?: ForgeValidation;
}

export interface CreateRepoResult {
  repo_url: string;
  repo_name: string;
}

export async function forgeCreateRepo(params: {
  package_name: string;
  files: { filename: string; content: string }[];
  github_token: string;
}): Promise<CreateRepoResult> {
  const directUrl = process.env.NEXT_PUBLIC_PANTRY_API_URL || "http://localhost:7721";
  const { data } = await axios.post(`${directUrl}/v1/forge/create-repo`, params, {
    timeout: 30000,
  });
  return data;
}

export interface ForgeModel {
  id: string;
  display_name: string;
  provider: string;
  estimated_cost: string;
  estimated_cost_usd: number;
}

export async function getForgeModels(): Promise<ForgeModel[]> {
  const { data } = await pantryApi.get("/v1/forge/models");
  return data.models;
}

export async function forgeGenerate(params: {
  description: string;
  model: string;
  llm_api_key: string;
  conversation_history?: { role: string; content: string }[];
}): Promise<ForgeResult> {
  // Call Pantry backend directly — Next.js rewrite proxy can 500 on long POST requests
  const directUrl = process.env.NEXT_PUBLIC_PANTRY_API_URL || "http://localhost:7721";
  const { data } = await axios.post(`${directUrl}/v1/forge/generate`, params, {
    timeout: 120000,
  });
  return data;
}


// =============================================================================
// Forge Drafts (share codes for test installs)
// =============================================================================

export interface ForgeDraftResponse {
  share_code: string;
  session_id: string;
  expires_at: string;
}

export async function forgeUpsertDraft(params: {
  session_id: string;
  package_name: string;
  display_name?: string;
  files: { filename: string; content: string; language: string }[];
}): Promise<ForgeDraftResponse> {
  const { data } = await pantryApi.post("/v1/forge/drafts", params);
  return data;
}
