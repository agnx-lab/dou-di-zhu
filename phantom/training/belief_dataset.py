"""Deterministic self-deal examples for the optional neural belief estimator."""

from __future__ import annotations

from collections import Counter

import torch

from phantom.cognition.belief_net import encode_observer_view
from phantom.cognition.opponent_belief import OpponentBeliefEstimator
from phantom.game import make_deal


def make_belief_example(seed: int) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    deal = make_deal(seed)
    target = deal["landlord"]
    observer = deal["landlord_up"]
    revealed = deal["three_landlord_cards"]
    counts = Counter(target)
    control = sum({14: 1.0, 17: 1.4, 20: 1.8, 30: 2.2}.get(card, 0.0) for card in target)
    labels = torch.tensor(
        [
            float(bool(counts[20] and counts[30])),
            float(any(counts[rank] == 4 for rank in range(3, 18))),
            min(1.0, control / 6.5),
        ],
        dtype=torch.float32,
    )
    estimator = OpponentBeliefEstimator(
        target="landlord", revealed_target_cards=revealed
    )
    rule = estimator._features_from_view(
        observer_hand=observer,
        known_target=revealed,
        played_cards={"landlord": [], "landlord_up": [], "landlord_down": []},
        remaining={"landlord": 20, "landlord_up": 17, "landlord_down": 17},
    )
    rule_prediction = torch.tensor(
        [rule["rocket_probability"], rule["bomb_probability"], rule["control_strength"]],
        dtype=torch.float32,
    )
    return encode_observer_view(observer, revealed), labels, rule_prediction
