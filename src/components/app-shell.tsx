"use client";

import {
  BriefcaseBusiness,
  Building2,
  CheckSquare,
  Clock3,
  Gauge,
  Landmark,
  LayoutGrid,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { Dashboard } from "@/components/dashboard";
import { TasksModule } from "@/components/tasks-module";
import { WorktimeModule } from "@/components/worktime-module";
import { JobsModule } from "@/components/jobs-module";
import { WorkspaceModule } from "@/components/workspace-module";
import { AccountingModule } from "@/components/accounting-module";
import { PropertyModule } from "@/components/property-module";
import { useCoreData } from "@/components/data-hooks";
import { cn } from "@/lib/utils";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "worktime", label: "Worktime", icon: Clock3 },
  { id: "jobs", label: "Jobs", icon: BriefcaseBusiness },
  { id: "workspace", label: "Workspace", icon: LayoutGrid },
  { id: "accounting", label: "Accounting", icon: Landmark },
  { id: "property", label: "Property", icon: Building2 },
] as const;

export type ModuleId = (typeof nav)[number]["id"];

export function AppShell() {
  return (
    <AuthGate>
      <WorkspaceShell />
    </AuthGate>
  );
}

function WorkspaceShell() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const data = useCoreData();

  const title = useMemo(
    () => nav.find((item) => item.id === active)?.label ?? "Dashboard",
    [active],
  );

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-950">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white lg:block">
          <div className="flex h-16 items-center border-b border-slate-200 px-5">
            <div>
              <div className="text-base font-semibold">Liberland</div>
              <div className="text-xs text-slate-500">Computer Frontend</div>
            </div>
          </div>
          <nav className="grid gap-1 p-3">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                    active === item.id && "bg-emerald-50 text-emerald-900",
                  )}
                  onClick={() => setActive(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:px-6">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                {data.isLoading ? (
                  <span className="text-sm text-slate-500">Syncing</span>
                ) : null}
              </div>
              <div className="flex gap-1 overflow-x-auto lg:hidden">
                {nav.map((item) => (
                  <button
                    key={item.id}
                    className={cn(
                      "h-9 shrink-0 rounded-md px-3 text-sm font-medium text-slate-600",
                      active === item.id && "bg-emerald-700 text-white",
                    )}
                    onClick={() => setActive(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6">
            {data.error ? (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {data.error instanceof Error
                  ? data.error.message
                  : "Some Liberland data could not be loaded."}
              </div>
            ) : null}
            {active === "dashboard" && <Dashboard data={data} setActive={setActive} />}
            {active === "tasks" && <TasksModule data={data} />}
            {active === "worktime" && <WorktimeModule data={data} />}
            {active === "jobs" && <JobsModule data={data} />}
            {active === "workspace" && <WorkspaceModule data={data} />}
            {active === "accounting" && <AccountingModule data={data} />}
            {active === "property" && <PropertyModule data={data} />}
          </main>
        </div>
    </div>
  );
}
