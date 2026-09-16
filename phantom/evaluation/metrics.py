"""Live metrics proving cognitive play remains close to the base policy."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class SessionMetrics:
    decisions: int = 0
    overrides: int = 0
    base_retentions: list[float] = field(default_factory=list)
    base_sacrifices: list[float] = field(default_factory=list)
    belief_shifts: list[float] = field(default_factory=list)
    rollout_latencies_ms: list[float] = field(default_factory=list)
    trap_activations: int = 0
    trap_successes: int = 0
    control_resources_induced: int = 0
    _seen_transitions: int = 0

    def record_decision(
        self, decision: dict[str, object], rollout: dict[str, object] | None
    ) -> None:
        self.decisions += 1
        self.overrides += int(bool(decision.get("override")))
        self.base_retentions.append(float(decision.get("base_value_retention", 1.0)))
        self.base_sacrifices.append(float(decision.get("selected_base_loss", 0.0)))
        if rollout is not None:
            self.rollout_latencies_ms.append(float(rollout.get("latency_ms", 0.0)))
        selected = next(
            (item for item in decision.get("candidates", []) if item.get("selected")),
            None,
        )
        if selected is not None:
            self.belief_shifts.append(
                abs(float(selected["shift"]["control_strength"]))
            )

    def record_state(self, state_snapshot: dict[str, object]) -> None:
        timeline = list(state_snapshot.get("timeline", []))
        transition_count = int(state_snapshot.get("transition_count", len(timeline)))
        new_count = max(0, transition_count - self._seen_transitions)
        for transition in timeline[-new_count:] if new_count else []:
            destination = transition.get("to")
            reason = transition.get("reason")
            self.trap_activations += int(destination == "TRAP_READY")
            self.trap_successes += int(destination == "EXPLOIT")
            self.control_resources_induced += int(
                destination == "TRAP_READY" and reason == "control_resource_committed"
            )
        self._seen_transitions = transition_count

    def snapshot(self) -> dict[str, object]:
        return {
            "decisions": self.decisions,
            "cognitive_overrides": self.overrides,
            "cognitive_override_rate": _mean_ratio(self.overrides, self.decisions),
            "base_value_retention": _mean(self.base_retentions, default=1.0),
            "average_value_sacrifice": _mean(self.base_sacrifices),
            "average_belief_shift": _mean(self.belief_shifts),
            "trap_activations": self.trap_activations,
            "trap_successes": self.trap_successes,
            "control_resources_induced": self.control_resources_induced,
            "average_rollout_latency_ms": _mean(self.rollout_latencies_ms),
            "max_rollout_latency_ms": max(self.rollout_latencies_ms, default=0.0),
        }


def _mean(values: list[float], default: float = 0.0) -> float:
    return round(sum(values) / len(values), 6) if values else default


def _mean_ratio(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 6) if denominator else 0.0
