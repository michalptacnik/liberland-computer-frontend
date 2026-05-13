import type { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export type SessionUser = {
  id?: number;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  matrixId?: string;
  roles?: unknown[];
  accessToken?: string;
  accessTokenExpiresIn?: number;
  refreshToken?: string;
  refreshTokenExpiresIn?: number;
  [key: string]: unknown;
};

export type SessionTokens = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
  llAccessToken?: string;
  llRefreshToken?: string;
  llExpiresIn?: number;
  llRefreshTokenExpiresIn?: number;
  matrixLoginToken?: string;
  matrixAccessToken?: string;
  user?: SessionUser;
};

const cookieNames = {
  accessToken: "ll_desktop_access",
  refreshToken: "ll_desktop_refresh",
  llAccessToken: "ll_core_access",
  llRefreshToken: "ll_core_refresh",
  matrixLoginToken: "ll_matrix_login",
  matrixAccessToken: "ll_matrix_access",
  user: "ll_desktop_user",
  deviceId: "ll_desktop_device",
};

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function seconds(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function setCookie(
  response: NextResponse,
  name: string,
  value: string | undefined,
  maxAge: number,
) {
  if (!value) return;
  response.cookies.set(name, value, { ...baseCookie, maxAge });
}

export function getDeviceId(request: NextRequest) {
  return request.cookies.get(cookieNames.deviceId)?.value;
}

export function setDeviceId(response: NextResponse, deviceId: string) {
  response.cookies.set(cookieNames.deviceId, deviceId, {
    ...baseCookie,
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function readSession(request: NextRequest): SessionTokens {
  const rawUser = request.cookies.get(cookieNames.user)?.value;
  let user: SessionUser | undefined;

  if (rawUser) {
    try {
      user = JSON.parse(Buffer.from(rawUser, "base64url").toString("utf8"));
    } catch {
      user = undefined;
    }
  }

  return {
    accessToken: request.cookies.get(cookieNames.accessToken)?.value,
    refreshToken: request.cookies.get(cookieNames.refreshToken)?.value,
    llAccessToken: request.cookies.get(cookieNames.llAccessToken)?.value,
    llRefreshToken: request.cookies.get(cookieNames.llRefreshToken)?.value,
    matrixLoginToken: request.cookies.get(cookieNames.matrixLoginToken)?.value,
    matrixAccessToken: request.cookies.get(cookieNames.matrixAccessToken)?.value,
    user,
  };
}

export function publicSession(session: SessionTokens) {
  return {
    authenticated: Boolean(session.accessToken),
    user: session.user
      ? {
          id: session.user.id,
          email: session.user.email,
          fullName:
            session.user.fullName ??
            [session.user.firstName, session.user.lastName].filter(Boolean).join(" "),
          matrixId: session.user.matrixId,
          roles: session.user.roles,
        }
      : null,
    hasMatrix: Boolean(session.matrixAccessToken || session.matrixLoginToken),
  };
}

export function applySessionCookies(
  response: NextResponse,
  tokens: SessionTokens,
) {
  setCookie(
    response,
    cookieNames.accessToken,
    tokens.accessToken ?? tokens.user?.accessToken,
    seconds(tokens.accessTokenExpiresIn ?? tokens.user?.accessTokenExpiresIn, 900),
  );
  setCookie(
    response,
    cookieNames.refreshToken,
    tokens.refreshToken ?? tokens.user?.refreshToken,
    seconds(
      tokens.refreshTokenExpiresIn ?? tokens.user?.refreshTokenExpiresIn,
      60 * 60 * 24 * 180,
    ),
  );
  setCookie(
    response,
    cookieNames.llAccessToken,
    tokens.llAccessToken,
    seconds(tokens.llExpiresIn, 900),
  );
  setCookie(
    response,
    cookieNames.llRefreshToken,
    tokens.llRefreshToken,
    seconds(tokens.llRefreshTokenExpiresIn, 60 * 60 * 24 * 30),
  );
  setCookie(
    response,
    cookieNames.matrixLoginToken,
    tokens.matrixLoginToken,
    seconds(tokens.llExpiresIn, 900),
  );
  setCookie(
    response,
    cookieNames.matrixAccessToken,
    tokens.matrixAccessToken,
    60 * 60 * 24 * 14,
  );

  if (tokens.user) {
    const safeUser = { ...tokens.user };
    delete safeUser.accessToken;
    delete safeUser.refreshToken;
    delete safeUser.accessTokenExpiresIn;
    delete safeUser.refreshTokenExpiresIn;
    response.cookies.set(
      cookieNames.user,
      Buffer.from(JSON.stringify(safeUser)).toString("base64url"),
      { ...baseCookie, maxAge: 60 * 60 * 24 * 30 },
    );
  }
}

export function clearSessionCookies(response: NextResponse) {
  for (const name of Object.values(cookieNames)) {
    if (name === cookieNames.deviceId) continue;
    response.cookies.set(name, "", { ...baseCookie, maxAge: 0 });
  }
}

