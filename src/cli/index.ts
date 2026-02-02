#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";

function openBrowser(url: string) {
  const platform = process.platform;
  if (platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true });
    return;
  }
  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true });
    return;
  }
  spawn("xdg-open", [url], { stdio: "ignore", detached: true });
}

function run(command: string, args: string[], opts: { cwd: string }) {
  const child = spawn(command, args, {
    cwd: opts.cwd,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, NODE_ENV: "production" }
  });
  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

const cwd = process.cwd();
const port = process.env.PORT ?? "3000";
const url = `http://localhost:${port}`;

run("node", ["./dist/server/index.js"], { cwd });
setTimeout(() => openBrowser(url), 500);
