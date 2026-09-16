# 设计规格

## 视觉 tokens

| 角色 | 色值 | 用途 |
|---|---|---|
| ink | `#080b09` | 黑漆背景、暗场 |
| felt | `#173b2d` | 牌桌、现实层 |
| jade | `#8ed9bd` | AI 建议、状态流 |
| gold | `#d3ad67` | 可信证据、品牌价值 |
| cinnabar | `#d25a43` | 风险、非法、覆盖 |
| ivory | `#f6f0e3` | 主文字、牌面 |

## 动效人格

- 三个词：果断、克制、可信。
- 活力大胆为主，专业信赖为约束：常规入场 18–24f，解释性镜头 30–50f。
- 全屏 slam 最多 3 次；无手持抖动；随机参数全部固定种子。
- 真实 UI 信息密集镜头保持正视，炫技只用在章节交棒和抽象机制镜。
- 字标 hold ≥30f；批量动效落定 hold ≥15f；开场单主角动作 ≥90f。

## 镜头映射

| 功能 | 首选语法 | 关键约束 |
|---|---|---|
| 冷开场牌面 | `magician-card-flourish` | 闪光短、硬定格、只扫光一次 |
| 品牌主张 | `lead-word-zoom-assemble` | 支点稳定、落定可读 |
| 进入牌桌 | `overhead-tabletop-drop` | 横移和扎入职责分开 |
| 发牌 | `deck-deal-flyin` 节拍 | 硬加速、真实牌面、落位不悬空 |
| AI 按钮 | `cursor-performance` | 点击与推近同帧 |
| 思考转场 | `freeze-annotate` | 定格 ≥45f，圈注可读 |
| 三段机制 | `cycle-glass-node-morph` | 同一主体连续变形 |
| 候选证据 | `ai-stream-response` | 摘要先到，证据随后 |
| 关键指标 | `odometer-digit-roll` | 终值真实、逐位锁定 |
| 跨局成长 | `timeline-travel` | 末两站可读，急停后静止 |
| 技术证据 | `quad-split-parallel-scenes` | 关键事件错开 3–6f |
| 收尾 | `outro-group-photo-launch` | 全片最高峰，sign-off ≥30f |

完整逐镜表见 `../../docs/PHANTOM_PROMO_VIDEO_CODEX_EXECUTION_PLAN.md`。

