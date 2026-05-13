"use client";

import { LogIn, LogOut, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button, Panel } from "@/components/ui";
import { useSession } from "@/components/data-hooks";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const queryClient = useQueryClient();

  if (session.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-700" />
      </main>
    );
  }

  if (!session.data?.authenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 px-6">
        <Panel title="Liberland Computer Frontend" className="w-full max-w-xl">
          <div className="grid gap-5">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">
                Sign in to your workspace
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use your Liberland account to continue.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/api/auth/start">
                <Button>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Button>
              </a>
              <a href="/api/auth/start?register=true">
                <Button variant="secondary">Create account</Button>
              </a>
            </div>
            {session.error ? (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {session.error instanceof Error
                  ? session.error.message
                  : "Session check failed"}
              </p>
            ) : null}
          </div>
        </Panel>
      </main>
    );
  }

  return (
    <>
      <div className="absolute right-4 top-3 z-10 hidden items-center gap-3 text-sm text-slate-600 lg:flex">
        <span>{session.data.user?.fullName || session.data.user?.email}</span>
        <Button
          variant="ghost"
          onClick={async () => {
            await api.logout();
            queryClient.clear();
            await session.refetch();
          }}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
      {children}
    </>
  );
}
