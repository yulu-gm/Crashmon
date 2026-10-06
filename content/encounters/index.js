const encounter = (id, name, enemies, tutorial, experience, description, extra = {}) => ({ id, name, enemies, tutorial, requiresTutorial: !tutorial, ai: tutorial ? 'basic' : 'standard', contentVersion: 'B0-C1', description, rewards: { experience, firstWinExperience: 0, captureBall: tutorial ? 0 : 1, round: 'b0-c1' }, ...extra });
export const encounters = {
  b0_tutorial_scout: encounter('b0_tutorial_scout', '初次捕捉 · 巡游仔', ['wild_scout'], true, 0, '敌人仅普攻。压至半血后，教学工具必定捕获；全账号仅成功一次。'),
  b0_tutorial_shell: encounter('b0_tutorial_shell', '初次捕捉 · 收纳仔', ['wild_shell'], true, 0, '敌人仅普攻。压至半血后，教学工具必定捕获；全账号仅成功一次。'),
  b0_pair_scout: encounter('b0_pair_scout', '石径巡游', ['wild_scout', 'wild_scout'], false, 10, '两只巡游仔，可使用背包中的捕捉球捕获。'),
  b0_pair_shell: encounter('b0_pair_shell', '补给箱旁', ['wild_shell', 'wild_shell'], false, 10, '两只收纳仔，可使用背包中的捕捉球捕获。'),
  b0_four_mixed: encounter('b0_four_mixed', '四只野生伙伴', ['wild_scout', 'wild_shell', 'wild_scout', 'wild_shell'], false, 20, '四单位混合遭遇，注意共享战术点。'),
  b0_scrap_boss: encounter('b0_scrap_boss', '废铁整理员', ['boss_scrap_sorter'], false, 30, '建议 3–4 只挑战，不可捕捉。整理废铁 → 蓄力防御 → 强力群攻；留意意图。', { ai: 'boss', aiPlan: [{ type: 'skill', skillId: 'boss_scrap_sort', intention: '整理废铁：单体攻击并获得护盾' }, { type: 'defend', intention: '蓄力防御，之后强力群攻' }, { type: 'skill', skillId: 'boss_scrap_sweep', cost: 2, intention: '零件倾倒：消耗 2 点攻击全体，并露出破绽' }], rewards: { experience: 30, firstWinExperience: 20, captureBall: 1, round: 'b0-c1' } }),
};
