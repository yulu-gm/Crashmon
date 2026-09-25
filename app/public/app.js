import { createRoomClient } from './room-client.js';
import { createWorld, drawPet } from './world.js';
const $ = selector => document.querySelector(selector);
let mode = 'login';
let player = null;
let pendingSave = null;
let busy = false;
let catalog = [];
let selected = null;
let claimRequest = null;
let confirmation = false;
let claiming = false;
$('#profile-dialog').append($('#profile'));
document.body.append($('#status'));
const world = createWorld({ onInteract: openStarter, onMove: input => room.input(input) });
const room = createRoomClient({ api, snapshot: data => world.roomSnapshot(data), state: state => world.connection(state), expired: error => { showAuth(); status(error.message,true); } });
const status = (text = '', error = false) => {
  ($('#profile-dialog').open ? $('#profile-dialog') : document.body).append($('#status'));
  $('#status').textContent = text; $('#status').classList.toggle('error', error);
};
async function api(path, method = 'GET', body, options = {}) {
  const response = await fetch(path, { method, signal: options.signal, keepalive: options.keepalive ?? false, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Crashmon-Request': '1', ...(player ? { 'X-Crashmon-Player': player.userId } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error); error.status = response.status; throw error; }
  return data;
}
function showAuth() {
  room.stop(); world.hide(); document.body.classList.remove('in-world');
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  catalog = []; selected = null; claimRequest = null;
  player = null; pendingSave = null;
  $('#profile-form').reset(); $('#greeting').textContent = ''; $('#saved-time').textContent = '';
  document.body.classList.remove('reduced-motion');
  $('#profile').hidden = true; $('#auth').hidden = false;
}
function showPlayer(data) {
  const entering=player?.userId!==data.userId;
  player = data;
  document.body.classList.add('in-world');
  world.show(data, catalog);
  if(entering)room.start();
  $('#auth').hidden = true; $('#profile').hidden = false;
  $('#auth-form').reset();
  $('#greeting').textContent = `你好，${data.nickname}`;
  const form = $('#profile-form');
  form.elements.nickname.value = data.nickname;
  form.elements.soundEnabled.checked = data.soundEnabled;
  form.elements.reducedMotion.checked = data.reducedMotion;
  document.body.classList.toggle('reduced-motion', data.reducedMotion);
  $('#saved-time').textContent = `已保存 · ${new Date(data.savedAt).toLocaleString('zh-CN')}`;
}
function setMode(value) {
  mode = value;
  const register = mode === 'register';
  $('#auth-form').reset();
  $('#login-tab').classList.toggle('selected', !register); $('#login-tab').setAttribute('aria-pressed', String(!register));
  $('#register-tab').classList.toggle('selected', register); $('#register-tab').setAttribute('aria-pressed', String(register));
  $('#invite-field').hidden = !register;
  $('#auth-form').elements.invite.required = register;
  $('#auth-form').elements.password.minLength = register ? 12 : 1;
  $('#auth-form').elements.password.autocomplete = register ? 'new-password' : 'current-password';
  $('#auth-form').elements.password.placeholder = register ? '设置 12–128 个字符的密码' : '输入你的密码';
  $('#auth-title').textContent = register ? '开启你的冒险' : '欢迎回来';
  $('#auth-description').textContent = register ? '使用邀请码，为你的旅程建立独立档案。' : '登录后，继续查看你的冒险档案。';
  $('#auth-submit').textContent = register ? '创建账号 →' : '登录并读取档案 →';
  status();
}
async function action(fn) {
  if (busy) return;
  busy = true; document.querySelectorAll('button, input').forEach(el => el.disabled = true);
  try { await fn(); }
  catch (error) {
    if (error.status === 401) showAuth();
    status(error.status ? error.message : '暂时无法连接。保存可能已完成，请重试原保存或重新读取档案。', true);
  } finally { busy = false; document.querySelectorAll('button, input').forEach(el => el.disabled = false); }
}
$('#login-tab').onclick = () => setMode('login');
$('#register-tab').onclick = () => setMode('register');
$('#auth-form').onsubmit = event => {
  event.preventDefault();
  const form = event.currentTarget;
  const body = { username: form.elements.username.value, password: form.elements.password.value };
  if (mode === 'register') body.invite = form.elements.invite.value.trim();
  action(async () => {
    status(mode === 'register' ? '正在创建账号…' : '正在读取档案…');
    if (mode === 'register') {
      await api('/api/register', 'POST', body);
      setMode('login'); form.elements.username.value = body.username;
      status('账号已创建。请使用刚才的密码登录。'); form.elements.password.focus();
    } else { const data = await api('/api/login', 'POST', body); catalog = await api('/api/starters'); showPlayer(data); status('已恢复档案，欢迎来到据点。'); world.focus(); }
  });
};
$('#profile-form').onsubmit = event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = { nickname: form.elements.nickname.value.trim(), soundEnabled: form.elements.soundEnabled.checked, reducedMotion: form.elements.reducedMotion.checked, revision: player.revision };
  if (!pendingSave || JSON.stringify(values) !== JSON.stringify(pendingSave.values)) pendingSave = { values, requestId: crypto.randomUUID() };
  const body = { ...pendingSave.values, requestId: pendingSave.requestId };
  action(async () => {
    status('正在保存…');
    await api('/api/player', 'PATCH', body);
    // 重试回执可能对应较早版本，再读取最新状态，避免显示旧档案。
    showPlayer(await api('/api/player')); pendingSave = null;
    status('保存成功，下次登录将继续使用这份档案。');
  });
};
$('#reload').onclick = () => action(async () => { showPlayer(await api('/api/player')); pendingSave = null; status('已读取最新存档。'); });
$('#logout').onclick = () => action(async () => { await api('/api/logout', 'POST', {}); showAuth(); status('已退出登录，档案已保留。'); });
// 页面重入和浏览器后退缓存恢复时重新验证服务端会话。
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
await action(async () => {
  try { const data = await api('/api/player'); catalog = await api('/api/starters'); showPlayer(data); status(); }
  catch (error) { showAuth(); if (error.status !== 401) throw error; status(); }
});


$('#reconnect-room').onclick=()=>room.start();
window.addEventListener('pagehide',()=>room.stop());
$('#open-profile').onclick = () => { status(); $('#profile-dialog').showModal(); };
$('#close-profile').onclick = () => $('#profile-dialog').close();
$('#profile-dialog').addEventListener('close', () => { document.body.append($('#status')); status(); world.focus(); });
$('#starter-dialog').addEventListener('close', () => world.focus());
$('#close-starter').onclick = () => { if(!claiming) $('#starter-dialog').close(); };
$('#starter-dialog').addEventListener('cancel', event => { if(claiming) event.preventDefault(); });
function openStarter() {
  if(!player || claiming || !world.nearNpc()) return;
  status(); confirmation=false; selected=null; claimRequest=null;
  $('#starter-error').textContent='';
  const owned = player.pets[0];
  $('#starter-choices').hidden=Boolean(owned);$('#starter-confirm').hidden=!owned;$('#back-to-choices').hidden=true;
  $('#choose-starter').disabled=!owned;
  $('#choose-starter').textContent=owned?'继续探索':'选择这位伙伴';
  $('#starter-title').textContent=owned?'伙伴已经在你的队伍里。':'每段冒险，都从相遇开始。';
  $('#starter-copy').textContent=owned?'很高兴再次见到你。可以在据点自由走走，野外探索将在后续开放。':'先认识它们，再选一位与你出发。你可以来回比较，不必急着决定。';
  $('#starter-note').textContent=owned?'伙伴已自动保存，退出或重新登录都不会丢失。':'外观与定位为原型占位。每个账号只能领取一次，最终确认后不能重选。';
  if(owned) $('#starter-confirm').textContent=`${catalog.find(p=>p.id===owned.definitionId)?.name ?? owned.definitionId} · 已加入队伍`;
  else renderChoices();
  $('#starter-dialog').showModal();
}
function renderChoices() {
  const grid=$('#starter-grid');grid.replaceChildren();
  $('#starter-detail').textContent='选择一位伙伴，看看它的特点。';
  for(const pet of catalog) {
    const button=document.createElement('button');button.type='button';button.className='starter-card';button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',`${pet.name}，${pet.role}`);
    const preview=document.createElement('canvas');preview.width=180;preview.height=110;preview.setAttribute('aria-hidden','true');drawPet(preview.getContext('2d'),90,62,pet.id,2.4);
    const name=document.createElement('strong');name.textContent=pet.name;
    const role=document.createElement('span');role.textContent=pet.role;button.append(preview,name,role);
    button.onclick=()=>{
      selected=pet;claimRequest=null;grid.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      $('#starter-detail').textContent=pet.description;const detail=document.createElement('small');detail.textContent=pet.feature;$('#starter-detail').append(detail);$('#choose-starter').disabled=false;
    };grid.append(button);
  }
}
$('#back-to-choices').onclick=()=>{
  confirmation=false;$('#starter-choices').hidden=false;$('#starter-confirm').hidden=true;$('#back-to-choices').hidden=true;$('#choose-starter').textContent='选择这位伙伴';$('#starter-error').textContent='';
};
$('#choose-starter').onclick=async()=>{
  if(claiming)return;
  if(player.pets.length){$('#starter-dialog').close();return;}
  if(!selected)return;
  if(!confirmation){confirmation=true;$('#starter-choices').hidden=true;$('#starter-confirm').hidden=false;$('#starter-confirm').textContent=`确定与 ${selected.name} 一起出发吗？确认后，这位伙伴将永久加入你的队伍，初始选择不能更改。`;$('#back-to-choices').hidden=false;$('#choose-starter').textContent='确认领取';return;}
  claiming=true;claimRequest??=crypto.randomUUID();$('#starter-error').textContent='正在接收伙伴，请稍候…';
  $('#starter-dialog').querySelectorAll('button').forEach(b=>b.disabled=true);
  try {
    await api('/api/starter','POST',{definitionId:selected.id,requestId:claimRequest});
    const latest=await api('/api/player');showPlayer(latest);
    $('#starter-dialog').close();status(`${selected.name} 已加入队伍，领取结果已自动保存。`);
  }catch(error){
    if(error.status===401){showAuth();status(error.message,true);}
    else if(error.status===409){
      try {const latest=await api('/api/player');showPlayer(latest);$('#starter-dialog').close();status(error.message,true);}
      catch {$('#starter-error').textContent='请关闭对话并重新登录，恢复最新领取结果。';}
    }else $('#starter-error').textContent=error.status?error.message:'连接中断，结果可能已保存。点击确认可安全重试，不会重复领取。';
  }finally{claiming=false;$('#starter-dialog').querySelectorAll('button').forEach(b=>b.disabled=false);}
};
