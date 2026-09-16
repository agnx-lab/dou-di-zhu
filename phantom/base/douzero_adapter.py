"""A read-only adapter that exposes DouZero values for every legal action.

The upstream implementation returns only ``argmax``. PHANTOM keeps upstream
code untouched and performs the value-vector extraction here so later
cognitive layers can safely re-rank a bounded top-k set.
"""

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Literal

import torch

from douzero.dmc.models import model_dict
from douzero.env.env import get_obs
from douzero.env.game import EnvCard2RealCard


Position = Literal["landlord", "landlord_up", "landlord_down"]


@dataclass(frozen=True, slots=True)
class ActionScore:
    """One legal DouZero action and its raw base-policy value."""

    action: tuple[int, ...]
    base_value: float
    rank: int
    source: str

    def as_dict(self) -> dict[str, object]:
        return {
            "action": [EnvCard2RealCard[card] for card in self.action],
            "action_raw": list(self.action),
            "base_value": self.base_value,
            "rank": self.rank,
            "source": self.source,
        }


class DouZeroAdapter:
    """Load an unmodified DouZero checkpoint and score all legal actions."""

    VALID_POSITIONS = frozenset(model_dict)

    def __init__(
        self,
        position: Position,
        model_path: str | Path,
        *,
        device: str = "cpu",
        source: str = "douzero_adp_checkpoint",
    ) -> None:
        if position not in self.VALID_POSITIONS:
            raise ValueError(f"Unsupported DouZero position: {position}")

        self.position = position
        self.model_path = Path(model_path).resolve()
        if not self.model_path.is_file():
            raise FileNotFoundError(f"DouZero checkpoint missing: {self.model_path}")

        if device.startswith("cuda") and not torch.cuda.is_available():
            raise RuntimeError("CUDA was requested but is not available")
        self.device = torch.device(device)
        self.source = source
        self.checkpoint_sha256 = _file_sha256(self.model_path)

        model = model_dict[position]().to(self.device)
        state = torch.load(
            self.model_path,
            map_location=self.device,
            weights_only=True,
        )
        expected = model.state_dict()
        compatible = {key: value for key, value in state.items() if key in expected}
        if set(compatible) != set(expected):
            missing = sorted(set(expected) - set(compatible))
            raise RuntimeError(
                f"Checkpoint is incompatible with {position}; missing {len(missing)} tensors"
            )
        model.load_state_dict(compatible, strict=True)
        model.eval()
        self.model = model

    def score_legal_actions(self, infoset: Any) -> list[ActionScore]:
        """Return all legal actions sorted by descending raw model value."""

        if infoset.player_position != self.position:
            raise ValueError(
                f"Adapter for {self.position} received {infoset.player_position} infoset"
            )
        legal_actions = infoset.legal_actions
        if not legal_actions:
            raise ValueError("Infoset has no legal actions")

        obs = get_obs(infoset)
        z_batch = torch.from_numpy(obs["z_batch"]).float().to(self.device)
        x_batch = torch.from_numpy(obs["x_batch"]).float().to(self.device)
        with torch.inference_mode():
            values = self.model(z_batch, x_batch, return_value=True)["values"]
        raw_values = values.detach().cpu().reshape(-1).tolist()

        if len(raw_values) != len(legal_actions):
            raise RuntimeError(
                "DouZero value vector does not match the legal-action count: "
                f"{len(raw_values)} != {len(legal_actions)}"
            )

        indexed = list(enumerate(zip(legal_actions, raw_values, strict=True)))
        indexed.sort(key=lambda item: (-float(item[1][1]), item[0]))
        return [
            ActionScore(
                action=tuple(action),
                base_value=float(value),
                rank=rank,
                source=self.source,
            )
            for rank, (_, (action, value)) in enumerate(indexed, start=1)
        ]

    def top_k(self, infoset: Any, k: int = 5) -> list[ActionScore]:
        if k < 1:
            raise ValueError("k must be at least 1")
        return self.score_legal_actions(infoset)[:k]

    def act(self, infoset: Any) -> list[int]:
        """Compatibility hook for the upstream GameEnv player interface."""

        return list(self.score_legal_actions(infoset)[0].action)


def _file_sha256(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()

