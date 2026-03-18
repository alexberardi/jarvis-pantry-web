import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_PANTRY_API_URL || "";

export const pantryApi = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// ── Types ──────────────────────────────────────────────────────────────

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
