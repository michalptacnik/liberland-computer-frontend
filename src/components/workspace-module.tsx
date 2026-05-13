"use client";

import { FilePlus, RefreshCw, RotateCcw, SquareCheckBig } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { useCoreData } from "@/components/data-hooks";
import { api } from "@/lib/api/client";
import type { Bid } from "@/lib/api/types";
import { textInput } from "@/lib/utils";
import { Button, EmptyState, Field, Panel, StatusPill, Textarea } from "@/components/ui";

type CoreData = ReturnType<typeof useCoreData>;

export function WorkspaceModule({ data }: { data: CoreData }) {
  const [selectedBid, setSelectedBid] = useState<Bid | null>(
    data.bids.find((bid) => bid.accepted && bid.workspace) ?? null,
  );
  const workspace = selectedBid?.workspace;
  const queryClient = useQueryClient();
  const logs = useQuery({
    queryKey: ["workspace-logs", workspace?.id],
    queryFn: () => api.workspaceLogs(workspace?.id ?? 0),
    enabled: Boolean(workspace?.id),
  });

  const workspaceMutation = useMutation({
    mutationFn: ({
      action,
      msg,
    }: {
      action: "request-work-report" | "mark-work-complete" | "reopen";
      msg?: string;
    }) => api.workspaceAction(workspace?.id ?? 0, action, msg),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace-logs"] }),
  });
  const reportMutation = useMutation({
    mutationFn: (desc: string) => api.createWorkReport(workspace?.id ?? 0, desc),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace-logs"] }),
  });
  const syncMutation = useMutation({
    mutationFn: (enabled: boolean) => api.syncWorkspaceEvents(workspace?.id ?? 0, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-bids"] }),
  });

  function submitReport(formData: FormData) {
    reportMutation.mutate(textInput(formData.get("desc")));
  }

  const accepted = data.bids.filter((bid) => bid.accepted && bid.workspace);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel title={`Accepted Workspaces (${accepted.length})`}>
        {accepted.length ? (
          <div className="grid gap-2">
            {accepted.map((bid) => (
              <button
                key={bid.id}
                onClick={() => setSelectedBid(bid)}
                className="rounded-md border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50"
              >
                <div className="font-medium">{bid.job?.title ?? `Job #${bid.jobId}`}</div>
                <div className="mt-1 text-sm text-slate-500">
                  Workspace #{bid.workspace?.id} · {bid.workspace?.numWorkReports ?? 0} reports
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState>No accepted workspace returned.</EmptyState>
        )}
      </Panel>

      <div className="grid gap-4">
        <Panel
          title="Workspace"
          action={
            workspace ? (
              <StatusPill tone={workspace.active === false ? "red" : "green"}>
                {workspace.active === false ? "Closed" : "Active"}
              </StatusPill>
            ) : null
          }
        >
          {workspace ? (
            <div className="grid gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedBid?.job?.title ?? `Workspace #${workspace.id}`}
                </h3>
                <div className="mt-1 text-sm text-slate-500">
                  {workspace.workStatus ?? "workspace"} · sync {workspace.syncEventsOnChat ? "on" : "off"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => workspaceMutation.mutate({ action: "request-work-report" })}
                >
                  <FilePlus className="h-4 w-4" />
                  Request Report
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => workspaceMutation.mutate({ action: "mark-work-complete" })}
                >
                  <SquareCheckBig className="h-4 w-4" />
                  Complete
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => workspaceMutation.mutate({ action: "reopen" })}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reopen
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => syncMutation.mutate(!workspace.syncEventsOnChat)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Toggle Sync
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState>Select an accepted workspace.</EmptyState>
          )}
        </Panel>

        {workspace ? (
          <Panel title="Create Work Report">
            <form action={submitReport} className="grid gap-3">
              <Field label="Report">
                <Textarea name="desc" required />
              </Field>
              <Button disabled={reportMutation.isPending}>
                <FilePlus className="h-4 w-4" />
                Save
              </Button>
            </form>
          </Panel>
        ) : null}

        <Panel title="Logs">
          {logs.data?.data?.length ? (
            <div className="grid gap-2">
              {logs.data.data.map((log) => (
                <div key={log.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div className="font-medium">{log.msg ?? `Event ${log.eventId}`}</div>
                    <div className="text-sm text-slate-500">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                    </div>
                  </div>
                  {log.workReport?.desc ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {log.workReport.desc}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>{logs.isLoading ? "Loading logs." : "No logs returned."}</EmptyState>
          )}
        </Panel>
      </div>
    </div>
  );
}

