// Misiones de FTB Quests del modpack (config/ftbquests/quests): capítulos, misiones, tareas (objetos y jefes a matar) y
// recompensas, con los títulos en el idioma del jugador. Sirven para saber qué es importante en el pack (trofeos, progresión).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// SNBT de FTB: claves sin comillas, números con sufijo (1.0d, 3L, 1b), listas con o sin comas, strings con comillas
export function parseSnbt(src) {
  let i = 0;
  const ws = () => { while (i < src.length && /[\s,]/.test(src[i])) i++; };
  const str = () => { const q = src[i++]; let s = ''; while (i < src.length && src[i] !== q) { if (src[i] === '\\') { s += src[i + 1] === 'n' ? '\n' : src[i + 1]; i += 2; } else s += src[i++]; } i++; return s; };
  const word = () => { const m = src.slice(i).match(/^[^\s,:{}[\]]+/); if (!m) throw new Error(`SNBT: algo raro en ${i}`); i += m[0].length; return m[0]; };
  const val = () => {
    ws();
    const c = src[i];
    if (c === '{') { i++; const o = {}; for (;;) { ws(); if (src[i] === '}') { i++; return o; } const k = src[i] === '"' ? str() : word(); ws(); if (src[i] === ':') i++; o[k] = val(); } }
    if (c === '[') {
      i++; ws(); if (/^[BIL];/.test(src.slice(i, i + 2))) i += 2;
      const a = []; for (;;) { ws(); if (src[i] === ']') { i++; return a; } a.push(val()); }
    }
    if (c === '"' || c === "'") return str();
    const w = word();
    if (w === 'true' || w === 'false') return w === 'true';
    const n = w.match(/^(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)[bBsSlLfFdD]?$/);
    return n ? +n[1] : w;
  };
  return val();
}

const clean = t => String(t ?? '').replace(/&[0-9a-fk-or]/gi, '').replace(/\\n/g, ' ').trim();
const cache = new Map();

export function loadQuests(dir, lang = 'es_es') {
  const root = join(dir, 'files', 'config', 'ftbquests', 'quests'), chap = join(root, 'chapters');
  if (!existsSync(chap)) return null;
  const key = `${root}|${lang}|${statSync(chap).mtimeMs}`;
  if (cache.has(key)) return cache.get(key);
  const read = p => { try { return parseSnbt(readFileSync(p, 'utf8')); } catch { return null; } };
  // textos: lang/<lang>.snbt (capítulos) y lang/<lang>/chapters/<archivo>.snbt (misiones); en_us de reserva; o dentro del capítulo
  const T = {};
  for (const l of [...new Set(['en_us', lang])]) {
    const one = read(join(root, 'lang', `${l}.snbt`)); if (one) Object.assign(T, one);
    const d = join(root, 'lang', l, 'chapters');
    if (existsSync(d)) for (const f of readdirSync(d)) if (f.endsWith('.snbt')) Object.assign(T, read(join(d, f)) || {});
  }
  const txt = (kind, id, field = 'title') => { const v = T[`${kind}.${id}.${field}`]; return clean(Array.isArray(v) ? v.join(' ') : v); };
  const itemOf = it => (typeof it === 'string' ? it : it?.id) || null;
  const chapters = [];
  for (const f of readdirSync(chap).filter(f => f.endsWith('.snbt')).sort()) {
    const c = read(join(chap, f)); if (!c) continue;
    const quests = (c.quests || []).map(q => ({
      id: q.id, title: clean(q.title) || txt('quest', q.id), subtitle: clean(q.subtitle) || txt('quest', q.id, 'quest_subtitle'),
      tasks: (q.tasks || []).map(t => t.type === 'kill' ? { kill: t.entity, n: t.value || 1 } : t.type === 'item' ? { item: itemOf(t.item), n: t.count || itemOf(t.item) && t.item?.count || 1 } : { [t.type || 'otra']: t.dimension || t.advancement || t.structure || true }),
      rewards: (q.rewards || []).filter(r => r.type === 'item').map(r => itemOf(r.item)).filter(Boolean),
      optional: !!q.optional,
    }));
    for (const q of quests) if (!q.title) { const t = q.tasks.find(t => t.item || t.kill); q.title = t ? (t.kill ? `Matar ${t.kill}` : t.item) : '(sin título)'; }
    chapters.push({ file: f.replace(/\.snbt$/, ''), title: clean(c.title) || txt('chapter', c.id) || f.replace(/\.snbt$/, ''), quests });
  }
  const out = { chapters };
  cache.set(key, out);
  return out;
}

// búsqueda para el agente: sin nada, índice de capítulos; con chapter, sus misiones; con query, misiones que coinciden
export function searchQuests(dir, { query, chapter, lang } = {}) {
  const Q = loadQuests(dir, lang);
  if (!Q) return { error: 'Este modpack no trae misiones de FTB Quests (config/ftbquests).' };
  const line = q => `${q.title}${q.subtitle ? ` (${q.subtitle})` : ''}: ${q.tasks.map(t => (t.kill ? `matar ${t.kill}${t.n > 1 ? ` ×${t.n}` : ''}` : t.item ? `${t.item}${t.n > 1 ? ` ×${t.n}` : ''}` : Object.keys(t)[0])).join(', ')}${q.rewards.length ? ` → premio ${q.rewards.slice(0, 3).join(', ')}` : ''}`;
  if (chapter) {
    const c = Q.chapters.find(c => c.file === chapter || c.title.toLowerCase() === String(chapter).toLowerCase()) || Q.chapters.find(c => (c.file + ' ' + c.title).toLowerCase().includes(String(chapter).toLowerCase()));
    if (!c) return { error: `No hay capítulo "${chapter}". Capítulos: ${Q.chapters.map(c => c.file).join(', ')}` };
    return { chapter: c.title, file: c.file, quests: c.quests.slice(0, 120).map(line), bosses: [...new Set(c.quests.flatMap(q => q.tasks.filter(t => t.kill).map(t => t.kill)))] };
  }
  if (query) {
    const w = String(query).toLowerCase().split(/\s+/).filter(Boolean), hits = [];
    for (const c of Q.chapters) for (const q of c.quests) {
      const hay = (c.title + ' ' + line(q)).toLowerCase();
      if (w.every(x => hay.includes(x))) hits.push(`[${c.file}] ${line(q)}`);
    }
    return { query, hits: hits.slice(0, 80), total: hits.length };
  }
  return { chapters: Q.chapters.map(c => `${c.file} · ${c.title} · ${c.quests.length} misiones${c.quests.some(q => q.tasks.some(t => t.kill)) ? ` · jefes: ${[...new Set(c.quests.flatMap(q => q.tasks.filter(t => t.kill).map(t => t.kill.split(':')[1])))].slice(0, 8).join(', ')}` : ''}`) };
}
