import { W,npc } from './hub-map.js';
import { loadSceneImages,drawSceneGround,sceneRenderables } from './scene-renderer.js';
export function createMinimap(canvas){
  const ctx=canvas.getContext('2d'),base=document.createElement('canvas');base.width=canvas.width;base.height=canvas.height;
  const scale=canvas.width/W;
  loadSceneImages().then(()=>{const c=base.getContext('2d');c.scale(scale,scale);drawSceneGround(c,0,{effects:false});sceneRenderables(c,0,{effects:false}).sort((a,b)=>a.y-b.y).forEach(o=>o.draw());});
  return function paint(position,direction,peers){
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(base,0,0);ctx.save();ctx.scale(scale,scale);
    ctx.fillStyle='#f8f0d3';ctx.strokeStyle='#2f4551';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(npc.x,npc.y,12,0,Math.PI*2);ctx.fill();ctx.stroke();
    for(const peer of peers){ctx.beginPath();ctx.arc(peer.renderX,peer.renderY,7,0,Math.PI*2);ctx.fill();}
    const angle={east:0,south:Math.PI/2,west:Math.PI,north:-Math.PI/2}[direction]??0;
    ctx.translate(position.x,position.y);ctx.rotate(angle);ctx.fillStyle='#f8d07d';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(30,0);ctx.lineTo(-18,-18);ctx.lineTo(-11,0);ctx.lineTo(-18,18);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  };
}
