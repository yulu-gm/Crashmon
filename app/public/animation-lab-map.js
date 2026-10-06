// 动画检查区的逻辑布局，图片不会决定碰撞或出生点。
export const labMap = {
  width:760, height:260, spawn:{x:200,y:160},
  obstacles:[{id:'sample-pillar',x:400,y:75,w:80,h:85,foregroundHeight:42}],
};
export function labCanWalk(x,y) {
  return x>=28&&x<=labMap.width-28&&y>=40&&y<=labMap.height-25&&
    !labMap.obstacles.some(o=>x>o.x-12&&x<o.x+o.w+12&&y>o.y-8&&y<o.y+o.h+8);
}
