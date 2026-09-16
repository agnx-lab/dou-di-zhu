"""Translate an unmodified DouZero game into source-tagged public events."""

from __future__ import annotations

from pathlib import Path
import time
from typing import Callable, Iterator, Mapping

from douzero.env.game import EnvCard2RealCard, GameEnv

from phantom.base import ActionScore, DouZeroAdapter
from phantom.cognition import (
    CounterfactualBeliefRollout,
    HiddenHandBelief,
    OpponentBeliefEstimator,
    RolloutCandidate,
)
from phantom.game import classify_move
from phantom.game.headless import DEFAULT_SEED, POSITIONS, make_deal
from phantom.evaluation import SessionMetrics
from phantom.strategy import CognitiveReranker, CognitiveStateMachine


def _labels(cards: list[int] | tuple[int, ...]) -> list[str]:
    return [EnvCard2RealCard[card] for card in cards]


class _BridgeAgent:
    def __init__(self, adapter: DouZeroAdapter) -> None:
        self.adapter = adapter
        self.last_scores: list[ActionScore] = []
        self.last_selected: ActionScore | None = None
        self.last_latency_ms = 0.0
        self.selector: Callable[[list[ActionScore]], list[int]] | None = None
        self.pending_action: list[int] | None = None
        self.precomputed_scores: list[ActionScore] | None = None

    def act(self, infoset: object) -> list[int]:
        started = time.perf_counter()
        self.last_scores = (
            self.precomputed_scores
            if self.precomputed_scores is not None
            else self.adapter.score_legal_actions(infoset)
        )
        self.precomputed_scores = None
        self.last_latency_ms = (time.perf_counter() - started) * 1000
        if self.pending_action is not None:
            action = self.pending_action
            self.pending_action = None
        elif self.selector is not None:
            action = self.selector(self.last_scores)
        else:
            action = list(self.last_scores[0].action)
        self.last_selected = next(
            score for score in self.last_scores if list(score.action) == action
        )
        return action


class RealGameSession:
    """A deterministic, auditable all-DouZero showcase session."""

    def __init__(
        self,
        model_dir: str | Path,
        *,
        seed: int = DEFAULT_SEED,
        device: str = "cpu",
        human_controlled: bool = False,
        style_bait_modifier: float = 1.0,
        human_profile: Mapping[str, object] | None = None,
    ) -> None:
        self.seed = seed
        self.human_controlled = human_controlled
        self.style_bait_modifier = max(0.75, min(1.25, style_bait_modifier))
        self.human_profile = dict(human_profile or {})
        self.adaptation_strength = max(
            0.0, min(0.8, float(self.human_profile.get("adaptation_strength", 0.0)))
        )
        self.adaptive_choices = 0
        self.source = "douzero_adp_checkpoint"
        self.deal = make_deal(seed)
        model_dir = Path(model_dir)
        self.agents = {
            position: _BridgeAgent(
                DouZeroAdapter(position, model_dir / f"{position}.ckpt", device=device)
            )
            for position in POSITIONS
        }
        self.env = GameEnv(self.agents)
        self.env.card_play_init({key: value.copy() for key, value in self.deal.items()})
        if human_controlled and self.adaptation_strength > 0:
            self.agents["landlord_up"].selector = self._select_adaptive_farmer_action
            self.agents["landlord_down"].selector = self._select_adaptive_farmer_action
        self.hidden_hand_belief = HiddenHandBelief(
            observer="landlord", num_particles=512, seed=seed
        )
        self.hidden_hand_belief.initialize(**self._belief_inputs())
        self.opponent_belief = OpponentBeliefEstimator(
            target="landlord",
            revealed_target_cards=self.deal["three_landlord_cards"],
        )
        self.counterfactual = CounterfactualBeliefRollout(top_k=3)
        self.reranker = CognitiveReranker(max_base_value_loss=0.02)
        self.cognitive_state = CognitiveStateMachine()
        self.metrics = SessionMetrics()
        self.last_counterfactual_rollout: dict[str, object] | None = None
        self.last_cognitive_decision: dict[str, object] | None = None
        if not human_controlled:
            self.agents["landlord"].selector = self._select_phantom_action
        self.turn = 0
        self.human_actions_taken = 0
        self.non_pass_actions = {position: 0 for position in POSITIONS}

    def _select_adaptive_farmer_action(self, scores: list[ActionScore]) -> list[int]:
        """Safely adapt close-valued farmer choices to observed human habits.

        DouZero remains authoritative.  The learned layer may only break ties
        between its top five actions inside a small value-loss envelope.
        """
        base = scores[0]
        margin = 0.012 * self.adaptation_strength
        safe = [
            score for score in scores[:5]
            if base.base_value - score.base_value <= margin
        ]
        if len(safe) == 1:
            return list(base.action)

        pass_rate = float(self.human_profile.get("pass_rate", 0.0))
        early_high = float(self.human_profile.get("high_card_early_rate", 0.0))
        initiative = float(self.human_profile.get("initiative_aggression", 0.0))
        landlord_remaining = len(self.env.info_sets["landlord"].player_hand_cards)
        endgame = landlord_remaining <= 7

        def adapted_score(score: ActionScore) -> float:
            action = score.action
            pressure = min(len(action), 8) / 8
            high_cards = sum(card >= 14 for card in action)
            preference = 0.0
            if action:
                preference += pass_rate * 0.004
                preference += initiative * pressure * 0.003
            else:
                preference -= pass_rate * 0.004
            if endgame:
                preference += pressure * 0.005 + high_cards * 0.0015
            elif early_high > 0.18:
                preference -= high_cards * early_high * 0.0015
            return score.base_value + preference * self.adaptation_strength

        selected = max(safe, key=adapted_score)
        if selected.action != base.action:
            self.adaptive_choices += 1
        return list(selected.action)

    def _belief_inputs(self) -> dict[str, object]:
        env = self.env
        return {
            "own_cards": list(env.info_sets["landlord"].player_hand_cards),
            "played_cards": {
                position: list(env.played_cards[position]) for position in POSITIONS
            },
            "remaining": {
                position: len(env.info_sets[position].player_hand_cards)
                for position in POSITIONS
            },
        }

    def _belief_state(self) -> dict[str, object]:
        return {
            "status": "active",
            "health": self.hidden_hand_belief.health(),
            "features": self.hidden_hand_belief.features(),
        }

    def _opponent_belief_state(self) -> dict[str, object]:
        inputs = self._belief_inputs()
        return self.opponent_belief.estimate(
            particles=self.hidden_hand_belief,
            target_cards_for_truth=inputs["own_cards"],
            played_cards=inputs["played_cards"],
            remaining=inputs["remaining"],
        )

    def _counterfactual_payload(self, payload: dict[str, object]) -> dict[str, object]:
        return {
            **{key: value for key, value in payload.items() if key != "before_estimate"},
            "candidates": [
                {
                    **candidate,
                    "action": _labels(candidate["action_raw"]),
                }
                for candidate in payload["candidates"]
            ],
        }

    def _decision_payload(self, payload: dict[str, object]) -> dict[str, object]:
        return {
            **payload,
            "selected_action": _labels(payload["selected_action_raw"]),
            "candidates": [
                {**candidate, "action": _labels(candidate["action_raw"])}
                for candidate in payload["candidates"]
            ],
        }

    def _select_phantom_action(self, scores: list[ActionScore]) -> list[int]:
        try:
            rollout, decision, _current_belief = self._evaluate_phantom_candidates(scores)
            self.last_counterfactual_rollout = self._counterfactual_payload(rollout)
            self.last_cognitive_decision = self._decision_payload(decision)
            self.cognitive_state.on_phantom_decision(decision)
            self.metrics.record_decision(decision, rollout)
            self.metrics.record_state(self.cognitive_state.snapshot())
            return list(decision["selected_action_raw"])
        except Exception as error:
            fallback = {
                "status": "fallback",
                "source": "douzero_base_fallback",
                "fallback": True,
                "reason": "cognitive_module_error",
                "message": str(error),
                "selected_action_raw": list(scores[0].action),
                "selected_action": _labels(scores[0].action),
                "selected_base_value": scores[0].base_value,
                "best_base_value": scores[0].base_value,
                "base_value_retention": 1.0,
                "override": False,
                "candidates": [],
            }
            self.last_cognitive_decision = fallback
            self.cognitive_state.on_phantom_decision(fallback)
            self.metrics.record_decision(fallback, None)
            self.metrics.record_state(self.cognitive_state.snapshot())
            return list(scores[0].action)

    def _evaluate_phantom_candidates(
        self, scores: list[ActionScore]
    ) -> tuple[dict[str, object], dict[str, object], dict[str, object]]:
        inputs = self._belief_inputs()
        rollout = self.counterfactual.evaluate(
            estimator=self.opponent_belief,
            particles=self.hidden_hand_belief,
            target_cards=inputs["own_cards"],
            played_cards=inputs["played_cards"],
            remaining=inputs["remaining"],
            candidates=[
                RolloutCandidate(
                    action=score.action,
                    base_value=score.base_value,
                    base_rank=score.rank,
                )
                for score in scores
            ],
        )
        current_belief = rollout["before_estimate"]
        decision = self.reranker.rerank(
            rollout,
            actual_control_strength=float(
                current_belief["actual_state"]["control_strength"]
            ),
            remaining_cards=int(inputs["remaining"]["landlord"]),
            style_bait_modifier=self.style_bait_modifier,
        )
        return rollout, decision, current_belief

    def human_turn_event(self) -> dict[str, object]:
        if not self.human_controlled or self.env.acting_player_position != "landlord":
            raise RuntimeError("Human action requested outside the local player turn")
        infoset = self.env.game_infoset
        scores = self.agents["landlord"].adapter.score_legal_actions(infoset)
        self.agents["landlord"].precomputed_scores = scores
        rollout, advice, current_belief = self._evaluate_phantom_candidates(scores)
        self.last_counterfactual_rollout = self._counterfactual_payload(rollout)
        self.last_cognitive_decision = self._decision_payload(advice)
        return {
            "type": "human_turn",
            "schema": "phantom.game.v1",
            "mode": "real",
            "source": "local_human_session",
            "seed": self.seed,
            "turn": self.turn + 1,
            "human_actions_taken": self.human_actions_taken,
            "actor": "landlord",
            "legal_actions": [_labels(score.action) for score in scores],
            "legal_action_count": len(scores),
            "scored_action_count": len(scores),
            "recommended_action": _labels(advice["selected_action_raw"]),
            "recommended_action_type": classify_move(
                advice["selected_action_raw"]
            ).label,
            "counterfactual_rollout": self.last_counterfactual_rollout,
            "cognitive_decision": self.last_cognitive_decision,
            "opponent_belief": current_belief,
            "hidden_hand_belief": self._belief_state(),
            "cognitive_state": self.cognitive_state.snapshot(),
            "metrics": self.metrics.snapshot(),
            "style_bait_modifier": self.style_bait_modifier,
            "adaptation_strength": self.adaptation_strength,
            "adaptive_choices": self.adaptive_choices,
            "state": self._public_state(),
        }

    def _public_state(self) -> dict[str, object]:
        env = self.env
        remaining = {
            position: len(env.info_sets[position].player_hand_cards)
            for position in POSITIONS
        }
        played = {
            position: _labels(env.played_cards[position])
            for position in POSITIONS
        }
        last_move_raw = env.get_last_move()
        spring = False
        if env.game_over:
            winner = env.get_winner()
            spring = (
                winner == "landlord"
                and self.non_pass_actions["landlord_up"]
                + self.non_pass_actions["landlord_down"]
                == 0
            ) or (
                winner == "farmer" and self.non_pass_actions["landlord"] == 1
            )
        multiplier = (2 ** env.get_bomb_num()) * (2 if spring else 1)
        landlord_score = 2 * multiplier
        farmer_score = multiplier
        if env.game_over and env.get_winner() == "farmer":
            landlord_score *= -1
        elif env.game_over:
            farmer_score *= -1
        return {
            "phantom_hand": _labels(env.info_sets["landlord"].player_hand_cards),
            "remaining": remaining,
            "played_cards": played,
            "landlord_cards": _labels(self.deal["three_landlord_cards"]),
            "active_player": None if env.game_over else env.acting_player_position,
            "bombs_played": env.get_bomb_num(),
            "multiplier": multiplier,
            "spring": spring,
            "score": {
                "landlord": landlord_score if env.game_over else 0,
                "farmer_each": farmer_score if env.game_over else 0,
            },
            "last_move": _labels(last_move_raw),
            "last_move_player": env.last_pid if last_move_raw else None,
            "last_move_type": classify_move(last_move_raw).label,
            "has_initiative": (
                False
                if env.game_over
                else [] not in env.game_infoset.legal_actions
            ),
            "cards_accounted_for": sum(remaining.values())
            + sum(len(cards) for cards in played.values()),
        }

    def initial_event(self) -> dict[str, object]:
        return {
            "type": "session_started",
            "schema": "phantom.game.v1",
            "mode": "real",
            "source": self.source,
            "seed": self.seed,
            "turn": 0,
            "human_actions_taken": self.human_actions_taken,
            "cognitive_layer": "active",
            "action_reranking": "active",
            "hidden_hand_belief": self._belief_state(),
            "opponent_belief": self._opponent_belief_state(),
            "counterfactual_rollout": None,
            "cognitive_decision": None,
            "cognitive_state": self.cognitive_state.snapshot(),
            "metrics": self.metrics.snapshot(),
            "style_bait_modifier": self.style_bait_modifier,
            "adaptation_strength": self.adaptation_strength,
            "adaptive_choices": self.adaptive_choices,
            "state": self._public_state(),
        }

    def step(self, human_action: list[int] | None = None) -> dict[str, object]:
        if self.env.game_over:
            raise RuntimeError("Cannot step a completed game")

        actor = self.env.acting_player_position
        infoset = self.env.game_infoset
        if self.human_controlled and actor == "landlord":
            if human_action is None or human_action not in infoset.legal_actions:
                raise ValueError("Human action is not legal in the current state")
            self.agents["landlord"].pending_action = list(human_action)
            self.human_actions_taken += 1
        elif human_action is not None:
            raise ValueError("Human action supplied outside the local player turn")
        legal_action_count = len(infoset.legal_actions)
        self.env.step()
        self.turn += 1
        agent = self.agents[actor]
        selected = agent.last_selected
        if selected is None:
            raise AssertionError("Bridge agent did not record its selected action")
        if list(selected.action) not in infoset.legal_actions:
            raise AssertionError("Bridge observed an illegal selected action")
        if selected.action:
            self.non_pass_actions[actor] += 1

        if actor != "landlord":
            self.cognitive_state.on_opponent_action(selected.action)
            self.metrics.record_state(self.cognitive_state.snapshot())

        self.hidden_hand_belief.observe_action(
            actor=actor,
            action=selected.action,
            **self._belief_inputs(),
        )
        self.opponent_belief.observe_action(
            actor=actor,
            action=selected.action,
            is_pass=len(selected.action) == 0,
        )

        state = self._public_state()
        if state["cards_accounted_for"] != 54:
            raise AssertionError("Bridge card conservation failed")

        return {
            "type": "game_finished" if self.env.game_over else "turn_resolved",
            "schema": "phantom.game.v1",
            "mode": "real",
            "source": self.source,
            "seed": self.seed,
            "turn": self.turn,
            "human_actions_taken": self.human_actions_taken,
            "actor": actor,
            "action": _labels(selected.action),
            "action_raw": list(selected.action),
            "action_type": classify_move(selected.action).label,
            "is_pass": len(selected.action) == 0,
            "selected_base_value": selected.base_value,
            "legal_action_count": legal_action_count,
            "scored_action_count": len(agent.last_scores),
            "decision_latency_ms": round(agent.last_latency_ms, 3),
            "candidates": [score.as_dict() for score in agent.last_scores[:5]],
            "winner": self.env.get_winner() if self.env.game_over else None,
            "cognitive_layer": "active",
            "action_reranking": "active",
            "hidden_hand_belief": self._belief_state(),
            "opponent_belief": self._opponent_belief_state(),
            "counterfactual_rollout": self.last_counterfactual_rollout,
            "cognitive_decision": self.last_cognitive_decision,
            "cognitive_state": self.cognitive_state.snapshot(),
            "action_source": (
                "local_human"
                if actor == "landlord" and self.human_controlled
                else self.last_cognitive_decision["source"]
                if actor == "landlord" and self.last_cognitive_decision
                else self.source
            ),
            "metrics": self.metrics.snapshot(),
            "style_bait_modifier": self.style_bait_modifier,
            "adaptation_strength": self.adaptation_strength,
            "adaptive_choices": self.adaptive_choices,
            "state": state,
        }

    def events(self, max_turns: int = 300) -> Iterator[dict[str, object]]:
        yield self.initial_event()
        while not self.env.game_over:
            if self.turn >= max_turns:
                raise RuntimeError(f"Game exceeded {max_turns} turns")
            yield self.step()
