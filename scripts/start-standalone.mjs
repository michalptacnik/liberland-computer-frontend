import { cpSync, mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const standaloneDir = path.join(".next", "standalone");
const staticTarget = path.join(standaloneDir, ".next", "static");
const publicTarget = path.join(standaloneDir, "public");

mkdirSync(path.dirname(staticTarget), { recursive: true });
rmSync(staticTarget, { recursive: true, force: true });
rmSync(publicTarget, { recursive: true, force: true });
cpSync(path.join(".next", "static"), staticTarget, { recursive: true });
cpSync("public", publicTarget, { recursive: true });

const server = spawn("node", ["server.js"], {
  cwd: standaloneDir,
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
    PORT: process.env.PORT ?? "3000",
  },
});

server.on("exit", (code) => process.exit(code ?? 0));
