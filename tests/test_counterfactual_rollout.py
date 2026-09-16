from phantom.cognition import (
    CounterfactualBeliefRollout,
    HiddenHandBelief,
    OpponentBeliefEstimator,
    RolloutCandidate,
)
from phantom.game.headless import make_deal


POSITIONS = ("landlord", "landlord_up", "landlord_down")


def test_counterfactual_candidates_change_belief_without_mutating_live_state() -> None:
    deal = make_deal(4)
    played = {position: [] for position in POSITIONS}
    remaining = {"landlord": 20, "landlord_up": 17, "landlord_down": 17}
    particles = HiddenHandBelief(num_particles=256, seed=4)
    particles.initialize(
        own_cards=deal["landlord"], played_cards=played, remaining=remaining
    )
    estimator = OpponentBeliefEstimator(
        target="landlord", revealed_target_cards=deal["three_landlord_cards"]
    )
    rollout = CounterfactualBeliefRollout(top_k=3)

    result = rollout.evaluate(
        estimator=estimator,
        particles=particles,
        target_cards=deal["landlord"],
        played_cards=played,
        remaining=remaining,
        candidates=[
            RolloutCandidate(action=(), base_value=0.8, base_rank=1),
            RolloutCandidate(action=(20, 30), base_value=0.79, base_rank=2),
        ],
    )

    assert result["status"] == "simulated"
    assert result["source"] == "phantom_counterfactual_rollout_v1"
    assert result["top_k"] == 2
    assert result["candidates"][0]["shift"]["control_strength"] < 0
    assert result["candidates"][1]["after"]["rocket_probability"] == 0.0
    assert result["candidates"][0]["selected_by_base"] is True
    assert estimator.history == []
    assert played == {position: [] for position in POSITIONS}
    assert remaining["landlord"] == 20


def test_counterfactual_rollout_is_deterministic() -> None:
    outputs = []
    for _ in range(2):
        deal = make_deal(20260911)
        played = {position: [] for position in POSITIONS}
        remaining = {"landlord": 20, "landlord_up": 17, "landlord_down": 17}
        particles = HiddenHandBelief(num_particles=64, seed=99)
        particles.initialize(
            own_cards=deal["landlord"], played_cards=played, remaining=remaining
        )
        estimator = OpponentBeliefEstimator(
            target="landlord", revealed_target_cards=deal["three_landlord_cards"]
        )
        result = CounterfactualBeliefRollout(top_k=1).evaluate(
            estimator=estimator,
            particles=particles,
            target_cards=deal["landlord"],
            played_cards=played,
            remaining=remaining,
            candidates=[RolloutCandidate(action=(), base_value=0.5, base_rank=1)],
        )
        result.pop("latency_ms")
        outputs.append(result)
    assert outputs[0] == outputs[1]
