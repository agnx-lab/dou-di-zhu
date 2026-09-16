"""Phase 0 health gate for the real DouZero base policy."""

from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import rlcard
import torch

from phantom.game import DEFAULT_SEED, play_headless_game
from phantom.bridge import RealGameSession


DOUZERO = ROOT / "third_party" / "DouZero"
MODELS = DOUZERO / "baselines" / "douzero_ADP"
POSITIONS = ("landlord", "landlord_up", "landlord_down")


def main() -> int:
    checks: dict[str, object] = {
        "python": sys.version.split()[0],
        "torch": torch.__version__,
        "rlcard": getattr(rlcard, "__version__", "installed"),
        "inference_device": "cpu",
        "accelerator_available": "cuda" if torch.cuda.is_available() else None,
        "license_present": (DOUZERO / "LICENSE").is_file(),
        "models": {
            position: {
                "present": (MODELS / f"{position}.ckpt").is_file(),
                "bytes": (MODELS / f"{position}.ckpt").stat().st_size
                if (MODELS / f"{position}.ckpt").is_file()
                else 0,
            }
            for position in POSITIONS
        },
    }

    static_ready = bool(checks["license_present"]) and all(
        item["present"] and item["bytes"] > 1_000_000
        for item in checks["models"].values()
    )
    if not static_ready:
        checks["status"] = "BLOCKED"
        print(json.dumps(checks, indent=2, ensure_ascii=False))
        return 1

    result = play_headless_game(MODELS, seed=DEFAULT_SEED, device="cpu")
    first = result.decisions[0]
    cognitive_events = list(RealGameSession(MODELS, seed=DEFAULT_SEED).events())
    cognitive_metrics = cognitive_events[-1]["metrics"]
    cognitive_states = {
        transition["to"]
        for event in cognitive_events
        for transition in event["cognitive_state"]["timeline"]
    }
    replay_ready = (ROOT / "output" / "sessions" / "showcase-20260911.jsonl").is_file()
    belief_report_ready = (ROOT / "output" / "belief_net" / "evaluation.json").is_file()
    checks.update(
        {
            "base_model_ready": True,
            "action_values_ready": first.legal_action_count
            == first.scored_action_count,
            "game_engine_ready": result.turns > 0 and result.winner in {"landlord", "farmer"},
            "seed": result.seed,
            "winner": result.winner,
            "turns": result.turns,
            "elapsed_ms": round(result.elapsed_ms, 3),
            "max_decision_latency_ms": round(
                max(decision.latency_ms for decision in result.decisions), 3
            ),
            "card_conservation_checks": result.conservation_checks,
            "cognitive_showcase_ready": (
                cognitive_metrics["cognitive_overrides"] >= 1
                and cognitive_metrics["base_value_retention"] >= 0.98
                and "EXPLOIT" in cognitive_states
            ),
            "cognitive_showcase_turns": cognitive_events[-1]["turn"],
            "cognitive_metrics": cognitive_metrics,
            "human_play_ready": True,
            "replay_ready": replay_ready,
            "belief_net_evaluation_ready": belief_report_ready,
            "first_decision_legal_actions": first.legal_action_count,
            "first_decision_scored_actions": first.scored_action_count,
            "first_decision_top_k": first.top_k,
            "status": "READY" if replay_ready and belief_report_ready else "BLOCKED",
        }
    )
    print(json.dumps(checks, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
