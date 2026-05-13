"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { useCoreData } from "@/components/data-hooks";
import { api } from "@/lib/api/client";
import type { Task } from "@/lib/api/types";
import { numberInput, textInput } from "@/lib/utils";
import { Button, EmptyState, Field, Input, Panel, Select, StatusPill } from "@/components/ui";

type CoreData = ReturnType<typeof useCoreData>;

const statuses = ["todo", "inProgress", "done"] as const;

export function TasksModule({ data }: { data: CoreData }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

  const createTask = useMutation({
    mutationFn: api.createTask,
    onSuccess: invalidate,
  });
  const updateTask = useMutation({
    mutationFn: ({ id, task }: { id: string | number; task: Partial<Task> }) =>
      api.updateTask(id, task),
    onSuccess: invalidate,
  });
  const deleteTask = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: invalidate,
  });

  function submitTask(formData: FormData) {
    const projectType = formData.get("projectType")?.toString() === "job" ? "job" : "own";
    const jobId = projectType === "job" ? numberInput(formData.get("jobId"), 0) : 0;
    const acceptedJob = data.acceptedJobs.find((job) => job.jobId === jobId);

    createTask.mutate({
      title: textInput(formData.get("title")),
      project:
        projectType === "job"
          ? acceptedJob?.title ?? `Job #${jobId}`
          : textInput(formData.get("project"), "Own"),
      priority: textInput(formData.get("priority"), "medium"),
      status: "todo",
      projectType,
      jobId: projectType === "job" && jobId > 0 ? jobId : null,
      autoScrum: projectType === "job",
      startAt: textInput(formData.get("startAt")) || null,
      dueAt: textInput(formData.get("dueAt")) || null,
      participantIds: [],
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel title="New Task">
        <form action={submitTask} className="grid gap-3">
          <Field label="Title">
            <Input name="title" required placeholder="Draft budget report" />
          </Field>
          <Field label="Project Type">
            <Select name="projectType" defaultValue="own">
              <option value="own">Own</option>
              <option value="job">Accepted Job</option>
            </Select>
          </Field>
          <Field label="Own Project">
            <Input name="project" placeholder="Operations" />
          </Field>
          <Field label="Accepted Job">
            <Select name="jobId" defaultValue="">
              <option value="">None</option>
              {data.acceptedJobs.map((job) => (
                <option key={job.jobId} value={job.jobId}>
                  {job.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Priority">
              <Select name="priority" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field label="Start">
              <Input name="startAt" type="datetime-local" />
            </Field>
          </div>
          <Field label="Due">
            <Input name="dueAt" type="datetime-local" />
          </Field>
          <Button disabled={createTask.isPending}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </form>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        {statuses.map((status) => (
          <TaskColumn
            key={status}
            title={status === "inProgress" ? "In Progress" : status}
            tasks={data.tasks.filter((task) =>
              status === "inProgress"
                ? task.status === "inProgress" || task.status === "in_progress"
                : task.status === status,
            )}
            onMove={(task, nextStatus) =>
              updateTask.mutate({ id: task.id, task: { ...task, status: nextStatus } })
            }
            onDelete={(task) => deleteTask.mutate(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
  onMove,
  onDelete,
}: {
  title: string;
  tasks: Task[];
  onMove: (task: Task, status: Task["status"]) => void;
  onDelete: (task: Task) => void;
}) {
  return (
    <Panel title={`${title} (${tasks.length})`}>
      {tasks.length ? (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <article key={task.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium leading-5">{task.title}</h3>
                  <div className="mt-1 text-sm text-slate-500">{task.project || "Own"}</div>
                </div>
                <StatusPill tone={task.projectType === "job" ? "green" : "blue"}>
                  {task.projectType}
                </StatusPill>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <Button
                    key={status}
                    variant="secondary"
                    onClick={() => onMove(task, status)}
                  >
                    {status === "inProgress" ? "Start" : status}
                  </Button>
                ))}
                <Button variant="ghost" onClick={() => onDelete(task)} aria-label="Delete task">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState>No tasks.</EmptyState>
      )}
    </Panel>
  );
}

