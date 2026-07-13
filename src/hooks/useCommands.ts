"use client";

import { useQuery } from "@tanstack/react-query";
import {
  searchCommands,
  getCommand,
  getVersions,
  getReviews,
  getCategories,
} from "@/api/pantry";
import type { CommandsResponse } from "@/api/pantry";

export function useSearchCommands(
  params: {
    q?: string;
    category?: string;
    sort?: string;
    page?: number;
    per_page?: number;
  },
  /**
   * Catalog fetched on the server for the default (unfiltered) view.
   *
   * Without it the browse page renders nothing until the client-side query
   * resolves — so crawlers, link previews and anyone reading page source saw an
   * empty store advertising "0 commands". Only pass this for the default view;
   * once the user searches or filters, the query key changes and React Query
   * fetches for real.
   */
  initialData?: CommandsResponse,
) {
  return useQuery({
    queryKey: ["commands", params],
    queryFn: () => searchCommands(params),
    staleTime: 30_000,
    initialData,
  });
}

export function useCommand(name: string) {
  return useQuery({
    queryKey: ["command", name],
    queryFn: () => getCommand(name),
    enabled: !!name,
  });
}

export function useVersions(name: string) {
  return useQuery({
    queryKey: ["versions", name],
    queryFn: () => getVersions(name),
    enabled: !!name,
  });
}

export function useReviews(name: string) {
  return useQuery({
    queryKey: ["reviews", name],
    queryFn: () => getReviews(name),
    enabled: !!name,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 60_000,
  });
}
