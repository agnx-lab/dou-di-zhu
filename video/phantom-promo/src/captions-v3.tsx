import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT_SANS} from './theme';
import {v3Shot} from './timeline-v3';

type CaptionCue = {from: number; to: number; text: string};

// AAC output delay measured from the rendered voice-only probe: about 1.3 frames
// A one-frame subtitle offset leaves less than half a frame of residual error
const CAPTION_OUTPUT_OFFSET_F = 1;
const at = (shotId: string, seconds: number) => v3Shot(shotId).from + Math.round(seconds * 30) + CAPTION_OUTPUT_OFFSET_F;

// Timings follow the measured speech regions in the supplied WAV files
// Subtitle copy intentionally contains no full stops or period characters
export const V3_CAPTIONS: CaptionCue[] = [
  {from: at('v3-01', .31), to: at('v3-01', 1.20), text: '这是幻局'},
  {from: at('v3-01', 1.20), to: at('v3-01', 4.27), text: '一款可解释的斗地主 AI 辅助智能体'},
  {from: at('v3-01', 4.27), to: at('v3-01', 5.58), text: '它给出建议'},
  {from: at('v3-01', 5.58), to: at('v3-01', 7.18), text: '但把最后决定留给你'},

  {from: at('v3-02', .31), to: at('v3-02', 1.88), text: '这不是预设动画'},
  {from: at('v3-02', 1.88), to: at('v3-02', 6.09), text: '发牌 跟牌 压制和过牌 都由真实规则引擎推进'},
  {from: at('v3-02', 6.09), to: at('v3-02', 7.41), text: '桌上的每一次行动'},
  {from: at('v3-02', 7.41), to: at('v3-02', 8.74), text: '都会改变下一步判断'},

  {from: at('v3-03', .32), to: at('v3-03', 2.23), text: '幻局只读取你的手牌'},
  {from: at('v3-03', 2.23), to: at('v3-03', 4.40), text: '地主底牌和已经公开的动作'},
  {from: at('v3-03', 4.40), to: at('v3-03', 6.27), text: '绝不偷看对手暗牌'},
  {from: at('v3-03', 6.27), to: at('v3-03', 9.48), text: '未知信息由五百一十二个粒子持续估计'},

  {from: at('v3-04', .32), to: at('v3-04', 3.11), text: '轮到你时 它先枚举全部合法走法'},
  {from: at('v3-04', 3.11), to: at('v3-04', 5.50), text: '再挑出最值得比较的三个候选'},
  {from: at('v3-04', 5.50), to: at('v3-04', 7.79), text: '牌型 价值 风险'},
  {from: at('v3-04', 7.79), to: at('v3-04', 9.17), text: '以及取舍理由'},
  {from: at('v3-04', 9.17), to: at('v3-04', 10.69), text: '都清楚摆在牌桌右侧'},

  {from: at('v3-05', .31), to: at('v3-05', 2.21), text: '每条建议先过两道门'},
  {from: at('v3-05', 2.21), to: at('v3-05', 5.92), text: '第一道是斗地主规则'},
  {from: at('v3-05', 5.92), to: at('v3-05', 7.46), text: '非法组合直接拒绝'},
  {from: at('v3-05', 7.46), to: at('v3-05', 9.77), text: '第二道是安全门'},
  {from: at('v3-05', 9.77), to: at('v3-05', 10.95), text: '基础价值损失不能超过百分之二'},

  {from: at('v3-06', .31), to: at('v3-06', 2.64), text: '在稳定回放的第七个决策节点'},
  {from: at('v3-06', 2.64), to: at('v3-06', 4.83), text: '基础策略准备出单张 J'},
  {from: at('v3-06', 4.83), to: at('v3-06', 7.04), text: '认知层建议改出对子 K'},
  {from: at('v3-06', 7.04), to: at('v3-06', 10.32), text: '价值损失只有百分之一点六二六一'},
  {from: at('v3-06', 10.32), to: at('v3-06', 11.60), text: '因此允许覆盖'},

  {from: at('v3-07', .31), to: at('v3-07', 5.27), text: '更激进的八连顺看起来漂亮'},
  {from: at('v3-07', 5.27), to: at('v3-07', 6.33), text: '但损失达到百分之二点一一八四'},
  {from: at('v3-07', 6.33), to: at('v3-07', 7.82), text: '越过边界 所以被安全门否决'},

  {from: at('v3-08', .33), to: at('v3-08', 1.89), text: '幻局还会把过牌'},
  {from: at('v3-08', 1.89), to: at('v3-08', 4.20), text: '争夺牌权和大牌使用习惯'},
  {from: at('v3-08', 4.20), to: at('v3-08', 6.52), text: '累积成可追溯的行为证据'},
  {from: at('v3-08', 6.52), to: at('v3-08', 9.99), text: '到了下一局 它只在安全候选之间调整应对'},

  {from: at('v3-09', .31), to: at('v3-09', 1.87), text: '每次建议都能回放'},
  {from: at('v3-09', 1.87), to: at('v3-09', 3.19), text: '追溯和校验'},
  {from: at('v3-09', 3.19), to: at('v3-09', 4.78), text: '认知层一旦异常'},
  {from: at('v3-09', 4.78), to: at('v3-09', 6.92), text: '系统立即回到稳定的基础策略'},

  {from: at('v3-10', .33), to: at('v3-10', 2.65), text: '幻局 让 AI 不只会算'},
  {from: at('v3-10', 2.65), to: at('v3-10', 3.72), text: '更值得相信'},
  {from: at('v3-10', 3.72), to: at('v3-10', 5.55), text: '每一手 都有据可查'},
];

export const V3CaptionTrack: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = V3_CAPTIONS.find((item) => frame >= item.from && frame < item.to);
  if (!cue) return null;
  const opacity = interpolate(frame, [cue.from, cue.from + 4, cue.to - 4, cue.to], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{top: 972, height: 108, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none'}}>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(4,9,7,.96), rgba(2,5,4,1))', borderTop: `1px solid ${C.gold}55`}} />
      <div style={{position: 'relative', width: 1728, padding: '0 54px', boxSizing: 'border-box', textAlign: 'center', fontFamily: FONT_SANS, fontSize: 56, lineHeight: 1.12, fontWeight: 760, letterSpacing: '.02em', color: C.ivory, textShadow: '0 3px 16px rgba(0,0,0,.9)', whiteSpace: 'nowrap', opacity}}>
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};
