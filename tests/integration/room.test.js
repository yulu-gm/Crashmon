import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoom } from '../../framework/room.js';
import { canWalk, SPEED } from '../../app/shared/hub-map.js';
function setup(){
 let time=1000;const valid=new Set(['a','b']);
 const room=createRoom({now:()=>time,authenticate:secret=>{if(!valid.has(secret))throw Error('失效');return secret;},profile:id=>({nickname:id,pets:[],password:'不可公开'}),canWalk,speed:SPEED});
 const a=room.join('a','a'),b=room.join('b','b');
 let seq=0;
 return {room,a,b,valid,advance(ms){time+=ms;},sync(who,input={type:'stop'},sequence=seq++){return room.sync(who,who,{connectionId:(who==='a'?a:b).connectionId,sequence,input});}};
}
test('共享房间显示两个不同出生点，只公开地图所需字段',()=>{
 const f=setup(),s=f.sync('a');assert.equal(s.players.length,2);assert.notDeepEqual(s.players[0],s.players[1]);
 for(const p of s.players)assert.deepEqual(Object.keys(p).sort(),['id','nickname','starterId','x','y']);
 assert.equal(s.players.some(p=>p.id==='a'),false);
});
test('服务器按实际时间限速，拒绝坐标伪造，斜向移动不加速',()=>{
 const f=setup();const original=f.sync('a').players.find(p=>p.id===f.a.selfId);
 f.sync('a',{type:'direction',x:1,y:1});f.advance(200);
 const moved=f.sync('a',{type:'stop'}).players.find(p=>p.id===f.a.selfId);
 assert.ok(Math.abs(Math.hypot(moved.x-original.x,moved.y-original.y)-30)<.01);
 for(let i=0;i<20;i++)f.sync('a',{type:'direction',x:1,y:0});
 const fast=f.sync('a').players.find(p=>p.id===f.a.selfId);assert.equal(fast.x,moved.x);
 assert.throws(()=>f.sync('a',{type:'direction',x:999,y:0}),e=>e.status===400);
 assert.throws(()=>f.sync('a',{type:'target',x:-20,y:0}),e=>e.status===400);
});
test('碰撞、过期输入停止和失联玩家清理',()=>{
 const f=setup();f.sync('a',{type:'target',x:200,y:438});
 for(let i=0;i<10;i++){f.advance(100);f.sync('a',{type:'target',x:200,y:438});f.sync('b');}
 const p=f.sync('b').players.find(p=>p.id===f.a.selfId);assert.ok(p.x>=323);assert.ok(canWalk(p.x,p.y));
 f.sync('a',{type:'direction',x:1,y:0});f.advance(2000);
 const after=f.sync('b').players.find(p=>p.id===f.a.selfId);assert.ok(after.x-p.x<=60.01);
 f.advance(4001);assert.equal(f.sync('b').players.length,1);
 assert.throws(()=>f.sync('a'),e=>e.status===410);
});
test('账号接管不重复角色，旧连接不能移动或移除新连接，过期与退出移除角色',()=>{
 const f=setup();const latest=f.room.join('a','a');
 assert.equal(latest.players.length,2);assert.throws(()=>f.sync('a'),e=>e.status===409);
 f.room.leave('a','a',f.a.connectionId);assert.equal(f.sync('b').players.length,2);
 f.valid.delete('a');assert.equal(f.sync('b').players.length,1);
 f.room.disconnect('b');assert.throws(()=>f.sync('b'),e=>e.status===410);
});
test('乱序请求不会覆盖更新的移动意图',()=>{
 const f=setup();f.sync('a',{type:'direction',x:1,y:0},10);
 f.sync('a',{type:'direction',x:-1,y:0},9);f.advance(100);
 const s=f.sync('b').players.find(p=>p.id===f.a.selfId);
 assert.ok(s.x>f.a.players[0].x);
});

test('十名玩家共享同一据点，出生点合法且不同',()=>{
 const f=setup();
 for(let i=2;i<10;i++){const id=`player_${i}`;f.valid.add(id);f.room.join(id,id);}
 const s=f.sync('a');assert.equal(s.players.length,10);
 assert.equal(new Set(s.players.map(p=>`${p.x},${p.y}`)).size,10);
 for(const p of s.players)assert.ok(canWalk(p.x,p.y));
});
