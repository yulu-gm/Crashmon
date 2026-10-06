// 常驻 B0-C1 内容；所有效果交给 framework/battle.js 结算。
const damage = (multiplier, element = 'neutral') => ({ type: 'damage', multiplier, element });
const status = (status, target) => ({ type: 'status', status, duration: 2, ...(target ? { target } : {}) });
const skill = (id, name, cost, target, effects, description) => ({ id, name, kind: cost ? 'skill' : 'basic', cost, target, effects, description, unlock: '获得即解锁', presentation: id });
const pet = (id, name, role, description, color, shape, stats, element, basicName, skills, design) => ({
  id, name, role, description, color, shape, stats, element,
  basic: skill(`${id}_basic`, basicName, 0, 'enemy', [damage(1, element)], '攻击一名敌人，回复 1 战术点。'),
  skills, passive: null, capturable: id.startsWith('wild_'), captureFactor: 0.8,
  contentVersion: 'B0-C1', design,
});
export const catalog = {
  starter_a: pet('starter_a', '炉尾狐', '主动进攻', '把尾巴当小火炉的急性子，习惯先冲过去再想借口。', '#e9975e', 'fox', { hp: 120, atk: 40, def: 30, spd: 100 }, 'T1', '直击', [
    skill('starter_a_burst', '强力突击', 2, 'enemy', [damage(1.5, 'T1')], '倍率 1.5 的强攻，适合配合标记。'),
    skill('starter_a_focus', '振作', 1, 'self', [status('atkUp')], '攻击提高 20%，持续自身 2 回合。'),
  ], { silhouette: '大耳朵、小短腿、炉口般蓬松的火橙尾巴；奶油色胸口，深棕爪尖。', personality: '急性子但讲义气，振作时拍拍脸假装早有计划。', habitat: '营地的余温管道旁', acquisition: '引导员三选一，永久只选一次', motion: '前扑直击；尾巴收紧后爆发；振作时双爪拍脸。' }),
  starter_b: pet('starter_b', '苔伞龟', '守护伙伴', '背着苔绿伞壳的慢性子，总觉得大家都需要挡一挡。', '#6eafa0', 'turtle', { hp: 150, atk: 36, def: 45, spd: 90 }, 'T2', '碰撞', [
    skill('starter_b_cover', '撑伞', 1, 'ally', [{ type: 'shield', multiplier: 0.75, fixed: 9, duration: 2 }], '为一名队友提供 36 基础护盾，持续目标 2 回合。'),
    skill('starter_b_push', '稳步推进', 2, 'enemy', [damage(1.6, 'T2')], '倍率 1.6 的正面推进。'),
  ], { silhouette: '圆润矮身、宽大的六瓣苔绿伞壳、淡黄面颊和雨滴状脚掌。', personality: '慢条斯理，保护前认真检查伞沿，冲撞后还要摆正背壳。', habitat: '营地水岸与潮湿石阶', acquisition: '引导员三选一，永久只选一次', motion: '缩头撞击；伞壳展开形成弧形罩；重心压低后推行。' }),
  starter_c: pet('starter_c', '星签雀', '创造机会', '带着星形书签尾羽的小鸟，爱把每个问题都划上重点。', '#a594d2', 'bird', { hp: 115, atk: 32, def: 30, spd: 120 }, 'T3', '轻啄', [
    skill('starter_c_mark', '划重点', 1, 'enemy', [status('mark')], '标记目标，下一次主行动直接伤害提高 25%，最长目标 2 回合。'),
    skill('starter_c_strike', '认真一击', 2, 'enemy', [damage(1.8, 'T3')], '倍率 1.8 的俯冲攻击。'),
  ], { silhouette: '浅紫圆身、墨紫翼尖、金色星形尾羽，头顶一根翘起的笔尖冠羽。', personality: '认真又爱批注，偶尔给自己也画上重点，但从不耽误行动。', habitat: '营地公告板和研究站窗台', acquisition: '引导员三选一，永久只选一次', motion: '短促啄击；翅尖划出明确靶标；折翼俯冲后轻落。' }),
  wild_scout: pet('wild_scout', '巡游仔', '速度与标记', '圆滚滚的探测生物，总想记下新发现，急起来会撞上笔记对象。', '#e0bc69', 'scout', { hp: 100, atk: 30, def: 25, spd: 110 }, 'neutral', '探头撞', [
    skill('wild_scout_mark', '做记号', 1, 'enemy', [status('mark')], '留下标记：下一次直接攻击提高 25%，最长目标 2 回合。'),
    skill('wild_scout_dash', '急冲', 2, 'enemy', [damage(1.6)], '倍率 1.6 的急速冲刺。'),
  ], { silhouette: '沙黄色圆团，头顶双短天线，一只大镜片眼和深蓝挎包；三角短足。', personality: '好奇又健忘，看到新事物就翻包找笔，找不到就用天线指认。', habitat: '营地外的风化石径', acquisition: '教学二选一或普通野生遭遇捕捉', motion: '探头撞击；天线指认靶标；连迈小步冲刺，刹车时身体后仰。' }),
  wild_shell: pet('wild_shell', '收纳仔', '护盾与稳定输出', '背着方形收纳壳的小生物，相信任何危险都能先打包。', '#86a9c9', 'shell', { hp: 120, atk: 32, def: 35, spd: 85 }, 'neutral', '箱角碰撞', [
    skill('wild_shell_cover', '临时包装', 1, 'ally', [{ type: 'shield', multiplier: 0.75, fixed: 8, duration: 2 }], '为一名队友提供 32 基础护盾，持续目标 2 回合。'),
    skill('wild_shell_press', '整箱推进', 2, 'enemy', [damage(1.6)], '倍率 1.6 的箱体推进。'),
  ], { silhouette: '雾蓝方壳、米白软身体、橘色扣带，箱盖边缘露出两只豆眼和四只短脚。', personality: '有条不紊，连自己的爪子都要按顺序收好，紧急时依然可靠。', habitat: '废弃补给箱与草坡交界', acquisition: '教学二选一或普通野生遭遇捕捉', motion: '箱角前倾轻撞；扣带合拢形成方框护盾；四脚同步推动箱体。' }),
};
catalog.boss_scrap_sorter = {
  id: 'boss_scrap_sorter', name: '废铁整理员', role: '示范首领', description: '认真分拣废铁的生物，蓄力后把分类好的零件全撒出去。', color: '#958b88', shape: 'boss',
  stats: { hp: 480, atk: 42, def: 40, spd: 95 }, element: 'neutral', capturable: false, contentVersion: 'B0-C1',
  basic: skill('boss_scrap_basic', '零件碰撞', 0, 'enemy', [damage(1)], '普攻，回复 1 战术点。'),
  skills: [
    skill('boss_scrap_sort', '整理废铁', 0, 'enemy', [damage(1), { type: 'shield', target: 'self', multiplier: 0.5, fixed: 9, duration: 2 }], '攻击并获得 30 护盾，回复 1 战术点。'),
    skill('boss_scrap_sweep', '零件倾倒', 2, 'allEnemies', [damage(1.4), status('defDown', 'self')], '群体倍率 1.4 伤害；自身防御降低 20%，持续自身 2 回合。'),
  ], passive: null,
};
