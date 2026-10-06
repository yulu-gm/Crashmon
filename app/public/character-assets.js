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
      idle:{src:'/assets/characters/flame/tackle.png',columns:4,rows:1,frame:3,origins:[[.64,.83],[.64,.83],[.64,.83],[.64,.83]]},
      tackle:{src:'/assets/characters/flame/tackle.png',columns:4,rows:1,count:4,durations:[190,110,100,240],origins:[[.59,.83],[.60,.83],[.59,.83],[.67,.83]],heightScale:1.1,events:[{at:300,type:'impact'}]},
      sneeze:{src:'/assets/characters/flame/sneeze.png',columns:4,rows:1,count:4,durations:[280,180,100,300],origins:[[.63,.865],[.64,.865],[.63,.865],[.64,.865]],heightScale:1.02,events:[{at:460,type:'flame'}],mouth:[[.84,.33],[.85,.26],[.86,.42],[.84,.37]]},
    },
    status:'candidate',
  },
};
