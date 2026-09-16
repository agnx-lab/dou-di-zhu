"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GuideMode = "SHOWCASE" | "PLAY" | "SPECTATE";

const guideCopy: Record<GuideMode, { title: string; intro: string; steps: Array<[string, string]> }> = {
  SHOWCASE: {
    title: "看懂一次认知牌局",
    intro: "牌桌按真实模型自动推进，你只需观察右侧的认知变化。",
    steps: [
      ["先看基础价值", "安全门最多允许牺牲 2%，超过就直接否决。"],
      ["再看认知差", "真实控制力高于对手估计时，PHANTOM 可能选择藏锋。"],
      ["最后看状态轨", "塑形、验证、陷阱就绪、收割，构成一次完整策略闭环。"],
    ],
  },
  PLAY: {
    title: "三步开始地主训练局",
    intro: "你控制地主，两位农民由真实 DouZero 模型控制。",
    steps: [
      ["选择手牌", "点击牌面；合法组合会立即显示“可以出牌”。"],
      ["参考建议", "“采用建议”会替你选好牌，但最终仍由你确认。"],
      ["出牌或不出", "无法压过上一手时可以不出；你领出时不能不出。"],
    ],
  },
  SPECTATE: {
    title: "自动观战说明",
    intro: "三席模型会自动完成整局，所有牌数与动作都来自真实环境。",
    steps: [
      ["观察节奏", "牌桌中央显示当前动作，席位旁显示剩余牌数。"],
      ["比较判断", "青色是对手估计，朱砂标记是真实状态。"],
      ["复盘决策", "候选透镜解释动作为什么通过或被安全门否决。"],
    ],
  },
};

export function GameGuide({ open, onOpenChange, mode }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: GuideMode;
}) {
  const copy = guideCopy[mode];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="game-guide-dialog">
        <DialogHeader>
          <span className="guide-kicker">新手引导 · {mode === "PLAY" ? "真人对战" : mode === "SPECTATE" ? "自动观战" : "核心演示"}</span>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.intro}</DialogDescription>
        </DialogHeader>
        <ol className="guide-steps">
          {copy.steps.map(([title, description], index) => (
            <li key={title}><i>{index + 1}</i><div><strong>{title}</strong><p>{description}</p></div></li>
          ))}
        </ol>
        <DialogClose className="guide-start">明白了，开始体验</DialogClose>
      </DialogContent>
    </Dialog>
  );
}
