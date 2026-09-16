import { AnimatePresence, motion } from "framer-motion";

import { mockCandidates, mockSource } from "./mock-data";

function Metric({ label, value, actual }: { label: string; value: number; actual: number }) {
  return (
    <div className="belief-metric">
      <div><span>{label}</span><b>{Math.round(value * 100)}%</b></div>
      <div className="metric-track">
        <motion.i initial={{ width: 0 }} animate={{ width: `${value * 100}%` }} transition={{ duration: .55 }} />
        <em style={{ left: `${Math.min(99.5, actual * 100)}%` }} title="真实状态" />
      </div>
      <small>估计值 <span>真实值 {Math.round(actual * 100)}%</span></small>
    </div>
  );
}

export function CognitivePanel({
  selectedCandidate,
  onSelectCandidate,
  cognitiveEnabled,
}: {
  selectedCandidate: string;
  onSelectCandidate: (id: string) => void;
  cognitiveEnabled: boolean;
}) {
  const candidate = mockCandidates.find((item) => item.id === selectedCandidate) ?? mockCandidates[0];

  return (
    <aside className="cognitive-panel">
      <div className="panel-heading">
        <div><small>认知观测舱</small><h1>认知态势</h1></div>
        <span>{cognitiveEnabled ? "v0.1 · 规则推断" : "仅基础策略"}</span>
      </div>

      <section className={`state-card primary-state ${cognitiveEnabled ? "" : "is-muted"}`}>
        <header><span>对手对 PHANTOM 的估计</span><b>{cognitiveEnabled ? "推断中" : "已暂停"}</b></header>
        <div className="belief-focus">
          <div className="belief-ring"><span>{cognitiveEnabled ? "0.41" : "—"}</span><small>控制力</small></div>
          <div><small>对手视角</small><strong>{cognitiveEnabled ? "实力被低估" : "基础策略"}</strong><p>置信度 · {cognitiveEnabled ? "78%" : "暂无"}</p></div>
        </div>
        <Metric label="王炸概率" value={cognitiveEnabled ? 0.18 : 0} actual={1} />
        <Metric label="任意炸弹概率" value={cognitiveEnabled ? 0.27 : 0} actual={0.82} />
        <Metric label="高控制力概率" value={cognitiveEnabled ? 0.41 : 0} actual={0.91} />
        <p className="source-line">数据来源 · {cognitiveEnabled ? mockSource : "已停用"}</p>
      </section>

      <section className="state-card gap-card">
        <header><span>认知差</span><b className="critical">{cognitiveEnabled ? "+0.50" : "关闭"}</b></header>
        <div className="gap-visual">
          <div><small>对手估计</small><strong>{cognitiveEnabled ? "41" : "—"}</strong></div>
          <span><i />藏锋空间<i /></span>
          <div><small>真实实力</small><strong>91</strong></div>
        </div>
      </section>

      <section className="state-card candidate-card">
        <header><span>候选动作透镜</span><b>前三项</b></header>
        <ol>
          {mockCandidates.map((item, index) => (
            <li key={item.id} className={selectedCandidate === item.id ? "chosen" : ""}>
              <button onClick={() => onSelectCandidate(item.id)} aria-pressed={selectedCandidate === item.id}>
                <i>0{index + 1}</i>
                <div><strong>{item.action}</strong><small>{item.detail}</small></div>
                <b>{item.value.toFixed(3)}</b>
              </button>
            </li>
          ))}
        </ol>
        <AnimatePresence mode="wait">
          <motion.div
            key={candidate.id}
            className={`safety-gate ${candidate.verdict === "vetoed" ? "vetoed" : ""}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <span><i /> 安全门</span>
            <b>{candidate.baseLoss <= .02 ? "通过" : "否决"} · 损失 {candidate.baseLoss.toFixed(3)}</b>
          </motion.div>
        </AnimatePresence>
      </section>

      <section className="timeline-card">
        <header><span>认知时间线</span><small>08 个事件</small></header>
        <div className="timeline-row">
          <i className="done" /><span>观察</span><i className="done" /><span>塑形</span><i className="active" /><span>验证</span><i /><span>收割</span>
        </div>
        <p><time>18:42:08</time> 对手已投入高对子，夺权窗口正在扩大。</p>
      </section>
    </aside>
  );
}
