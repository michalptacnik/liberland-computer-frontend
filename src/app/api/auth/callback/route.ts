import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookies, type SessionUser } from "@/lib/bff/session";

function parseUser(value: string | null): SessionUser | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as SessionUser;
  } catch {
    return undefined;
  }
}

function numberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function callbackResponse(url: URL, requestUrl: string) {
  const error = url.searchParams.get("error");
  const message = url.searchParams.get("message");

  if (error === "true") {
    const redirect = new URL("/", requestUrl);
    redirect.searchParams.set("auth", "error");
    if (message) redirect.searchParams.set("message", message);
    return NextResponse.redirect(redirect);
  }

  const user = parseUser(url.searchParams.get("user"));
  const redirect = new URL("/", requestUrl);
  redirect.searchParams.set("auth", user ? "ok" : "missing-user");

  const response = NextResponse.redirect(redirect);
  applySessionCookies(response, {
    user,
    accessToken: user?.accessToken,
    refreshToken: user?.refreshToken,
    accessTokenExpiresIn: user?.accessTokenExpiresIn,
    refreshTokenExpiresIn: user?.refreshTokenExpiresIn,
    llAccessToken: url.searchParams.get("llAccessToken") ?? undefined,
    llRefreshToken:
      url.searchParams.get("llRefreshToken") ?? undefined,
    llExpiresIn: numberParam(url, "llExpiresIn"),
    llRefreshTokenExpiresIn: numberParam(url, "llRefreshTokenExpiresIn"),
    matrixLoginToken:
      url.searchParams.get("matrixLoginToken") ?? undefined,
  });
  return response;
}

export async function GET(request: NextRequest) {
  return callbackResponse(request.nextUrl, request.url);
}

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const url = new URL(request.url);
  for (const [key, value] of body.entries()) {
    url.searchParams.set(key, String(value));
  }
  return callbackResponse(url, request.url);
}
