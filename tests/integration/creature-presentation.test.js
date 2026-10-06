import {test} from 'node:test';
import assert from 'node:assert/strict';
import {frameGeometry} from '../../app/public/character-renderer.js';
import {characterAssets} from '../../app/public/character-assets.js';
import {presentationTimeline,creaturePose} from '../../app/public/creature-animation.js';

test('火焰攻击使用完整实际采样框；不等宽帧保持同一个像素比例',()=>{
  const clip=characterAssets.flame.battle.tackle;
  const frames=clip.rects.map((_,i)=>frameGeometry(clip,i,2172,724,100));
  assert.ok(frames[2].source[0]+frames[2].source[2]>1693);
  for(const frame of frames)assert.equal(frame.destination[2]/frame.source[2],frame.destination[3]/frame.source[3]);
  assert.ok(frames.every(f=>Math.abs(f.destination[2]/f.source[2]-frames[0].destination[2]/frames[0].source[2])<1e-12));
  assert.equal(characterAssets.flame.battle.idle.src,'/assets/characters/flame/model.png');
});
test('多次服务器行动顺序播放；减少动态效果时回到对应角色待机',()=>{
  const timeline=presentationTimeline([{type:'action',actorId:'a',skillId:'starter_c_mark'},{type:'status',targetId:'b',status:'mark'},{type:'action',actorId:'b',skillId:'wild_scout_basic'},{type:'damage',targetId:'a'}]);
  assert.equal(timeline.length,2);assert.equal(timeline[0].events[1].targetId,'b');assert.equal(timeline[1].start,900);
  assert.equal(creaturePose('starter_c','starter_c_mark',360).pose,'support');
  const still=creaturePose('starter_c','starter_c_strike',360,100,true);assert.equal(still.pose,'idle');assert.equal(still.dx,0);assert.equal(still.sy,1);
});
