import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT_MONO, FONT_SANS, FONT_SERIF} from '../theme';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const easeOut = (frame: number, input: [number, number], output: [number, number]) =>
  interpolate(frame, input, output, {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});

export const fadeEdges = (frame: number, duration: number, edge = 10) =>
  interpolate(frame, [0, edge, duration - edge, duration], [0, 1, 1, 0], clamp);

export const FilmBackground: React.FC<{children?: React.ReactNode; glow?: string}> = ({children, glow = C.jade}) => (
  <AbsoluteFill style={{
    background: [
      `radial-gradient(900px 620px at 50% 44%, ${glow}20, transparent 70%)`,
      'radial-gradient(1200px 900px at 50% 45%, rgba(23,59,45,.44), rgba(8,11,9,.98) 72%)',
      C.ink,
    ].join(','),
    color: C.ivory,
    fontFamily: FONT_SANS,
    overflow: 'hidden',
  }}>
    <div style={{position: 'absolute', inset: 28, border: `1px solid ${C.line}`, pointerEvents: 'none'}} />
    <div style={{position: 'absolute', inset: 0, opacity: .14, backgroundImage: 'repeating-linear-gradient(112deg, transparent 0 7px, rgba(255,255,255,.018) 8px, transparent 9px 17px)', pointerEvents: 'none'}} />
    {children}
  </AbsoluteFill>
);

export const Kicker: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = C.gold}) => (
  <div style={{fontFamily: FONT_MONO, color, fontSize: 24, letterSpacing: '.16em', textTransform: 'uppercase'}}>{children}</div>
);

export const Caption: React.FC<{text: string; duration: number}> = ({text, duration}) => {
  const frame = useCurrentFrame();
  const opacity = fadeEdges(frame, duration, Math.min(5, Math.max(2, Math.floor(duration / 6))));
  return (
    <div style={{position: 'absolute', left: 150, right: 150, bottom: 48, display: 'flex', justifyContent: 'center', opacity, zIndex: 100}}>
      <div style={{maxWidth: 1500, fontFamily: FONT_SANS, fontSize: 48, fontWeight: 700, color: C.ivory, lineHeight: 1.32, textAlign: 'center', padding: '13px 30px 15px', borderRadius: 16, background: 'rgba(2,7,5,.88)', boxShadow: '0 14px 44px rgba(0,0,0,.45)', border: '1px solid rgba(246,240,227,.12)', textShadow: '0 2px 10px rgba(0,0,0,.72)'}}>{text}</div>
    </div>
  );
};

export const Screenshot: React.FC<{
  src: string;
  frame: number;
  duration: number;
  zoomFrom?: number;
  zoomTo?: number;
  dim?: number;
  radius?: number;
}> = ({src, frame, duration, zoomFrom = 1.05, zoomTo = 1, dim = 0, radius = 0}) => {
  const zoom = interpolate(frame, [0, Math.max(1, duration - 1)], [zoomFrom, zoomTo], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return (
    <AbsoluteFill style={{overflow: 'hidden', borderRadius: radius}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`}} />
      {dim > 0 ? <AbsoluteFill style={{background: `rgba(3,9,6,${dim})`}} /> : null}
    </AbsoluteFill>
  );
};

export const BigTitle: React.FC<{title: string; subtitle?: string; accent?: string; align?: 'center'|'left'}> = ({title, subtitle, accent = C.jade, align = 'center'}) => {
  const frame = useCurrentFrame();
  const titleIn = easeOut(frame, [0, 24], [0, 1]);
  const subIn = easeOut(frame, [16, 38], [0, 1]);
  return (
    <div style={{textAlign: align, maxWidth: 1500, opacity: titleIn, transform: `translateY(${(1-titleIn)*36}px)`}}>
      <h1 style={{fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 116, lineHeight: 1.12, letterSpacing: '.04em', margin: 0, color: C.ivory}}>{title}</h1>
      {subtitle ? <div style={{fontSize: 34, lineHeight: 1.5, marginTop: 26, color: accent, opacity: subIn, transform: `translateY(${(1-subIn)*18}px)`}}>{subtitle}</div> : null}
    </div>
  );
};

export const PlayingCard: React.FC<{rank: string; suit?: string; back?: boolean; scale?: number}> = ({rank, suit = '♠', back = false, scale = 1}) => {
  const red = suit === '♥' || suit === '♦' || rank === '大王';
  return (
    <div style={{width: 240, height: 340, borderRadius: 22, background: back ? `repeating-linear-gradient(45deg, ${C.feltDeep} 0 14px, #102e23 14px 28px)` : C.ivory, border: `3px solid ${back ? C.gold : '#d8d1c4'}`, boxShadow: '0 28px 80px rgba(0,0,0,.46), inset 0 0 0 9px rgba(255,255,255,.18)', color: red ? C.cinnabar : '#121512', padding: 22, boxSizing: 'border-box', transform: `scale(${scale})`, position: 'relative', overflow: 'hidden'}}>
      {back ? <div style={{position: 'absolute', inset: 32, border: `2px solid ${C.gold}88`, display: 'grid', placeItems: 'center', fontFamily: FONT_SERIF, fontSize: 50, color: C.gold}}>幻</div> : <>
        <div style={{fontSize: rank.includes('王') ? 34 : 58, lineHeight: 1, fontWeight: 800, writingMode: rank.includes('王') ? 'vertical-rl' : undefined}}>{rank}</div>
        <div style={{fontSize: 46, lineHeight: 1.1}}>{rank.includes('王') ? '幻' : suit}</div>
        <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: FONT_SERIF, fontSize: 104, opacity: .92}}>{rank.includes('王') ? '王' : suit}</div>
      </>}
    </div>
  );
};
