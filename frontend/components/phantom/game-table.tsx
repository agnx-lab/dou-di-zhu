"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { mockHand } from "./mock-data";
import { OpponentSeat } from "./opponent-seat";
import { PlayingCard, type Suit } from "./playing-card";

type CardModel = { id: string; rank: string; suit: Suit };
type Impact = "deal" | "play" | "pass" | "bomb" | "rocket" | "win" | null;

const initialCards: CardModel[] = mockHand.map(([rank, suit], index) => ({
  id: `${rank}-${suit}-${index}`,
  rank,
  suit,
}));

const initialPlayed: CardModel[] = [
  { id: "played-k-diamond", rank: "K", suit: "diamond" },
  { id: "played-k-club", rank: "K", suit: "club" },
];

const impactCopy: Record<Exclude<Impact, null>, { eyebrow: string; title: string }> = {
  deal: { eyebrow: "牌桌已重置", title: "发牌" },
  play: { eyebrow: "动作已确认", title: "出牌" },
  pass: { eyebrow: "主动让出节奏", title: "不出" },
  bomb: { eyebrow: "打破控制", title: "炸弹" },
  rocket: { eyebrow: "绝对控制", title: "王炸" },
  win: { eyebrow: "胜局已定", title: "终局" },
};

export function GameTable({ cognitiveEnabled }: { cognitiveEnabled: boolean }) {
  const [cards, setCards] = useState(initialCards);
  const [selected, setSelected] = useState<string[]>(initialCards.slice(0, 2).map((card) => card.id));
  const [played, setPlayed] = useState(initialPlayed);
  const [lastMoveType, setLastMoveType] = useState("动作");
  const [impact, setImpact] = useState<Impact>(null);
  const [dealCycle, setDealCycle] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const selectedCards = useMemo(
    () => cards.filter((card) => selected.includes(card.id)),
    [cards, selected],
  );

  function schedule(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    timers.current.push(timer);
  }

  function showImpact(next: Impact, duration = 820) {
    setImpact(next);
    schedule(() => setImpact((current) => current === next ? null : current), duration);
  }

  function toggleCard(id: string) {
    setSelected((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]
    );
  }

  function playSelection() {
    if (selectedCards.length === 0) return;
    const isRocket = selectedCards.length === 2 && selectedCards.every((card) => card.suit === "joker");
    const isBomb = selectedCards.length === 4 && selectedCards.every((card) => card.rank === selectedCards[0].rank);
    const nextImpact: Impact = isRocket ? "rocket" : isBomb ? "bomb" : "play";
    const selectedIds = new Set(selectedCards.map((card) => card.id));
    const remaining = cards.filter((card) => !selectedIds.has(card.id));

    setPlayed(selectedCards);
    setLastMoveType(isRocket ? "王炸" : isBomb ? "炸弹" : "动作");
    setCards(remaining);
    setSelected([]);
    showImpact(nextImpact, nextImpact === "rocket" ? 1050 : nextImpact === "bomb" ? 900 : 650);
    if (remaining.length === 0) schedule(() => showImpact("win", 1300), 1100);
  }

  function passTurn() {
    setSelected([]);
    showImpact("pass", 650);
  }

  function redeal() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setCards(initialCards);
    setSelected(initialCards.slice(0, 2).map((card) => card.id));
    setPlayed(initialPlayed);
    setLastMoveType("对子");
    setDealCycle((cycle) => cycle + 1);
    showImpact("deal", 900);
  }

  return (
    <section className={`table-shell impact-${impact ?? "idle"}`} aria-label="斗地主牌桌">
      <div className="table-coordinate top">北 · 01</div>
      <div className="table-coordinate left">西 · 02</div>
      <div className="round-meta">
        <span>演示牌局 01</span>
        <strong>第 08 手 / PHANTOM</strong>
        <button onClick={redeal}>重新发牌</button>
      </div>
      <OpponentSeat name="白露" role="地主上家" count={11} side="top" />
      <OpponentSeat name="明" role="地主下家" count={9} side="left" />

      <motion.div className="landlord-cards" aria-label="地主底牌" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .42 }}>
        <span>地主底牌</span>
        <div>
          <PlayingCard rank="7" suit="heart" small />
          <PlayingCard rank="Q" suit="club" small />
          <PlayingCard rank="2" suit="spade" small />
        </div>
      </motion.div>

      <div className="turn-orbit" aria-hidden="true"><i /><span>PHANTOM 决策中</span></div>

      <div className="played-zone" aria-live="polite">
        <small>{played === initialPlayed ? "上一步 · 明" : "当前出牌 · PHANTOM"}</small>
        <div className="played-cards">
          <AnimatePresence mode="popLayout">
            {played.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 45, scale: .88, rotate: index * 2 - 2 }}
                animate={{ opacity: 1, y: index * 3, scale: 1, rotate: index * 2 - 2 }}
                exit={{ opacity: 0, y: -16, scale: .92 }}
                transition={{ type: "spring", stiffness: 280, damping: 24, delay: index * .035 }}
              >
                <PlayingCard rank={card.rank} suit={card.suit} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <p>{played === initialPlayed ? "对子 · 检测到关键控制牌投入" : `${lastMoveType} · 公共牌面已更新`}</p>
      </div>

      <AnimatePresence>
        {impact && (
          <motion.div
            key={`${impact}-${dealCycle}`}
            className={`impact-overlay ${impact}`}
            initial={{ opacity: 0, scale: .88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
          >
            <i /><div><small>{impactCopy[impact].eyebrow}</small><strong>{impactCopy[impact].title}</strong></div><i />
          </motion.div>
        )}
      </AnimatePresence>

      <section className="player-seat">
        <div className="player-identity">
          <span className="phantom-avatar">幻</span>
          <div><strong>PHANTOM</strong><small>地主 · 手牌 {cards.length} 张</small></div>
          <span className="thinking">{cognitiveEnabled ? "认知层已启用" : "基础策略运行中"}</span>
          <div className="turn-actions">
            <button className="pass-action" onClick={passTurn}>不出</button>
            <button className="play-action" disabled={selected.length === 0} onClick={playSelection}>出牌 <span>{selected.length || ""}</span></button>
          </div>
        </div>
        <motion.div className="player-hand" layout>
          <AnimatePresence mode="popLayout">
            {cards.map((card, index) => (
              <motion.button
                layout
                key={`${dealCycle}-${card.id}`}
                className="card-hit"
                onClick={() => toggleCard(card.id)}
                aria-label={`选择 ${card.rank}${card.suit}`}
                aria-pressed={selected.includes(card.id)}
                initial={{ opacity: 0, y: -160, rotate: -4 + index * .45 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: -85, scale: .88 }}
                transition={{ type: "spring", stiffness: 230, damping: 25, delay: Math.min(index * .035, .42) }}
                whileTap={{ scale: .98 }}
              >
                <PlayingCard rank={card.rank} suit={card.suit} selected={selected.includes(card.id)} />
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
        <p className="selection-help">点击选择手牌 · 四张 8 可触发炸弹 · 双王可触发王炸</p>
      </section>
    </section>
  );
}
