export const W = 960, H = 640;
export const npc = { x: 480, y: 282 };
export const obstacles = [
  { x: 414, y: 33, w: 132, h: 48 },
  { x: 105, y: 90, w: 185, h: 137 }, { x: 680, y: 115, w: 155, h: 112 },
  { x: 96, y: 375, w: 215, h: 122 }, { x: 714, y: 382, w: 150, h: 100 },
];
export const trees = [[61,101],[60,200],[58,302],[54,559],[156,571],[257,566],[769,560],[874,565],[903,307],[904,92],[817,65],[612,66],[350,63],[110,50],[893,451]];

export function canWalk(x, y) {
    if (x < 36 || x > 924 || y < 66 || y > 598) return false;
    if (obstacles.some(o => x > o.x - 12 && x < o.x + o.w + 12 && y > o.y - 8 && y < o.y + o.h + 8)) return false;
    if (trees.some(([tx,ty]) => Math.hypot(x-tx,y-ty) < 22)) return false;
    return Math.hypot(x-npc.x,y-npc.y) > 23;
  }

export const SPEED = 150;
