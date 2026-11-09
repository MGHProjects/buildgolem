// Mismo formato que el servidor (craftometry/1): referencias {"$r": n} a objetos compartidos.
export function decode(doc) {
  if (doc?.format !== 'craftometry/1') throw new Error('Formato de diseño desconocido');
  const out = new Map();
  const res = v => {
    if (Array.isArray(v)) return v.map(res);
    if (!v || typeof v !== 'object') return v;
    if ('$r' in v) {
      if (!out.has(v.$r)) { const o = {}; out.set(v.$r, o); Object.assign(o, Object.fromEntries(Object.entries(doc.refs[v.$r]).map(([k, x]) => [k, res(x)]))); }
      return out.get(v.$r);
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, res(x)]));
  };
  return res(doc.model);
}
