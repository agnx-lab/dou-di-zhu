"use client";

import { BrainCircuit, Lightbulb, ScanSearch, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";

import { classifyCombination } from "./dou-dizhu-rules";
import type { DealPhase } from "./phantom-stage";
import type { BridgeStatus, RealGameEvent } from "./use-real-game";

function displayRank(rank: string) {
  if (rank === "X") return "小王";
  if (rank === "D") return "大王";
  return rank;
}

function actionText(action: string[] = []) {
  return action.length ? action.map(displayRank).join(" ") : "不出";
}

function statusText(status: BridgeStatus) {
  return {
    idle: "尚未开始",
    connecting: "正在准备牌局",
    live: "牌局进行中",
    finished: "本局已结束",
    error: "连接暂时中断",
  }[status];
}

function playerName(player?: string | null) {
  if (player === "landlord") return "地主";
  if (player === "landlord_up") return "农民上家";
  if (player === "landlord_down") return "农民下家";
  return "等待出牌";
}

export function RealPolicyPanel({ event, status, humanMode, dealPhase, onOpenRules }: {
  event: RealGameEvent | null;
  status: BridgeStatus;
  humanMode: boolean;
  dealPhase: DealPhase;
  onOpenRules: () => void;
}) {
  const state = event?.state;
  const decision = event?.cognitive_decision;
  const candidates = decision?.candidates ?? [];
  const belief = event?.opponent_belief;
  const humanTurn = humanMode && (event?.type === "human_turn" || event?.type === "invalid_action");
  const recommendation = event?.recommended_action ?? decision?.selected_action ?? [];
  const recommendationType = event?.recommended_action_type ?? classifyCombination(recommendation).label;
  const profile = event?.opponent_profile;
  const learningLevel = profile?.learning_level ?? Math.min(4, Math.max(1, (profile?.games ?? 0) + 1));
  const learningName = profile?.learning_name ?? (["初识", "试探", "适应", "洞察"][learningLevel - 1]);
  const learningProgress = profile?.learning_progress ?? Math.min(100, (profile?.games ?? 0) * 25);
  const preparing = dealPhase !== "ready";
  const thoughtPhase = dealPhase === "waiting" || dealPhase === "dealing" ? 0 : dealPhase === "reveal" ? 1 : 2;
  const latencyText = preparing ? "—" : (event?.decision_latency_ms ?? 0) < 1 ? "< 1 ms" : `${event?.decision_latency_ms} ms`;

  const aiStatus = event?.type === "game_finished"
    ? { label: "复盘完成", title: "本局决策链已封存", body: `已记录 ${event.turn ?? 0} 手公开动作，供赛后按会话逐手追溯` }
    : dealPhase === "waiting"
    ? { label: "等待授权", title: "等待你确认发牌", body: "尚未读取牌面，所有推演保持暂停" }
    : dealPhase === "dealing"
      ? { label: "正在建模", title: "建立合法动作空间", body: "同步校验 54 张牌守恒，并载入基础策略" }
      : dealPhase === "reveal"
        ? { label: "公开信息", title: "正在读取地主底牌", body: "只纳入玩家可见内容，不读取两名农民的暗牌" }
        : humanTurn
          ? { label: "推演完成", title: "候选方案已通过规则门", body: "AI 已比较胜率、节奏与安全性，等待你最终确认" }
          : { label: "实时跟踪", title: "正在更新对手信念", body: "根据已公开的出牌逐手更新判断，不使用暗牌信息" };

  const nextTitle = preparing ? (dealPhase === "waiting" ? "由你决定何时开始" : dealPhase === "dealing" ? "发牌进行中" : "确认地主底牌")
    : event?.type === "game_finished"
    ? event.winner === "landlord" ? "地主获胜" : "农民阵营获胜"
    : humanTurn ? state?.has_initiative ? "你拥有牌权" : "轮到你跟牌"
      : `${playerName(state?.active_player)}行动中`;
  const nextBody = preparing ? (dealPhase === "waiting" ? "请先确认发牌，智能体不会在你不知情时启动对局" : dealPhase === "dealing" ? "看清洗牌与三家发牌过程，然后再进入策略建议" : "底牌是公开信息，揭示完成后 AI 才会给出首手建议")
    : event?.type === "game_finished"
    ? `本局以 × ${state?.multiplier ?? 1} 结算${state?.spring ? "，并触发春天" : ""}。`
    : humanTurn ? state?.has_initiative
      ? "任选一种合法牌型领出，领出时不能选择不出。"
      : `需要压过桌面的「${state?.last_move_type ?? "上一手"}」，否则可以选择不出。`
      : humanMode ? "电脑玩家正在出牌，你的回合会自动亮起操作区。" : "正在自动演示完整对局，你可以专注观察牌型与牌数变化。";

  const strategyExplanation = !decision
    ? "牌局开始后，这里会用一句话解释智能建议。"
    : decision.override
      ? "智能助手认为另一种合法出牌更适合隐藏实力，而且没有超过安全损失范围。"
      : "智能助手与基础胜率策略意见一致，因此保留了更稳妥的出牌。";

  return (
    <aside className="game-sidebar" aria-label="斗地主出牌助手">
      <header className="sidebar-heading">
        <div><span>PHANTOM AI</span><h2>{event?.type === "game_finished" ? "本局复盘已生成" : humanMode ? "帮你看懂这一手" : "正在拆解这盘棋"}</h2></div>
        <b className={`connection-state ${status}`}>{statusText(status)}</b>
      </header>

      <section className={`ai-live-card phase-${dealPhase}`} aria-live="polite">
        <header><span><BrainCircuit size={18} />AI 思考中枢</span><b><i />{aiStatus.label}</b></header>
        <div className="ai-live-core">
          <div><strong>{aiStatus.title}</strong><p>{aiStatus.body}</p></div>
          <div className="thinking-orbit" aria-hidden="true"><i /><i /><i /><BrainCircuit size={22} /></div>
        </div>
        <div className="thought-ribbon" aria-label="AI 思考阶段">
          {["读牌势", "算走法", "过安全门"].map((label, index) => <span key={label} className={index < thoughtPhase ? "done" : index === thoughtPhase ? "active" : ""}><i />{label}</span>)}
        </div>
        <div className="ai-live-metrics">
          <span><small>合法走法</small><b>{preparing ? "—" : event?.legal_action_count ?? 0}</b></span>
          <span><small>推演耗时</small><b>{latencyText}</b></span>
          <span><small>推断置信</small><b>{belief ? `${Math.round(belief.confidence * 100)}%` : "建立中"}</b></span>
        </div>
        <div className="user-next-strip"><Target size={16} /><span><small>此刻</small><b>{nextTitle}</b></span><p>{nextBody}</p></div>
      </section>

      {humanMode && (
        <section className="ai-growth-card">
          <header>
            <span><TrendingUp size={18} />陪练 AI 成长</span>
            <b>{profile ? `第 ${learningLevel} 阶段 · ${learningName}` : "正在建立档案"}</b>
          </header>
          <div className="growth-track" aria-label={`AI 成长进度 ${learningProgress}%`}>
            <i style={{ width: `${learningProgress}%` }} />
            {[25, 50, 75].map((milestone) => <em key={milestone} style={{ left: `${milestone}%` }} />)}
          </div>
          <div className="growth-meta"><span>已观察 {profile?.actions ?? 0} 次出牌</span><strong>{learningProgress}%</strong></div>
          <p><Sparkles size={15} />{profile?.learning_insight ?? "首局只观察，不预设你的风格"}</p>
        </section>
      )}

      {humanMode && (
        <section className={`sidebar-advice ${humanTurn ? "ready" : ""}`}>
          <span><Lightbulb size={18} />这一手的建议</span>
          <div><strong>{humanTurn ? recommendationType : "等待你的回合"}</strong><b>{humanTurn ? actionText(recommendation) : "—"}</b></div>
          <p>{humanTurn ? "AI 已选好候选牌，最终决定始终由你确认" : "建议会在你的回合自动出现"}</p>
        </section>
      )}

      <section className="ai-work-card">
        <header><span><ScanSearch size={18} />候选方案对比</span><b>{candidates.length ? `${Math.min(3, candidates.length)} 个优先方向` : "等待牌面"}</b></header>
        <div className="candidate-preview">
          {candidates.slice(0, 3).map((candidate, index) => (
            <div key={`${event?.turn}-preview-${index}`} className={candidate.selected ? "selected" : ""}>
              <i>{index + 1}</i><span><b>{classifyCombination(candidate.action).label}</b><small>{actionText(candidate.action)}</small></span><em>{candidate.selected ? "AI 建议" : candidate.allowed_by_safety_gate ? "已通过" : "已排除"}</em>
            </div>
          ))}
          {!candidates.length && <p>发牌完成后，AI 会在这里比较最值得考虑的走法</p>}
        </div>
        <p className="ai-proof"><ShieldCheck size={14} /><span>{strategyExplanation}{decision ? ` 稳健度 ${(decision.base_value_retention * 100).toFixed(1)}%` : ""}</span></p>
      </section>

      <div className="sidebar-proof-row"><span>暗牌隔离</span><span>规则安全门</span><span>全程可追溯</span></div>
      <button type="button" className="sidebar-rules-link" onClick={onOpenRules}>查看三带一、三带二与完整规则</button>
    </aside>
  );
}
