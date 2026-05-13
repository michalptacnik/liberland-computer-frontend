import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/bff/env";
import { getDeviceId, setDeviceId } from "@/lib/bff/session";

async function createInstallation(deviceId: string) {
  const { apiBaseUrl, appVersion } = serverEnv();
  const response = await fetch(`${apiBaseUrl}/installations/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      deviceType: "web",
      appVersion,
      deviceName: "Liberland Computer Frontend",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
      localeId: "en",
      manufacturer: "web",
      model: "browser",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Installation upsert failed with ${response.status}`);
  }

  return (await response.json()) as { id?: number };
}

export async function GET(request: NextRequest) {
  const env = serverEnv();
  if (!env.clientApiKey) {
    return NextResponse.json(
      { message: "CLIENT_API_KEY is required for SSO start." },
      { status: 500 },
    );
  }

  const existingDeviceId = getDeviceId(request);
  const deviceId = existingDeviceId ?? crypto.randomUUID();

  try {
    const installation = await createInstallation(deviceId);
    if (!installation.id) {
      throw new Error("Installation response did not include an id.");
    }

    const state = {
      installationId: installation.id,
      nonce: crypto.randomUUID(),
      deviceId,
      deviceType: "web",
      appVersion: env.appVersion,
      redirect: env.authCallbackUrl,
    };

    const authUrl = new URL(`${env.apiBaseUrl}/auth`);
    authUrl.searchParams.set("state", JSON.stringify(state));
    authUrl.searchParams.set("x-api-key", env.clientApiKey);
    if (request.nextUrl.searchParams.get("register") === "true") {
      authUrl.searchParams.set("register", "true");
    }

    const response = NextResponse.redirect(authUrl);
    setDeviceId(response, deviceId);
    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Auth start failed." },
      { status: 500 },
    );
  }
}

