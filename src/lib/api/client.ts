import type {
  AcceptedJobProject,
  AccountingCompany,
  AccountingTransaction,
  ApiPage,
  Bid,
  Job,
  PropertyAsset,
  Session,
  Task,
  WorkReport,
  WorkspaceLog,
  WorkSession,
} from "./types";

type JsonBody = Record<string, unknown> | unknown[] | null;

export class ClientApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function qs(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const value = search.toString();
  return value ? `?${value}` : "";
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: JsonBody } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers:
      options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ClientApiError(
      payload?.message ?? `Request failed with ${response.status}`,
      response.status,
      payload,
    );
  }

  return payload as T;
}

function bff(path: string) {
  return `/api/bff/${path.replace(/^\/+/, "")}`;
}

export const api = {
  session: () => apiFetch<Session>("/api/session"),
  logout: () => apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  tasks: () => apiFetch<Task[]>(bff("tasks")),
  createTask: (task: Partial<Task>) =>
    apiFetch<Task>(bff("tasks"), { method: "POST", body: task }),
  updateTask: (id: string | number, task: Partial<Task>) =>
    apiFetch<Task>(bff(`tasks/${id}`), { method: "PUT", body: task }),
  deleteTask: (id: string | number) =>
    apiFetch<{ success?: boolean }>(bff(`tasks/${id}`), { method: "DELETE" }),

  workSessions: () => apiFetch<WorkSession[]>(bff("work-sessions")),
  createWorkSession: (session: Partial<WorkSession>) =>
    apiFetch<WorkSession>(bff("work-sessions"), { method: "POST", body: session }),
  updateWorkSession: (id: string | number, session: Partial<WorkSession>) =>
    apiFetch<WorkSession>(bff(`work-sessions/${id}`), {
      method: "PUT",
      body: session,
    }),

  jobFeed: (page = 1, type = "all") =>
    apiFetch<ApiPage<Job>>(bff(`jobs/feed${qs({ page, type })}`)),
  jobSearch: (params: {
    page?: number;
    text?: string;
    type?: string;
    categoryIds?: number[];
    hashtagIds?: number[];
  }) => {
    const search = new URLSearchParams();
    if (params.page) search.set("page", String(params.page));
    if (params.text) search.set("text", params.text);
    if (params.type) search.set("type", params.type);
    params.categoryIds?.forEach((id) => search.append("categoryIds[]", String(id)));
    params.hashtagIds?.forEach((id) => search.append("hashtagIds[]", String(id)));
    return apiFetch<ApiPage<Job>>(bff(`jobs/search?${search.toString()}`));
  },
  myJobs: (page = 1) => apiFetch<ApiPage<Job>>(bff(`jobs/my-jobs${qs({ page })}`)),
  jobDetails: (id: number, owner = false) =>
    apiFetch<Job>(bff(`jobs/${id}/${owner ? "details-for-owner" : "details"}`)),
  createJob: (kind: JobKind, payload: Record<string, unknown>) =>
    apiFetch<unknown>(bff(`jobs/${kind}/create`), { method: "POST", body: payload }),
  updateJob: (kind: JobKind, id: number, payload: Record<string, unknown>) =>
    apiFetch<unknown>(bff(`jobs/${kind}/${id}/update`), {
      method: "PUT",
      body: payload,
    }),
  closeJob: (id: number) =>
    apiFetch<unknown>(bff(`jobs/${id}/close`), { method: "PATCH", body: {} }),

  myBids: (page = 1) => apiFetch<ApiPage<Bid>>(bff(`bids/all${qs({ page })}`)),
  jobBids: (jobId: number, page = 1) =>
    apiFetch<ApiPage<Bid>>(bff(`jobs/${jobId}/bids/all${qs({ page })}`)),
  createBid: (jobId: number, kind: JobKind, payload: Record<string, unknown>) =>
    apiFetch<unknown>(bff(`jobs/${jobId}/bids/${kind}/create`), {
      method: "POST",
      body: payload,
    }),
  updateBid: (
    jobId: number,
    bidId: number,
    kind: JobKind,
    payload: Record<string, unknown>,
  ) =>
    apiFetch<unknown>(bff(`jobs/${jobId}/bids/${bidId}/${kind}/update`), {
      method: "PUT",
      body: payload,
    }),
  bidAction: (jobId: number, bidId: number, action: BidAction) =>
    apiFetch<unknown>(bff(`jobs/${jobId}/bids/${bidId}/${action}`), {
      method: "PATCH",
      body: {},
    }),

  workspaceLogs: (workspaceId: number, page = 1) =>
    apiFetch<ApiPage<WorkspaceLog>>(bff(`workspace/${workspaceId}/logs${qs({ page })}`)),
  workspaceLog: (workspaceId: number, logId: number) =>
    apiFetch<WorkspaceLog>(bff(`workspace/${workspaceId}/log/${logId}`)),
  createWorkReport: (workspaceId: number, desc: string) =>
    apiFetch<unknown>(bff(`work-reports/workspace/${workspaceId}`), {
      method: "POST",
      body: { desc },
    }),
  updateWorkReport: (id: number, desc: string) =>
    apiFetch<unknown>(bff(`work-reports/${id}`), { method: "PUT", body: { desc } }),
  workReports: (jobId: number, page = 1) =>
    apiFetch<ApiPage<WorkReport>>(bff(`work-reports/job/${jobId}${qs({ page })}`)),
  workspaceAction: (
    workspaceId: number,
    action: "request-work-report" | "mark-work-complete" | "reopen",
    msg?: string,
  ) =>
    apiFetch<unknown>(bff(`workspace/${workspaceId}/${action}`), {
      method: "PATCH",
      body: { msg },
    }),
  syncWorkspaceEvents: (workspaceId: number, enabled: boolean) =>
    apiFetch<unknown>(bff(`workspace/${workspaceId}/sync-events-on-chat`), {
      method: "PATCH",
      body: { enabled },
    }),

  companies: () => apiFetch<AccountingCompany[]>(bff("accounting/company-profiles")),
  createCompany: (company: Partial<AccountingCompany>) =>
    apiFetch<AccountingCompany>(bff("accounting/company-profiles"), {
      method: "POST",
      body: company,
    }),
  updateCompany: (id: number, company: Partial<AccountingCompany>) =>
    apiFetch<AccountingCompany>(bff(`accounting/company-profiles/${id}`), {
      method: "PATCH",
      body: company,
    }),
  transactions: (currency?: string) =>
    apiFetch<AccountingTransaction[]>(
      bff(`accounting/transactions${qs({ currency })}`),
    ),
  createTransaction: (transaction: Partial<AccountingTransaction>) =>
    apiFetch<AccountingTransaction>(bff("accounting/transactions"), {
      method: "POST",
      body: transaction,
    }),
  updateTransaction: (id: string | number, transaction: Partial<AccountingTransaction>) =>
    apiFetch<AccountingTransaction>(bff(`accounting/transactions/${id}`), {
      method: "PATCH",
      body: transaction,
    }),
  balances: () => apiFetch<Record<string, number>>(bff("accounting/balances")),
  transfer: (payload: {
    toUserId: number;
    currency: string;
    amount: number;
    description: string;
  }) =>
    apiFetch<unknown>(bff("accounting/transfers"), { method: "POST", body: payload }),

  properties: (status?: string) =>
    apiFetch<PropertyAsset[]>(bff(`property/assets${qs({ status })}`)),
  createProperty: (asset: Partial<PropertyAsset>) =>
    apiFetch<PropertyAsset>(bff("property/assets"), { method: "POST", body: asset }),
  updateProperty: (id: string | number, asset: Partial<PropertyAsset>) =>
    apiFetch<PropertyAsset>(bff(`property/assets/${id}`), {
      method: "PATCH",
      body: asset,
    }),
  requestHandover: (id: string | number, payload: { toUserId: number; handoverType: string }) =>
    apiFetch<unknown>(bff(`property/assets/${id}/handover-requests`), {
      method: "POST",
      body: payload,
    }),
  handovers: (id: string | number) =>
    apiFetch<unknown[]>(bff(`property/assets/${id}/handover-requests`)),
  acceptHandover: (id: string | number) =>
    apiFetch<unknown>(bff(`property/handover-requests/${id}/accept`), {
      method: "POST",
      body: {},
    }),

  sendMatrixMessage: (payload: {
    roomId: string;
    body: string;
    projectTitle?: string;
    jobId?: number;
  }) => apiFetch<{ ok: boolean }>("/api/matrix/send", { method: "POST", body: payload }),
};

export type JobKind = "security-incidence" | "geo-located" | "global" | "ride";
export type BidAction = "withdraw" | "shortlist" | "accept" | "reject";

export function normalizeTasks(items: Task[]) {
  return [...items].sort((a, b) => {
    const aDate = a.dueAt ?? a.startAt ?? a.createdAt ?? "";
    const bDate = b.dueAt ?? b.startAt ?? b.createdAt ?? "";
    return aDate.localeCompare(bDate);
  });
}

export function normalizeWorkSessions(items: WorkSession[]) {
  return [...items].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function acceptedJobProjectsFromBids(bids: Bid[]): AcceptedJobProject[] {
  const map = new Map<number, AcceptedJobProject>();
  for (const bid of bids) {
    if (!bid.accepted || !bid.job?.id) continue;
    map.set(bid.job.id, {
      jobId: bid.job.id,
      title: bid.job.title?.trim() || `Job #${bid.job.id}`,
      chatRoomId: bid.job.chatRoomId,
      issuerUserId: bid.job.userId,
      issuerName: bid.job.user?.fullName,
    });
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
}

