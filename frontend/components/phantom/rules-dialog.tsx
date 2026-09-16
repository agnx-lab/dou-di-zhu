"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ruleGroups } from "./dou-dizhu-rules";

export function RulesDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="rules-dialog">
        <DialogHeader>
          <span className="dialog-kicker">标准斗地主 · 出牌阶段</span>
          <DialogTitle>牌型与胜负规则</DialogTitle>
          <DialogDescription>
            这是辅助智能体的实战验证沙盘。你固定扮演地主并首先出牌，智能体会校验规则并提供建议，最终动作由你确认。
          </DialogDescription>
        </DialogHeader>

        <div className="rule-principles">
          <span><b>1</b>同牌型比较主牌点数</span>
          <span><b>2</b>跟牌可以不出，领出不能不出</span>
          <span><b>3</b>炸弹与王炸会使倍数翻倍</span>
        </div>

        <div className="rule-groups">
          {ruleGroups.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map(([name, description]) => (
                <div className="rule-row" key={name}>
                  <strong>{name}</strong>
                  <p>{description}</p>
                </div>
              ))}
            </section>
          ))}
        </div>

        <p className="rule-scope">当前演示聚焦三人斗地主的出牌阶段：你是地主，两名电脑玩家是农民；牌局用于验证辅助能力，不代表作品定位是一款完整商业游戏。</p>
        <DialogClose className="dialog-primary-action">知道了，返回辅助演示</DialogClose>
      </DialogContent>
    </Dialog>
  );
}
