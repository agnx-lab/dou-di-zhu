"""Safety-gated cognitive action scoring and deterministic re-ranking."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence


CONTROL_VALUES = {14: 1.0, 17: 1.4, 20: 1.8, 30: 2.2}


@dataclass(frozen=True, slots=True)
class CognitiveReranker:
    max_base_value_loss: float = 0.02
    minimum_override_margin: float = 0.0005

    source: str = "phantom_safe_reranker_v1"

    def rerank(
        self,
        rollout: Mapping[str, object],
        *,
        actual_control_strength: float,
        remaining_cards: int,
        style_bait_modifier: float = 1.0,
    ) -> dict[str, object]:
        raw_candidates = list(rollout.get("candidates", []))
        if not raw_candidates:
            raise ValueError("Cannot re-rank an empty candidate list")

        best_base = max(float(item["base_value"]) for item in raw_candidates)
        before = rollout["before"]
        perceived_control = float(before["control_strength"])
        hidden_gap = max(0.0, actual_control_strength - perceived_control)
        scored: list[dict[str, object]] = []
        for item in raw_candidates:
            action = tuple(int(card) for card in item["action_raw"])
            base_value = float(item["base_value"])
            base_loss = max(0.0, best_base - base_value)
            shift = item["shift"]
            concealment_gain = max(0.0, -float(shift["control_strength"]))
            resource_signal = max(
                0.0,
                -float(shift["rocket_probability"]) * 0.55
                - float(shift["bomb_probability"]) * 0.45,
            )
            bait_potential = min(
                1.0,
                (concealment_gain * 0.65 + resource_signal * 0.35)
                * max(0.7, min(1.3, style_bait_modifier)),
            )
            spent_control = sum(CONTROL_VALUES.get(card, 0.0) for card in action)
            future_control_value = max(0.0, 1.0 - spent_control / 6.5)
            finish_delay = max(0.0, float(shift["estimated_turns_to_finish"]))
            pass_risk = 0.35 if not action and remaining_cards <= 6 else 0.0
            strategic_risk = min(
                1.0,
                base_loss / max(self.max_base_value_loss, 1e-9) * 0.55
                + finish_delay * 0.12
                + pass_risk,
            )
            cognitive_gain = (
                concealment_gain * (0.55 + hidden_gap)
                + bait_potential * 0.28
                + future_control_value * hidden_gap * 0.10
            )
            allowed = base_loss <= self.max_base_value_loss + 1e-12
            final_score = (
                base_value
                + 1.75 * cognitive_gain
                + 0.004 * future_control_value
                - 0.012 * strategic_risk
            ) if allowed else float("-inf")
            scored.append(
                {
                    **item,
                    "base_loss": round(base_loss, 6),
                    "concealment_gain": round(concealment_gain, 6),
                    "bait_potential": round(bait_potential, 6),
                    "future_control_value": round(future_control_value, 6),
                    "strategic_risk": round(strategic_risk, 6),
                    "cognitive_gain": round(cognitive_gain, 6),
                    "final_score": round(final_score, 6) if allowed else None,
                    "allowed_by_safety_gate": allowed,
                    "veto_reason": None if allowed else "base_value_loss_too_high",
                }
            )

        allowed_candidates = [item for item in scored if item["allowed_by_safety_gate"]]
        selected = max(
            allowed_candidates,
            key=lambda item: (float(item["final_score"]), -int(item["base_rank"])),
        )
        base_choice = min(scored, key=lambda item: int(item["base_rank"]))
        override = (
            int(selected["base_rank"]) != 1
            and float(selected["final_score"]) >= float(base_choice["final_score"])
            + self.minimum_override_margin
            and float(selected["cognitive_gain"]) > 0.005
        )
        if not override:
            selected = base_choice

        reason = "base_policy_retained"
        if override:
            reason = (
                "hidden_strength"
                if float(selected["concealment_gain"]) >= float(selected["bait_potential"]) * 0.5
                else "tempo_bait"
            )
        for item in scored:
            item["selected"] = item is selected
        return {
            "status": "selected",
            "source": self.source,
            "max_base_value_loss": self.max_base_value_loss,
            "best_base_value": round(best_base, 6),
            "selected_action_raw": list(selected["action_raw"]),
            "selected_base_value": selected["base_value"],
            "selected_final_score": selected["final_score"],
            "selected_base_loss": selected["base_loss"],
            "base_value_retention": round(
                _safe_retention(float(selected["base_value"]), best_base), 6
            ),
            "override": override,
            "reason": reason,
            "hidden_strength_gap": round(hidden_gap, 6),
            "candidates": scored,
        }


def _safe_retention(selected: float, best: float) -> float:
    if abs(best) < 1e-9:
        return 1.0 if abs(selected - best) < 1e-9 else 0.0
    return max(0.0, min(1.0, selected / best)) if best > 0 else max(
        0.0, min(1.0, 1.0 - (best - selected) / max(abs(best), 1.0))
    )
