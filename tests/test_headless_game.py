from collections import Counter
from pathlib import Path

from douzero.env.env import deck

from phantom.game.headless import make_deal, play_headless_game


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "third_party" / "DouZero" / "baselines" / "douzero_ADP"


def test_seeded_deal_is_reproducible_and_complete() -> None:
    first = make_deal(20260911)
    second = make_deal(20260911)
    assert first == second
    assert Counter(first["landlord"] + first["landlord_up"] + first["landlord_down"]) == Counter(deck)
    assert all(card in first["landlord"] for card in first["three_landlord_cards"])


def test_different_seeds_produce_different_complete_deals() -> None:
    first = make_deal(20260911)
    second = make_deal(20260912)

    assert first["landlord"] != second["landlord"]
    assert Counter(second["landlord"] + second["landlord_up"] + second["landlord_down"]) == Counter(deck)
    assert all(card in second["landlord"] for card in second["three_landlord_cards"])


def test_real_models_finish_legal_conserved_game() -> None:
    result = play_headless_game(MODEL_DIR, seed=20260911)

    assert result.winner in {"landlord", "farmer"}
    assert 1 <= result.turns < 300
    assert result.conservation_checks == result.turns + 1
    assert all(decision.legal_action_count >= 1 for decision in result.decisions)
    assert all(
        decision.scored_action_count == decision.legal_action_count
        for decision in result.decisions
    )
    assert all(decision.top_k for decision in result.decisions)
