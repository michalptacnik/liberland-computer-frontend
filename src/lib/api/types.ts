export type Session = {
  authenticated: boolean;
  hasMatrix: boolean;
  user: {
    id?: number;
    email?: string;
    fullName?: string;
    matrixId?: string;
    roles?: unknown[];
  } | null;
};

export type ApiPage<T> = {
  meta?: { page?: number; limit?: number; total?: number };
  data?: T[];
};

export type TaskStatus = "todo" | "inProgress" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | string;
export type TaskProjectType = "own" | "job";

export type Task = {
  id: number | string;
  ownerId?: number;
  title: string;
  project: string;
  ownerName?: string;
  assigneeId?: number | null;
  assigneeName?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  projectType: TaskProjectType;
  jobId?: number | null;
  autoScrum?: boolean;
  startAt?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  participantIds?: number[];
  createdAt?: string;
  updatedAt?: string;
};

export type WorkSession = {
  id: number | string;
  userId: number;
  taskId: number | string;
  startedAt: string;
  stoppedAt?: string | null;
  durationSec: number;
  running: boolean;
};

export type Job = {
  id?: number;
  pId?: string;
  userId?: number;
  categoryId?: number;
  title?: string;
  desc?: string;
  payTerm?: string;
  offerPrice?: number;
  currency?: string;
  duration?: number | string;
  durationUnit?: string;
  address?: string;
  country?: string;
  radius?: number;
  closed?: boolean;
  approved?: boolean;
  permanent?: boolean;
  chatRoomId?: string;
  numBids?: number;
  numWorkReports?: number;
  workStatusText?: string;
  myRecentBid?: Bid | null;
  user?: { id?: number; fullName?: string; firstName?: string; lastName?: string };
  [key: string]: unknown;
};

export type Bid = {
  id?: number;
  jobId?: number;
  desc?: string;
  offerPrice?: number;
  currency?: string;
  payTerm?: string;
  duration?: number | string;
  durationUnit?: string;
  withdrawn?: boolean;
  shortlisted?: boolean;
  accepted?: boolean;
  rejected?: boolean;
  job?: Job;
  workspace?: Workspace;
  user?: { id?: number; fullName?: string };
};

export type Workspace = {
  id: number;
  pId?: string;
  numWorkReports?: number;
  workStatus?: string;
  syncEventsOnChat?: boolean;
  active?: boolean;
  job?: Job;
  bid?: Bid;
};

export type WorkspaceLog = {
  id?: number;
  actorType?: string;
  eventId?: number;
  userId?: number;
  msg?: string;
  createdAt?: string;
  workReport?: WorkReport;
  user?: { id?: number; fullName?: string };
};

export type WorkReport = {
  id?: number;
  pId?: string;
  bidId?: number;
  jobId?: number;
  userId?: number;
  desc?: string;
  createdAt?: string;
  updatedAt?: string;
  numFiles?: number;
  files?: { assetId?: number; asset?: { downloadUrl?: string; fileName?: string } }[];
  workspace?: Workspace;
};

export type AccountingTransaction = {
  id: string | number;
  userId?: number;
  occurredAt: string;
  currency: string;
  amount: number;
  description: string;
  companyProfileId?: number | null;
  companyProfile?: { name?: string };
  attachmentUrls?: string[];
};

export type AccountingCompany = {
  id: number;
  name: string;
  address: string;
  registrationNumber: string;
  vatNumber: string;
  systemProfile?: boolean;
  ownerUserId?: number;
  permittedUserIds?: number[];
};

export type PropertyAsset = {
  id: string | number;
  ownerUserId?: number | null;
  ownerCompanyName?: string | null;
  responsibleUserId?: number | null;
  temporaryOwnerUserId?: number | null;
  name: string;
  status: "private" | "for_rent" | "for_sale" | string;
  ownerType: "company" | "user" | string;
  latitude?: number | null;
  longitude?: number | null;
  invoiceTransactionId?: number | null;
  documents?: PropertyDocument[];
};

export type PropertyDocument = {
  url: string;
  name?: string;
  type?: string;
  public?: boolean;
};

export type AcceptedJobProject = {
  jobId: number;
  title: string;
  chatRoomId?: string;
  issuerUserId?: number;
  issuerName?: string;
};

