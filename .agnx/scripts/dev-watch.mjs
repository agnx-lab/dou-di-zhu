#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const build = path.join(__dirname, "build.mjs");
const run = () =>
  spawn(process.execPath, [build], { stdio: "inherit", cwd: path.resolve(__dirname, "..") });
run();
