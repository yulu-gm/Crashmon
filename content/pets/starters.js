import { catalog } from './catalog.js';
// 稳定 ID 保持旧存档兼容；具体战斗与形象定义集中于常驻图鉴。
export const starters = Object.freeze(['starter_a', 'starter_b', 'starter_c'].map(id => ({
  id, name: catalog[id].name, role: catalog[id].role, description: catalog[id].description,
  stats: catalog[id].stats, basic: catalog[id].basic, skills: catalog[id].skills, design: catalog[id].design,
  feature: catalog[id].skills.map(skill => skill.name).join(' · '), color: catalog[id].color, shape: catalog[id].shape,
})));
