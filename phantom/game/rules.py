"""Canonical Chinese labels for the standard Dou Dizhu card-play phase.

The upstream engine owns legal-move generation.  This module deliberately keeps
presentation and validation diagnostics outside third-party code so the UI can
name every supported combination accurately without patching DouZero.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class MovePattern:
    code: str
    label: str
    main_rank: int | None = None
    sequence_length: int | None = None

    @property
    def valid(self) -> bool:
        return self.code != "invalid"


LABELS = {
    "pass": "不出",
    "single": "单张",
    "pair": "对子",
    "triple": "三张",
    "triple_single": "三带一",
    "triple_pair": "三带二",
    "straight": "顺子",
    "serial_pair": "连对",
    "serial_triple": "飞机不带翅膀",
    "airplane_single": "飞机带单张",
    "airplane_pair": "飞机带对子",
    "four_two_single": "四带二",
    "four_two_pair": "四带两对",
    "bomb": "炸弹",
    "rocket": "王炸",
    "invalid": "不符合斗地主牌型",
}


def _is_sequence(ranks: Iterable[int], *, minimum: int) -> bool:
    ordered = sorted(ranks)
    return (
        len(ordered) >= minimum
        and ordered[-1] < 17  # 2 and jokers cannot enter a sequence
        and all(right - left == 1 for left, right in zip(ordered, ordered[1:]))
    )


def _airplane_pattern(cards: list[int], counts: Counter[int]) -> MovePattern | None:
    triple_ranks = sorted(rank for rank, count in counts.items() if count >= 3 and rank < 17)
    if len(triple_ranks) < 2:
        return None

    runs: list[list[int]] = []
    current: list[int] = []
    for rank in triple_ranks:
        if current and rank != current[-1] + 1:
            if len(current) >= 2:
                runs.append(current)
            current = []
        current.append(rank)
    if len(current) >= 2:
        runs.append(current)

    # Prefer the longest, then highest, valid body when several interpretations exist.
    bodies = sorted(
        (run[start:end] for run in runs for start in range(len(run)) for end in range(start + 2, len(run) + 1)),
        key=lambda body: (len(body), body[-1]),
        reverse=True,
    )
    for body in bodies:
        body_size = len(body)
        remainder = counts.copy()
        for rank in body:
            remainder[rank] -= 3
            if remainder[rank] == 0:
                del remainder[rank]
        remaining_cards = sum(remainder.values())
        if len(cards) == body_size * 4 and remaining_cards == body_size:
            return MovePattern("airplane_single", LABELS["airplane_single"], body[-1], body_size)
        if (
            len(cards) == body_size * 5
            and remaining_cards == body_size * 2
            and len(remainder) == body_size
            and all(count == 2 for count in remainder.values())
        ):
            return MovePattern("airplane_pair", LABELS["airplane_pair"], body[-1], body_size)
    return None


def classify_move(cards: Iterable[int]) -> MovePattern:
    ordered = sorted(cards)
    size = len(ordered)
    counts = Counter(ordered)
    groups = sorted(counts.values())

    if size == 0:
        return MovePattern("pass", LABELS["pass"])
    if size == 1:
        return MovePattern("single", LABELS["single"], ordered[0])
    if size == 2 and ordered == [20, 30]:
        return MovePattern("rocket", LABELS["rocket"])
    if size == 2 and groups == [2]:
        return MovePattern("pair", LABELS["pair"], ordered[0])
    if size == 3 and groups == [3]:
        return MovePattern("triple", LABELS["triple"], ordered[0])
    if size == 4 and groups == [4]:
        return MovePattern("bomb", LABELS["bomb"], ordered[0])
    if size == 4 and groups == [1, 3]:
        main = next(rank for rank, count in counts.items() if count == 3)
        return MovePattern("triple_single", LABELS["triple_single"], main)
    if size == 5 and groups == [2, 3]:
        main = next(rank for rank, count in counts.items() if count == 3)
        return MovePattern("triple_pair", LABELS["triple_pair"], main)

    if all(count == 1 for count in counts.values()) and _is_sequence(counts, minimum=5):
        return MovePattern("straight", LABELS["straight"], ordered[-1], len(counts))
    if all(count == 2 for count in counts.values()) and _is_sequence(counts, minimum=3):
        return MovePattern("serial_pair", LABELS["serial_pair"], max(counts), len(counts))
    if all(count == 3 for count in counts.values()) and _is_sequence(counts, minimum=2):
        return MovePattern("serial_triple", LABELS["serial_triple"], max(counts), len(counts))

    airplane = _airplane_pattern(ordered, counts)
    if airplane:
        return airplane

    if size == 6 and 4 in groups and sum(count for count in groups if count != 4) == 2:
        main = next(rank for rank, count in counts.items() if count == 4)
        return MovePattern("four_two_single", LABELS["four_two_single"], main)
    if size == 8 and groups == [2, 2, 4]:
        main = next(rank for rank, count in counts.items() if count == 4)
        return MovePattern("four_two_pair", LABELS["four_two_pair"], main)

    return MovePattern("invalid", LABELS["invalid"])


__all__ = ["LABELS", "MovePattern", "classify_move"]
