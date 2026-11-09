// Agentes y skills desde agents/*.md y skills/**/SKILL.md (cabecera YAML simple + cuerpo markdown).
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT_DIR, DATA_DIR } from '../config.js';

function parse(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[')) v = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    else if (v.startsWith('{')) v = Object.fromEntries(v.slice(1, -1).split(',').map(p => p.split(':').map(s => s.trim())));
    meta[kv[1]] = v;
  }
  return { meta, body: m[2].trim() };
}

let agents = null;
export function getAgents() {
  if (agents) return agents;
  agents = {};
  const dir = join(ROOT_DIR, 'agents');
  for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) { const { meta, body } = parse(readFileSync(join(dir, f), 'utf8')); agents[meta.name] = { ...meta, prompt: body }; }
  return agents;
}

// skills del repositorio + skills que el creador de skills ha escrito para un workspace concreto
const userSkillDir = ws => join(DATA_DIR, 'workspaces', ws, 'skills');
export function listSkills(workspaceId) {
  const out = {}, base = join(ROOT_DIR, 'skills');
  const walk = (dir, prefix = '') => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      if (!f.isDirectory()) continue;
      const p = join(dir, f.name, 'SKILL.md'), name = prefix + f.name;
      if (existsSync(p)) out[name] = { file: p, ...parse(readFileSync(p, 'utf8')).meta };
      walk(join(dir, f.name), name + '/');
    }
  };
  walk(base);
  if (workspaceId && existsSync(userSkillDir(workspaceId))) for (const f of readdirSync(userSkillDir(workspaceId)).filter(f => f.endsWith('.md'))) {
    const p = join(userSkillDir(workspaceId), f);
    out['mods/' + f.slice(0, -3)] = { file: p, ...parse(readFileSync(p, 'utf8')).meta, workspace: true };
  }
  return out;
}
export function readSkill(name, workspaceId) {
  const s = listSkills(workspaceId)[name];
  return s ? parse(readFileSync(s.file, 'utf8')).body : null;
}
export function writeSkill(workspaceId, mod, text) {
  if (!/^[a-z0-9_-]{2,40}$/.test(mod)) throw new Error('Nombre de mod no válido');
  mkdirSync(userSkillDir(workspaceId), { recursive: true });
  writeFileSync(join(userSkillDir(workspaceId), mod + '.md'), String(text).slice(0, 40_000));
}
