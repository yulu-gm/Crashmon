import { sceneAssets,landmarks,tidePool,coastalObjects,edgeObjects,campObjects,sceneSize } from './scene-layout.js';
const images=new Map();
let readiness;
export function loadSceneImages(){
  readiness??=Promise.all(Object.entries(sceneAssets).map(([id,asset])=>new Promise(resolve=>{
    const image=new Image();images.set(id,image);image.onload=()=>resolve({id,ok:true});image.onerror=()=>resolve({id,ok:false});image.src=asset.src;
  })));
  return readiness;
}
function texture(ctx,id,rect,frame=0){
  const image=images.get(id),asset=sceneAssets[id];if(!image?.complete||!image.naturalWidth)return false;
  const sw=image.naturalWidth/(asset.columns??1),sh=image.naturalHeight/(asset.rows??1),crop=asset.crop??[0,0,1,1];
  ctx.drawImage(image,(frame%(asset.columns??1))*sw+crop[0]*sw,Math.floor(frame/(asset.columns??1))*sh+crop[1]*sh,crop[2]*sw,crop[3]*sh,rect.x,rect.y,rect.width,rect.height);return true;
}
export function drawSceneGround(ctx,time,{effects=true,reducedMotion=false}={}){
  if(!texture(ctx,'terrain',{x:0,y:0,width:sceneSize.width,height:sceneSize.height})){ctx.fillStyle='#e8c58d';ctx.fillRect(0,0,sceneSize.width,sceneSize.height);}
  texture(ctx,'pool',tidePool);
  if(effects){
    const p=tidePool.collision;ctx.save();ctx.beginPath();ctx.ellipse(p.x+p.w/2,p.y+p.h/2,p.w*.36,p.h*.27,0,0,Math.PI*2);ctx.clip();
    ctx.strokeStyle='#fff0b65e';ctx.lineWidth=1.1;const shift=reducedMotion?0:Math.sin(time/2100)*3;
    for(let i=0;i<5;i++){const x=p.x+42+i*28,y=p.y+45+(i%3)*12;ctx.beginPath();ctx.ellipse(x+shift,y,10+i%3*3,1.6,0,0,Math.PI);ctx.stroke();}ctx.restore();
  }
}
export function drawSceneShadows(ctx){
  ctx.fillStyle='#54525824';
  for(const o of [...landmarks,...coastalObjects,...campObjects]){
    const c=o.collision??o.ground;ctx.beginPath();ctx.ellipse(c.w?c.x+c.w/2:c.x,o.sortY-3,c.w?c.w*.46:19,c.w?10:5,0,0,Math.PI*2);ctx.fill();
  }
}
export function drawSceneObject(ctx,o,time,{effects=true,reducedMotion=false}={}){
  texture(ctx,o.asset,o,o.frame??0);
  if(effects&&o.asset==='props'&&o.frame===4){
    const x=o.x+o.width*.66,y=o.y+o.height*.43;
    const glow=ctx.createRadialGradient(x,y,0,x,y,25);const alpha=reducedMotion ? .16 : .16+Math.sin(time/1700)*.025;
    glow.addColorStop(0,`rgba(255,217,126,${alpha})`);glow.addColorStop(1,'rgba(255,217,126,0)');ctx.fillStyle=glow;ctx.fillRect(x-25,y-25,50,50);
  }
}
export function sceneRenderables(ctx,time,options={}){
  return [...landmarks,...coastalObjects,...edgeObjects,...campObjects].map(o=>({id:o.id,y:o.sortY,draw:()=>drawSceneObject(ctx,o,time,options)}));
}
export function drawSceneLabels(ctx){
  ctx.save();ctx.font='600 10px "PingFang SC",sans-serif';ctx.textAlign='center';
  for(const o of landmarks){
    const x=o.collision.x+o.collision.w/2,y=o.sortY+32;
    ctx.strokeStyle='#fae0a3ba';ctx.lineWidth=3;ctx.strokeText(o.label,x,y);ctx.fillStyle='#44535a';ctx.fillText(o.label,x,y);
  }ctx.restore();
}
export function drawSceneGuides(ctx,{images=false}={}){
  ctx.save();ctx.lineWidth=1;
  for(const o of [...landmarks,tidePool,...coastalObjects]){const c=o.collision;ctx.strokeStyle='#df675ccc';ctx.setLineDash([4,3]);ctx.beginPath();if(c.w)ctx.rect(c.x-12,c.y-8,c.w+24,c.h+16);else ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.stroke();
    if(images){ctx.setLineDash([]);ctx.strokeStyle='#2baca4a0';ctx.strokeRect(o.x,o.y,o.width,o.height);}
  }ctx.restore();
}
export {landmarks,tidePool,coastalObjects};
