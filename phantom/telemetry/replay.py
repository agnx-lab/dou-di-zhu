"""Append-only JSONL session logs with strict, local replay lookup."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import re
from typing import Iterable
from uuid import uuid4


SESSION_ID = re.compile(r"^[a-zA-Z0-9_-]{1,80}$")
MAX_REPLAY_BYTES = 5_000_000
MAX_REPLAY_EVENTS = 1_000
MAX_EVENT_BYTES = 1_000_000


class ReplayWriter:
    def __init__(self, directory: str | Path, session_id: str | None = None) -> None:
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.session_id = session_id or datetime.now(timezone.utc).strftime(
            "%Y%m%dT%H%M%SZ"
        ) + "-" + uuid4().hex[:8]
        if not SESSION_ID.fullmatch(self.session_id):
            raise ValueError("Invalid replay session id")
        self.path = self.directory / f"{self.session_id}.jsonl"

    def append(self, event: dict[str, object]) -> dict[str, object]:
        recorded = {**event, "session_id": self.session_id}
        encoded = json.dumps(recorded, ensure_ascii=False, separators=(",", ":"))
        if len(encoded.encode("utf-8")) > MAX_EVENT_BYTES:
            raise ValueError("Replay event exceeds the local safety limit")
        with self.path.open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(encoded)
            handle.write("\n")
        return recorded


def load_replay(directory: str | Path, session_id: str) -> list[dict[str, object]]:
    if not SESSION_ID.fullmatch(session_id):
        raise ValueError("Invalid replay session id")
    path = Path(directory) / f"{session_id}.jsonl"
    if not path.is_file():
        raise FileNotFoundError(f"Replay not found: {session_id}")
    if path.stat().st_size > MAX_REPLAY_BYTES:
        raise ValueError("Replay exceeds the local safety limit")
    events: list[dict[str, object]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            payload = json.loads(line)
            if payload.get("schema") != "phantom.game.v1":
                raise ValueError("Replay contains an unsupported event schema")
            events.append(payload)
            if len(events) > MAX_REPLAY_EVENTS:
                raise ValueError("Replay contains too many events")
    if not events:
        raise ValueError("Replay is empty")
    return events


def list_replays(directory: str | Path) -> Iterable[dict[str, object]]:
    for path in sorted(Path(directory).glob("*.jsonl"), reverse=True):
        if SESSION_ID.fullmatch(path.stem):
            yield {
                "session_id": path.stem,
                "size": path.stat().st_size,
                "updated_at": path.stat().st_mtime,
            }
