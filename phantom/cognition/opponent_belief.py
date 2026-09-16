"""Rule-based second-order belief estimation for the Phase 6 MVP.

This module estimates what each opponent may believe about PHANTOM.  Estimated
features are derived from public history plus each possible observer hand in
the hidden-hand particle distribution.  The target's real hand is used only
for the separately labelled truth comparison returned to the local UI.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from math import ceil, comb, isfinite
from typing import Mapping, Sequence

from douzero.env.env import deck

from .hidden_hand import HiddenHandBelief


CONTROL_VALUES = {14: 1.0, 17: 1.4, 20: 1.8, 30: 2.2}
BOMB_RANKS = tuple(range(3, 18))


@dataclass(frozen=True, slots=True)
class PublicAction:
    actor: str
    action: tuple[int, ...]
    is_pass: bool


class OpponentBeliefEstimator:
    """Estimate opponents' beliefs about one target player's hand features."""

    source = "phantom_rule_opponent_belief_v1"
    method = "rule_bayesian_mvp"

    def __init__(
        self,
        *,
        target: str = "landlord",
        revealed_target_cards: Sequence[int] = (),
    ) -> None:
        self.target = target
        self.revealed_target_cards = tuple(sorted(revealed_target_cards))
        self.history: list[PublicAction] = []

    def observe_action(
        self,
        *,
        actor: str,
        action: Sequence[int],
        is_pass: bool | None = None,
    ) -> None:
        action_tuple = tuple(sorted(action))
        self.history.append(
            PublicAction(
                actor=actor,
                action=action_tuple,
                is_pass=len(action_tuple) == 0 if is_pass is None else is_pass,
            )
        )

    def estimate(
        self,
        *,
        particles: HiddenHandBelief,
        target_cards_for_truth: Sequence[int],
        played_cards: Mapping[str, Sequence[int]],
        remaining: Mapping[str, int],
    ) -> dict[str, object]:
        """Return estimated observer beliefs and an explicitly labelled truth."""

        if self.target not in remaining or self.target not in played_cards:
            raise ValueError("Target is missing from public state")
        known_target = _remaining_revealed_cards(
            self.revealed_target_cards, played_cards[self.target]
        )
        target_count = remaining[self.target]
        observers: dict[str, dict[str, float | int | str]] = {}
        for observer in particles.opponents:
            observers[observer] = self._estimate_for_observer(
                observer=observer,
                particles=particles,
                known_target=known_target,
                played_cards=played_cards,
                remaining=remaining,
            )

        consensus = _weighted_consensus(tuple(observers.values()))
        truth = _truth_features(target_cards_for_truth)
        target_actions = [item for item in self.history if item.actor == self.target]
        confidence = min(0.9, 0.56 + len(target_actions) * 0.018)
        return {
            "status": "estimated",
            "source": self.source,
            "method": self.method,
            "target": self.target,
            "confidence": round(confidence, 6),
            "evidence_actions": len(target_actions),
            "observers": observers,
            "consensus": consensus,
            "actual_state": truth,
        }

    def _estimate_for_observer(
        self,
        *,
        observer: str,
        particles: HiddenHandBelief,
        known_target: Sequence[int],
        played_cards: Mapping[str, Sequence[int]],
        remaining: Mapping[str, int],
    ) -> dict[str, float | int | str]:
        observer_index = particles.opponents.index(observer)
        accumulator = {
            "rocket_probability": 0.0,
            "bomb_probability": 0.0,
            "expected_bomb_count": 0.0,
            "control_strength": 0.0,
            "estimated_turns_to_finish": 0.0,
        }
        total_weight = 0.0
        for particle in particles.particles:
            observer_hand = particle.hands[observer_index]
            features = self._features_from_view(
                observer_hand=observer_hand,
                known_target=known_target,
                played_cards=played_cards,
                remaining=remaining,
            )
            total_weight += particle.weight
            for key in accumulator:
                accumulator[key] += particle.weight * features[key]

        if total_weight <= 0 or not isfinite(total_weight):
            raise ValueError("Opponent belief cannot aggregate zero particle weight")
        result = {key: value / total_weight for key, value in accumulator.items()}
        result["estimated_turns_to_finish"] = max(
            0, round(result["estimated_turns_to_finish"])
        )
        for key in (
            "rocket_probability",
            "bomb_probability",
            "expected_bomb_count",
            "control_strength",
        ):
            result[key] = round(result[key], 6)
        result["observer"] = observer
        return result

    def _features_from_view(
        self,
        *,
        observer_hand: Sequence[int],
        known_target: Sequence[int],
        played_cards: Mapping[str, Sequence[int]],
        remaining: Mapping[str, int],
    ) -> dict[str, float]:
        known_counter = Counter(known_target)
        unavailable = Counter(observer_hand) + known_counter
        for cards in played_cards.values():
            unavailable.update(cards)
        full = Counter(deck)
        if any(unavailable[rank] > full[rank] for rank in unavailable):
            raise ValueError("Observer view exceeds the Dou Dizhu deck")
        pool = full - unavailable
        population = sum(pool.values())
        draws = remaining[self.target] - len(known_target)
        if draws < 0 or draws > population:
            raise ValueError("Target draw count is inconsistent with public state")

        rocket_probability = _joint_special_probability(
            known_counter=known_counter,
            pool=pool,
            population=population,
            draws=draws,
            ranks=(20, 30),
        )
        bomb_probabilities: list[float] = []
        for rank in BOMB_RANKS:
            needed = max(0, 4 - known_counter[rank])
            bomb_probabilities.append(
                _hypergeom_at_least(
                    successes=pool[rank],
                    population=population,
                    draws=draws,
                    needed=needed,
                )
            )
        expected_bomb_count = sum(bomb_probabilities)
        bomb_probability = 1.0
        for probability in bomb_probabilities:
            bomb_probability *= 1.0 - probability
        bomb_probability = 1.0 - bomb_probability

        known_control = sum(CONTROL_VALUES.get(card, 0.0) for card in known_target)
        pool_control = sum(
            CONTROL_VALUES.get(rank, 0.0) * count for rank, count in pool.items()
        )
        expected_control = known_control + (
            draws * pool_control / population if population else 0.0
        )
        control_strength = min(1.0, expected_control / 6.5)

        target_actions = [item for item in self.history if item.actor == self.target]
        pass_count = sum(item.is_pass for item in target_actions)
        multi_count = sum(len(item.action) >= 2 for item in target_actions)
        evidence_factor = max(0.62, min(1.08, 1.0 - pass_count * 0.055 + multi_count * 0.018))
        rocket_probability = min(1.0, rocket_probability * evidence_factor)
        bomb_probability = min(1.0, bomb_probability * evidence_factor)
        control_strength = min(1.0, control_strength * max(0.68, evidence_factor))

        expected_pairs = 0.0
        for rank in BOMB_RANKS:
            expected_pairs += _hypergeom_at_least(
                successes=pool[rank],
                population=population,
                draws=draws,
                needed=max(0, 2 - known_counter[rank]),
            )
        compression = max(
            1.0,
            1.18 + min(1.05, expected_pairs * 0.11) + bomb_probability * 0.25
            - min(0.28, pass_count * 0.04),
        )
        finish_estimate = float(ceil(remaining[self.target] / compression))
        return {
            "rocket_probability": rocket_probability,
            "bomb_probability": bomb_probability,
            "expected_bomb_count": expected_bomb_count,
            "control_strength": control_strength,
            "estimated_turns_to_finish": finish_estimate,
        }


def _remaining_revealed_cards(
    revealed_cards: Sequence[int], played_by_target: Sequence[int]
) -> tuple[int, ...]:
    remaining = Counter(revealed_cards)
    for rank, count in Counter(played_by_target).items():
        remaining[rank] = max(0, remaining[rank] - count)
    return tuple(sorted(remaining.elements()))


def _hypergeom_at_least(
    *, successes: int, population: int, draws: int, needed: int
) -> float:
    if needed <= 0:
        return 1.0
    if successes < needed or draws < needed or population <= 0:
        return 0.0
    denominator = comb(population, draws)
    if denominator == 0:
        return 0.0
    maximum = min(successes, draws)
    minimum = max(needed, draws - (population - successes))
    return sum(
        comb(successes, selected) * comb(population - successes, draws - selected)
        for selected in range(minimum, maximum + 1)
    ) / denominator


def _joint_special_probability(
    *,
    known_counter: Counter[int],
    pool: Counter[int],
    population: int,
    draws: int,
    ranks: Sequence[int],
) -> float:
    needed = [rank for rank in ranks if known_counter[rank] == 0]
    if not needed:
        return 1.0
    if any(pool[rank] == 0 for rank in needed) or draws < len(needed):
        return 0.0
    if population <= 0:
        return 0.0
    probability = 1.0
    for offset in range(len(needed)):
        probability *= (draws - offset) / (population - offset)
    return probability


def _truth_features(cards: Sequence[int]) -> dict[str, float | int]:
    counts = Counter(cards)
    control_score = sum(CONTROL_VALUES.get(card, 0.0) for card in cards)
    bombs = sum(count >= 4 for rank, count in counts.items() if rank in BOMB_RANKS)
    groups = sum(ceil(count / 2) for count in counts.values())
    return {
        "rocket_probability": float(bool(counts[20] and counts[30])),
        "bomb_probability": float(bombs > 0),
        "expected_bomb_count": float(bombs),
        "control_strength": round(min(1.0, control_score / 6.5), 6),
        "estimated_turns_to_finish": max(0, groups),
    }


def _weighted_consensus(
    observer_features: Sequence[Mapping[str, float | int | str]],
) -> dict[str, float | int]:
    if not observer_features:
        raise ValueError("At least one observer estimate is required")
    keys = (
        "rocket_probability",
        "bomb_probability",
        "expected_bomb_count",
        "control_strength",
        "estimated_turns_to_finish",
    )
    result: dict[str, float | int] = {}
    for key in keys:
        mean = sum(float(item[key]) for item in observer_features) / len(observer_features)
        result[key] = round(mean) if key == "estimated_turns_to_finish" else round(mean, 6)
    return result
