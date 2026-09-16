from phantom.opponent import OpponentProfile, ProfileStore


def test_profile_uses_behavior_rates_without_personality_labels(tmp_path) -> None:
    profile = OpponentProfile()
    profile.record_action([], turn=2, had_initiative=False)
    profile.record_action([14], turn=5, had_initiative=True)
    profile.record_action([7, 7, 7, 7], turn=14, had_initiative=True)
    profile.finish_game()
    snapshot = profile.snapshot()

    assert snapshot["status"] == "profile_active"
    assert snapshot["pass_rate"] == 1 / 3
    assert snapshot["bombs_used"] == 1
    assert 0.75 <= snapshot["bait_modifier"] <= 1.25
    assert snapshot["learning_level"] == 2
    assert snapshot["learning_name"] == "试探"
    assert snapshot["learning_progress"] == 25
    assert snapshot["adaptation_strength"] == 0.2
    assert "观察" in snapshot["learning_insight"]

    store = ProfileStore(tmp_path / "local-human.json")
    store.save(profile)
    assert store.load().snapshot() == snapshot


def test_corrupt_profile_falls_back_to_a_fresh_learning_profile(tmp_path) -> None:
    path = tmp_path / "profile.json"
    path.write_text('{"games": -2}', encoding="utf-8")

    profile = ProfileStore(path).load()

    assert profile.games == 0
    assert profile.snapshot()["status"] == "learning"


def test_learning_progress_grows_during_and_between_games() -> None:
    profile = OpponentProfile()
    assert profile.snapshot()["learning_progress"] == 0

    for turn in range(1, 6):
        profile.record_action([3], turn=turn, had_initiative=True)
    assert profile.snapshot()["learning_progress"] == 12
    assert profile.snapshot()["learning_name"] == "初识"

    profile.finish_game()
    snapshot = profile.snapshot()
    assert snapshot["learning_progress"] == 25
    assert snapshot["learning_name"] == "试探"
    assert snapshot["current_game_actions"] == 0
