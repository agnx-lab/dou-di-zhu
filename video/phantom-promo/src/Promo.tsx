import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile} from 'remotion';
import {Caption} from './lib/visual';
import {SceneRenderer} from './scenes';
import {CAPTION_CUES, SFX_CUES, SHOTS, TOTAL_FRAMES, VOICE_CUES} from './timeline';
import {C} from './theme';

export type PromoProps = {bgm?: boolean; voiceover?: boolean};

const duckBgm = (globalFrame: number) => {
  let level = 1;

  for (const cue of VOICE_CUES) {
    const cueEnd = cue.from + cue.duration;
    const cueLevel = interpolate(
      globalFrame,
      [cue.from - 10, cue.from + 3, cueEnd - 4, cueEnd + 12],
      [1, 0.34, 0.34, 1],
      {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
    );
    level = Math.min(level, cueLevel);
  }

  return level;
};

export const PhantomPromo: React.FC<PromoProps> = ({bgm = true, voiceover = true}) => (
  <AbsoluteFill style={{background: C.ink}}>
    {SHOTS.map((item) => (
      <Sequence key={item.id} name={`${item.id.toUpperCase()} ${item.label}`} from={item.from} durationInFrames={item.duration} premountFor={30}>
        <SceneRenderer shot={item} />
      </Sequence>
    ))}

    {bgm ? (
      <>
        <Sequence from={0} durationInFrames={3404} name="BGM A">
          <Audio
            src={staticFile('audio/bgm/tonight-hiphop.mp3')}
            volume={(f) =>
              interpolate(f, [0, 45, 3260, 3404], [0, 0.2, 0.2, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
              duckBgm(f)
            }
          />
        </Sequence>
        <Sequence from={3260} durationInFrames={TOTAL_FRAMES - 3260} name="BGM B crossfade">
          <Audio
            src={staticFile('audio/bgm/tonight-hiphop.mp3')}
            volume={(f) =>
              interpolate(f, [0, 100, TOTAL_FRAMES - 3330, TOTAL_FRAMES - 3260], [0, 0.2, 0.2, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }) * duckBgm(f + 3260)
            }
          />
        </Sequence>
      </>
    ) : null}

    {SFX_CUES.map((cue) => (
      <Sequence key={cue.id} name={`SFX ${cue.id}`} from={cue.from} durationInFrames={cue.duration}>
        <Audio src={staticFile(cue.src)} volume={cue.volume} />
      </Sequence>
    ))}

    {voiceover
      ? VOICE_CUES.map((cue) => (
          <Sequence key={cue.id} name={`VOICE ${cue.id}`} from={cue.from} durationInFrames={cue.duration} premountFor={15}>
            <Audio src={staticFile(cue.src)} volume={cue.volume} />
          </Sequence>
        ))
      : null}

    {voiceover
      ? CAPTION_CUES.map((cue) => (
          <Sequence key={cue.id} name={`CAPTION ${cue.id}`} from={cue.from} durationInFrames={cue.duration} premountFor={5}>
            <Caption text={cue.text} duration={cue.duration} />
          </Sequence>
        ))
      : null}
  </AbsoluteFill>
);
