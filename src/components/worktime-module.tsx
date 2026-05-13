"use client";

import { Pause, Play, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { useCoreData } from "@/components/data-hooks";
import { useSession } from "@/components/data-hooks";
import { api } from "@/lib/api/client";
import type { ScrumGroup } from "@/lib/scrum";
import { buildScrumMessage, formatDuration, groupTodaySessions, sessionDuration } from "@/lib/scrum";
import { Button, EmptyState, Field, Panel, StatusPill, Textarea } from "@/components/ui";

type CoreData = ReturnType<typeof useCoreData>;

export function WorktimeModule({ data }: { data: CoreData }) {
  const queryClient = useQueryClient();
  const session = useSession();
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("ll-worktime-notes") ?? "{}");
    } catch {
      return {};
    }
  });
  const [sendError, setSendError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const activeSession = data.sessions.find((item) => item.running || !item.stoppedAt);
  const selectedTask =
    data.tasks.find((task) => String(task.id) === selectedTaskId) ??
    data.tasks.find((task) => String(task.id) === String(activeSession?.taskId));
  const groups = useMemo(
    () => groupTodaySessions(data.tasks, data.sessions, data.acceptedJobs),
    [data.acceptedJobs, data.sessions, data.tasks],
  );

  useEffect(() => {
    if (!activeSession) return;
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, [activeSession]);

  useEffect(() => {
    const now = new Date();
    if (now.getHours() < 19 || !session.data?.hasMatrix) return;
    for (const group of groups.filter((item) => item.scrumable)) {
      const marker = `scrum:${session.data.user?.id ?? "me"}:${group.jobId}:${now
        .toISOString()
        .slice(0, 10)}`;
      if (localStorage.getItem(marker)) continue;
      sendScrum(group).then((ok) => {
        if (ok) localStorage.setItem(marker, "sent");
      });
    }
  }, [groups, session.data?.hasMatrix, session.data?.user?.id]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["work-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const startWork = useMutation({
    mutationFn: async () => {
      if (!selectedTask) throw new Error("Select a task first.");
      const now = new Date().toISOString();
      await api.createWorkSession({
        taskId: Number(selectedTask.id),
        startedAt: now,
        stoppedAt: null,
        durationSec: 0,
        running: true,
      });
      if (selectedTask.status === "todo") {
        await api.updateTask(selectedTask.id, {
          ...selectedTask,
          status: "in_progress",
        });
      }
    },
    onSuccess: invalidate,
  });

  const stopWork = useMutation({
    mutationFn: async () => {
      if (!activeSession) throw new Error("No active session.");
      const stoppedAt = new Date();
      await api.updateWorkSession(activeSession.id, {
        ...activeSession,
        stoppedAt: stoppedAt.toISOString(),
        durationSec: sessionDuration(activeSession, stoppedAt),
        running: false,
      });
    },
    onSuccess: invalidate,
  });

  async function sendScrum(group: ScrumGroup) {
    setSendError(null);
    if (!group.jobChatRoomId) return false;
    try {
      await api.sendMatrixMessage({
        roomId: group.jobChatRoomId,
        body: buildScrumMessage(group),
        projectTitle: group.project,
        jobId: group.jobId,
      });
      return true;
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Scrum send failed");
      return false;
    }
  }

  function updateNote(id: string | number, value: string) {
    const next = { ...notes, [String(id)]: value };
    setNotes(next);
    localStorage.setItem("ll-worktime-notes", JSON.stringify(next));
  }

  const queue = data.tasks.filter((task) => task.status !== "done");

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel title={`Queue (${queue.length})`}>
        {queue.length ? (
          <div className="grid gap-2">
            {queue.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(String(task.id))}
                className={`rounded-md border p-3 text-left transition ${
                  String(task.id) === String(selectedTask?.id)
                    ? "border-emerald-700 bg-emerald-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="font-medium">{task.title}</div>
                <div className="mt-1 text-sm text-slate-500">{task.project}</div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState>No queued work.</EmptyState>
        )}
      </Panel>

      <div className="grid gap-4">
        <Panel title="Active Session">
          {selectedTask || activeSession ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">
                  {selectedTask?.title ?? `Task #${activeSession?.taskId}`}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedTask?.project ?? "Selected work"}
                </div>
                <div className="mt-3 text-4xl font-semibold tabular-nums text-slate-950">
                  {formatDuration(activeSession ? sessionDuration(activeSession, now) : 0)}
                </div>
              </div>
              {activeSession ? (
                <Button
                  variant="danger"
                  onClick={() => stopWork.mutate()}
                  disabled={stopWork.isPending}
                >
                  <Pause className="h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={() => startWork.mutate()}
                  disabled={!selectedTask || startWork.isPending}
                >
                  <Play className="h-4 w-4" />
                  Start
                </Button>
              )}
            </div>
          ) : (
            <EmptyState>Select a task.</EmptyState>
          )}
        </Panel>

        <Panel title="Today Log">
          {data.sessions.length ? (
            <div className="grid gap-3">
              {data.sessions.slice(0, 12).map((item) => (
                <div key={item.id || `${item.taskId}-${item.startedAt}`} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">Task #{item.taskId}</div>
                    <StatusPill tone={item.running ? "green" : "slate"}>
                      {item.running ? "Running" : formatDuration(item.durationSec)}
                    </StatusPill>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {new Date(item.startedAt).toLocaleString()} -{" "}
                    {item.stoppedAt ? new Date(item.stoppedAt).toLocaleString() : "running"}
                  </div>
                  <Field label="Note" className="mt-3">
                    <Textarea
                      value={notes[String(item.id)] ?? ""}
                      onChange={(event) => updateNote(item.id, event.target.value)}
                    />
                  </Field>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No sessions returned.</EmptyState>
          )}
        </Panel>

        <Panel title="Daily Scrum">
          {sendError ? (
            <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {sendError}
            </div>
          ) : null}
          {groups.length ? (
            <div className="grid gap-3">
              {groups.map((group) => (
                <div key={group.key} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{group.title}</div>
                      <div className="text-sm text-slate-500">
                        {group.sessions.length} sessions · {formatDuration(group.totalDurationSec)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <StatusPill tone={group.scrumable ? "green" : "blue"}>
                        {group.scrumable ? "Scrumable" : "Local"}
                      </StatusPill>
                      <Button
                        variant="secondary"
                        disabled={!group.scrumable}
                        onClick={() => sendScrum(group)}
                      >
                        <Send className="h-4 w-4" />
                        Send
                      </Button>
                    </div>
                  </div>
                  <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                    {buildScrumMessage(group)}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No work results for today.</EmptyState>
          )}
        </Panel>
      </div>
    </div>
  );
}
