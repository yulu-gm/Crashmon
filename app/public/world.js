import { drawMonster } from './battle-renderer.js';
import { W, H, npc } from './hub-map.js';
import { loadSceneImages,drawSceneGround,drawSceneShadows,sceneRenderables,drawSceneLabels } from './scene-renderer.js';
import { createMinimap } from './minimap.js';
import { createMotion, advanceMotion } from './character-motion.js';
import { loadCharacterImages, drawCharacter } from './character-renderer.js';
import {speciesCharacters} from './character-assets.js';
loadCharacterImages();
loadSceneImages();
const sprites = new Image(); sprites.src = '/assets/expedition-sprites.png';
function sprite(ctx, index, x, y, width, height) {
  if (!sprites.complete || !sprites.naturalWidth) return false;
  const sw=sprites.naturalWidth/3, sh=sprites.naturalHeight/2;
  const inset=sw*.045;
  ctx.drawImage(sprites,(index%3)*sw+inset,Math.floor(index/3)*sh,sw-inset*2,sh,x-width/2,y-height,width,height);
  return true;
}

export function drawPet(ctx, x, y, id, size = 1,time=0,reducedMotion=true) {
  if(!drawCharacter(ctx,speciesCharacters[id],x,y+10*size,{direction:'south',moving:false,time},{height:58*size,reducedMotion}))drawMonster(ctx,x,y+10*size,id,size*.6);
}

export function createWorld({ onInteract, onMove }) {
  const canvas = document.querySelector('#world-canvas');
  const ctx = canvas.getContext('2d');
  const paintMinimap=createMinimap(document.querySelector('#world-minimap'));
  const interact = document.querySelector('#interact');
  const root = document.querySelector('#world');
  const keys = new Set();
  let playerMotion=createMotion('south'), petMotion=createMotion('east');
  let petPosition={x:438,y:476};
  let connected = false, selfId = null, authoritative = null;
  let peers = new Map();
  let active = false, frame = 0, last = 0, player, catalog = [], near = false, destination = null;
  let position = { x: 480, y: 452 }, scale = 1, offset = { x: 0, y: 0 }, viewport = { w: 960, h: 640 };
  const blocked = () => Boolean(document.querySelector('dialog[open]')) || document.hidden;
  function updateNear() {
    const next = connected && Math.hypot(position.x-npc.x, position.y-npc.y) < 88;
    if (next !== near) { near = next; interact.hidden = !near; document.querySelector('#nearby-status').textContent = near ? '已靠近引导员，按 E 或点击交谈。' : ''; }
  }
  function interactWithNpc() { if(active && near && !blocked()) { keys.clear(); destination = null; onInteract(); } }
  interact.onclick = interactWithNpc;
  const input = { w:[0,-1], arrowup:[0,-1], s:[0,1], arrowdown:[0,1], a:[-1,0], arrowleft:[-1,0], d:[1,0], arrowright:[1,0] };
  window.addEventListener('keydown', event => {
    if(!active || !connected || blocked() || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)) return;
    const key=event.key.toLowerCase();
    if(key==='e') { event.preventDefault(); interactWithNpc(); return; }
    if(input[key]) { event.preventDefault(); keys.add(key); destination=null; onMove({type:'direction',x:input[key][0],y:input[key][1]}); }
  });
  window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  const clear = () => { keys.clear(); destination=null; onMove({type:'stop'}); };
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  canvas.addEventListener('pointerdown',event=> {
    if(!active || !connected || blocked()) return;
    canvas.focus();
    const rect=canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left-offset.x)/scale,y=(event.clientY-rect.top-offset.y)/scale;
    if(Math.hypot(x-npc.x,y-npc.y)<35 && near) return interactWithNpc();
    destination={x:Math.max(36,Math.min(924,x)),y:Math.max(66,Math.min(598,y))};keys.clear();
  });
  function resize() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1,2);
    viewport={w:rect.width,h:rect.height};canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
    scale=rect.width<650?Math.max(rect.width/600,rect.height/H):Math.max(rect.width/W,rect.height/H);
    updateCamera();
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function updateCamera() {
    offset.x=viewport.w<W*scale?Math.max(viewport.w-W*scale,Math.min(0,viewport.w/2-position.x*scale)):(viewport.w-W*scale)/2;
    offset.y=viewport.h<H*scale?Math.max(viewport.h-H*scale,Math.min(0,viewport.h/2-position.y*scale)):(viewport.h-H*scale)/2;
  }
  new ResizeObserver(resize).observe(canvas);
  function ellipse(x,y,rx,ry,color) { ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill(); }
  function round(x,y,w,h,r,color) { ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill(); }
  function label(text,x,y,color='#365f50',size=12) { ctx.font=`600 ${size}px system-ui`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,x,y); }
  function person(x,y,npcPerson=false,color='#578cb1',motion=playerMotion) {
    ellipse(x,y+2,15,5,'#353d4350');
    if(!npcPerson && drawCharacter(ctx,'astronaut',x,y,motion,{reducedMotion:player?.reducedMotion})) return;
    if(sprite(ctx,npcPerson?4:3,x,y+5,65,65)) return;
    ellipse(x,y+6,13,5,'#28433538');round(x-8,y-9,6,16,2,'#374f54');round(x+2,y-9,6,16,2,'#374f54');
    round(x-12,y-28,24,24,7,npcPerson?'#e9d5a1':color);
    round(x-17,y-23,6,16,3,'#e8bfa1');round(x+11,y-23,6,16,3,'#e8bfa1');
    ellipse(x,y-38,12,13,'#f0caaa');round(x-12,y-50,24,10,5,npcPerson?'#ece0be':'#354c62');
    if(npcPerson)round(x-18,y-44,36,5,2,'#d5bf87');
    ctx.fillStyle='#384d49';ctx.fillRect(x-5,y-37,2,3);ctx.fillRect(x+3,y-37,2,3);
    if(!npcPerson){round(x-9,y-21,18,11,4,'#d8aa6b');round(x-5,y-19,10,5,2,'#c38d53');}
  }
  function paint(time) {
    updateCamera();
    ctx.clearRect(0,0,viewport.w,viewport.h);ctx.fillStyle='#526c7b';ctx.fillRect(0,0,viewport.w,viewport.h);
    ctx.save();ctx.translate(offset.x,offset.y);ctx.scale(scale,scale);
    drawSceneGround(ctx,time,{reducedMotion:player?.reducedMotion});
    drawSceneShadows(ctx);
    // 常驻伙伴展示保持原有定义与领取流程。
    const starters=catalog.filter(p=>p.id.startsWith('starter_'));for(let i=0;i<starters.length;i++)drawPet(ctx,410+i*70,210,starters[i].id,1.25,time,player?.reducedMotion);
    // 建筑、沿海物件、角色和伙伴使用同一地面排序点。
    const actors=sceneRenderables(ctx,time,{reducedMotion:player?.reducedMotion});
    actors.push({y:npc.y,draw:()=>person(npc.x,npc.y,true)},{y:position.y,draw:()=>person(position.x,position.y)});
    for(const peer of peers.values()) {
      actors.push({y:peer.renderY,draw:()=>{
        person(peer.renderX,peer.renderY,false,'#aa8098',peer.motion);
        const name=[...peer.nickname].length>12?[...peer.nickname].slice(0,12).join('')+'…':peer.nickname;
        ctx.font='600 10px system-ui';const width=ctx.measureText(name).width+14;
        round(peer.renderX-width/2,peer.renderY-79,width,18,6,'#fffbeded');
        label(name,peer.renderX,peer.renderY-66,'#674d64',10);
      }});
    }
    if(player?.pets?.length){const id=(player.pets.find(p=>p.id===player.team?.[0])??player.pets[0]).definitionId;actors.push({y:petPosition.y,draw:()=>{
      ellipse(petPosition.x,petPosition.y+2,13,4,'#353d4350');
      if(!drawCharacter(ctx,speciesCharacters[id],petPosition.x,petPosition.y,{...petMotion,time},{reducedMotion:player?.reducedMotion})) drawPet(ctx,petPosition.x,petPosition.y-12,id,1.3);
    }});}
    actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
    drawSceneLabels(ctx);
    label('引导员 · 莱娅',npc.x,npc.y+24,'#343d46',11);
    if(!player?.pets?.length){const bob=player?.reducedMotion?0:Math.sin(time/400)*3;round(npc.x+23,npc.y-73+bob,20,24,7,'#fff7d6');label('!',npc.x+33,npc.y-55+bob,'#b58a42',17);}
    if(near){ctx.strokeStyle='#fff4c1';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.ellipse(npc.x,npc.y+7,27,12,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    if(destination){ctx.strokeStyle='#fff9db';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(destination.x,destination.y,9,5,0,0,Math.PI*2);ctx.stroke();}
    label('你',position.x,position.y+23,'#343d46',10);
    ctx.restore();
    paintMinimap(position,playerMotion.direction,peers.values());
  }
  function tick(time) {
    if(!active)return;
    const dt=Math.min((time-last)/1000,.04);last=time;
    if(connected && !blocked()) {
      let dx=0,dy=0;for(const key of keys){dx+=input[key][0];dy+=input[key][1];}
      const length=Math.hypot(dx,dy);
      if(length) onMove({type:'direction',x:dx/length,y:dy/length});
      else if(destination){
        if(Math.hypot(destination.x-position.x,destination.y-position.y)<4)destination=null;
        onMove(destination?{type:'target',...destination}:{type:'stop'});
      }else onMove({type:'stop'});
    }else clear();
    const blend=1-Math.exp(-22*dt);
    const oldX=position.x,oldY=position.y;
    if(authoritative && connected){
      if(Math.hypot(authoritative.x-position.x,authoritative.y-position.y)>100){position={x:authoritative.x,y:authoritative.y};playerMotion.moving=false;}
      else {position.x+=(authoritative.x-position.x)*blend;position.y+=(authoritative.y-position.y)*blend;}
    }
    advanceMotion(playerMotion,position.x-oldX,position.y-oldY,dt);
    if(blocked()||!connected)playerMotion.moving=false;
    const oldPet={...petPosition};
    const target={x:position.x-42,y:position.y+24};
    if(Math.hypot(target.x-petPosition.x,target.y-petPosition.y)>120)petPosition=target;
    else {const follow=1-Math.exp(-7*dt);petPosition.x+=(target.x-petPosition.x)*follow;petPosition.y+=(target.y-petPosition.y)*follow;}
    advanceMotion(petMotion,petPosition.x-oldPet.x,petPosition.y-oldPet.y,dt,64);
    if(blocked()||!connected)petMotion.moving=false;
    for(const p of peers.values()){const px=p.renderX,py=p.renderY;
      if(Math.hypot(p.x-px,p.y-py)>100){p.renderX=p.x;p.renderY=p.y;}
      else {p.renderX+=(p.x-p.renderX)*blend;p.renderY+=(p.y-p.renderY)*blend;}
      advanceMotion(p.motion,p.renderX-px,p.renderY-py,dt);
    }
    updateNear();
    paint(time);frame=requestAnimationFrame(tick);
  }
  return {
    roomSnapshot(data) {
      const me=data.players.find(p=>p.id===data.selfId);
      if(!me)return;
      if(selfId!==data.selfId){position={x:me.x,y:me.y};petPosition={x:me.x-42,y:me.y+24};playerMotion=createMotion();petMotion=createMotion('east');clear();}
      selfId=data.selfId;authoritative=me;
      const next=new Map();
      for(const p of data.players)if(p.id!==data.selfId){const old=peers.get(p.id);next.set(p.id,{...p,renderX:old?.renderX??p.x,renderY:old?.renderY??p.y,motion:old?.motion??createMotion()});}
      peers=next;
      document.querySelector('#online-count').textContent=`据点在线 ${data.players.length} 人`;
      document.querySelector('#online-names').textContent=data.players.map(p=>p.nickname+(p.id===data.selfId?'（你）':'')).join('、');
    },
    connection(state) {
      connected=state==='online';
      document.querySelector('#connection-state').textContent=({online:'已连接共享据点',connecting:'正在进入共享据点…',offline:'连接中断，正在重连…',replaced:'账号已在其他页面进入据点'})[state];
      document.querySelector('#reconnect-room').hidden=state!=='replaced';
      if(!connected){clear();peers.clear();selfId=null;authoritative=null;document.querySelector('#online-count').textContent='据点未连接';document.querySelector('#online-names').textContent='';updateNear();}
    },
    show(data,definitions) {
      const changed=player?.userId!==data.userId;player=data;catalog=definitions;
      if(changed){position={x:480,y:452};clear();near=false;interact.hidden=true;}
      root.hidden=false;document.querySelector('#world-name').textContent=data.nickname;
      document.querySelector('#objective').textContent=data.pets.length?'探索 · 伙伴：前往野外捕捉新伙伴':'与莱娅对话，寻找第一位伙伴';
      const companion=catalog.find(p=>p.id===(data.pets.find(p=>p.id===data.team?.[0])??data.pets[0])?.definitionId);
      document.querySelector('#team-name').textContent=companion?`${companion.name} · ${companion.role}`:'尚未领取伙伴';
      document.querySelector('#team-note').textContent=companion?`队伍 ${data.team?.length??1}/4 · 已自动保存`:'靠近引导员后按 E 交谈';
      if(!active){active=true;resize();last=performance.now();frame=requestAnimationFrame(tick);}
    },
    hide(){connected=false;selfId=null;authoritative=null;peers.clear();active=false;player=null;clear();cancelAnimationFrame(frame);root.hidden=true;document.querySelector('#nearby-status').textContent='';},
    focus(){canvas.focus();},
    nearNpc:()=>near,
  };
}
