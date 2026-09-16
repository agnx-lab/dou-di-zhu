"""Start the complete local demo with one command and one browser page."""

from __future__ import annotations

import argparse
from contextlib import ExitStack
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
MODEL_DIR = ROOT / "third_party" / "DouZero" / "baselines" / "douzero_ADP"


def _port_open(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.4):
            return True
    except OSError:
        return False


def _wait_for(url: str, timeout: float = 45.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urlopen(url, timeout=1.0) as response:
                if response.status < 500:
                    return
        except (URLError, OSError):
            time.sleep(0.25)
    raise RuntimeError(f"服务启动超时：{url}")


def _backend_compatible() -> bool:
    try:
        with urlopen("http://127.0.0.1:8765/health", timeout=1.0) as response:
            health = json.load(response)
        return all(
            health.get(key) == "active"
            for key in ("cognitive_layer", "action_reranking", "human_play", "session_replay")
        )
    except (URLError, OSError, ValueError):
        return False


def _frontend_compatible() -> bool:
    try:
        with urlopen("http://localhost:5173/", timeout=1.0) as response:
            page = response.read(120_000)
            return "幻局斗地主".encode("utf-8") in page
    except (URLError, OSError):
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="一键启动幻局斗地主")
    parser.add_argument("--mode", choices=("real", "play", "replay", "mock"), default="real")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    missing = [path.name for path in MODEL_DIR.glob("*.ckpt") if path.stat().st_size < 1_000_000]
    required = [MODEL_DIR / f"{position}.ckpt" for position in ("landlord", "landlord_up", "landlord_down")]
    if missing or not all(path.is_file() for path in required):
        raise RuntimeError("DouZero 模型文件不完整，请先运行健康检查")

    log_dir = ROOT / "output" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    processes: list[subprocess.Popen[bytes]] = []
    creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    with ExitStack() as stack:
        backend_log = stack.enter_context((log_dir / "backend.log").open("ab"))
        frontend_log = stack.enter_context((log_dir / "frontend.log").open("ab"))
        backend_running = _port_open(8765)
        if backend_running and not _backend_compatible():
            raise RuntimeError("8765 端口已有不兼容的旧服务，请先关闭后重试")
        if not backend_running:
            processes.append(
                subprocess.Popen(
                    [sys.executable, str(ROOT / "scripts" / "run_backend.py")],
                    cwd=ROOT,
                    stdout=backend_log,
                    stderr=subprocess.STDOUT,
                    creationflags=creationflags,
                )
            )
        _wait_for("http://127.0.0.1:8765/health")
        if not _backend_compatible():
            raise RuntimeError("后端健康检查未通过")
        frontend_running = _port_open(5173, "localhost")
        if frontend_running and not _frontend_compatible():
            raise RuntimeError("5173 端口已被其他页面占用，请先关闭后重试")
        if not frontend_running:
            processes.append(
                subprocess.Popen(
                    ["npm.cmd", "run", "dev"],
                    cwd=FRONTEND,
                    stdout=frontend_log,
                    stderr=subprocess.STDOUT,
                    creationflags=creationflags,
                )
            )
        _wait_for("http://localhost:5173/")
        if not _frontend_compatible():
            raise RuntimeError("前端页面身份检查未通过")
        url = f"http://localhost:5173/?mode={args.mode}"
        print(f"幻局斗地主已就绪：{url}")
        print("关闭本窗口即可停止由本次命令启动的服务。")
        if not args.no_browser:
            webbrowser.open(url)
        try:
            while True:
                if any(process.poll() is not None for process in processes):
                    raise RuntimeError("本地服务意外退出，请查看 output/logs")
                time.sleep(1.0)
        except KeyboardInterrupt:
            print("正在安全关闭……")
        finally:
            for process in processes:
                process.terminate()
            for process in processes:
                try:
                    process.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    process.kill()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
