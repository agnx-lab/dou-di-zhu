"""Generate the complete offline Mandarin card-announcer pack

Every common Dou Dizhu move gets a full phrase instead of a generic category
label  The browser therefore never needs an online speech service during play
"""

from __future__ import annotations

import asyncio
import argparse
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend" / "public" / "audio" / "voice"
VOICE = "zh-CN-XiaoyiNeural"
RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "X", "D"]
PAIR_RANKS = RANKS[:13]
SEQUENCE_RANKS = RANKS[:12]
SPOKEN = {
    "3": "三", "4": "四", "5": "五", "6": "六", "7": "七", "8": "八", "9": "九", "10": "十",
    "J": "勾", "Q": "圈", "K": "凯", "A": "尖", "2": "二", "X": "小王", "D": "大王",
}
VOICE_SPOKEN = {**SPOKEN, "Q": "圈儿"}


def voice_rank(rank: str) -> str:
    """Use 圈儿 for Q so Mandarin TTS cannot misread 圈 as juan"""
    return VOICE_SPOKEN[rank]


def sequence_lines(prefix: str, noun: str, minimum: int, maximum: int) -> dict[str, str]:
    lines: dict[str, str] = {}
    for length in range(minimum, maximum + 1):
        for start in range(0, len(SEQUENCE_RANKS) - length + 1):
            first = SEQUENCE_RANKS[start]
            last = SEQUENCE_RANKS[start + length - 1]
            lines[f"{prefix}-{first}-{last}"] = f"{noun}，{voice_rank(first)}到{voice_rank(last)}"
    return lines


def build_lines() -> dict[str, str]:
    lines = {
        "pass": "不出",
        "spring": "春天！",
        "rocket": "王炸！",
        "your-turn": "轮到你了",
        "landlord-win": "地主获胜",
        "farmer-win": "农民获胜",
        "airplane": "飞机",
        "four-two": "四带二",
    }
    for rank in RANKS:
        lines[f"single-{rank}"] = voice_rank(rank)
    for rank in PAIR_RANKS:
        lines[f"pair-{rank}"] = f"对{voice_rank(rank)}"
        lines[f"triple-{rank}"] = f"三个{voice_rank(rank)}"
        lines[f"bomb-{rank}"] = f"四个{voice_rank(rank)}，炸弹！"
        lines[f"four-two-single-{rank}"] = f"四个{voice_rank(rank)}，带两张"
        lines[f"four-two-pair-{rank}"] = f"四个{voice_rank(rank)}，带两对"
        for kicker in RANKS:
            if kicker != rank:
                lines[f"triple-single-{rank}-{kicker}"] = f"三个{voice_rank(rank)}，带一张{voice_rank(kicker)}"
        for kicker in PAIR_RANKS:
            if kicker != rank:
                lines[f"triple-pair-{rank}-{kicker}"] = f"三个{voice_rank(rank)}，带一对{voice_rank(kicker)}"
    lines.update(sequence_lines("straight", "顺子", 5, 12))
    lines.update(sequence_lines("serial-pair", "连对", 3, 10))
    lines.update(sequence_lines("serial-triple", "飞机", 2, 6))
    for wing, noun, maximum in (("single", "带单牌", 5), ("pair", "带对子", 4)):
        for length in range(2, maximum + 1):
            for start in range(0, len(SEQUENCE_RANKS) - length + 1):
                first = SEQUENCE_RANKS[start]
                last = SEQUENCE_RANKS[start + length - 1]
                lines[f"airplane-{wing}-{first}-{last}"] = f"飞机，{voice_rank(first)}到{voice_rank(last)}，{noun}"
    return lines


LINES = build_lines()


async def generate(key: str, speech_text: str, semaphore: asyncio.Semaphore) -> None:
    path = OUTPUT / f"{key}.mp3"
    async with semaphore:
        for attempt in range(3):
            try:
                speech = edge_tts.Communicate(speech_text, VOICE, rate="+3%", pitch="+5Hz", volume="+0%")
                await speech.save(str(path))
                return
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(0.8 * (attempt + 1))


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only-q", action="store_true", help="regenerate only announcements whose key contains Q")
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(6)
    selected = {key: speech_text for key, speech_text in LINES.items() if not args.only_q or "Q" in key}
    await asyncio.gather(*(generate(key, speech_text, semaphore) for key, speech_text in selected.items()))
    print(f"Generated {len(selected)} complete Mandarin announcer lines in {OUTPUT}")


if __name__ == "__main__":
    asyncio.run(main())
