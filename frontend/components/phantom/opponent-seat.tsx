"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { PlayingCard } from "./playing-card";

export function OpponentSeat({ name, role, count, side, avatarSrc, active = false, justActed = false, actionLabel }: {
  name: string;
  role: string;
  count: number;
  side: "left" | "right";
  avatarSrc: string;
  active?: boolean;
  justActed?: boolean;
  actionLabel?: string;
}) {
  const reduceMotion = useReducedMotion();
  const visibleBacks = Math.max(0, count);

  return (
    <motion.section
      className={`opponent-seat ${side} ${active ? "active" : ""} ${justActed ? "just-acted" : ""}`}
      animate={justActed && !reduceMotion ? { scale: [1, 1.035, 1] } : { scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : .9, ease: [.22, 1, .36, 1] }}
      aria-label={`${name}，剩余 ${count} 张牌${active ? "，等待出牌" : ""}`}
    >
      <div className="seat-avatar">
        <span className="avatar-photo" style={{ backgroundImage: `url(${avatarSrc})` }} />
        <b>{side === "left" ? "上" : "下"}</b>
        <i />
      </div>
      <div className="seat-copy">
        <div><strong>{name}</strong><span>{role}</span></div>
        <p>剩余 <AnimatePresence mode="wait" initial={false}><motion.b key={count} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: reduceMotion ? 0 : .45 }}>{count}</motion.b></AnimatePresence> 张牌</p>
      </div>
      <div className="opponent-cards" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          {Array.from({ length: visibleBacks }, (_, item) => (
            <motion.div key={item} layout initial={{ opacity: 0, x: side === "left" ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -12, scale: .86 }} transition={{ duration: reduceMotion ? 0 : .48 }}>
              <PlayingCard rank="" suit="spade" facedown small />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {justActed && actionLabel && (
          <motion.span className="seat-action-badge" initial={{ opacity: 0, x: reduceMotion ? 0 : side === "left" ? -18 : 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .55 }}>
            {actionLabel}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
