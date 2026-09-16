from pathlib import Path
import wave


ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "frontend" / "public" / "audio"


def test_music_and_original_accent_cues_are_complete() -> None:
    required = {
        "card-select.wav",
        "card-play.wav",
        "pass.wav",
        "your-turn.wav",
        "shuffle.wav",
        "bomb.wav",
        "rocket.wav",
        "spring.wav",
        "victory.wav",
        "ui-confirm.wav",
    }
    assert required <= {path.name for path in AUDIO.glob("*.wav")}
    for name in required:
        with wave.open(str(AUDIO / name), "rb") as stream:
            assert stream.getnchannels() == 1
            assert stream.getsampwidth() == 2
            assert stream.getnframes() > 1_000
    music_payload = (AUDIO / "music" / "happy-table-loop.wav").read_bytes()
    assert music_payload.startswith(b"RIFF")
    assert music_payload[8:12] == b"WAVE"
    assert len(music_payload) > 6_000_000


def test_cc0_card_foley_pack_is_present() -> None:
    required = {
        "card-fan-1.ogg",
        "card-place-1.ogg",
        "card-place-2.ogg",
        "card-place-3.ogg",
        "card-shove-2.ogg",
        "card-shuffle.ogg",
        "card-slide-2.ogg",
        "card-slide-5.ogg",
        "chip-lay-2.ogg",
        "chips-collide-1.ogg",
    }
    foley = AUDIO / "foley"
    assert required == {path.name for path in foley.glob("*.ogg")}
    assert all((foley / name).stat().st_size > 5_000 for name in required)


def test_cc0_impact_layers_are_present() -> None:
    required = {
        "explosion-crunch-bomb.ogg",
        "explosion-crunch-rocket.ogg",
        "explosion-low.ogg",
        "impact-bell-heavy.ogg",
        "impact-glass-heavy.ogg",
        "impact-punch-heavy.ogg",
        "laser-large.ogg",
    }
    impact = AUDIO / "impact"
    assert required == {path.name for path in impact.glob("*.ogg")}
    assert all((impact / name).stat().st_size > 5_000 for name in required)


def test_cinematic_bomb_and_rocket_layers_are_present() -> None:
    cinematic = AUDIO / "cinematic"
    required = {
        "airfold-impact.mp3",
        "cinematic-drum-hit.mp3",
        "organic-impact.mp3",
        "royal-spark.ogg",
    }
    assert required == {path.name for path in cinematic.iterdir() if path.is_file()}
    assert (cinematic / "organic-impact.mp3").stat().st_size > 300_000
    assert (cinematic / "cinematic-drum-hit.mp3").stat().st_size > 200_000
    assert (cinematic / "airfold-impact.mp3").stat().st_size > 150_000
    for name in required:
        payload = (cinematic / name).read_bytes()
        assert len(payload) > 50_000
        assert payload.startswith(b"ID3") or payload.startswith(b"OggS")


def test_offline_mandarin_announcer_covers_signature_moments() -> None:
    voice_dir = AUDIO / "voice"
    required = {
        "single-3.mp3",
        "single-A.mp3",
        "pair-3.mp3",
        "triple-single-5-9.mp3",
        "triple-pair-5-9.mp3",
        "straight-3-7.mp3",
        "serial-pair-3-5.mp3",
        "airplane-single-3-4.mp3",
        "bomb-8.mp3",
        "rocket.mp3",
        "spring.mp3",
        "your-turn.mp3",
        "landlord-win.mp3",
        "farmer-win.mp3",
    }
    assert required <= {path.name for path in voice_dir.glob("*.mp3")}
    assert len(list(voice_dir.glob("*.mp3"))) >= 627
    for path in (voice_dir / name for name in required):
        payload = path.read_bytes()
        assert len(payload) > 2_000
        assert payload.startswith(b"ID3") or payload[:1] == b"\xff"


def test_browser_audio_controller_uses_local_assets() -> None:
    controller = (ROOT / "frontend" / "components" / "phantom" / "use-game-audio.ts").read_text(encoding="utf-8")
    assert "/audio/music/happy-table-loop.wav" in controller
    assert "context.decodeAudioData" in controller
    assert "source.loop = true" in controller
    assert "/audio/foley/card-shuffle.ogg" in controller
    assert "/audio/cinematic/organic-impact.mp3" in controller
    assert "/audio/cinematic/airfold-impact.mp3" in controller
    assert "/audio/cinematic/cinematic-drum-hit.mp3" in controller
    assert "/audio/cinematic/royal-spark.ogg" in controller
    assert "/audio/cinematic/rocket-boost.mp3" not in controller
    assert "/audio/cinematic/energy-rise.ogg" not in controller
    assert "/audio/cinematic/deep-table-boom.wav" not in controller
    assert "/audio/impact/explosion-crunch-bomb.ogg" not in controller
    assert "/audio/impact/explosion-crunch-rocket.ogg" not in controller
    assert "duckForSpecial" in controller
    assert "fadeOut" in controller
    assert 'Q: "圈儿"' in controller
    assert "single-${first}" in controller
    assert "triple-single-${main}-${kicker}" in controller
    assert "triple-pair-${main}-${kicker}" in controller
    assert "http://" not in controller
    assert "https://" not in controller


def test_pregame_ceremony_and_transparent_ai_layout_are_wired() -> None:
    stage = (ROOT / "frontend" / "components" / "phantom" / "phantom-stage.tsx").read_text(encoding="utf-8")
    table = (ROOT / "frontend" / "components" / "phantom" / "real-game-table.tsx").read_text(encoding="utf-8")
    policy = (ROOT / "frontend" / "components" / "phantom" / "real-policy-panel.tsx").read_text(encoding="utf-8")
    opponent = (ROOT / "frontend" / "components" / "phantom" / "opponent-seat.tsx").read_text(encoding="utf-8")
    styles = (ROOT / "frontend" / "app" / "globals.css").read_text(encoding="utf-8")

    assert 'export type DealPhase = "waiting" | "dealing" | "reveal" | "ready"' in stage
    assert "同意并开始发牌" in table
    assert "地主底牌揭示" in table
    assert "AI 思考中枢" in policy
    assert 'rank === "X"' in policy and 'return "小王"' in policy
    assert 'rank === "D"' in policy and 'return "大王"' in policy
    assert "const visibleBacks = Math.max(0, count)" in opponent
    assert ".rules-dialog::-webkit-scrollbar { display: none; }" in styles
