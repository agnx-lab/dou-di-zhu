"""Deterministic particle belief over the two opponents' hidden hands.

The engine only consumes information available to the observer: its own hand,
publicly played cards, public remaining-card counts, and observed actions.  It
never reads either opponent's actual hand from the game environment.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import math
import random
from typing import Callable, Mapping, Sequence

from douzero.env.env import deck


POSITIONS = ("landlord", "landlord_down", "landlord_up")
Likelihood = Callable[[str, tuple[int, ...], tuple[int, ...]], float]


class ParticleBeliefError(ValueError):
    """Raised when public observations violate card or seat constraints."""


@dataclass(frozen=True, slots=True)
class Particle:
    """One possible allocation of every currently hidden card."""

    hands: tuple[tuple[int, ...], tuple[int, ...]]
    weight: float


class HiddenHandBelief:
    """Bootstrap particle filter for a single player's hidden-hand belief."""

    source = "phantom_hidden_hand_particles_v1"

    def __init__(
        self,
        *,
        observer: str = "landlord",
        num_particles: int = 512,
        seed: int = 20260911,
        likelihood: Likelihood | None = None,
    ) -> None:
        if observer not in POSITIONS:
            raise ParticleBeliefError(f"Unknown observer position: {observer}")
        if num_particles < 1:
            raise ParticleBeliefError("num_particles must be positive")
        self.observer = observer
        self.opponents = tuple(position for position in POSITIONS if position != observer)
        self.num_particles = num_particles
        self._rng = random.Random(seed)
        self._likelihood = likelihood
        self.particles: list[Particle] = []
        self.invalid_rate = 0.0
        self.effective_sample_size = 0.0
        self.resample_count = 0

    def initialize(
        self,
        *,
        own_cards: Sequence[int],
        played_cards: Mapping[str, Sequence[int]],
        remaining: Mapping[str, int],
    ) -> None:
        """Sample allocations that satisfy all currently public constraints."""

        hidden = self._hidden_pool(own_cards, played_cards, remaining)
        first_count = remaining[self.opponents[0]]
        weight = 1.0 / self.num_particles
        particles: list[Particle] = []
        for _ in range(self.num_particles):
            sample = hidden.copy()
            self._rng.shuffle(sample)
            hands = (
                tuple(sorted(sample[:first_count])),
                tuple(sorted(sample[first_count:])),
            )
            particles.append(Particle(hands=hands, weight=weight))
        self.particles = particles
        self.invalid_rate = 0.0
        self.effective_sample_size = float(self.num_particles)
        self._assert_particles(own_cards, played_cards, remaining)

    def observe_action(
        self,
        *,
        actor: str,
        action: Sequence[int],
        own_cards: Sequence[int],
        played_cards: Mapping[str, Sequence[int]],
        remaining: Mapping[str, int],
    ) -> None:
        """Filter, weight, normalize, and resample after one public action."""

        if not self.particles:
            raise ParticleBeliefError("Belief must be initialized before updates")
        if actor not in POSITIONS:
            raise ParticleBeliefError(f"Unknown actor position: {actor}")

        action_tuple = tuple(sorted(action))
        survivors: list[Particle] = []
        invalid = 0
        for particle in self.particles:
            hands = [list(particle.hands[0]), list(particle.hands[1])]
            likelihood = 1.0
            if actor in self.opponents:
                opponent_index = self.opponents.index(actor)
                if not _remove_cards(hands[opponent_index], action_tuple):
                    invalid += 1
                    continue
                if self._likelihood is not None:
                    prior_hand = tuple(sorted((*hands[opponent_index], *action_tuple)))
                    likelihood = self._likelihood(actor, prior_hand, action_tuple)
                    if not math.isfinite(likelihood) or likelihood <= 0:
                        invalid += 1
                        continue

            normalized_hands = (tuple(sorted(hands[0])), tuple(sorted(hands[1])))
            if any(
                len(normalized_hands[index]) != remaining[position]
                for index, position in enumerate(self.opponents)
            ):
                invalid += 1
                continue
            survivors.append(
                Particle(hands=normalized_hands, weight=particle.weight * likelihood)
            )

        self.invalid_rate = invalid / len(self.particles)
        if not survivors:
            # A finite bootstrap set can miss a rare conditional allocation.
            # Reconstructing from the updated public state is safe and does not
            # reveal either opponent's real hand.
            self.initialize(
                own_cards=own_cards,
                played_cards=played_cards,
                remaining=remaining,
            )
            self.invalid_rate = 1.0
            self.resample_count += 1
            return

        total_weight = sum(particle.weight for particle in survivors)
        if total_weight <= 0 or not math.isfinite(total_weight):
            raise ParticleBeliefError("Particle weights cannot be normalized")
        normalized = [
            Particle(hands=particle.hands, weight=particle.weight / total_weight)
            for particle in survivors
        ]
        self.effective_sample_size = 1.0 / sum(
            particle.weight * particle.weight for particle in normalized
        )
        self.particles = self._systematic_resample(normalized)
        self.resample_count += 1
        self._assert_particles(own_cards, played_cards, remaining)

    def health(self) -> dict[str, object]:
        return {
            "source": self.source,
            "num_particles": len(self.particles),
            "ess": round(self.effective_sample_size, 3),
            "invalid_rate": round(self.invalid_rate, 6),
            "resample_count": self.resample_count,
        }

    def features(self) -> dict[str, dict[str, object]]:
        """Extract stable, non-secret summary features for each opponent."""

        result: dict[str, dict[str, object]] = {}
        for opponent_index, position in enumerate(self.opponents):
            presence = {rank: 0.0 for rank in sorted(set(deck))}
            rocket_probability = 0.0
            bomb_probability = 0.0
            expected_control_cards = 0.0
            for particle in self.particles:
                hand = particle.hands[opponent_index]
                counts = Counter(hand)
                for rank in presence:
                    if counts[rank]:
                        presence[rank] += particle.weight
                if counts[20] and counts[30]:
                    rocket_probability += particle.weight
                if any(count >= 4 for count in counts.values()):
                    bomb_probability += particle.weight
                expected_control_cards += particle.weight * sum(
                    count for rank, count in counts.items() if rank >= 14
                )
            result[position] = {
                "rank_presence": {
                    str(rank): round(probability, 6)
                    for rank, probability in presence.items()
                },
                "rocket_probability": round(rocket_probability, 6),
                "bomb_probability": round(bomb_probability, 6),
                "expected_control_cards": round(expected_control_cards, 6),
            }
        return result

    def _hidden_pool(
        self,
        own_cards: Sequence[int],
        played_cards: Mapping[str, Sequence[int]],
        remaining: Mapping[str, int],
    ) -> list[int]:
        for position in POSITIONS:
            if position not in played_cards or position not in remaining:
                raise ParticleBeliefError(f"Missing public state for {position}")
            if remaining[position] < 0:
                raise ParticleBeliefError("Remaining-card counts cannot be negative")

        known = Counter(own_cards)
        for cards in played_cards.values():
            known.update(cards)
        full_deck = Counter(deck)
        if any(known[rank] > full_deck[rank] for rank in known):
            raise ParticleBeliefError("Known cards exceed the Dou Dizhu deck")
        hidden_counter = full_deck - known
        hidden = list(hidden_counter.elements())
        expected = sum(remaining[position] for position in self.opponents)
        if len(hidden) != expected:
            raise ParticleBeliefError(
                f"Hidden-card count mismatch: pool={len(hidden)}, seats={expected}"
            )
        return hidden

    def _systematic_resample(self, particles: Sequence[Particle]) -> list[Particle]:
        step = 1.0 / self.num_particles
        target = self._rng.random() * step
        cumulative = particles[0].weight
        index = 0
        result: list[Particle] = []
        equal_weight = step
        for sample_index in range(self.num_particles):
            point = target + sample_index * step
            while point > cumulative and index < len(particles) - 1:
                index += 1
                cumulative += particles[index].weight
            result.append(Particle(hands=particles[index].hands, weight=equal_weight))
        return result

    def _assert_particles(
        self,
        own_cards: Sequence[int],
        played_cards: Mapping[str, Sequence[int]],
        remaining: Mapping[str, int],
    ) -> None:
        public_known = Counter(own_cards)
        for cards in played_cards.values():
            public_known.update(cards)
        full_deck = Counter(deck)
        for particle in self.particles:
            for index, position in enumerate(self.opponents):
                if len(particle.hands[index]) != remaining[position]:
                    raise AssertionError("Particle remaining-card constraint failed")
            particle_cards = Counter(particle.hands[0]) + Counter(particle.hands[1])
            if particle_cards + public_known != full_deck:
                raise AssertionError("Particle card conservation failed")


def _remove_cards(hand: list[int], action: Sequence[int]) -> bool:
    counts = Counter(hand)
    needed = Counter(action)
    if any(needed[rank] > counts[rank] for rank in needed):
        return False
    for card in action:
        hand.remove(card)
    return True
