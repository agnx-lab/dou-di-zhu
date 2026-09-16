from collections import Counter

import pytest
from douzero.env.env import deck

from phantom.cognition import HiddenHandBelief, ParticleBeliefError
from phantom.game.headless import make_deal


def public_start(seed: int = 20260911):
    deal = make_deal(seed)
    return deal, {
        "landlord": [],
        "landlord_up": [],
        "landlord_down": [],
    }, {"landlord": 20, "landlord_up": 17, "landlord_down": 17}


def test_initial_particles_obey_counts_and_card_conservation() -> None:
    deal, played, remaining = public_start()
    belief = HiddenHandBelief(num_particles=256, seed=77)
    belief.initialize(
        own_cards=deal["landlord"], played_cards=played, remaining=remaining
    )

    known = Counter(deal["landlord"])
    for particle in belief.particles:
        assert tuple(map(len, particle.hands)) == (17, 17)
        assert Counter(particle.hands[0]) + Counter(particle.hands[1]) + known == Counter(deck)
    assert belief.health()["ess"] == 256.0


def test_action_filter_updates_every_particle_without_leaking_true_hand() -> None:
    deal, played, remaining = public_start()
    belief = HiddenHandBelief(num_particles=512, seed=31)
    belief.initialize(
        own_cards=deal["landlord"], played_cards=played, remaining=remaining
    )

    action = [deal["landlord_up"][0]]
    played["landlord_up"] = action.copy()
    remaining["landlord_up"] -= 1
    belief.observe_action(
        actor="landlord_up",
        action=action,
        own_cards=deal["landlord"],
        played_cards=played,
        remaining=remaining,
    )

    assert len(belief.particles) == 512
    assert all(tuple(map(len, particle.hands)) == (17, 16) for particle in belief.particles)
    assert 0.0 <= belief.invalid_rate < 1.0
    assert belief.resample_count == 1


def test_particle_sampling_and_update_are_seed_deterministic() -> None:
    deal, played, remaining = public_start()
    beliefs = [HiddenHandBelief(num_particles=32, seed=9001) for _ in range(2)]
    for belief in beliefs:
        belief.initialize(
            own_cards=deal["landlord"], played_cards=played, remaining=remaining
        )
    assert beliefs[0].particles == beliefs[1].particles
    assert beliefs[0].features() == beliefs[1].features()


def test_invalid_public_state_is_rejected() -> None:
    deal, played, remaining = public_start()
    remaining["landlord_up"] = 16
    with pytest.raises(ParticleBeliefError, match="Hidden-card count mismatch"):
        HiddenHandBelief(num_particles=8).initialize(
            own_cards=deal["landlord"], played_cards=played, remaining=remaining
        )


def test_feature_probabilities_are_bounded() -> None:
    deal, played, remaining = public_start()
    belief = HiddenHandBelief(num_particles=128, seed=18)
    belief.initialize(
        own_cards=deal["landlord"], played_cards=played, remaining=remaining
    )
    for features in belief.features().values():
        assert 0.0 <= features["rocket_probability"] <= 1.0
        assert 0.0 <= features["bomb_probability"] <= 1.0
        assert all(0.0 <= value <= 1.0 for value in features["rank_presence"].values())
