// 小规模据点使用同源 HTTP 短轮询；每个页面最多一个在途请求。
export function createRoomClient({ api, snapshot, state, expired }) {
  let generation = 0, timer, connectionId, sequence = 0, input = { type:'stop' }, running = false, pending = null;
  async function cycle(g) {
    if (g !== generation || !running) return;
    const controller=new AbortController();pending=controller;
    const timeout=setTimeout(()=>controller.abort(),3000);
    try {
      const data = connectionId
        ? await api('/api/room/sync','POST',{connectionId,sequence:sequence++,input},{signal:controller.signal})
        : await api('/api/room/join','POST',{},{signal:controller.signal});
      if (g !== generation) return;
      connectionId=data.connectionId; snapshot(data); state('online');
      timer=setTimeout(()=>cycle(g),100);
    } catch(error) {
      if (g !== generation) return;
      input={type:'stop'};
      if(error.status===401){running=false;state('offline');expired(error);return;}
      if(error.status===409){running=false;state('replaced');return;}
      connectionId=null;state('offline');timer=setTimeout(()=>cycle(g),error.status===410?100:1200);
    } finally { clearTimeout(timeout); if(pending===controller)pending=null; }
  }
  function stop() {
    const old=connectionId;generation++;pending?.abort();pending=null;running=false;clearTimeout(timer);connectionId=null;input={type:'stop'};
    if(old) api('/api/room/leave','POST',{connectionId:old},{keepalive:true}).catch(()=>{});
  }
  return {
    start(){stop();running=true;sequence=0;state('connecting');cycle(generation);},
    stop,
    input(value){input=value;},
  };
}
