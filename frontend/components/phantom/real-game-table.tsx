"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { classifyCombination } from "./dou-dizhu-rules";
import { OpponentSeat } from "./opponent-seat";
import type { DealPhase } from "./phantom-stage";
import { PlayingCard, type Suit } from "./playing-card";
import type { GameSoundCue } from "./use-game-audio";
import type { BridgeStatus, RealGameEvent } from "./use-real-game";

const suitCycle: Suit[] = ["spade", "heart", "club", "diamond"];
const rankOrder = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
const allRankOrder = [...rankOrder, "X", "D"];

function canonical(cards: string[]) {
  return [...cards].sort((a, b) => allRankOrder.indexOf(a) - allRankOrder.indexOf(b)).join("|");
}

function visualCard(rank: string, index: number) {
  if (rank === "X") return { rank: "小王", suit: "joker" as Suit };
  if (rank === "D") return { rank: "大王", suit: "joker" as Suit };
  const rankOffset = Math.max(0, rankOrder.indexOf(rank));
  return { rank, suit: suitCycle[(rankOffset + index) % suitCycle.length] };
}

function displayRank(rank: string) {
  if (rank === "X") return "小王";
  if (rank === "D") return "大王";
  return rank;
}

function displayAction(cards: string[]) {
  return cards.length ? cards.map(displayRank).join(" ") : "不出";
}

function occurrenceAt(cards: string[], index: number) {
  return cards.slice(0, index).filter((rank) => rank === cards[index]).length;
}

function playerLabel(player?: string | null) {
  if (player === "landlord") return "地主";
  if (player === "landlord_up") return "农民上家";
  if (player === "landlord_down") return "农民下家";
  if (player === "farmer") return "农民阵营";
  return "牌桌";
}

function sourceLabel(source?: string) {
  if (source === "local_human") return "你的出牌";
  if (source === "phantom_safe_reranker_v1") return "智能策略建议";
  if (source === "douzero_base_fallback") return "稳妥策略";
  if (source === "douzero_adp_checkpoint") return "电脑出牌";
  return "牌局记录";
}

function actionOrigin(player?: string | null) {
  if (player === "landlord_up") return { x: -260, y: 12, side: "left", mark: "上" };
  if (player === "landlord_down") return { x: 260, y: 12, side: "right", mark: "下" };
  return { x: 0, y: 150, side: "bottom", mark: "地" };
}

type DragSelection = {
  pointerId: number;
  origin: Set<number>;
  visited: Set<number>;
  selecting: boolean;
  lastIndex: number;
  preview: number[];
};

function applyDragSelection(origin: Set<number>, visited: Set<number>, selecting: boolean) {
  const next = new Set(origin);
  for (const index of visited) {
    if (selecting) next.add(index);
    else next.delete(index);
  }
  return [...next].sort((a, b) => a - b);
}

export function RealGameTable({ event, status, onRestart, onNewDeal, dealPhase, onStartDeal, humanMode, onHumanAction, onOpenRules, onSound }: {
  event: RealGameEvent | null;
  status: BridgeStatus;
  onRestart: () => void;
  onNewDeal: () => void;
  dealPhase: DealPhase;
  onStartDeal: () => void;
  humanMode: boolean;
  onHumanAction: (action: string[]) => boolean;
  onOpenRules: () => void;
  onSound: (cue: GameSoundCue) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [dragPreview, setDragPreview] = useState<number[] | null>(null);
  const dragSelection = useRef<DragSelection | null>(null);
  const suppressClick = useRef(false);
  const reduceMotion = useReducedMotion();
  const state = event?.state;
  const hand = dealPhase === "ready" ? state?.phantom_hand ?? [] : [];
  const humanTurn = humanMode && (event?.type === "human_turn" || event?.type === "invalid_action");
  const visibleSelection = dragPreview ?? selected;
  const selectedCards = visibleSelection.map((index) => hand[index]);
  const selectedPattern = classifyCombination(selectedCards);
  const legalKeys = useMemo(() => new Set((event?.legal_actions ?? []).map(canonical)), [event?.legal_actions]);
  const canPlay = humanTurn && selected.length > 0 && legalKeys.has(canonical(selectedCards));
  const canPass = humanTurn && legalKeys.has("");
  const finished = event?.type === "game_finished";
  const profile = event?.opponent_profile;

  useEffect(() => {
    dragSelection.current = null;
    const timer = window.setTimeout(() => {
      setSelected([]);
      setDragPreview(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [event?.turn]);

  const displayCards = humanTurn
    ? state?.has_initiative ? [] : state?.last_move ?? []
    : event?.action ?? [];
  const displayType = humanTurn
    ? state?.has_initiative ? "自由出牌" : state?.last_move_type ?? "上一手"
    : event?.action_type ?? classifyCombination(event?.action ?? []).label;
  const displayActor = humanTurn ? state?.last_move_player : event?.actor;
  const origin = actionOrigin(displayActor);
  const showPass = !humanTurn && Boolean(event?.actor && event?.is_pass);
  const showAction = Boolean(displayActor && (displayCards.length > 0 || showPass));
  const opponentActionLabel = showPass ? "不出" : displayType;
  const actionStatusLabel = humanTurn
    ? showPass ? "刚刚选择不出" : "刚刚出牌"
    : showPass ? "选择不出" : "正在出牌";

  let turnTitle = "正在准备牌局";
  let turnHint = "正在洗牌并载入电脑玩家";
  if (humanTurn && state?.has_initiative) {
    turnTitle = "轮到你领出";
    turnHint = "你拥有牌权，可以选择任意合法牌型";
  } else if (humanTurn) {
    turnTitle = `轮到你：压过「${displayType}」`;
    turnHint = `${playerLabel(displayActor)}刚刚出牌，请选择同牌型中更大的牌，或选择“不出”`;
  } else if (event?.actor) {
    turnTitle = `${playerLabel(event.actor)}${event.is_pass ? "选择不出" : `出了「${displayType}」`}`;
    turnHint = humanMode ? "电脑玩家正在继续出牌" : "示范牌局正在自动进行";
  }

  function toggleCard(index: number) {
    if (!humanTurn) return;
    setSelected((current) => current.includes(index)
      ? current.filter((item) => item !== index)
      : [...current, index]);
  }

  function beginCardDrag(event: ReactPointerEvent<HTMLButtonElement>, index: number) {
    if (!humanTurn || (event.pointerType === "mouse" && event.button !== 0)) return;
    const origin = new Set(selected);
    const visited = new Set([index]);
    const selecting = !origin.has(index);
    const preview = applyDragSelection(origin, visited, selecting);
    dragSelection.current = {
      pointerId: event.pointerId,
      origin,
      visited,
      selecting,
      lastIndex: index,
      preview,
    };
    setDragPreview(preview);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function continueCardDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragSelection.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>("[data-card-index]");
    const nextIndex = Number(hit?.dataset.cardIndex);
    if (!Number.isInteger(nextIndex) || nextIndex === drag.lastIndex) return;
    const from = Math.min(drag.lastIndex, nextIndex);
    const to = Math.max(drag.lastIndex, nextIndex);
    for (let index = from; index <= to; index += 1) drag.visited.add(index);
    drag.lastIndex = nextIndex;
    drag.preview = applyDragSelection(drag.origin, drag.visited, drag.selecting);
    setDragPreview(drag.preview);
  }

  function finishCardDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragSelection.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setSelected(drag.preview);
    if (canonical(drag.preview.map((index) => hand[index])) !== canonical([...drag.origin].map((index) => hand[index]))) onSound("select");
    setDragPreview(null);
    dragSelection.current = null;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
  }

  function cancelCardDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragSelection.current?.pointerId !== event.pointerId) return;
    dragSelection.current = null;
    setDragPreview(null);
  }

  function handleCardClick(index: number) {
    if (suppressClick.current) return;
    onSound("select");
    toggleCard(index);
  }

  function submit(action: string[]) {
    if (!humanTurn) return;
    if (onHumanAction(action)) {
      onSound(action.length ? "play" : "pass");
      setSelected([]);
    }
  }

  function selectRecommendation() {
    const recommended = event?.recommended_action ?? [];
    if (recommended.length === 0) {
      if (canPass) submit([]);
      return;
    }
    const used = new Set<number>();
    const indices: number[] = [];
    for (const rank of recommended) {
      const index = hand.findIndex((card, handIndex) => card === rank && !used.has(handIndex));
      if (index >= 0) {
        used.add(index);
        indices.push(index);
      }
    }
    setSelected(indices);
    onSound("ui");
  }

  const selectionMessage = !humanTurn
    ? "轮到你时，手牌会亮起并允许选择"
    : !visibleSelection.length
      ? "点击单张，或按住鼠标横向拖过多张牌"
    : !selectedPattern.valid
      ? selectedPattern.note
      : canPlay
        ? `${selectedPattern.note} · 可以出牌`
        : `「${selectedPattern.label}」牌型正确，但无法压过桌面牌`;
  const coachStep = !humanTurn ? 0 : canPlay ? 2 : 1;
  const coachSteps = ["看清桌面", "选出牌型", "确认出牌"];

  return (
    <section className="table-shell" aria-label="斗地主辅助智能体实战沙盘">
      <div className="table-hud">
        <span><small>本局编号</small><b>#{String(event?.seed ?? 0).slice(-6).padStart(6, "0")}</b></span>
        <span><small>当前手数</small><b>{event?.turn ?? 0}</b></span>
        <span><small>本局倍数</small><b>× {state?.multiplier ?? 1}</b></span>
        <span><small>已出炸弹</small><b>{state?.bombs_played ?? 0}</b></span>
        <button type="button" onClick={onOpenRules}><BookOpen size={16} />牌型规则</button>
      </div>

      <OpponentSeat name="电脑上家" role="农民" count={state?.remaining.landlord_up ?? 17} side="left" avatarSrc="/avatars/farmer-up-cartoon.webp" active={state?.active_player === "landlord_up"} justActed={displayActor === "landlord_up" && showAction} actionLabel={opponentActionLabel} />
      <OpponentSeat name="电脑下家" role="农民" count={state?.remaining.landlord_down ?? 17} side="right" avatarSrc="/avatars/farmer-down-cartoon.webp" active={state?.active_player === "landlord_down"} justActed={displayActor === "landlord_down" && showAction} actionLabel={opponentActionLabel} />

      <div className="landlord-cards" aria-label="本局地主底牌">
        <span>{dealPhase === "ready" ? "地主底牌" : "底牌待揭示"}</span>
        <div>{dealPhase === "ready" ? (state?.landlord_cards ?? []).map((rank, index) => {
          const card = visualCard(rank, index);
          return <PlayingCard key={`${rank}-${index}`} {...card} small />;
        }) : Array.from({ length: 3 }, (_, index) => <PlayingCard key={index} rank="" suit="spade" facedown small />)}</div>
      </div>

      <AnimatePresence>
        {dealPhase !== "ready" && (
          <motion.div className={`deal-ceremony ${dealPhase}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .6 }}>
            <motion.section className="deal-ceremony-card" initial={{ opacity: 0, y: reduceMotion ? 0 : 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0 : .75, ease: [.22, 1, .36, 1] }}>
              <span className="ceremony-kicker">{humanMode ? "实战辅助沙盘" : "AI 自动推演"}</span>
              {dealPhase === "waiting" && (
                <>
                  <strong>准备好后再开始发牌</strong>
                  <p>点击后将完成洗牌、三家发牌和地主底牌揭示，AI 从第一手开始公开思考过程</p>
                  <div className="ceremony-checks"><span>✓ 随机新牌局</span><span>✓ 真实规则校验</span><span>✓ 完整中文报牌</span></div>
                  <button type="button" onClick={onStartDeal}><Sparkles size={18} />{humanMode ? "同意并开始发牌" : "开始发牌与推演"}</button>
                </>
              )}
              {dealPhase === "dealing" && (
                <>
                  <strong>正在发牌</strong>
                  <p>54 张牌正在分配给三个席位，AI 同步载入合法动作空间</p>
                  <div className="dealing-fan" aria-label="正在洗牌发牌">{Array.from({ length: 9 }, (_, index) => <motion.i key={index} initial={{ opacity: 0, x: 0, rotate: 0 }} animate={{ opacity: 1, x: (index - 4) * 15, rotate: (index - 4) * 4 }} transition={{ delay: reduceMotion ? 0 : index * .08, duration: reduceMotion ? 0 : .65, ease: [.22, 1, .36, 1] }} />)}</div>
                  <div className="ceremony-progress"><i /></div>
                </>
              )}
              {dealPhase === "reveal" && (
                <>
                  <strong>地主底牌揭示</strong>
                  <p>这三张是公开信息，AI 只会使用你的手牌与牌桌上已公开的内容</p>
                  <div className="ceremony-landlord-cards">{(state?.landlord_cards ?? []).map((rank, index) => {
                    const card = visualCard(rank, index);
                    return <motion.div key={`${rank}-${index}`} initial={{ opacity: 0, rotateY: reduceMotion ? 0 : 90, y: 12 }} animate={{ opacity: 1, rotateY: 0, y: 0 }} transition={{ duration: reduceMotion ? 0 : .72, delay: reduceMotion ? 0 : index * .2, ease: [.22, 1, .36, 1] }}><PlayingCard {...card} /></motion.div>;
                  })}</div>
                  <span className="reveal-note">AI 正在校验首回合的所有合法选择</span>
                </>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key={`${event?.turn ?? 0}-${humanTurn ? "human" : "auto"}`}
        className={`turn-callout ${humanTurn ? "your-turn" : ""}`}
        aria-live="polite"
        initial={{ opacity: 0, x: "-50%", y: reduceMotion ? 0 : -13, filter: reduceMotion ? "none" : "blur(4px)" }}
        animate={{ opacity: 1, x: "-50%", y: 0, filter: "blur(0px)" }}
        transition={{ duration: reduceMotion ? 0 : .68, ease: [.22, 1, .36, 1] }}
      >
        <span>{humanTurn ? "到你了" : status === "live" ? "牌局进行中" : "请稍候"}</span>
        <strong>{turnTitle}</strong>
        <p>{turnHint}</p>
      </motion.div>

      <div className="played-zone" aria-live="polite">
        <AnimatePresence mode="wait">
          {showAction && (
            <motion.div
              key={`${displayActor}-${showPass ? "pass" : canonical(displayCards)}`}
              className={`action-signature from-${origin.side}`}
              initial={{ opacity: 0, x: reduceMotion ? 0 : origin.x * .36, y: reduceMotion ? 0 : origin.y * .28, scale: .9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: .94 }}
              transition={{ duration: reduceMotion ? 0 : .58, ease: [.22, 1, .36, 1] }}
            >
              <i>{origin.mark}</i><span><small>{playerLabel(displayActor)}</small><b>{actionStatusLabel}</b></span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="played-cards">
          <AnimatePresence mode="popLayout">
            {displayCards.map((rank, index) => {
              const card = visualCard(rank, index);
              return (
                <motion.div
                  key={`${displayActor}-${canonical(displayCards)}-${rank}-${index}`}
                  initial={{ opacity: 0, x: reduceMotion ? 0 : origin.x, y: reduceMotion ? 0 : origin.y, rotate: reduceMotion ? 0 : origin.x / 32, scale: reduceMotion ? 1 : .82 }}
                  animate={{ opacity: 1, x: 0, y: index * 2, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : -22 }}
                  transition={{ duration: reduceMotion ? 0 : .78, delay: reduceMotion ? 0 : index * .065, ease: [.16, 1, .3, 1] }}
                >
                  <PlayingCard {...card} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        {(displayCards.length > 0 || showPass) && <p><b>{showPass ? "不出" : displayType}</b><span>{humanTurn ? `${playerLabel(displayActor)}刚刚出牌` : sourceLabel(event?.action_source)}</span></p>}
      </div>

      <AnimatePresence>
        {dealPhase === "ready" && (status === "connecting" || status === "error" || finished) && (
          <motion.div className={`game-overlay ${status === "error" ? "error" : finished ? "finished" : "loading"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .55 }}>
            <div className="end-overlay-card">
              <small>{status === "error" ? "牌局服务暂时断开" : finished ? "本局结束" : "正在发牌"}</small>
              <strong>{status === "error" ? "连接失败" : finished ? `${playerLabel(event?.winner)}获胜` : "请稍候"}</strong>
              {finished && (
                <div className="final-scoreline">
                  <span>{event?.winner === "landlord" ? "地主率先出完手牌" : "农民率先出完手牌"}</span>
                  <b>{state?.spring ? "触发春天 · " : ""}最终倍数 × {state?.multiplier ?? 1}</b>
                  {humanMode && <em>你的本局得分 {state?.score.landlord && state.score.landlord > 0 ? "+" : ""}{state?.score.landlord ?? 0}</em>}
                </div>
              )}
              {finished && humanMode && profile && (
                <section className="end-learning-summary">
                  <span>本局之后，陪练 AI 进入「{profile.learning_name ?? "成长"}」阶段</span>
                  <b>{profile.learning_insight ?? "已经记录你的出牌选择，并将更新下一局的应对方式"}</b>
                  <small>{profile.next_milestone ?? "成长档案已保存"} · 下一局会应用新的应对策略</small>
                </section>
              )}
              <button type="button" disabled={status === "connecting"} onClick={status === "error" ? onRestart : onNewDeal}>
                <RefreshCw size={17} />{status === "error" ? "重新连接" : finished ? humanMode ? "带着成长再来一局" : "再推演一局" : "正在洗牌"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="player-seat">
        <div className="player-identity">
          <span className="player-avatar"><i style={{ backgroundImage: "url(/avatars/landlord-cartoon.webp)" }} /><b>地</b></span>
          <div><strong>{humanMode ? "你（地主）" : "电脑地主"}</strong><small>剩余 {state?.remaining.landlord ?? 20} 张牌</small></div>
          <span className={`turn-status ${humanTurn ? "active" : ""}`}>{finished ? "本局已结束" : humanTurn ? "请出牌" : status === "live" ? "等待其他玩家" : "牌局准备中"}</span>
        </div>

        <motion.div
          className={`player-hand ${humanMode ? "interactive" : ""} ${dragPreview ? "dragging" : ""}`}
          layout
          transition={{ layout: { duration: reduceMotion ? 0 : .55, ease: [.22, 1, .36, 1] } }}
          onPointerMove={continueCardDrag}
          onPointerUp={finishCardDrag}
          onPointerCancel={cancelCardDrag}
        >
          {humanTurn && <span className="hand-gesture-hint">按住横向拖动，可连续选牌</span>}
          <AnimatePresence mode="popLayout">
            {hand.map((rank, index) => {
              const occurrence = occurrenceAt(hand, index);
              const card = visualCard(rank, occurrence);
              const isSelected = visibleSelection.includes(index);
              return (
                <motion.button
                  type="button"
                  aria-label={`${isSelected ? "取消选择" : "选择"} ${card.rank}`}
                  aria-pressed={isSelected}
                  disabled={!humanTurn}
                  data-card-index={index}
                  onPointerDown={(pointerEvent) => beginCardDrag(pointerEvent, index)}
                  onClick={() => handleCardClick(index)}
                  onDragStart={(dragEvent) => dragEvent.preventDefault()}
                  key={`${rank}-${occurrence}`}
                  layout
                  initial={{ opacity: 0, y: -60 }}
                  animate={{ opacity: 1, y: isSelected ? -20 : 0 }}
                  exit={{ opacity: 0, y: -45 }}
                  transition={{ duration: reduceMotion ? 0 : .7, delay: reduceMotion ? 0 : Math.min(index * .04, .68), ease: [.22, 1, .36, 1] }}
                  className={`card-slot ${isSelected ? "selected" : ""}`}
                >
                  <PlayingCard {...card} selected={isSelected} />
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {humanMode && (
          <div className="play-controls">
            <ol className="turn-steps" aria-label="本回合操作步骤">
              {coachSteps.map((label, index) => (
                <li key={label} className={index < coachStep ? "done" : index === coachStep ? "active" : ""}>
                  <i>{index < coachStep ? "✓" : index + 1}</i><span>{label}</span>
                </li>
              ))}
            </ol>
            <div className={`selection-status ${visibleSelection.length ? selectedPattern.valid ? canPlay ? "valid" : "warning" : "invalid" : ""}`}>
              <span>{visibleSelection.length ? `${selectedPattern.label} · 已选 ${visibleSelection.length} 张` : "选择手牌"}</span>
              <p>{selectionMessage}</p>
            </div>
            {humanTurn && (
              <button type="button" className="advice-button" onClick={selectRecommendation}>
                <Lightbulb size={18} />
                <span><small>AI 已比较 {event?.legal_action_count ?? "—"} 种合法走法 · {event?.recommended_action_type ?? classifyCombination(event?.recommended_action ?? []).label}</small><b>{displayAction(event?.recommended_action ?? [])}</b></span>
                <em>{event?.recommended_action?.length ? "替我选牌" : "按建议不出"}</em>
              </button>
            )}
            <div className="action-buttons">
              <button type="button" onClick={() => setSelected([])} disabled={!humanTurn || selected.length === 0}>重选</button>
              <button type="button" onClick={() => submit([])} disabled={!canPass}>不出</button>
              <button type="button" className="primary" onClick={() => submit(selectedCards)} disabled={!canPlay}><Sparkles size={17} />出牌</button>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
