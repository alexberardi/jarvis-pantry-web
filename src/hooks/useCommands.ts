"use client";

import { useQuery } from "@tanstack/react-query";
import {
  searchCommands,
  getCommand,
  getVersions,
  getReviews,
  getCategories,
} from "@/api/pantry";

export function useSearchCommands(params: {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ["commands", params],
    queryFn: () => searchCommands(params),
    staleTime: 30_000,
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
