import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with ${code}`));
    });
  });
}

await run("npm", ["run", "auth:register-protocol"]);

const next = spawn("npm", ["run", "dev"], { stdio: "inherit" });
next.on("exit", (code) => process.exit(code ?? 0));
