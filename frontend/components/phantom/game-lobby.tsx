"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BrainCircuit, ChevronRight, Eye, ScrollText, TrendingUp, Volume2, VolumeX } from "lucide-react";

import { PhantomLogo } from "./phantom-logo";
import { PlayingCard } from "./playing-card";

export function GameLobby({ onPlay, onWatch, onRules, muted, onToggleSound }: {
  onPlay: () => void;
  onWatch: () => void;
  onRules: () => void;
  muted: boolean;
  onToggleSound: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const reveal = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 22 },
    visible: { opacity: 1, y: 0 },
  };
  return (
    <section className="game-lobby">
      <motion.header className="lobby-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : .7 }}>
        <PhantomLogo />
        <div className="lobby-header-actions">
          <button type="button" className="quiet-button sound-button" aria-pressed={!muted} onClick={onToggleSound}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}{muted ? "开启声音" : "声音已开启"}</button>
          <button type="button" className="quiet-button" onClick={onRules}><ScrollText size={18} />完整规则</button>
        </div>
      </motion.header>

      <div className="lobby-content">
        <motion.div
          className="lobby-copy"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: reduceMotion ? 0 : .14, delayChildren: reduceMotion ? 0 : .18 }}
        >
          <motion.span variants={reveal} transition={{ duration: .65 }} className="lobby-eyebrow">可解释 · 会成长 · 斗地主决策辅助智能体</motion.span>
          <motion.h1 variants={reveal} transition={{ duration: .75 }}>斗地主 AI<br /><em>不只会出牌</em></motion.h1>
          <motion.p variants={reveal} transition={{ duration: .7 }}>「幻局」是一套为真人对局而生的斗地主 AI 辅助智能体  它会读懂牌势、比较合法走法、解释推荐依据，并在跨局陪练中逐渐理解你的打法</motion.p>

          <motion.div variants={reveal} transition={{ duration: .7 }} className="lobby-actions">
            <button type="button" className="start-button" onClick={onPlay}>
              <span><BrainCircuit size={22} /><b>让 AI 辅助我出牌</b><small>你做决定 · AI 负责推演与解释</small></span>
              <ChevronRight size={24} />
            </button>
            <button type="button" className="watch-button" onClick={onWatch}>
              <Eye size={19} /><span><b>观看 AI 自动推演</b><small>看它如何分析牌局并形成建议</small></span>
            </button>
          </motion.div>

          <motion.p variants={reveal} transition={{ duration: .7 }} className="competition-thesis">
            <BrainCircuit size={18} /><span><b>不是替你做决定</b>，而是把规则校验、方案比较与推荐依据全部摆在你面前</span>
          </motion.p>

          <motion.div variants={reveal} transition={{ duration: .7 }} className="lobby-promises" aria-label="辅助体能力">
            <span><BrainCircuit size={16} /><b>建议有据可查</b><small>每一手都展示模型判断过程</small></span>
            <span><TrendingUp size={16} /><b>陪练越打越懂你</b><small>跨局学习你的出牌习惯</small></span>
          </motion.div>

          <motion.div variants={reveal} transition={{ duration: .7 }} className="lobby-rules" aria-label="智能辅助流程">
            <div><b>01</b><span><strong>读懂牌势</strong><small>识别牌权、牌型与公开信息</small></span></div>
            <div><b>02</b><span><strong>推演选择</strong><small>比较合法走法、收益与风险</small></span></div>
            <div><b>03</b><span><strong>解释给你</strong><small>展示推荐依据，由你最终确认</small></span></div>
          </motion.div>
        </motion.div>

        <motion.aside className="lobby-art" aria-label="智能辅助流程示意" initial={{ opacity: 0, scale: reduceMotion ? 1 : .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduceMotion ? 0 : 1.05, delay: .24 }}>
          <motion.div className="lobby-seal" initial={{ opacity: 0, rotate: reduceMotion ? 6 : -18, scale: .7 }} animate={{ opacity: 1, rotate: 6, scale: 1 }} transition={{ duration: reduceMotion ? 0 : .75, delay: .95 }}>辅助</motion.div>
          <div className="hero-cards">
            <motion.div initial={{ opacity: 0, x: 70, y: 65, rotate: 2 }} animate={{ opacity: 1, x: 18, y: 17, rotate: -13 }} transition={{ duration: reduceMotion ? 0 : .9, delay: .46, ease: [.22, 1, .36, 1] }}><PlayingCard rank="A" suit="spade" /></motion.div>
            <motion.div initial={{ opacity: 0, y: 95, scale: .9 }} animate={{ opacity: 1, y: -3, scale: 1 }} transition={{ duration: reduceMotion ? 0 : .95, delay: .36, ease: [.22, 1, .36, 1] }}><PlayingCard rank="2" suit="heart" /></motion.div>
            <motion.div initial={{ opacity: 0, x: -70, y: 65, rotate: -2 }} animate={{ opacity: 1, x: -18, y: 17, rotate: 13 }} transition={{ duration: reduceMotion ? 0 : .9, delay: .56, ease: [.22, 1, .36, 1] }}><PlayingCard rank="大王" suit="joker" /></motion.div>
          </div>
          <motion.div className="lab-note" initial={{ opacity: 0, x: "-50%", y: reduceMotion ? 0 : 16 }} animate={{ opacity: 1, x: "-50%", y: 0 }} transition={{ duration: reduceMotion ? 0 : .75, delay: 1.05 }}>
            <BrainCircuit size={21} />
            <span><strong>AI 正在思考这一手</strong><small>比较候选走法，并公开推荐依据</small></span>
          </motion.div>
        </motion.aside>
      </div>

      <motion.footer className="lobby-footer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : .8, delay: 1.1 }}>
        <span>为什么值得体验</span>
        <div><b>真实模型</b><small>不是演出脚本</small></div>
        <div><b>规则安全门</b><small>不推荐非法牌型</small></div>
        <div><b>透明证据链</b><small>看得见判断依据</small></div>
        <div><b>跨局成长</b><small>越陪练越懂你的打法</small></div>
      </motion.footer>
    </section>
  );
}
