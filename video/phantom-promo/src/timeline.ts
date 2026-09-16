export type Shot = {
  id: string;
  from: number;
  duration: number;
  label: string;
};

export const FPS = 30;
export const TOTAL_FRAMES = 5250;

export const SHOTS: Shot[] = [
  {id: 's01', from: 0, duration: 126, label: '魔术大王'},
  {id: 's02', from: 126, duration: 114, label: '信任缺口'},
  {id: 's03', from: 240, duration: 150, label: '信任主张'},
  {id: 's04', from: 390, duration: 210, label: '幻局品牌'},
  {id: 's05', from: 600, duration: 300, label: '首页立传'},
  {id: 's06', from: 900, duration: 180, label: '进入牌桌'},
  {id: 's07', from: 1080, duration: 240, label: '真实发牌'},
  {id: 's08', from: 1320, duration: 240, label: '规则理解'},
  {id: 's09', from: 1560, duration: 240, label: '错误边界'},
  {id: 's10', from: 1800, duration: 150, label: '章节字卡'},
  {id: 's11', from: 1950, duration: 150, label: 'AI 按钮'},
  {id: 's12', from: 2100, duration: 240, label: '定格标注'},
  {id: 's13', from: 2340, duration: 270, label: '三段机制'},
  {id: 's14', from: 2610, duration: 270, label: '512 粒子'},
  {id: 's15', from: 2880, duration: 270, label: '候选证据'},
  {id: 's16', from: 3150, duration: 270, label: '安全门'},
  {id: 's17', from: 3420, duration: 180, label: '认知覆盖'},
  {id: 's18', from: 3600, duration: 180, label: '价值保留'},
  {id: 's19', from: 3780, duration: 330, label: '跨局成长'},
  {id: 's20', from: 4110, duration: 300, label: '第二局适应'},
  {id: 's21', from: 4410, duration: 90, label: '人类边界'},
  {id: 's22', from: 4500, duration: 180, label: '技术四宫格'},
  {id: 's23', from: 4680, duration: 210, label: '追溯与回退'},
  {id: 's24', from: 4890, duration: 180, label: '最终由人决定'},
  {id: 's25', from: 5070, duration: 180, label: '品牌全家福'},
];

export const shot = (id: string) => {
  const found = SHOTS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown shot: ${id}`);
  return found;
};

export const SFX_CUES = [
  {id: 'heartbeat', from: shot('s01').from + 2, src: 'audio/sfx/heartbeat-single.mp3', volume: 0.65, duration: 45},
  {id: 'hero-whoosh', from: shot('s01').from + 25, src: 'audio/sfx/air-woosh-deep.mp3', volume: 0.42, duration: 80},
  {id: 'hero-impact', from: shot('s01').from + 61, src: 'audio/sfx/impact-deep-whoosh.mp3', volume: 0.42, duration: 75},
  {id: 'table-dive', from: shot('s06').from + 78, src: 'audio/sfx/sweep-fast.mp3', volume: 0.28, duration: 55},
  {id: 'shuffle', from: shot('s07').from + 10, src: 'audio/foley/card-shuffle.ogg', volume: 0.6, duration: 90},
  {id: 'card-slide', from: shot('s08').from + 48, src: 'audio/foley/card-slide-5.ogg', volume: 0.55, duration: 45},
  {id: 'ai-click', from: shot('s11').from + 72, src: 'audio/foley/card-place-1.ogg', volume: 0.65, duration: 35},
  {id: 'gate-lock', from: shot('s16').from + 166, src: 'audio/sfx/gear-lock-metallic.mp3', volume: 0.48, duration: 55},
  {id: 'override-impact', from: shot('s17').from + 78, src: 'audio/sfx/impact-cine-big.mp3', volume: 0.36, duration: 95},
  {id: 'odometer-tick', from: shot('s18').from + 62, src: 'audio/sfx/clock-tick-single.mp3', volume: 0.42, duration: 30},
  {id: 'outro-impact', from: shot('s25').from + 83, src: 'audio/sfx/impact-deep-whoosh.mp3', volume: 0.52, duration: 85},
  {id: 'outro-sparkle', from: shot('s25').from + 110, src: 'audio/sfx/shimmer-sparkle-sweep.mp3', volume: 0.28, duration: 70},
] as const;

export const VOICE_CUES = [
  {id: 'vo-a-01', from: 138, src: 'audio/voice/vo-a-01.wav', text: '如果 AI 只给答案，不给理由，信任就无从开始。', volume: 1.0, duration: 120},
  {id: 'vo-a-02', from: 414, src: 'audio/voice/vo-a-02.wav', text: '幻局，把判断、证据和风险边界摆上桌面。', volume: 1.0, duration: 116},
  {id: 'vo-a-03', from: 615, src: 'audio/voice/vo-a-03.wav', text: '真实对局进入，每一手先过规则。', volume: 1.0, duration: 100},
  {id: 'vo-a-04', from: 1089, src: 'audio/voice/vo-a-04.wav', text: '五十四张牌守恒，非法动作无法越过安全线。', volume: 1.0, duration: 122},
  {id: 'vo-a-05', from: 1626, src: 'audio/voice/vo-a-05.wav', text: '异常，就回到稳定的基础策略。', volume: 1.0, duration: 93},
  {id: 'vo-a-06', from: 1812, src: 'audio/voice/vo-a-06.wav', text: '你看到的，不只是答案。', volume: 1.0, duration: 72},
  {id: 'vo-a-07', from: 2430, src: 'audio/voice/vo-a-07.wav', text: '真正的核心，是完整的认知闭环。', volume: 1.0, duration: 108},
  {id: 'vo-b-01', from: 2622, src: 'audio/voice/vo-b-01.wav', text: '五百一十二个粒子估计未知手牌，再对前三个候选做反事实推演。', volume: 1.0, duration: 168},
  {id: 'vo-b-02', from: 3162, src: 'audio/voice/vo-b-02.wav', text: '安全门约束偏离，基础价值损失最多百分之二。', volume: 1.0, duration: 128},
  {id: 'vo-b-03', from: 3600, src: 'audio/voice/vo-b-03.wav', text: '二十七个决策节点，只发生一次认知覆盖，基础价值保留百分之九十九点八三五二。', volume: 1.0, duration: 233},
  {id: 'vo-b-04', from: 4812, src: 'audio/voice/vo-b-04.wav', text: '洞察能回放、追溯和校验，却不替你落子。', volume: 1.0, duration: 122},
  {id: 'vo-b-05', from: 5110, src: 'audio/voice/vo-b-05.wav', text: '幻局，每一手，都有据可查。', volume: 1.0, duration: 104},
] as const;

export const CAPTION_CUES = [
  {id: 'cap-a-01-1', from: 138, duration: 40, text: '如果 AI 只给答案，'},
  {id: 'cap-a-01-2', from: 184, duration: 22, text: '不给理由，'},
  {id: 'cap-a-01-3', from: 211, duration: 40, text: '信任就无从开始。'},
  {id: 'cap-a-02', from: 424, duration: 100, text: '幻局，把判断、证据和风险边界摆上桌面。'},
  {id: 'cap-a-03-1', from: 619, duration: 36, text: '真实对局进入，'},
  {id: 'cap-a-03-2', from: 664, duration: 41, text: '每一手先过规则。'},
  {id: 'cap-a-04-1', from: 1094, duration: 40, text: '五十四张牌守恒，'},
  {id: 'cap-a-04-2', from: 1140, duration: 68, text: '非法动作无法越过安全线。'},
  {id: 'cap-a-05', from: 1636, duration: 76, text: '异常，就回到稳定的基础策略。'},
  {id: 'cap-a-06', from: 1816, duration: 64, text: '你看到的，不只是答案。'},
  {id: 'cap-a-07', from: 2435, duration: 94, text: '真正的核心，是完整的认知闭环。'},
  {id: 'cap-b-01-1', from: 2622, duration: 84, text: '五百一十二个粒子估计未知手牌，'},
  {id: 'cap-b-01-2', from: 2710, duration: 72, text: '再对前三个候选做反事实推演。'},
  {id: 'cap-b-02-1', from: 3166, duration: 44, text: '安全门约束偏离，'},
  {id: 'cap-b-02-2', from: 3216, duration: 63, text: '基础价值损失最多百分之二。'},
  {id: 'cap-b-03-1', from: 3605, duration: 41, text: '二十七个决策节点，'},
  {id: 'cap-b-03-2', from: 3675, duration: 142, text: '只发生一次认知覆盖，基础价值保留百分之九十九点八三五二。'},
  {id: 'cap-b-04-1', from: 4823, duration: 29, text: '洞察能回放、'},
  {id: 'cap-b-04-2', from: 4859, duration: 28, text: '追溯和校验，'},
  {id: 'cap-b-04-3', from: 4895, duration: 31, text: '却不替你落子。'},
  {id: 'cap-b-05-1', from: 5115, duration: 15, text: '幻局，'},
  {id: 'cap-b-05-2', from: 5136, duration: 21, text: '每一手，'},
  {id: 'cap-b-05-3', from: 5163, duration: 26, text: '都有据可查。'},
] as const;
