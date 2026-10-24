#!/usr/bin/env node
/**
 * 场景：外置幻局胶水打包 — esbuild 打 CJS dist。
 */
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agnxRoot = path.resolve(__dirname, "..");
const entry = path.join(agnxRoot, "src/index.ts");
const outDir = path.join(agnxRoot, "dist");
const outFile = path.join(outDir, "index.js");
const require = createRequire(import.meta.url);

if (!existsSync(entry)) {
  console.error("[phantom agnx build] 找不到 src/index.ts");
  process.exit(1);
}

const candidates = [
  // 宿主仓库位置：优先环境变量，其次按 app 根相对推导（外部克隆通常两者都不可用，
  // 此时走下面的 require("esbuild") 兜底，由 .agnx/ 自己的 devDependencies 提供）。
  process.env.AGNX_MONOREPO_ROOT && path.join(process.env.AGNX_MONOREPO_ROOT, "node_modules/esbuild"),
  path.resolve(agnxRoot, "../../../Documents/github/agnx/node_modules/esbuild"),
  path.join(agnxRoot, "../node_modules/esbuild"),
].filter((p) => typeof p === "string" && p.length > 0);
let esbuild;
let resolvedFrom = "";
for (const candidate of candidates) {
  if (existsSync(candidate)) {
    esbuild = require(candidate);
    resolvedFrom = candidate;
    break;
  }
}
if (!esbuild) {
  try {
    esbuild = require("esbuild");
    resolvedFrom = "esbuild(cwd)";
  } catch {
    console.error("[phantom agnx build] 找不到 esbuild");
    process.exit(1);
  }
}

mkdirSync(outDir, { recursive: true });
await esbuild.build({
  absWorkingDir: agnxRoot,
  entryPoints: [entry],
  outfile: outFile,
  bundle: true,
  format: "cjs",
  platform: "neutral",
  mainFields: ["module", "main", "browser"],
  conditions: ["import", "require", "default"],
  target: ["es2022"],
  jsx: "automatic",
  sourcemap: false,
  minify: true,
  external: [
    "react",
    "react-native",
    "react/jsx-runtime",
    "@agnx-lab/app-sdk",
    "lucide-react-native",
    "react-native-unistyles",
    "react-native-svg",
  ],
  logLevel: "info",
});
console.log("[phantom agnx build] ok → .agnx/dist/index.js (via " + resolvedFrom + ")");
