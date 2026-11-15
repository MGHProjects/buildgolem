// Arquitectura en código: el modelo decide qué (estilo, volúmenes, piezas) y esto calcula dónde (anillos del tejado, curvas,
// pilares, simetría). Salió de construir a mano el Templo de los Trofeos: lo que hacía bonito el resultado era esto, no el LLM.
// Trabaja sobre un "lienzo" w con set/get/has/del (edit_design le pasa uno que escribe en el diseño).

const OPP = { n: 's', s: 'n', e: 'w', w: 'e' }, NAME = { n: 'north', s: 'south', e: 'east', w: 'west' };
const D = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const hash = (x, y, z) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 100;

// lienzo: a un objeto con set/del/has/get le añade box, stair (low = lado del escalón bajo), slab y log
export function canvas(w) {
  return Object.assign(w, {
    box(x0, y0, z0, x1, y1, z1, id, state) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) w.set(x, y, z, id, state); },
    stair(x, y, z, id, low, { top = false, shape = 'straight' } = {}) { w.set(x, y, z, id, { facing: NAME[OPP[low] || 'n'], half: top ? 'top' : 'bottom', shape }); },
    slab(x, y, z, id, top = false) { w.set(x, y, z, id, { type: top ? 'top' : 'bottom' }); },
    log(x, y, z, id, axis = 'y') { w.set(x, y, z, id, { axis }); },
  });
}
// mundo en memoria (run_code): celdas {id, state}; `seed` son las que ya tenía el diseño
export function memoryWorld(seed = []) {
  const cells = new Map(seed.map(c => [`${c.x},${c.y},${c.z}`, c])), k = (x, y, z) => `${x},${y},${z}`;
  return canvas({
    cells,
    set(x, y, z, id, state) { if (id == null) cells.delete(k(x, y, z)); else cells.set(k(x, y, z), { x, y, z, id: String(id), state: state || undefined }); },
    del(x, y, z) { cells.delete(k(x, y, z)); },
    has: (x, y, z) => cells.has(k(x, y, z)),
    get: (x, y, z) => cells.get(k(x, y, z))?.id ?? null,
  });
}

// ── estilos: materiales por rol, forma del tejado y proporciones (ids vanilla salvo luces con alternativa) ──
const TILE = { stairs: 'minecraft:deepslate_tile_stairs', slab: 'minecraft:deepslate_tile_slab', block: 'minecraft:deepslate_tiles', ridge: 'minecraft:polished_blackstone_bricks', tip: 'minecraft:polished_blackstone', gable: 'minecraft:dark_oak_planks' };
export const STYLES = {
  japones: {
    name: 'Japonés (templo, santuario, casa tradicional)', base: 'minecraft:stone_bricks', baseMix: ['minecraft:mossy_stone_bricks', 15], baseTop: 'minecraft:smooth_stone',
    post: 'minecraft:stripped_mangrove_log', beam: 'minecraft:stripped_dark_oak_log', infill: 'minecraft:calcite', window: 'minecraft:white_stained_glass', bracket: 'minecraft:dark_oak_stairs',
    floor: 'minecraft:dark_oak_planks', ceiling: 'minecraft:dark_oak_planks', coffer: 'minecraft:mangrove_planks', step: 'minecraft:stone_brick_stairs',
    light: 'minecraft:lantern', lamp: ['mcwlights:white_paper_lamp', 'minecraft:lantern'], eaveLight: ['chipped:red_paper_lantern', 'mcwlights:red_paper_lamp', 'minecraft:lantern'],
    roof: TILE, roofShape: 'irimoya', pitch: 'curva', over: 2, upturn: true, bay: 4, bridge: 'mangrove', tree: 'cerezo',
  },
  chino: {
    name: 'Chino (palacio, pabellón)', base: 'minecraft:polished_andesite', baseMix: ['minecraft:andesite', 10], baseTop: 'minecraft:smooth_stone',
    post: 'minecraft:stripped_mangrove_log', beam: 'minecraft:stripped_mangrove_log', infill: 'minecraft:red_terracotta', window: 'minecraft:yellow_stained_glass', bracket: 'minecraft:mangrove_stairs',
    floor: 'minecraft:polished_andesite', ceiling: 'minecraft:mangrove_planks', coffer: 'minecraft:gold_block', step: 'minecraft:andesite_stairs',
    light: 'minecraft:lantern', lamp: ['chipped:red_paper_lantern', 'minecraft:lantern'], eaveLight: ['chipped:red_paper_lantern', 'minecraft:lantern'],
    roof: { stairs: 'minecraft:waxed_oxidized_cut_copper_stairs', slab: 'minecraft:waxed_oxidized_cut_copper_slab', block: 'minecraft:waxed_oxidized_cut_copper', ridge: 'minecraft:gold_block', tip: 'minecraft:gold_block', gable: 'minecraft:mangrove_planks' },
    roofShape: 'hip', pitch: 'curva', over: 2, upturn: true, bay: 3, bridge: 'mangrove', tree: 'cerezo',
  },
  medieval: {
    name: 'Medieval (entramado, posada, granja)', base: 'minecraft:cobblestone', baseMix: ['minecraft:mossy_cobblestone', 18], baseTop: 'minecraft:stone_bricks',
    post: 'minecraft:stripped_spruce_log', beam: 'minecraft:stripped_spruce_log', infill: 'minecraft:mushroom_stem', window: 'minecraft:glass', bracket: 'minecraft:spruce_stairs',
    floor: 'minecraft:spruce_planks', ceiling: 'minecraft:spruce_planks', step: 'minecraft:cobblestone_stairs',
    light: 'minecraft:lantern', lamp: ['minecraft:lantern'], eaveLight: ['minecraft:lantern'],
    roof: { stairs: 'minecraft:dark_oak_stairs', slab: 'minecraft:dark_oak_slab', block: 'minecraft:dark_oak_planks', ridge: 'minecraft:dark_oak_planks', tip: 'minecraft:dark_oak_log', gable: 'minecraft:spruce_planks' },
    roofShape: 'gable', pitch: 'normal', over: 1, upturn: false, bay: 4, bridge: 'spruce', tree: 'roble',
  },
  tecnologico: {
    name: 'Tecnológico (laboratorio, estación espacial, base de energía)', base: 'minecraft:polished_deepslate', baseTop: 'minecraft:smooth_stone',
    post: 'minecraft:iron_block', beam: 'minecraft:polished_deepslate', infill: 'minecraft:light_gray_concrete', window: 'minecraft:cyan_stained_glass', bracket: null,
    floor: 'minecraft:smooth_stone', ceiling: 'minecraft:light_gray_concrete', step: 'minecraft:polished_deepslate_stairs', parapet: 'minecraft:polished_deepslate_slab',
    light: 'minecraft:sea_lantern', lamp: ['minecraft:sea_lantern'], eaveLight: null,
    roof: { stairs: 'minecraft:polished_deepslate_stairs', slab: 'minecraft:polished_deepslate_slab', block: 'minecraft:polished_deepslate', ridge: 'minecraft:iron_block', tip: 'minecraft:iron_block', gable: 'minecraft:light_gray_concrete' },
    roofShape: 'flat', pitch: 'normal', over: 1, upturn: false, bay: 4, windowBand: 'tall', bridge: 'stone', tree: 'abedul',
  },
  moderno: {
    name: 'Moderno (museo, galería, villa)', base: 'minecraft:smooth_stone', baseTop: 'minecraft:smooth_stone',
    post: 'minecraft:white_concrete', beam: 'minecraft:white_concrete', infill: 'minecraft:light_gray_concrete', window: 'minecraft:light_gray_stained_glass', bracket: null,
    floor: 'minecraft:polished_diorite', ceiling: 'minecraft:white_concrete', step: 'minecraft:smooth_stone_slab', parapet: 'minecraft:smooth_stone_slab',
    light: 'minecraft:sea_lantern', lamp: ['minecraft:sea_lantern'], eaveLight: null,
    roof: { stairs: 'minecraft:smooth_quartz_stairs', slab: 'minecraft:smooth_stone_slab', block: 'minecraft:white_concrete', ridge: 'minecraft:white_concrete', tip: 'minecraft:white_concrete', gable: 'minecraft:white_concrete' },
    roofShape: 'flat', pitch: 'normal', over: 1, upturn: false, bay: 5, windowBand: 'tall', bridge: 'stone', tree: 'abedul',
  },
};
// un estilo con lo que el jugador quiera cambiar (tema de un mod: base, interior…); `has` dice si un id existe en el pack
export function styleOf(name, over = {}, has = () => true) {
  const base = STYLES[name] || STYLES.japones, s = { ...base, roof: { ...base.roof, ...(over.roof || {}) }, ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== 'roof')) };
  for (const k of ['lamp', 'eaveLight']) if (Array.isArray(s[k])) s[k] = s[k].find(has) || null;
  return s;
}

// ── perfil del tejado: media altura por anillo, del alero a la cumbrera ──
// curva: los primeros anillos suben ½ bloque y luego 1 (kawara cóncavo) · normal: 45° · suave: alterna ½ y 1 · empinada: 1½ por anillo
export function profile(n, pitch = 'curva') {
  const h = []; let v = 0;
  for (let i = 0; i < n; i++) { v += pitch === 'curva' ? (i <= 3 ? 1 : 2) : pitch === 'suave' ? (i % 2 ? 2 : 1) : pitch === 'empinada' ? 3 : 2; h.push(v); }
  return h;
}

// Tejado con alero, esquinas levantadas, irimoya/cuatro aguas/dos aguas, cumbrera y remates.
// x0..x1, z0..z1: línea de muros; y: capa del alero (la de la viga de cabeza). gable: anillos a cuatro aguas antes del hastial
// (null = cuatro aguas entero; -1 = dos aguas puro). stopAt: solo los primeros anillos (tejado intermedio, pisos de pagoda).
export function roof(w, { x0, z0, x1, z1, y, over = 2, mat, gable = null, pitch = 'curva', stopAt = null, upturn = true, ornaments = true, axis = null, skip = null }) {
  const X0 = x0 - over, X1 = x1 + over, Z0 = z0 - over, Z1 = z1 + over;
  const alongX = axis ? axis === 'x' : (X1 - X0) >= (Z1 - Z0);
  const half = Math.floor((alongX ? Z1 - Z0 : X1 - X0) / 2);
  const P = profile(half + 2, pitch);
  const rings = stopAt == null ? half : Math.min(half, stopAt - 1);
  const layer = h => y + Math.floor((h - 1) / 2);
  const put = (x, z, h, low, shape = 'straight', prev = null) => {
    if (skip && skip(x, z)) return;
    const L = layer(h);
    if (h % 2 === 1) w.slab(x, L, z, mat.slab); else w.stair(x, L, z, mat.stairs, low, { shape });
    if (prev != null) for (let q = layer(prev) + 1; q < L; q++) if (!w.has(x, q, z)) w.set(x, q, z, mat.block);   // tejado empinado: sin huecos
  };
  const lift = d => (!upturn ? 0 : Math.max(0, 2 - d));
  const g = gable == null ? null : Math.max(gable, 0), pure = gable != null && gable < 0;
  for (let i = 0; i <= rings; i++) {
    let ax0 = X0 + i, ax1 = X1 - i, az0 = Z0 + i, az1 = Z1 - i;
    const gab = pure || (gable != null && i > gable);
    if (gab) { if (alongX) { ax0 = X0 + g; ax1 = X1 - g; } else { az0 = Z0 + g; az1 = Z1 - g; } }
    if (ax0 > ax1 || az0 > az1) break;
    if (alongX ? az0 === az1 : ax0 === ax1) break;
    const h = P[i], prev = i ? P[i - 1] : null, up = d => lift(d + i);
    if (!gab && up(0) > 0) for (const [cx, cz] of [[ax0, az0], [ax1, az0], [ax0, az1], [ax1, az1]]) if (!(skip && skip(cx, cz)) && !w.has(cx, layer(h), cz)) w.slab(cx, layer(h), cz, mat.slab, true);
    if (alongX) for (let x = ax0; x <= ax1; x++) {
      const d = Math.min(x - ax0, ax1 - x), corner = d === 0 && !gab, hh = h + (gab ? 0 : up(d));
      put(x, az0, hh, 'n', corner ? (x === ax0 ? 'outer_left' : 'outer_right') : 'straight', prev);
      put(x, az1, hh, 's', corner ? (x === ax0 ? 'outer_right' : 'outer_left') : 'straight', prev);
    } else for (let z = az0; z <= az1; z++) {
      const d = Math.min(z - az0, az1 - z), corner = d === 0 && !gab, hh = h + (gab ? 0 : up(d));
      put(ax0, z, hh, 'w', corner ? (z === az0 ? 'outer_right' : 'outer_left') : 'straight', prev);
      put(ax1, z, hh, 'e', corner ? (z === az0 ? 'outer_left' : 'outer_right') : 'straight', prev);
    }
    if (gab) continue;
    if (alongX) for (let z = az0 + 1; z < az1; z++) { const d = Math.min(z - az0, az1 - z), hh = h + up(d); put(ax0, z, hh, 'w', 'straight', prev); put(ax1, z, hh, 'e', 'straight', prev); }
    else for (let x = ax0 + 1; x < ax1; x++) { const d = Math.min(x - ax0, ax1 - x), hh = h + up(d); put(x, az0, hh, 'n', 'straight', prev); put(x, az1, hh, 's', 'straight', prev); }
  }
  const ri = half, n = layer(P[ri]), even = (alongX ? Z1 - Z0 : X1 - X0) % 2 === 1;
  const gx0 = gable != null && alongX ? X0 + g : X0 + ri, gx1 = gable != null && alongX ? X1 - g : X1 - ri;
  const gz0 = gable != null && !alongX ? Z0 + g : Z0 + ri, gz1 = gable != null && !alongX ? Z1 - g : Z1 - ri;
  if (stopAt == null) {
    const rows = alongX ? [Z0 + ri, ...(even ? [Z0 + ri + 1] : [])] : [X0 + ri, ...(even ? [X0 + ri + 1] : [])];
    if (alongX) for (let x = gx0; x <= gx1; x++) for (const z of rows) { w.set(x, n, z, mat.block); w.set(x, n + 1, z, mat.ridge); }
    else for (let z = gz0; z <= gz1; z++) for (const x of rows) { w.set(x, n, z, mat.block); w.set(x, n + 1, z, mat.ridge); }
    if (ornaments) {
      const ends = alongX ? rows.flatMap(z => [[gx0, z, 'w'], [gx1, z, 'e']]) : rows.flatMap(x => [[x, gz0, 'n'], [x, gz1, 's']]);
      for (const [x, z, d] of ends) { w.set(x, n + 2, z, mat.tip || mat.ridge); const [dx, dz] = D[d]; w.stair(x + dx, n + 2, z + dz, mat.stairs, OPP[d], { top: true }); }
    }
    // hastial: pared triangular bajo los faldones en los extremos cortos
    if (gable != null) {
      const base = pure ? y : layer(P[g]), inset = pure ? over : g + 1;
      const faces = alongX ? [X0 + inset, X1 - inset] : [Z0 + inset, Z1 - inset], span = alongX ? [Z0 + inset, Z1 - inset] : [X0 + inset, X1 - inset];
      for (const f of faces) for (let u = span[0]; u <= span[1]; u++) {
        const r = alongX ? Math.min(u - Z0, Z1 - u) : Math.min(u - X0, X1 - u), lay = r >= ri ? n : layer(P[r]) - 1;
        for (let q = base; q <= lay; q++) { const [x, z] = alongX ? [f, u] : [u, f]; if (!w.has(x, q, z)) w.set(x, q, z, mat.gable || mat.block); }
      }
    }
  }
  return { top: n + 1, X0, X1, Z0, Z1, alongX };
}

// Muro con estructura: pilares cada `bay` (y en esquinas), durmiente, viga intermedia y de cabeza, paños, ventanas y ménsulas.
export function walls(w, { x0, z0, x1, z1, y0, y1, S, bay = S.bay || 4, door = () => false, doorH = 4, nukiAt = null, brackets = true, windowY = null }) {
  const onRing = (x, z) => x === x0 || x === x1 || z === z0 || z === z1, H = y1 - y0;
  const wy = windowY || (S.windowBand === 'tall' ? [1, H - 1] : H >= 9 ? [H - 4, H - 2] : [Math.max(1, Math.floor(H / 2) - 1), Math.floor(H / 2)]);
  const nuki = nukiAt ?? (S.windowBand === 'tall' ? -1 : Math.max(1, wy[0] - 1));
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (!onRing(x, z)) continue;
    const ex = x === x0 || x === x1, ez = z === z0 || z === z1, u = ez ? x - x0 : z - z0;
    const post = (ex && ez) || u % bay === 0, axis = ez ? 'x' : 'z';
    for (let y = y0; y <= y1; y++) {
      const ry = y - y0;
      if (door(x, z) && ry < doorH) { w.del(x, y, z); continue; }
      if (post) { w.log(x, y, z, S.post, 'y'); continue; }
      if (ry === 0 || y === y1 || ry === nuki || (door(x, z) && ry === doorH)) { w.log(x, y, z, S.beam, axis); continue; }
      const win = S.window && ry >= wy[0] && ry <= wy[1] && !door(x, z);
      w.set(x, y, z, win ? S.window : S.infill);
    }
    if (post && brackets && S.bracket && !(ex && ez)) {
      const d = ez ? (z === z0 ? 'n' : 's') : (x === x0 ? 'w' : 'e'), [dx, dz] = D[d];
      if (!w.has(x + dx, y1 - 1, z + dz)) w.stair(x + dx, y1 - 1, z + dz, S.bracket, d, { top: true });
    }
  }
  return { windowY: wy };
}

const hangAt = (w, x, y, z, id, chain = 0) => { if (!id) return; for (let i = 1; i <= chain; i++) w.set(x, y + i, z, 'minecraft:chain', { axis: 'y' }); w.set(x, y, z, id, /:(soul_)?lantern$/.test(id) ? { hanging: 'true' } : undefined); };

// Edificio completo: zócalo, suelo, muros, puertas con escalón, forro interior, techo (liso o artesonado), tejado, tejado
// intermedio, porche, luces dentro, en el desván y bajo el alero. Devuelve las medidas útiles para decorar dentro.
export function building(w, o, S) {
  const { x0, z0, x1, z1 } = o, y = o.y, base = o.base ?? 1, height = o.height ?? (Math.max(x1 - x0, z1 - z0) >= 24 ? 10 : 7);
  if (x1 - x0 < 4 || z1 - z0 < 4) throw new Error('building: mínimo 5 × 5');
  if (x1 - x0 > 60 || z1 - z0 > 60) throw new Error('building: más de 61 de lado; parte el programa en varios edificios (plan_site)');
  const fy = y + base - 1, sy = fy + 1, top = sy + height - 1, shape = o.roof || S.roofShape;
  const span = Math.min(x1 - x0, z1 - z0), over = o.over ?? (span >= 20 ? S.over + 1 : S.over);
  // zócalo
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 1; z++) for (let q = y; q <= fy; q++) {
    const edge = x === x0 - 1 || x === x1 + 1 || z === z0 - 1 || z === z1 + 1, inner = x > x0 && x < x1 && z > z0 && z < z1;
    if (inner && q === fy) { w.set(x, q, z, o.floor || S.floor); continue; }
    const themed = !!o.baseBlock;                                         // zócalo del tema: sin la mezcla del estilo y con su remate
    w.set(x, q, z, edge && q === fy ? (o.baseTop || (themed ? o.baseBlock : S.baseTop || S.base)) : !themed && S.baseMix && hash(x, q, z) < S.baseMix[1] ? S.baseMix[0] : (o.baseBlock || S.base));
  }
  // puertas
  const doors = (o.doors?.length ? o.doors : [{ side: 's' }]).map(d => {
    const side = d.side || 's', wdt = d.width ?? (span >= 20 ? 5 : 3), along = side === 'n' || side === 's';
    const c = d.at ?? (along ? (x0 + x1) >> 1 : (z0 + z1) >> 1), a = c - ((wdt - 1) >> 1), b = a + wdt - 1;
    return { side, a, b, h: d.height ?? Math.min(height - 2, wdt >= 5 ? 6 : 4), line: side === 'n' ? z0 : side === 's' ? z1 : side === 'w' ? x0 : x1 };
  });
  const isDoor = (x, z) => doors.find(d => (d.side === 'n' || d.side === 's') ? z === d.line && x >= d.a && x <= d.b : x === d.line && z >= d.a && z <= d.b);
  const doorH = Math.max(...doors.map(d => d.h));
  const lin = o.lining ? 1 : 0;
  walls(w, { x0, z0, x1, z1, y0: sy, y1: top, S, door: (x, z) => !!isDoor(x, z), doorH });
  for (const d of doors) for (let u = d.a; u <= d.b; u++) {               // escalón de entrada y paso por el forro
    const [dx, dz] = D[d.side], [x, z] = d.side === 'n' || d.side === 's' ? [u, d.line] : [d.line, u];
    for (let k = 0; k < base; k++) {                                       // un escalón por capa de zócalo, hacia fuera
      const sx = x + dx * (k + 1), sz = z + dz * (k + 1);
      w.stair(sx, fy - k, sz, S.step, d.side);
      for (let q = y; q < fy - k; q++) w.set(sx, q, sz, S.base);
    }
    for (let q = sy + d.h; q < sy + d.h + 1 && q < top; q++) w.log(x, q, z, S.beam, d.side === 'n' || d.side === 's' ? 'x' : 'z');
  }
  // forro interior del tema (muro doble): pilares alineados con los de fuera, zócalo y cornisa del acento
  if (o.lining) {
    const L = o.lining, pil = o.liningPillar || L, acc = o.liningAccent || L;
    for (let x = x0 + 1; x <= x1 - 1; x++) for (let z = z0 + 1; z <= z1 - 1; z++) {
      const ring = x === x0 + 1 || x === x1 - 1 || z === z0 + 1 || z === z1 - 1;
      if (!ring) continue;
      const u = (x === x0 + 1 || x === x1 - 1) ? z - z0 : x - x0, cornerL = (x === x0 + 1 || x === x1 - 1) && (z === z0 + 1 || z === z1 - 1);
      for (let q = sy; q < top; q++) {
        const dd = doors.find(d => (d.side === 'n' ? z === z0 + 1 : d.side === 's' ? z === z1 - 1 : d.side === 'w' ? x === x0 + 1 : x === x1 - 1) && ((d.side === 'n' || d.side === 's') ? x >= d.a && x <= d.b : z >= d.a && z <= d.b));
        if (dd && q < sy + dd.h) { w.del(x, q, z); continue; }
        w.set(x, q, z, cornerL || u % (S.bay || 4) === 0 ? pil : q === sy || q === top - 1 ? acc : L);
      }
    }
  }
  // techo
  const ix0 = x0 + 1 + lin, ix1 = x1 - 1 - lin, iz0 = z0 + 1 + lin, iz1 = z1 - 1 - lin, flat = shape === 'flat';
  for (let x = x0 + 1; x <= x1 - 1; x++) for (let z = z0 + 1; z <= z1 - 1; z++) {
    const coffer = o.ceiling === 'artesonado' && S.coffer;
    const grid = (x - x0) % (S.bay || 4) === 0 || (z - z0) % (S.bay || 4) === 0;
    if (coffer && grid) w.log(x, top, z, S.beam, (x - x0) % (S.bay || 4) === 0 ? 'z' : 'x');
    else w.set(x, top, z, coffer ? S.coffer : (typeof o.ceiling === 'string' && o.ceiling !== 'artesonado' ? o.ceiling : S.ceiling));
  }
  // tejado
  let roofTop = top + 1, eave = null;
  const porchSide = o.porch === true ? doors[0].side : o.porch;
  const porchD = porchSide && doors.find(d => d.side === porchSide);
  const porchSkip = porchD ? (x, z) => { const [a, b] = [porchD.a - 2, porchD.b + 2]; return porchD.side === 's' ? x >= a && x <= b && z >= z1 : porchD.side === 'n' ? x >= a && x <= b && z <= z0 : porchD.side === 'e' ? z >= a && z <= b && x >= x1 : z >= a && z <= b && x <= x0; } : null;
  if (flat) {
    if (w.flatRoofs) w.flatRoofs.push([x0 - 1, z0 - 1, x1 + 1, z1 + 1]);   // azotea plana pedida: la revisión no la toma por una caja
    for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 1; z++) {
      const edge = x === x0 - 1 || x === x1 + 1 || z === z0 - 1 || z === z1 + 1;
      w.set(x, top + 1, z, edge ? S.roof.block : S.roof.slab, edge ? undefined : { type: 'bottom' });
      if (edge) w.set(x, top + 2, z, S.parapet || S.roof.slab, { type: 'bottom' });
    }
    roofTop = top + 2;
  } else {
    const gable = shape === 'gable' ? -1 : shape === 'irimoya' ? Math.max(1, Math.floor(Math.min(x1 - x0, z1 - z0) / 4)) : null;
    const r = roof(w, { x0, z0, x1, z1, y: top, over, mat: S.roof, gable, pitch: o.pitch || S.pitch, upturn: S.upturn, axis: o.axis || null });
    roofTop = r.top + 1; eave = r;
    if (o.pent ?? (S.pitch === 'curva' && height >= 9)) roof(w, { x0, z0, x1, z1, y: sy + Math.floor(height / 2), over: 2, mat: S.roof, stopAt: 2, ornaments: false, upturn: S.upturn, skip: porchSkip });
  }
  // porche con hastial sobre la puerta
  if (porchD && !flat) {
    const [a, b] = [porchD.a - 1, porchD.b + 1], deep = 3, pz = porchD.line + (porchD.side === 's' || porchD.side === 'e' ? deep : -deep), ph = sy + Math.floor(height / 2);
    const vertical = porchD.side === 's' || porchD.side === 'n';
    for (const u of [a, b]) for (let q = sy - (base > 0 ? 1 : 0); q < ph; q++) { const [x, z] = vertical ? [u, pz] : [pz, u]; w.log(x, q, z, S.post, 'y'); }
    for (let u = a; u <= b; u++) { const [x, z] = vertical ? [u, pz] : [pz, u]; w.log(x, ph, z, S.beam, vertical ? 'x' : 'z'); }
    const lo = Math.min(porchD.line, pz), hi = Math.max(porchD.line, pz);
    roof(w, vertical ? { x0: a, z0: lo, x1: b, z1: hi, y: ph, over: 1, mat: S.roof, axis: 'z', gable: -1, pitch: S.pitch, upturn: S.upturn }
      : { x0: lo, z0: a, x1: hi, z1: b, y: ph, over: 1, mat: S.roof, axis: 'x', gable: -1, pitch: S.pitch, upturn: S.upturn });
  }
  // luces: dentro (colgadas), en el desván (sobre el techo) y bajo el alero
  if (o.lights !== false) {
    const step = 6;
    const hanging = /lantern$/.test(S.light || '');
    for (let x = ix0 + 2; x <= ix1 - 2; x += step) for (let z = iz0 + 2; z <= iz1 - 2; z += step) {
      if (!hanging) w.set(x, top, z, S.light);                              // luz empotrada en el techo (moderno)
      else if (!w.has(x, top - 1, z) && !w.has(x, top - 2, z)) hangAt(w, x, top - 2, z, S.light, 1);
    }
    if (!flat) for (let x = x0 + 3; x <= x1 - 3; x += 8) for (let z = z0 + 3; z <= z1 - 3; z += 8) if (!w.has(x, top + 1, z)) w.set(x, top + 1, z, 'minecraft:lantern');
    if (eave && S.eaveLight) {
      const X0 = x0 - over, X1 = x1 + over, Z0 = z0 - over, Z1 = z1 + over;
      for (let x = x0 + 2; x <= x1 - 2; x += 6) for (const z of [Z0, Z1]) if (!w.has(x, top - 1, z) && !(porchSkip && porchSkip(x, z))) hangAt(w, x, top - 1, z, S.eaveLight);
      for (let z = z0 + 2; z <= z1 - 2; z += 6) for (const x of [X0, X1]) if (!w.has(x, top - 1, z) && !(porchSkip && porchSkip(x, z))) hangAt(w, x, top - 1, z, S.eaveLight);
    }
  }
  return {
    interior: [ix0, iz0, ix1, iz1], floorY: fy, standY: sy, ceilingY: top, roofTop,
    doors: doors.map(d => ({ side: d.side, cells: d.side === 'n' || d.side === 's' ? `x ${d.a}..${d.b}, z ${d.line}` : `z ${d.a}..${d.b}, x ${d.line}`, height: d.h })),
    eaves: eave ? [eave.X0, eave.Z0, eave.X1, eave.Z1] : [x0 - 1, z0 - 1, x1 + 1, z1 + 1],
  };
}

// ── jardín y piezas sueltas ──
const LOGS = { cerezo: ['minecraft:cherry_log', 'minecraft:cherry_leaves'], roble: ['minecraft:oak_log', 'minecraft:oak_leaves'], abeto: ['minecraft:spruce_log', 'minecraft:spruce_leaves'], abedul: ['minecraft:birch_log', 'minecraft:birch_leaves'], arce: ['minecraft:dark_oak_log', 'minecraft:azalea_leaves'] };
export function tree(w, { x, y, z, kind = 'cerezo', size = 1, seed = x * 31 + z }) {
  const [L, LV] = LOGS[kind] || LOGS.cerezo;
  let s = (seed * 9301 + 49297) % 233280; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  if (kind === 'abeto') {                                                    // cono escalonado
    const H = 7 + size * 2;
    for (let i = 0; i < H; i++) w.log(x, y + i, z, L, 'y');
    for (let i = 2; i <= H; i++) { const r = Math.max(0, Math.round((H - i) / 2.5) - (i % 2)); for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.abs(dx) + Math.abs(dz) <= r + 1 && !w.has(x + dx, y + i, z + dz)) w.set(x + dx, y + i, z + dz, LV); }
    w.set(x, y + H, z, LV); return;
  }
  const H = 3 + size, lean = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rnd() * 4)];
  let cx = x, cz = z;
  for (let i = 0; i < H; i++) { if (i === H - 1 && kind === 'cerezo') { cx += lean[0]; cz += lean[1]; } w.log(cx, y + i, cz, L, 'y'); }
  const top = y + H - 1, tips = [[cx, top + 1, cz]];
  w.log(cx, top + 1, cz, L, 'y');
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].sort(() => rnd() - 0.5).slice(0, 3 + (size > 1 ? 1 : 0));
  for (const [dx, dz] of dirs) {
    let bx = cx, bz = cz, by = top;
    for (let k = 1; k <= 2 + size; k++) { bx = cx + dx * k; bz = cz + dz * k; by = top + Math.floor(k / 2); w.log(bx, by, bz, L, dx && !dz ? 'x' : !dx && dz ? 'z' : 'y'); }
    tips.push([bx, by + 1, bz]);
  }
  const R = 2 + size, flatK = kind === 'cerezo' ? 2.2 : 3.2;
  for (const [tx, ty, tz] of tips) for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) for (let dy = -1; dy <= (kind === 'cerezo' ? 1 : 2); dy++) {
    const d = (dx * dx + dz * dz) / (R * R) + (dy * dy) / flatK;
    if (d > 1 || (d > 0.7 && rnd() < 0.35)) continue;
    if (!w.has(tx + dx, ty + dy, tz + dz)) w.set(tx + dx, ty + dy, tz + dz, LV);
    if (kind === 'cerezo' && d > 0.55 && dy === -1 && rnd() < 0.3 && !w.has(tx + dx, ty + dy - 1, tz + dz)) w.set(tx + dx, ty + dy - 1, tz + dz, LV);
  }
  if (kind === 'cerezo') for (let i = 0; i < 12 + size * 8; i++) { const a = rnd() * 6.28, r = 1 + rnd() * (R + 1), X = Math.round(x + Math.cos(a) * r), Z = Math.round(z + Math.sin(a) * r); if (!w.has(X, y, Z)) w.set(X, y, Z, 'minecraft:pink_petals'); }
}

// linterna de piedra (tōrō) o farola
export function lantern(w, { x, y, z, kind = 'toro' }) {
  if (kind === 'farola') { w.set(x, y, z, 'minecraft:stone_bricks'); for (let q = 1; q <= 3; q++) w.set(x, y + q, z, 'minecraft:dark_oak_fence'); w.set(x, y + 4, z, 'minecraft:lantern', { hanging: 'false' }); return; }
  w.set(x, y, z, 'minecraft:chiseled_stone_bricks'); w.set(x, y + 1, z, 'minecraft:stone_brick_wall');
  w.set(x, y + 2, z, 'minecraft:lantern', { hanging: 'false' }); w.slab(x, y + 3, z, 'minecraft:stone_brick_slab');
  w.set(x, y + 4, z, 'minecraft:stone_button', { face: 'floor', facing: 'north' });
}

// estanque: agua de `depth` con fondo de barro, borde de piedra y musgo, nenúfares; y = capa de la superficie
export function pond(w, { area: [ax, az, bx, bz], y, depth = 2, rim = 'minecraft:mossy_cobblestone', lilies = true }) {
  const [x0, x1, z0, z1] = [Math.min(ax, bx), Math.max(ax, bx), Math.min(az, bz), Math.max(az, bz)];
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 1; z++) {
    if (x < x0 || x > x1 || z < z0 || z > z1) { if (!w.has(x, y + 1, z)) w.set(x, y, z, hash(x, y, z) < 35 ? 'minecraft:moss_block' : rim); continue; }
    for (let q = y - depth + 1; q <= y; q++) w.set(x, q, z, 'minecraft:water');
    w.set(x, y - depth, z, 'minecraft:mud');
    w.del(x, y + 1, z);
    if (lilies && hash(x, y + 1, z) < 9) w.set(x, y + 1, z, 'minecraft:lily_pad');
  }
}

// puente arqueado de from a to (en línea recta por x o por z): tablero que sube ½ por paso, barandillas y faroles en los extremos
export function bridge(w, { from, to, width = 3, wood = 'mangrove', lights = true }) {
  const [ax, y, az] = from, [bx, , bz] = to, alongX = az === bz;
  if (!alongX && ax !== bx) throw new Error('bridge: from y to en línea recta (misma x o misma z)');
  const a0 = alongX ? Math.min(ax, bx) : Math.min(az, bz), a1 = alongX ? Math.max(ax, bx) : Math.max(az, bz), c = alongX ? az : ax, n = a1 - a0 + 1;
  const W = { mangrove: 'minecraft:mangrove', spruce: 'minecraft:spruce', stone: 'minecraft:stone_brick' }[wood] || `minecraft:${wood}`;
  const SL = `${W}_slab`, ST = `${W}_stairs`, rail = wood === 'stone' ? 'minecraft:stone_brick_wall' : `${W}_fence`, post = wood === 'stone' ? 'minecraft:chiseled_stone_bricks' : wood === 'mangrove' ? 'minecraft:stripped_mangrove_log' : `minecraft:stripped_${wood}_log`;
  const peak = Math.min(3, Math.floor((n - 1) / 2)), half = (width - 1) >> 1;
  for (let i = 0; i < n; i++) {
    const d = Math.min(i, n - 1 - i), h = Math.min(d + 1, peak), low = i < n / 2 ? (alongX ? 'w' : 'n') : (alongX ? 'e' : 's');
    const a = a0 + i;
    for (let k = -half - 1; k <= half + 1; k++) {
      const [x, z] = alongX ? [a, c + k] : [c + k, a], edge = Math.abs(k) === half + 1;
      if (h === 1) w.slab(x, y, z, SL); else if (h === 2) w.stair(x, y, z, ST, low); else w.slab(x, y + 1, z, SL);
      if (edge) { const yb = h === 3 ? y + 2 : y + 1, end = i === 0 || i === n - 1; w.set(x, yb, z, end ? post : rail, end && !/wall|bricks/.test(post) ? { axis: 'y' } : undefined); if (end && lights) w.set(x, yb + 1, z, 'minecraft:lantern', { hanging: 'false' }); }
    }
  }
}

// torii: dos pilares rojos, viga baja, viga alta y kasagi negro con las puntas hacia arriba; x,y,z = centro de abajo
export function torii(w, { x, y, z, width = 9, height = 7, axis = 'x' }) {
  const h = (width - 1) >> 1, at = (u, q) => (axis === 'x' ? [x + u, q, z] : [x, q, z + u]), ax = axis === 'x' ? 'x' : 'z';
  for (const u of [-h + 1, h - 1]) { w.set(...at(u, y), 'minecraft:stone_bricks'); for (let q = y + 1; q < y + height; q++) w.log(...at(u, q), 'minecraft:stripped_mangrove_log', 'y'); }
  for (let u = -h; u <= h; u++) { if (Math.abs(u) !== h - 1) w.log(...at(u, y + height - 2), 'minecraft:stripped_mangrove_log', ax); w.set(...at(u, y + height), 'minecraft:mangrove_planks'); }
  w.set(...at(0, y + height - 1), 'minecraft:mangrove_planks');
  for (let u = -h - 1; u <= h + 1; u++) w.set(...at(u, y + height + 1), 'minecraft:polished_blackstone');
  const [l, r] = axis === 'x' ? ['w', 'e'] : ['n', 's'];
  w.stair(...at(-h - 2, y + height + 1), 'minecraft:polished_blackstone_stairs', l, { top: true }); w.stair(...at(h + 2, y + height + 1), 'minecraft:polished_blackstone_stairs', r, { top: true });
  w.slab(...at(-h - 2, y + height + 2), 'minecraft:polished_blackstone_slab'); w.slab(...at(h + 2, y + height + 2), 'minecraft:polished_blackstone_slab');
}

// pagoda: pisos que menguan, cada uno con su alero; arriba cuatro aguas y aguja (sōrin)
export function pagoda(w, { x: cx, y, z: cz, floors = 5 }, S) {
  const sizes = Array.from({ length: Math.max(2, Math.min(7, floors)) }, (_, i) => [i < 2 ? 7 : 5, i ? 4 : 5]);
  let yy = y;
  w.box(cx - 5, y - 1, cz - 5, cx + 5, y - 1, cz + 5, S.base);
  sizes.forEach(([size, h], i) => {
    const r = (size - 1) >> 1, x0 = cx - r, x1 = cx + r, z0 = cz - r, z1 = cz + r, top = yy + h - 1, last = i === sizes.length - 1;
    walls(w, { x0, z0, x1, z1, y0: yy, y1: top, S, bay: 2, door: (x, z) => i === 0 && z === z1 && x === cx, doorH: 3, nukiAt: 1, brackets: false, windowY: i ? [1, 2] : [2, 3] });
    for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++) for (let q = yy; q <= top; q++) {
      if (i === 0 && q < top) { if (q === yy && x === cx && z === cz) w.set(x, q, z, 'minecraft:chiseled_stone_bricks'); else if (q === yy + 1 && x === cx && z === cz) w.set(x, q, z, 'minecraft:lantern'); else w.del(x, q, z); }
      else w.set(x, q, z, S.ceiling);
    }
    const rr = roof(w, { x0, z0, x1, z1, y: top, over: 2, mat: S.roof, stopAt: last ? null : 3, ornaments: false, upturn: S.upturn, pitch: S.pitch });
    if (!last) { for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (!w.has(x, top + 1, z)) w.set(x, top + 1, z, S.ceiling); yy = top + 2; }
    else { const s = rr.top; w.set(cx, s, cz, 'minecraft:polished_blackstone_wall'); for (let q = s + 1; q <= s + 4; q++) w.set(cx, q, cz, 'minecraft:chain', { axis: 'y' }); w.set(cx, s + 5, cz, 'minecraft:gold_block'); w.set(cx, s + 6, cz, 'minecraft:end_rod'); }
  });
}

// camino: suelo de `block` con borde, de from a to (rectángulo en la capa y)
export function path(w, { from: [ax, y, az], to: [bx, , bz], block = 'minecraft:polished_andesite', edge = 'minecraft:stone_bricks' }) {
  const [x0, x1, z0, z1] = [Math.min(ax, bx), Math.max(ax, bx), Math.min(az, bz), Math.max(az, bz)];
  const thinX = x1 - x0 <= z1 - z0;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) w.set(x, y, z, edge && (thinX ? x === x0 || x === x1 : z === z0 || z === z1) ? edge : block);
}

// escalinata: count escalones bajando hacia dir desde x,y,z (y = el escalón de arriba), con relleno debajo y zancas
export function steps(w, { x, y, z, dir = 's', width = 5, count = 3, block = 'minecraft:stone_brick_stairs', fill = 'minecraft:stone', cheek = 'minecraft:stone_bricks' }) {
  const [dx, dz] = D[dir], h = (width - 1) >> 1;
  for (let i = 0; i < count; i++) for (let k = -h - 1; k <= h + 1; k++) {
    const px = x + dx * i + (dz ? k : 0), pz = z + dz * i + (dx ? k : 0), q = y - i, side = Math.abs(k) === h + 1;
    for (let f = q - 1; f >= y - count + 1; f--) w.set(px, f, pz, side ? cheek : fill);
    if (side) w.set(px, q, pz, cheek); else w.stair(px, q, pz, block, dir);
  }
}

// muro de jardín (tsuijibei / tapia): zócalo, paño y tejadillo, de from a to en línea recta
export function gardenWall(w, { from: [ax, y, az], to: [bx, , bz], height = 3 }, S) {
  const alongX = az === bz; if (!alongX && ax !== bx) throw new Error('wall: from y to en línea recta');
  const a0 = alongX ? Math.min(ax, bx) : Math.min(az, bz), a1 = alongX ? Math.max(ax, bx) : Math.max(az, bz), c = alongX ? az : ax;
  for (let a = a0; a <= a1; a++) {
    const [x, z] = alongX ? [a, c] : [c, a], post = (a - a0) % 4 === 0;
    w.set(x, y, z, S.base);
    for (let q = y + 1; q < y + height; q++) post ? w.log(x, q, z, S.post, 'y') : w.set(x, q, z, S.infill);
    w.set(x, y + height, z, S.roof.block);
    const [l, r] = alongX ? ['n', 's'] : ['w', 'e'], [lx, lz] = D[l], [rx, rz] = D[r];
    w.stair(x + lx, y + height, z + lz, S.roof.stairs, l); w.stair(x + rx, y + height, z + rz, S.roof.stairs, r);
  }
}

// ── terreno ──
const rng = seed => { let s = (Math.abs(seed | 0) * 9301 + 49297) % 233280 || 1; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };

// Isla flotante: contorno irregular (elipse con ondas), arriba hierba y tierra casi plana (sitio para construir),
// debajo roca que se afina hacia una punta con bultos, estalactitas, menas y raíces colgando del borde.
// x,z = centro; y = capa de la hierba; rx, rz = radios; depth = hondo máximo de la roca bajo el centro.
export function island(w, { x, y, z, rx = 16, rz = rx, depth = null, seed = 7, top = 'minecraft:grass_block', dirt = 'minecraft:dirt', rock = ['minecraft:stone', 'minecraft:andesite', 'minecraft:tuff', 'minecraft:deepslate'], ores = ['minecraft:coal_ore', 'minecraft:iron_ore', 'minecraft:copper_ore'], plants = true, flat = true }) {
  const R = rng(seed), ph = [R() * 6.28, R() * 6.28, R() * 6.28], amp = [0.13 + R() * 0.06, 0.07 + R() * 0.04, 0.04];
  const D = depth ?? Math.round(Math.max(rx, rz) * 1.1);
  const edge = (dx, dz) => { const t = Math.atan2(dz, dx); return 1 + amp[0] * Math.sin(3 * t + ph[0]) + amp[1] * Math.sin(5 * t + ph[1]) + amp[2] * Math.sin(8 * t + ph[2]); };
  const inside = (dx, dz) => { const e = edge(dx, dz), d = (dx / rx) ** 2 + (dz / rz) ** 2; return d <= e * e ? Math.sqrt(d) / e : null; };   // 0 centro … 1 borde
  const n2 = (a, b) => Math.sin(a * 0.71 + ph[0]) * Math.cos(b * 0.53 + ph[1]) + 0.5 * Math.sin(a * 1.7 + b * 1.3 + ph[2]);
  const cells = [];
  for (let dx = -Math.ceil(rx * 1.3); dx <= Math.ceil(rx * 1.3); dx++) for (let dz = -Math.ceil(rz * 1.3); dz <= Math.ceil(rz * 1.3); dz++) {
    const r = inside(dx, dz); if (r == null) continue;
    // arriba: llano en el centro; el borde baja 1 a trozos
    const lip = !flat ? Math.round(n2(dx, dz)) : r > 0.88 && n2(dx * 2, dz * 2) > 0.2 ? -1 : 0;
    // abajo: cono redondeado con bultos; más hondo en el centro
    const bottom = Math.max(2, Math.round(D * Math.pow(Math.max(0, 1 - r * r), 0.75) + 2.2 * n2(dx * 0.6, dz * 0.6) - (r > 0.8 ? 2 : 0)));
    cells.push([dx, dz, r, lip, bottom]);
  }
  const top0 = new Map();
  for (const [dx, dz, r, lip, bottom] of cells) {
    const X = x + dx, Z = z + dz, ty = y + lip;
    top0.set(`${X},${Z}`, ty);
    for (let q = ty - bottom; q <= ty; q++) {
      const dpt = ty - q;
      let id = dpt === 0 ? top : dpt <= 2 ? (R() < 0.2 ? 'minecraft:coarse_dirt' : dirt) : rock[Math.min(rock.length - 1, Math.floor((dpt - 3) / Math.max(2, D / rock.length)) + (R() < 0.25 ? 1 : 0))] || rock[0];
      if (dpt > 2 && q === ty - bottom && R() < 0.12 && ores.length) id = ores[Math.floor(R() * ores.length)];      // menas en la cara de abajo
      w.set(X, q, Z, id);
    }
    // estalactitas y raíces
    const by = ty - bottom - 1;
    if (r < 0.75 && R() < 0.07) { const len = 2 + Math.floor(R() * (3 + D / 6)); for (let k = 0; k < len; k++) w.set(X, by - k, Z, k === len - 1 ? 'minecraft:pointed_dripstone' : rock[Math.min(rock.length - 1, 1 + (k > 2 ? 1 : 0))], k === len - 1 ? { vertical_direction: 'down', thickness: 'tip' } : undefined); }
    else if (r > 0.6 && R() < 0.18) w.set(X, by, Z, 'minecraft:hanging_roots');
    // plantas encima
    if (plants && dpt0(ty) && R() < 0.12 && !w.has(X, ty + 1, Z)) w.set(X, ty + 1, Z, R() < 0.7 ? 'minecraft:short_grass' : ['minecraft:poppy', 'minecraft:dandelion', 'minecraft:azure_bluet', 'minecraft:oxeye_daisy'][Math.floor(R() * 4)]);
  }
  function dpt0() { return top === 'minecraft:grass_block' || top === 'minecraft:moss_block'; }
  let bot = Infinity; for (const c of cells) bot = Math.min(bot, y - c[4]);
  return { top: y, cells: cells.length, bottom: bot - 6, surface: [...top0.entries()].filter(([, ty]) => ty === y).length };
}

// roca o peñasco: bola con ruido de `block` (y musgo arriba si moss)
export function boulder(w, { x, y, z, r = 2, block = 'minecraft:andesite', moss = true, seed = 3 }) {
  const R = rng(seed);
  for (let dx = -r - 1; dx <= r + 1; dx++) for (let dy = -r; dy <= r + 1; dy++) for (let dz = -r - 1; dz <= r + 1; dz++) {
    const d = Math.hypot(dx, dy * 1.3, dz) + (R() - 0.5) * 0.9;
    if (d > r + 0.4 || y + dy < y) continue;
    w.set(x + dx, y + dy, z + dz, moss && d > r - 0.6 && dy >= r - 1 ? 'minecraft:moss_block' : R() < 0.3 ? 'minecraft:cobblestone' : block);
  }
}

// ── piezas tecnológicas (decoración para mods de energía, espacio, ciencia) ──
// antena: base, mástil de varas del End con travesaños y pararrayos arriba (da luz)
export function antenna(w, { x, y, z, height = 7 }) {
  w.set(x, y, z, 'minecraft:iron_block'); w.slab(x, y + 1, z, 'minecraft:smooth_stone_slab');
  for (let q = 2; q < height; q++) w.set(x, y + q, z, 'minecraft:end_rod', { facing: 'up' });
  for (const q of [Math.floor(height / 2), height - 2]) for (const [dx, dz, f] of [[1, 0, 'east'], [-1, 0, 'west'], [0, 1, 'south'], [0, -1, 'north']]) w.set(x + dx, y + q, z + dz, 'minecraft:end_rod', { facing: f });
  w.set(x, y + height, z, 'minecraft:lightning_rod', { facing: 'up' });
}
// placas solares: filas de detectores de luz sobre una estructura de hierro (w × d)
export function solar(w, { x, y, z, width = 5, depth = 3 }) {
  for (let i = 0; i < width; i++) for (let j = 0; j < depth; j++) {
    const X = x + i, Z = z + j;
    if ((i === 0 || i === width - 1) && (j === 0 || j === depth - 1)) w.set(X, y, Z, 'minecraft:iron_bars');
    w.set(X, y + 1, Z, 'minecraft:daylight_detector');
  }
}
// cúpula de cristal con costillas (radio r) sobre x,y,z (centro de la base)
export function dome(w, { x, y, z, r = 4, glass = 'minecraft:light_blue_stained_glass', rib = 'minecraft:iron_block' }) {
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) for (let dy = 0; dy <= r; dy++) {
    const d = Math.hypot(dx, dy, dz);
    if (d > r + 0.5 || d < r - 0.5) continue;
    w.set(x + dx, y + dy, z + dz, dx === 0 || dz === 0 || dy === 0 ? rib : glass);
  }
}
// plataforma para una máquina: losa del tamaño de su huella + 1, borde y luces en las esquinas
export function pad(w, { x, y, z, size = 3, block = 'minecraft:polished_deepslate', edge = 'minecraft:smooth_stone', light = 'minecraft:sea_lantern' }) {
  const h = (size + 1) >> 1;
  for (let dx = -h; dx <= h; dx++) for (let dz = -h; dz <= h; dz++) {
    const border = Math.abs(dx) === h || Math.abs(dz) === h, corner = Math.abs(dx) === h && Math.abs(dz) === h;
    w.set(x + dx, y, z + dz, corner ? light : border ? edge : block);
    // la máquina (y su multibloque) necesita el hueco libre: fuera la hierba y las flores que dejó la isla
    for (let dy = 1; dy <= 3; dy++) if (/short_grass|tall_grass|fern|poppy|dandelion|bluet|daisy|tulip|orchid|allium|cornflower|petals|bush/.test(w.get(x + dx, y + dy, z + dz) || '')) w.set(x + dx, y + dy, z + dz, null);
  }
}

// ── cables: ruta de from a to (primero x, luego z, luego y o en el orden dado) ──
export function routeCells([ax, ay, az], [bx, by, bz], order = 'xzy') {
  const out = [], p = { x: ax, y: ay, z: az }, t = { x: bx, y: by, z: bz };
  out.push([p.x, p.y, p.z]);
  for (const k of order) while (p[k] !== t[k]) { p[k] += Math.sign(t[k] - p[k]); out.push([p.x, p.y, p.z]); }
  return out;
}

// ── plano del conjunto: comprueba volúmenes antes de construir y dibuja la planta ──
export function planSite(volumes = []) {
  const issues = [], vs = volumes.map((v, i) => {
    const r = (v.rect || []).map(Number);
    if (r.length !== 4 || r.some(n => !Number.isFinite(n))) throw new Error(`plan_site: volumen ${i + 1} sin rect [x0,z0,x1,z1]`);
    return { ...v, i, x0: Math.min(r[0], r[2]), z0: Math.min(r[1], r[3]), x1: Math.max(r[0], r[2]), z1: Math.max(r[1], r[3]), kind: v.kind || 'edificio' };
  });
  const B = vs.filter(v => v.kind === 'edificio');
  for (const v of B) {
    const wdt = v.x1 - v.x0 + 1, dep = v.z1 - v.z0 + 1;
    if (Math.min(wdt, dep) > 41) issues.push(`"${v.name}" mide ${wdt} × ${dep}: un edificio tan ancho queda como una caja con un tejado gigante; pártelo en un cuerpo principal y alas o pabellones alrededor de un patio`);
    if (wdt * dep > 1400) issues.push(`"${v.name}" ocupa ${wdt * dep} celdas: mejor varios edificios unidos por patios o galerías`);
    if (Math.max(wdt, dep) / Math.min(wdt, dep) > 4) issues.push(`"${v.name}" es muy alargado (${wdt} × ${dep}); si es una galería, que tenga patio o jardín a un lado`);
  }
  for (let a = 0; a < B.length; a++) for (let b = a + 1; b < B.length; b++) {
    const p = B[a], q = B[b], gx = Math.max(p.x0, q.x0) - Math.min(p.x1, q.x1) - 1, gz = Math.max(p.z0, q.z0) - Math.min(p.z1, q.z1) - 1;
    if (gx < 0 && gz < 0) issues.push(`"${p.name}" y "${q.name}" se pisan`);
    else if (Math.max(gx, gz) < 3 && Math.min(gx, gz) < 0) issues.push(`"${p.name}" y "${q.name}" están a ${Math.max(gx, gz)} bloques: los aleros (vuelo 2-3) chocarán; sepáralos 4 o más`);
  }
  if (B.length === 1 && vs.length === 1) issues.push('Un solo volumen: para algo "grande" y "bonito" compón un conjunto (edificio principal, alas o pabellones, patio, entrada con eje)');
  // planta en caracteres
  const all = vs.length ? vs : [], X0 = Math.min(...all.map(v => v.x0)), X1 = Math.max(...all.map(v => v.x1)), Z0 = Math.min(...all.map(v => v.z0)), Z1 = Math.max(...all.map(v => v.z1));
  const step = Math.max(1, Math.ceil((X1 - X0 + 1) / 64)), rows = [];
  const CH = { edificio: null, patio: '.', jardin: '"', agua: '~', camino: '=' };
  for (let z = Z0; z <= Z1; z += step) {
    let line = '';
    for (let x = X0; x <= X1; x += step) {
      const hit = [...vs].reverse().find(v => x >= v.x0 && x <= v.x1 && z >= v.z0 && z <= v.z1);
      line += !hit ? ' ' : hit.kind === 'edificio' ? String.fromCharCode(65 + (hit.i % 26)) : CH[hit.kind] || '+';
    }
    rows.push(`${String(z).padStart(3)} ${line}`);
  }
  const legend = vs.map(v => `${v.kind === 'edificio' ? String.fromCharCode(65 + (v.i % 26)) : CH[v.kind] || '+'} ${v.name || v.kind} [${v.x0},${v.z0} → ${v.x1},${v.z1}] ${v.x1 - v.x0 + 1}×${v.z1 - v.z0 + 1}`);
  return { ok: !issues.length, issues, plan: [`Planta del conjunto (x ${X0}..${X1} → este, z hacia abajo = sur${step > 1 ? `, 1 carácter = ${step} bloques` : ''})`, ...rows, ...legend].join('\n') };
}

export { OPP, NAME };
