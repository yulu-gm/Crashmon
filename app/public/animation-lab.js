import { labMap,labCanWalk } from './animation-lab-map.js';
import { createMotion,advanceMotion,motionFrame } from './character-motion.js';
import { loadCharacterImages,drawCharacter,drawFrame,actionFrame,characterAssets } from './character-renderer.js';
const $=id=>document.getElementById(id);
const canvas=$('lab-canvas'),ctx=canvas.getContext('2d');
const walkCanvas=$('walk-canvas'),walkCtx=walkCanvas.getContext('2d');
const names={astronaut:'宇航员',flame:'火焰伙伴'},dirNames={south:'向下',north:'向上',west:'向左',east:'向右'};
let paused=false,elapsed=0,last=performance.now();
const state=createMotion(),walker=createMotion(),follower=createMotion('east');
const pos={...labMap.spawn},pet={x:labMap.spawn.x-42,y:labMap.spawn.y+18};const keys=new Set();let destination=null;
// 独立检查区：障碍物与通路的数据不来自图片。
const obstacle=labMap.obstacles[0];
const sizes=new Map();
function resize(c){const rect=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);c.width=Math.round(rect.width*dpr);c.height=Math.round(rect.height*dpr);sizes.set(c,{w:rect.width,h:rect.height,dpr});}
new ResizeObserver(()=>{resize(canvas);resize(walkCanvas);}).observe(document.querySelector('.stage'));
function setup(c,context){const {w,h,dpr}=sizes.get(c);context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,w,h);return {w,h};}
function ground(context,w,h){context.fillStyle='#e7c68e';context.fillRect(0,0,w,h);for(let i=0;i<130;i++){const x=(i*127)%w,y=(i*71)%h;context.fillStyle=i%3?'#a5978040':'#fbdfaa';context.fillRect(x,y,3+i%3,1.5);}}
function shadow(context,x,y,width){context.fillStyle='#59646a45';context.beginPath();context.ellipse(x,y+2,width,5,0,0,Math.PI*2);context.fill();}
function text(context,value,x,y,color='#444d52',size=12){context.font=`${size}px "PingFang SC",sans-serif`;context.textAlign='center';context.fillStyle=color;context.fillText(value,x,y);}
function target(context,x,y,flash){context.save();context.translate(x,y);context.fillStyle='#293944';context.fillRect(-5,-32,10,32);context.fillStyle=flash?'#ffe6a4':'#a8b8b6';context.strokeStyle='#475660';context.lineWidth=3;context.beginPath();context.arc(0,-42,20,0,Math.PI*2);context.fill();context.stroke();context.beginPath();context.arc(0,-42,10,0,Math.PI*2);context.stroke();context.restore();}
function fire(context,x,y,length,alpha){context.save();context.globalAlpha=alpha;context.fillStyle='#e46739';context.strokeStyle='#b85734';context.lineWidth=2;context.beginPath();context.moveTo(x,y);context.lineTo(x+length*.7,y-22);context.lineTo(x+length*.62,y-9);context.lineTo(x+length,y-4);context.lineTo(x+length*.76,y+10);context.lineTo(x+length*.86,y+23);context.closePath();context.fill();context.stroke();context.fillStyle='#ffe799';context.beginPath();context.moveTo(x,y);context.lineTo(x+length*.79,y-3);context.lineTo(x+length*.6,y+9);context.closePath();context.fill();context.restore();}
function renderAction(x,y,height,t,guides){const clip=characterAssets.flame.battle[$('action').value];const duration=clip.durations.reduce((a,b)=>a+b,0),clock=t%(duration+600),index=actionFrame(clip,clock);
  let dx=0;if($('action').value==='tackle'){dx=clock<190?-8*clock/190:clock<300?140*(clock-190)/110:clock<400?140:clock<640?140*(1-(clock-400)/240):0;dx*=height/200;}
  shadow(ctx,x+dx,y,height*.15);drawFrame(ctx,clip,index,x+dx,y,height,[.5,.88],guides);
  const event=clip.events[0],age=clock-event.at;
  target(ctx,x+height*.78,y-height*.43+42,age>=0&&age<150);
  if($('action').value==='sneeze'){
    const point=clip.mouth[index],origin=clip.origins[index],renderHeight=height*(clip.heightScale??1);const mouth={x:x+renderHeight*.75*(point[0]-origin[0]),y:y+renderHeight*(point[1]-origin[1])};
    if(guides){ctx.fillStyle='#d677ea';ctx.beginPath();ctx.arc(mouth.x,mouth.y,3,0,Math.PI*2);ctx.fill();}
    if(age>=0&&age<100)fire(ctx,mouth.x,mouth.y,height*.66,Math.min(1,(100-age)/50));
  }else if(age>=0&&age<150){ctx.strokeStyle='#fff7c3';ctx.lineWidth=4;for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(x+height*.78+Math.cos(a)*22,y-height*.43+Math.sin(a)*22);ctx.lineTo(x+height*.78+Math.cos(a)*35,y-height*.43+Math.sin(a)*35);ctx.stroke();}}
  return {index,clock};
}
function mainFrame(dt){const {w,h}=setup(canvas,ctx);ground(ctx,w,h);const actor=$('actor').value,action=$('action').value,guides=$('guides').checked;
  state.direction=$('direction').value;state.moving=action==='walk';
  if(!paused){elapsed+=dt*1000*Number($('speed').value);if(state.moving)state.phase=(state.phase+dt*Number($('speed').value)*1.65)%1;}
  const combat=action==='tackle'||action==='sneeze',battleIdle=action==='battle-idle';const x=w*.3,y=h*.8,height=Math.min(240,h*.7,w*.42);let frame;
  if(combat){frame=renderAction(x,y,height,elapsed,guides).index;}
  else if(battleIdle){const clip=characterAssets.flame.battle.idle;drawFrame(ctx,clip,clip.frame,x,y,height,[.5,.88],guides);frame=0;}
  else {shadow(ctx,x,y,28);drawCharacter(ctx,actor,x,y,state,{height,guides});frame=motionFrame(state,4);}
  ctx.strokeStyle='#b9a274';ctx.beginPath();ctx.moveTo(w*.63,25);ctx.lineTo(w*.63,h-25);ctx.stroke();
  const sampleState=(combat||battleIdle)?{...state,direction:'east',moving:false}:state;const smallHeight=characterAssets[actor].worldHeight;
  shadow(ctx,w*.81,y,15);drawCharacter(ctx,actor,w*.81,y,sampleState,{guides,height:smallHeight});
  text(ctx,(combat||battleIdle)?'战斗形象 / 固定向右':'放大检查',x,h-18);text(ctx,'实际显示尺寸',w*.81,h-18);
  $('frame-label').textContent=`帧 ${frame+1} / ${combat||action==='walk'?4:1}${paused?' · 已暂停':''}`;
  canvas.dataset.frame=frame;canvas.dataset.action=action;
}
const legal=labCanWalk;
function walkingFrame(dt){const {w,h}=setup(walkCanvas,walkCtx);walkCtx.save();const scale=Math.min(w/760,h/260);walkCtx.translate((w-760*scale)/2,(h-260*scale)/2);walkCtx.scale(scale,scale);ground(walkCtx,760,260);
  let dx=0,dy=0;const inputs={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};for(const key of keys){dx+=inputs[key][0];dy+=inputs[key][1];}
  if(!dx&&!dy&&destination){dx=destination.x-pos.x;dy=destination.y-pos.y;if(Math.hypot(dx,dy)<3){dx=dy=0;destination=null;}}
  const distance=Math.hypot(dx,dy),old={...pos};if(distance&&!paused){const step=keys.size?130*dt:Math.min(distance,130*dt);dx=dx/distance*step;dy=dy/distance*step;if(legal(pos.x+dx,pos.y))pos.x+=dx;if(legal(pos.x,pos.y+dy))pos.y+=dy;}
  advanceMotion(walker,pos.x-old.x,pos.y-old.y,dt);
  const oldPet={...pet};if(!paused){const blend=1-Math.exp(-6*dt);const tx=pos.x-42,ty=pos.y+18;if(legal(pet.x+(tx-pet.x)*blend,pet.y))pet.x+=(tx-pet.x)*blend;if(legal(pet.x,pet.y+(ty-pet.y)*blend))pet.y+=(ty-pet.y)*blend;}
  advanceMotion(follower,pet.x-oldPet.x,pet.y-oldPet.y,dt,64);
  // 阴影与物件独立；障碍物使用固定地面排序点，角色可经过它后方。
  const actors=[{y:pos.y,draw:()=>{shadow(walkCtx,pos.x,pos.y,13);drawCharacter(walkCtx,'astronaut',pos.x,pos.y,walker,{guides:$('guides').checked});}},{y:pet.y,draw:()=>{shadow(walkCtx,pet.x,pet.y,12);drawCharacter(walkCtx,'flame',pet.x,pet.y,follower,{guides:$('guides').checked});}},{y:obstacle.y+obstacle.h,draw:()=>{walkCtx.fillStyle='#556d7b';walkCtx.strokeStyle='#354958';walkCtx.lineWidth=2;walkCtx.beginPath();walkCtx.roundRect(obstacle.x,obstacle.y-42,obstacle.w,obstacle.h+42,9);walkCtx.fill();walkCtx.stroke();walkCtx.fillStyle='#cbb582';walkCtx.fillRect(obstacle.x+15,obstacle.y-20,50,12);text(walkCtx,'独立障碍物',440,170,'#344955',10);}}];actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
  if($('guides').checked){walkCtx.strokeStyle='#e0a56a';walkCtx.setLineDash([4,3]);walkCtx.strokeRect(obstacle.x-12,obstacle.y-8,obstacle.w+24,obstacle.h+16);walkCtx.setLineDash([]);}
  walkCtx.restore();walkCanvas.dataset.direction=walker.direction;walkCanvas.dataset.moving=String(walker.moving);walkCanvas.dataset.x=pos.x;walkCanvas.dataset.y=pos.y;walkCanvas.dataset.phase=walker.phase;
}
function updateLabels(){const combat=['battle-idle','tackle','sneeze'].includes($('action').value);if(combat){$('actor').value='flame';$('direction').value='east';}else if($('actor').value==='astronaut'){$('action').value=['idle','walk'].includes($('action').value)?$('action').value:'idle';}
  $('direction').disabled=combat;$('stage-label').textContent=`${names[$('actor').value]} / ${dirNames[$('direction').value]} / ${$('action').selectedOptions[0].textContent}`;
}
$('actor').onchange=()=>{$('action').value='idle';updateLabels();};$('direction').onchange=updateLabels;$('action').onchange=()=>{elapsed=0;updateLabels();};$('speed').oninput=()=>{$('speed-label').textContent=`${$('speed').value}×`;};$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'继续':'暂停';};$('restart').onclick=()=>{elapsed=0;state.phase=0;};$('step').onclick=()=>{paused=true;$('pause').textContent='继续';const action=$('action').value;if(['tackle','sneeze'].includes(action)){const clip=characterAssets.flame.battle[action];const duration=clip.durations.reduce((a,b)=>a+b,0),index=actionFrame(clip,elapsed%(duration+600));elapsed=index===3?0:clip.durations.slice(0,index+1).reduce((a,b)=>a+b,0);}else state.phase=(state.phase+.25)%1;};
walkCanvas.addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){event.preventDefault();keys.add(key);destination=null;}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));const stop=()=>{keys.clear();destination=null;};window.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop);
walkCanvas.addEventListener('pointerdown',e=>{walkCanvas.focus();const rect=walkCanvas.getBoundingClientRect(),scale=Math.min(rect.width/760,rect.height/260);destination={x:(e.clientX-rect.left-(rect.width-760*scale)/2)/scale,y:(e.clientY-rect.top-(rect.height-260*scale)/2)/scale};keys.clear();});
resize(canvas);resize(walkCanvas);updateLabels();const results=await loadCharacterImages({battle:true});const failed=results.filter(r=>!r.ok);$('asset-status').textContent=failed.length?`${failed.length} 个素材载入失败`:`${results.length} 个图集已载入 · 固定画布 / 固定锚点`;
function tick(time){const dt=Math.min((time-last)/1000,.05);last=time;if(!document.hidden){mainFrame(dt);walkingFrame(dt);}requestAnimationFrame(tick);}requestAnimationFrame(tick);
