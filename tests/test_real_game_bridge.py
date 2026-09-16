from pathlib import Path

from fastapi.testclient import TestClient
import pytest
from starlette.websockets import WebSocketDisconnect

import phantom.api.server as server
from phantom.bridge import RealGameSession


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "third_party" / "DouZero" / "baselines" / "douzero_ADP"


def test_real_session_emits_source_tagged_conserved_events() -> None:
    events = list(RealGameSession(MODEL_DIR, seed=20260911).events())

    assert events[0]["type"] == "session_started"
    assert events[-1]["type"] == "game_finished"
    assert events[-1]["winner"] in {"landlord", "farmer"}
    assert all(event["mode"] == "real" for event in events)
    assert all(event["source"] == "douzero_adp_checkpoint" for event in events)
    assert all(event["state"]["cards_accounted_for"] == 54 for event in events)
    assert all(
        event["hidden_hand_belief"]["health"]["num_particles"] == 512
        for event in events
    )
    assert all(
        event["hidden_hand_belief"]["health"]["source"]
        == "phantom_hidden_hand_particles_v1"
        for event in events
    )
    assert all(event["opponent_belief"]["status"] == "estimated" for event in events)
    assert all(
        event["opponent_belief"]["source"] == "phantom_rule_opponent_belief_v1"
        for event in events
    )
    landlord_events = [event for event in events[1:] if event["actor"] == "landlord"]
    assert landlord_events
    assert all(
        event["counterfactual_rollout"]["top_k"]
        == min(3, event["scored_action_count"])
        for event in landlord_events
    )
    assert all(
        event["counterfactual_rollout"]["candidates"][0]["selected_by_base"]
        for event in landlord_events
    )
    assert all(
        "before_estimate" not in event["counterfactual_rollout"]
        for event in landlord_events
    )
    assert all(
        event["legal_action_count"] == event["scored_action_count"]
        for event in events[1:]
    )
    assert all(event["candidates"] for event in events[1:])
    assert all(event["action_type"] != "不符合斗地主牌型" for event in events[1:])
    assert all("last_move_type" in event["state"] for event in events)
    assert events[-1]["state"]["multiplier"] >= 1
    assert set(events[-1]["state"]["score"]) == {"landlord", "farmer_each"}
    previous = events[0]["state"]["remaining"]
    for event in events[1:]:
        current = event["state"]["remaining"]
        actor = event["actor"]
        assert current[actor] == previous[actor] - len(event["action_raw"])
        for other in {"landlord", "landlord_up", "landlord_down"} - {actor}:
            assert current[other] == previous[other]
        previous = current


def test_cognitive_failure_falls_back_to_legal_base_action() -> None:
    class BrokenRollout:
        def evaluate(self, **_kwargs):
            raise RuntimeError("simulated cognitive failure")

    session = RealGameSession(MODEL_DIR, seed=20260911)
    session.counterfactual = BrokenRollout()
    event = session.step()

    assert event["actor"] == "landlord"
    assert event["cognitive_decision"]["fallback"] is True
    assert event["action_source"] == "douzero_base_fallback"
    assert event["action_raw"] == list(session.agents["landlord"].last_scores[0].action)
    assert event["state"]["cards_accounted_for"] == 54


def test_adaptive_farmer_stays_inside_safe_douzero_envelope() -> None:
    session = RealGameSession(
        MODEL_DIR,
        seed=20260911,
        human_controlled=True,
        human_profile={
            "adaptation_strength": 0.8,
            "pass_rate": 0.65,
            "high_card_early_rate": 0.4,
            "initiative_aggression": 0.7,
        },
    )
    assert session.adaptation_strength == 0.8
    prompt = session.human_turn_event()
    session.step([20, 30] if [20, 30] in session.env.game_infoset.legal_actions else session.env.game_infoset.legal_actions[0])
    while not session.env.game_over and session.env.acting_player_position == "landlord":
        session.step(session.env.game_infoset.legal_actions[0])
    if not session.env.game_over:
        event = session.step()
        assert event["adaptation_strength"] == 0.8
        assert event["action_raw"] in [list(score.action) for score in session.agents[event["actor"]].last_scores[:5]]
        best = session.agents[event["actor"]].last_scores[0].base_value
        assert best - event["selected_base_value"] <= 0.012 * 0.8 + 1e-9


def test_health_endpoint_reports_real_base_models() -> None:
    response = TestClient(server.app).get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "source": "douzero_adp_checkpoint",
        "models": {
            "landlord": True,
            "landlord_up": True,
            "landlord_down": True,
        },
        "cognitive_layer": "active",
        "hidden_hand_belief": "active",
        "opponent_belief": "estimated",
        "counterfactual_rollout": "active",
        "action_reranking": "active",
        "human_play": "active",
        "opponent_profile": "active",
        "session_replay": "active",
    }


def test_websocket_reaches_a_real_finished_game(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(server, "SESSION_DIR", tmp_path / "sessions")
    with TestClient(server.app).websocket_connect("/ws/game?seed=20260911&pace_ms=0") as socket:
        events = []
        while True:
            event = socket.receive_json()
            events.append(event)
            if event["type"] in {"game_finished", "bridge_error"}:
                break

    assert events[0]["type"] == "session_started"
    assert events[-1]["type"] == "game_finished"
    assert events[-1]["turn"] == 27
    assert any(
        event.get("cognitive_decision", {}).get("override")
        for event in events[1:]
    )
    assert events[-1]["metrics"]["base_value_retention"] >= 0.98


def test_autoplay_can_wait_for_landlord_card_confirmation(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(server, "SESSION_DIR", tmp_path / "sessions")
    with TestClient(server.app).websocket_connect(
        "/ws/game?seed=20260911&pace_ms=0&wait_for_start=true"
    ) as socket:
        initial = socket.receive_json()
        assert initial["type"] == "session_started"
        assert initial["turn"] == 0
        assert initial["state"]["remaining"] == {
            "landlord": 20,
            "landlord_up": 17,
            "landlord_down": 17,
        }
        socket.send_json({"type": "start_autoplay"})
        first_move = socket.receive_json()

    assert first_move["type"] == "turn_resolved"
    assert first_move["turn"] == 1


def test_human_websocket_accepts_recommended_legal_actions(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(server, "SESSION_DIR", tmp_path / "sessions")
    monkeypatch.setattr(server, "PROFILE_PATH", tmp_path / "profile.json")
    with TestClient(server.app).websocket_connect("/ws/play?seed=20260911&pace_ms=0") as socket:
        event = socket.receive_json()
        assert event["type"] == "session_started"
        while event["type"] not in {"game_finished", "bridge_error"}:
            event = socket.receive_json()
            if event["type"] == "human_turn":
                assert event["recommended_action"] in event["legal_actions"]
                assert event["recommended_action_type"] != "不符合斗地主牌型"
                socket.send_json(
                    {"type": "human_action", "action": event["recommended_action"]}
                )

    assert event["type"] == "game_finished"
    assert event["opponent_profile"]["actions"] > 0
    assert event["opponent_profile"]["games"] == 1
    assert event["opponent_profile"]["learning_name"] == "试探"
    assert event["opponent_profile"]["learning_progress"] == 25
    assert event["opponent_profile"]["adaptation_strength"] == 0.2


def test_human_websocket_rejects_oversized_action_payload(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(server, "SESSION_DIR", tmp_path / "sessions")
    monkeypatch.setattr(server, "PROFILE_PATH", tmp_path / "profile.json")
    with TestClient(server.app).websocket_connect("/ws/play?pace_ms=0") as socket:
        socket.receive_json()
        prompt = socket.receive_json()
        assert prompt["type"] == "human_turn"
        socket.send_json({"type": "human_action", "action": ["3"] * 21})
        response = socket.receive_json()

    assert response["type"] == "invalid_action"
    assert response["message"] == "请选择手牌后再出牌"


def test_websocket_rejects_non_local_browser_origin() -> None:
    with pytest.raises(WebSocketDisconnect) as raised:
        with TestClient(server.app).websocket_connect(
            "/ws/game", headers={"origin": "https://attacker.invalid"}
        ):
            pass

    assert raised.value.code == 1008
