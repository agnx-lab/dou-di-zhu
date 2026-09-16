"""Run a complete reproducible DouZero game with invariant checks."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
import random
import time

from douzero.env.env import deck
from douzero.env.game import GameEnv

from phantom.base import ActionScore, DouZeroAdapter


DEFAULT_SEED = 20260911
POSITIONS = ("landlord", "landlord_down", "landlord_up")


@dataclass(frozen=True, slots=True)
class DecisionRecord:
    turn: int
    position: str
    action: tuple[int, ...]
    legal_action_count: int
    scored_action_count: int
    selected_base_value: float
    top_k: tuple[dict[str, object], ...]
    latency_ms: float


@dataclass(frozen=True, slots=True)
class HeadlessGameResult:
    seed: int
    winner: str
    turns: int
    bombs: int
    elapsed_ms: float
    conservation_checks: int
    decisions: tuple[DecisionRecord, ...]

    def as_dict(self) -> dict[str, object]:
        return asdict(self)


class _AuditedAgent:
    def __init__(self, adapter: DouZeroAdapter) -> None:
        self.adapter = adapter
        self.last_scores: list[ActionScore] = []
        self.last_latency_ms = 0.0

    def act(self, infoset: object) -> list[int]:
        started = time.perf_counter()
        self.last_scores = self.adapter.score_legal_actions(infoset)
        self.last_latency_ms = (time.perf_counter() - started) * 1000
        return list(self.last_scores[0].action)


def make_deal(seed: int) -> dict[str, list[int]]:
    cards = list(deck)
    random.Random(seed).shuffle(cards)
    deal = {
        "landlord": cards[:20],
        "landlord_up": cards[20:37],
        "landlord_down": cards[37:54],
        "three_landlord_cards": cards[17:20],
    }
    for hand in deal.values():
        hand.sort()
    return deal


def _assert_card_conservation(env: GameEnv) -> None:
    remaining = sum(
        len(env.info_sets[position].player_hand_cards) for position in POSITIONS
    )
    played = sum(len(env.played_cards[position]) for position in POSITIONS)
    if remaining + played != 54:
        raise AssertionError(
            f"Card conservation failed: remaining={remaining}, played={played}"
        )


def play_headless_game(
    model_dir: str | Path,
    *,
    seed: int = DEFAULT_SEED,
    device: str = "cpu",
    max_turns: int = 300,
) -> HeadlessGameResult:
    model_dir = Path(model_dir)
    agents = {
        position: _AuditedAgent(
            DouZeroAdapter(position, model_dir / f"{position}.ckpt", device=device)
        )
        for position in POSITIONS
    }
    env = GameEnv(agents)
    env.card_play_init(make_deal(seed))

    decisions: list[DecisionRecord] = []
    conservation_checks = 0
    started = time.perf_counter()
    _assert_card_conservation(env)
    conservation_checks += 1

    while not env.game_over:
        if len(decisions) >= max_turns:
            raise RuntimeError(f"Game exceeded the {max_turns}-turn safety limit")

        position = env.acting_player_position
        infoset = env.game_infoset
        legal_action_count = len(infoset.legal_actions)
        env.step()
        agent = agents[position]
        selected = agent.last_scores[0]
        if list(selected.action) not in infoset.legal_actions:
            raise AssertionError("Base policy selected an illegal action")

        decisions.append(
            DecisionRecord(
                turn=len(decisions) + 1,
                position=position,
                action=selected.action,
                legal_action_count=legal_action_count,
                scored_action_count=len(agent.last_scores),
                selected_base_value=selected.base_value,
                top_k=tuple(score.as_dict() for score in agent.last_scores[:5]),
                latency_ms=agent.last_latency_ms,
            )
        )
        _assert_card_conservation(env)
        conservation_checks += 1

    return HeadlessGameResult(
        seed=seed,
        winner=env.get_winner(),
        turns=len(decisions),
        bombs=env.get_bomb_num(),
        elapsed_ms=(time.perf_counter() - started) * 1000,
        conservation_checks=conservation_checks,
        decisions=tuple(decisions),
    )
