#!/usr/bin/env node
/**
 * 场景：幻局启动器 — FastAPI(:8765) + frontend npm run dev(:5173)；保持进程存活。
 */
import { spawn } from "node:child_process";
import { access, constants as fsConstants, mkdir } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const frontendRoot = path.join(repoRoot, "frontend");

function parseArgs(argv) {
  let apiPort = Number(process.env.PHANTOM_API_PORT || 8765);
  let frontendPort = Number(process.env.PHANTOM_FRONTEND_PORT || 5173);
  let python = path.join(repoRoot, ".venv", "bin", "python");
  let npm = process.platform === "win32" ? "npm.cmd" : "npm";
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const n = argv[i + 1];
    if (a === "--api-port" && n) {
      apiPort = Number(n);
      i += 1;
    } else if (a === "--frontend-port" && n) {
      frontendPort = Number(n);
      i += 1;
    } else if (a === "--python" && n) {
      python = n;
      i += 1;
    } else if (a === "--npm" && n) {
      npm = n;
      i += 1;
    }
  }
  return {
    apiPort: Number.isFinite(apiPort) && apiPort > 0 ? apiPort : 8765,
    frontendPort: Number.isFinite(frontendPort) && frontendPort > 0 ? frontendPort : 5173,
    python,
    npm,
  };
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

async function waitReady(apiPort, frontendPort, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const api = await httpGetOk(`http://127.0.0.1:${apiPort}/health`);
    const web = await httpGetOk(`http://127.0.0.1:${frontendPort}/`);
    if (api && web) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function spawnKeep(cmd, args, cwd, env) {
  return spawn(cmd, args, {
    cwd,
    env,
    stdio: ["ignore", "inherit", "inherit"],
  });
}

async function main() {
  const cfg = parseArgs(process.argv.slice(2));
  try {
    await access(path.join(repoRoot, "scripts", "run_backend.py"), fsConstants.F_OK);
  } catch {
    console.error(JSON.stringify({ ok: false, error: "找不到 scripts/run_backend.py" }));
    process.exit(1);
  }

  const dataRoot =
    process.env.AGNX_APP_DATA_ROOT ||
    path.join(process.env.HOME || "", ".agnx-dev", "apps", "data", "phantom");
  await mkdir(dataRoot, { recursive: true });
  await mkdir(path.join(dataRoot, "logs"), { recursive: true });

  const origins = [
    `http://127.0.0.1:${cfg.frontendPort}`,
    `http://localhost:${cfg.frontendPort}`,
    `http://[::1]:${cfg.frontendPort}`,
  ].join(",");

  const env = {
    ...process.env,
    AGNX_APP_DATA_ROOT: dataRoot,
    PHANTOM_ALLOWED_ORIGINS: process.env.PHANTOM_ALLOWED_ORIGINS || origins,
  };

  const api = spawnKeep(
    cfg.python,
    [path.join(repoRoot, "scripts", "run_backend.py")],
    repoRoot,
    env,
  );
  const web = spawnKeep(
    cfg.npm,
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(cfg.frontendPort)],
    frontendRoot,
    env,
  );

  const ready = await waitReady(cfg.apiPort, cfg.frontendPort, 600_000);
  if (!ready) {
    try {
      api.kill("SIGTERM");
      web.kill("SIGTERM");
    } catch {
      // ignore
    }
    console.error(JSON.stringify({ ok: false, error: "幻局 API/前端启动超时" }));
    process.exit(1);
  }

  const shutdown = () => {
    try {
      api.kill("SIGTERM");
      web.kill("SIGTERM");
    } catch {
      // ignore
    }
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  api.on("exit", (code) => {
    if (code) process.exit(code);
  });
  web.on("exit", (code) => {
    if (code) process.exit(code);
  });
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
