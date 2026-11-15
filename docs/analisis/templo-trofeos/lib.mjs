// Mundo en memoria + paso a edit_design (las mismas herramientas que usan los agentes) + guardado en la BD local para verlo.
import { runTool } from 'file:///C:/Users/mique/Proyectos/Craftometry/server/src/llm/tools.js';
import { encode, decode } from 'file:///C:/Users/mique/Proyectos/Craftometry/server/src/design/format.js';
import { readFileSync } from 'node:fs';

const HERE = new URL('.', import.meta.url);
export const BLOCKS_A = new Set(JSON.parse(readFileSync(new URL('blocks-atm10a.json', HERE), 'utf8')).map(b => b.id));
export const ITEMS_A = new Set(JSON.parse(readFileSync(new URL('items-atm10a.json', HERE), 'utf8')).map(b => b.id));

export const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
export const NAME = { n: 'north', s: 'south', e: 'east', w: 'west' };
export const DXZ = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

export function createWorld() {
  const cells = new Map(), disp = [];
  const k = (x, y, z) => `${x},${y},${z}`;
  const w = {
    cells, disp,
    // o: { state } con el estado de Minecraft (facing = lado alto en escaleras, half, shape, axis, type, hanging…)
    set(x, y, z, id, state) { if (id == null) cells.delete(k(x, y, z)); else cells.set(k(x, y, z), { x, y, z, id, state }); },
    get: (x, y, z) => cells.get(k(x, y, z)),
    has: (x, y, z) => cells.has(k(x, y, z)),
    del: (x, y, z) => cells.delete(k(x, y, z)),
    box(x0, y0, z0, x1, y1, z1, id, state) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) w.set(x, y, z, typeof id === 'function' ? id(x, y, z) : id, state);
    },
    clear(x0, y0, z0, x1, y1, z1) { w.box(x0, y0, z0, x1, y1, z1, null); },
    // escalera: low = hacia dónde baja (el escalón bajo); facing de Minecraft = el lado alto = contrario
    stair(x, y, z, id, low, { top = false, shape = 'straight' } = {}) { w.set(x, y, z, id, { facing: NAME[OPP[low]], half: top ? 'top' : 'bottom', shape }); },
    slab(x, y, z, id, top = false) { w.set(x, y, z, id, { type: top ? 'top' : 'bottom' }); },
    log(x, y, z, id, axis = 'y') { w.set(x, y, z, id, { axis }); },
    show(x, y, z, item) { disp.push({ x, y, z, item }); },
  };
  return w;
}

// Celdas → ops de edit_design (place con state) y llamada real a la herramienta
export async function toDesign(w, { title, workspaceId = 'atm10-demo', log = console.log } = {}) {
  const ctx = { workspaceId, design: encode({ TITLE: title, P: {}, BLOCKS: [], W: 1, H: 1 }), saveDesign() {} };
  const missing = new Set();
  for (const c of w.cells.values()) if (!BLOCKS_A.has(c.id)) missing.add(c.id);
  for (const d of w.disp) if (!ITEMS_A.has(d.item) && !BLOCKS_A.has(d.item)) missing.add('objeto ' + d.item);
  if (missing.size) log('NO ESTÁN EN ATM10A:', [...missing].join(', '));
  const ops = [...w.cells.values()].map(c => ({ op: 'place', x: c.x, y: c.y, z: c.z, block: c.id, ...(c.state ? { state: c.state } : {}) }));
  const fails = [], notes = new Set();
  for (let i = 0; i < ops.length; i += 2000) {
    const out = JSON.parse(await runTool('edit_design', { ops: ops.slice(i, i + 2000) }, ctx));
    for (const f of out.failed || []) fails.push(f);
    for (const n of out.notes || []) notes.add(n);
  }
  const dops = w.disp.map(d => ({ op: 'display', x: d.x, y: d.y, z: d.z, item: d.item }));
  for (let i = 0; i < dops.length; i += 2000) {
    const out = JSON.parse(await runTool('edit_design', { ops: dops.slice(i, i + 2000) }, ctx));
    for (const f of out.failed || []) fails.push({ ...f, disp: dops[i + f.i] });
    for (const n of out.notes || []) notes.add(n);
  }
  // tinte de bioma (el visor no lo pone solo: sin esto la hierba y los nenúfares salen grises)
  const TINT = { 'minecraft:grass_block': '#7fb238', 'minecraft:short_grass': '#7fb238', 'minecraft:tall_grass': '#7fb238', 'minecraft:fern': '#7fb238', 'minecraft:lily_pad': '#208030', 'minecraft:vine': '#5f9e2f', 'minecraft:oak_leaves': '#5f9e2f', 'minecraft:jungle_leaves': '#5f9e2f', 'minecraft:water': '#3f76e4' };
  { const m = decode(ctx.design); let ch = false; for (const p of Object.values(m.P)) { if (TINT[p.id]) { p.tint = { 0: TINT[p.id] }; ch = true; } if (p.id === 'minecraft:pink_petals') { p.size = [1, 1, 1]; p.offset = [0, 0, 0]; ch = true; } if (p.id === 'minecraft:water') { delete p.model; p.all = 'minecraft:water_still'; p.glass = true; p.ctint = Object.fromEntries(['top', 'bottom', 'side', 'front', 'back'].map(f => [f, '#3f76e4'])); ch = true; } } if (ch) ctx.design = encode(m); }
  if (fails.length) log('FALLOS', fails.length, JSON.stringify(fails.slice(0, 12)));
  if (notes.size) log('NOTAS', [...notes].slice(0, 12).join('\n  '));
  return { ctx, model: decode(ctx.design), tool: (n, a) => runTool(n, a, ctx) };
}

// Guarda en la BD local (cuenta de prueba) para abrirlo en el visor local
export async function saveLocal(doc, { id, slug, title, summary = '' }) {
  process.env.CRAFTOMETRY_DATA ||= 'C:/Users/mique/Proyectos/Craftometry/server/data';
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync('C:/Users/mique/Proyectos/Craftometry/server/data/craftometry.db');
  const m = decode(doc), xs = m.BLOCKS.map(b => b.x), ys = m.BLOCKS.map(b => b.y), zs = m.BLOCKS.map(b => b.z);
  const span = a => Math.max(...a) - Math.min(...a) + 1, size = JSON.stringify([span(xs), span(ys), span(zs)]), now = Date.now();
  if (db.prepare('SELECT 1 FROM designs WHERE id = ?').get(id)) db.prepare('UPDATE designs SET data = ?, size = ?, blocks = ?, title = ?, summary = ?, updated = ? WHERE id = ?').run(JSON.stringify(doc), size, m.BLOCKS.length, title, summary, now, id);
  else db.prepare("INSERT INTO designs (id, user_id, workspace_id, title, slug, summary, visibility, data, size, blocks, created, updated) VALUES (?, '6Wdpp_-7VZD4', 'atm10-mio', ?, ?, ?, 'unlisted', ?, ?, ?, ?, ?)").run(id, title, slug, summary, JSON.stringify(doc), size, m.BLOCKS.length, now, now);
  db.close();
}

// añade claves al modelo (ZONES = vistas de cámara) y devuelve el doc
export function withModel(doc, extra) { const m = decode(doc); Object.assign(m, extra); return encode(m); }
