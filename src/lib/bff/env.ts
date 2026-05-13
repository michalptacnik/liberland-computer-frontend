const DEFAULT_API_BASE_URL = "https://dev.api.app.liberland.org/v1";
const DEFAULT_CORE_BASE_URL = "https://staging.api.liberland.org";
const DEFAULT_MATRIX_BASE_URL = "https://staging.matrix.liberland.org";
const DEFAULT_APP_BASE_URL = "http://localhost:3000";

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function serverEnv() {
  const appBaseUrl = trimSlash(process.env.APP_BASE_URL ?? DEFAULT_APP_BASE_URL);

  return {
    apiBaseUrl: trimSlash(
      process.env.LIBERLAND_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    ),
    coreBaseUrl: trimSlash(
      process.env.LIBERLAND_CORE_BASE_URL ?? DEFAULT_CORE_BASE_URL,
    ),
    matrixBaseUrl: trimSlash(process.env.MATRIX_BASE_URL ?? DEFAULT_MATRIX_BASE_URL),
    clientApiKey: process.env.CLIENT_API_KEY ?? process.env.BACKEND_API_KEY ?? "",
    appBaseUrl,
    authCallbackUrl:
      process.env.AUTH_CALLBACK_URL ?? `${appBaseUrl}/api/auth/callback`,
    appVersion: process.env.APP_VERSION ?? "0.1.0",
  };
}
