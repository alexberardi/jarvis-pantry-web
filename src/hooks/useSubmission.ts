"use client";

import { useQuery } from "@tanstack/react-query";
import { getSubmissionStatus, type SubmissionStatus } from "@/api/pantry";

export function useSubmission(submissionId: number | null) {
  return useQuery<SubmissionStatus>({
    queryKey: ["submission", submissionId],
    queryFn: () => getSubmissionStatus(submissionId!),
    enabled: !!submissionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      // Stop polling on terminal states
      if (
        data.status === "published" ||
        data.status === "rejected" ||
        data.status === "pending_review"
      ) {
        return false;
      }
      return 2000;
    },
  });
}
