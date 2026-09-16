import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT_MONO, FONT_SANS, FONT_SERIF} from './theme';
import {clamp, easeOut} from './lib/visual';
import type {V3Shot} from './timeline-v3';

const GAME = 'textures/live/';

const GameCanvas: React.FC<{
  src: string;
  duration: number;
  zoomFrom?: number;
  zoomTo?: number;
  panX?: number;
  panY?: number;
  dim?: number;
}> = ({src, duration, zoomFrom = 1.015, zoomTo = 1, panX = 0, panY = 0, dim = 0}) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, Math.max(1, duration - 1)], [zoomFrom, zoomTo], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const x = interpolate(frame, [0, Math.max(1, duration - 1)], [panX, -panX], clamp);
  const y = interpolate(frame, [0, Math.max(1, duration - 1)], [panY, -panY], clamp);
  return <AbsoluteFill style={{overflow: 'hidden', background: C.ink}}>
    <Img src={staticFile(`${GAME}${src}`)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${x}px,${y}px) scale(${zoom})`}} />
    {dim ? <AbsoluteFill style={{background: `rgba(2,8,5,${dim})`}} /> : null}
  </AbsoluteFill>;
};

const Glass: React.FC<React.PropsWithChildren<{style?: React.CSSProperties; accent?: string}>> = ({children, style, accent = C.gold}) => (
  <div style={{background: 'rgba(5,14,10,.91)', border: `1px solid ${accent}66`, borderRadius: 22, boxShadow: '0 24px 64px rgba(0,0,0,.38)', backdropFilter: 'blur(16px)', ...style}}>{children}</div>
);

const Label: React.FC<React.PropsWithChildren<{accent?: string}>> = ({children, accent = C.gold}) => (
  <div style={{fontFamily: FONT_MONO, fontSize: 21, letterSpacing: '.12em', color: accent, textTransform: 'uppercase'}}>{children}</div>
);

const MicroCard: React.FC<{rank: string; red?: boolean; scale?: number}> = ({rank, red = false, scale = 1}) => (
  <div style={{width: 76, height: 104, borderRadius: 10, background: C.ivory, color: red ? C.cinnabar : '#111713', border: '2px solid #d6cebf', boxShadow: '0 12px 26px rgba(0,0,0,.32)', padding: '9px 10px', boxSizing: 'border-box', fontFamily: FONT_SANS, fontSize: 27, fontWeight: 850, transform: `scale(${scale})`}}>{rank}</div>
);

const CornerBug: React.FC<{index: string; title: string}> = ({index, title}) => (
  <div style={{position: 'absolute', left: 36, top: 94, display: 'flex', alignItems: 'center', gap: 14, zIndex: 10}}>
    <div style={{width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: C.gold, color: C.ink, fontFamily: FONT_MONO, fontWeight: 900}}>{index}</div>
    <div style={{padding: '9px 15px', borderRadius: 12, background: 'rgba(3,10,7,.82)', border: `1px solid ${C.line}`, color: C.ivory, fontSize: 23, fontWeight: 720}}>{title}</div>
  </div>
);

const OpeningGame: React.FC<{duration: number}> = ({duration}) => {
  const f = useCurrentFrame();
  const intro = easeOut(f, [4, 28], [0, 1]);
  const hand = interpolate(f, [70, 104, 155, 190], [0, 1, 1, 0], clamp);
  const proof = interpolate(f, [150, 190, 260, 292], [0, 1, 1, .3], clamp);
  return <AbsoluteFill style={{fontFamily: FONT_SANS, color: C.ivory}}>
    <GameCanvas src="v3-human-advice-selected.png" duration={duration} zoomFrom={1.025} zoomTo={1.006} panX={8} dim={.03} />
    <Glass style={{position: 'absolute', left: 72, top: 176, width: 650, padding: '34px 40px', boxSizing: 'border-box', opacity: intro, transform: `translateY(${(1-intro)*30}px)`}}>
      <Label>EXPLAINABLE DOU DIZHU AI</Label>
      <div style={{fontFamily: FONT_SERIF, fontSize: 66, lineHeight: 1.12, marginTop: 18}}>可解释的<br/><span style={{color: C.gold}}>斗地主 AI 助手</span></div>
      <div style={{fontSize: 28, color: C.jade, marginTop: 20}}>AI 给建议 · 最终由你决定</div>
    </Glass>
    <div style={{position: 'absolute', left: 474, top: 846, width: 690, height: 146, borderRadius: 18, border: `4px solid ${C.gold}`, boxShadow: `0 0 55px ${C.gold}55`, opacity: hand}} />
    <div style={{position: 'absolute', right: 16, top: 173, width: 341, height: 633, borderRadius: 22, border: `3px solid ${C.jade}`, boxShadow: `0 0 58px ${C.jade}44`, opacity: proof}} />
    <div style={{position: 'absolute', left: 1210, bottom: 144, display: 'flex', gap: 12, opacity: proof}}>
      {['读牌势','比候选','过安全门'].map((x,i)=><span key={x} style={{padding: '10px 16px', borderRadius: 999, background: 'rgba(5,14,10,.9)', border: `1px solid ${i===2?C.gold:C.jade}77`, color: i===2?C.gold:C.jade, fontSize: 21}}>{x}</span>)}
    </div>
  </AbsoluteFill>;
};

const LiveRun: React.FC<{duration: number}> = ({duration}) => {
  const f = useCurrentFrame();
  const stage = Math.min(2, Math.floor(f / 120));
  const local = f % 120;
  const src = ['v3-turn-01.png','v3-turn-07.png','v3-turn-10.png'][stage];
  const hit = spring({frame: local - 18, fps: 30, config: {damping: 18, stiffness: 160}});
  return <AbsoluteFill style={{fontFamily: FONT_SANS, color: C.ivory}}>
    <GameCanvas src={src} duration={120} zoomFrom={1.018} zoomTo={1.002} panX={stage===1?7:-7} />
    <CornerBug index="02" title="真实规则引擎正在推进" />
    <div style={{position: 'absolute', left: 760, top: 388, display: 'flex', gap: 10, opacity: Math.min(1, hit), transform: `translateY(${(1-hit)*70}px) scale(${.86+.14*hit})`}}>
      {(stage===0?['7']:stage===1?['A']:['2']).map((r,i)=><MicroCard key={`${r}-${i}`} rank={r} red={i%2===1}/>) }
    </div>
    <div style={{position: 'absolute', left: 730, top: 520, padding: '8px 14px', borderRadius: 10, background: 'rgba(4,11,8,.86)', color: C.gold, fontSize: 22, opacity: Math.min(1, hit)}}>{['上家选择不出','下家出牌后更新候选','公开动作改变下一手判断'][stage]}</div>
  </AbsoluteFill>;
};

const PublicInfo: React.FC<{duration: number}> = ({duration}) => {
  const f = useCurrentFrame();
  const reveal = f < 150;
  const p = easeOut(f, [140, 210], [0, 1]);
  return <AbsoluteFill style={{fontFamily: FONT_SANS, color: C.ivory}}>
    <GameCanvas src={reveal?'watch-reveal.png':'watch-thinking-a.png'} duration={reveal?150:duration-150} zoomFrom={1.012} zoomTo={1} dim={reveal?.01:.04} />
    <CornerBug index="03" title="只使用玩家可见信息" />
    {!reveal ? <>
      <div style={{position: 'absolute', left: 390, top: 300, width: 930, height: 440, borderRadius: 80, overflow: 'hidden', opacity: p}}>
        {Array.from({length: 96},(_,i)=>{
          const x=30+((i*137)%870); const y=20+((i*73)%390); const drift=Math.sin((f+i*11)*.035)*10;
          return <i key={i} style={{position:'absolute',left:x+drift,top:y,width:3+(i%3),height:3+(i%3),borderRadius:'50%',background:i%7===0?C.gold:C.jade,opacity:.18+(i%5)*.1,boxShadow:i%13===0?`0 0 10px ${C.jade}`:undefined}}/>;
        })}
      </div>
      <Glass style={{position: 'absolute', left: 675, top: 414, width: 360, padding: '20px 24px', textAlign: 'center', opacity: p}}>
        <Label>HIDDEN HAND BELIEF</Label>
        <div style={{fontFamily: FONT_MONO, fontSize: 56, color: C.gold, marginTop: 10}}>512</div>
        <div style={{fontSize: 22, color: C.muted, marginTop: 4}}>粒子估计未知手牌</div>
      </Glass>
    </> : null}
  </AbsoluteFill>;
};

const CandidateAssist: React.FC<{duration: number}> = ({duration}) => {
  const f=useCurrentFrame();
  const hand=easeOut(f,[30,78],[0,1]);
  const side=easeOut(f,[155,220],[0,1]);
  return <AbsoluteFill style={{fontFamily:FONT_SANS,color:C.ivory}}>
    <GameCanvas src={f<170?'play-ready.png':'v3-human-advice-selected.png'} duration={duration} zoomFrom={1.008} zoomTo={1.025} panX={-8} dim={.025}/>
    <CornerBug index="04" title="全部合法走法 → Top-3 候选" />
    <div style={{position:'absolute',left:488,top:847,width:680,height:145,borderRadius:18,border:`4px solid ${C.gold}`,opacity:hand,boxShadow:`0 0 48px ${C.gold}44`}}/>
    <div style={{position:'absolute',left:653,top:978,width:360,height:6,borderRadius:4,background:C.gold,transform:`scaleX(${hand})`,transformOrigin:'left'}}/>
    <div style={{position:'absolute',right:25,top:586,width:325,height:214,borderRadius:18,border:`4px solid ${C.jade}`,opacity:side,boxShadow:`0 0 52px ${C.jade}44`}}/>
    <Glass style={{position:'absolute',left:740,top:360,width:470,padding:'22px 26px',opacity:side,transform:`translateX(${(1-side)*-34}px)`}}>
      <Label accent={C.jade}>候选比较已经完成</Label>
      <div style={{fontSize:29,marginTop:12}}>牌型 · 价值 · 风险 · 取舍理由</div>
      <div style={{fontFamily:FONT_MONO,fontSize:21,color:C.muted,marginTop:10}}>69 种合法走法，最终确认仍在玩家手中</div>
    </Glass>
  </AbsoluteFill>;
};

const TwoGates: React.FC<{duration: number}> = ({duration}) => {
  const f=useCurrentFrame();
  const rule=easeOut(f,[35,95],[0,1]);
  const safe=easeOut(f,[170,245],[0,1]);
  return <AbsoluteFill style={{fontFamily:FONT_SANS,color:C.ivory}}>
    <GameCanvas src="v3-human-advice-selected.png" duration={duration} zoomFrom={1.018} zoomTo={1.006} dim={.08}/>
    <CornerBug index="05" title="每条建议必须通过两道门" />
    <Glass accent={C.cinnabar} style={{position:'absolute',left:420,top:310,width:430,padding:'26px 30px',opacity:rule,transform:`translateX(${(1-rule)*-42}px)`}}>
      <Label accent={C.cinnabar}>RULE GATE</Label><div style={{fontFamily:FONT_SERIF,fontSize:48,marginTop:14}}>非法组合，直接拒绝</div>
      <div style={{display:'flex',gap:8,marginTop:22}}><MicroCard rank="4"/><MicroCard rank="4" red/><MicroCard rank="5"/></div>
    </Glass>
    <Glass accent={C.gold} style={{position:'absolute',left:885,top:310,width:430,padding:'26px 30px',opacity:safe,transform:`translateX(${(1-safe)*42}px)`}}>
      <Label>SAFETY GATE</Label><div style={{fontFamily:FONT_SERIF,fontSize:48,marginTop:14}}>基础价值损失 ≤ 2%</div>
      <div style={{height:12,borderRadius:8,background:'rgba(255,255,255,.08)',marginTop:34,overflow:'hidden'}}><i style={{display:'block',height:'100%',width:`${safe*81.3}%`,background:`linear-gradient(90deg,${C.jade},${C.gold})`}}/></div>
      <div style={{fontFamily:FONT_MONO,fontSize:23,color:C.jade,marginTop:14}}>1.6261% · PASSED</div>
    </Glass>
  </AbsoluteFill>;
};

const OverrideOnTable: React.FC<{duration: number}> = ({duration}) => {
  const f=useCurrentFrame();
  const first=easeOut(f,[35,100],[0,1]);
  const arrow=easeOut(f,[135,205],[0,1]);
  const second=spring({frame:f-230,fps:30,config:{damping:18,stiffness:150}});
  return <AbsoluteFill style={{fontFamily:FONT_SANS,color:C.ivory}}>
    <GameCanvas src="v3-turn-04.png" duration={duration} zoomFrom={1.012} zoomTo={1.003} dim={.07}/>
    <CornerBug index="06" title="稳定回放 · 第 7 个决策节点" />
    <Glass style={{position:'absolute',left:475,top:330,width:770,height:300,padding:'30px 34px',boxSizing:'border-box'}}>
      <Label>COGNITIVE OVERRIDE · TURN 7</Label>
      <div style={{display:'grid',gridTemplateColumns:'1fr 90px 1fr',alignItems:'center',gap:18,marginTop:28}}>
        <div style={{opacity:first,textAlign:'center'}}><div style={{fontSize:22,color:C.muted}}>基础策略</div><div style={{fontFamily:FONT_SERIF,fontSize:62,marginTop:14}}>单张 J</div></div>
        <div style={{fontSize:58,color:C.gold,textAlign:'center',opacity:arrow,transform:`translateX(${(1-arrow)*-28}px)`}}>→</div>
        <div style={{opacity:Math.min(1,second),transform:`scale(${.9+.1*second})`,textAlign:'center'}}><div style={{fontSize:22,color:C.gold}}>认知建议</div><div style={{fontFamily:FONT_SERIF,fontSize:62,marginTop:14}}>对子 K</div></div>
      </div>
      <div style={{fontFamily:FONT_MONO,fontSize:23,color:C.jade,textAlign:'center',marginTop:20,opacity:Math.min(1,second)}}>BASE LOSS 1.6261% ≤ 2% · ALLOWED</div>
    </Glass>
  </AbsoluteFill>;
};

const VetoOnTable: React.FC<{duration: number}> = ({duration}) => {
  const f=useCurrentFrame();
  const row=easeOut(f,[25,110],[0,1]);
  const veto=spring({frame:f-170,fps:30,config:{damping:19,stiffness:190}});
  return <AbsoluteFill style={{fontFamily:FONT_SANS,color:C.ivory}}>
    <GameCanvas src="v3-turn-01.png" duration={duration} zoomFrom={1.008} zoomTo={1.018} dim={.08}/>
    <CornerBug index="07" title="更激进，不等于更可信" />
    <Glass accent={C.cinnabar} style={{position:'absolute',left:420,top:330,width:930,padding:'28px 34px',boxSizing:'border-box',opacity:row}}>
      <div style={{display:'flex',gap:9,alignItems:'center'}}>{['5','6','7','8','9','10','J','Q'].map((x,i)=><MicroCard key={x} rank={x} red={i%2===1} scale={.86}/>)}</div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:20}}><span style={{fontSize:28}}>八连顺 5—Q</span><b style={{fontFamily:FONT_MONO,fontSize:25,color:C.cinnabar}}>LOSS 2.1184% &gt; 2%</b></div>
      <div style={{position:'absolute',right:38,top:38,padding:'12px 18px',border:`3px solid ${C.cinnabar}`,color:C.cinnabar,fontFamily:FONT_MONO,fontSize:28,fontWeight:900,transform:`rotate(-8deg) scale(${veto})`,opacity:Math.min(1,veto),background:'rgba(5,14,10,.92)'}}>SAFETY VETO</div>
    </Glass>
  </AbsoluteFill>;
};

const LearningRun: React.FC<{duration: number}> = ({duration}) => {
  const f=useCurrentFrame();
  const stage=Math.min(2,Math.floor(f/140));
  const src=['v3-turn-04.png','v3-turn-10.png','v3-turn-14.png'][stage];
  const progress=easeOut(f,[24,duration-35],[0,1]);
  return <AbsoluteFill style={{fontFamily:FONT_SANS,color:C.ivory}}>
    <GameCanvas src={src} duration={140} zoomFrom={1.012} zoomTo={1} panX={stage===1?6:-6}/>
    <CornerBug index="08" title="公开行为证据，跨局累积" />
    <Glass style={{position:'absolute',left:430,right:410,top:650,padding:'18px 24px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><Label>OBSERVE → SHAPE → VERIFY → ADAPT</Label><b style={{fontFamily:FONT_MONO,color:C.gold,fontSize:23}}>{Math.round(progress*100)}%</b></div>
      <div style={{height:9,borderRadius:9,background:'rgba(255,255,255,.08)',marginTop:13,overflow:'hidden'}}><i style={{display:'block',height:'100%',width:`${progress*100}%`,background:`linear-gradient(90deg,${C.jade},${C.gold})`}}/></div>
      <div style={{fontSize:21,color:C.muted,marginTop:10}}>过牌 · 牌权争夺 · 大牌使用习惯 → 只在安全候选之间调整</div>
    </Glass>
  </AbsoluteFill>;
};

const AuditRun: React.FC<{duration: number}> = ({duration}) => {
  const f=useCurrentFrame();
  const items=['回放时间线','概率来源','合法性校验','异常立即回退'];
  return <AbsoluteFill style={{fontFamily:FONT_SANS,color:C.ivory}}>
    <GameCanvas src="v3-human-advice-selected.png" duration={duration} zoomFrom={1.006} zoomTo={1.014} dim={.05}/>
    <CornerBug index="09" title="能解释，也能回退" />
    <div style={{position:'absolute',left:445,top:300,width:850,display:'grid',gap:14}}>{items.map((x,i)=>{const k=easeOut(f,[24+i*48,60+i*48],[0,1]);return <Glass key={x} style={{height:72,padding:'0 24px',display:'grid',gridTemplateColumns:'52px 1fr 160px',alignItems:'center',opacity:k,transform:`translateX(${(1-k)*38}px)`}}><b style={{fontFamily:FONT_MONO,color:C.gold}}>0{i+1}</b><span style={{fontSize:29}}>{x}</span><em style={{fontStyle:'normal',fontFamily:FONT_MONO,color:i===3?C.cinnabar:C.jade,fontSize:19}}>{i===3?'FALLBACK':'VERIFIED'}</em></Glass>})}</div>
  </AbsoluteFill>;
};

const TableOutro: React.FC<{duration: number}> = ({duration}) => {
  const f=useCurrentFrame();
  const word=spring({frame:f-35,fps:30,config:{damping:20,stiffness:105}});
  const sub=easeOut(f,[80,118],[0,1]);
  return <AbsoluteFill style={{fontFamily:FONT_SANS,color:C.ivory}}>
    <GameCanvas src="v3-human-advice-selected.png" duration={duration} zoomFrom={1.02} zoomTo={1.006} dim={.32}/>
    <div style={{position:'absolute',left:390,top:270,width:930,textAlign:'center',opacity:Math.min(1,word),transform:`translateY(${(1-word)*36}px) scale(${.92+.08*word})`}}>
      <Label>EXPLAINABLE DOU DIZHU AGENT</Label>
      <div style={{fontFamily:FONT_SERIF,fontSize:155,letterSpacing:'.18em',marginLeft:'.18em',marginTop:14,textShadow:'0 22px 70px rgba(0,0,0,.7)'}}>幻局</div>
      <div style={{height:4,width:520,margin:'18px auto 22px',background:`linear-gradient(90deg,transparent,${C.gold},transparent)`,transform:`scaleX(${sub})`}}/>
      <div style={{fontFamily:FONT_SERIF,fontSize:54,color:C.gold,opacity:sub}}>每一手，都有据可查。</div>
      <div style={{fontSize:26,color:C.jade,marginTop:18,opacity:sub}}>让 AI 不只会算，更值得相信</div>
    </div>
  </AbsoluteFill>;
};

export const V3SceneRenderer: React.FC<{shot: V3Shot}> = ({shot}) => {
  let scene: React.ReactNode;
  switch(shot.id){
    case 'v3-01': scene=<OpeningGame duration={shot.duration}/>; break;
    case 'v3-02': scene=<LiveRun duration={shot.duration}/>; break;
    case 'v3-03': scene=<PublicInfo duration={shot.duration}/>; break;
    case 'v3-04': scene=<CandidateAssist duration={shot.duration}/>; break;
    case 'v3-05': scene=<TwoGates duration={shot.duration}/>; break;
    case 'v3-06': scene=<OverrideOnTable duration={shot.duration}/>; break;
    case 'v3-07': scene=<VetoOnTable duration={shot.duration}/>; break;
    case 'v3-08': scene=<LearningRun duration={shot.duration}/>; break;
    case 'v3-09': scene=<AuditRun duration={shot.duration}/>; break;
    case 'v3-10': scene=<TableOutro duration={shot.duration}/>; break;
    default: throw new Error(`No V3 scene for ${shot.id}`);
  }
  return <AbsoluteFill>{scene}</AbsoluteFill>;
};
