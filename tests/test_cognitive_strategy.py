from phantom.strategy import CognitiveReranker, CognitiveStateMachine


def _candidate(action, base, rank, control_shift, rocket_shift=0.0):
    return {
        "action_raw": action,
        "base_value": base,
        "base_rank": rank,
        "shift": {
            "control_strength": control_shift,
            "rocket_probability": rocket_shift,
            "bomb_probability": 0.0,
            "estimated_turns_to_finish": 0,
        },
    }


def test_safety_gate_vetoes_excessive_base_loss() -> None:
    rollout = {
        "before": {"control_strength": 0.3},
        "candidates": [
            _candidate([3], 1.0, 1, 0.01),
            _candidate([], 0.97, 2, -0.4, -0.2),
        ],
    }
    result = CognitiveReranker(max_base_value_loss=0.02).rerank(
        rollout, actual_control_strength=0.9, remaining_cards=12
    )

    assert result["override"] is False
    assert result["selected_action_raw"] == [3]
    assert result["candidates"][1]["allowed_by_safety_gate"] is False
    assert result["candidates"][1]["veto_reason"] == "base_value_loss_too_high"


def test_safe_hidden_strength_candidate_can_override_base_policy() -> None:
    rollout = {
        "before": {"control_strength": 0.3},
        "candidates": [
            _candidate([17], 1.0, 1, 0.02),
            _candidate([], 0.995, 2, -0.2, -0.1),
        ],
    }
    result = CognitiveReranker().rerank(
        rollout, actual_control_strength=0.9, remaining_cards=12
    )

    assert result["override"] is True
    assert result["selected_action_raw"] == []
    assert result["reason"] == "hidden_strength"
    assert result["base_value_retention"] >= 0.99


def test_hidden_strength_state_machine_completes_explainable_loop() -> None:
    state = CognitiveStateMachine()
    state.on_phantom_decision({"override": True, "reason": "hidden_strength"})
    assert state.state == "SHAPE"
    state.on_opponent_action((14,))
    assert state.state == "TRAP_READY"
    state.on_phantom_decision({"override": False})
    assert state.state == "EXPLOIT"
    state.on_phantom_decision({"override": False})
    assert state.state == "RECOVER"
    assert [item["to"] for item in state.history] == [
        "OPPORTUNITY", "SHAPE", "VERIFY", "TRAP_READY", "EXPLOIT", "RECOVER"
    ]
