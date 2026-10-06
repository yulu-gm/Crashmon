// 只管理表现状态：世界位置与碰撞仍由共享据点决定。
const directions = { east:[1,0], west:[-1,0], south:[0,1], north:[0,-1] };
export function createMotion(direction = 'south') {
  return { direction, phase:0, moving:false, speed:0 };
}
export function advanceMotion(state, dx, dy, dt, stride = 84) {
  const distance = Math.hypot(dx,dy);
  // 网络跳跃与重新定位不累计为脚步；dt 异常也不加速播放。
  if(dt <= 0 || dt > .2 || distance > Math.max(12,dt*450)) {
    state.moving=false; state.speed=0; return state;
  }
  state.speed=distance/dt;
  state.moving=state.speed>3;
  if(!state.moving) return state;
  const dominant=Math.abs(dx)>Math.abs(dy) ? (dx>0?'east':'west') : (dy>0?'south':'north');
  const [fx,fy]=directions[state.direction];
  // 在斜向边界保留朝向，避免网络微小修正导致反复转身。
  if(dx*fx+dy*fy < Math.max(Math.abs(dx),Math.abs(dy))*.82) state.direction=dominant;
  state.phase=(state.phase+distance/stride)%1;
  return state;
}
export function motionFrame(state, count) {
  return state.moving ? Math.floor(state.phase*count)%count : 0;
}
