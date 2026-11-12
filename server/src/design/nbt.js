// Exportación a estructura .nbt (formato de plantilla vanilla, lo que leen la Schematicannon de Create y /place template).
import { gzipSync } from 'node:zlib';

const T = { END: 0, INT: 3, STRING: 8, LIST: 9, COMPOUND: 10 };
class W {
  constructor() { this.parts = []; }
  u8(n) { const b = Buffer.alloc(1); b.writeUInt8(n); this.parts.push(b); }
  i16(n) { const b = Buffer.alloc(2); b.writeInt16BE(n); this.parts.push(b); }
  i32(n) { const b = Buffer.alloc(4); b.writeInt32BE(n); this.parts.push(b); }
  str(s) { const b = Buffer.from(s, 'utf8'); this.i16(b.length); this.parts.push(b); }
  buf() { return Buffer.concat(this.parts); }
}
// valores: {int: n} · string · [lista de compuestos] · {list: tipo, items} · objeto = compuesto
function tagOf(v) { return typeof v === 'string' ? T.STRING : v?.int != null ? T.INT : v?.list != null ? T.LIST : T.COMPOUND; }
function payload(w, v) {
  const t = tagOf(v);
  if (t === T.STRING) w.str(v);
  else if (t === T.INT) w.i32(v.int);
  else if (t === T.LIST) { w.u8(v.list); w.i32(v.items.length); for (const x of v.items) payload(w, x); }
  else { for (const [k, x] of Object.entries(v)) { w.u8(tagOf(x)); w.str(k); payload(w, x); } w.u8(T.END); }
}

// Cables de AE2: una celda de cable es un bloque ae2:cable_bus cuyo contenido (cable, partes y fachadas) va en el NBT del bloque.
// Una parte suelta en BLOCKS (un bus o una terminal sin cable) no se puede colocar: se lista en skipped.
const CABLE = /^ae2:\w+_cable$/, BUS = 'ae2:cable_bus';
const LOOSE_PART = /^ae2:(.*_bus|.*terminal)$|^extendedae:.*_bus$/;
const SIDE = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
const SIDES = [['down', 0, -1, 0], ['up', 0, 1, 0], ['north', 0, 0, -1], ['south', 0, 0, 1], ['west', -1, 0, 0], ['east', 1, 0, 0]];
const OPP = { north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up' };
const CCW = { north: 'west', west: 'south', south: 'east', east: 'north' }, CW = { north: 'east', east: 'south', south: 'west', west: 'north' };
// una dirección local del bloque girada como lo gira el visor según f (geometry.js, ROT: s 0°, e 90° antihorario, n 180°, w 90° horario)
const turn = (d, f) => !CCW[d] ? d : f === 'n' ? OPP[d] : f === 'e' ? CCW[d] : f === 'w' ? CW[d] : d;
const sideOf = d => SIDES.find(([, x, y, z]) => x === d[0] && y === d[1] && z === d[2])?.[0];
const cap = s => s[0].toUpperCase() + s.slice(1);
// lo que el visor dibuja como cubo opaco (engine/geometry.js, opaqueT): tapa la cara del vecino
const opaqueT = s => !!s && !s.model && !s.ctm && (!s.shape || s.shape === 'cube') && !s.glass && !s.cutout;
const MONITOR = /^computercraft:monitor_(normal|advanced)$/;
export const DATA_VERSION_1_21_1 = 3955;

/**
 * Pantallas de CC: Tweaked (SCREENS del diseño) como las une el propio mod: XIndex hacia la derecha de quien mira la pantalla
 * (el giro antihorario de facing), YIndex hacia arriba, y en el estado los bordes que se unen con el vecino (l r u d).
 */
function monitorCells(screens = []) {
  const out = new Map();
  for (const s of screens) {
    const facing = SIDE[s.f], right = CCW[facing];
    if (!right) continue;
    for (let i = 0; i < s.w; i++) for (let y = 0; y < s.h; y++) {
      const [x, z] = s.f === 'w' || s.f === 'e' ? [s.x, s.z0 + i] : [s.x + i, s.z0];
      const xi = right === 'east' ? x - s.x : right === 'west' ? s.x + s.w - 1 - x : right === 'south' ? z - s.z0 : s.z0 + s.w - 1 - z;
      const edges = (xi > 0 ? 'l' : '') + (xi < s.w - 1 ? 'r' : '') + (y < s.h - 1 ? 'u' : '') + (y > 0 ? 'd' : '');
      out.set(`${x},${s.y0 + y},${z}`, { props: { facing, orientation: 'north', state: edges || 'none' },
        nbt: { XIndex: { int: xi }, YIndex: { int: y }, Width: { int: s.w }, Height: { int: s.h } } });
    }
  }
  return out;
}

export function toStructureNbt(model) {
  const { P } = model, K = (x, y, z) => `${x},${y},${z}`;
  // cable tapado de otro mod (tubería, cable de Mekanism…): sin fachadas universales, se exporta el propio cable, que es lo que
  // hace funcionar la instalación; la tapa la pone el jugador con el mod de tapas que tenga el pack
  const foreign = b => !!b.cable && typeof P[b.t]?.cable === 'string' && !P[b.t].cable.startsWith('ae2:');
  const isBus = b => (!!b.cable && !foreign(b)) || CABLE.test(P[b.t]?.id) || P[b.t]?.id === BUS;
  const skipped = {}, skip = id => { skipped[id] = (skipped[id] || 0) + 1; };
  const keep = [];
  for (const b of model.BLOCKS) {
    const id = P[b.t]?.id;
    if (id && (isBus(b) || !LOOSE_PART.test(id))) keep.push(b); else skip(id || b.t);
  }
  const at = new Map(keep.map(b => [K(b.x, b.y, b.z), b]));
  // partes por celda: terminales y buses (TERMS), Quartz Fiber y túneles P2P; sin cable debajo, la celda nace con uno de cristal
  const parts = new Map();
  const part = (p, side, id) => {
    const k = K(p.x, p.y, p.z);
    if (!side || !id) return skip(id || 'parte');
    if (!at.has(k)) { const b = { x: p.x, y: p.y, z: p.z, bare: true }; at.set(k, b); keep.push(b); }
    else if (!isBus(at.get(k))) return skip(id);
    (parts.get(k) ?? parts.set(k, {}).get(k))[side] = id;
  };
  for (const t of model.TERMS || []) part(t, SIDE[t.f], P[t.t]?.id);
  for (const f of model.FIBER || []) part(f, sideOf(f.d), 'ae2:quartz_fiber');
  for (const p of model.CHANNELS?.P2P || []) part(p, sideOf(p.d), 'ae2:me_p2p_tunnel');

  const min = [0, 1, 2].map(i => Math.min(...keep.map(b => [b.x, b.y, b.z][i])));
  const max = [0, 1, 2].map(i => Math.max(...keep.map(b => [b.x, b.y, b.z][i])));
  const palette = [], index = new Map();
  const state = (id, props = {}) => {
    const key = id + JSON.stringify(props);
    if (!index.has(key)) { index.set(key, palette.length); palette.push(Object.keys(props).length ? { Name: id, Properties: props } : { Name: id }); }
    return index.get(key);
  };
  // estado del bloque tal como lo dibuja el visor (engine/geometry.js): la escalera tiene el escalón alto al lado contrario de f,
  // la vara del End apunta a f, el módem se pega a la cara bkey y un modelo o una cara frontal miran a f.
  // props de la paleta fija lo que el visor no ve (un barril tumbado, facing: up para que mire arriba…)
  const screens = monitorCells(model.SCREENS);
  const propsOf = b => {
    const s = P[b.t], id = s.id || '', f = SIDE[b.f], props = {};
    if (s.shape === 'stairs' || /_stairs$/.test(id)) { if (CCW[f]) props.facing = OPP[f]; props.half = b.top ? 'top' : 'bottom'; }
    else if (s.shape === 'slab' || /_slab$/.test(id)) props.type = b.top ? 'top' : 'bottom';
    else if (s.shape === 'modem') { const d = SIDE[b.bkey]; if (d) props.facing = turn(d, b.f); }
    else if (s.shape === 'rod') { if (f) props.facing = f; }
    else if (/_hanging$/.test([].concat(s.model || '')[0])) props.hanging = 'true';      // farol colgado de una cadena o del techo
    else if (f && (s.model || s.front || s.yaw != null) && !/:chain$/.test(id)) props.facing = f;
    return { ...props, ...(MONITOR.test(id) ? screens.get(K(b.x, b.y, b.z))?.props : null), ...s.props };
  };
  // contenido de un cable bus: cable en el centro, partes en sus caras y fachada en cada cara que el visor dibuja
  // (el vecino no es un cubo opaco: aire, cristal, escaleras, un cable a la vista…)
  const solid = n => !!n && !n.bare && (n.cable ? !foreign(n) && opaqueT(P[n.t]) : !isBus(n) && opaqueT(P[n.t]));
  const busNbt = b => {
    const s = P[b.t] || {}, k = K(b.x, b.y, b.z), mine = parts.get(k) || {};
    let cable = b.bare ? 'ae2:fluix_glass_cable' : b.cid || s.cable || (CABLE.test(s.id) ? s.id : `ae2:${b.col || 'white'}_covered_dense_cable`);
    // AE2 no deja ninguna pieza sobre un cable denso (el cable entero se pierde al cargar): en esa celda va el cable normal del mismo color
    if (Object.keys(mine).length) cable = cable.replace(/_dense_cable$/, '_cable');
    const nbt = { id: BUS, cable: { id: cable } };
    for (const [side, id] of Object.entries(mine)) nbt[side] = { id };
    // la fachada es el bloque que imita: el campo facade de la paleta o, si el tipo no es un cable, el propio bloque
    const facade = b.bare ? null : s.facade ? { Name: s.facade } : !CABLE.test(s.id) && s.id !== BUS ? palette[state(s.id, propsOf(b))] : null;
    const glassy = !!(s.glass || s.ctm);
    if (facade) for (const [side, dx, dy, dz] of SIDES) {
      const n = at.get(K(b.x + dx, b.y + dy, b.z + dz));
      if (!mine[side] && !solid(n) && !(glassy && n?.t === b.t)) nbt['facade' + cap(side)] = facade; // cristal con cristal igual: sin cara entre ellos
    }
    return nbt;
  };
  const blocks = keep.map(b => {
    const pos = { list: T.INT, items: [{ int: b.x - min[0] }, { int: b.y - min[1] }, { int: b.z - min[2] }] };
    if (foreign(b)) return { pos, state: { int: state(P[b.t].cable) } };
    if (b.bare || isBus(b)) return { pos, state: { int: state(BUS) }, nbt: busNbt(b) };
    const scr = MONITOR.test(P[b.t].id) && screens.get(K(b.x, b.y, b.z));
    return scr ? { pos, state: { int: state(P[b.t].id, propsOf(b)) }, nbt: { id: P[b.t].id, ...scr.nbt } } : { pos, state: { int: state(P[b.t].id, propsOf(b)) } };
  });
  const root = {
    DataVersion: { int: DATA_VERSION_1_21_1 },
    size: { list: T.INT, items: max.map((m, i) => ({ int: m - min[i] + 1 })) },
    palette: { list: T.COMPOUND, items: palette },
    blocks: { list: T.COMPOUND, items: blocks },
    entities: { list: T.COMPOUND, items: [] },
  };
  const w = new W();
  w.u8(T.COMPOUND); w.str(''); payload(w, root);
  return { file: gzipSync(w.buf()), skipped, size: root.size.items.map(i => i.int) };
}
