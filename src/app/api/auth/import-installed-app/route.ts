import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookies, type SessionUser } from "@/lib/bff/session";

const execFileAsync = promisify(execFile);
const preferenceFile = "cz.liberland.services.plist";

type FlutterPrefs = Record<string, unknown>;

async function fileExists(filePath: string) {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function findInstalledAppPrefs() {
  const containersDir = path.join(homedir(), "Library", "Containers");
  const entries = await readdir(containersDir, { withFileTypes: true });
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const prefsPath = path.join(
          containersDir,
          entry.name,
          "Data",
          "Library",
          "Preferences",
          preferenceFile,
        );
        if (!(await fileExists(prefsPath))) return null;
        const stats = await stat(prefsPath);
        return { prefsPath, mtimeMs: stats.mtimeMs };
      }),
  );

  return candidates
    .filter((item): item is { prefsPath: string; mtimeMs: number } => Boolean(item))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.prefsPath;
}

async function readPlistJson(filePath: string): Promise<FlutterPrefs> {
  const script = `
import json
import plistlib
import sys

with open(sys.argv[1], "rb") as handle:
    data = plistlib.load(handle)

out = {}
for key, value in data.items():
    if not key.startswith("flutter."):
        continue
    if isinstance(value, (str, int, float, bool)) or value is None:
        out[key] = value
    elif isinstance(value, list):
        out[key] = [
            item for item in value
            if isinstance(item, (str, int, float, bool)) or item is None
        ]

print(json.dumps(out))
`;
  const { stdout } = await execFileAsync("python3", ["-c", script, filePath]);
  return JSON.parse(stdout) as FlutterPrefs;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseUser(value: unknown): SessionUser | undefined {
  const raw = stringValue(value);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  if (process.platform !== "darwin") {
    return NextResponse.json(
      { message: "Installed app import is only available on macOS." },
      { status: 400 },
    );
  }

  try {
    const prefsPath = await findInstalledAppPrefs();
    if (!prefsPath) {
      return NextResponse.json(
        { message: "Liberland installed app preferences were not found." },
        { status: 404 },
      );
    }

    const prefs = await readPlistJson(prefsPath);
    const accessToken = stringValue(prefs["flutter.accessToken"]);
    const refreshToken = stringValue(prefs["flutter.refreshToken"]);
    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { message: "Installed app session tokens were not found." },
        { status: 404 },
      );
    }

    const user = parseUser(prefs["flutter.userInfo"]);
    const redirect = new URL("/", request.url);
    redirect.searchParams.set("auth", "imported");
    const response = NextResponse.redirect(redirect, { status: 303 });
    applySessionCookies(response, {
      user,
      accessToken,
      refreshToken,
      accessTokenExpiresIn: numberValue(prefs["flutter.accessTokenExpiresIn"]),
      refreshTokenExpiresIn: numberValue(prefs["flutter.refreshTokenExpiresIn"]),
      llAccessToken: stringValue(prefs["flutter.llAccessToken"]),
      llRefreshToken: stringValue(prefs["flutter.llRefreshToken"]),
      llExpiresIn: numberValue(prefs["flutter.llAccessTokenExpiresIn"]),
      llRefreshTokenExpiresIn: numberValue(
        prefs["flutter.llRefreshTokenExpiresIn"],
      ),
      matrixAccessToken: stringValue(prefs["flutter.matrixAccessToken"]),
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Installed app session import failed.",
      },
      { status: 500 },
    );
  }
}
