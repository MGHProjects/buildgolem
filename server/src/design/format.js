// Formato de diseño craftometry/1: el modelo del motor (P, BLOCKS, TERMS, ZONES…) serializado.
// Los objetos compartidos (fichas de máquina, patrones) se guardan una vez y se referencian con {"$r": n}.

export const FORMAT = 'craftometry/1';
const MAX_BLOCKS = 200_000;

export function encode(model) {
  const count = new Map();                                    // primer paso: cuántas veces aparece cada objeto
  (function mark(v) {
    if (!v || typeof v !== 'object') return;
    const n = count.get(v) || 0; count.set(v, n + 1);
    if (!n) for (const x of Array.isArray(v) ? v : Object.values(v)) mark(x);
  })(model);
  const ids = new Map(), refs = [];
  const plain = v => Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined && typeof x !== 'function').map(([k, x]) => [k, emit(x)]));
  const emit = v => {
    if (Array.isArray(v)) return v.map(emit);
    if (!v || typeof v !== 'object') return v;
    if (count.get(v) > 1) {
      if (!ids.has(v)) { const n = refs.push(null) - 1; ids.set(v, n); refs[n] = plain(v); }
      return { $r: ids.get(v) };
    }
    return plain(v);
  };
  return { format: FORMAT, refs, model: emit(model) };
}

export function decode(doc) {
  if (doc?.format !== FORMAT) throw new Error('Formato de diseño desconocido');
  const out = new Map();
  const res = v => {
    if (Array.isArray(v)) return v.map(res);
    if (!v || typeof v !== 'object') return v;
    if ('$r' in v) {
      const n = v.$r;
      if (!out.has(n)) { const o = {}; out.set(n, o); Object.assign(o, Object.fromEntries(Object.entries(doc.refs[n]).map(([k, x]) => [k, res(x)]))); }
      return out.get(n);
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, res(x)]));
  };
  return res(doc.model);
}

// validación mínima de lo que entra por la API: tamaño, tipos y que cada bloque use una entrada de la paleta
export function validateDoc(doc) {
  if (!doc || doc.format !== FORMAT || !Array.isArray(doc.refs) || typeof doc.model !== 'object') throw new Error('Diseño no válido');
  const m = doc.model;
  if (!m.P || typeof m.P !== 'object' || !Array.isArray(m.BLOCKS)) throw new Error('Al diseño le faltan la paleta o los bloques');
  if (m.BLOCKS.length > MAX_BLOCKS) throw new Error(`Máximo ${MAX_BLOCKS} bloques`);
  for (const b of m.BLOCKS) {
    const v = b?.$r != null ? doc.refs[b.$r] : b;
    if (!v || !Number.isInteger(v.x) || !Number.isInteger(v.y) || !Number.isInteger(v.z) || !(v.t in m.P)) throw new Error('Bloque no válido en el diseño');
  }
  return doc;
}

export const stats = model => {
  const xs = model.BLOCKS.map(b => b.x), ys = model.BLOCKS.map(b => b.y), zs = model.BLOCKS.map(b => b.z);
  const span = a => (a.length ? Math.max(...a) - Math.min(...a) + 1 : 0);
  return { blocks: model.BLOCKS.length, size: [span(xs), span(ys), span(zs)] };
};
