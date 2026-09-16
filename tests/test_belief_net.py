import torch

from phantom.cognition.belief_net import BeliefNet, encode_observer_view
from phantom.training import make_belief_example


def test_belief_net_shapes_and_bounds() -> None:
    features, labels, rule = make_belief_example(20260911)
    prediction = BeliefNet()(features.unsqueeze(0))

    assert features.shape == (31,)
    assert labels.shape == rule.shape == (3,)
    assert prediction.shape == (1, 3)
    assert torch.all((prediction >= 0) & (prediction <= 1))
