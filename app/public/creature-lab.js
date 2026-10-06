import {loadCharacterImages,drawCharacter,characterAssets} from './character-renderer.js';
import {speciesCharacters} from './character-assets.js';
import {drawCreature,creatureActions,creaturePose,actionDuration} from './creature-animation.js';
import {createBattleRenderer} from './battle-renderer.js';
const $=id=>document.getElementById(id),preview=$('preview'),map=$('map');let paused=false,elapsed=0,last=performance.now();
const names={starter_a:'火焰伙伴',starter_b:'苔伞龟',starter_c:'星签雀',wild_scout:'巡游仔',wild_shell:'收纳仔'};
function options(){const select=$('action');select.replaceChildren();for(const [value,label] of [['idle','战斗待机'],...creatureActions[$('species').value].map(([id,name])=>[id,name])]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}elapsed=0;$('title').textContent=names[$('species').value];formation();}
function setup(canvas){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#e4c795';ctx.fillRect(0,0,w,h);for(let i=0;i<80;i++){ctx.fillStyle=i%2?'#8c978f40':'#ffe8b4';ctx.fillRect((i*139)%w,(i*77)%h,4,2);}return {ctx,w,h};}
function shadow(ctx,x,y,r){ctx.fillStyle='#43566238';ctx.beginPath();ctx.ellipse(x,y+2,r,5,0,0,Math.PI*2);ctx.fill();}
function paint(){const species=$('species').value,asset=characterAssets[speciesCharacters[species]],{ctx,w,h}=setup(preview),facing=Number($('facing').value),reduced=$('reduce').checked;
  const clock=elapsed%(actionDuration+700),skillId=$('action').value==='idle'?null:$('action').value,pose=creaturePose(species,skillId,clock,elapsed,reduced);
  const large=Math.min(h*.8,w*.39),ground=h*.89;for(const [x,height] of [[w*.3,large],[w*.8,asset.battleHeight]]){shadow(ctx,x,ground,height*.2);drawCreature(ctx,species,x,ground,{height,facing,skillId,elapsed:clock,time:elapsed,reduced,guides:$('guides').checked});}
  $('clock').textContent=`${Math.min(clock,900).toFixed(0)} ms`;$('seek').value=Math.min(clock,900);$('pose').textContent={idle:'待机',anticipation:'蓄势',contact:'攻击',support:'技能姿势'}[pose.pose];preview.dataset.pose=pose.pose;preview.dataset.clock=clock.toFixed(0);
  const m=setup(map);for(const [i,direction] of ['south','north','west','east'].entries()){const x=m.w*(i+.5)/4,y=m.h*.8;shadow(m.ctx,x,y,14);drawCharacter(m.ctx,speciesCharacters[species],x,y,{direction,moving:false,time:elapsed},{height:asset.worldHeight,guides:$('guides').checked,reducedMotion:reduced});m.ctx.font='11px "PingFang SC",sans-serif';m.ctx.textAlign='center';m.ctx.fillStyle='#4e6269';m.ctx.fillText(['正面','背面','向左','向右'][i],x,m.h-6);}
}
let renderer=null;
function formation(play=false){renderer?.stop();const ids=[$('species').value,...Object.keys(names).filter(id=>id!==$('species').value)].slice(0,4),units=[];
  for(const side of ['enemy','player'])for(let i=0;i<4;i++)units.push({id:`${side}${i}`,speciesId:ids[i],name:names[ids[i]],side,hp:100,maxHp:100,statuses:[]});
  const state={units,currentActorId:'player0',events:play?[{type:'action',actorId:'player0',skillId:$('action').value==='idle'?creatureActions[ids[0]][0][0]:$('action').value},{type:'damage',targetId:'enemy0'}]:[]};
  const labels=$('formation-labels');labels.replaceChildren();const nodes=new Map();for(const unit of units){const n=document.createElement('div');n.className=`unit ${unit.side}`;n.textContent=unit.name;const meter=document.createElement('meter');meter.min=0;meter.max=100;meter.value=100;n.append(meter);labels.append(n);nodes.set(unit.id,n);}
  renderer=createBattleRenderer($('formation'),{onLayout:layout=>{$('formation-wrap').style.height=`${layout.height}px`;for(const p of layout.placements){const n=nodes.get(p.id);n.style.left=`${p.x-40}px`;n.style.top=`${p.top+p.hudBottom}px`;n.style.width='80px';}}});renderer.show(state,$('reduce').checked,play);
}
$('species').onchange=options;$('action').onchange=()=>{elapsed=0;formation();};$('facing').onchange=()=>elapsed=0;$('reduce').onchange=()=>formation();
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'继续':'暂停';};$('restart').onclick=()=>{elapsed=0;paused=false;$('pause').textContent='暂停';};
function seek(value){elapsed=value;paused=true;$('pause').textContent='继续';paint();}
$('seek').oninput=()=>seek(Number($('seek').value));$('step').onclick=()=>{const current=elapsed%1600;seek([0,220,360,620,900].find(t=>t>current)??0);};$('formation-play').onclick=()=>formation(true);
const results=await loadCharacterImages({battle:true});const failed=results.filter(r=>!r.ok);$('status').textContent=failed.length?`${failed.length} 张图集加载失败`:'五位伙伴素材已载入';options();
function tick(now){if(!paused&&!document.hidden)elapsed+=Math.min(now-last,60)*Number($('speed').value);last=now;if(!document.hidden)paint();requestAnimationFrame(tick);}requestAnimationFrame(tick);
