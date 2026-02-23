#!/usr/bin/env node
import { spawn } from "node:child_process";

const args = process.argv.slice(2);

let nodeArgs;
if (args[0] === "-e" && typeof args[1] === "string") {
  const rewrittenScript = args[1].replaceAll("./src/", "./dist/");
  nodeArgs = ["--input-type=module", "-e", rewrittenScript];
} else {
  nodeArgs = args;
}

const child = spawn(process.execPath, nodeArgs, { stdio: "inherit" });
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
