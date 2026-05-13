"use client";

import { ArrowRight, Clock3 } from "lucide-react";
import type { ModuleId } from "@/components/app-shell";
import type { useCoreData } from "@/components/data-hooks";
import { Button, EmptyState, Panel, StatusPill } from "@/components/ui";
import { formatDuration, groupTodaySessions, sessionDuration } from "@/lib/scrum";

type CoreData = ReturnType<typeof useCoreData>;

export function Dashboard({
  data,
  setActive,
}: {
  data: CoreData;
  setActive: (value: ModuleId) => void;
}) {
  const running = data.sessions.find((session) => session.running || !session.stoppedAt);
  const todayGroups = groupTodaySessions(
    data.tasks,
    data.sessions,
    data.acceptedJobs,
  );
  const todayTotal = todayGroups.reduce((sum, group) => sum + group.totalDurationSec, 0);
  const acceptedWorkspaces = data.bids.filter((bid) => bid.accepted && bid.workspace);
  const balanceEntries = Object.entries(data.balances).filter(([, value]) => value !== 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Panel
        title="Today"
        action={
          <Button variant="ghost" onClick={() => setActive("worktime")}>
            Worktime <ArrowRight className="h-4 w-4" />
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Open Tasks" value={data.tasks.filter((task) => task.status !== "done").length} />
          <Metric label="Today Work" value={formatDuration(todayTotal)} />
          <Metric label="Accepted Jobs" value={data.acceptedJobs.length} />
        </div>
        <div className="mt-4 rounded-md bg-slate-50 p-4">
          {running ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Clock3 className="h-4 w-4 text-emerald-700" />
                  Running session
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Task #{running.taskId} for {formatDuration(sessionDuration(running))}
                </div>
              </div>
              <StatusPill tone="green">Live</StatusPill>
            </div>
          ) : (
            <div className="text-sm text-slate-600">No active timer.</div>
          )}
        </div>
      </Panel>

      <Panel
        title="Balances"
        action={
          <Button variant="ghost" onClick={() => setActive("accounting")}>
            Accounting <ArrowRight className="h-4 w-4" />
          </Button>
        }
      >
        {balanceEntries.length ? (
          <div className="grid grid-cols-2 gap-2">
            {balanceEntries.slice(0, 8).map(([currency, amount]) => (
              <div key={currency} className="rounded-md bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{currency}</div>
                <div className="text-lg font-semibold text-slate-950">
                  {Number(amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>No balances returned.</EmptyState>
        )}
      </Panel>

      <Panel
        title="Workspace"
        action={
          <Button variant="ghost" onClick={() => setActive("workspace")}>
            Open <ArrowRight className="h-4 w-4" />
          </Button>
        }
      >
        {acceptedWorkspaces.length ? (
          <div className="divide-y divide-slate-200">
            {acceptedWorkspaces.slice(0, 6).map((bid) => (
              <div key={bid.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{bid.job?.title ?? `Job #${bid.jobId}`}</div>
                  <div className="text-sm text-slate-500">
                    {bid.workspace?.workStatus ?? "workspace"} · {bid.workspace?.numWorkReports ?? 0} reports
                  </div>
                </div>
                <StatusPill tone={bid.workspace?.active === false ? "red" : "green"}>
                  {bid.workspace?.active === false ? "Closed" : "Active"}
                </StatusPill>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>No accepted job workspace yet.</EmptyState>
        )}
      </Panel>

      <Panel
        title="Property"
        action={
          <Button variant="ghost" onClick={() => setActive("property")}>
            Property <ArrowRight className="h-4 w-4" />
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Assets" value={data.properties.length} />
          <Metric
            label="For Sale"
            value={data.properties.filter((asset) => asset.status === "for_sale").length}
          />
          <Metric
            label="For Rent"
            value={data.properties.filter((asset) => asset.status === "for_rent").length}
          />
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

