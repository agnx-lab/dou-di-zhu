export type V3Shot = {
  id: string;
  from: number;
  duration: number;
  label: string;
};

export const V3_FPS = 30;
export const V3_TOTAL_FRAMES = 3600;

export const V3_SHOTS: V3Shot[] = [
  {id: 'v3-01', from: 0, duration: 300, label: '十秒讲清产品'},
  {id: 'v3-02', from: 300, duration: 360, label: '真实牌局推进'},
  {id: 'v3-03', from: 660, duration: 390, label: '公开信息与未知牌'},
  {id: 'v3-04', from: 1050, duration: 420, label: '实战辅助与候选比较'},
  {id: 'v3-05', from: 1470, duration: 390, label: '规则门与安全门'},
  {id: 'v3-06', from: 1860, duration: 480, label: '第七节点认知覆盖'},
  {id: 'v3-07', from: 2340, duration: 330, label: '越界候选否决'},
  {id: 'v3-08', from: 2670, duration: 420, label: '跨局成长'},
  {id: 'v3-09', from: 3090, duration: 300, label: '追溯与回退'},
  {id: 'v3-10', from: 3390, duration: 210, label: '牌桌品牌收束'},
];

export const v3Shot = (id: string) => {
  const found = V3_SHOTS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown V3 shot: ${id}`);
  return found;
};

export const V3_SFX_CUES = [
  {id: 'v3-open-impact', from: v3Shot('v3-01').from + 8, src: 'audio/sfx/impact-deep-whoosh.mp3', volume: 0.34, duration: 80},
  {id: 'v3-game-cut-a', from: v3Shot('v3-02').from + 116, src: 'audio/foley/card-place-1.ogg', volume: 0.52, duration: 30},
  {id: 'v3-game-cut-b', from: v3Shot('v3-02').from + 236, src: 'audio/foley/card-slide-5.ogg', volume: 0.46, duration: 42},
  {id: 'v3-public-reveal', from: v3Shot('v3-03').from + 74, src: 'audio/sfx/shimmer-sparkle-sweep.mp3', volume: 0.20, duration: 65},
  {id: 'v3-candidates', from: v3Shot('v3-04').from + 176, src: 'audio/foley/card-place-1.ogg', volume: 0.52, duration: 34},
  {id: 'v3-gate-lock', from: v3Shot('v3-05').from + 246, src: 'audio/sfx/gear-lock-metallic.mp3', volume: 0.42, duration: 58},
  {id: 'v3-override', from: v3Shot('v3-06').from + 250, src: 'audio/sfx/impact-cine-big.mp3', volume: 0.28, duration: 110},
  {id: 'v3-veto', from: v3Shot('v3-07').from + 173, src: 'audio/sfx/impact-deep-whoosh.mp3', volume: 0.32, duration: 75},
  {id: 'v3-outro-riser', from: v3Shot('v3-10').from + 4, src: 'audio/sfx/air-woosh-deep.mp3', volume: 0.20, duration: 118},
  {id: 'v3-outro-impact', from: v3Shot('v3-10').from + 92, src: 'audio/sfx/impact-deep-whoosh.mp3', volume: 0.40, duration: 88},
] as const;

export const V3_NARRATION_PLAN = [
  {id: 'voice-v3-01', from: 0, to: 235, src: 'audio/voice/voice-v3-01.wav'},
  {id: 'voice-v3-02', from: 300, to: 582, src: 'audio/voice/voice-v3-02.wav'},
  {id: 'voice-v3-03', from: 660, to: 963, src: 'audio/voice/voice-v3-03.wav'},
  {id: 'voice-v3-04', from: 1050, to: 1391, src: 'audio/voice/voice-v3-04.wav'},
  {id: 'voice-v3-05', from: 1470, to: 1818, src: 'audio/voice/voice-v3-05.wav'},
  {id: 'voice-v3-06', from: 1860, to: 2227, src: 'audio/voice/voice-v3-06.wav'},
  {id: 'voice-v3-07', from: 2340, to: 2594, src: 'audio/voice/voice-v3-07.wav'},
  {id: 'voice-v3-08', from: 2670, to: 2988, src: 'audio/voice/voice-v3-08.wav'},
  {id: 'voice-v3-09', from: 3090, to: 3318, src: 'audio/voice/voice-v3-09.wav'},
  {id: 'voice-v3-10', from: 3390, to: 3577, src: 'audio/voice/voice-v3-10.wav'},
] as const;
