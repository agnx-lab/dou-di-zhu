from phantom.cognition import HiddenHandBelief, OpponentBeliefEstimator
from phantom.game.headless import make_deal


POSITIONS = ("landlord", "landlord_up", "landlord_down")


def _public_start(seed: int):
    deal = make_deal(seed)
    played = {position: [] for position in POSITIONS}
    remaining = {"landlord": 20, "landlord_up": 17, "landlord_down": 17}
    particles = HiddenHandBelief(num_particles=256, seed=seed)
    particles.initialize(
        own_cards=deal["landlord"], played_cards=played, remaining=remaining
    )
    estimator = OpponentBeliefEstimator(
        target="landlord", revealed_target_cards=deal["three_landlord_cards"]
    )
    return deal, played, remaining, particles, estimator


def test_rule_belief_returns_bounded_estimates_for_both_opponents() -> None:
    deal, played, remaining, particles, estimator = _public_start(20260911)
    result = estimator.estimate(
        particles=particles,
        target_cards_for_truth=deal["landlord"],
        played_cards=played,
        remaining=remaining,
    )

    assert result["status"] == "estimated"
    assert result["source"] == "phantom_rule_opponent_belief_v1"
    assert set(result["observers"]) == {"landlord_up", "landlord_down"}
    for view in (*result["observers"].values(), result["consensus"]):
        assert 0.0 <= view["rocket_probability"] <= 1.0
        assert 0.0 <= view["bomb_probability"] <= 1.0
        assert 0.0 <= view["control_strength"] <= 1.0
        assert view["estimated_turns_to_finish"] >= 0


def test_public_rocket_play_removes_rocket_from_estimated_and_real_state() -> None:
    deal, played, remaining, particles, estimator = _public_start(4)
    before = estimator.estimate(
        particles=particles,
        target_cards_for_truth=deal["landlord"],
        played_cards=played,
        remaining=remaining,
    )
    assert before["actual_state"]["rocket_probability"] == 1.0

    action = [20, 30]
    current_hand = deal["landlord"].copy()
    current_hand.remove(20)
    current_hand.remove(30)
    played["landlord"] = action
    remaining["landlord"] = 18
    particles.observe_action(
        actor="landlord",
        action=action,
        own_cards=current_hand,
        played_cards=played,
        remaining=remaining,
    )
    estimator.observe_action(actor="landlord", action=action)
    after = estimator.estimate(
        particles=particles,
        target_cards_for_truth=current_hand,
        played_cards=played,
        remaining=remaining,
    )

    assert after["consensus"]["rocket_probability"] == 0.0
    assert after["actual_state"]["rocket_probability"] == 0.0
    assert after["evidence_actions"] == 1


def test_opponent_belief_is_seed_reproducible() -> None:
    outputs = []
    for _ in range(2):
        deal, played, remaining, particles, estimator = _public_start(111)
        outputs.append(estimator.estimate(
            particles=particles,
            target_cards_for_truth=deal["landlord"],
            played_cards=played,
            remaining=remaining,
        ))
    assert outputs[0] == outputs[1]
