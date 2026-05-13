import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/bff/env";
import { applySessionCookies, readSession } from "@/lib/bff/session";

const sendSchema = z.object({
  roomId: z.string().min(1),
  body: z.string().min(1),
  projectTitle: z.string().optional(),
  jobId: z.number().optional(),
});

async function ensureMatrixAccessToken(request: NextRequest) {
  const session = readSession(request);
  if (session.matrixAccessToken) return { token: session.matrixAccessToken };
  if (!session.matrixLoginToken) return { token: null };

  const { matrixBaseUrl } = serverEnv();
  const response = await fetch(`${matrixBaseUrl}/_matrix/client/v3/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "org.matrix.login.jwt",
      token: session.matrixLoginToken,
      device_id: "liberland-desktop-web",
    }),
    cache: "no-store",
  });

  if (!response.ok) return { token: null };
  const payload = (await response.json()) as { access_token?: string };
  return { token: payload.access_token ?? null, update: payload.access_token };
}

export async function POST(request: NextRequest) {
  const parsed = sendSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues.map((issue) => issue.message).join(", ") },
      { status: 400 },
    );
  }

  const { token, update } = await ensureMatrixAccessToken(request);
  if (!token) {
    return NextResponse.json(
      { message: "Matrix login is not available for this session." },
      { status: 401 },
    );
  }

  const { matrixBaseUrl } = serverEnv();
  const txid = `scrum_${Date.now()}_${parsed.data.jobId ?? "job"}`;
  const url = `${matrixBaseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(
    parsed.data.roomId,
  )}/send/m.room.message/${encodeURIComponent(txid)}`;

  const upstream = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ msgtype: "m.text", body: parsed.data.body }),
    cache: "no-store",
  });

  const response = NextResponse.json(
    upstream.ok
      ? { ok: true }
      : { message: `Matrix send failed with ${upstream.status}` },
    { status: upstream.ok ? 200 : upstream.status },
  );

  if (update) applySessionCookies(response, { matrixAccessToken: update });
  return response;
}

