import type { Suit } from "./playing-card";

export type Candidate = {
  id: string;
  action: string;
  detail: string;
  value: number;
  baseLoss: number;
  concealment: number;
  verdict: "selected" | "base" | "vetoed";
};

export const mockHand: ReadonlyArray<readonly [string, Suit]> = [
  ["3", "club"], ["3", "diamond"], ["5", "heart"], ["6", "spade"],
  ["7", "club"], ["8", "heart"], ["8", "spade"], ["8", "club"],
  ["8", "diamond"], ["Q", "spade"], ["K", "heart"], ["A", "spade"],
  ["2", "diamond"], ["小王", "joker"], ["大王", "joker"],
];

export const mockCandidates: Candidate[] = [
  {
    id: "pass",
    action: "不出",
    detail: "隐蔽收益 +0.17",
    value: 0.812,
    baseLoss: 0.012,
    concealment: 0.17,
    verdict: "selected",
  },
  {
    id: "pair-3",
    action: "对 3",
    detail: "基础策略最优",
    value: 0.824,
    baseLoss: 0,
    concealment: 0.02,
    verdict: "base",
  },
  {
    id: "single-a",
    action: "单 A",
    detail: "暴露风险 +0.08",
    value: 0.782,
    baseLoss: 0.042,
    concealment: -0.08,
    verdict: "vetoed",
  },
];

export const mockSource = "演示用规则数据";
