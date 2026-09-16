"""Generate PHANTOM's original background loop and game sound effects

The sounds are intentionally synthesized from first principles so the demo can
ship without stock-audio licensing ambiguity  Run this script whenever the
audio palette needs to be regenerated
"""

from __future__ import annotations

from array import array
import math
from pathlib import Path
import random
import wave


RATE = 24_000
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend" / "public" / "audio"
TAU = math.tau


def blank(seconds: float) -> list[float]:
    return [0.0] * int(seconds * RATE)


def midi(note: float) -> float:
    return 440.0 * (2.0 ** ((note - 69.0) / 12.0))


def add_tone(
    target: list[float],
    start: float,
    duration: float,
    frequency: float,
    amplitude: float,
    *,
    harmonics: tuple[float, ...] = (1.0,),
    attack: float = 0.008,
    release: float = 0.18,
    decay: float = 0.0,
    glide: float = 0.0,
) -> None:
    begin = int(start * RATE)
    count = min(int(duration * RATE), len(target) - begin)
    if count <= 0:
        return
    phase = 0.0
    for index in range(count):
        t = index / RATE
        progress = index / max(1, count - 1)
        freq = frequency * (1.0 + glide * progress)
        phase += TAU * freq / RATE
        rise = min(1.0, t / max(attack, 1 / RATE))
        fall = min(1.0, (duration - t) / max(release, 1 / RATE))
        envelope = rise * fall * math.exp(-decay * t)
        sample = 0.0
        weight = 0.0
        for harmonic, strength in enumerate(harmonics, start=1):
            sample += math.sin(phase * harmonic) * strength
            weight += strength
        target[begin + index] += amplitude * envelope * sample / max(weight, 1e-6)


def add_noise(
    target: list[float],
    start: float,
    duration: float,
    amplitude: float,
    *,
    seed: int,
    decay: float = 14.0,
    highpass: bool = False,
) -> None:
    rng = random.Random(seed)
    begin = int(start * RATE)
    count = min(int(duration * RATE), len(target) - begin)
    previous = 0.0
    for index in range(max(0, count)):
        t = index / RATE
        raw = rng.uniform(-1.0, 1.0)
        sample = raw - previous * 0.82 if highpass else raw
        previous = raw
        target[begin + index] += amplitude * math.exp(-decay * t) * sample


def add_pluck(target: list[float], start: float, note: int, amplitude: float = 0.22, duration: float = 0.72) -> None:
    add_tone(
        target,
        start,
        duration,
        midi(note),
        amplitude,
        harmonics=(1.0, 0.62, 0.31, 0.14),
        attack=0.004,
        release=0.22,
        decay=4.4,
    )


def add_wood(target: list[float], start: float, amplitude: float = 0.16) -> None:
    add_tone(target, start, 0.12, 920, amplitude, harmonics=(1.0, 0.46), attack=0.001, release=0.05, decay=24)
    add_noise(target, start, 0.045, amplitude * 0.34, seed=int(start * 10_000) + 7, decay=42, highpass=True)


def normalize(samples: list[float], peak: float = 0.92) -> array:
    maximum = max((abs(value) for value in samples), default=1.0)
    gain = peak / maximum if maximum > peak else 1.0
    return array("h", (max(-32767, min(32767, int(value * gain * 32767))) for value in samples))


def write(name: str, samples: list[float], peak: float = 0.92) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / name
    pcm = normalize(samples, peak)
    with wave.open(str(path), "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(RATE)
        stream.writeframes(pcm.tobytes())


def background_music() -> None:
    # 16 compact bars at 120 BPM  The melody uses a bright D-major pentatonic
    # palette while soft pads and wood percussion keep it calm enough for play
    beat = 0.5
    bars = 16
    duration = bars * beat * 4
    music = blank(duration)
    roots = [50, 55, 57, 50, 47, 55, 57, 50] * 2
    melody = [
        (0, 62), (1, 66), (2, 69), (3, 66),
        (0, 64), (1, 66), (2, 71), (3, 69),
        (0, 66), (1, 69), (2, 74), (3, 71),
        (0, 69), (1, 66), (2, 64), (3, 62),
    ]
    for bar in range(bars):
        start = bar * beat * 4
        root = roots[bar]
        for interval, level in ((0, 0.055), (7, 0.038), (12, 0.03)):
            add_tone(music, start, beat * 4.05, midi(root + interval), level, harmonics=(1.0, 0.18), attack=0.22, release=0.45)
        add_pluck(music, start, root, 0.12, 0.62)
        add_pluck(music, start + beat * 2, root + 7, 0.085, 0.55)
        for local_beat in range(4):
            add_wood(music, start + local_beat * beat, 0.065 if local_beat % 2 else 0.105)
            add_noise(music, start + local_beat * beat + beat * 0.5, 0.06, 0.023, seed=bar * 10 + local_beat, decay=35, highpass=True)
        motif = melody[(bar % 4) * 4:(bar % 4 + 1) * 4]
        for local_beat, note in motif:
            add_pluck(music, start + local_beat * beat + (0.04 if bar % 2 else 0), note + (12 if bar in {7, 15} and local_beat == 3 else 0), 0.155)
        if bar % 4 == 3:
            add_pluck(music, start + beat * 3.5, 74, 0.11, 0.38)
    fade = int(0.12 * RATE)
    for index in range(fade):
        gain = index / fade
        music[index] *= gain
        music[-1 - index] *= gain
    write("phantom-breeze.wav", music, 0.82)


def sound_effects() -> None:
    select = blank(0.18)
    add_wood(select, 0.0, 0.2)
    add_tone(select, 0.02, 0.12, 1320, 0.09, attack=0.001, release=0.06, decay=20)
    write("card-select.wav", select)

    play = blank(0.62)
    add_noise(play, 0.0, 0.31, 0.15, seed=401, decay=7, highpass=True)
    add_tone(play, 0.22, 0.25, 155, 0.34, harmonics=(1, .42, .16), attack=.002, release=.16, decay=10)
    add_wood(play, 0.27, 0.28)
    write("card-play.wav", play)

    passing = blank(0.42)
    add_wood(passing, 0.02, 0.14)
    add_tone(passing, 0.12, 0.26, 520, 0.12, harmonics=(1, .3), attack=.003, release=.14, decay=7, glide=-.24)
    write("pass.wav", passing)

    turn = blank(0.72)
    for offset, note in ((0, 74), (.12, 78), (.25, 81)):
        add_tone(turn, offset, .42, midi(note), .13, harmonics=(1, .38, .12), attack=.005, release=.25, decay=3)
    write("your-turn.wav", turn)

    shuffle = blank(0.95)
    for index in range(6):
        at = .05 + index * .115
        add_noise(shuffle, at, .18, .12, seed=610 + index, decay=10, highpass=True)
        add_wood(shuffle, at + .055, .08)
    write("shuffle.wav", shuffle)

    bomb = blank(1.22)
    add_noise(bomb, 0, .42, .34, seed=880, decay=6)
    add_tone(bomb, 0, .95, 61, .54, harmonics=(1, .55, .25), attack=.003, release=.45, decay=2.8, glide=-.22)
    add_tone(bomb, .08, .72, 123, .24, harmonics=(1, .3), attack=.003, release=.3, decay=4)
    write("bomb.wav", bomb, .96)

    rocket = blank(1.68)
    for index in range(5):
        add_tone(rocket, index * .11, .72, 260 + index * 145, .1, harmonics=(1, .27), attack=.006, release=.2, decay=2, glide=.9)
    add_noise(rocket, .6, .45, .24, seed=990, decay=5, highpass=True)
    add_tone(rocket, .72, .82, 73, .48, harmonics=(1, .5, .22), attack=.003, release=.36, decay=3)
    for offset, note in ((.82, 74), (.96, 78), (1.1, 81), (1.24, 86)):
        add_pluck(rocket, offset, note, .14, .38)
    write("rocket.wav", rocket, .96)

    win = blank(2.5)
    for offset, note in ((0, 62), (.18, 66), (.36, 69), (.58, 74), (.82, 78), (1.08, 81), (1.4, 86)):
        add_pluck(win, offset, note, .2, .85)
    for offset in (0, .36, .82, 1.4):
        add_wood(win, offset, .18)
    add_tone(win, 1.36, 1.05, midi(50), .16, harmonics=(1, .35), attack=.02, release=.5)
    write("victory.wav", win)

    spring = blank(2.2)
    for index, note in enumerate((62, 66, 69, 74, 78, 81, 86)):
        add_pluck(spring, index * .16, note, .18, .72)
        add_noise(spring, index * .16, .12, .035, seed=1200 + index, decay=12, highpass=True)
    for offset in (1.25, 1.42, 1.59):
        add_tone(spring, offset, .46, 1500 + offset * 220, .08, harmonics=(1, .4), attack=.002, release=.26, decay=5)
    write("spring.wav", spring)

    ui = blank(.28)
    add_tone(ui, 0, .22, 740, .11, harmonics=(1, .34), attack=.004, release=.14, decay=5, glide=.12)
    write("ui-confirm.wav", ui)


def main() -> None:
    background_music()
    sound_effects()
    print(f"Generated original audio in {OUTPUT}")


if __name__ == "__main__":
    main()
