import { NextResponse, type NextRequest } from "next/server";

const allowedHosts = new Set([
  "dev.api.app.liberland.org",
  "liberland-services-dev.uc.r.appspot.com",
  "api.app.liberland.org",
  "liberland-services.uc.r.appspot.com",
]);

function callbackUrlFromMobileScheme(value: string, requestUrl: string) {
  const prefixes = [
    "cz.liberland.services.dev://auth_callback",
    "cz.liberland.services://auth_callback",
  ];
  const prefix = prefixes.find((item) => value.startsWith(item));
  if (!prefix) return null;
  const callback = new URL("/api/auth/callback", requestUrl);
  callback.search = value.slice(prefix.length);
  return callback;
}

function mobileCallbackFromHtml(html: string) {
  const match = html.match(/cz\.liberland\.services(?:\.dev)?:\/\/auth_callback[^"'\\s<]+/);
  return match?.[0].replaceAll("&amp;", "&") ?? null;
}

async function resolveBackendCallback(url: URL, requestUrl: string) {
  if (!allowedHosts.has(url.hostname) || !url.pathname.endsWith("/auth/callback")) {
    throw new Error("Unsupported callback URL.");
  }

  const response = await fetch(url, { cache: "no-store" });
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`Backend callback returned ${response.status}.`);
  }

  const mobileCallback = mobileCallbackFromHtml(html);
  if (!mobileCallback) {
    throw new Error("Backend callback did not return a mobile callback link.");
  }

  const localCallback = callbackUrlFromMobileScheme(mobileCallback, requestUrl);
  if (!localCallback) {
    throw new Error("Unsupported mobile callback scheme.");
  }

  return localCallback;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ message: "Missing callback URL." }, { status: 400 });
  }

  try {
    const localCallback = await resolveBackendCallback(new URL(rawUrl), request.url);
    return NextResponse.redirect(localCallback);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Auth rescue failed." },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const rawUrl = String(formData.get("url") ?? "");
  const url = new URL(request.url);
  url.searchParams.set("url", rawUrl);
  return NextResponse.redirect(url, { status: 303 });
}
