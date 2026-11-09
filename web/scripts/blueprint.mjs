// Genera el plano de la landing a partir del diseño real del Centro AE2 (seed/designs/diseno.js):
// planta cortada a la altura de las máquinas y alzado por el eje del pozo, con contornos, celdas, cotas y llamadas.
// Uso: node scripts/blueprint.mjs  →  src/landing/centro-ae2.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const M = await import(pathToFileURL(join(here, '../../seed/designs/diseno.js')).href);
const B = M.BLOCKS;

// categoría de dibujo de cada tipo de la paleta
const LIGHT = /lamp|lant|light|fix|sconce|chain/;
const GLASS = /^(pg_|tinted|qglass|vibr|amgl)/;
const MEK = /^mek_/;
const AE2 = /^(drive|expp|exif|masm|am|cacc|cu$|cstore|cmon|insc|chg|react|crya|cut$|grow|iop|cwb|req|wconn|hub_|ctrl|q|bud|mebr|cpc|wmod|mon|emcell|furn|elev)/;
const cat = t => (t === 'dcable' ? 'cable' : MEK.test(t) ? 'mek' : AE2.test(t) ? 'ae2' : GLASS.test(t) ? 'glass' : LIGHT.test(t) ? null : 'struct');
const RANK = { struct: 1, glass: 2, cable: 3, ae2: 4, mek: 5 };

// rejilla 2D → { cat: Set("a,b") }
function grid(cells) {
  const out = {};
  for (const [a, b, c] of cells) {
    const k = `${a},${b}`;
    const prev = out._best?.get(k);
    if (prev && RANK[prev] >= RANK[c]) continue;
    (out._best ??= new Map()).set(k, c);
  }
  const by = {};
  for (const [k, c] of out._best || []) (by[c] ??= new Set()).add(k);
  return by;
}
// relleno: tramos horizontales unidos en un solo path
function fill(set) {
  const rows = new Map();
  for (const k of set) { const [a, b] = k.split(',').map(Number); (rows.get(b) || rows.set(b, []).get(b)).push(a); }
  let d = '';
  for (const [b, xs] of [...rows].sort((p, q) => p[0] - q[0])) {
    xs.sort((p, q) => p - q);
    for (let i = 0; i < xs.length;) { let j = i; while (xs[j + 1] === xs[j] + 1) j++; d += `M${xs[i]} ${b}h${j - i + 1}v1h${-(j - i + 1)}z`; i = j + 1; }
  }
  return d;
}
// contorno: aristas entre una celda del conjunto y una que no lo es, fundidas cuando siguen en línea
function outline(set, inner = false) {
  const H = new Map(), V = new Map(), has = (a, b) => set.has(`${a},${b}`);
  const add = (m, line, from) => (m.get(line) || m.set(line, []).get(line)).push(from);
  for (const k of set) {
    const [a, b] = k.split(',').map(Number);
    if (inner || !has(a, b - 1)) add(H, b, a);
    if (inner || !has(a, b + 1)) add(H, b + 1, a);
    if (inner || !has(a - 1, b)) add(V, a, b);
    if (inner || !has(a + 1, b)) add(V, a + 1, b);
  }
  let d = '';
  for (const [line, s] of [...H].sort((p, q) => p[0] - q[0])) { const u = [...new Set(s)].sort((p, q) => p - q); for (let i = 0; i < u.length;) { let j = i; while (u[j + 1] === u[j] + 1) j++; d += `M${u[i]} ${line}H${u[j] + 1}`; i = j + 1; } }
  for (const [line, s] of [...V].sort((p, q) => p[0] - q[0])) { const u = [...new Set(s)].sort((p, q) => p - q); for (let i = 0; i < u.length;) { let j = i; while (u[j + 1] === u[j] + 1) j++; d += `M${line} ${u[i]}V${u[j] + 1}`; i = j + 1; } }
  return d;
}
const layers = by => Object.fromEntries(Object.entries(by).map(([c, set]) => [c, { fill: fill(set), edge: outline(set), cells: c === 'ae2' || c === 'mek' ? outline(set, true) : undefined, n: set.size }]));
const centroid = list => list.length ? list.reduce((s, b) => [s[0] + b[0] / list.length, s[1] + b[1] / list.length], [0, 0]) : null;
// punto al que apunta una llamada: el bloque del grupo más a la derecha (las etiquetas van a la derecha; el centro de un grupo simétrico cae en el vacío)
const rep = list => { if (!list.length) return null; const c = centroid(list), mx = Math.max(...list.map(p => p[0])); return list.filter(p => p[0] === mx).reduce((a, p) => (Math.abs(p[1] - c[1]) < Math.abs(a[1] - c[1]) ? p : a)); };
const count = t => B.filter(b => (t instanceof RegExp ? t.test(b.t) : b.t === t)).length;

// planta: celdas de y 0 a 3 (suelo y la altura de las máquinas), vistas desde arriba
const planCells = B.filter(b => b.y >= 0 && b.y <= 3).map(b => [b.x, b.z, cat(b.t)]).filter(x => x[2]);
const plan = layers(grid(planCells));

// alzado: silueta de todo el diseño visto desde el sur (x, y), y invertida para dibujar hacia arriba
const Y1 = Math.max(...B.map(b => b.y)), Y0 = Math.min(...B.map(b => b.y));
const secCells = B.map(b => [b.x, Y1 - b.y, cat(b.t)]).filter(x => x[2]);
const section = layers(grid(secCells));

const W = Math.max(...B.map(b => b.x)) + 1, D = Math.max(...B.map(b => b.z)) + 1;
const at = (t, f) => rep(B.filter(b => (t instanceof RegExp ? t.test(b.t) : b.t === t) && (!f || f(b))).map(b => [b.x + .5, b.z + .5]));
const atS = (t, f) => rep(B.filter(b => (t instanceof RegExp ? t.test(b.t) : b.t === t) && (!f || f(b))).map(b => [b.x + .5, Y1 - b.y + .5]));
const low = b => b.y >= 0 && b.y <= 3;
const out = {
  title: 'Centro AE2', W, D, H: Y1 - Y0 + 1, Y0, Y1, blocks: B.length,
  plan, section,
  calls: {
    plan: [
      { id: 'drives', at: at('drive', low), n: count('drive') },
      { id: 'quantum', at: at(/^q(core|shell|store|acc|thr|ent)/, low), n: count(/^q(core|shell|store|acc|thr|ent)/) },
      { id: 'assembler', at: at(/^am/, low), n: count(/^am/) },
      { id: 'mek', at: at(MEK, low), n: count(MEK) },
      { id: 'elevator', at: at('elev') },
    ].filter(c => c.at),
    section: [
      { id: 'controller', at: atS('ctrl'), n: count('ctrl'), y: Math.min(...B.filter(b => b.t === 'ctrl').map(b => b.y)) },
      { id: 'pit', at: atS('bconc'), y: Y0 },
      { id: 'floor', at: [W - 1.5, Y1 + .5], y: 0 },
      { id: 'cells', at: atS('emcell'), n: count('emcell'), y: Math.min(...B.filter(b => b.t === 'emcell').map(b => b.y)) },
    ].filter(c => c.at),
  },
};
mkdirSync(join(here, '../src/landing'), { recursive: true });
const file = join(here, '../src/landing/centro-ae2.json');
writeFileSync(file, JSON.stringify(out));
console.log(file, `${(JSON.stringify(out).length / 1024).toFixed(1)} KB`, 'planta', Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, v.n])), 'alzado', Object.fromEntries(Object.entries(section).map(([k, v]) => [k, v.n])), out.calls);

// ── escena de montaje de la landing: Sala Mekanism con categoría de color por bloque y su proceso real ──
const S = await import(pathToFileURL(join(here, '../../seed/designs/mekanism.js')).href);
const CATS = ['struct', 'glass', 'light', 'mek', 'gen', 'ae2', 'cable'];
const catOf = s => {
  const id = s.id || '';
  if (/glass/.test(id)) return 'glass';
  if (s.glow === true || /light|lamp|rodlamp/.test(id)) return 'light';
  if (/universal_cable|dense_cable|covered/.test(id)) return 'cable';
  if (/^ae2:sky_stone|^create:|block_steel|block_osmium|steel_casing|elevator/.test(id)) return 'struct';
  if (/^mekanismgenerators:/.test(id) || /induction|thermal_evaporation|sps_|supercharged|pressure_disperser/.test(id)) return 'gen';
  if (/^(mekanism|mekmm):/.test(id)) return 'mek';
  if (/^(ae2|extendedae):/.test(id)) return 'ae2';
  return 'struct';
};
const enclosed = b => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].every(([dx, dy, dz]) => occ.has(`${b.x + dx},${b.y + dy},${b.z + dz}`));
// corte arquitectónico: sin techo y con las paredes exteriores bajadas a 3 bloques, para ver el interior desde fuera
const cut = b => b.y >= (S.WALLS?.top ?? 99) || ((b.x <= 0 || b.z <= 0 || b.x >= (S.WX || S.W) - 1 || b.z >= (S.WZ || S.W) - 1) && b.y > 2);
const SB = S.BLOCKS, kept = S.BLOCKS.filter(b => !cut(b)), occ = new Set(kept.map(b => `${b.x},${b.y},${b.z}`));
const vis = kept.filter(b => !enclosed(b));
const flat = vis.flatMap(b => [b.x, b.y, b.z, CATS.indexOf(catOf(S.P[b.t]))]);
const room = { W: S.WX || S.W, D: S.WZ || S.W, H: S.H, cats: CATS, blocks: flat, total: SB.length, entries: S.ENTRIES.length, process: S.PROCESS, zones: S.ZONES };
writeFileSync(join(here, '../src/landing/sala-mekanism.json'), JSON.stringify(room));
console.log('sala-mekanism.json', vis.length, 'bloques visibles de', SB.length, `${(JSON.stringify(room).length / 1024).toFixed(0)} KB`,
  Object.fromEntries(CATS.map((c, i) => [c, vis.filter(b => catOf(S.P[b.t]) === c).length])));
