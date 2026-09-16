from pathlib import Path

from douzero.env.env import Env

from phantom.base import DouZeroAdapter


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "third_party" / "DouZero" / "baselines" / "douzero_ADP"


def test_scores_every_legal_action() -> None:
    env = Env("adp")
    env.reset()
    infoset = env.infoset
    adapter = DouZeroAdapter("landlord", MODEL_DIR / "landlord.ckpt")

    scores = adapter.score_legal_actions(infoset)

    assert len(scores) == len(infoset.legal_actions)
    assert {score.action for score in scores} == {
        tuple(action) for action in infoset.legal_actions
    }
    assert all(scores[index].base_value >= scores[index + 1].base_value for index in range(len(scores) - 1))
    assert all(score.source == "douzero_adp_checkpoint" for score in scores)


def test_adapter_rejects_wrong_position() -> None:
    env = Env("adp")
    env.reset()
    adapter = DouZeroAdapter("landlord_up", MODEL_DIR / "landlord_up.ckpt")

    try:
        adapter.score_legal_actions(env.infoset)
    except ValueError as error:
        assert "received landlord infoset" in str(error)
    else:
        raise AssertionError("wrong-position infoset must be rejected")

