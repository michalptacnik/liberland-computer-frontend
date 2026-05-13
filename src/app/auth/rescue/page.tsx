import { Button, Field, Panel, Textarea } from "@/components/ui";

export default function AuthRescuePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-6">
      <Panel title="Auth Rescue" className="w-full max-w-2xl">
        <form action="/api/auth/rescue" method="post" className="grid gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Finish Liberland Sign In
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Paste either the current backend callback URL or the “tap here”
              mobile callback URL from the redirect page.
            </p>
          </div>
          <Field label="Callback URL">
            <Textarea name="url" required className="min-h-36 font-mono text-xs" />
          </Field>
          <Button type="submit">Finish Sign In</Button>
        </form>
      </Panel>
    </main>
  );
}
