"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RealGameEvent } from "./use-real-game";

export type GameSoundCue = "select" | "play" | "pass" | "turn" | "shuffle" | "bomb" | "rocket" | "victory" | "spring" | "ui";

type SoundLayer = {
  file: string;
  volume: number;
  delay?: number;
  rate?: number;
  maxDuration?: number;
  fadeOut?: number;
};

const soundPalettes: Record<GameSoundCue, SoundLayer[][]> = {
  select: [
    [{ file: "/audio/foley/card-slide-2.ogg", volume: 0.22, rate: 1.08 }],
    [{ file: "/audio/foley/card-slide-5.ogg", volume: 0.2, rate: 1.12 }],
  ],
  play: [
    [
      { file: "/audio/foley/card-shove-2.ogg", volume: 0.36 },
      { file: "/audio/foley/card-place-1.ogg", volume: 0.5, delay: 70 },
    ],
    [
      { file: "/audio/foley/card-slide-5.ogg", volume: 0.32 },
      { file: "/audio/foley/card-place-2.ogg", volume: 0.5, delay: 62 },
    ],
  ],
  pass: [[
    { file: "/audio/foley/chip-lay-2.ogg", volume: 0.22 },
    { file: "/audio/pass.wav", volume: 0.2, delay: 30 },
  ]],
  turn: [[{ file: "/audio/your-turn.wav", volume: 0.3 }]],
  shuffle: [[
    { file: "/audio/foley/card-shuffle.ogg", volume: 0.48 },
    { file: "/audio/foley/card-fan-1.ogg", volume: 0.32, delay: 370 },
  ]],
  bomb: [[
    { file: "/audio/foley/card-shove-2.ogg", volume: 0.32, rate: 0.92 },
    { file: "/audio/foley/card-place-3.ogg", volume: 0.4, delay: 58, rate: 0.84 },
    { file: "/audio/cinematic/cinematic-drum-hit.mp3", volume: 0.24, delay: 300, rate: 1.04, maxDuration: 1450, fadeOut: 520 },
    { file: "/audio/cinematic/organic-impact.mp3", volume: 0.42, delay: 560, rate: 1.06, maxDuration: 2350, fadeOut: 900 },
  ]],
  rocket: [[
    { file: "/audio/foley/card-fan-1.ogg", volume: 0.34, rate: 0.92 },
    { file: "/audio/cinematic/airfold-impact.mp3", volume: 0.2, delay: 34, rate: 1.04, maxDuration: 1280, fadeOut: 460 },
    { file: "/audio/foley/card-place-3.ogg", volume: 0.42, delay: 286, rate: 0.82 },
    { file: "/audio/cinematic/cinematic-drum-hit.mp3", volume: 0.3, delay: 330, rate: 0.98, maxDuration: 1600, fadeOut: 560 },
    { file: "/audio/cinematic/organic-impact.mp3", volume: 0.5, delay: 610, rate: 0.96, maxDuration: 2700, fadeOut: 1050 },
  ]],
  victory: [[{ file: "/audio/victory.wav", volume: 0.48 }]],
  spring: [[
    { file: "/audio/spring.wav", volume: 0.54 },
    { file: "/audio/cinematic/royal-spark.ogg", volume: 0.24, delay: 520, rate: 1.05 },
  ]],
  ui: [[{ file: "/audio/ui-confirm.wav", volume: 0.22 }]],
};

const rankOrder = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "X", "D"];
const spokenRanks: Record<string, string> = {
  "3": "三", "4": "四", "5": "五", "6": "六", "7": "七", "8": "八", "9": "九", "10": "十",
  J: "勾", Q: "圈儿", K: "凯", A: "尖", "2": "二", X: "小王", D: "大王",
};

function sortedRanks(cards: string[]) {
  return [...new Set(cards)].sort((left, right) => rankOrder.indexOf(left) - rankOrder.indexOf(right));
}

function cardCounts(cards: string[]) {
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(card, (counts.get(card) ?? 0) + 1);
  return counts;
}

function rankWithCount(counts: Map<string, number>, amount: number) {
  return rankOrder.find((rank) => counts.get(rank) === amount);
}

function actionAnnouncement(event: RealGameEvent) {
  if (event.is_pass) return { text: "不出", key: "pass" };
  const cards = event.action ?? [];
  const label = event.action_type ?? "出牌";
  const counts = cardCounts(cards);
  const ranks = sortedRanks(cards);
  const first = ranks[0];
  const last = ranks.at(-1);
  const spoken = (rank?: string) => rank ? spokenRanks[rank] ?? rank : "";

  if (label === "单张" && first) return { text: spoken(first), key: `single-${first}` };
  if (label === "对子" && first) return { text: `对${spoken(first)}`, key: `pair-${first}` };
  if (label === "三张" && first) return { text: `三个${spoken(first)}`, key: `triple-${first}` };
  if (label === "炸弹" && first) return { text: `四个${spoken(first)}，炸弹`, key: `bomb-${first}` };
  if (label === "王炸") return { text: "王炸", key: "rocket" };

  if (label === "三带一" || label === "三带二") {
    const main = rankWithCount(counts, 3);
    const kicker = rankOrder.find((rank) => rank !== main && counts.has(rank));
    if (main && kicker && label === "三带一") {
      return { text: `三个${spoken(main)}带一张${spoken(kicker)}`, key: `triple-single-${main}-${kicker}` };
    }
    if (main && kicker) {
      return { text: `三个${spoken(main)}带一对${spoken(kicker)}`, key: `triple-pair-${main}-${kicker}` };
    }
  }

  if ((label === "顺子" || label === "连对" || label === "飞机不带翅膀") && first && last) {
    const prefix = label === "顺子" ? "straight" : label === "连对" ? "serial-pair" : "serial-triple";
    const noun = label === "飞机不带翅膀" ? "飞机" : label;
    return { text: `${noun}，${spoken(first)}到${spoken(last)}`, key: `${prefix}-${first}-${last}` };
  }

  if (label.startsWith("飞机")) {
    const body = rankOrder.filter((rank) => (counts.get(rank) ?? 0) >= 3);
    const bodyFirst = body[0];
    const bodyLast = body.at(-1);
    const wing = label.includes("对子") ? "pair" : "single";
    if (bodyFirst && bodyLast) {
      const wingName = wing === "pair" ? "带对子" : "带单牌";
      return { text: `飞机，${spoken(bodyFirst)}到${spoken(bodyLast)}，${wingName}`, key: `airplane-${wing}-${bodyFirst}-${bodyLast}` };
    }
    return { text: "飞机", key: "airplane" };
  }

  if (label.startsWith("四带")) {
    const main = rankWithCount(counts, 4);
    if (main) {
      const wing = label.includes("两对") ? "pair" : "single";
      const wingName = wing === "pair" ? "带两对" : "带两张";
      return { text: `四个${spoken(main)}${wingName}`, key: `four-two-${wing}-${main}` };
    }
    return { text: label, key: "four-two" };
  }
  return { text: label, key: undefined };
}

export function useGameAudio(event: RealGameEvent | null) {
  const [muted, setMuted] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("phantom-sound") === "off");
  const mutedRef = useRef(muted);
  const unlockedRef = useRef(false);
  const contextRef = useRef<AudioContext | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const musicSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const musicLoadingRef = useRef<Promise<void> | null>(null);
  const activeAudioRef = useRef(new Set<HTMLAudioElement>());
  const activeVoiceRef = useRef<HTMLAudioElement | null>(null);
  const lastEventRef = useRef("");
  const variationRef = useRef(0);
  const timersRef = useRef(new Set<number>());
  const specialDuckUntilRef = useRef(0);

  const setMusicLevel = useCallback((level: number, seconds = 0.35) => {
    const context = contextRef.current;
    const gain = musicGainRef.current;
    if (!context || !gain) return;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setTargetAtTime(level, context.currentTime, seconds);
  }, []);

  const restoreMusic = useCallback(() => {
    if (mutedRef.current) return;
    const remaining = specialDuckUntilRef.current - performance.now();
    if (remaining > 0) {
      setMusicLevel(0.035, 0.16);
      const timer = window.setTimeout(() => {
        timersRef.current.delete(timer);
        if (!mutedRef.current && performance.now() >= specialDuckUntilRef.current) setMusicLevel(0.16, 0.65);
      }, remaining + 24);
      timersRef.current.add(timer);
      return;
    }
    setMusicLevel(0.16, 0.5);
  }, [setMusicLevel]);

  const duckForSpecial = useCallback((duration: number) => {
    specialDuckUntilRef.current = Math.max(specialDuckUntilRef.current, performance.now() + duration);
    setMusicLevel(0.025, 0.06);
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      if (!mutedRef.current && performance.now() >= specialDuckUntilRef.current) setMusicLevel(0.16, 0.65);
    }, duration + 30);
    timersRef.current.add(timer);
  }, [setMusicLevel]);

  const startMusic = useCallback(() => {
    if (!contextRef.current) {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const gain = context.createGain();
      gain.gain.value = mutedRef.current ? 0 : 0.16;
      gain.connect(context.destination);
      contextRef.current = context;
      musicGainRef.current = gain;
    }
    const context = contextRef.current;
    if (!context) return;
    void context.resume();
    if (musicSourceRef.current || musicLoadingRef.current) return;
    musicLoadingRef.current = fetch("/audio/music/happy-table-loop.wav")
      .then((response) => {
        if (!response.ok) throw new Error(`music ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        if (!musicGainRef.current || context.state === "closed") return;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = buffer.duration;
        source.connect(musicGainRef.current);
        source.start();
        musicSourceRef.current = source;
      })
      .catch(() => undefined)
      .finally(() => { musicLoadingRef.current = null; });
  }, []);

  const playLayer = useCallback((layer: SoundLayer) => {
    const run = () => {
      if (mutedRef.current) return;
      const sample = new Audio(layer.file);
      sample.volume = layer.volume;
      sample.playbackRate = layer.rate ?? 1;
      activeAudioRef.current.add(sample);
      let fadeStartTimer: number | undefined;
      let fadeInterval: number | undefined;
      const release = () => {
        activeAudioRef.current.delete(sample);
        if (fadeStartTimer !== undefined) {
          window.clearTimeout(fadeStartTimer);
          timersRef.current.delete(fadeStartTimer);
        }
        if (fadeInterval !== undefined) {
          window.clearInterval(fadeInterval);
          timersRef.current.delete(fadeInterval);
        }
      };
      sample.onended = release;
      sample.onerror = release;
      void sample.play().then(() => {
        if (!layer.maxDuration) return;
        const fadeDuration = Math.min(layer.fadeOut ?? 400, layer.maxDuration);
        fadeStartTimer = window.setTimeout(() => {
          if (fadeStartTimer !== undefined) timersRef.current.delete(fadeStartTimer);
          const fadeStartedAt = performance.now();
          fadeInterval = window.setInterval(() => {
            const progress = Math.min(1, (performance.now() - fadeStartedAt) / fadeDuration);
            sample.volume = Math.max(0, layer.volume * (1 - progress));
            if (progress < 1) return;
            if (fadeInterval !== undefined) {
              window.clearInterval(fadeInterval);
              timersRef.current.delete(fadeInterval);
            }
            sample.pause();
            release();
          }, 40);
          timersRef.current.add(fadeInterval);
        }, Math.max(0, layer.maxDuration - fadeDuration));
        timersRef.current.add(fadeStartTimer);
      }).catch(release);
    };
    if (!layer.delay) {
      run();
      return;
    }
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      run();
    }, layer.delay);
    timersRef.current.add(timer);
  }, []);

  const playCue = useCallback((cue: GameSoundCue) => {
    if (mutedRef.current) return;
    const variations = soundPalettes[cue];
    const layers = variations[variationRef.current++ % variations.length];
    for (const layer of layers) playLayer(layer);
  }, [playLayer]);

  const speak = useCallback((text: string, voiceKey?: string, delay = 0, volume = 0.88) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      if (mutedRef.current) return;
      if (voiceKey) {
        activeVoiceRef.current?.pause();
        const voice = new Audio(`/audio/voice/${voiceKey}.mp3`);
        activeVoiceRef.current = voice;
        activeAudioRef.current.add(voice);
        voice.volume = volume;
        setMusicLevel(0.045, 0.12);
        voice.onended = () => {
          activeAudioRef.current.delete(voice);
          if (activeVoiceRef.current === voice) activeVoiceRef.current = null;
          restoreMusic();
        };
        voice.onerror = () => {
          activeAudioRef.current.delete(voice);
          if (activeVoiceRef.current === voice) activeVoiceRef.current = null;
          restoreMusic();
          if (!("speechSynthesis" in window)) return;
          const fallback = new SpeechSynthesisUtterance(text);
          fallback.lang = "zh-CN";
          fallback.rate = 0.96;
          window.speechSynthesis.speak(fallback);
        };
        void voice.play().catch(() => {
          activeAudioRef.current.delete(voice);
          if (activeVoiceRef.current === voice) activeVoiceRef.current = null;
          restoreMusic();
        });
        return;
      }
      if (!("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 0.96;
      utterance.pitch = 1.06;
      setMusicLevel(0.045, 0.12);
      utterance.onend = restoreMusic;
      utterance.onerror = restoreMusic;
      window.speechSynthesis.speak(utterance);
    }, delay);
    timersRef.current.add(timer);
  }, [restoreMusic, setMusicLevel]);

  const activate = useCallback(() => {
    unlockedRef.current = true;
    startMusic();
  }, [startMusic]);

  useEffect(() => {
    mutedRef.current = muted;
    window.localStorage.setItem("phantom-sound", muted ? "off" : "on");
    if (muted) {
      setMusicLevel(0, 0.08);
      for (const audio of activeAudioRef.current) audio.pause();
      activeAudioRef.current.clear();
      activeVoiceRef.current = null;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    } else if (unlockedRef.current) {
      startMusic();
      setMusicLevel(0.16, 0.35);
    }
  }, [muted, setMusicLevel, startMusic]);

  useEffect(() => {
    const timers = timersRef.current;
    const activeAudio = activeAudioRef.current;
    const unlock = () => activate();
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      musicSourceRef.current?.stop();
      musicSourceRef.current = null;
      const context = contextRef.current;
      contextRef.current = null;
      musicGainRef.current = null;
      if (context) void context.close();
      for (const audio of activeAudio) audio.pause();
      activeAudio.clear();
      activeVoiceRef.current = null;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [activate]);

  useEffect(() => {
    if (!event) return;
    const eventKey = [event.type, event.turn, event.actor, event.action_type, event.action?.join(","), event.is_pass, event.winner, event.state?.spring].join(":");
    if (eventKey === lastEventRef.current) return;
    lastEventRef.current = eventKey;

    if (event.type === "session_started") {
      playCue("shuffle");
    } else if (event.type === "human_turn") {
      playCue("turn");
      speak("轮到你了", "your-turn", 260);
    } else if (event.type === "turn_resolved") {
      const announcement = actionAnnouncement(event);
      if (event.is_pass) playCue("pass");
      else if (event.action_type === "王炸") {
        duckForSpecial(3400);
        playCue("rocket");
      } else if (event.action_type === "炸弹") {
        duckForSpecial(2850);
        playCue("bomb");
      }
      else if (event.action_source !== "local_human") playCue("play");
      speak(announcement.text, announcement.key, event.action_type === "王炸" ? 90 : event.action_type === "炸弹" ? 90 : 330, event.action_type === "王炸" || event.action_type === "炸弹" ? 0.98 : 0.88);
    } else if (event.type === "game_finished") {
      if (event.state?.spring) {
        playCue("spring");
        speak("春天", "spring", 520);
        const timer = window.setTimeout(() => {
          timersRef.current.delete(timer);
          playCue("victory");
          speak(event.winner === "landlord" ? "地主获胜" : "农民获胜", event.winner === "landlord" ? "landlord-win" : "farmer-win", 320);
        }, 1900);
        timersRef.current.add(timer);
      } else {
        playCue("victory");
        speak(event.winner === "landlord" ? "地主获胜" : "农民获胜", event.winner === "landlord" ? "landlord-win" : "farmer-win", 520);
      }
    }
  }, [duckForSpecial, event, playCue, speak]);

  const toggleMuted = useCallback(() => {
    activate();
    setMuted((current) => !current);
  }, [activate]);

  return { muted, toggleMuted, activate, playCue };
}
