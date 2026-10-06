import {drawMonster,createBattleRenderer,battleUnitLabel,monsterImagesReady} from './battle-renderer.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn,cls='')=>{const n=el('button',text,cls);n.type='button';n.onclick=fn;return n;};
const names={burn:'灼烧',mark:'标记',guard:'防御',defend:'防御',atkUp:'攻击提升',atkDown:'攻击降低',defUp:'防御提升',defDown:'破绽',haste:'加速',slow:'减速',speedUp:'加速',speedDown:'减速',defenseDown:'破绽',attackUp:'振奋'};
export function createBattleClient({api,getPlayer,setPlayer,onExpired}) {
  let pets=[],encounters=[],battle=null,busy=false,pending=null,selected=null,command=null,teamDraft=null,editingTeam=false,lastUser=null;
  const dialog=el('dialog',undefined,'expedition-dialog');dialog.setAttribute('aria-label','星野探索与伙伴');document.body.append(dialog);
  const head=el('div',undefined,'expedition-head'),title=el('h2','星野探索'),close=button('返回营地',()=>dialog.close(),'quiet');head.append(title,close);
  const notice=el('p',undefined,'expedition-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const navigation=el('nav',undefined,'expedition-tabs'),body=el('div');dialog.append(head,navigation,notice,body);
  const launcher=button('探索 · 伙伴',()=>open(),'expedition-launch');const bagLauncher=button('Crashmon背包',()=>open('team'),'expedition-launch');document.querySelector('.world-tools').prepend(launcher,bagLauncher);
  let page='explore',renderer=null,lastSurface=null,lastAnimatedRevision=null,lastAnimationAt=0;dialog.addEventListener('close',()=>{renderer?.stop();launcher.focus();});
  const error=e=>{notice.textContent=e.status?e.message:'连接中断。结果可能已保存，请点击「重试上次操作」安全重试。';notice.classList.add('error');if(e.status===401)onExpired(e);};
  const key=()=>`crashmon.pending.${getPlayer()?.userId}`;
  function savePending(){try{if(pending)sessionStorage.setItem(key(),JSON.stringify(pending));else sessionStorage.removeItem(key());}catch{}}
  function clearPending(){pending=null;savePending();}
  async function refresh(){const user=getPlayer()?.userId;const result=await api('/api/battle');if(getPlayer()?.userId!==user)return result;battle=result.battle;if(result.player)setPlayer(result.player);return result;}
  async function write(path,method,values){
    if(busy)return;
    if(pending){notice.textContent='上次操作尚未确认，请先重试或读取最新进度。';render();return;}
    pending={path,method,body:{...values,requestId:crypto.randomUUID()}};savePending();await retry();
  }
  async function retry(){if(!pending||busy)return;busy=true;notice.textContent='正在保存行动…';notice.classList.remove('error');render();
    try{await api(pending.path,pending.method,pending.body,{signal:AbortSignal.timeout(15000)});clearPending();await refresh();notice.textContent='已自动保存。';selected=null;command=null;teamDraft=null;editingTeam=false;if(battle?.phase!=='finished'&&battle)page='battle';render();}
    catch(e){if(e.status&&e.status!==503&&e.status<500){clearPending();try{await refresh();}catch{}}error(e);render();}
    finally{busy=false;render();}
  }
  async function readLatest(){if(busy)return;busy=true;try{await refresh();clearPending();command=null;selected=null;notice.textContent='已恢复最新进度。';render();}catch(e){error(e);}finally{busy=false;render();}}
  async function open(which='explore'){
    if(!getPlayer())return;lastSurface=null;page=which;if(which==='team'){editingTeam=false;teamDraft=null;}if(!dialog.open)dialog.showModal();notice.textContent='正在读取探索档案…';try{await load();await refresh();if(which==='explore'&&battle&&battle.phase!=='finished')page='battle';notice.textContent='';render();}catch(e){error(e);}
  }
  async function load(){if(pets.length)return;const data=await api('/api/battle-content');pets=Array.isArray(data.pets)?data.pets:Object.values(data.pets);encounters=Array.isArray(data.encounters)?data.encounters:Object.values(data.encounters);}
  function pet(id){return pets.find(p=>p.id===id)||{name:id==='boss_scrap_sorter'?'废铁整理员':'未知伙伴',skills:[],stats:{}};}
  const unitLabel=unit=>battleUnitLabel(battle,unit);
  function render(){
    const surface=page==='battle'?`battle:${battle?.id??''}`:page;const resetScroll=surface!==lastSurface;lastSurface=surface;
    renderer?.stop();renderer=null;body.replaceChildren();navigation.replaceChildren();
    for(const [id,label] of [['explore','出发探索'],['team','Crashmon背包'],['dex','伙伴图鉴'],...(battle?[['battle',battle.phase==='finished'?'战斗结果':'继续战斗']]:[])]){const b=button(label,()=>{page=id;teamDraft=null;editingTeam=false;command=null;selected=null;render();});b.setAttribute('aria-pressed',String(id===page));navigation.append(b);}
    close.disabled=busy;
    if(pending){const recovery=el('div',undefined,'pending-action');recovery.append(el('span','有一项操作等待确认。'),button('重试上次操作',retry),button('读取最新进度',readLatest,'quiet'));body.append(recovery);}
    if(page==='battle'&&battle)renderBattle();else if(page==='team')renderTeam();else if(page==='dex')renderDex();else renderExplore();
    if(busy)body.querySelectorAll('button,input,select').forEach(n=>n.disabled=true);
    if(resetScroll)dialog.scrollTop=0;
  }
  function portrait(p){const c=el('canvas',undefined,'pet-portrait');c.width=240;c.height=170;c.setAttribute('aria-hidden','true');const paint=()=>{const ctx=c.getContext('2d');ctx.clearRect(0,0,240,170);drawMonster(ctx,120,145,p.id,1.5);};paint();monsterImagesReady.then(()=>{if(c.isConnected)paint();});return c;}
  function petCard(p,full=false){const card=el('article',undefined,'pet-sheet');card.append(portrait(p),el('h3',p.name),el('p',p.role,'pet-role'),el('p',p.description));
    const stats=p.stats??{};card.append(el('p',`生命 ${stats.hp??'—'} · 攻击 ${stats.atk??'—'} · 防御 ${stats.def??'—'} · 速度 ${stats.spd??'—'}`,'pet-stats'));
    if(full){for(const [key,label] of [['personality','性格'],['habitat','栖息地'],['acquisition','获得方式'],['silhouette','外观'],['motion','招牌动作']])if(p.design?.[key])card.append(el('h4',label),el('p',p.design[key]));if(p.personality)card.append(el('p',typeof p.personality==='string'?p.personality:JSON.stringify(p.personality)));for(const s of [p.basic,...(p.skills??[])].filter(Boolean)){card.append(el('h4',`${s.name} · ${s.cost||0} 战术点`),el('p',skillText(s)));}if(p.passive)card.append(el('h4',`被动 · ${p.passive.name}`),el('p',p.passive.description??p.passive.text??'每次行动限触发一次。'));if(p.lore)card.append(el('p',p.lore));}
    return card;
  }
  function skillText(s){if(s.description)return s.description;if(s.text)return s.text;return (s.effects??[]).map(e=>({damage:`造成 ${Math.round((e.multiplier??1)*100)}% 攻击力的伤害`,heal:'恢复生命',shield:'赋予护盾',status:'施加状态',mark:'施加标记'}[e.type]??'作用于指定目标')).join('，');}
  function renderDex(){title.textContent='五位星野伙伴';body.append(el('p','三位初始伙伴任选其一；巡游仔与收纳仔可以在野外捕捉。','section-copy'));const grid=el('div',undefined,'dex-grid');for(const p of pets)grid.append(petCard(p,true));body.append(grid);}
  function renderTeam(){
    title.textContent='Crashmon背包';const player=getPlayer();const team=player.team??player.pets.filter(p=>p.teamPosition!==null).map(p=>p.id);teamDraft??=[...team];
    const locked=Boolean(battle&&battle.phase!=='finished');
    body.append(el('p',`全部持有 ${player.pets.length} 只 · 出战 ${team.length}/4 · 后备 ${player.pets.length-team.length} 只`,'section-copy'));
    body.append(el('p',locked?'战斗中可以查看全部伙伴，结束战斗后才能调整队伍。':editingTeam?'选择 1–4 位伙伴出战，保存后生效。取消调整会保留原队伍。':'这里展示你的所有 Crashmon，包括出战伙伴和后备伙伴。','section-copy'));
    if(!player.pets.length){body.append(el('p','背包里还没有 Crashmon。先回营地与引导员交谈，领取你的第一位伙伴。','bag-empty'));return;}
    if(!editingTeam){const edit=button('调整出战队伍',()=>{editingTeam=true;teamDraft=[...team];render();},'quiet');edit.disabled=locked;body.append(edit);}
    const grid=el('div',undefined,'dex-grid');
    for(const owned of player.pets){
      const card=petCard(pet(owned.definitionId)),chosen=teamDraft.includes(owned.id),position=(editingTeam?teamDraft:team).indexOf(owned.id);
      const suffix=[6,10,owned.id.length].find(length=>player.pets.filter(p=>p.id.slice(-length)===owned.id.slice(-length)).length===1)??owned.id.length;
      const identity=el('p',`伙伴编号 ${owned.id.slice(-suffix)}`,'pet-instance');identity.title=`伙伴完整编号：${owned.id}`;
      card.append(identity,el('p',`${editingTeam?'待保存 · ':''}${position>=0?`出战 · 第 ${position+1} 位`:'后备伙伴'}`,'pet-roster-state'),el('p',`累计经验 ${owned.experience??0}`,'pet-stats'));
      if(editingTeam){const toggle=button(chosen?'移入后备':'加入出战队伍',()=>{teamDraft=chosen?teamDraft.filter(id=>id!==owned.id):[...teamDraft,owned.id];render();});toggle.disabled=locked||(!chosen&&teamDraft.length>=4);toggle.setAttribute('aria-pressed',String(chosen));card.append(toggle);}
      grid.append(card);
    }
    body.append(grid);
    if(editingTeam){const save=button(`保存队伍（${teamDraft.length}/4）`,()=>write('/api/team','PATCH',{petIds:teamDraft,revision:getPlayer().revision}),'primary');save.disabled=locked||teamDraft.length<1;body.append(save,button('取消调整',()=>{editingTeam=false;teamDraft=null;render();},'quiet'));}
  }
  function renderExplore(){title.textContent='赤沙海岸 · 出发探索';const player=getPlayer(),active=battle&&battle.phase!=='finished';
    body.append(el('p','从一次相遇开始：压低野生伙伴的生命，再尝试捕捉。战斗随时自动保存。','section-copy'));
    if(active){body.append(button('返回进行中的战斗',()=>{page='battle';render();},'primary'));return;}
    if(!player.pets.length){body.append(el('p','你还没有伙伴。回到营地，靠近引导员按 E，完成初始三选一。'));return;}
    const supplies=el('div',undefined,'supplies');supplies.append(el('span',`背包　捕捉球 ${player.inventory?.captureBall??0} · 恢复药 ${player.inventory?.potion??0}`));
    if(!player.suppliesClaimed)supplies.append(button('领取一次探索补给',()=>write('/api/supplies','POST',{})));body.append(supplies);
    const grid=el('div',undefined,'encounter-grid');for(const e of encounters){const tutorial=e.id.includes('tutorial'),completed=player.tutorialCompleted;if(tutorial&&completed)continue;const card=el('article',undefined,'encounter-card');card.append(el('small',tutorial?'初次相遇 · 教学保护':e.id.includes('boss')?'首领挑战':'野外遭遇'),el('h3',e.name??e.title??e.id));card.append(el('p',e.description??(tutorial?'敌人只会普攻。目标半血及以下时，教学工具保证捕获。':e.id.includes('boss')?'观察首领的蓄力意图，为即将到来的群攻做好防御。':'捕捉概率随目标生命降低而提高。已捕获伙伴永久保留。')));
      if(e.id.includes('boss'))card.append(el('p','建议组成 3–4 位伙伴的小队，准备好护盾与恢复药。','boss-intent'));card.append(el('p',`对手：${(e.enemies??[]).map(id=>pet(id).name).join('、')} · ${e.id.includes('boss')?'不可捕捉':'可捕捉'}`));card.append(el('p',tutorial?'一次成功机会，由两种教学遭遇共享。':'战斗开始全员满血。战败或撤退仍保留已捕获伙伴。','encounter-note'));
      const start=button(!tutorial&&!completed?'先完成一次教学捕捉':'确认出发',()=>write('/api/battle/start','POST',{encounterId:e.id}),'primary');start.disabled=!tutorial&&!completed;card.append(start);grid.append(card);}body.append(grid);body.append(el('p','进行中的战斗会保留 24 小时；长期未行动会按放弃结束。','fine'));
  }
  function renderBattle(){
    if(battle.suspended)body.append(el('p','战斗暂时挂起，期限已冻结。可以同步后重试；版本维护期间请等待服务恢复。','expedition-notice'));title.textContent=battle.encounter?.name??battle.encounter?.title??'赤沙海岸 · 战斗';const finished=battle.phase==='finished',actor=battle.units.find(u=>u.id===battle.currentActorId);
    const summary=el('div',undefined,'battle-summary');summary.append(el('strong',finished?({victory:'探索胜利',defeat:'小队暂时退回营地',retreat:'已撤退',abandoned:'已放弃'}[battle.outcome]??'战斗已结束'):`${actor?unitLabel(actor):'正在推进'} · 请选择行动`),el('span',`我方战术点 ${battle.points?.player??0}/5　敌方 ${battle.points?.enemy??0}/5`),button('同步进度',readLatest,'quiet'));body.append(summary);
    const timeline=el('div',undefined,'battle-timeline');timeline.setAttribute('aria-label','预计行动顺序');timeline.append(el('small','预计行动 →'));for(const entry of (battle.timeline??[]).slice(0,8)){const id=typeof entry==='string'?entry:entry.unitId??entry.id;const u=battle.units.find(u=>u.id===id);timeline.append(el('span',u?unitLabel(u):entry.name??'—',u?.side==='enemy'?'enemy':''));}body.append(timeline);
    const stage=el('div',undefined,'battle-arena'),canvas=el('canvas',undefined,'battle-stage'),targets=el('div',undefined,'battle-targets');
    canvas.setAttribute('aria-hidden','true');stage.setAttribute('role','group');stage.setAttribute('aria-label','战场：宽屏我方左下、敌方右上；窄屏敌方在上、我方在下。点击单位选择目标。');stage.append(canvas,targets);body.append(stage);
    const targetButtons=new Map();
    for(const u of battle.units){
      const invalid=finished?'战斗已结束':targetReason(u);
      const hit=button('',()=>{if(busy)return;const reason=finished?'战斗已结束':targetReason(u);if(reason){notice.textContent=reason;hit.classList.add('explain');return;}selected=u.id;if(command){releaseAt(u);return;}render();body.querySelector(`[data-unit-id="${u.id}"]`)?.focus({preventScroll:true});},'stage-unit');
      hit.dataset.unitId=u.id;hit.setAttribute('aria-pressed',String(selected===u.id));hit.setAttribute('aria-disabled',String(Boolean(invalid)));hit.classList.toggle('current',u.id===battle.currentActorId);hit.classList.toggle('selected',selected===u.id);hit.classList.toggle('unavailable',Boolean(invalid));hit.classList.toggle('enemy',u.side==='enemy');
      const hud=el('span',undefined,'unit-head');hud.append(el('strong',`${u.id===battle.currentActorId?'▶ ':''}${unitLabel(u)}`));
      const health=el('span',`${u.hp} / ${u.maxHp}`,'unit-hp');hud.append(health);const hp=el('meter');hp.min=0;hp.max=u.maxHp;hp.value=u.hp;hp.setAttribute('aria-label','生命');hud.append(hp);
      if(u.shield?.amount)hud.append(el('span',`盾 ${u.shield.amount} · ${u.shield.remaining}回`,'unit-shield'));
      const statuses=(u.statuses??[]).map(s=>`${names[s.id]??s.name??s.id} ${s.remaining??''}回合`).join(' · ');
      if(u.captured||u.hp<=0)hud.append(el('span',u.captured?'已捕获':'已倒下','unit-effects'));
      else if(u.statuses?.length){const effects=el('span',undefined,'unit-effects');const short={burn:'灼',mark:'标',defend:'防',guard:'防',atkUp:'攻↑',atkDown:'攻↓',defUp:'防↑',defDown:'防↓',haste:'速↑',slow:'速↓'};for(const effect of u.statuses){const chip=el('span',`${short[effect.id]??names[effect.id]??effect.id}${effect.remaining??''}`,'unit-status');chip.title=`${names[effect.id]??effect.name??effect.id}，剩余 ${effect.remaining??''} 回合`;chip.setAttribute('aria-hidden','true');effects.append(chip);}hud.append(effects);}
      const capturePreview=command?.type==='capture'&&u.side==='enemy'?`，${invalid||`${battle.encounter?.tutorial?'教学保护，':''}捕获概率 ${Math.round((battle.captureChances?.[u.id]??u.captureChance??0)*100)}%`}`:'';
      hit.append(hud);hit.title=`${invalid||`选择${unitLabel(u)}`} · ${statuses||'无附加状态'}${u.shield?.amount?` · 护盾 ${u.shield.amount}，剩余 ${u.shield.remaining} 回合`:''}${capturePreview}`;hit.setAttribute('aria-label',`${unitLabel(u)}，生命 ${u.hp}/${u.maxHp}${u.shield?.amount?`，护盾 ${u.shield.amount}，剩余 ${u.shield.remaining} 回合`:''}，${statuses||'状态正常'}${invalid?`，${invalid}`:''}${capturePreview}`);
      if(invalid&&command){const reason=el('span',invalid,'unit-invalid');hit.append(reason);}
      targets.append(hit);targetButtons.set(u.id,hit);
    }
    renderer=createBattleRenderer(canvas,{selectedId:selected,onLayout:layout=>{stage.style.height=`${layout.height}px`;for(const slot of layout.placements){const hit=targetButtons.get(slot.id);Object.assign(hit.style,{left:`${slot.x-slot.width/2}px`,top:`${slot.top}px`,width:`${slot.width}px`,height:`${slot.height}px`});hit.querySelector('.unit-head').style.top=`${slot.hudBottom}px`;}}});
    const canvasRenderer=renderer,snapshot=battle,revisionKey=`${battle.id}:${battle.revision}`;
    queueMicrotask(()=>{if(renderer!==canvasRenderer)return;if(revisionKey!==lastAnimatedRevision){lastAnimatedRevision=revisionKey;lastAnimationAt=performance.now();}canvasRenderer.show(snapshot,getPlayer()?.reducedMotion,true,performance.now()-lastAnimationAt);});
    for(const u of battle.units.filter(u=>u.intention))body.append(el('p',`${unitLabel(u)} · ${typeof u.intention==='string'?u.intention:u.intention.name??u.intention.description}`,'boss-intent'));
    if(battle.intent)body.append(el('p',`首领意图：${typeof battle.intent==='string'?battle.intent:battle.intent.name??battle.intent.description}`,'boss-intent'));
    if(finished){if(battle.reward)body.append(el('p',`本场收获：原队员每位获得 ${battle.reward.experiencePerParticipant??0} 经验 · 捕捉球 +${battle.reward.captureBall??0}`,'battle-reward'));body.append(el('p',(battle.captures?.length?'新伙伴已永久保存，战败和撤退也不会丢失。':'本次行动已经保存。')+' 下场战斗全员恢复。'));body.append(button('返回探索',()=>{page='explore';render();},'primary'),button('查看Crashmon背包',()=>{page='team';editingTeam=false;render();},'quiet'));}
    else if(battle.phase==='suspended')body.append(el('p','战斗暂时挂起，当前版本无法继续。已保存的进度与捕获保持保留，请等待维护恢复。'));else if(actor?.side==='player')renderCommands(actor);
    const lastCapture=[...(battle.events??[])].reverse().find(e=>e.type==='capture');if(lastCapture)body.append(el('p',eventText(lastCapture),'capture-result'));const log=el('details',undefined,'battle-log');log.append(el('summary','战斗记录'));for(const event of (battle.events??[]).slice(-16)){log.append(el('p',eventText(event)));}body.append(log);
  }
  function targetReason(u){if(u.captured)return '已捕获';if(u.hp<=0)return '已倒下';if(!command)return '';if(command.target==='self')return u.id===battle.currentActorId?'':'仅作用于当前行动者';if(command.target==='allEnemies')return u.side==='enemy'?'':'请选择任一敌方单位，对全体敌人释放';if(command.target==='ally'&&u.side!=='player')return '请选择我方伙伴';if(command.target==='enemy'&&u.side!=='enemy')return '请选择敌方目标';if(command.type==='item'&&u.hp>=u.maxHp)return '生命已满，无需恢复';if(command.type==='capture'){if(battle.capacityRemaining<=0)return '持有空间已满';if(battle.encounter?.tutorial&&u.hp>u.maxHp/2)return '先将生命降至一半';if(!battle.encounter?.tutorial&&!battle.inventory?.captureBall)return '捕捉球已用尽';if(!(u.captureChance>0))return '此目标不可捕捉';}return ''; }
  function releaseAt(target){
    if(busy||!command)return;
    const invalid=targetReason(target);if(invalid){notice.textContent=invalid;return;}
    const action={type:command.type,...(command.skillId?{skillId:command.skillId}:{}),...(command.target==='allEnemies'?{}:{targetId:target.id})};
    return write('/api/battle/action','POST',{battleId:battle.id,revision:battle.revision,actionId:battle.actionId,command:action});
  }
  function renderCommands(actor){const def=actor.definition??pet(actor.speciesId),bar=el('div',undefined,'command-bar');const options=[{type:'basic',name:def.basic?.name??'普攻',cost:0,target:'enemy',description:'攻击一名敌人，恢复 1 战术点。'},...(def.skills??[]).map(s=>({...s,type:'skill',skillId:s.id})),{type:'defend',name:'防御',cost:0,target:'self',description:'减轻受到的伤害，持续至自己下一次行动开始。'},{type:'item',name:`恢复药 ×${battle.inventory?.potion??0}`,cost:0,target:'ally',description:'为一位存活且受伤的伙伴恢复其生命上限的 30%。'},{type:'capture',name:battle.encounter?.id?.includes('tutorial')?'教学捕捉':'捕捉',cost:0,target:'enemy',description:'捕捉消耗本次行动；普通捕捉消耗一个捕捉球。'}];
    const skills=el('div',undefined,'skill-cards'),tools=el('div',undefined,'battle-tools');
    for(const opt of options){
      const isSkill=['basic','skill'].includes(opt.type),insufficient=opt.cost>(battle.points?.player??0);
      const b=button('',()=>{if(busy||pending){notice.textContent='请先等待当前操作完成，或重试上次操作。';return;}command=opt;selected=null;render();body.querySelector(`[data-command="${opt.skillId??opt.type}"]`)?.focus({preventScroll:true});},isSkill?'skill-card':'battle-tool');b.dataset.command=opt.skillId??opt.type;
      b.disabled=insufficient||(opt.type==='item'&&!battle.inventory?.potion);b.setAttribute('aria-pressed',String(command?.type===opt.type&&command?.skillId===opt.skillId));
      if(isSkill){b.append(el('span',opt.type==='basic'?'普攻':'主动技能','skill-kind'),el('span',`${opt.cost} 点`,'skill-cost'),el('strong',opt.name),el('span',({enemy:'敌方单体',ally:'我方单体',self:'自身',allEnemies:'敌方全体'})[opt.target],'skill-target'),el('span',opt.description??skillText(opt),'skill-effect'));if(insufficient)b.append(el('span','战术点不足','skill-blocked'));skills.append(b);}
      else{b.textContent=opt.name;tools.append(b);}
    }
    bar.append(skills,tools);body.append(bar);

    if(command){const detail=el('div',undefined,'command-detail');detail.append(el('strong',`${command.name} · ${command.cost??0} 战术点`));
      detail.append(el('p',command.target==='self'?`点击场上的 ${unitLabel(actor)} 立即释放。`:command.target==='allEnemies'?'点击场上任一敌人，立即对全部敌人释放。':`点击场上${command.target==='ally'?'我方':'敌方'}单位，立即释放。`));
      if(command.type==='capture'){for(const target of battle.units.filter(u=>u.side==='enemy'&&u.hp>0&&!u.captured)){const chance=battle.captureChances?.[target.id]??target.captureChance;const reason=targetReason(target);detail.append(el('p',`${unitLabel(target)}：${reason||`${battle.encounter?.tutorial?'教学保护 · ':''}捕获概率 ${Math.round((chance??0)*100)}%`}`));}if(!battle.encounter?.tutorial)detail.append(el('p',`捕捉球 ${battle.inventory?.captureBall??0} · 每次有效尝试消耗 1 个`));}
      body.append(detail);
    }
    const exit=el('details',undefined,'retreat-menu');exit.append(el('summary','离开这场战斗'));exit.append(el('p','撤退会结束本场，不返还已消耗道具；已捕获伙伴仍保留。'),button('确认撤退',()=>write('/api/battle/action','POST',{battleId:battle.id,revision:battle.revision,actionId:battle.actionId,command:{type:'retreat'}}),'quiet'));body.append(exit);
  }
  function eventText(e){if(e.text||e.message)return e.text??e.message;if(e.type==='capture')return `${unitLabel(battle.units.find(u=>u.id===e.targetId))||'目标'}：${e.success?'捕获成功，已永久加入持有列表':'捕捉未成功，目标仍在场上'}`;if(e.type==='finished')return {victory:'探索胜利',defeat:'小队战败',retreat:'已撤退'}[e.outcome]??'战斗结束';const unit=id=>unitLabel(battle.units.find(u=>u.id===id));return `${unit(e.actorId??e.sourceId??e.unitId)} ${ {turn:'获得行动机会',dot:'受到持续伤害',down:'倒下',damage:'造成伤害',heal:'恢复生命',shield:'获得护盾',capture:'捕捉',captured:'捕获成功',defend:'进入防御',status:'状态变化',death:'倒下',action:'行动',finished:'战斗结束',capture_failed:'捕捉未成功'}[e.type]??e.name??'行动结算'} ${unit(e.targetId)} ${e.amount??''}`.trim();}
  return {definitions:()=>pets,async sync(){const user=getPlayer()?.userId;if(!user)return;if(lastUser!==user){lastUser=user;pets=[];battle=null;try{pending=JSON.parse(sessionStorage.getItem(key())??'null');}catch{pending=null;}try{await load();await refresh();if(battle&&battle.phase!=='finished'){page='battle';if(!dialog.open)dialog.showModal();render();}}catch(e){error(e);}}},hide(){dialog.close();renderer?.stop();lastUser=null;lastSurface=null;lastAnimatedRevision=null;editingTeam=false;pets=[];battle=null;pending=null;},open};
}
