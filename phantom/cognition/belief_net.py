"""A deliberately small offline belief network used for rule-vs-model evaluation."""

from __future__ import annotations

from collections import Counter
from typing import Sequence

import torch
from torch import nn


RANKS = (3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 20, 30)


def encode_observer_view(
    observer_hand: Sequence[int], revealed_landlord_cards: Sequence[int]
) -> torch.Tensor:
    observer = Counter(observer_hand)
    revealed = Counter(revealed_landlord_cards)
    values = [observer[rank] / 4.0 for rank in RANKS]
    values.extend(revealed[rank] / 3.0 for rank in RANKS)
    values.append(len(observer_hand) / 20.0)
    return torch.tensor(values, dtype=torch.float32)


class BeliefNet(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(31, 48),
            nn.SiLU(),
            nn.Linear(48, 24),
            nn.SiLU(),
            nn.Linear(24, 3),
            nn.Sigmoid(),
        )

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        return self.network(features)
