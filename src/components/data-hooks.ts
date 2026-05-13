"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { acceptedJobProjectsFromBids, api, normalizeTasks, normalizeWorkSessions } from "@/lib/api/client";
import type { AccountingTransaction, Bid, Job, PropertyAsset, Task, WorkSession } from "@/lib/api/types";

export function useSession() {
  return useQuery({ queryKey: ["session"], queryFn: api.session });
}

export function useCoreData() {
  const results = useQueries({
    queries: [
      { queryKey: ["tasks"], queryFn: api.tasks },
      { queryKey: ["work-sessions"], queryFn: api.workSessions },
      { queryKey: ["my-bids"], queryFn: () => api.myBids(1) },
      { queryKey: ["my-jobs"], queryFn: () => api.myJobs(1) },
      { queryKey: ["balances"], queryFn: api.balances },
      { queryKey: ["properties"], queryFn: () => api.properties() },
      { queryKey: ["transactions"], queryFn: () => api.transactions() },
    ],
  });

  const tasks = normalizeTasks((results[0].data ?? []) as Task[]);
  const sessions = normalizeWorkSessions((results[1].data ?? []) as WorkSession[]);
  const bids = (((results[2].data as { data?: Bid[] } | undefined)?.data) ?? []) as Bid[];
  const myJobs = (((results[3].data as { data?: Job[] } | undefined)?.data) ?? []) as Job[];
  const balances = (results[4].data ?? {}) as Record<string, number>;
  const properties = (results[5].data ?? []) as PropertyAsset[];
  const transactions = (results[6].data ?? []) as AccountingTransaction[];
  const acceptedJobs = acceptedJobProjectsFromBids(bids);
  const isLoading = results.some((result) => result.isLoading);
  const error = results.find((result) => result.error)?.error;

  return {
    tasks,
    sessions,
    bids,
    myJobs,
    balances,
    properties,
    transactions,
    acceptedJobs,
    isLoading,
    error,
  };
}

