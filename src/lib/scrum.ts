import type { Task, WorkSession } from "@/lib/api/types";

export type ScrumGroup = {
  key: string;
  title: string;
  project: string;
  jobId?: number;
  jobChatRoomId?: string;
  scrumable: boolean;
  totalDurationSec: number;
  sessions: WorkSession[];
  taskTitlesByTaskId: Record<string, string>;
};

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function sessionDuration(session: WorkSession, now = new Date()) {
  if (session.running || !session.stoppedAt) {
    return Math.max(
      0,
      Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000),
    );
  }
  return session.durationSec;
}

export function groupTodaySessions(
  tasks: Task[],
  sessions: WorkSession[],
  acceptedJobs: { jobId: number; chatRoomId?: string; title: string }[] = [],
  now = new Date(),
) {
  const today = dayKey(now);
  const taskMap = new Map(tasks.map((task) => [String(task.id), task]));
  const acceptedMap = new Map(acceptedJobs.map((job) => [job.jobId, job]));
  const groups = new Map<string, ScrumGroup>();

  for (const session of sessions) {
    if (dayKey(new Date(session.startedAt)) !== today) continue;
    const task = taskMap.get(String(session.taskId));
    if (!task) continue;

    const accepted = task.jobId ? acceptedMap.get(task.jobId) : undefined;
    const isJob = task.projectType === "job" && Boolean(task.jobId);
    const key = isJob ? `job:${task.jobId}` : `own:${task.project || "Own"}`;
    const existing = groups.get(key);
    const base: ScrumGroup =
      existing ??
      ({
        key,
        title: accepted?.title ?? task.project ?? "Own",
        project: accepted?.title ?? task.project ?? "Own",
        jobId: task.jobId ?? undefined,
        jobChatRoomId: accepted?.chatRoomId,
        scrumable: Boolean(isJob && accepted?.chatRoomId),
        totalDurationSec: 0,
        sessions: [],
        taskTitlesByTaskId: {},
      } satisfies ScrumGroup);

    base.sessions.push(session);
    base.taskTitlesByTaskId[String(session.taskId)] = task.title;
    base.totalDurationSec += sessionDuration(session, now);
    groups.set(key, base);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.scrumable !== b.scrumable) return a.scrumable ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export function buildScrumMessage(group: ScrumGroup, now = new Date()) {
  const lines = [
    `Daily Scrum (${dayKey(now)})`,
    `Project: ${group.project}`,
    `Work sessions: ${group.sessions.length}, Total time: ${formatDuration(
      group.totalDurationSec,
    )}`,
    "Details:",
  ];

  for (const session of group.sessions.slice(0, 30)) {
    const started = new Date(session.startedAt);
    const stopped = session.stoppedAt ? new Date(session.stoppedAt) : null;
    const title = group.taskTitlesByTaskId[String(session.taskId)] ?? session.taskId;
    lines.push(
      `- ${title} (${started.toLocaleString()} - ${
        stopped ? stopped.toLocaleString() : "running"
      }, ${formatDuration(sessionDuration(session, now))})`,
    );
  }

  return lines.join("\n");
}

