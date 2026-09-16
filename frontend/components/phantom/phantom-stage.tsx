"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Clock3, Home, RotateCcw, Shuffle, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

import { GameLobby } from "./game-lobby";
import { PhantomLogo } from "./phantom-logo";
import { RealGameTable } from "./real-game-table";
import { RealPolicyPanel } from "./real-policy-panel";
import { RulesDialog } from "./rules-dialog";
import { useGameAudio } from "./use-game-audio";
import { useRealGame } from "./use-real-game";

type Experience = "lobby" | "play" | "watch";
export type DealPhase = "waiting" | "dealing" | "reveal" | "ready";

export function PhantomStage() {
  const [experience, setExperience] = useState<Experience>("lobby");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [dealPhase, setDealPhase] = useState<DealPhase>("waiting");
  const reduceMotion = useReducedMotion();
  const live = experience !== "lobby" && gameStarted;
  const humanMode = experience === "play";
  const realGame = useRealGame(live, humanMode ? "play" : "game");
  const { startAutoPlay } = realGame;
  const audio = useGameAudio(dealPhase === "ready" ? realGame.event : null);

  useEffect(() => {
    if (dealPhase !== "dealing" || !realGame.event?.state?.landlord_cards?.length) return;
    const revealTimer = window.setTimeout(() => setDealPhase("reveal"), 900);
    return () => window.clearTimeout(revealTimer);
  }, [dealPhase, realGame.event?.state?.landlord_cards?.length]);

  useEffect(() => {
    if (dealPhase !== "reveal") return;
    const readyTimer = window.setTimeout(() => {
      setDealPhase("ready");
      if (!humanMode) startAutoPlay();
    }, humanMode ? 1900 : 1500);
    return () => window.clearTimeout(readyTimer);
  }, [dealPhase, humanMode, startAutoPlay]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requested = new URLSearchParams(window.location.search).get("mode");
      if (requested === "play") setExperience("play");
      else if (requested === "real" || requested === "game" || requested === "replay") setExperience("watch");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function enter(next: Exclude<Experience, "lobby">) {
    audio.activate();
    audio.playCue("ui");
    setExperience(next);
    setGameStarted(false);
    setDealPhase("waiting");
    realGame.newDeal();
    window.history.replaceState({}, "", `?mode=${next === "play" ? "play" : "real"}`);
  }

  function goHome() {
    audio.playCue("ui");
    setExperience("lobby");
    setGameStarted(false);
    setDealPhase("waiting");
    window.history.replaceState({}, "", window.location.pathname);
  }

  function beginDeal() {
    audio.activate();
    audio.playCue("shuffle");
    setDealPhase("dealing");
    setGameStarted(true);
  }

  function prepareNewDeal() {
    audio.playCue("ui");
    setGameStarted(false);
    setDealPhase("waiting");
    realGame.newDeal();
  }

  return (
    <main className="phantom-app">
      <AnimatePresence mode="wait" initial={false}>
        {experience === "lobby" ? (
          <motion.div key="lobby" className="experience-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }} transition={{ duration: reduceMotion ? 0 : .55 }}>
            <GameLobby
              onPlay={() => enter("play")}
              onWatch={() => enter("watch")}
              onRules={() => { audio.playCue("ui"); setRulesOpen(true); }}
              muted={audio.muted}
              onToggleSound={audio.toggleMuted}
            />
          </motion.div>
        ) : (
          <motion.div key="game" className="experience-view" initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .68, ease: [.22, 1, .36, 1] }}>
          <header className="game-header">
            <PhantomLogo compact />
            <div className="game-purpose">
              <strong>{humanMode ? "斗地主辅助智能体 · 实战验证沙盘" : "辅助体自动推演 · 观察建议形成过程"}</strong>
              <span>{humanMode ? "你负责决策，AI 提供校验、比较与解释" : "自动牌局用于持续验证规则与策略"}</span>
            </div>
            <nav aria-label="辅助演示模式">
              <button type="button" className={humanMode ? "active" : ""} onClick={() => enter("play")}>实战辅助</button>
              <button type="button" className={!humanMode ? "active" : ""} onClick={() => enter("watch")}>自动推演</button>
            </nav>
            <div className="header-actions">
              <span className="pace-badge"><Clock3 size={15} />阅读友好</span>
              <button type="button" aria-pressed={!audio.muted} onClick={audio.toggleMuted}>{audio.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}{audio.muted ? "开启声音" : "声音"}</button>
              <button type="button" onClick={() => { audio.playCue("ui"); setRulesOpen(true); }}><BookOpen size={17} />规则</button>
              <button type="button" onClick={prepareNewDeal}>{humanMode ? <Shuffle size={17} /> : <RotateCcw size={17} />}{humanMode ? "新牌局" : "再看一局"}</button>
              <button type="button" onClick={goHome}><Home size={17} />作品介绍</button>
            </div>
          </header>

          <div className="game-workspace">
            <RealGameTable
              event={realGame.event}
              status={realGame.status}
              onRestart={() => { audio.playCue("shuffle"); realGame.restart(); }}
              onNewDeal={prepareNewDeal}
              dealPhase={dealPhase}
              onStartDeal={beginDeal}
              humanMode={humanMode}
              onHumanAction={realGame.sendHumanAction}
              onOpenRules={() => { audio.playCue("ui"); setRulesOpen(true); }}
              onSound={audio.playCue}
            />
            <RealPolicyPanel
              event={realGame.event}
              status={realGame.status}
              humanMode={humanMode}
              dealPhase={dealPhase}
              onOpenRules={() => setRulesOpen(true)}
            />
          </div>
          </motion.div>
        )}
      </AnimatePresence>
      <RulesDialog open={rulesOpen} onOpenChange={setRulesOpen} />
    </main>
  );
}
