// 据点移动是本地表现状态；宠物归属与领取资格来自服务端。
const W = 960, H = 640;
const npc = { x: 480, y: 282 };
const obstacles = [
  { x: 414, y: 33, w: 132, h: 48 },
  { x: 105, y: 90, w: 185, h: 137 }, { x: 680, y: 115, w: 155, h: 112 },
  { x: 96, y: 375, w: 215, h: 122 }, { x: 714, y: 382, w: 150, h: 100 },
];
const trees = [[61,101],[60,200],[58,302],[54,559],[156,571],[257,566],[769,560],[874,565],[903,307],[904,92],[817,65],[612,66],[350,63],[110,50],[893,451]];
const petColors = { starter_a: '#e9975e', starter_b: '#6eafa0', starter_c: '#a594d2' };

export function drawPet(ctx, x, y, id, size = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
  ctx.fillStyle = '#244b4930'; ctx.beginPath(); ctx.ellipse(0, 9, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = petColors[id] ?? '#e9975e';
  ctx.beginPath(); ctx.ellipse(0, -1, 14, 13, 0, 0, Math.PI * 2); ctx.fill();
  if (id === 'starter_a') {
    ctx.beginPath(); ctx.moveTo(-12,-7);ctx.lineTo(-11,-23);ctx.lineTo(-2,-12);ctx.moveTo(12,-7);ctx.lineTo(11,-23);ctx.lineTo(2,-12);ctx.fill();
    ctx.fillStyle='#f8d5a6';ctx.beginPath();ctx.ellipse(0,4,9,6,0,0,Math.PI*2);ctx.fill();
  } else if (id === 'starter_b') {
    ctx.fillStyle='#407e71';ctx.beginPath();ctx.ellipse(0,0,9,9,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#c2dcc0';ctx.beginPath();ctx.ellipse(0,-10,10,7,0,0,Math.PI*2);ctx.fill();
  } else {
    ctx.beginPath();ctx.moveTo(-10,-4);ctx.lineTo(-24,3);ctx.lineTo(-12,8);ctx.moveTo(10,-4);ctx.lineTo(24,3);ctx.lineTo(12,8);ctx.fill();
    ctx.fillStyle='#e8c37d';ctx.beginPath();ctx.moveTo(-3,1);ctx.lineTo(3,1);ctx.lineTo(0,6);ctx.fill();
  }
  ctx.fillStyle='#283a3e';for(const dx of [-5,5]){ctx.beginPath();ctx.arc(dx,-5,1.7,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}

export function createWorld({ onInteract }) {
  const canvas = document.querySelector('#world-canvas');
  const ctx = canvas.getContext('2d');
  const interact = document.querySelector('#interact');
  const root = document.querySelector('#world');
  const keys = new Set();
  let active = false, frame = 0, last = 0, player, catalog = [], near = false, destination = null;
  let position = { x: 480, y: 452 }, scale = 1, offset = { x: 0, y: 0 }, viewport = { w: 960, h: 640 };
  const blocked = () => Boolean(document.querySelector('dialog[open]')) || document.hidden;
  function canWalk(x, y) {
    if (x < 36 || x > 924 || y < 66 || y > 598) return false;
    if (obstacles.some(o => x > o.x - 12 && x < o.x + o.w + 12 && y > o.y - 8 && y < o.y + o.h + 8)) return false;
    if (trees.some(([tx,ty]) => Math.hypot(x-tx,y-ty) < 22)) return false;
    return Math.hypot(x-npc.x,y-npc.y) > 23;
  }
  function updateNear() {
    const next = Math.hypot(position.x-npc.x, position.y-npc.y) < 88;
    if (next !== near) { near = next; interact.hidden = !near; document.querySelector('#nearby-status').textContent = near ? '已靠近引导员，按 E 或点击交谈。' : ''; }
  }
  function move(dx,dy) {
    const previous = { ...position };
    if (canWalk(position.x+dx,position.y)) position.x += dx;
    if (canWalk(position.x,position.y+dy)) position.y += dy;
    updateNear();
    if (destination && Math.hypot(position.x-previous.x,position.y-previous.y) < .01) destination = null;
  }
  function interactWithNpc() { if(active && near && !blocked()) { keys.clear(); destination = null; onInteract(); } }
  interact.onclick = interactWithNpc;
  const input = { w:[0,-1], arrowup:[0,-1], s:[0,1], arrowdown:[0,1], a:[-1,0], arrowleft:[-1,0], d:[1,0], arrowright:[1,0] };
  window.addEventListener('keydown', event => {
    if(!active || blocked() || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)) return;
    const key=event.key.toLowerCase();
    if(key==='e') { event.preventDefault(); interactWithNpc(); return; }
    if(input[key]) { event.preventDefault(); if(!keys.has(key)) move(input[key][0]*5,input[key][1]*5); keys.add(key); destination=null; }
  });
  window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  const clear = () => { keys.clear(); destination=null; };
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  canvas.addEventListener('pointerdown',event=> {
    if(!active || blocked()) return;
    canvas.focus();
    const rect=canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left-offset.x)/scale,y=(event.clientY-rect.top-offset.y)/scale;
    if(Math.hypot(x-npc.x,y-npc.y)<35 && near) return interactWithNpc();
    destination={x:Math.max(36,Math.min(924,x)),y:Math.max(66,Math.min(598,y))};keys.clear();
  });
  function resize() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1,2);
    viewport={w:rect.width,h:rect.height};canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
    scale=rect.width<650?Math.max(rect.width/600,rect.height/800):Math.min(rect.width/W,rect.height/H);
    updateCamera();
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function updateCamera() {
    offset.x=viewport.w<W*scale?Math.max(viewport.w-W*scale,Math.min(0,viewport.w/2-position.x*scale)):(viewport.w-W*scale)/2;
    offset.y=viewport.h<H*scale?Math.max(viewport.h-H*scale,Math.min(0,viewport.h/2-position.y*scale)):(viewport.h-H*scale)/2;
  }
  new ResizeObserver(resize).observe(canvas);
  function ellipse(x,y,rx,ry,color) { ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill(); }
  function round(x,y,w,h,r,color) { ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill(); }
  function label(text,x,y,color='#365f50',size=12) { ctx.font=`600 ${size}px system-ui`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,x,y); }
  function tree(x,y) {
    ellipse(x+5,y+10,30,12,'#355d4324');round(x-5,y-14,10,30,3,'#8f7953');
    ellipse(x,y-27,30,32,'#4d8162');ellipse(x-11,y-35,24,25,'#5d9570');ellipse(x+10,y-40,22,23,'#74a47a');
    ellipse(x-6,y-50,9,4,'#8db48a');
  }
  function person(x,y,npcPerson=false) {
    ellipse(x,y+6,13,5,'#28433538');round(x-8,y-9,6,16,2,'#374f54');round(x+2,y-9,6,16,2,'#374f54');
    round(x-12,y-28,24,24,7,npcPerson?'#e9d5a1':'#578cb1');
    round(x-17,y-23,6,16,3,'#e8bfa1');round(x+11,y-23,6,16,3,'#e8bfa1');
    ellipse(x,y-38,12,13,'#f0caaa');round(x-12,y-50,24,10,5,npcPerson?'#ece0be':'#354c62');
    if(npcPerson)round(x-18,y-44,36,5,2,'#d5bf87');
    ctx.fillStyle='#384d49';ctx.fillRect(x-5,y-37,2,3);ctx.fillRect(x+3,y-37,2,3);
    if(!npcPerson){round(x-9,y-21,18,11,4,'#d8aa6b');round(x-5,y-19,10,5,2,'#c38d53');}
  }
  function house(x,y,w,h,name,color) {
    round(x+9,y+12,w,h,8,'#46684722');round(x,y+30,w,h-25,8,'#f5ecd2');
    round(x-8,y+5,w+16,49,9,color);round(x-8,y+43,w+16,8,3,'#395e5730');
    for(let i=14;i<w;i+=22){ctx.fillStyle='#ffffff16';ctx.fillRect(x+i,y+10,3,30);}
    round(x+w/2-15,y+h-42,30,48,5,'#6a6658');round(x+18,y+64,30,25,5,'#99c4c0');round(x+w-48,y+64,30,25,5,'#99c4c0');
    label(name,x+w/2,y+h+24,'#426553',11);
  }
  function paint(time) {
    updateCamera();
    ctx.clearRect(0,0,viewport.w,viewport.h);ctx.fillStyle='#b4c9a3';ctx.fillRect(0,0,viewport.w,viewport.h);
    ctx.save();ctx.translate(offset.x,offset.y);ctx.scale(scale,scale);
    round(18,28,924,588,35,'#cad6ac');round(28,38,904,568,30,'#bbd19f');
    for(let i=0;i<250;i++){const x=38+(i*137)%885,y=48+(i*79)%550;ctx.fillStyle=i%3?'#95b77e33':'#e8edbd55';ctx.fillRect(x,y,3,2);}
    round(365,53,230,543,26,'#e1d9b5');round(76,248,810,91,26,'#e1d9b5');
    round(342,230,276,169,48,'#e9e1c4');
    for(let i=0;i<9;i++)round(430+(i%2)*8,411+i*19,95,13,5,'#d7cda94d');
    // 上方出口本轮关闭，不制造通往尚未实现内容的假入口。
    round(414,44,132,28,5,'#b9a57a');label('野外 · 筹备中',480,64,'#5f6047',12);
    for(let i=0;i<6;i++)round(413+i*25,33,6,48,2,'#9c8964');
    house(105,90,185,137,'休息屋','#729b91');house(680,115,155,112,'伙伴研究站','#bd9675');
    ellipse(202,438,112,70,'#9cb995');ellipse(202,435,99,57,'#76b6b9');ellipse(202,428,90,48,'#90c8c3');
    for(let i=0;i<4;i++){ctx.strokeStyle='#c4e3d1';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(171+i*20,415+i*8,15,3,0,0,Math.PI);ctx.stroke();}
    for(const [x,y] of [[144,470],[271,413],[116,409]]){ellipse(x,y,12,6,'#6e9c80');ellipse(x-2,y-2,4,3,'#eccebf');}
    round(714,382,150,100,16,'#aac489');
    for(let i=0;i<5;i++){round(728+i*26,404,10,48,3,'#d5d89a');ellipse(733+i*26,406,8,10,['#e7b78c','#e4d4a2'][i%2]);}
    label('伙伴花圃',787,509,'#5f7955',11);
    round(360,178,240,28,9,'#92ac7d');
    for(let i=0;i<3;i++){ellipse(409+i*70,206,22,8,'#e7e3c9');drawPet(ctx,409+i*70,197,catalog[i]?.id,1.05);}
    label('初始伙伴',480,152,'#4a694f',11);
    for(const [x,y] of [[346,355],[635,355]]) { round(x,y,45,13,3,'#ae9669');round(x+5,y+10,4,10,1,'#8b7a58');round(x+36,y+10,4,10,1,'#8b7a58'); }
    // 以脚底纵坐标排序，主角经过树或 NPC 时遮挡关系一致。
    const actors=trees.map(([x,y])=>({y,draw:()=>tree(x,y)}));
    actors.push({y:npc.y,draw:()=>person(npc.x,npc.y,true)},{y:position.y,draw:()=>person(position.x,position.y)});
    actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
    label('引导员',npc.x,npc.y+27,'#426753',11);
    if(!player?.pets?.length){const bob=player?.reducedMotion?0:Math.sin(time/400)*3;round(npc.x+23,npc.y-73+bob,20,24,7,'#fff7d6');label('!',npc.x+33,npc.y-55+bob,'#b58a42',17);}
    if(near){ctx.strokeStyle='#fff4c1';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.ellipse(npc.x,npc.y+7,27,12,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    if(destination){ctx.strokeStyle='#fff9db';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(destination.x,destination.y,9,5,0,0,Math.PI*2);ctx.stroke();}
    label('你',position.x,position.y+26,'#36594d',10);
    ctx.restore();
  }
  function tick(time) {
    if(!active)return;
    const dt=Math.min((time-last)/1000,.04);last=time;
    if(!blocked()) {
      let dx=0,dy=0;for(const key of keys){dx+=input[key][0];dy+=input[key][1];}
      if(!dx&&!dy&&destination){dx=destination.x-position.x;dy=destination.y-position.y;if(Math.hypot(dx,dy)<4){destination=null;dx=dy=0;}}
      const length=Math.hypot(dx,dy);if(length)move(dx/length*150*dt,dy/length*150*dt);
    }else clear();
    paint(time);frame=requestAnimationFrame(tick);
  }
  return {
    show(data,definitions) {
      const changed=player?.userId!==data.userId;player=data;catalog=definitions;
      if(changed){position={x:480,y:452};clear();near=false;interact.hidden=true;}
      root.hidden=false;document.querySelector('#world-name').textContent=data.nickname;
      document.querySelector('#objective').textContent=data.pets.length?'伙伴已加入 · 在据点自由探索':'去广场找引导员，选择第一位伙伴';
      const companion=catalog.find(p=>p.id===data.pets[0]?.definitionId);
      document.querySelector('#team-name').textContent=companion?`${companion.name} · ${companion.role}`:'尚未领取伙伴';
      document.querySelector('#team-note').textContent=companion?'已入队 · 已自动保存':'靠近引导员后按 E 交谈';
      if(!active){active=true;resize();last=performance.now();frame=requestAnimationFrame(tick);}
    },
    hide(){active=false;player=null;clear();cancelAnimationFrame(frame);root.hidden=true;document.querySelector('#nearby-status').textContent='';},
    focus(){canvas.focus();},
    nearNpc:()=>near,
  };
}
