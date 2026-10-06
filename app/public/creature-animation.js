import {characterAssets,speciesCharacters} from './character-assets.js';
import {drawFrame,actionFrame} from './character-renderer.js';

// 技能 ID 只映射演出，客户端不推算伤害或护盾。
export const creatureActions={
  starter_a:[['starter_a_basic','直击','bump'],['starter_a_burst','强力突击','rush'],['starter_a_focus','振作','focus']],
  starter_b:[['starter_b_basic','碰撞','bump'],['starter_b_cover','撑伞','umbrella'],['starter_b_push','稳步推进','push']],
  starter_c:[['starter_c_basic','轻啄','peck'],['starter_c_mark','划重点','star'],['starter_c_strike','认真一击','dive']],
  wild_scout:[['wild_scout_basic','探头撞','bump'],['wild_scout_mark','做记号','scan'],['wild_scout_dash','急冲','dash']],
  wild_shell:[['wild_shell_basic','箱角碰撞','bump'],['wild_shell_cover','临时包装','box'],['wild_shell_press','整箱推进','push']],
};
const actionTypes=Object.fromEntries(Object.values(creatureActions).flat().map(([id,,type])=>[id,type]));
export const actionDuration=900,impactAt=360;
export function creaturePose(speciesId,skillId,elapsed,time=0,reduced=false) {
  const asset=characterAssets[speciesCharacters[speciesId]];if(!asset)return null;
  const type=actionTypes[skillId],playing=!reduced&&type&&elapsed>=0&&elapsed<actionDuration;
  if(!playing)return {asset,pose:'idle',dx:0,dy:0,angle:0,sx:1,sy:reduced?1:1+Math.sin(time/450)*.013,type:null,progress:0};
  const t=elapsed/actionDuration,support=['umbrella','box','star','scan','focus'].includes(type);
  const power=['rush','dive','dash','push'].includes(type),reach=power?20:12;
  const travel=elapsed<200?-3*Math.sin(elapsed/200*Math.PI/2):elapsed<400?reach*(elapsed-200)/200:elapsed<500?reach:reach*Math.max(0,(760-elapsed)/260);
  return {asset,type,pose:elapsed<220?'anticipation':elapsed<620?(support?'support':'contact'):'idle',dx:support?0:travel,
    dy:type==='dive'?-Math.sin(t*Math.PI)*16:type==='peck'?-Math.sin(t*Math.PI)*5:type==='dash'?-Math.abs(Math.sin(t*Math.PI*5))*2:0,
    angle:support?Math.sin(t*Math.PI*2)*.025:type==='dive'?Math.sin(t*Math.PI)*.11:type==='dash'&&elapsed>560?-.08:0,
    sx:1,sy:elapsed<200?1-Math.sin(elapsed/200*Math.PI)*.04:1,progress:t,elapsed};
}
export function drawCreature(ctx,speciesId,x,y,{height,facing=1,skillId=null,elapsed=Infinity,time=0,reduced=false,guides=false}={}) {
  const pose=creaturePose(speciesId,skillId,elapsed,time,reduced);if(!pose)return false;
  const {asset}=pose,direction=facing<0?'west':'east';height??=asset.battleHeight;
  ctx.save();ctx.translate(x+pose.dx*facing*height/100,y+pose.dy*height/100);ctx.rotate(pose.angle*facing);ctx.scale(pose.sx,pose.sy);
  let clip=asset.battle.idle,frame=clip.frames[direction];
  if(pose.pose!=='idle'&&asset.battle.poses){clip=asset.battle.poses;frame=({anticipation:0,contact:1,support:2})[pose.pose]+(facing<0?3:0);}
  // 旧火焰动作只有右向原图；攻击镜像限于该对称旧样本，待机始终使用真实左右视图。
  else if(pose.pose!=='idle'&&speciesId==='starter_a'&&pose.type!=='focus'){
    clip=asset.battle.tackle;frame=actionFrame(clip,Math.min(elapsed,639));if(facing<0)ctx.scale(-1,1);
  }
  const ok=drawFrame(ctx,clip,frame,0,0,height,asset.anchor,guides);ctx.restore();
  if(!ok&&pose.pose!=='idle')return drawCreature(ctx,speciesId,x,y,{height,facing,reduced:true,guides});
  if(ok&&!reduced&&pose.type)drawCreatureEffect(ctx,pose,x,y,height,facing);
  return ok;
}
function drawCreatureEffect(ctx,{type,elapsed},x,y,height,facing){
  if(elapsed<220||elapsed>750)return;const t=(elapsed-220)/530,s=height/100;
  ctx.save();ctx.translate(x,y);ctx.scale(s*facing,s);ctx.globalAlpha=Math.sin(t*Math.PI);ctx.lineWidth=2.5;ctx.strokeStyle='#f6d584';ctx.fillStyle='#f6d584';
  if(type==='umbrella'){ctx.strokeStyle='#b4e3ac';ctx.beginPath();ctx.arc(0,-36,48,Math.PI,Math.PI*2);ctx.stroke();for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo((i-1)*26,-75);ctx.lineTo((i-1)*26-3,-65);ctx.stroke();}}
  else if(type==='box'){ctx.strokeStyle='#a9e7e2';ctx.beginPath();ctx.roundRect(-45,-63,90,65,9);ctx.stroke();ctx.strokeStyle='#f7bc67';ctx.beginPath();ctx.moveTo(-45,-35);ctx.lineTo(45,-35);ctx.moveTo(0,-63);ctx.lineTo(0,2);ctx.stroke();}
  else if(type==='star'){const sx=42,sy=-53;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?5:11;const px=sx+Math.cos(a)*r,py=sy+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(24,-30);ctx.quadraticCurveTo(48,-26,sx,sy+16);ctx.stroke();}
  else if(type==='scan'){ctx.strokeStyle='#b5eee6';ctx.beginPath();ctx.arc(35,-40,14+t*5,-Math.PI*.4,Math.PI*.4);ctx.stroke();ctx.beginPath();ctx.moveTo(52,-42);ctx.lineTo(64,-42);ctx.stroke();}
  else if(type==='focus'){ctx.strokeStyle='#ffd998';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo((i-1)*16,-75);ctx.lineTo((i-1)*18,-84);ctx.stroke();}}
  else if(['rush','dive','dash','push'].includes(type)){ctx.strokeStyle=type==='dive'?'#d9c2ef':'#ffe0ad';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-40,-10-i*12);ctx.lineTo(-50-t*10,-10-i*12);ctx.stroke();}}
  ctx.restore();
}
// 一个服务器响应可能包含我方行动和多次敌方行动，按事件顺序排演。
export function presentationTimeline(events=[]) {
  const segments=[];let current=null;
  for(const event of events){
    if(['action','defend','capture','heal'].includes(event.type)&&!(event.type==='heal'&&!event.item)){
      current={actorId:event.actorId,skillId:event.skillId,start:segments.length*actionDuration,events:[]};segments.push(current);
    }
    if(current)current.events.push(event);
  }
  return segments;
}
