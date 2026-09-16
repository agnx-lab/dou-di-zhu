import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import {BigTitle, FilmBackground, Kicker, PlayingCard, Screenshot, clamp, easeOut} from './lib/visual';
import {C, FONT_MONO, FONT_SANS, FONT_SERIF} from './theme';
import type {Shot} from './timeline';

const Panel: React.FC<React.PropsWithChildren<{style?: React.CSSProperties}>> = ({children, style}) => (
  <div style={{background: C.panel, border: `1px solid ${C.line}`, borderRadius: 24, boxShadow: '0 32px 90px rgba(0,0,0,.34)', ...style}}>{children}</div>
);

const HeroCard: React.FC = () => {
  const f = useCurrentFrame();
  const flight = interpolate(f, [10, 66], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const scale = interpolate(flight, [0, 1], [.06, 2.4]);
  const arc = Math.sin(flight * Math.PI);
  const spin = 13 * 360 * (1 - Math.pow(1 - flight, 2.2));
  const flash = interpolate(f, [0, 3, 9, 14], [0, 1, .8, 0], clamp);
  const sheen = interpolate(f, [78, 104], [-130, 160], clamp);
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 960, top: 540, width: 1100, height: 12, background: `linear-gradient(90deg,transparent,${C.jade},transparent)`, filter: 'blur(3px)', opacity: flash, transform: `translate(-50%,-50%) rotate(${45+f*7}deg)`}} />
      <div style={{position: 'absolute', left: 960, top: 540, width: 420, height: 420, borderRadius: '50%', background: `radial-gradient(circle,${C.ivory},${C.jade}88 18%,transparent 66%)`, filter: 'blur(5px)', opacity: flash}} />
      <div style={{position: 'absolute', left: 960 + arc * 330, top: 540 - arc * 220, width: 240, height: 340, borderRadius: 22, overflow: 'hidden', transform: `translate(-50%,-50%) scale(${scale}) rotate(${spin}deg)`, transformOrigin: 'center'}}>
        <PlayingCard rank="大王" suit="♥" />
        {f >= 78 && f <= 104 ? <div style={{position: 'absolute', top: -60, bottom: -60, left: `${sheen}%`, width: '36%', background: 'linear-gradient(100deg,transparent,rgba(255,255,255,.85),transparent)', transform: 'rotate(14deg)', mixBlendMode: 'screen'}} /> : null}
      </div>
      <div style={{position: 'absolute', bottom: 56, width: '100%', textAlign: 'center', color: C.gold, fontFamily: FONT_MONO, fontSize: 28, letterSpacing: '.18em', opacity: easeOut(f, [82, 102], [0, 1])}}>这一手，你凭什么相信？</div>
    </AbsoluteFill>
  );
};

const TrustGap: React.FC = () => {
  const f = useCurrentFrame();
  const items = [
    {label: '答案', value: '出 7', color: C.jade},
    {label: '概率', value: '61%', color: C.gold},
    {label: '理由', value: '—', color: C.cinnabar},
  ];
  return (
    <FilmBackground glow={C.cinnabar}>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30}}>
        {items.map((item, i) => {
          const k = easeOut(f, [10+i*8, 30+i*8], [0, 1]);
          return <Panel key={item.label} style={{width: 340, height: 300, padding: 34, boxSizing: 'border-box', opacity: k, transform: `translateY(${(1-k)*42}px)`}}>
            <Kicker color={item.color}>{item.label}</Kicker>
            <div style={{fontSize: 82, fontWeight: 800, marginTop: 72, color: item.color}}>{item.value}</div>
          </Panel>;
        })}
      </div>
    </FilmBackground>
  );
};

const LeadClaim: React.FC = () => {
  const f = useCurrentFrame();
  const leadScale = f < 42 ? interpolate(f, [0, 22, 42], [2.4, 2.52, 1], {...clamp, easing: Easing.bezier(.5,0,.05,1)}) : 1;
  const rest = easeOut(f, [30, 62], [0, 1]);
  return <FilmBackground>
    <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center'}}>
      <div style={{fontFamily: FONT_SERIF, fontSize: 112, letterSpacing: '.04em', transform: `scale(${leadScale})`, transformOrigin: '50% 68%', whiteSpace: 'nowrap'}}>
        <span style={{color: C.cinnabar}}>信任</span><span style={{opacity: rest}}>，必须看得见理由。</span>
      </div>
    </div>
  </FilmBackground>;
};

const BrandScene: React.FC = () => {
  const f = useCurrentFrame();
  const stamp = spring({frame: f-12, fps: 30, config: {damping: 17, stiffness: 110}});
  const line = easeOut(f, [36, 66], [0, 1]);
  return <FilmBackground>
    <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center'}}>
      <div style={{textAlign: 'center', transform: `scale(${.9+.1*stamp})`, opacity: stamp}}>
        <Kicker>EXPLAINABLE DOU DIZHU AGENT</Kicker>
        <div style={{fontFamily: FONT_SERIF, fontSize: 220, letterSpacing: '.16em', marginLeft: '.16em', color: C.ivory, textShadow: `0 0 70px ${C.jade}22`}}>幻局</div>
        <div style={{width: 540, height: 3, margin: '24px auto 30px', background: `linear-gradient(90deg,transparent,${C.gold},transparent)`, transform: `scaleX(${line})`}} />
        <div style={{fontSize: 35, color: C.jade}}>可解释 · 会成长 · 最终由你决策</div>
      </div>
    </div>
  </FilmBackground>;
};

const LobbyScene: React.FC = () => {
  const f = useCurrentFrame();
  const labels = ['读懂牌势', '推演选择', '解释给你'];
  return <AbsoluteFill style={{background: C.ink}}>
    <Screenshot src="textures/live/lobby-full.png" frame={f} duration={300} zoomFrom={1.08} zoomTo={1.01} dim={.08} />
    <div style={{position: 'absolute', left: 90, bottom: 160, display: 'flex', gap: 16}}>
      {labels.map((label,i)=>{const k=easeOut(f,[90+i*16,112+i*16],[0,1]); return <div key={label} style={{padding: '14px 22px', borderRadius: 999, background: 'rgba(8,17,13,.88)', border: `1px solid ${C.gold}66`, color: i===2?C.gold:C.jade, fontSize: 24, opacity:k, transform:`translateY(${(1-k)*18}px)`}}>{String(i+1).padStart(2,'0')} · {label}</div>;})}
    </div>
  </AbsoluteFill>;
};

const TableDrop: React.FC = () => {
  const f = useCurrentFrame();
  const pan = interpolate(f,[0,78],[650,-620],{...clamp,easing:Easing.inOut(Easing.cubic)});
  const drop = easeOut(f,[78,112],[0,1]);
  const rot = 62*(1-drop);
  const scale = 1+drop;
  const x = f<78?pan:interpolate(drop,[0,1],[pan,0]);
  const shots=['textures/live/lobby-full.png','textures/live/watch-thinking-a.png','textures/live/play-ready.png'];
  return <AbsoluteFill style={{background:C.feltDeep, perspective:1600, overflow:'hidden'}}>
    <div style={{position:'absolute',left:'50%',top:'50%',width:0,height:0,transformStyle:'preserve-3d',transform:`translateX(${x}px) rotateX(${rot}deg) scale(${scale})`}}>
      <div style={{position:'absolute',left:-3000,top:-1000,width:6000,height:2000,backgroundColor:'#102b21',backgroundImage:`repeating-linear-gradient(90deg,${C.line} 0 1px,transparent 1px 180px),repeating-linear-gradient(0deg,${C.line} 0 1px,transparent 1px 180px)`}} />
      {shots.map((src,i)=><div key={src} style={{position:'absolute',left:(i-1)*1135-498,top:-280,width:996,height:560,borderRadius:18,overflow:'hidden',boxShadow:'0 30px 80px rgba(0,0,0,.5)',backfaceVisibility:'hidden',transform:'translateZ(4px)'}}><Screenshot src={src} frame={f} duration={180} /></div>)}
    </div>
    <div style={{position:'absolute',top:70,width:'100%',textAlign:'center'}}><Kicker>先看懂牌局</Kicker></div>
  </AbsoluteFill>;
};

const DealScene: React.FC = () => {
  const f=useCurrentFrame();
  const cards=['3','4','5','6','7','8','9','10','J','Q','K','A','2','小王','大王'];
  return <AbsoluteFill>
    <Screenshot src="textures/live/watch-dealing.png" frame={f} duration={240} zoomFrom={1.03} zoomTo={1} dim={.04}/>
    <div style={{position:'absolute',left:250,right:250,bottom:170,height:240}}>
      {cards.map((rank,i)=>{const cue=18+i*6; const k=easeOut(f,[cue,cue+15],[0,1]); return <div key={rank} style={{position:'absolute',left:`${i*6.1}%`,bottom:0,transform:`translateY(${(1-k)*250}px) rotate(${(i-7)*1.4}deg) scale(.48)`,transformOrigin:'bottom center',opacity:k}}><PlayingCard rank={rank} suit={i%3===0?'♥':'♠'}/></div>;})}
    </div>
    <Panel style={{position:'absolute',left:96,top:92,width:310,padding:'20px 24px',textAlign:'center',borderColor:C.gold,background:'rgba(3,10,7,.9)'}}><Kicker>DECK INVARIANT</Kicker><div style={{fontFamily:FONT_MONO,fontSize:46,color:C.gold,marginTop:10}}>54 / 54</div><div style={{fontSize:20,color:C.muted,marginTop:4}}>牌张守恒 · 已校验</div></Panel>
  </AbsoluteFill>;
};

const RuleScene: React.FC = () => {
  const f=useCurrentFrame();
  const focus=easeOut(f,[35,75],[0,1]);
  return <AbsoluteFill>
    <Screenshot src="textures/live/play-ready.png" frame={f} duration={240} zoomFrom={1.02} zoomTo={1.08} dim={.16}/>
    <div style={{position:'absolute',left:425,top:605,width:760,height:250,border:`3px solid ${C.gold}`,borderRadius:22,boxShadow:`0 0 0 2000px rgba(2,7,5,${.5*focus}),0 0 50px ${C.gold}44`,opacity:focus}} />
    <div style={{position:'absolute',left:480,top:520,fontSize:42,color:C.gold,opacity:focus}}>选择手牌 → 识别牌型 → 生成并校验合法动作</div>
  </AbsoluteFill>;
};

const ErrorBoundaryScene: React.FC = () => {
  const f=useCurrentFrame();
  const left=easeOut(f,[10,32],[0,1]); const right=easeOut(f,[28,50],[0,1]);
  return <FilmBackground glow={C.cinnabar}>
    <div style={{position:'absolute',inset:'130px 120px 190px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:28}}>
      {[{k:left,t:'牌型不合法',d:'组合本身不符合规则',n:'01'},{k:right,t:'合法但压不过',d:'牌型成立，但无法战胜桌面',n:'02'}].map(x=><Panel key={x.t} style={{padding:44,opacity:x.k,transform:`translateY(${(1-x.k)*36}px)`,borderColor:`${C.cinnabar}88`}}><Kicker color={C.cinnabar}>{x.n} · RULE BOUNDARY</Kicker><div style={{fontFamily:FONT_SERIF,fontSize:72,marginTop:120}}>{x.t}</div><div style={{fontSize:30,color:C.muted,marginTop:24}}>{x.d}</div></Panel>)}
    </div>
    <Panel style={{position:'absolute',left:610,right:610,bottom:170,padding:'18px 24px',textAlign:'center',borderColor:C.gold}}><Kicker>异常检测 → 回退基础策略</Kicker></Panel>
  </FilmBackground>;
};

const ChapterScene: React.FC<{title:string;sub?:string}> = ({title,sub}) => <FilmBackground><div style={{position:'absolute',inset:0,display:'grid',placeItems:'center'}}><BigTitle title={title} subtitle={sub}/></div></FilmBackground>;

const CursorScene: React.FC = () => {
  const f=useCurrentFrame();
  const t=f<58?easeOut(f,[0,58],[0,1]):1;
  const x=180*(1-t)+1040*t+Math.sin(t*Math.PI)*260;
  const y=980*(1-t)+740*t-Math.sin(t*Math.PI)*170;
  const click=easeOut(f,[68,76],[0,1]);
  const cursorIn=easeOut(f,[8,18],[0,1]);
  const zoom=f<98?interpolate(f,[68,90],[1,1.3],{...clamp,easing:Easing.out(Easing.cubic)}):interpolate(f,[98,132],[1.3,1],{...clamp,easing:Easing.inOut(Easing.cubic)});
  return <AbsoluteFill style={{background:C.ink,overflow:'hidden'}}>
    <div style={{position:'absolute',inset:0,transform:`scale(${zoom})`,transformOrigin:'1040px 740px'}}><Screenshot src="textures/live/play-ready.png" frame={f} duration={150} zoomFrom={1} zoomTo={1} dim={.08}/><div style={{position:'absolute',left:895,top:687,width:245,height:92,border:`2px solid ${C.jade}`,borderRadius:18,boxShadow:`0 0 ${55*click}px ${C.jade}55`}}/><svg style={{position:'absolute',left:x,top:y,opacity:cursorIn,filter:'drop-shadow(0 8px 12px rgba(0,0,0,.5))'}} width="62" height="62" viewBox="0 0 28 28"><path d="M2 1 L2 23 L8 17.5 L11.5 25 L15.5 23.2 L12 15.8 L20 15 Z" fill="#fff" stroke="#111" strokeWidth="1.6"/></svg></div>
  </AbsoluteFill>;
};

const FreezeScene: React.FC = () => {
  const f=useCurrentFrame();
  const draw=easeOut(f,[48,70],[0,1]);
  const wipe=easeOut(f,[132,205],[0,1]);
  return <AbsoluteFill style={{background:C.ink,overflow:'hidden'}}>
    <Screenshot src="textures/live/watch-thinking-b.png" frame={Math.min(f,48)} duration={240} zoomFrom={1.02} zoomTo={1.02} dim={.12}/>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0,opacity:1-wipe}}><ellipse cx="1740" cy="470" rx="160" ry="250" fill="none" stroke={C.gold} strokeWidth="8" strokeDasharray="1400" strokeDashoffset={1400*(1-draw)} transform="rotate(-4 1740 470)"/><path d="M1450 210 Q1550 220 1600 300" fill="none" stroke={C.gold} strokeWidth="7" strokeDasharray="360" strokeDashoffset={360*(1-draw)}/></svg>
    <div style={{position:'absolute',inset:0,background:`linear-gradient(135deg,transparent 0%,transparent ${48+wipe*60}%,${C.feltDeep} ${49+wipe*60}%,${C.ink} 100%)`}} />
    <div style={{position:'absolute',top:80,left:90}}><Kicker>状态快照 · 已冻结</Kicker></div>
  </AbsoluteFill>;
};

const CognitiveLoop: React.FC = () => {
  const f=useCurrentFrame();
  const nodes=[{x:480,y:560,t:'读牌势',s:22},{x:960,y:300,t:'算走法',s:48},{x:1440,y:560,t:'过安全门',s:74}];
  const path=easeOut(f,[82,150],[0,1]);
  return <FilmBackground>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}><path d="M480 560 Q960 70 1440 560 Q960 930 480 560" fill="none" stroke={C.gold} strokeWidth="5" strokeDasharray="2500" strokeDashoffset={2500*(1-path)} opacity=".72"/></svg>
    {nodes.map((n,i)=>{const k=spring({frame:f-n.s,fps:30,config:{damping:13,stiffness:140}});return <div key={n.t} style={{position:'absolute',left:n.x-130,top:n.y-130,width:260,height:260,borderRadius:'50%',background:'rgba(142,217,189,.12)',backdropFilter:'blur(16px)',border:`2px solid ${i===2?C.gold:C.jade}`,boxShadow:`0 26px 80px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.25)`,display:'grid',placeItems:'center',fontFamily:FONT_SERIF,fontSize:46,color:i===2?C.gold:C.ivory,transform:`translateY(${(1-k)*86}px) scale(${.82+.18*k})`,opacity:Math.min(1,k)}}>{n.t}</div>})}
    <div style={{position:'absolute',top:80,left:90}}><Kicker>PHANTOM COGNITIVE LOOP</Kicker></div>
  </FilmBackground>;
};

const ParticleBelief: React.FC = () => {
  const f=useCurrentFrame();
  const t=easeOut(f,[20,170],[0,1]);
  const clusters=[[540,500],[960,390],[1380,520]];
  return <FilmBackground>
    <div style={{position:'absolute',top:76,left:90}}><Kicker>512 PARTICLES · HIDDEN-HAND BELIEF</Kicker></div>
    {Array.from({length:512},(_,i)=>{const a=(i*137.508)*Math.PI/180; const r=120+((i*73)%520); const sx=960+Math.cos(a)*r; const sy=540+Math.sin(a)*r*.62; const c=clusters[i%3]; const er=30+((i*47)%210); const ex=c[0]+Math.cos(a*1.7)*er; const ey=c[1]+Math.sin(a*1.3)*er*.58; return <i key={i} style={{position:'absolute',left:sx*(1-t)+ex*t,top:sy*(1-t)+ey*t,width:3+(i%3),height:3+(i%3),borderRadius:'50%',background:i%7===0?C.gold:C.jade,opacity:.18+(i%5)*.12,boxShadow:i%11===0?`0 0 12px ${C.jade}`:undefined}}/>})}
    {['上家分布','地主分布','下家分布'].map((x,i)=><div key={x} style={{position:'absolute',left:clusters[i][0]-90,top:clusters[i][1]+185,width:180,textAlign:'center',fontSize:28,color:i===1?C.gold:C.jade,opacity:t}}>{x}<small style={{display:'block',fontFamily:FONT_MONO,fontSize:18,color:C.muted,marginTop:8}}>仍保留不确定性</small></div>)}
  </FilmBackground>;
};

const CandidateScene: React.FC = () => {
  const f=useCurrentFrame();
  const rows=[['单张 J','基础第 1','安全门通过'],['对子 K','认知选择','价值损失 1.6261%'],['八连顺 5—Q','候选第 3','2.1184% · 被否决']];
  return <FilmBackground>
    <Panel style={{position:'absolute',left:280,right:280,top:100,bottom:170,padding:'38px 44px'}}>
      <Kicker>TOP-3 COUNTERFACTUAL CANDIDATES</Kicker>
      <div style={{fontFamily:FONT_SERIF,fontSize:54,marginTop:24}}>候选方案已通过规则门</div>
      <div style={{marginTop:34,display:'grid',gap:17}}>{rows.map((r,i)=>{const k=easeOut(f,[40+i*24,62+i*24],[0,1]);return <div key={r[0]} style={{height:116,borderRadius:18,border:`1px solid ${i===0?C.gold:C.line}`,background:i===0?'rgba(211,173,103,.09)':'rgba(255,255,255,.025)',display:'grid',gridTemplateColumns:'90px 1fr 220px 240px',alignItems:'center',padding:'0 28px',boxSizing:'border-box',opacity:k,transform:`translateY(${(1-k)*22}px)`,filter:`blur(${(1-k)*5}px)`}}><b style={{fontFamily:FONT_MONO,color:C.gold,fontSize:30}}>0{i+1}</b><strong style={{fontSize:34}}>{r[0]}</strong><span style={{fontSize:25,color:i===0?C.jade:C.muted}}>{r[1]}</span><em style={{fontFamily:FONT_MONO,fontSize:22,color:C.muted,fontStyle:'normal'}}>{r[2]}</em></div>})}</div>
      <div style={{marginTop:28,color:C.muted,fontSize:24}}>稳定回放 turn 7 · Top-3 来自真实候选 · 每项结果均可追溯</div>
    </Panel>
  </FilmBackground>;
};

const SafetyGate: React.FC = () => {
  const f=useCurrentFrame();
  const p=easeOut(f,[20,160],[0,1]); const lock=spring({frame:f-160,fps:30,config:{damping:16,stiffness:180}});
  const paths=[{y:350,c:C.jade,t:'基础最优 · 单张 J'},{y:540,c:C.cinnabar,t:'越界候选 · 八连顺 5—Q'},{y:730,c:C.gold,t:'认知选择 · 对子 K'}];
  return <FilmBackground glow={C.cinnabar}>
    <div style={{position:'absolute',top:70,left:90}}><Kicker color={C.cinnabar}>SAFETY GATE · MAX BASE VALUE LOSS 2%</Kicker></div>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>{paths.map((x,i)=><path key={x.t} d={`M 180 ${x.y} C 600 ${x.y-100+i*80}, 980 ${x.y+80-i*50}, 1460 ${x.y}`} fill="none" stroke={x.c} strokeWidth="8" strokeDasharray="1600" strokeDashoffset={1600*(1-p)} opacity={i===1?.45:.9}/>)}</svg>
    {paths.map((x,i)=><div key={x.t} style={{position:'absolute',left:155,top:x.y-52,fontSize:28,color:x.c}}>{x.t}</div>)}
    <div style={{position:'absolute',left:1450,top:235,width:260,height:620,border:`4px solid ${C.gold}`,borderRadius:36,background:'rgba(8,15,11,.9)',display:'grid',placeItems:'center',transform:`scale(${.88+.12*lock})`,boxShadow:`0 0 80px ${C.gold}22`}}><div style={{textAlign:'center'}}><div style={{fontSize:80,color:C.gold}}>≤2%</div><div style={{fontSize:30,marginTop:12}}>基础价值损失上限</div><div style={{fontFamily:FONT_MONO,color:C.cinnabar,fontSize:20,marginTop:56}}>RISK PATH VETOED</div></div></div>
  </FilmBackground>;
};

const OverrideScene: React.FC = () => {
  const f=useCurrentFrame(); const hit=spring({frame:f-78,fps:30,config:{damping:15,stiffness:170}});
  return <FilmBackground glow={C.cinnabar}>
    <div style={{position:'absolute',top:70,left:90}}><Kicker>STABLE REPLAY · COGNITIVE OVERRIDE</Kicker></div>
    <div style={{position:'absolute',inset:'210px 180px 210px',display:'grid',gridTemplateColumns:'1fr 120px 1fr',alignItems:'center',gap:28}}>
      <Panel style={{padding:40,textAlign:'center',opacity:.62}}><div style={{fontSize:24,color:C.muted}}>基础策略</div><div style={{fontSize:72,marginTop:28}}>单张 J</div></Panel>
      <div style={{fontSize:70,color:C.cinnabar,textAlign:'center',transform:`scale(${hit})`}}>→</div>
      <Panel style={{padding:40,textAlign:'center',borderColor:C.gold,boxShadow:`0 0 ${70*hit}px ${C.gold}33`}}><div style={{fontSize:24,color:C.gold}}>认知建议 · 已通过</div><div style={{fontSize:72,marginTop:28}}>对子 K</div><div style={{fontFamily:FONT_MONO,fontSize:20,color:C.jade,marginTop:18}}>BASE LOSS 1.6261% ≤ 2%</div></Panel>
    </div>
    <div style={{position:'absolute',right:100,top:74,fontFamily:FONT_MONO,fontSize:22,color:C.muted}}>seed=20260911 · turn 7 · 27 决策节点 · 1 次覆盖</div>
  </FilmBackground>;
};

const Odometer: React.FC = () => {
  const f=useCurrentFrame();
  const text='99.8352%';
  const reveal=easeOut(f,[18,88],[0,1]);
  return <FilmBackground>
    <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center'}}><div style={{textAlign:'center',transform:`scale(${.94+.06*reveal})`}}><Kicker>STABLE REPLAY SAMPLE</Kicker><div style={{fontFamily:FONT_MONO,fontSize:190,fontWeight:850,color:C.gold,letterSpacing:'-.05em',marginTop:38,fontVariantNumeric:'tabular-nums'}}>{text.split('').map((ch,i)=><span key={i} style={{display:'inline-block',transform:`translateY(${(1-easeOut(f,[20+i*7,42+i*7],[0,1]))*120}px)`,opacity:easeOut(f,[20+i*7,36+i*7],[0,1])}}>{ch}</span>)}</div><div style={{fontSize:32,color:C.ivory,marginTop:34}}>稳定录像样本平均基础价值保留率</div><div style={{fontFamily:FONT_MONO,fontSize:20,color:C.muted,marginTop:16}}>seed=20260911 · sample scope only · 不是通用胜率</div></div></div>
  </FilmBackground>;
};

const GrowthTimeline: React.FC = () => {
  const f=useCurrentFrame(); const names=['观察','塑形','验证','利用'];
  const travel=easeOut(f,[22,220],[0,1]);
  return <FilmBackground>
    <div style={{position:'absolute',top:70,left:90}}><Kicker>CROSS-GAME LEARNING</Kicker></div>
    <div style={{position:'absolute',left:160,right:160,top:520,height:6,background:`linear-gradient(90deg,${C.jade},${C.gold})`,transform:`scaleX(${travel})`,transformOrigin:'left'}}/>
    {names.map((n,i)=>{const cue=34+i*48;const k=spring({frame:f-cue,fps:30,config:{damping:13,stiffness:150}});return <div key={n} style={{position:'absolute',left:230+i*430,top:330,width:250,height:260,transform:`translateY(${(1-k)*100}px) scale(${.8+.2*k})`,opacity:Math.min(1,k)}}><Panel style={{height:'100%',padding:28,textAlign:'center',borderColor:i===3?C.gold:C.line}}><div style={{fontFamily:FONT_MONO,color:i===3?C.gold:C.jade,fontSize:22}}>PHASE 0{i+1}</div><div style={{fontFamily:FONT_SERIF,fontSize:60,marginTop:56}}>{n}</div><div style={{fontSize:21,color:C.muted,marginTop:22}}>{['OBSERVE','SHAPE','VERIFY','EXPLOIT'][i]}</div></Panel></div>})}
  </FilmBackground>;
};

const AdaptScene: React.FC = () => {
  const f=useCurrentFrame(); const k=easeOut(f,[40,105],[0,1]);
  return <AbsoluteFill>
    <Screenshot src="textures/live/play-ready.png" frame={f} duration={300} zoomFrom={1.02} zoomTo={1.08} dim={.2}/>
    <Panel style={{position:'absolute',left:200,top:175,width:650,padding:38,opacity:k,transform:`translateX(${(1-k)*-70}px)`,borderColor:C.gold}}><Kicker>对手画像 · 证据持续累积</Kicker><div style={{fontFamily:FONT_MONO,fontSize:48,marginTop:28,color:C.gold}}>3 条动作 · 置信度 0.614</div><div style={{fontSize:25,color:C.muted,lineHeight:1.7,marginTop:25}}>行为证据被转成可追溯特征；画像只参与解释与候选评分，不能绕过安全门。</div></Panel>
  </AbsoluteFill>;
};

const TechGrid: React.FC = () => {
  const f=useCurrentFrame(); const cells=[['真实 DouZero','基础策略'],['54 张守恒','规则安全'],['512 粒子','信念估计'],['Top-3 推演','候选比较']];
  return <AbsoluteFill style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',background:C.ink}}>{cells.map((c,i)=>{const cue=[4,13,9,18][i]; const k=easeOut(f,[cue,cue+18],[0,1]); return <div key={c[0]} style={{position:'relative',display:'grid',placeItems:'center',background:i%3===0?C.feltDeep:'#0d1813',border:`1px solid ${C.line}`,overflow:'hidden'}}><div style={{position:'relative',zIndex:1,textAlign:'center',transform:`scale(${.75+.25*k})`,opacity:k}}><div style={{fontFamily:FONT_MONO,fontSize:24,color:i===3?C.gold:C.jade}}>0{i+1} · {c[1]}</div><div style={{fontFamily:FONT_SERIF,fontSize:76,marginTop:18,color:C.ivory}}>{c[0]}</div></div><div style={{position:'absolute',zIndex:0,inset:0,background:`radial-gradient(circle at ${25+i*18}% ${30+i*13}%,${i===3?C.gold:C.jade}22,transparent 55%)`}}/></div>})}</AbsoluteFill>;
};

const AuditScene: React.FC = () => {
  const f=useCurrentFrame(); const items=[['回放时间线','每次选择可重现'],['概率来源','每项认知有依据'],['合法性校验','每个动作先过规则'],['失败回退','认知异常回到基础策略']];
  return <FilmBackground>{items.map((x,i)=>{const k=easeOut(f,[18+i*28,40+i*28],[0,1]);return <div key={x[0]} style={{position:'absolute',left:260,top:180+i*170,width:1400,height:125,display:'grid',gridTemplateColumns:'90px 360px 1fr',alignItems:'center',padding:'0 34px',boxSizing:'border-box',borderBottom:`1px solid ${C.line}`,opacity:k,transform:`translateX(${(1-k)*50}px)`}}><div style={{fontFamily:FONT_MONO,fontSize:28,color:C.gold}}>0{i+1}</div><div style={{fontFamily:FONT_SERIF,fontSize:46}}>{x[0]}</div><div style={{fontSize:27,color:C.muted}}>{x[1]}</div></div>})}</FilmBackground>;
};

const HumanDecision: React.FC = () => {
  const f=useCurrentFrame(); const k=easeOut(f,[4,45],[0,1]);
  return <AbsoluteFill><Screenshot src="textures/live/play-ready.png" frame={f} duration={180} zoomFrom={1} zoomTo={1.015} dim={.3}/><Panel style={{position:'absolute',left:170,top:270,width:690,padding:'46px 50px',boxSizing:'border-box',opacity:k,borderColor:C.gold,background:'rgba(3,10,7,.9)'}}><Kicker>HUMAN IN CONTROL</Kicker><div style={{fontFamily:FONT_SERIF,fontSize:68,color:C.ivory,lineHeight:1.22,marginTop:22}}>AI 停在建议<br/><span style={{color:C.gold}}>确认留给你</span></div><div style={{fontSize:27,color:C.muted,lineHeight:1.65,marginTop:24}}>给出候选、理由与风险边界；真正落子前，仍由玩家确认。</div></Panel><div style={{position:'absolute',left:1098,top:782,width:76,height:54,border:`4px solid ${C.gold}`,borderRadius:16,boxShadow:`0 0 70px ${C.gold}66`,opacity:k}}/></AbsoluteFill>;
};

const Outro: React.FC = () => {
  const f=useCurrentFrame(); const imgs=['lobby-full.png','watch-thinking-a.png','play-ready.png','watch-dealing.png'];
  const word=easeOut(f,[68,92],[0,1]);
  const dust=Array.from({length:20},(_,i)=>({x:(i*439+137)%1920,y:(i*613+271)%1080}));
  return <FilmBackground glow={C.gold}>
    {imgs.map((src,i)=>{const cue=4+i*8;const k=spring({frame:f-cue,fps:30,config:{damping:14,stiffness:150}});const pos=[[220,170],[1320,150],[210,680],[1320,700]][i];return <div key={src} style={{position:'absolute',left:pos[0],top:pos[1],width:390,height:220,borderRadius:18,overflow:'hidden',border:`1px solid ${C.gold}55`,boxShadow:'0 28px 70px rgba(0,0,0,.46)',transform:`translate(${(1-k)*(i<2?-500:500)}px,${(1-k)*(i%2?-250:250)}px) rotate(${(1-k)*(i%2?7:-7)}deg)`,opacity:Math.min(1,k)*.72}}><Screenshot src={`textures/live/${src}`} frame={f} duration={180}/></div>})}
    {dust.map((d,i)=><i key={i} style={{position:'absolute',left:d.x+Math.sin(f*.02+i)*12,top:((d.y-f*(.3+(i%5)*.11))%1080+1080)%1080,width:2+(i%3),height:2+(i%3),borderRadius:'50%',background:C.gold,opacity:.18+(i%4)*.07}}/>)}
    <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center'}}><div style={{textAlign:'center',opacity:word,transform:`translateY(${(1-word)*36}px) scale(${.9+.1*word})`}}><div style={{fontFamily:FONT_SERIF,fontSize:182,letterSpacing:'.18em',marginLeft:'.18em'}}>幻局</div><div style={{width:620,height:4,margin:'26px auto',background:`linear-gradient(90deg,transparent,${C.gold},transparent)`,transform:`scaleX(${word})`}}/><div style={{fontFamily:FONT_SERIF,fontSize:62,color:C.gold}}>每一手，都有据可查。</div><div style={{fontFamily:FONT_MONO,fontSize:23,letterSpacing:'.12em',color:C.jade,marginTop:24}}>可解释斗地主辅助智能体</div></div></div>
  </FilmBackground>;
};

export const SceneRenderer: React.FC<{shot: Shot}> = ({shot}) => {
  const frame=useCurrentFrame();
  const opacity=shot.id==='s01' ? interpolate(frame,[0,5],[0,1],clamp) : shot.id==='s25' ? interpolate(frame,[175,180],[1,0],clamp) : 1;
  let scene: React.ReactNode;
  switch(shot.id){
    case 's01': scene=<HeroCard/>; break;
    case 's02': scene=<TrustGap/>; break;
    case 's03': scene=<LeadClaim/>; break;
    case 's04': scene=<BrandScene/>; break;
    case 's05': scene=<LobbyScene/>; break;
    case 's06': scene=<TableDrop/>; break;
    case 's07': scene=<DealScene/>; break;
    case 's08': scene=<RuleScene/>; break;
    case 's09': scene=<ErrorBoundaryScene/>; break;
    case 's10': scene=<ChapterScene title="然后，让它解释自己" sub="SEE THE REASONING"/>; break;
    case 's11': scene=<CursorScene/>; break;
    case 's12': scene=<FreezeScene/>; break;
    case 's13': scene=<CognitiveLoop/>; break;
    case 's14': scene=<ParticleBelief/>; break;
    case 's15': scene=<CandidateScene/>; break;
    case 's16': scene=<SafetyGate/>; break;
    case 's17': scene=<OverrideScene/>; break;
    case 's18': scene=<Odometer/>; break;
    case 's19': scene=<GrowthTimeline/>; break;
    case 's20': scene=<AdaptScene/>; break;
    case 's21': scene=<ChapterScene title="越打越懂" sub="但从不替你决定"/>; break;
    case 's22': scene=<TechGrid/>; break;
    case 's23': scene=<AuditScene/>; break;
    case 's24': scene=<HumanDecision/>; break;
    case 's25': scene=<Outro/>; break;
    default: throw new Error(`No scene for ${shot.id}`);
  }
  return <AbsoluteFill style={{opacity}}>{scene}</AbsoluteFill>;
};
