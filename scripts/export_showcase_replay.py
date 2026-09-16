"""Export the verified showcase as a stable replay bundled with the demo."""

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from phantom.bridge import RealGameSession
from phantom.telemetry import ReplayWriter


def main() -> int:
    session_dir = ROOT / "output" / "sessions"
    writer = ReplayWriter(session_dir, "showcase-20260911")
    if writer.path.exists():
        writer.path.unlink()
    game = RealGameSession(
        ROOT / "third_party" / "DouZero" / "baselines" / "douzero_ADP",
        seed=20260911,
    )
    count = 0
    for event in game.events():
        writer.append(event)
        count += 1
    print(f"已生成稳定演示录像：{writer.path}（{count} 个事件）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
