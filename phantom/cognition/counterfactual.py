"""Counterfactual opponent-belief rollout for PHANTOM candidate actions."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import time
from typing import Mapping, Sequence

from .hidden_hand import HiddenHandBelief
from .opponent_belief import OpponentBeliefEstimator


@dataclass(frozen=True, slots=True)
class RolloutCandidate:
    action: tuple[int, ...]
    base_value: float
    base_rank: int


class CounterfactualBeliefRollout:
    """Simulate public history plus each candidate without mutating live state."""

    source = "phantom_counterfactual_rollout_v1"

    def __init__(self, *, top_k: int = 3) -> None:
        if top_k < 1:
            raise ValueError("top_k must be positive")
        self.top_k = top_k

    def evaluate(
        self,
        *,
        estimator: OpponentBeliefEstimator,
        particles: HiddenHandBelief,
        target_cards: Sequence[int],
        played_cards: Mapping[str, Sequence[int]],
        remaining: Mapping[str, int],
        candidates: Sequence[RolloutCandidate],
    ) -> dict[str, object]:
        started = time.perf_counter()
        before = estimator.estimate(
            particles=particles,
            target_cards_for_truth=target_cards,
            played_cards=played_cards,
            remaining=remaining,
        )
        before_consensus = before["consensus"]
        results: list[dict[str, object]] = []
        for candidate in candidates[: self.top_k]:
            simulated_hand = _remove_legal_action(target_cards, candidate.action)
            simulated_played = {
                position: list(cards) for position, cards in played_cards.items()
            }
            simulated_played[estimator.target].extend(candidate.action)
            simulated_remaining = dict(remaining)
            simulated_remaining[estimator.target] -= len(candidate.action)

            fork = OpponentBeliefEstimator(
                target=estimator.target,
                revealed_target_cards=estimator.revealed_target_cards,
            )
            fork.history = list(estimator.history)
            fork.observe_action(
                actor=estimator.target,
                action=candidate.action,
                is_pass=len(candidate.action) == 0,
            )
            after = fork.estimate(
                particles=particles,
                target_cards_for_truth=simulated_hand,
                played_cards=simulated_played,
                remaining=simulated_remaining,
            )
            after_consensus = after["consensus"]
            shifts = {
                key: round(float(after_consensus[key]) - float(before_consensus[key]), 6)
                for key in (
                    "rocket_probability",
                    "bomb_probability",
                    "control_strength",
                    "estimated_turns_to_finish",
                )
            }
            results.append(
                {
                    "action_raw": list(candidate.action),
                    "base_value": candidate.base_value,
                    "base_rank": candidate.base_rank,
                    "selected_by_base": candidate.base_rank == 1,
                    "before": before_consensus,
                    "after": after_consensus,
                    "shift": shifts,
                }
            )

        return {
            "status": "simulated",
            "source": self.source,
            "target": estimator.target,
            "top_k": len(results),
            "history_length": len(estimator.history),
            "before": before_consensus,
            "before_estimate": before,
            "candidates": results,
            "latency_ms": round((time.perf_counter() - started) * 1000, 3),
        }


def _remove_legal_action(
    hand: Sequence[int], action: Sequence[int]
) -> tuple[int, ...]:
    available = Counter(hand)
    required = Counter(action)
    if any(required[rank] > available[rank] for rank in required):
        raise ValueError("Counterfactual candidate is not contained in target hand")
    result = list(hand)
    for card in action:
        result.remove(card)
    return tuple(sorted(result))
