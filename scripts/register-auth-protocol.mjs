import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const appName = "Liberland Auth Bridge";
const bundleId = "org.liberland.ComputerAuthBridge";
const repoDir = process.cwd().replaceAll("\\", "\\\\").replaceAll('"', '\\"');
const appPath = join(homedir(), "Applications", `${appName}.app`);
const scriptPath = join(tmpdir(), "liberland-auth-bridge.applescript");
const plistPath = join(appPath, "Contents", "Info.plist");
const plistBuddy = "/usr/libexec/PlistBuddy";
const lsRegister =
  "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
const callbackSchemes = ["cz.liberland.services.dev", "cz.liberland.services"];

const appleScript = `
property localCallbackPrefix : "http://localhost:3000/api/auth/callback"
property devPrefix : "cz.liberland.services.dev://auth_callback"
property prodPrefix : "cz.liberland.services://auth_callback"
property repoDir : "${repoDir}"

on open location incomingUrl
  if incomingUrl starts with devPrefix then
    set callbackUrl to localCallbackPrefix & suffixAfter(incomingUrl, devPrefix)
    logForward()
    ensureLocalServer()
    open location callbackUrl
  else if incomingUrl starts with prodPrefix then
    set callbackUrl to localCallbackPrefix & suffixAfter(incomingUrl, prodPrefix)
    logForward()
    ensureLocalServer()
    open location callbackUrl
  else
    display dialog "Unsupported Liberland callback URL." buttons {"OK"} default button "OK"
  end if
end open location

on suffixAfter(incomingUrl, prefixText)
  if (length of incomingUrl) is greater than (length of prefixText) then
    return text ((length of prefixText) + 1) thru -1 of incomingUrl
  end if
  return ""
end suffixAfter

on logForward()
  do shell script "mkdir -p ~/Library/Logs; date -u '+%FT%TZ forwarded callback' >> ~/Library/Logs/LiberlandAuthBridge.log"
end logForward

on ensureLocalServer()
  try
    do shell script "curl -fsS http://localhost:3000/api/session >/dev/null"
    return
  end try

  do shell script "cd " & quoted form of repoDir & " && nohup npm run dev >> ~/Library/Logs/LiberlandAuthBridge-next.log 2>&1 &"
  repeat 40 times
    delay 0.5
    try
      do shell script "curl -fsS http://localhost:3000/api/session >/dev/null"
      return
    end try
  end repeat
end ensureLocalServer
`;

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

function setOrAddString(key, value) {
  try {
    run(plistBuddy, ["-c", `Set :${key} ${value}`, plistPath]);
  } catch {
    run(plistBuddy, ["-c", `Add :${key} string ${value}`, plistPath]);
  }
}

function setDefaultUrlHandlers() {
  const swift = `
import CoreServices
import Foundation

let bundleId = CommandLine.arguments[1] as NSString
for scheme in CommandLine.arguments.dropFirst(2) {
  LSSetDefaultHandlerForURLScheme(scheme as NSString, bundleId)
}
`;

  execFileSync("swift", ["-", bundleId, ...callbackSchemes], {
    input: swift,
    stdio: ["pipe", "inherit", "inherit"],
  });

  const python = `
import os
import plistlib
import sys

bundle_id = sys.argv[1]
schemes = sys.argv[2:]
path = os.path.expanduser("~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist")
os.makedirs(os.path.dirname(path), exist_ok=True)

try:
    with open(path, "rb") as handle:
        data = plistlib.load(handle)
except FileNotFoundError:
    data = {}

handlers = data.get("LSHandlers", [])
handlers = [
    item for item in handlers
    if item.get("LSHandlerURLScheme") not in schemes
]
for scheme in schemes:
    handlers.append({
        "LSHandlerURLScheme": scheme,
        "LSHandlerRoleAll": bundle_id,
    })

data["LSHandlers"] = handlers
with open(path, "wb") as handle:
    plistlib.dump(data, handle)
`;

  execFileSync("python3", ["-c", python, bundleId, ...callbackSchemes], {
    stdio: "inherit",
  });
}

mkdirSync(join(homedir(), "Applications"), { recursive: true });
rmSync(appPath, { recursive: true, force: true });
writeFileSync(scriptPath, appleScript);

run("osacompile", ["-o", appPath, scriptPath]);

setOrAddString("CFBundleIdentifier", bundleId);
setOrAddString("LSUIElement", "1");

try {
  run(plistBuddy, ["-c", "Delete :CFBundleURLTypes", plistPath]);
} catch {
  // Freshly compiled apps do not have URL type declarations yet.
}

run(plistBuddy, ["-c", "Add :CFBundleURLTypes array", plistPath]);
run(plistBuddy, [
  "-c",
  "Add :CFBundleURLTypes:0 dict",
  plistPath,
]);
run(plistBuddy, [
  "-c",
  "Add :CFBundleURLTypes:0:CFBundleURLName string Liberland Services Callback",
  plistPath,
]);
run(plistBuddy, [
  "-c",
  "Add :CFBundleURLTypes:0:CFBundleURLSchemes array",
  plistPath,
]);
callbackSchemes.forEach((scheme, index) => {
  run(plistBuddy, [
    "-c",
    `Add :CFBundleURLTypes:0:CFBundleURLSchemes:${index} string ${scheme}`,
    plistPath,
  ]);
});

run(lsRegister, ["-f", appPath]);
setDefaultUrlHandlers();
try {
  run("killall", ["cfprefsd"]);
} catch {
  // cfprefsd is not always running for this user session.
}
run(lsRegister, ["-f", appPath]);

console.log(`Registered ${appName} at ${appPath}`);
console.log(
  "It converts cz.liberland.services(.dev)://auth_callback?... to http://localhost:3000/api/auth/callback?...",
);
