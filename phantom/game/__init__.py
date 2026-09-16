"""Deterministic PHANTOM game-engine bridge."""

from .headless import DEFAULT_SEED, HeadlessGameResult, make_deal, play_headless_game
from .rules import LABELS, MovePattern, classify_move

__all__ = [
    "DEFAULT_SEED",
    "HeadlessGameResult",
    "LABELS",
    "MovePattern",
    "classify_move",
    "make_deal",
    "play_headless_game",
]
