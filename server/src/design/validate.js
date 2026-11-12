// Validación: cada bloque ocupa su tamaño real (P[t].size, con offset); detecta solapes, flotantes, piezas de AE2 fuera de un cable
// y paneles que actúan sobre un bloque (proveedor, interfaz, buses) cuya cara no toca nada útil.
export const DIRS = { n: [0, 0, -1], s: [0, 0, 1], e: [1, 0, 0], w: [-1, 0, 0], u: [0, 1, 0], d: [0, -1, 0] };
export const SIDE_NAME = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
const AE2_CABLE = /^ae2:[a-z_]+_cable$/, TRANSPORT = /tube|pipe|cable|conduit|duct|transmitter/;
// celda de cable de AE2, como la exporta nbt.js (un cable tapado de otro mod no lo es)
export const isCableCell = (m, b) => !!b && ((!!b.cable && !(typeof m.P[b.t]?.cable === 'string' && !m.P[b.t].cable.startsWith('ae2:'))) || AE2_CABLE.test(m.P[b.t]?.id) || m.P[b.t]?.id === 'ae2:cable_bus');
// piezas que trabajan sobre el bloque que tocan: su cara tiene que dar a una máquina o inventario, no al aire ni a otro cable
export const ACTS_ON = /pattern_provider|interface|import_bus|export_bus|storage_bus/;
export const isMachine = s => !!s && !TRANSPORT.test(s.id) && !!(s.tier || s.dir || s.yaw || s.front || (s.size || []).some(v => v > 1));

export function footprint(b, s) {
  const size = s?.size || [1, 1, 1], off = s?.offset || [0, 0, 0];
  // girado según facing: en e/w se intercambian x y z
  const swap = b.f === 'e' || b.f === 'w', [sx, sy, sz] = swap ? [size[2], size[1], size[0]] : size, [ox, oy, oz] = swap ? [off[2], off[1], off[0]] : off;
  const cells = [];
  for (let x = 0; x < sx; x++) for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) cells.push([b.x + ox + x, b.y + oy + y, b.z + oz + z]);
  return cells;
}
export function occupancy(m) {
  const owner = new Map();
  for (const b of m.BLOCKS) for (const c of footprint(b, m.P[b.t])) if (!owner.has(c.join())) owner.set(c.join(), b);
  return owner;
}
// lados de la celda de una pieza que tocan un bloque que no es cable de AE2: [[lado, bloque], …]
export const touching = (m, owner, t) => Object.entries(DIRS).map(([f, d]) => [f, owner.get(`${t.x + d[0]},${t.y + d[1]},${t.z + d[2]}`)]).filter(([, b]) => b && !isCableCell(m, b));

export function validateModel(m) {
  const errors = [], warnings = [], owner = new Map();
  for (const b of m.BLOCKS) {
    const s = m.P[b.t];
    if (!s) { errors.push({ at: [b.x, b.y, b.z], msg: `Tipo ${b.t} sin paleta` }); continue; }
    for (const c of footprint(b, s)) {
      const k = c.join(), prev = owner.get(k);
      if (prev && prev !== b) errors.push({ at: c, msg: `${s.n || s.id} (${(s.size || [1, 1, 1]).join('×')}) se solapa con ${m.P[prev.t]?.n || prev.t} (${(m.P[prev.t]?.size || [1, 1, 1]).join('×')})` });
      else owner.set(k, b);
    }
  }
  for (const t of m.TERMS || []) {
    const s = m.P[t.t], at = [t.x, t.y, t.z], cell = owner.get(at.join());
    if (!s) { errors.push({ at, msg: `Pieza ${t.t} sin paleta` }); continue; }
    if (!DIRS[t.f]) { errors.push({ at, msg: `${s.id}: cara "${t.f}" no válida` }); continue; }
    if (cell && !isCableCell(m, cell)) { errors.push({ at, msg: `${s.id} está dentro de ${m.P[cell.t]?.id}: las piezas van en una celda de cable` }); continue; }
    if (!ACTS_ON.test(s.id)) continue;
    const near = touching(m, owner, t);
    if (near.some(([f]) => f === t.f)) continue;
    const d = DIRS[t.f], front = owner.get(`${t.x + d[0]},${t.y + d[1]},${t.z + d[2]}`);
    errors.push({ at, msg: `${s.id} mira a ${SIDE_NAME[t.f]} y ahí hay ${front ? 'otro cable' : 'aire'}: tiene que tocar lo que alimenta. `
      + (near.length ? `Lados de esa celda que tocan algo: ${near.map(([f, b]) => `${SIDE_NAME[f]} (${m.P[b.t]?.id})`).join(', ')}` : 'Ningún lado de esa celda toca una máquina: lleva el cable junto a ella.') });
  }
  const ys = m.BLOCKS.map(b => b.y), floor = ys.length ? Math.min(...ys) : 0;
  let floating = 0;
  for (const b of m.BLOCKS) if (b.y > floor && !owner.has(`${b.x},${b.y - 1},${b.z}`) && ![[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([dx, dy, dz]) => owner.has(`${b.x + dx},${b.y + dy},${b.z + dz}`))) floating++;
  if (floating) warnings.push({ msg: `${floating} bloques sin ningún vecino (flotan)` });
  return { ok: !errors.length, errors: errors.slice(0, 50), errorCount: errors.length, warnings };
}
