// Indexador de workspace: recorre los jars del modpack (y el jar vanilla) y guarda un índice de bloques, recetas, tags y archivos.
// El tamaño real de cada bloque sale de los extremos de los elementos de su modelo: la Isotopic Centrifuge (0..32 en y) ocupa 1×2×1.
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { listZip, readEntry } from './zip.js';

const TIER_ORDER = ['basic', 'advanced', 'elite', 'ultimate', 'overclocked', 'quantum', 'dense', 'multiversal', 'creative'];
const TIER_RE = new RegExp(`(^|_)(${TIER_ORDER.join('|')})(_|$)`);

// familia de tier: el id sin la palabra del tier (mekanism:ultimate_purifying_factory → mekanism:purifying_factory)
export function tierOf(id) {
  const [ns, path] = id.split(':'), m = path.match(TIER_RE);
  if (!m) return null;
  return { family: `${ns}:${path.replace(TIER_RE, (_, a, t, b) => (a && b ? '_' : ''))}`, tier: m[2], rank: TIER_ORDER.indexOf(m[2]) };
}

// tamaño en bloques a partir de los extremos del modelo (en 1/16), con 1,5 px de tolerancia para salientes decorativos
export function sizeOf(min, max) {
  const lo = min.map(v => Math.floor((v + 1.5) / 16)), hi = max.map(v => Math.ceil((v - 1.5) / 16));
  return { size: hi.map((h, i) => Math.max(1, h - lo[i])), offset: lo };
}

// fuentes: jars/zips o carpetas sueltas (kubejs/), en orden de prioridad
function walk(dir, base = dir, out = []) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) walk(p, base, out); else out.push(relative(base, p).replace(/\\/g, '/'));
  }
  return out;
}
export class Pack {
  constructor(jars) {
    this.files = new Map();                      // ruta interna → [índice de fuente, entrada]
    this.jars = jars;
    jars.forEach((src, ji) => {
      const entries = statSync(src).isDirectory() ? walk(src).map(name => ({ name, file: join(src, name) })) : listZip(src);
      for (const e of entries) if (/^(assets|data)\//.test(e.name) && !this.files.has(e.name)) this.files.set(e.name, [ji, e]);
    });
  }
  has(p) { return this.files.has(p); }
  read(p) { const f = this.files.get(p); return !f ? null : f[1].file ? readFileSync(f[1].file) : readEntry(this.jars[f[0]], f[1]); }
  json(p) { const b = this.read(p); if (!b) return null; try { return JSON.parse(b.toString('utf8').replace(/^﻿/, '')); } catch { return null; } }
  paths(re) { return [...this.files.keys()].filter(k => re.test(k)); }
}

// ── modelos: cadena de parent, variables de textura y modelos compuestos (factorías de Mekanism) ──
export function resolveModel(pack, ref, depth = 0) {
  if (depth > 12) return [];
  const m = typeof ref === 'string' ? loadModel(pack, ref) : ref;
  if (!m) return [];
  if (m.loader === 'neoforge:composite' || m.loader === 'forge:composite') return Object.values(m.children || {}).flatMap(ch => resolveModel(pack, ch, depth + 1));
  let texvars = {}, elements = null, cur = m;
  for (let i = 0; cur && i < 12; i++) {
    texvars = { ...(cur.textures || {}), ...texvars };
    elements = elements || cur.elements;
    if (!cur.parent || /^(minecraft:)?block\/(block|thin_block)$/.test(cur.parent)) break;
    cur = loadModel(pack, cur.parent);
  }
  const texOf = v => {
    for (let i = 0; typeof v === 'string' && v.startsWith('#') && i < 8; i++) v = texvars[v.slice(1)];
    if (typeof v !== 'string') return null;
    const [ns, p] = (v.includes(':') ? v : 'minecraft:' + v).split(':');
    return `${ns}:${p.startsWith('block/') ? p.slice(6) : p}`;
  };
  return (elements || []).map(e => ({ ...e, faces: Object.fromEntries(Object.entries(e.faces || {}).map(([k, f]) => [k, { ...f, texture: texOf(f.texture) }]).filter(([, f]) => f.texture)) }));
}
function loadModel(pack, ref) {
  const [ns, p] = (ref.includes(':') ? ref : 'minecraft:' + ref).split(':');
  return pack.json(`assets/${ns}/models/${p}.json`);
}

// variante por defecto de un blockstate y la rotación de su variante facing=north (para orientar el modelo)
function defaultVariant(bs) {
  if (bs?.variants) {
    const entries = Object.entries(bs.variants), pick = v => (Array.isArray(v) ? v[0] : v);
    const north = entries.find(([k]) => /(^|,)facing=north(,|$)/.test(k) && !/active=true/.test(k)) || entries.find(([k]) => !/active=true|lit=true|powered=true/.test(k)) || entries[0];
    const facing = entries.some(([k]) => /facing=(east|west)/.test(k));
    return north && { model: pick(north[1]).model, y: pick(north[1]).y || 0, facing };
  }
  if (bs?.multipart?.length) { const a = bs.multipart[0].apply; const v = Array.isArray(a) ? a[0] : a; return { model: v.model, y: v.y || 0, facing: false }; }
  return null;
}

function langMap(pack, code) {
  const out = {};
  for (const p of pack.paths(new RegExp(`^assets/[^/]+/lang/${code}\\.json$`))) Object.assign(out, pack.json(p) || {});
  return out;
}

// recetas: id, tipo, salidas e entradas como ids/tags planos para buscar; el JSON completo se lee al pedir el detalle
function flatten(v, acc = new Set()) {
  if (!v || typeof v !== 'object') return acc;
  if (Array.isArray(v)) { v.forEach(x => flatten(x, acc)); return acc; }
  for (const k of ['item', 'id', 'tag', 'fluid', 'chemical', 'gas', 'slurry']) if (typeof v[k] === 'string') acc.add(k === 'tag' ? '#' + v[k] : v[k]);
  for (const [k, x] of Object.entries(v)) if (x && typeof x === 'object' && k !== 'neoforge:conditions') flatten(x, acc);
  return acc;
}

export function buildIndex(dir, jars, onProgress = () => {}) {
  onProgress('Leyendo jars');
  const pack = new Pack(jars);
  onProgress('Bloques y modelos');
  const en = langMap(pack, 'en_us'), es = langMap(pack, 'es_es'), blocks = [];
  for (const p of pack.paths(/^assets\/[^/]+\/blockstates\/[^/]+\.json$/)) {
    const [, ns, name] = p.match(/^assets\/([^/]+)\/blockstates\/([^/]+)\.json$/), bid = `${ns}:${name}`;
    const v = defaultVariant(pack.json(p));
    if (!v?.model) continue;
    const els = resolveModel(pack, v.model);
    const min = [0, 1, 2].map(i => Math.min(0, ...els.map(e => e.from?.[i] ?? 0))), max = [0, 1, 2].map(i => Math.max(16, ...els.map(e => e.to?.[i] ?? 16)));
    const { size, offset } = els.length ? sizeOf(min, max) : { size: [1, 1, 1], offset: [0, 0, 0] };
    const textures = [...new Set(els.flatMap(e => Object.values(e.faces).map(f => f.texture)))].slice(0, 12);
    blocks.push({ id: bid, name: en[`block.${ns}.${name}`] || name.replace(/_/g, ' '), nameEs: es[`block.${ns}.${name}`] || null,
      model: v.model, yaw: v.facing ? (180 - v.y + 360) % 360 : 0, facing: v.facing, size, offset, textures, tier: tierOf(bid) });
  }
  onProgress('Recetas');
  const recipes = [];
  for (const p of pack.paths(/^data\/[^/]+\/recipes?\/.+\.json$/)) {
    const j = pack.json(p);
    if (!j?.type) continue;
    const rid = p.replace(/^data\/([^/]+)\/recipes?\/(.+)\.json$/, '$1:$2');
    const outKeys = ['result', 'results', 'output', 'outputs', 'item_output', 'chemical_output', 'fluid_output', 'left_chemical_output', 'right_chemical_output'];
    const out = new Set(), all = flatten(j);
    for (const k of outKeys) flatten(j[k], out);
    recipes.push({ id: rid, type: j.type, out: [...out], in: [...all].filter(x => !out.has(x)), path: p });
  }
  onProgress('Tags');
  const tags = {};
  for (const p of pack.paths(/^data\/[^/]+\/tags\/(block|item|blocks|items)\/.+\.json$/)) {
    const [, ns, kind, name] = p.match(/^data\/([^/]+)\/tags\/([^/]+)\/(.+)\.json$/);
    const j = pack.json(p);
    if (j?.values) (tags[`${kind.replace(/s$/, '')}:${ns}:${name}`] ??= []).push(...j.values.map(v => (typeof v === 'string' ? v : v.id)));
  }
  onProgress('Licencias');
  const licenses = modLicenses(jars);
  const files = {};
  for (const [k, [ji, e]] of pack.files) if (/^assets\/[^/]+\/(textures\/.+\.png(\.mcmeta)?|models\/.+\.json|blockstates\/.+\.json)$/.test(k)) files[k] = e.file ? [ji, -1, 0, 0, -1, relative(dir, e.file)] : [ji, e.offset, e.csize, e.usize, e.method];
  mkdirSync(join(dir, 'index'), { recursive: true });
  const w = (n, v) => writeFileSync(join(dir, 'index', n), JSON.stringify(v));
  w('blocks.json', blocks); w('recipes.json', recipes); w('tags.json', tags); w('licenses.json', licenses); w('files.json', { jars: jars.map(j => relative(dir, j)), files });
  const mods = new Set(blocks.map(b => b.id.split(':')[0]));
  return { blocks: blocks.length, recipes: recipes.length, tags: Object.keys(tags).length, textures: Object.keys(files).filter(k => k.endsWith('.png')).length, mods: mods.size, multiCell: blocks.filter(b => b.size.some(s => s > 1)).length };
}

// lista los jars de un workspace: mods/*.jar más el vanilla
export function workspaceJars(dir) {
  const mods = join(dir, 'files', 'mods'), out = [];
  if (existsSync(mods)) for (const f of readdirSync(mods)) if (f.endsWith('.jar') && statSync(join(mods, f)).size > 0) out.push(join(mods, f));
  const kubejs = join(dir, 'files', 'kubejs');
  if (existsSync(kubejs)) out.unshift(kubejs);                       // los assets y recetas de KubeJS mandan sobre los de los mods
  const vanilla = join(dir, 'vanilla.jar');
  if (existsSync(vanilla)) out.push(vanilla);
  return out;
}
export const readIndex = (dir, name) => JSON.parse(readFileSync(join(dir, 'index', name), 'utf8'));

// licencia declarada por cada mod (mods.toml / neoforge.mods.toml / fabric.mod.json): decide si sus texturas se pueden enseñar en público
export const OPEN_LICENSE = /\b(MIT|Apache|LGPL|GPL|MPL|BSD|ISC|Unlicense|CC0|CC[- ]?BY(?![- ]?(NC|ND)))/i;
// licencia de cada mod declarado en un mods.toml: solo los modId de las secciones [[mods]];
// los de [[dependencies.*]] son otros mods (minecraft, neoforge, jei…) y no heredan esta licencia
export function licensesFromToml(toml) {
  const lic = toml.match(/^\s*license\s*=\s*["']([^"']+)/m)?.[1] || '', out = {};
  let section = '';
  for (const line of toml.split(/\r?\n/)) {
    const h = line.match(/^\s*\[\[?\s*([^\]]+?)\s*\]\]?\s*$/);
    if (h) { section = h[1]; continue; }
    const m = section === 'mods' && line.match(/^\s*modId\s*=\s*["']([a-z0-9_.-]+)/);
    if (m) out[m[1]] = lic;
  }
  return out;
}
export function modLicenses(jars) {
  const out = {};
  for (const jar of jars) {
    if (statSync(jar).isDirectory()) continue;
    let entries;
    try { entries = listZip(jar); } catch { continue; }
    for (const name of ['META-INF/neoforge.mods.toml', 'META-INF/mods.toml']) {
      const e = entries.find(x => x.name === name);
      if (!e) continue;
      Object.assign(out, licensesFromToml(readEntry(jar, e).toString('utf8')));
    }
    const f = entries.find(x => x.name === 'fabric.mod.json');
    if (f) { try { const j = JSON.parse(readEntry(jar, f).toString('utf8')); out[j.id] = [].concat(j.license || '').join(', '); } catch { /* json roto */ } }
  }
  return out;
}
