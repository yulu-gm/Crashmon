import {resolve} from 'node:path';
import {characterAssets,speciesCharacters} from '../app/public/character-assets.js';
import {creatureActions} from '../app/public/creature-animation.js';
import {catalog} from '../content/pets/catalog.js';
import {readPng,inspectRect} from './sprite-inspect.js';
const pngs=new Map(),issues=[];let frames=0;
for(const [species,id] of Object.entries(speciesCharacters)){
  const asset=characterAssets[id];
  const required=[catalog[species].basic,...catalog[species].skills].map(s=>s.id),provided=(creatureActions[species]??[]).map(([id])=>id);
  for(const skill of required)if(!provided.includes(skill))issues.push(`${species}: 缺少技能演出 ${skill}`);
  for(const [name,clip] of Object.entries({map:asset.idle,...asset.battle})){
    if(!clip.src)continue;
    try{const path=resolve('app/public',clip.src.slice(1));if(!pngs.has(path))pngs.set(path,readPng(path));const png=pngs.get(path),count=clip.count??clip.columns*clip.rows;
      if(clip.origins?.length!==count)issues.push(`${species}/${name}: 锚点数量与采样数不同`);
      for(let frame=0;frame<count;frame++){
        frames++;const sw=png.width/clip.columns,sh=png.height/clip.rows;
        const rect=clip.rects?.[frame]??[frame%clip.columns*sw,Math.floor(frame/clip.columns)*sh,sw,sh];
        const [x,y,w,h]=rect,origin=clip.origins?.[frame];
        if(rect.some(v=>!Number.isInteger(v))||x<0||y<0||w<=0||h<=0||x+w>png.width||y+h>png.height){issues.push(`${species}/${name}/${frame}: 采样框越界或不是整像素`);continue;}
        if(!origin||origin.some(v=>v<0||v>1))issues.push(`${species}/${name}/${frame}: 锚点不在采样框内`);
        const alpha=inspectRect(png,rect);if(!alpha.opaquePixels||alpha.borderPixels)issues.push(`${species}/${name}/${frame}: ${!alpha.opaquePixels?'空帧':`边界有 ${alpha.borderPixels} 个不透明像素，可能裁切或串帧`}`);
      }
    }catch(error){issues.push(`${species}/${name}: ${error.message}`);}
  }
}
if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}else console.log(`伙伴素材检查通过：${Object.keys(speciesCharacters).length} 只，${pngs.size} 张 PNG，${frames} 个采样框；普攻与技能映射齐全。`);
