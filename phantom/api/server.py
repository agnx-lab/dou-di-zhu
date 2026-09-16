"""FastAPI/WebSocket bridge for the local PHANTOM demo."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from phantom.bridge import RealGameSession
from phantom.game import DEFAULT_SEED, classify_move
from phantom.opponent import ProfileStore
from phantom.telemetry import ReplayWriter, list_replays, load_replay
from douzero.env.game import RealCard2EnvCard


ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "third_party" / "DouZero" / "baselines" / "douzero_ADP"
SESSION_DIR = ROOT / "output" / "sessions"
PROFILE_PATH = ROOT / "output" / "profiles" / "local-human.json"
ALLOWED_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173"}
LOGGER = logging.getLogger("phantom.api")

app = FastAPI(title="PHANTOM Local Game Bridge", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ALLOWED_ORIGINS),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, object]:
    models = {
        position: (MODEL_DIR / f"{position}.ckpt").is_file()
        for position in ("landlord", "landlord_up", "landlord_down")
    }
    ready = all(models.values())
    return {
        "status": "ready" if ready else "blocked",
        "source": "douzero_adp_checkpoint",
        "models": models,
        "cognitive_layer": "active",
        "hidden_hand_belief": "active",
        "opponent_belief": "estimated",
        "counterfactual_rollout": "active",
        "action_reranking": "active",
        "human_play": "active",
        "opponent_profile": "active",
        "session_replay": "active",
    }


@app.get("/replays")
def replays() -> dict[str, object]:
    return {"sessions": list(list_replays(SESSION_DIR))}


async def _accept_local(websocket: WebSocket) -> bool:
    origin = websocket.headers.get("origin")
    if origin and origin not in ALLOWED_ORIGINS:
        await websocket.close(code=1008, reason="Origin not allowed")
        return False
    await websocket.accept()
    return True


async def _send_runtime_error(
    websocket: WebSocket, *, source: str, fallback: str, error: Exception
) -> None:
    LOGGER.exception("PHANTOM WebSocket runtime failure", exc_info=error)
    try:
        await websocket.send_json(
            {
                "type": "bridge_error",
                "schema": "phantom.game.v1",
                "mode": "real",
                "source": source,
                "message": "本地牌局服务暂时不可用，请重新连接或查看已保存回放",
                "fallback": fallback,
            }
        )
    except (RuntimeError, WebSocketDisconnect):
        return


@app.websocket("/ws/game")
async def game_socket(
    websocket: WebSocket,
    seed: int = DEFAULT_SEED,
    pace_ms: int = 1800,
    wait_for_start: bool = False,
) -> None:
    if not await _accept_local(websocket):
        return
    seed = max(0, min(seed, 2_147_483_647))
    pace_ms = max(0, min(pace_ms, 3000))
    try:
        session = await asyncio.to_thread(RealGameSession, MODEL_DIR, seed=seed)
        writer = ReplayWriter(SESSION_DIR)
        initial = session.initial_event()
        await websocket.send_json(writer.append(initial))
        if wait_for_start:
            command = await websocket.receive_json()
            if not isinstance(command, dict) or command.get("type") != "start_autoplay":
                await websocket.close(code=1008, reason="Explicit autoplay start required")
                return
        while not session.env.game_over:
            event = await asyncio.to_thread(session.step)
            await websocket.send_json(writer.append(event))
            if pace_ms:
                await asyncio.sleep(pace_ms / 1000)
    except WebSocketDisconnect:
        return
    except Exception as error:
        await _send_runtime_error(
            websocket,
            source="bridge_runtime",
            fallback="base_policy_unavailable",
            error=error,
        )
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            pass


@app.websocket("/ws/play")
async def play_socket(websocket: WebSocket, seed: int = DEFAULT_SEED, pace_ms: int = 1700) -> None:
    """Local human controls the landlord seat; both farmers remain DouZero."""
    if not await _accept_local(websocket):
        return
    seed = max(0, min(seed, 2_147_483_647))
    pace_ms = max(0, min(pace_ms, 3000))
    profile_store = ProfileStore(PROFILE_PATH)
    profile = profile_store.load()
    writer = ReplayWriter(SESSION_DIR)
    try:
        session = await asyncio.to_thread(
            RealGameSession,
            MODEL_DIR,
            seed=seed,
            human_controlled=True,
            style_bait_modifier=profile.bait_modifier(),
            human_profile=profile.snapshot(),
        )
        initial = session.initial_event()
        initial["opponent_profile"] = profile.snapshot()
        await websocket.send_json(writer.append(initial))
        while not session.env.game_over:
            if session.env.acting_player_position == "landlord":
                prompt = await asyncio.to_thread(session.human_turn_event)
                prompt["opponent_profile"] = profile.snapshot()
                await websocket.send_json(writer.append(prompt))
                while True:
                    command = await websocket.receive_json()
                    try:
                        labels = command.get("action") if isinstance(command, dict) and command.get("type") == "human_action" else None
                        if (
                            not isinstance(labels, list)
                            or len(labels) > 20
                            or not all(isinstance(card, str) and len(card) <= 2 for card in labels)
                        ):
                            raise ValueError("请选择手牌后再出牌")
                        try:
                            raw_action = sorted(RealCard2EnvCard[card] for card in labels)
                        except KeyError as error:
                            raise ValueError("选择中包含无法识别的牌") from error
                        legal_actions = session.env.game_infoset.legal_actions
                        if raw_action not in legal_actions:
                            pattern = classify_move(raw_action)
                            if not pattern.valid:
                                raise ValueError("这组牌不是合法的斗地主牌型")
                            raise ValueError(
                                f"这是“{pattern.label}”，但无法压过桌面的牌"
                            )
                        profile.record_action(
                            raw_action,
                            turn=session.turn + 1,
                            had_initiative=[] not in legal_actions,
                        )
                        # Learning survives an abandoned or refreshed game;
                        # completion only advances the cross-game stage.
                        profile_store.save(profile)
                        event = await asyncio.to_thread(session.step, raw_action)
                        break
                    except (KeyError, TypeError, ValueError) as error:
                        await websocket.send_json(
                            {
                                **prompt,
                                "type": "invalid_action",
                                "message": str(error),
                                "opponent_profile": profile.snapshot(),
                            }
                        )
            else:
                event = await asyncio.to_thread(session.step)
            if event["type"] == "game_finished":
                profile.finish_game()
                profile_store.save(profile)
            event["opponent_profile"] = profile.snapshot()
            await websocket.send_json(writer.append(event))
            # Keep every resolved move on the table long enough to read.  The
            # pause belongs after delivery; pausing before delivery allowed a
            # following human-turn prompt to overwrite the last farmer move.
            if event["type"] == "turn_resolved" and pace_ms:
                await asyncio.sleep(pace_ms / 1000)
    except WebSocketDisconnect:
        return
    except Exception as error:
        await _send_runtime_error(
            websocket,
            source="human_play_runtime",
            fallback="session_preserved_in_replay",
            error=error,
        )
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            pass


@app.websocket("/ws/replay")
async def replay_socket(websocket: WebSocket, session: str, pace_ms: int = 1600) -> None:
    if not await _accept_local(websocket):
        return
    pace_ms = max(0, min(pace_ms, 3000))
    try:
        events = await asyncio.to_thread(load_replay, SESSION_DIR, session)
        for event in events:
            await websocket.send_json({**event, "playback": "replay"})
            if pace_ms:
                await asyncio.sleep(pace_ms / 1000)
    except WebSocketDisconnect:
        return
    except Exception as error:
        await _send_runtime_error(
            websocket,
            source="replay_runtime",
            fallback="select_an_available_replay",
            error=error,
        )
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            pass
