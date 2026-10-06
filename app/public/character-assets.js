// 人工校准的脚底/骨盆基准：整段动作共享比例，不按每帧包围盒缩放。
const playerOrigins={south:[[.53,.89],[.50,.89],[.48,.89],[.46,.89]],north:[[.53,.915],[.51,.915],[.49,.915],[.47,.915]],west:[[.51,.916],[.51,.916],[.51,.916],[.51,.916]],east:[[.50,.898],[.50,.898],[.50,.898],[.50,.898]]};
const flameOrigins={south:[[.64,.875],[.60,.875],[.59,.875],[.59,.875]],north:[[.68,.875],[.62,.875],[.56,.875],[.51,.875]],west:[[.39,.86],[.39,.86],[.39,.86],[.39,.86]],east:[[.64,.84],[.64,.84],[.64,.84],[.64,.84]]};
const directions=['south','north','west','east'];
export const characterAssets = {
  astronaut: {
    resourceId:'astronaut.map.v1', reference:'/assets/characters/player/model.png',
    worldHeight:66, anchor:[.5,.965], stride:84,
    idle:{src:'/assets/characters/player/model.png',columns:2,rows:2,frames:{south:0,north:1,west:3,east:2},origins:[[.50,.965],[.50,.965],[.47,.923],[.52,.923]]},
    walk:Object.fromEntries(directions.map(d=>[d,{src:`/assets/characters/player/walk-${d}.png`,columns:4,rows:1,count:4,origins:playerOrigins[d],heightScale:d==='south'?1.08:d==='east'?1.06:1.02}])),
    status:'candidate',
  },
  flame: {
    resourceId:'starter_a.map.v1', definitionId:'starter_a', reference:'/assets/characters/flame/model.png',
    worldHeight:53, anchor:[.59,.935], stride:64,
    idle:{src:'/assets/characters/flame/model.png',columns:2,rows:2,frames:{south:0,north:1,west:2,east:3},origins:[[.60,.935],[.46,.935],[.40,.847],[.61,.847]]},
    walk:Object.fromEntries(directions.map(d=>[d,{src:`/assets/characters/flame/walk-${d}.png`,columns:4,rows:1,count:4,origins:flameOrigins[d],heightScale:d==='east'?1.23:d==='west'?1.14:1.06}])),
    battle:{
      resourceId:'starter_a.battle.v1',
      idle:{src:'/assets/characters/flame/model.png',columns:2,rows:2,frame:3,frames:{west:2,east:3},origins:[[.60,.935],[.46,.935],[.40,.854],[.61,.854]]},
      // 原图实际分隔不等宽：第三帧鼻尖到 x=1693，不能在 x=1629 截断。
      tackle:{src:'/assets/characters/flame/tackle.png',columns:4,rows:1,referenceHeight:724,rects:[[0,0,528,724],[528,0,562,724],[1090,0,614,724],[1704,0,468,724]],count:4,durations:[190,110,100,240],origins:[[.607,.83],[.607,.83],[.515,.83],[.618,.83]],heightScale:1.3,events:[{at:300,type:'impact'}]},
      sneeze:{src:'/assets/characters/flame/sneeze.png',columns:4,rows:1,referenceHeight:724,rects:[[0,0,558,724],[558,0,515,724],[1073,0,562,724],[1635,0,537,724]],count:4,durations:[280,180,100,300],origins:[[.613,.865],[.646,.865],[.632,.865],[.635,.865]],heightScale:1.1,events:[{at:460,type:'flame'}],mouth:[[.817,.33],[.868,.26],[.831,.42],[.832,.37]]},
    },
    status:'candidate',
  },
};

// 四视图为地图待机；左右战斗姿势是真实绘制，挎包等不对称物件不镜像。
const newPartners=[
  ['turtle','starter_b',58,100,[[.54,.928],[.49,.921],[.53,.788],[.48,.79]],[[0,0,513,512],[513,0,518,512],[1031,0,505,512],[0,512,492,512],[492,512,510,512],[1002,512,534,512]],[[.5,.933],[.49,.933],[.49,.933],[.53,.856],[.52,.856],[.51,.856]],1],
  ['bird','starter_c',45,90,[[.56,.968],[.47,.957],[.44,.885],[.57,.885]],[[0,0,525,512],[525,0,519,512],[1044,0,492,512],[0,512,516,512],[516,512,515,512],[1031,512,505,512]],[[.57,.976],[.54,.976],[.57,.976],[.47,.86],[.46,.86],[.49,.86]],1.06],
  ['scout','wild_scout',43,85,[[.55,.96],[.47,.954],[.5,.826],[.46,.826]],null,[[.58,.897],[.54,.897],[.54,.897],[.5,.784],[.5,.784],[.51,.784]],1.13],
  ['shell','wild_shell',59,98,[[.54,.895],[.48,.895],[.52,.722],[.45,.722]],null,[[.55,.953],[.5,.953],[.54,.953],[.53,.833],[.53,.833],[.54,.833]],1],
];
for(const [id,definitionId,worldHeight,battleHeight,origins,rects,poseOrigins,poseScale] of newPartners){
  const idle={src:`/assets/characters/${id}/model.png`,columns:2,rows:2,frames:{south:0,north:1,west:2,east:3},origins};
  characterAssets[id]={resourceId:`${definitionId}.map.v1`,definitionId,reference:idle.src,worldHeight,battleHeight,anchor:[.5,.9],idle,idleMotion:{amplitude:id==='bird'?.022:.014,period:id==='turtle'?850:600},walk:{},
    battle:{resourceId:`${definitionId}.battle.v1`,idle:{...idle,frame:3},poses:{src:`/assets/characters/${id}/poses.png`,columns:3,rows:2,count:6,referenceHeight:512,...(rects?{rects}:{}),origins:poseOrigins??[[.5,.9],[.5,.9],[.5,.9],[.5,.9],[.5,.9],[.5,.9]],heightScale:poseScale}},status:'candidate'};
}
characterAssets.flame.battleHeight=100;
export const speciesCharacters=Object.fromEntries(Object.entries(characterAssets).filter(([,a])=>a.definitionId).map(([key,a])=>[a.definitionId,key]));
