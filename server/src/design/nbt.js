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

// tipos que no son bloques colocables (partes de AE2 dentro de un cable bus, fachadas): se listan para ponerlos a mano
const NOT_PLACEABLE = /^ae2:(.*_cable|.*_bus|.*terminal|cable_bus)$|^extendedae:.*_bus$/;
export const DATA_VERSION_1_21_1 = 3955;

export function toStructureNbt(model) {
  const { P, BLOCKS } = model;
  const keep = BLOCKS.filter(b => P[b.t]?.id && !NOT_PLACEABLE.test(P[b.t].id));
  const skipped = {}, kept = new Set(keep);
  for (const b of BLOCKS) if (!kept.has(b)) skipped[P[b.t]?.id || b.t] = (skipped[P[b.t]?.id || b.t] || 0) + 1;
  for (const t of model.TERMS || []) skipped[P[t.t]?.id || t.t] = (skipped[P[t.t]?.id || t.t] || 0) + 1;
  const min = [0, 1, 2].map(i => Math.min(...keep.map(b => [b.x, b.y, b.z][i])));
  const max = [0, 1, 2].map(i => Math.max(...keep.map(b => [b.x, b.y, b.z][i])));
  const palette = [], index = new Map();
  const stateOf = b => {
    const s = P[b.t], props = {};
    if (['n', 's', 'e', 'w'].includes(b.f) && (s.model || s.front || s.yaw != null)) props.facing = { n: 'north', s: 'south', e: 'east', w: 'west' }[b.f];
    if (b.top) props.type = 'top';
    const key = s.id + JSON.stringify(props);
    if (!index.has(key)) { index.set(key, palette.length); palette.push(Object.keys(props).length ? { Name: s.id, Properties: props } : { Name: s.id }); }
    return index.get(key);
  };
  const blocks = keep.map(b => ({ pos: { list: T.INT, items: [{ int: b.x - min[0] }, { int: b.y - min[1] }, { int: b.z - min[2] }] }, state: { int: stateOf(b) } }));
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
