import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "./env";
import {
  applySessionCookies,
  readSession,
  type SessionTokens,
} from "./session";

const allowedPaths = [
  /^tasks(?:\/\d+)?$/,
  /^work-sessions(?:\/\d+)?$/,
  /^jobs(?:\/.*)?$/,
  /^bids\/all$/,
  /^workspace\/\d+(?:\/.*)?$/,
  /^work-reports(?:\/.*)?$/,
  /^accounting(?:\/.*)?$/,
  /^property(?:\/.*)?$/,
  /^job-category(?:\/.*)?$/,
  /^hashtags(?:\/.*)?$/,
  /^vehicles(?:\/.*)?$/,
  /^wallets(?:\/.*)?$/,
  /^users\/search\/[^/]+$/,
  /^users\/profile\/\d+$/,
  /^assets\/upload-info$/,
  /^chats\/notification$/,
];

export class UpstreamError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function assertAllowedPath(path: string) {
  if (!allowedPaths.some((pattern) => pattern.test(path))) {
    throw new UpstreamError(`BFF route is not allowlisted: ${path}`, 404);
  }
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function refreshSession(
  session: SessionTokens,
): Promise<SessionTokens | null> {
  if (!session.refreshToken) return null;
  const { apiBaseUrl } = serverEnv();
  const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.refreshToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ llRefreshToken: session.llRefreshToken ?? "" }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  return parseJsonSafely<SessionTokens>(response);
}

async function upstreamRequest(
  pathWithSearch: string,
  request: NextRequest,
  session: SessionTokens,
  body?: ArrayBuffer,
) {
  const { apiBaseUrl, clientApiKey } = serverEnv();
  const contentType = request.headers.get("content-type");
  const headers = new Headers();

  if (pathWithSearch.startsWith("assets/upload-info") && clientApiKey) {
    headers.set("x-api-key", clientApiKey);
  } else if (session.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  if (contentType) headers.set("Content-Type", contentType);

  return fetch(`${apiBaseUrl}/${pathWithSearch}`, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD" ? undefined : body,
    cache: "no-store",
  });
}

export async function proxyLiberlandRequest(
  request: NextRequest,
  pathSegments: string[],
) {
  const url = new URL(request.url);
  const path = pathSegments.join("/");
  assertAllowedPath(path);

  const pathWithSearch = `${path}${url.search}`;
  const session = readSession(request);
  if (!session.accessToken && !path.startsWith("assets/upload-info")) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  let upstream = await upstreamRequest(pathWithSearch, request, session, body);
  let refreshed: SessionTokens | null = null;

  if (upstream.status === 401) {
    refreshed = await refreshSession(session);
    if (refreshed?.accessToken) {
      upstream = await upstreamRequest(
        pathWithSearch,
        request,
        { ...session, ...refreshed },
        body,
      );
    }
  }

  const headers = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) headers.set("Content-Type", upstreamType);

  const payload = await upstream.arrayBuffer();
  const response = new NextResponse(payload, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });

  if (refreshed) applySessionCookies(response, refreshed);
  return response;
}

