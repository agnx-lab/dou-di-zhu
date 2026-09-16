import {PhantomPromo} from './Promo';
import {SceneRenderer} from './scenes';
import {CAPTION_CUES, SFX_CUES, SHOTS, TOTAL_FRAMES, VOICE_CUES} from './timeline';
import {C} from './theme';

export const WORKBENCH = {
  name: '幻局 · 可解释斗地主辅助智能体宣传片',
  fps: 30,
  width: 1920,
  height: 1080,
  total: TOTAL_FRAMES,
  background: C.ink,
  revision: 'v0.2-sync-and-evidence',
  shots: SHOTS.map((item) => ({
    id: item.id,
    label: `${item.id.toUpperCase()} ${item.label}`,
    from: item.from,
    duration: item.duration,
    component: SceneRenderer,
    props: {shot: item},
  })),
  transitions: [],
  captions: CAPTION_CUES.map((cue) => ({from: cue.from, duration: cue.duration, text: cue.text})),
  overlays: [],
  voiceover: VOICE_CUES.map((cue) => ({from: cue.from, duration: cue.duration, src: cue.src, volume: cue.volume, text: cue.text})),
  sfx: SFX_CUES.map((cue) => ({from: cue.from, duration: cue.duration, src: cue.src, volume: cue.volume})),
  bgm: [
    {from: 0, duration: 3404, src: 'audio/bgm/tonight-hiphop.mp3', volume: 0.2},
    {from: 3260, duration: TOTAL_FRAMES - 3260, src: 'audio/bgm/tonight-hiphop.mp3', volume: 0.2},
  ],
  original: PhantomPromo,
};
