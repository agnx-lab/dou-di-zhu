export type CombinationCode =
  | "pass"
  | "single"
  | "pair"
  | "triple"
  | "triple-single"
  | "triple-pair"
  | "straight"
  | "serial-pair"
  | "serial-triple"
  | "airplane-single"
  | "airplane-pair"
  | "four-two-single"
  | "four-two-pair"
  | "bomb"
  | "rocket"
  | "invalid";

export type Combination = {
  code: CombinationCode;
  label: string;
  valid: boolean;
  note: string;
};

const values: Record<string, number> = {
  "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 10, J: 11, Q: 12, K: 13, A: 14, "2": 17, X: 20, D: 30,
};

const result = (code: CombinationCode, label: string, note: string, valid = true): Combination => ({
  code,
  label,
  note,
  valid,
});

function isSequence(ranks: number[], minimum: number) {
  return ranks.length >= minimum
    && ranks[ranks.length - 1] < 17
    && ranks.every((rank, index) => index === 0 || rank === ranks[index - 1] + 1);
}

function findAirplane(cards: number[], counts: Map<number, number>): Combination | null {
  const tripleRanks = [...counts.entries()]
    .filter(([rank, count]) => count >= 3 && rank < 17)
    .map(([rank]) => rank)
    .sort((a, b) => a - b);

  const bodies: number[][] = [];
  for (let start = 0; start < tripleRanks.length; start += 1) {
    for (let end = start + 2; end <= tripleRanks.length; end += 1) {
      const body = tripleRanks.slice(start, end);
      if (isSequence(body, 2)) bodies.push(body);
    }
  }
  bodies.sort((a, b) => b.length - a.length || b[b.length - 1] - a[a.length - 1]);

  for (const body of bodies) {
    const remainder = new Map(counts);
    body.forEach((rank) => {
      const next = (remainder.get(rank) ?? 0) - 3;
      if (next) remainder.set(rank, next);
      else remainder.delete(rank);
    });
    const remainingCount = [...remainder.values()].reduce((sum, count) => sum + count, 0);
    if (cards.length === body.length * 4 && remainingCount === body.length) {
      return result("airplane-single", "飞机带单张", "连续三张作为机身，并带等量单张");
    }
    if (
      cards.length === body.length * 5
      && remainingCount === body.length * 2
      && remainder.size === body.length
      && [...remainder.values()].every((count) => count === 2)
    ) {
      return result("airplane-pair", "飞机带对子", "连续三张作为机身，并带等量对子");
    }
  }
  return null;
}

export function classifyCombination(labels: string[]): Combination {
  if (labels.length === 0) return result("pass", "不出", "跟牌时可以选择不出");
  const cards = labels.map((label) => values[label]).sort((a, b) => a - b);
  if (cards.some((card) => card === undefined)) {
    return result("invalid", "无法识别", "手牌中包含未知点数", false);
  }
  const counts = new Map<number, number>();
  cards.forEach((card) => counts.set(card, (counts.get(card) ?? 0) + 1));
  const groups = [...counts.values()].sort((a, b) => a - b);
  const ranks = [...counts.keys()].sort((a, b) => a - b);

  if (cards.length === 1) return result("single", "单张", "按点数大小比较");
  if (cards.length === 2 && cards[0] === 20 && cards[1] === 30) return result("rocket", "王炸", "最大的牌型，可以压制任何牌");
  if (cards.length === 2 && groups[0] === 2) return result("pair", "对子", "两张点数相同的牌");
  if (cards.length === 3 && groups[0] === 3) return result("triple", "三张", "三张点数相同的牌");
  if (cards.length === 4 && groups.length === 1) return result("bomb", "炸弹", "四张同点数，可压制普通牌型");
  if (cards.length === 4 && groups.join() === "1,3") return result("triple-single", "三带一", "三张同点数，加任意一张单牌");
  if (cards.length === 5 && groups.join() === "2,3") return result("triple-pair", "三带二", "三张同点数，加一组对子");
  if ([...counts.values()].every((count) => count === 1) && isSequence(ranks, 5)) return result("straight", "顺子", "至少五张连续单牌，2 和王不能加入");
  if ([...counts.values()].every((count) => count === 2) && isSequence(ranks, 3)) return result("serial-pair", "连对", "至少三组连续对子，2 和王不能加入");
  if ([...counts.values()].every((count) => count === 3) && isSequence(ranks, 2)) return result("serial-triple", "飞机不带翅膀", "至少两组连续三张");

  const airplane = findAirplane(cards, counts);
  if (airplane) return airplane;

  if (cards.length === 6 && groups.includes(4)) return result("four-two-single", "四带二", "四张同点数，加两张单牌");
  if (cards.length === 8 && groups.join() === "2,2,4") return result("four-two-pair", "四带两对", "四张同点数，加两组不同对子");

  return result("invalid", "牌型不成立", "请调整选择，或打开规则说明查看合法组合", false);
}

export const ruleGroups = [
  {
    title: "基础牌型",
    items: [
      ["单张 / 对子 / 三张", "相同牌型、相同张数才能比较，点数更大者胜。"],
      ["三带一", "三张相同点数的牌，加任意一张单牌。比较三张的点数。"],
      ["三带二", "三张相同点数的牌，加一组对子。比较三张的点数。"],
    ],
  },
  {
    title: "连续牌型",
    items: [
      ["顺子", "至少五张连续单牌；2、小王和大王不能加入。"],
      ["连对", "至少三组连续对子；2 和王不能加入。"],
      ["飞机", "至少两组连续三张，可以不带、带等量单张或带等量对子。"],
    ],
  },
  {
    title: "特殊牌型",
    items: [
      ["四带二 / 四带两对", "四张相同点数的牌，带两张单牌或两组对子。它本身不是炸弹。"],
      ["炸弹", "四张相同点数，可以压制任何普通牌型；更大的炸弹可以反压。"],
      ["王炸", "小王加大王，是斗地主中最大的牌型。"],
      ["春天", "地主获胜且农民没有出过牌，或农民获胜且地主只出过一手牌，倍数再翻一倍。"],
    ],
  },
] as const;
