"""Small, behavior-only profile for a local human player."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Sequence


@dataclass(slots=True)
class OpponentProfile:
    player_id: str = "local-human"
    games: int = 0
    actions: int = 0
    passes: int = 0
    bombs_used: int = 0
    high_cards_early: int = 0
    initiative_actions: int = 0
    control_cards_held: int = 0
    current_game_actions: int = 0

    def record_action(
        self,
        action: Sequence[int],
        *,
        turn: int,
        had_initiative: bool,
    ) -> None:
        cards = tuple(action)
        self.actions += 1
        self.current_game_actions += 1
        self.passes += int(len(cards) == 0)
        self.bombs_used += int(
            (len(cards) == 4 and len(set(cards)) == 1)
            or (len(cards) == 2 and set(cards) == {20, 30})
        )
        self.high_cards_early += int(turn <= 12 and any(card >= 14 for card in cards))
        self.initiative_actions += int(had_initiative and bool(cards))
        self.control_cards_held += int(bool(cards) and not any(card >= 14 for card in cards))

    def finish_game(self) -> None:
        self.games += 1
        self.current_game_actions = 0

    @property
    def learning_level(self) -> int:
        if self.games >= 4:
            return 4
        if self.games >= 2:
            return 3
        if self.games >= 1:
            return 2
        return 1

    @property
    def learning_name(self) -> str:
        return ("初识", "试探", "适应", "洞察")[self.learning_level - 1]

    @property
    def learning_progress(self) -> int:
        if self.games >= 4:
            return 100
        base = min(self.games, 3) * 25
        within_game = min(24, round(self.current_game_actions / 10 * 24))
        return min(99, base + within_game)

    @property
    def adaptation_strength(self) -> float:
        """How much the next game's safe opponent tie-breaker may adapt."""
        return round(min(0.8, self.games * 0.2), 6)

    def learning_insight(self) -> str:
        if self.actions < 4:
            return "正在观察你何时抢牌权、何时保留大牌"
        tendencies = (
            (self.pass_rate, "你更常等待合适时机，下一局会更主动争夺牌权"),
            (self.high_card_early_rate, "你倾向较早使用大牌，下一局会尝试保留反制牌"),
            (self.initiative_aggression, "你拿到牌权时进攻果断，下一局会加强连续施压"),
            (self.control_card_conservatism, "你善于保留控制牌，下一局会更谨慎地试探"),
        )
        value, message = max(tendencies, key=lambda item: item[0])
        return message if value >= 0.18 else "样本仍在积累，AI 暂时保持基础策略"

    def bait_modifier(self) -> float:
        aggression = self.initiative_aggression
        conservatism = self.control_card_conservatism
        return max(0.75, min(1.25, 0.85 + aggression * 0.25 + conservatism * 0.15))

    @property
    def pass_rate(self) -> float:
        return _ratio(self.passes, self.actions)

    @property
    def bomb_usage_rate(self) -> float:
        return _ratio(self.bombs_used, self.actions)

    @property
    def high_card_early_rate(self) -> float:
        return _ratio(self.high_cards_early, self.actions)

    @property
    def initiative_aggression(self) -> float:
        return _ratio(self.initiative_actions, self.actions)

    @property
    def control_card_conservatism(self) -> float:
        return _ratio(self.control_cards_held, self.actions)

    def snapshot(self) -> dict[str, object]:
        status = "profile_active" if self.games >= 1 else "learning"
        return {
            **asdict(self),
            "status": status,
            "pass_rate": self.pass_rate,
            "bomb_usage_rate": self.bomb_usage_rate,
            "high_card_early_rate": self.high_card_early_rate,
            "initiative_aggression": self.initiative_aggression,
            "control_card_conservatism": self.control_card_conservatism,
            "bait_modifier": self.bait_modifier(),
            "learning_level": self.learning_level,
            "learning_name": self.learning_name,
            "learning_progress": self.learning_progress,
            "adaptation_strength": self.adaptation_strength,
            "learning_insight": self.learning_insight(),
            "next_milestone": (
                "已形成稳定的跨局应对模型"
                if self.games >= 4
                else f"完成本局后进入{('试探', '适应', '适应', '洞察')[min(self.games, 3)]}阶段"
            ),
        }


class ProfileStore:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)

    def load(self) -> OpponentProfile:
        if not self.path.is_file():
            return OpponentProfile()
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                raise TypeError("Profile root must be an object")
            fields: dict[str, object] = {}
            for key in OpponentProfile.__dataclass_fields__:
                if key not in data:
                    continue
                value = data[key]
                if key == "player_id":
                    if not isinstance(value, str) or len(value) > 80:
                        raise TypeError("Invalid player id")
                elif not isinstance(value, int) or isinstance(value, bool) or value < 0:
                    raise TypeError(f"Invalid profile counter: {key}")
                fields[key] = value
            return OpponentProfile(**fields)
        except (OSError, UnicodeError, json.JSONDecodeError, TypeError):
            return OpponentProfile()

    def save(self, profile: OpponentProfile) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with NamedTemporaryFile(
            "w", encoding="utf-8", dir=self.path.parent, delete=False, suffix=".tmp"
        ) as handle:
            json.dump(profile.snapshot(), handle, ensure_ascii=False, indent=2)
            temporary = Path(handle.name)
        temporary.replace(self.path)


def _ratio(numerator: int, denominator: int) -> float:
    return numerator / denominator if denominator else 0.0
