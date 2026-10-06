import { W,H,obstacles,trees } from './hub-map.js';
// 逻辑障碍是布局依据；调整图片尺寸与层次不会改动共享碰撞。
export const sceneAssets={
  terrain:{src:'/assets/scene/terrain.png'},ship:{src:'/assets/scene/ship.png'},
  station:{src:'/assets/scene/station.png',crop:[.14,0,.72,1]},supplies:{src:'/assets/scene/supplies.png',crop:[.13,.03,.76,.93]},
  gate:{src:'/assets/scene/gate.png',crop:[.075,.16,.85,.68]},pool:{src:'/assets/scene/pool.png',crop:[.018,.135,.964,.72]},
  props:{src:'/assets/scene/props.png',columns:3,rows:2},rim:{src:'/assets/scene/rim.png'},
};
const [gate,ship,station,pool,supplies]=obstacles;
const centered=(o,width,height,anchor=.96)=>({x:o.x+o.w/2-width/2,y:o.y+o.h-height*anchor,width,height});
export const landmarks=[
  {id:'resting-ship',asset:'ship',...centered(ship,224,112),sortY:ship.y+ship.h,collision:ship,label:'休息飞船'},
  {id:'research-station',asset:'station',...centered(station,194,180),sortY:station.y+station.h,collision:station,label:'伙伴研究站'},
  {id:'supply-shelter',asset:'supplies',...centered(supplies,174,142,.98),sortY:supplies.y+supplies.h,collision:supplies,label:'补给棚'},
  {id:'expedition-gate',asset:'gate',...centered(gate,158,84,.98),sortY:gate.y+gate.h,collision:gate,label:'野外 · 筹备中'},
];
export const tidePool={id:'tide-pool',asset:'pool',x:pool.x+pool.w/2-112.5,y:pool.y+pool.h/2-66.5,width:225,height:133,collision:pool};
const origins=[[.5,.88],[.5,.88],[.5,.88],[.5,.8],[.47,.85],[.48,.83]];
function prop(id,x,y,frame,width,height,extra={}){const origin=origins[frame];return {id,asset:'props',frame,x:x-width*origin[0],y:y-height*origin[1],width,height,sortY:y,...extra};}
export const coastalObjects=trees.map(([x,y],i)=>prop(`coast-object-${i}`,x,y,i===6||i===8?4:i%3,52,i===6||i===8?75:54,{collision:{x,y,r:22}}));
// 边缘道具的落脚点在行走边界外；岸边前景可遮住角色下部，不新增障碍。
export const edgeObjects=[
  {id:'foreground-coast',asset:'rim',x:0,y:497,width:W,height:W/3,sortY:H+8,foreground:true},
  ...[14,95,218,360,610,795,944].map((x,i)=>prop(`foreground-${i}`,x,H+4,i%3,84,78,{foreground:true})),
  ...[2,184,703,958].map((x,i)=>prop(`backdrop-${i}`,x,30,(i+2)%3,64,66)),
];
// 营地道具放在原有建筑的阻挡范围内，地面位置仍由共享布局定义。
export const campObjects=[
  prop('ship-cases-left',ship.x+28,ship.y+28,3,45,45,{ground:{x:ship.x+28,y:ship.y+28}}),
  prop('ship-cases-right',ship.x+ship.w-32,ship.y+20,3,40,40,{ground:{x:ship.x+ship.w-32,y:ship.y+20}}),
  prop('station-directions',station.x+station.w-17,station.y+58,5,36,55,{ground:{x:station.x+station.w-17,y:station.y+58}}),
];
export const sceneSize={width:W,height:H};
