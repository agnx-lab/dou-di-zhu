"""Explainable state machine for PHANTOM's first hidden-strength loop."""

from __future__ import annotations

from dataclasses import dataclass, field


STATES = (
    "OBSERVE",
    "OPPORTUNITY",
    "SHAPE",
    "VERIFY",
    "TRAP_READY",
    "EXPLOIT",
    "RECOVER",
    "ABORT",
)


@dataclass(slots=True)
class CognitiveStateMachine:
    state: str = "OBSERVE"
    cycle: int = 0
    response_count: int = 0
    history: list[dict[str, object]] = field(default_factory=list)
    source: str = "phantom_hidden_strength_state_v1"

    def on_phantom_decision(self, decision: dict[str, object]) -> None:
        if decision.get("fallback"):
            self._transition("ABORT", "cognitive_fallback")
            return
        if bool(decision.get("override")):
            if self.state in {"TRAP_READY", "VERIFY"}:
                self._transition("EXPLOIT", str(decision.get("reason")))
            else:
                self._transition("OPPORTUNITY", "safe_cognitive_candidate")
                self._transition("SHAPE", str(decision.get("reason")))
                self.cycle += 1
                self.response_count = 0
        elif self.state == "TRAP_READY":
            self._transition("EXPLOIT", "base_action_recaptures_control")
        elif self.state == "EXPLOIT":
            self._transition("RECOVER", "cycle_complete")
        elif self.state in {"RECOVER", "ABORT"}:
            self._transition("OBSERVE", "new_observation_cycle")

    def on_opponent_action(self, action: tuple[int, ...]) -> None:
        if self.state == "SHAPE":
            self._transition("VERIFY", "opponent_response_observed")
        if self.state == "VERIFY":
            self.response_count += 1
            used_control = any(card >= 14 for card in action)
            committed_multi = len(action) >= 2
            if used_control or committed_multi or self.response_count >= 2:
                reason = "control_resource_committed" if used_control else "response_pattern_confirmed"
                self._transition("TRAP_READY", reason)

    def snapshot(self) -> dict[str, object]:
        return {
            "source": self.source,
            "state": self.state,
            "cycle": self.cycle,
            "response_count": self.response_count,
            "transition_count": len(self.history),
            "timeline": self.history[-8:],
        }

    def _transition(self, next_state: str, reason: str) -> None:
        if next_state not in STATES:
            raise ValueError(f"Unknown cognitive state: {next_state}")
        if next_state == self.state:
            return
        self.history.append(
            {"from": self.state, "to": next_state, "reason": reason}
        )
        self.state = next_state
