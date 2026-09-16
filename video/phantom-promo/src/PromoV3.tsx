import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile} from 'remotion';
import {V3SceneRenderer} from './scenes-v3';
import {V3_NARRATION_PLAN, V3_SFX_CUES, V3_SHOTS, V3_TOTAL_FRAMES} from './timeline-v3';
import {C} from './theme';
import {V3CaptionTrack} from './captions-v3';

export type PromoV3Props = {bgm?: boolean; voiceover?: boolean; captions?: boolean; sfx?: boolean};

export const PhantomPromoV3: React.FC<PromoV3Props> = ({bgm = true, voiceover = true, captions = true, sfx = true}) => (
  <AbsoluteFill style={{background: C.ink}}>
    <div style={{position: 'absolute', left: 96, top: 0, width: 1920, height: 1080, transform: 'scale(.9)', transformOrigin: 'top left', overflow: 'hidden'}}>
      {V3_SHOTS.map((item) => (
        <Sequence key={item.id} name={`${item.id.toUpperCase()} ${item.label}`} from={item.from} durationInFrames={item.duration} premountFor={30}>
          <V3SceneRenderer shot={item}/>
        </Sequence>
      ))}
    </div>

    {bgm ? (
      <Sequence from={0} durationInFrames={V3_TOTAL_FRAMES} name="V3 BGM">
        <Audio
          src={staticFile('audio/bgm/tonight-hiphop.mp3')}
          volume={(f) => {
            const envelope = interpolate(f, [0, 40, V3_TOTAL_FRAMES-70, V3_TOTAL_FRAMES], [0, 1, 1, 0], {extrapolateLeft:'clamp',extrapolateRight:'clamp'});
            const duck = voiceover ? Math.max(...V3_NARRATION_PLAN.map((cue) => interpolate(f, [cue.from-8, cue.from+4, cue.to-8, cue.to+8], [0, 1, 1, 0], {extrapolateLeft:'clamp',extrapolateRight:'clamp'}))) : 0;
            return envelope * (.16 - duck * .085);
          }}
        />
      </Sequence>
    ) : null}

    {sfx ? V3_SFX_CUES.map((cue)=><Sequence key={cue.id} name={`SFX ${cue.id}`} from={cue.from} durationInFrames={cue.duration}><Audio src={staticFile(cue.src)} volume={cue.volume * (voiceover ? .72 : 1)}/></Sequence>) : null}

    {voiceover ? V3_NARRATION_PLAN.map((cue)=><Sequence key={cue.id} name={`VOICE ${cue.id}`} from={cue.from} durationInFrames={cue.to-cue.from}><Audio src={staticFile(cue.src)} volume={1}/></Sequence>) : null}
    {captions ? <V3CaptionTrack/> : null}
  </AbsoluteFill>
);
