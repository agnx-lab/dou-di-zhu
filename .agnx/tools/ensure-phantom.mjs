#!/usr/bin/env node
/**
 * 场景：短跑 sidecar — 确保幻局 FastAPI(:8765) + 前端(:5173) 已起。
 * 用法：node .agnx/tools/ensure-phantom.mjs [--work-dir <dataRoot>]
 *       [--api-port 8765] [--frontend-port 5173] [--supervised] [--force-restart]
 * stdout：单行 JSON { ok, origin, reused?, pid?, plan?, warnings? }
 */
import { spawn } from "node:child_process";
import { access, constants as fsConstants, mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const DEFAULT_API_PORT = 8765;
const DEFAULT_FRONTEND_PORT = 5173;
const STATE_FILE = "phantom.json";

function parseArgs(argv) {
  let workDir = process.env.AGNX_APP_DATA_ROOT || "";
  let apiPort = DEFAULT_API_PORT;
  let frontendPort = DEFAULT_FRONTEND_PORT;
  let forceRestart = false;
  let supervised = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if ((arg === "--work-dir" || arg === "--workDir") && next) {
      workDir = String(next).trim();
      i += 1;
    } else if ((arg === "--api-port" || arg === "--apiPort") && next) {
      const n = Number(next);
      if (Number.isFinite(n) && n > 0) apiPort = Math.floor(n);
      i += 1;
    } else if (
      (arg === "--frontend-port" || arg === "--frontendPort" || arg === "--port") &&
      next
    ) {
      const n = Number(next);
      if (Number.isFinite(n) && n > 0) frontendPort = Math.floor(n);
      i += 1;
    } else if (arg === "--force-restart" || arg === "--forceRestart") {
      forceRestart = true;
    } else if (arg === "--supervised") {
      supervised = true;
    }
  }
  const fallback = path.join(
    process.env.AGNX_HOME || path.join(process.env.HOME || "", ".agnx-dev"),
    "apps",
    "data",
    "phantom",
  );
  return {
    workDir: workDir || (supervised ? "" : fallback),
    apiPort,
    frontendPort,
    forceRestart,
    supervised,
    repoRoot,
  };
}

function fingerprint(cfg) {
  return JSON.stringify({
    repoRoot: cfg.repoRoot,
    apiPort: cfg.apiPort,
    frontendPort: cfg.frontendPort,
  });
}

function guestOrigin(cfg, prefer = "ipv4") {
  if (prefer === "ipv6") return `http://[::1]:${cfg.frontendPort}`;
  return `http://127.0.0.1:${cfg.frontendPort}`;
}

async function pathExists(p) {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readState(statePath) {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeState(statePath, payload) {
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function httpGetOk(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2500 }, (res) => {
      res.resume();
      resolve(res.statusCode != null && res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function probeWebOrigin(cfg) {
  const candidates = [
    guestOrigin(cfg, "ipv4"),
    guestOrigin(cfg, "ipv6"),
    `http://localhost:${cfg.frontendPort}`,
  ];
  for (const origin of candidates) {
    if (await httpGetOk(`${origin}/`)) return origin;
  }
  return null;
}

async function isHealthy(cfg) {
  const api = await httpGetOk(`http://127.0.0.1:${cfg.apiPort}/health`);
  if (!api) return false;
  return Boolean(await probeWebOrigin(cfg));
}

function isPidAlive(pid) {
  const n = Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

async function confirmStable(cfg, pid, { settleMs = 1500, rechecks = 2 } = {}) {
  for (let i = 0; i < rechecks; i += 1) {
    await new Promise((r) => setTimeout(r, settleMs));
    if (pid != null && !isPidAlive(pid)) {
      return { ok: false, reason: `launcher pid ${pid} exited during settle` };
    }
    if (!(await isHealthy(cfg))) {
      return { ok: false, reason: "API/frontend stopped accepting after settle" };
    }
  }
  return { ok: true };
}

function stopPid(pid) {
  const n = Number(pid);
  if (!Number.isFinite(n) || n <= 0) return;
  try {
    process.kill(n, "SIGTERM");
  } catch {
    // ignore
  }
}

function resolvePython(cfg) {
  const venvPy = path.join(cfg.repoRoot, ".venv", "bin", "python");
  return venvPy;
}

function resolveNpm() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function baseEnv(cfg, dataRoot) {
  const origins = [
    `http://127.0.0.1:${cfg.frontendPort}`,
    `http://localhost:${cfg.frontendPort}`,
    `http://[::1]:${cfg.frontendPort}`,
  ].join(",");
  const keep = [
    "PATH",
    "HOME",
    "USER",
    "LOGNAME",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "SHELL",
    "TERM",
    "NODE_OPTIONS",
    "NVM_DIR",
    "NVM_BIN",
  ];
  const env = {};
  for (const key of keep) {
    if (process.env[key]) env[key] = process.env[key];
  }
  // Preserve Agnx / Phantom / Python tooling knobs only
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v !== "string" || !v) continue;
    if (
      k.startsWith("AGNX_") ||
      k.startsWith("PHANTOM_") ||
      k.startsWith("UV_") ||
      k === "VIRTUAL_ENV" ||
      k === "PYTHONPATH"
    ) {
      env[k] = v;
    }
  }
  env.AGNX_APP_DATA_ROOT = dataRoot;
  env.PHANTOM_ALLOWED_ORIGINS = origins;
  env.PHANTOM_API_PORT = String(cfg.apiPort);
  env.PHANTOM_FRONTEND_PORT = String(cfg.frontendPort);
  return env;
}

async function buildPlan(cfg, warnings, wantedFp, dataRoot) {
  const venvPy = resolvePython(cfg);
  if (!(await pathExists(venvPy))) {
    return {
      ok: false,
      error:
        "缺少 .venv。请在 phantom 仓根用 python3.12/uv 建虚拟环境并安装 requirements-dev.txt（含 fastapi/uvicorn/torch）。",
    };
  }
  const frontendPkg = path.join(cfg.repoRoot, "frontend", "package.json");
  if (!(await pathExists(frontendPkg))) {
    return { ok: false, error: `缺少 frontend/package.json：${frontendPkg}` };
  }
  if (!(await pathExists(path.join(cfg.repoRoot, "frontend", "node_modules")))) {
    warnings.push("frontend/node_modules 缺失；若启动失败请先在 frontend 执行 npm ci");
  }
  const launcher = path.join(__dirname, "phantom-launcher.mjs");
  if (!(await pathExists(launcher))) {
    return { ok: false, error: `缺少 launcher：${launcher}` };
  }
  await mkdir(dataRoot, { recursive: true });
  await mkdir(path.join(dataRoot, "sessions"), { recursive: true });
  await mkdir(path.join(dataRoot, "profiles"), { recursive: true });
  await mkdir(path.join(dataRoot, "logs"), { recursive: true });

  return {
    ok: true,
    plan: {
      command: process.execPath,
      args: [
        launcher,
        "--api-port",
        String(cfg.apiPort),
        "--frontend-port",
        String(cfg.frontendPort),
        "--python",
        venvPy,
        "--npm",
        resolveNpm(),
      ],
      cwd: cfg.repoRoot,
      env: baseEnv(cfg, dataRoot),
      fingerprint: wantedFp,
      healthUrl: `http://127.0.0.1:${cfg.apiPort}/health`,
      port: cfg.frontendPort,
      guestOrigin: guestOrigin(cfg),
    },
  };
}

async function tryReused(cfg, statePath, wantedFp) {
  if (cfg.forceRestart) return null;
  if (!(await isHealthy(cfg))) return null;
  const existing = await readState(statePath);
  if (existing?.fingerprint && existing.fingerprint !== wantedFp) return null;
  if (existing?.pid != null && !isPidAlive(existing.pid)) return null;
  const stable = await confirmStable(cfg, existing?.pid ?? null, { settleMs: 600, rechecks: 1 });
  if (!stable.ok) return null;
  const origin = (await probeWebOrigin(cfg)) || guestOrigin(cfg);
  return {
    ok: true,
    reused: true,
    port: cfg.frontendPort,
    origin,
    pid: existing?.pid ?? null,
    fingerprint: wantedFp,
  };
}

async function ensureLocal(cfg, warnings, statePath, wantedFp, dataRoot) {
  const planned = await buildPlan(cfg, warnings, wantedFp, dataRoot);
  if (!planned.ok) return planned;
  const existing = await readState(statePath);
  if (existing?.pid) stopPid(existing.pid);
  const plan = planned.plan;
  const child = spawn(plan.command, plan.args, {
    cwd: plan.cwd,
    env: plan.env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  // torch cold start may be slow
  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline) {
    if (await isHealthy(cfg)) {
      const stable = await confirmStable(cfg, child.pid ?? null);
      if (!stable.ok) {
        // keep waiting until deadline — transient blip during restart
        continue;
      }
      await writeState(statePath, {
        pid: child.pid ?? null,
        fingerprint: wantedFp,
        updatedAt: new Date().toISOString(),
      });
      const origin = (await probeWebOrigin(cfg)) || guestOrigin(cfg);
      return {
        ok: true,
        reused: false,
        port: cfg.frontendPort,
        origin,
        pid: child.pid ?? null,
        fingerprint: wantedFp,
      };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  stopPid(child.pid);
  return { ok: false, error: "幻局启动超时（API /health 或前端首页）", pid: child.pid ?? null };
}

async function main() {
  const cfg = parseArgs(process.argv.slice(2));
  const warnings = [];
  if (cfg.supervised && !cfg.workDir) {
    console.log(
      JSON.stringify({
        ok: false,
        error: "supervised ensure 需要 AGNX_APP_DATA_ROOT 指向 apps/data/phantom",
      }),
    );
    process.exitCode = 1;
    return;
  }
  const dataRoot =
    cfg.workDir ||
    path.join(
      process.env.AGNX_HOME || path.join(process.env.HOME || "", ".agnx-dev"),
      "apps",
      "data",
      "phantom",
    );
  await mkdir(dataRoot, { recursive: true });
  const statePath = path.join(dataRoot, STATE_FILE);
  const wantedFp = fingerprint(cfg);

  if (cfg.forceRestart) {
    const existing = await readState(statePath);
    if (existing?.pid) stopPid(existing.pid);
  }

  if (cfg.supervised) {
    const reused = await tryReused(cfg, statePath, wantedFp);
    if (reused) {
      console.log(
        JSON.stringify({
          ...reused,
          healthUrl: `http://127.0.0.1:${cfg.apiPort}/health`,
          warnings,
        }),
      );
      return;
    }
    const planned = await buildPlan(cfg, warnings, wantedFp, dataRoot);
    if (!planned.ok) {
      console.log(JSON.stringify({ ...planned, warnings }));
      process.exitCode = 1;
      return;
    }
    console.log(
      JSON.stringify({
        ok: true,
        reused: false,
        plan: planned.plan,
        origin: guestOrigin(cfg),
        port: cfg.frontendPort,
        warnings,
      }),
    );
    return;
  }

  const reused = await tryReused(cfg, statePath, wantedFp);
  if (reused) {
    console.log(JSON.stringify({ ...reused, warnings }));
    return;
  }
  const result = await ensureLocal(cfg, warnings, statePath, wantedFp, dataRoot);
  console.log(JSON.stringify({ ...result, warnings }));
  if (!result.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exitCode = 1;
});
