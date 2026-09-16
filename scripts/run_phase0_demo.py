"""Run one deterministic all-DouZero game and print a compact audit."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from phantom.game import DEFAULT_SEED, play_headless_game


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--full", action="store_true")
    args = parser.parse_args()

    result = play_headless_game(
        ROOT / "third_party" / "DouZero" / "baselines" / "douzero_ADP",
        seed=args.seed,
        device=args.device,
    )
    payload = result.as_dict()
    if not args.full:
        payload["decisions"] = payload["decisions"][:3]
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
