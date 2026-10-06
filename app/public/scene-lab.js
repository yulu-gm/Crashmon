import { W,H,npc,canWalk,SPEED } from './hub-map.js';
import { loadSceneImages,drawSceneGround,drawSceneShadows,sceneRenderables,drawSceneLabels,drawSceneGuides } from './scene-renderer.js';
import { createMotion,advanceMotion } from './character-motion.js';
import { loadCharacterImages,drawCharacter } from './character-renderer.js';
const canvas=document.querySelector('#scene-canvas'),ctx=canvas.getContext('2d');
const controls={guides:document.querySelector('#guides'),effects:document.querySelector('#effects'),reducedMotion:document.querySelector('#reduced-motion')};
const directions={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]},keys=new Set();
const locations={camp:[480,452], 'station-back':[755,100], 'station-front':[755,247], 'ship-back':[205,80], 'ship-front':[205,247], coast:[580,592]};
let position={x:480,y:452},motion=createMotion(),target=null,last=performance.now(),scale=1,offset={x:0,y:0};
const sprites=new Image();
const spriteReady=new Promise(resolve=>{sprites.onload=()=>resolve({ok:true});sprites.onerror=()=>resolve({ok:false});});
sprites.src='/assets/expedition-sprites.png';
const sceneReady=await Promise.all([loadSceneImages(),loadCharacterImages(),spriteReady]);
const failed=sceneReady.flat().filter(r=>!r.ok);document.querySelector('#status').textContent=failed.length?`有 ${failed.length} 项素材未载入`:'场景已载入 · 不写入玩家存档';
function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);scale=Math.max(r.width/W,r.height/H);}
new ResizeObserver(resize).observe(canvas);
function clear(){keys.clear();target=null;}window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|BUTTON/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(directions[key]){e.preventDefault();keys.add(key);target=null;}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointerdown',e=>{canvas.focus();target={x:(e.clientX-offset.x)/scale,y:(e.clientY-offset.y)/scale};});
document.querySelector('#location').addEventListener('change',e=>{const [x,y]=locations[e.target.value];position={x,y};motion=createMotion('south');clear();});
function drawNpc(){if(!sprites.complete||!sprites.naturalWidth)return;const w=sprites.naturalWidth/3,h=sprites.naturalHeight/2;ctx.drawImage(sprites,w+w*.045,h,w*.91,h,npc.x-32.5,npc.y-60,65,65);}
function tick(time){const dt=Math.min((time-last)/1000,.04);last=time;const old={...position};let dx=0,dy=0;
  for(const key of keys){dx+=directions[key][0];dy+=directions[key][1];}
  if(!keys.size&&target){dx=target.x-position.x;dy=target.y-position.y;if(Math.hypot(dx,dy)<3){target=null;dx=dy=0;}}
  const distance=Math.hypot(dx,dy);if(distance){const step=Math.min(SPEED*dt,target?distance:Infinity);dx=dx/distance*step;dy=dy/distance*step;if(canWalk(position.x+dx,position.y))position.x+=dx;if(canWalk(position.x,position.y+dy))position.y+=dy;if(position.x===old.x&&position.y===old.y)target=null;}
  advanceMotion(motion,position.x-old.x,position.y-old.y,dt);
  const r=canvas.getBoundingClientRect();offset={x:Math.max(r.width-W*scale,Math.min(0,r.width/2-position.x*scale)),y:Math.max(r.height-H*scale,Math.min(0,r.height/2-position.y*scale))};
  ctx.clearRect(0,0,r.width,r.height);ctx.save();ctx.translate(offset.x,offset.y);ctx.scale(scale,scale);
  const options={effects:controls.effects.checked,reducedMotion:controls.reducedMotion.checked};
  drawSceneGround(ctx,time,options);drawSceneShadows(ctx);
  const actors=sceneRenderables(ctx,time,options);actors.push({y:npc.y,draw:drawNpc},{y:position.y,draw:()=>{ctx.fillStyle='#353d4350';ctx.beginPath();ctx.ellipse(position.x,position.y+2,15,5,0,0,Math.PI*2);ctx.fill();drawCharacter(ctx,'astronaut',position.x,position.y,motion,options);}});
  actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());drawSceneLabels(ctx);if(controls.guides.checked)drawSceneGuides(ctx,{images:true});ctx.restore();requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
