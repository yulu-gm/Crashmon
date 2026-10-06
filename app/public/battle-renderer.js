import { loadCharacterImages } from './character-renderer.js';
import {drawCreature,presentationTimeline,actionDuration,impactAt} from './creature-animation.js';
export const monsterImagesReady=loadCharacterImages();
const palette={starter_a:'#ed9453',starter_b:'#81bda0',starter_c:'#bbabdf',wild_scout:'#eed078',wild_shell:'#83bfc8',boss_scrap_sorter:'#aaafa4'};
export function drawMonster(ctx,x,y,id,size=1,{facing=1,time=0,active=false,shield=0,hit=false,skillId=null,elapsed=Infinity,reduced=true,guides=false}={}) {
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.lineWidth=2;ctx.strokeStyle='#34434a';ctx.lineJoin='round';
  const oval=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();};
  const path=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();};
  oval(0,4,30,8,'#172a3930');
  if(drawCreature(ctx,id,0,0,{facing,time,skillId,elapsed,reduced,guides})){}else{
    ctx.save();ctx.scale(facing,1);
    const color=hit?'#fff6d5':palette[id]??'#a4b6ad';
    if(id==='starter_b'){
      oval(-21,-4,9,7,'#9fbd84');oval(19,-4,9,7,'#9fbd84');oval(0,-21,30,22,color);path([[-30,-25],[-21,-49],[0,-64],[25,-44],[33,-24]],'#577e62');path([[-25,-28],[0,-53],[25,-28]],'#a6bc7e');oval(25,-18,13,12,'#a8c58a');
    }else if(id==='starter_c'){
      path([[-17,-20],[-43,-36],[-35,-6],[-14,-5]],color);path([[14,-20],[40,-36],[34,-5],[14,-5]],color);oval(0,-26,19,27,color);path([[-8,-48],[0,-66],[8,-48]],'#f6d897');path([[13,-29],[31,-22],[14,-18]],'#e9bd71');path([[-7,-9],[-14,4],[0,-4],[13,4],[7,-9]],'#796c9e');
    }else if(id==='wild_scout'){
      path([[-15,-39],[-16,-62],[-10,-62],[-6,-40]],color);path([[7,-40],[15,-59],[20,-56],[14,-37]],color);oval(-1,-24,25,25,color);oval(-16,-2,12,7,'#d3a867');oval(20,-3,12,7,'#d3a867');path([[-24,-27],[-35,-15],[-30,-3],[-14,-9]],'#526f86');oval(9,-30,15,15,'#566c78');oval(9,-30,11,11,'#c3e1d9');
    }else if(id==='wild_shell'){
      oval(-21,-1,11,7,'#9db4bd');oval(22,-1,11,7,'#9db4bd');ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-29,-48,58,45,10);ctx.fill();ctx.stroke();path([[-29,-38],[0,-53],[29,-38],[0,-27]],'#c5d9d0');path([[0,-27],[0,-4],[29,-16],[29,-38]],'#6497a6');path([[-13,-46],[-2,-53],[12,-47],[0,-40]],'#e9cb87');oval(1,-11,15,10,'#ccdccc');
    }else if(id==='boss_scrap_sorter'){
      oval(-25,-3,14,9,'#6a7c83');oval(25,-3,14,9,'#6a7c83');ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-35,-65,70,60,9);ctx.fill();ctx.stroke();path([[-34,-53],[0,-73],[36,-53],[0,-42]],'#d3ba8f');oval(-40,-26,12,20,'#7f9193');oval(40,-26,12,20,'#7f9193');
    }else{oval(0,-25,25,27,color);path([[-21,-38],[-25,-62],[-7,-44]],color);path([[10,-46],[28,-61],[23,-33]],color);path([[-20,-21],[-49,-43],[-40,-7],[-16,-6]],'#f5c36b');}
    ctx.fillStyle='#263946';for(const dx of (id==='wild_scout'?[9]:[-6,7])){ctx.beginPath();ctx.arc(dx+(id==='starter_b'?25:0),id==='starter_b'?-20:-29,2.7,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#5b6261';ctx.beginPath();ctx.arc(id==='starter_b'?27:1,id==='starter_b'?-17:-23,4,0,Math.PI);ctx.stroke();
    ctx.restore();
  }
  if(shield){ctx.strokeStyle='#8ee2dd';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,-29,42,47,0,0,Math.PI*2);ctx.stroke();}
  if(active){ctx.strokeStyle='#f6cf78';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,6,37,11,0,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
// 槽号来自本场固定阵营顺序，不改物种名和永久宠物身份。
export function battleUnitLabel(state,unit){if(!unit)return '';const slot=state.units.filter(u=>u.side===unit.side).findIndex(u=>u.id===unit.id)+1;return `${unit.name}·${unit.side==='player'?'我':'敌'}${slot}`;}
// 两个明确阵营：桌面左下/右上，窄屏上敌下我；Canvas 与 DOM 共用坐标。
export function battleLayout(state,width) {
  const narrow=width<620,scale=narrow?.65:.76;
  const bodyHeights={starter_a:100,starter_b:94,starter_c:96,wild_scout:92,wild_shell:78,boss_scrap_sorter:73};
  const groups=['enemy','player'].map(side=>{
    const units=state.units.filter(u=>u.side===side),rowHeights=[];
    for(let row=0;row<Math.ceil(units.length/2);row++){
      const members=units.slice(row*2,row*2+2);
      rowHeights.push(Math.ceil(Math.max(...members.map(u=>{
        const statusLines=u.captured||u.hp<=0?1:Math.ceil((u.statuses?.length??0)/3);
        return (bodyHeights[u.speciesId]??73)*scale+32+8+16+statusLines*14+(u.shield?.amount?12:0);
      }))));
    }
    return {side,units,rowHeights,height:rowHeights.reduce((a,b)=>a+b,0)};
  });
  const enemy=groups[0],player=groups[1];
  enemy.top=12;
  player.top=narrow?enemy.top+enemy.height+36:76;
  const height=Math.max(narrow?260:300,...groups.map(g=>g.top+g.height+28));
  const placements=[],camps=[];
  for(const group of groups){
    const center=narrow?.5:group.side==='player'?.23:.77;
    const step=width*(narrow?.44:.185);
    const slotWidth=Math.min(narrow?150:172,width*(narrow?.44:.175));
    group.units.forEach((unit,index)=>{
      const row=Math.floor(index/2),column=index%2,rowCount=Math.min(2,group.units.length-row*2);
      const top=group.top+group.rowHeights.slice(0,row).reduce((a,b)=>a+b,0),slotHeight=group.rowHeights[row];
      const x=width*center+(column-(rowCount-1)/2)*step,y=top+slotHeight-14;
      const hudBottom=y-top-(bodyHeights[unit.speciesId]??73)*scale-8;
      placements.push({id:unit.id,x,y,top,width:slotWidth,height:slotHeight-5,scale,hudBottom});
    });
    camps.push({side:group.side,x:width*center,top:group.top,height:group.height,width:width*(narrow?.91:.43),labelY:group.top+group.height+12});
  }
  return {width,height,placements,camps};
}
export function createBattleRenderer(canvas,{onLayout=()=>{},selectedId=null}={}) {
  const ctx=canvas.getContext('2d');let state=null,frame=0,started=0,reduced=false,animateEvents=false,timeline=[];
  function paint(now){
    if(!state)return;const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);const layout=battleLayout(state,rect.width);onLayout(layout);const cw=Math.round(layout.width*dpr),ch=Math.round(layout.height*dpr);if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}ctx.setTransform(dpr,0,0,dpr,0,0);const w=layout.width,h=layout.height;
    const age=now-started,segment=animateEvents&&!reduced?timeline.find(s=>age>=s.start&&age<s.start+actionDuration):null;
    const localAge=segment?age-segment.start:Infinity,feedback=localAge>=impactAt&&localAge<impactAt+260;
    const horizon=Math.min(96,h*.3);const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#627d86');sky.addColorStop(horizon/h,'#b0bcb0');sky.addColorStop((horizon+1)/h,'#cbb69a');sky.addColorStop(1,'#917c69');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#ead4a5';ctx.beginPath();ctx.arc(w*.7,horizon*.3,20,0,Math.PI*2);ctx.fill();
    for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#708785':'#8fa19a';ctx.beginPath();ctx.moveTo(i*w/5-100,horizon);ctx.lineTo(i*w/5+25,horizon*.25);ctx.lineTo(i*w/5+140,horizon);ctx.fill();}
    for(const camp of layout.camps){
      const friendly=camp.side==='player';
      ctx.fillStyle=friendly?'#539c8b19':'#b17b5d18';ctx.strokeStyle=friendly?'#b6e9d66b':'#f1c29275';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.ellipse(camp.x,camp.top+camp.height*.65,camp.width*.47,Math.max(21,camp.height*.36),0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.font='600 11px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#4a594a80';
      const label=friendly?'我方':'敌方';ctx.strokeText(label,camp.x,camp.labelY);ctx.fillStyle=friendly?'#dcfff0':'#fff0d2';ctx.fillText(label,camp.x,camp.labelY);
    }
    for(const side of ['player','enemy']){
      const units=state.units.filter(u=>u.side===side);units.forEach((u,i)=>{
        const {x,y,scale}=layout.placements.find(p=>p.id===u.id);const changed=segment?.events.some(e=>(e.type==='damage'||e.type==='dot')&&e.targetId===u.id);const hit=feedback&&changed,acting=segment?.actorId===u.id;
        ctx.globalAlpha=u.captured?.25:u.hp<=0?.35:1;
        drawMonster(ctx,x+(hit?Math.sin(localAge*.08)*3:0),y,u.speciesId,scale,{facing:side==='enemy'?-1:1,time:now,active:u.id===state.currentActorId,shield:u.shield?.amount,hit,skillId:acting?segment.skillId:null,elapsed:localAge,reduced});
        if(feedback&&segment.events.some(e=>e.targetId===u.id&&['shield','capture','status','damage'].includes(e.type))){ctx.strokeStyle=hit?'#ffe9b5':'#a9e9dd';ctx.lineWidth=2;const r=16+(localAge-impactAt)*.07;ctx.beginPath();ctx.arc(x,y-32,r,0,Math.PI*2);ctx.stroke();}
        if(u.id===selectedId){ctx.strokeStyle='#8ee8f0';ctx.lineWidth=3;ctx.setLineDash([4,3]);ctx.beginPath();ctx.ellipse(x,y+3,35*scale,12*scale,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}ctx.globalAlpha=1;
      });
    }
    if(!reduced&&!document.hidden)frame=requestAnimationFrame(paint);
  }
  const repaint=()=>{cancelAnimationFrame(frame);if(state)paint(performance.now());};
  const observer=new ResizeObserver(repaint);observer.observe(canvas);document.addEventListener('visibilitychange',repaint);loadCharacterImages({battle:true}).then(repaint);
  return {show(value,reduce,playEvents=true,elapsed=0){state=value;animateEvents=playEvents;timeline=presentationTimeline(state.events);reduced=reduce||matchMedia('(prefers-reduced-motion: reduce)').matches;started=performance.now()-elapsed;repaint();},stop(){state=null;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',repaint);}};
}
