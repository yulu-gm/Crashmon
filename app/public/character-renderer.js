import { characterAssets } from './character-assets.js';
import { motionFrame } from './character-motion.js';
const images=new Map();
const pending=new Map();
export function loadCharacterImages({battle=false}={}) {
  const sources=new Set();
  for(const asset of Object.values(characterAssets)) {
    sources.add(asset.idle.src);
    for(const clip of Object.values(asset.walk??{})) sources.add(clip.src);
    if(battle)for(const clip of Object.values(asset.battle??{})) if(clip.src)sources.add(clip.src);
  }
  return Promise.all([...sources].map(src=>{if(pending.has(src))return pending.get(src);const request=new Promise(resolve=>{
    const image=new Image(); images.set(src,image);image.onload=()=>resolve({src,ok:true});image.onerror=()=>resolve({src,ok:false});image.src=src;
  });pending.set(src,request);return request;}));
}
export function drawCharacter(ctx, id, x, y, state, {height, guides=false,reducedMotion=false}={}) {
  const asset=characterAssets[id];if(!asset)return false;
  const clip=state.moving&&!reducedMotion&&asset.walk?.[state.direction]?asset.walk[state.direction]:asset.idle;
  const frame=clip===asset.idle?clip.frames[state.direction]:motionFrame(state,clip.count);
  const breath=!reducedMotion&&clip===asset.idle&&asset.idleMotion?1+Math.sin((state.time??0)/asset.idleMotion.period)*asset.idleMotion.amplitude:1;
  ctx.save();ctx.translate(x,y);ctx.scale(1,breath);const ok=drawFrame(ctx,clip,frame,0,0,height??asset.worldHeight,asset.anchor,guides);ctx.restore();return ok;
}
export function drawFrame(ctx,clip,frame,x,y,height,anchor=[.5,.88],guides=false) {
  const image=images.get(clip.src);
  if(!image?.complete||!image.naturalWidth) return false;
  const {source,destination}=frameGeometry(clip,frame,image.naturalWidth,image.naturalHeight,height,anchor);
  const [dx,dy,width,renderHeight]=destination,left=x+dx,top=y+dy;
  ctx.drawImage(image,...source,left,top,width,renderHeight);
  if(guides){ctx.save();ctx.strokeStyle='#4edcca';ctx.lineWidth=1;ctx.strokeRect(left,top,width,renderHeight);ctx.beginPath();ctx.moveTo(x-8,y);ctx.lineTo(x+8,y);ctx.moveTo(x,y-8);ctx.lineTo(x,y+8);ctx.stroke();ctx.restore();}
  return true;
}
// 不等宽采样框也共用 referenceHeight；不能按每帧包围盒改变角色大小。
export function frameGeometry(clip,frame,imageWidth,imageHeight,height,anchor=[.5,.88]) {
  const sw=imageWidth/clip.columns,sh=imageHeight/clip.rows;
  const source=clip.rects?.[frame]??[(frame%clip.columns)*sw,Math.floor(frame/clip.columns)*sh,sw,sh];
  const scale=height*(clip.heightScale??1)/(clip.referenceHeight??sh);
  anchor=clip.origins?.[frame]??anchor;
  return {source,destination:[-source[2]*anchor[0]*scale,-source[3]*anchor[1]*scale,source[2]*scale,source[3]*scale]};
}
export function actionFrame(clip,elapsed) {
  let end=0;for(let i=0;i<clip.durations.length;i++){end+=clip.durations[i];if(elapsed<end)return i;}
  return clip.durations.length-1;
}
export {characterAssets};
