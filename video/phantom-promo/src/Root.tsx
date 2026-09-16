import React from 'react';
import {Composition} from 'remotion';
import {PhantomPromo} from './Promo';
import {FPS, TOTAL_FRAMES} from './timeline';
import {PhantomPromoV3} from './PromoV3';
import {V3_FPS, V3_TOTAL_FRAMES} from './timeline-v3';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="PhantomPromo"
      component={PhantomPromo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{bgm: true, voiceover: true}}
    />
    <Composition
      id="PhantomPromoV3"
      component={PhantomPromoV3}
      durationInFrames={V3_TOTAL_FRAMES}
      fps={V3_FPS}
      width={1920}
      height={1080}
      defaultProps={{bgm: true, voiceover: true, captions: true, sfx: true}}
    />
  </>
);
