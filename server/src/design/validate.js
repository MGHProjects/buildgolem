// Validación de geometría: cada bloque ocupa su tamaño real (P[t].size, con offset); detecta solapes, flotantes y celdas fuera.
export function footprint(b, s) {
  const size = s?.size || [1, 1, 1], off = s?.offset || [0, 0, 0];
  // girado según facing: en e/w se intercambian x y z
  const swap = b.f === 'e' || b.f === 'w', [sx, sy, sz] = swap ? [size[2], size[1], size[0]] : size, [ox, oy, oz] = swap ? [off[2], off[1], off[0]] : off;
  const cells = [];
  for (let x = 0; x < sx; x++) for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) cells.push([b.x + ox + x, b.y + oy + y, b.z + oz + z]);
  return cells;
}

export function validateModel(m) {
  const errors = [], warnings = [], owner = new Map();
  for (const b of m.BLOCKS) {
    const s = m.P[b.t];
    if (!s) { errors.push({ at: [b.x, b.y, b.z], msg: `Tipo ${b.t} sin paleta` }); continue; }
    for (const c of footprint(b, s)) {
      const k = c.join(','), prev = owner.get(k);
      if (prev && prev !== b) errors.push({ at: c, msg: `${s.n || s.id} (${(s.size || [1, 1, 1]).join('×')}) se solapa con ${m.P[prev.t]?.n || prev.t} (${(m.P[prev.t]?.size || [1, 1, 1]).join('×')})` });
      else owner.set(k, b);
    }
  }
  const ys = m.BLOCKS.map(b => b.y), floor = ys.length ? Math.min(...ys) : 0;
  let floating = 0;
  for (const b of m.BLOCKS) if (b.y > floor && !owner.has(`${b.x},${b.y - 1},${b.z}`) && ![[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([dx, dy, dz]) => owner.has(`${b.x + dx},${b.y + dy},${b.z + dz}`))) floating++;
  if (floating) warnings.push({ msg: `${floating} bloques sin ningún vecino (flotan)` });
  return { ok: !errors.length, errors: errors.slice(0, 50), errorCount: errors.length, warnings };
}
