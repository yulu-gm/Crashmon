import { characterAssets } from './character-assets.js';
import { motionFrame } from './character-motion.js';
const images=new Map();
export function loadCharacterImages({battle=false}={}) {
  const sources=new Set();
  for(const asset of Object.values(characterAssets)) {
    sources.add(asset.idle.src);
    for(const clip of Object.values(asset.walk)) sources.add(clip.src);
    if(battle)for(const clip of Object.values(asset.battle??{})) if(clip.src)sources.add(clip.src);
  }
  return Promise.all([...sources].map(src=>new Promise(resolve=>{
    const image=new Image(); images.set(src,image);image.onload=()=>resolve({src,ok:true});image.onerror=()=>resolve({src,ok:false});image.src=src;
  })));
}
export function drawCharacter(ctx, id, x, y, state, {height, guides=false,reducedMotion=false}={}) {
  const asset=characterAssets[id];if(!asset)return false;
  const clip=state.moving&&!reducedMotion?asset.walk[state.direction]:asset.idle;
  const frame=clip===asset.idle?clip.frames[state.direction]:motionFrame(state,clip.count);
  return drawFrame(ctx,clip,frame,x,y,height??asset.worldHeight,asset.anchor,guides);
}
export function drawFrame(ctx,clip,frame,x,y,height,anchor=[.5,.88],guides=false) {
  const image=images.get(clip.src);
  if(!image?.complete||!image.naturalWidth) return false;
  const sw=image.naturalWidth/clip.columns,sh=image.naturalHeight/clip.rows;
  height*=clip.heightScale??1;
  anchor=clip.origins?.[frame]??anchor;
  const width=height*sw/sh;
  const left=x-width*anchor[0],top=y-height*anchor[1];
  ctx.drawImage(image,(frame%clip.columns)*sw,Math.floor(frame/clip.columns)*sh,sw,sh,left,top,width,height);
  if(guides){ctx.save();ctx.strokeStyle='#4edcca';ctx.lineWidth=1;ctx.strokeRect(left,top,width,height);ctx.beginPath();ctx.moveTo(x-8,y);ctx.lineTo(x+8,y);ctx.moveTo(x,y-8);ctx.lineTo(x,y+8);ctx.stroke();ctx.restore();}
  return true;
}
export function actionFrame(clip,elapsed) {
  let end=0;for(let i=0;i<clip.durations.length;i++){end+=clip.durations[i];if(elapsed<end)return i;}
  return clip.durations.length-1;
}
export {characterAssets};
