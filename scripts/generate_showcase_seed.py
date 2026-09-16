"""Search real fixed deals for a complete PHANTOM cognitive loop."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from phantom.bridge import RealGameSession


MODEL_DIR = ROOT / "third_party" / "DouZero" / "baselines" / "douzero_ADP"
OUTPUT = ROOT / "phantom" / "evaluation" / "showcase_seed.json"


def evaluate_seed(seed: int) -> dict[str, object]:
    events = list(RealGameSession(MODEL_DIR, seed=seed).events())
    decisions = [
        event["cognitive_decision"]
        for event in events
        if event.get("actor") == "landlord"
    ]
    states = {
        transition["to"]
        for event in events
        for transition in event["cognitive_state"]["timeline"]
    }
    metrics = events[-1]["metrics"]
    return {
        "seed": seed,
        "turns": events[-1]["turn"],
        "winner": events[-1]["winner"],
        "cognitive_overrides": sum(bool(item["override"]) for item in decisions),
        "hidden_strength_triggered": any(
            item["reason"] == "hidden_strength" and item["override"] for item in decisions
        ),
        "exploit_state_reached": "EXPLOIT" in states,
        "base_value_retention": metrics["base_value_retention"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=20260911)
    parser.add_argument("--count", type=int, default=1)
    args = parser.parse_args()
    for seed in range(args.start, args.start + args.count):
        result = evaluate_seed(seed)
        if (
            result["cognitive_overrides"] >= 1
            and result["hidden_strength_triggered"]
            and result["exploit_state_reached"]
            and result["base_value_retention"] >= 0.98
        ):
            payload = {
                "seed": seed,
                "source": "searched_real_douzero_game",
                "criteria": {
                    "minimum_cognitive_overrides": 1,
                    "requires_hidden_strength": True,
                    "requires_exploit_state": True,
                    "minimum_base_value_retention": 0.98,
                },
                "verified_result": result,
            }
            OUTPUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            print(json.dumps(payload, ensure_ascii=False))
            return
    raise SystemExit("No showcase seed met all criteria in the requested range")


if __name__ == "__main__":
    main()
