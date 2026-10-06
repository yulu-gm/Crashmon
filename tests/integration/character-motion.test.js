import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMotion,advanceMotion,motionFrame } from '../../app/public/character-motion.js';

test('脚步跟随位移：按住方向撞墙时回到待机，重新移动保留循环进度',()=>{
  const state=createMotion();advanceMotion(state,21,0,.1,84);
  assert.equal(state.direction,'east');assert.equal(state.phase,.25);assert.equal(motionFrame(state,4),1);
  advanceMotion(state,0,0,.1,84);assert.equal(state.moving,false);assert.equal(state.phase,.25);
  advanceMotion(state,0,-21,.1,84);assert.equal(state.direction,'north');assert.equal(state.phase,.5);
});
test('相同距离的步态不因帧率改变，暂停与网络瞬移不累计为奔跑',()=>{
  const a=createMotion(),b=createMotion();advanceMotion(a,12,0,.1);
  for(let i=0;i<4;i++)advanceMotion(b,3,0,.025);
  assert.ok(Math.abs(a.phase-b.phase)<1e-9);
  const phase=a.phase;advanceMotion(a,120,0,.04);assert.equal(a.phase,phase);assert.equal(a.moving,false);
  advanceMotion(a,10,0,.5);assert.equal(a.phase,phase);
});
test('斜向边界保持朝向，明显转弯才切换，没有用旋转图片代替朝向',()=>{
  const state=createMotion('east');advanceMotion(state,8,9,.1);assert.equal(state.direction,'east');
  advanceMotion(state,4,10,.1);assert.equal(state.direction,'south');
  advanceMotion(state,-10,0,.1);assert.equal(state.direction,'west');
});
