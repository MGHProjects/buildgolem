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

// grupos de bloques unidos (una vara o una cadena solo por las puntas de su eje) que no llegan al suelo del diseño
const NATURE = /^minecraft:(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|moss_block|stone|andesite|diorite|granite|tuff|deepslate|calcite|cobblestone|mossy_cobblestone|gravel|sand|dripstone_block|pointed_dripstone|amethyst_cluster|\w+_amethyst_bud|cave_vines(_plant)?|glow_lichen|hanging_roots|spore_blossom|vine|\w+_ore|\w+_leaves|\w+_log|\w+_wood)$/;
const THIN = /end_rod|lightning_rod|(^|:)chain$/, AXIS6 = { x: [[1, 0, 0], [-1, 0, 0]], y: [[0, 1, 0], [0, -1, 0]], z: [[0, 0, 1], [0, 0, -1]] };
const ALL6 = [...AXIS6.x, ...AXIS6.y, ...AXIS6.z], FACE_AXIS = { up: 'y', down: 'y', north: 'z', south: 'z', east: 'x', west: 'x' };
export function looseGroups(m, owner = occupancy(m), max = 64) {
  // up/down se guarda en props; norte/sur/este/oeste, en b.f
  const dirs = b => { const s = m.P[b.t], id = s?.id || ''; if (!THIN.test(id)) return ALL6; if (/chain/.test(id)) return AXIS6[s.props?.axis || 'y']; const pf = s.props?.facing; return AXIS6[pf ? FACE_AXIS[pf] || 'y' : b.f === 'e' || b.f === 'w' ? 'x' : 'z']; };
  const ys = m.BLOCKS.map(b => b.y), floor = ys.length ? Math.min(...ys) : 0, seen = new Set(), out = [];
  for (const b0 of m.BLOCKS) {
    if (seen.has(b0)) continue;
    const g = [b0], q = [b0]; seen.add(b0); let grounded = false;
    while (q.length) {
      const u = q.pop(); if (u.y <= floor) grounded = true;
      // unidas si al menos una toca a la otra con la punta (una vara saliendo de un mástil sí se sostiene; dos de lado, no)
      const du = dirs(u);
      for (const c of footprint(u, m.P[u.t])) for (const d of ALL6) {
        const v = owner.get(`${c[0] + d[0]},${c[1] + d[1]},${c[2] + d[2]}`);
        if (!v || v === u || seen.has(v) || (!du.includes(d) && !dirs(v).some(e => e[0] === -d[0] && e[1] === -d[1] && e[2] === -d[2]))) continue;
        seen.add(v); g.push(v); q.push(v);
      }
    }
    if (!grounded && g.length <= max) out.push(g);
  }
  return out;
}

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
  // isla flotante: columnas cuyo primer bloque es obra (no terreno ni plantas) y no tienen nada debajo: se salen del borde
  if (m.KINDS?.terrain) {
    const low = new Map(); let floor = Infinity;
    for (const b of m.BLOCKS) { if (b.y < floor) floor = b.y; const k = `${b.x},${b.z}`, o = low.get(k); if (!o || b.y < o.y) low.set(k, b); }
    const over = [...low.values()].filter(b => b.y > floor && !NATURE.test(m.P[b.t]?.id || ''));
    if (over.length) {
      const ids = {}; for (const b of over) { const id = m.P[b.t]?.id || b.t; ids[id] = (ids[id] || 0) + 1; }
      warnings.push({ msg: `${over.length} columnas de obra sobre el vacío, sin nada debajo (${Object.entries(ids).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} ×${n}`).join(', ')}): se salen del borde de la isla; muévelas hacia dentro con 2-3 de margen, aleros incluidos`, at: over.slice(0, 8).map(b => [b.x, b.y, b.z]) });
    }
  }
  const loose = looseGroups(m, owner);
  if (loose.length) {
    const ids = {}; for (const g of loose) for (const b of g) { const id = m.P[b.t]?.id || b.t; ids[id] = (ids[id] || 0) + 1; }
    const thin = loose.some(g => g.some(b => THIN.test(m.P[b.t]?.id || '')));
    warnings.push({ msg: `${loose.length} piezas sueltas en el aire (${Object.entries(ids).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} ×${n}`).join(', ')})${thin ? ': una vara o una cadena solo se sostiene por sus puntas; tocarse de lado no las une' : ''}`, at: loose.slice(0, 8).map(g => [g[0].x, g[0].y, g[0].z]) });
  }
  return { ok: !errors.length, errors: errors.slice(0, 50), errorCount: errors.length, warnings };
}
