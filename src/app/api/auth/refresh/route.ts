import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookies, clearSessionCookies, readSession } from "@/lib/bff/session";
import { refreshSession } from "@/lib/bff/upstream";

export async function POST(request: NextRequest) {
  const session = readSession(request);
  const refreshed = await refreshSession(session);

  if (!refreshed?.accessToken) {
    const response = NextResponse.json(
      { message: "Refresh failed" },
      { status: 401 },
    );
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  applySessionCookies(response, refreshed);
  return response;
}

