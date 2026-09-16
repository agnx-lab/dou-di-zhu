import pytest

from phantom.telemetry import ReplayWriter, list_replays, load_replay
from phantom.telemetry.replay import MAX_REPLAY_BYTES


def test_jsonl_replay_round_trip(tmp_path) -> None:
    writer = ReplayWriter(tmp_path, "verified-session")
    first = writer.append(
        {"type": "session_started", "schema": "phantom.game.v1", "mode": "real"}
    )
    writer.append(
        {"type": "game_finished", "schema": "phantom.game.v1", "mode": "real"}
    )

    events = load_replay(tmp_path, "verified-session")
    assert events[0] == first
    assert events[-1]["type"] == "game_finished"
    assert list(list_replays(tmp_path))[0]["session_id"] == "verified-session"


def test_replay_reader_rejects_oversized_local_file(tmp_path) -> None:
    path = tmp_path / "too-large.jsonl"
    path.write_bytes(b"x" * (MAX_REPLAY_BYTES + 1))

    with pytest.raises(ValueError, match="safety limit"):
        load_replay(tmp_path, "too-large")
