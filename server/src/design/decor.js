// Decoración: prefabricados con giro, colocación por reglas (paredes, filas, rejilla, anillo, esquinas), familias de bloques y roles.
// El modelo de lenguaje elige QUÉ y DÓNDE a grandes rasgos; las coordenadas finas, los giros y la simetría los calcula este código
// (la idea de Holodeck/APT: el LLM da relaciones y el código resuelve la geometría, porque colocando bloque a bloque se equivoca).

// ── direcciones: en el modelo, f es hacia dónde mira el frente (en una escalera, el lado del escalón bajo) ──
const CW = { n: 'e', e: 's', s: 'w', w: 'n' };                       // giro de 90° en sentido horario visto desde arriba
export const QUARTERS = { s: 0, w: 1, n: 2, e: 3 };                  // un prefab se define mirando al sur; mirar al oeste = 1 giro…
const turnDir = (f, k) => { for (let i = 0; i < k; i++) f = CW[f] || f; return f; };
const turnXZ = (x, z, k) => { for (let i = 0; i < k; i++) [x, z] = [-z, x]; return [x, z]; };

// ── prefabricados: celdas [dx, dy, dz, rol, {f, top, hang}] con el ancla en el centro de abajo y el frente al sur ──
// roles: B base · T remate · P pilar · A acento · S escalera · H losa · W muro/valla · L luz · LH luz colgada · C cadena
//        G cristal · D bloque expositor (lleva el objeto) · F maceta · K alfombra · _ aire
const ring = (y, role, o = {}) => [[0, y, -1, role, { f: 'n', ...o }], [0, y, 1, role, { f: 's', ...o }], [-1, y, 0, role, { f: 'w', ...o }], [1, y, 0, role, { f: 'e', ...o }]];
const corners = (y, role, o = {}) => [[-1, y, -1, role, o], [1, y, -1, role, o], [-1, y, 1, role, o], [1, y, 1, role, o]];
const column = (h, role) => Array.from({ length: Math.max(0, h) }, (_, i) => [0, i, 0, role]);

export const PREFABS = {
  pedestal: { desc: 'pedestal 1×1: remate + bloque expositor encima con el objeto', size: [1, 2, 1], cells: () => [[0, 0, 0, 'T'], [0, 1, 0, 'D']] },
  pedestal_grand: { desc: 'plinto 3×3 escalonado (escaleras hacia fuera, losas en las esquinas) con el expositor en el centro', size: [3, 2, 3],
    cells: () => [[0, 0, 0, 'T'], ...ring(0, 'S'), ...corners(0, 'H'), [0, 1, 0, 'D']] },
  column: { desc: 'columna 1×1 de "height" (4): basa, fuste de pilar y capitel', size: [1, 4, 1], cells: ({ height: h = 4 }) => [[0, 0, 0, 'T'], ...column(h - 2, 'P').map(c => [0, c[1] + 1, 0, 'P']), [0, h - 1, 0, 'T']] },
  column_grand: { desc: 'columna 3×3 de "height" (5): basa de escaleras, fuste y capitel de escaleras invertidas', size: [3, 5, 3],
    cells: ({ height: h = 5 }) => [[0, 0, 0, 'T'], ...ring(0, 'S'), ...corners(0, 'H'), ...column(h - 2, 'P').map(c => [0, c[1] + 1, 0, 'P']), [0, h - 1, 0, 'T'], ...ring(h - 1, 'S', { top: true }), ...corners(h - 1, 'H', { top: true })] },
  sconce: { desc: 'aplique de pared: ménsula (escalera invertida) pegada a la pared + luz encima; el frente mira al interior', size: [1, 2, 1], cells: () => [[0, 0, 0, 'S', { f: 's', top: true }], [0, 1, 0, 'L']] },
  chandelier: { desc: 'lámpara colgante: el ancla es la celda bajo el techo; cadena de "height" (1) y luz colgada', size: [1, 2, 1], hang: true,
    cells: ({ height: h = 1 }) => [...Array.from({ length: h }, (_, i) => [0, -i, 0, 'C']), [0, -h, 0, 'LH']] },
  chandelier_grand: { desc: 'araña 3×3 colgante: cadenas, cruz de remate y losas, 5 luces colgadas; el ancla es la celda bajo el techo', size: [3, 4, 3], hang: true,
    cells: ({ height: h = 2 }) => { const b = -h; return [...Array.from({ length: h }, (_, i) => [0, -i, 0, 'C']), [0, b, 0, 'T'], ...ring(b, 'H', { top: true }), [0, b - 1, 0, 'LH'], ...ring(b - 1, 'LH')]; } },
  lamp_post: { desc: 'farola de "height" (4): remate, poste de muro y luz arriba', size: [1, 4, 1], cells: ({ height: h = 4 }) => [[0, 0, 0, 'T'], ...column(h - 2, 'W').map(c => [0, c[1] + 1, 0, 'W']), [0, h - 1, 0, 'L']] },
  bench: { desc: 'banco de "width" (3) escaleras; quien se sienta mira al frente', size: [3, 1, 1], cells: ({ width: w = 3 }) => Array.from({ length: w }, (_, i) => [i - ((w - 1) >> 1), 0, 0, 'S', { f: 's' }]) },
  table: { desc: 'mesa: pata de muro y tablero de losa (width 1 o 3)', size: [1, 2, 1],
    cells: ({ width: w = 1 }) => w >= 3 ? [[-1, 0, 0, 'W'], [1, 0, 0, 'W'], [-1, 1, 0, 'H'], [0, 1, 0, 'H'], [1, 1, 0, 'H']] : [[0, 0, 0, 'W'], [0, 1, 0, 'H']] },
  planter: { desc: 'jardinera: remate + planta en maceta', size: [1, 2, 1], cells: () => [[0, 0, 0, 'T'], [0, 1, 0, 'F']] },
  throne: { desc: 'trono 3×2: asiento de escalera, brazos y respaldo alto con acento', size: [3, 3, 2],
    cells: () => [[0, 0, 0, 'S', { f: 's' }], [-1, 0, 0, 'T'], [1, 0, 0, 'T'], [-1, 1, 0, 'H'], [1, 1, 0, 'H'], [0, 0, -1, 'T'], [0, 1, -1, 'T'], [0, 2, -1, 'A'], [-1, 0, -1, 'T'], [1, 0, -1, 'T'], [-1, 1, -1, 'T'], [1, 1, -1, 'T'], [-1, 2, -1, 'H'], [1, 2, -1, 'H']] },
  arch: { desc: 'arco en un muro: abre un hueco de "width" (3) × "height" (3) y pone escaleras invertidas en las esquinas de arriba; el ancla es el centro de abajo del hueco', size: [3, 3, 1],
    cells: ({ width: w = 3, height: h = 3 }) => { const r = (w - 1) >> 1, out = []; for (let x = -r; x <= r; x++) for (let y = 0; y < h; y++) out.push([x, y, 0, '_']); out.push([-r, h - 1, 0, 'S', { f: 'e', top: true }], [r, h - 1, 0, 'S', { f: 'w', top: true }]); return out; } },
};

// ── roles → bloques: lo que no trae el estilo se deduce de la familia del bloque base o de remate ──
const DISPLAY_FALLBACK = ['supplementaries:pedestal', 'actuallyadditions:display_stand', 'evilcraft:display_stand', 'pneumaticcraft:display_table', 'ars_nouveau:arcane_pedestal'];
export function familyVariant(id, kind, has) {
  if (!id) return null;
  const [ns, p] = id.split(':'), bare = p.replace(/_(bricks|tiles|brick|tile|planks|block)$/, '');
  const stems = new Set([p, p.replace(/s$/, ''), p.replace(/_bricks$/, '_brick'), p.replace(/_tiles$/, '_tile'), bare, p.replace(/^block_of_/, ''), bare.replace(/^(polished|chiseled|cut|smooth)_/, '')]);
  for (const s of stems) { const c = `${ns}:${s}_${kind}`; if (has(c)) return c; }
  return null;
}
export function resolveStyle(style = {}, has) {
  const base = style.base, trim = style.trim || base, pick = (...ids) => ids.find(id => id && has(id)) || null;
  const s = {
    B: base, T: trim, A: style.accent || trim, P: style.pillar || familyVariant(trim, 'pillar', has) || familyVariant(base, 'pillar', has) || trim,
    S: style.stairs || familyVariant(trim, 'stairs', has) || familyVariant(base, 'stairs', has),
    H: style.slab || familyVariant(trim, 'slab', has) || familyVariant(base, 'slab', has),
    W: style.wall || familyVariant(trim, 'wall', has) || familyVariant(base, 'wall', has) || familyVariant(trim, 'fence', has) || pick('minecraft:stone_brick_wall'),
    L: style.light || 'minecraft:lantern', C: style.chain || 'minecraft:chain', G: style.glass || 'minecraft:glass',
    D: style.display || pick(...DISPLAY_FALLBACK), F: style.plant || 'minecraft:potted_azalea_bush', K: style.carpet || 'minecraft:red_carpet',
  };
  s.LH = s.L;
  return s;
}

// celdas de un prefab ya giradas y trasladadas: [{x,y,z, role, id|null, f, top, hang, display}]
export function expandPrefab(name, at, facing = 's', params = {}, roles) {
  const p = PREFABS[name];
  if (!p) throw new Error(`prefab "${name}" no existe: ${Object.keys(PREFABS).join(', ')}`);
  const k = QUARTERS[facing] ?? 0, missing = new Set();
  const cells = p.cells(params).map(([dx, dy, dz, role, o = {}]) => {
    const [rx, rz] = turnXZ(dx, dz, k), id = role === '_' ? null : roles[role];
    if (role !== '_' && !id) missing.add(role);
    return { x: at[0] + rx, y: at[1] + dy, z: at[2] + rz, role, id, f: turnDir(o.f || 's', k), top: !!o.top, hang: role === 'LH', display: role === 'D' };
  });
  if (missing.size) {
    const names = { S: 'stairs', H: 'slab', W: 'wall', D: 'display', B: 'base', T: 'trim', P: 'pillar', A: 'accent' };
    throw new Error(`prefab ${name}: falta ${[...missing].map(r => names[r] || r).join(', ')} en style (no se dedujo de la familia de base/trim). Búscalo con search_blocks y pásalo en style.`);
  }
  if (cells.some(c => c.x < 0 || c.z < 0 || c.y < 0)) throw new Error(`prefab ${name} en ${at.join(',')} saldría a coordenadas negativas`);
  return cells;
}

// ── tejados: escaleras mirando hacia fuera capa a capa (el escalón bajo, hacia el alero), cumbrera de losa y hastiales rellenos ──
// from/to: rectángulo exterior de las paredes; y = primera capa del tejado (encima de las paredes)
export function roofCells({ from, to, shape = 'gable', overhang = 1, axis }) {
  const [x0, x1] = [Math.min(from[0], to[0]), Math.max(from[0], to[0])], [z0, z1] = [Math.min(from[2], to[2]), Math.max(from[2], to[2])], y = from[1], o = Math.max(0, Math.min(3, overhang | 0));
  const out = [], S = (x, yy, z, f) => out.push({ x, y: yy, z, role: 'S', f }), H = (x, yy, z) => out.push({ x, y: yy, z, role: 'H' }), B = (x, yy, z) => out.push({ x, y: yy, z, role: 'B' });
  if (shape === 'hip') {
    for (let k = 0; ; k++) {
      const xa = x0 - o + k, xb = x1 + o - k, za = z0 - o + k, zb = z1 + o - k, yy = y + k;
      if (xa > xb || za > zb) break;
      if (xa === xb || za === zb) { for (let x = xa; x <= xb; x++) for (let z = za; z <= zb; z++) H(x, yy, z); break; }
      for (let x = xa; x <= xb; x++) { S(x, yy, za, 'n'); S(x, yy, zb, 's'); }
      for (let z = za + 1; z < zb; z++) { S(xa, yy, z, 'w'); S(xb, yy, z, 'e'); }
    }
    return out;
  }
  if (shape !== 'gable') throw new Error('roof: shape gable (dos aguas) o hip (cuatro aguas)');
  const alongX = axis ? axis === 'x' : x1 - x0 >= z1 - z0;                // la cumbrera va por el lado largo
  const [a0, a1, b0, b1] = alongX ? [x0, x1, z0, z1] : [z0, z1, x0, x1], at = (a, b) => (alongX ? [a, b] : [b, a]);
  const [lo, hi] = alongX ? ['n', 's'] : ['w', 'e'];
  for (let k = 0; ; k++) {
    const bl = b0 - o + k, bh = b1 + o - k, yy = y + k;
    if (bl > bh) break;
    for (let a = a0 - o; a <= a1 + o; a++) {
      if (bl === bh) { const [x, z] = at(a, bl); H(x, yy, z); continue; }
      const [xl, zl] = at(a, bl), [xh, zh] = at(a, bh); S(xl, yy, zl, lo); S(xh, yy, zh, hi);
    }
    for (let b = Math.max(bl + 1, b0); b <= Math.min(bh - 1, b1); b++) for (const a of [a0, a1]) { const [x, z] = at(a, b); B(x, yy, z); } // hastiales
    if (bl === bh) break;
  }
  return out;
}

// ── colocación por reglas: posiciones [x,y,z,facing] simétricas ──
const toward = (dx, dz) => (Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? 'e' : 'w') : (dz >= 0 ? 's' : 'n'));
// n posiciones con paso s centradas en [a,b] (enteras y simétricas); null si no cabe ninguna
function spread(a, b, s, n) {
  if (b < a) return [];
  let count = n ?? Math.floor((b - a) / s) + 1;
  for (; count > 0; count--) { const span = (count - 1) * s, start2 = a + b - span; if (span <= b - a && start2 % 2 === 0) return Array.from({ length: count }, (_, i) => start2 / 2 + i * s); }
  return [];
}
/**
 * layout: walls (alrededor del perímetro interior mirando al centro) · row (de from a to) · grid · ring · corners
 * area: [x0,z0,x1,z1] interior (celdas de suelo libres) · y: altura donde se apoyan · r: radio del prefab (1 si es 3×3)
 * doors: celdas [x,z] de huecos de puerta en la pared, que se dejan libres
 */
export function layoutPositions({ layout, area, y, from, to, center, radius, count, spacing = 3, margin = 1, sides, facing, r = 0, doors = [] }) {
  const out = [];
  if (layout === 'row') {
    if (!from || !to) throw new Error('arrange row: faltan from y to');
    const alongX = Math.abs(to[0] - from[0]) >= Math.abs(to[2] - from[2]), a = alongX ? Math.min(from[0], to[0]) : Math.min(from[2], to[2]), b = alongX ? Math.max(from[0], to[0]) : Math.max(from[2], to[2]);
    for (const v of spread(a, b, spacing, count)) out.push(alongX ? [v, from[1], from[2], facing || 's'] : [from[0], from[1], v, facing || 'e']);
    return out;
  }
  if (layout === 'ring') {
    if (!center || !radius) throw new Error('arrange ring: faltan center y radius');
    const n = count || Math.max(4, Math.round(2 * Math.PI * radius / spacing)), seen = new Set();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI, x = Math.round(center[0] + radius * Math.sin(a)), z = Math.round(center[2] - radius * Math.cos(a)), k = `${x},${z}`;
      if (!seen.has(k)) { seen.add(k); out.push([x, center[1], z, facing === 'out' ? toward(x - center[0], z - center[2]) : toward(center[0] - x, center[2] - z)]); }
    }
    return out;
  }
  if (!area || area.length !== 4) throw new Error(`arrange ${layout}: falta area [x0,z0,x1,z1] (el interior libre de la sala)`);
  const [x0, z0, x1, z1] = [Math.min(area[0], area[2]), Math.min(area[1], area[3]), Math.max(area[0], area[2]), Math.max(area[1], area[3])];
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, d = margin + r;
  if (layout === 'corners') {
    for (const [x, z] of [[x0 + d, z0 + d], [x1 - d, z0 + d], [x0 + d, z1 - d], [x1 - d, z1 - d]]) out.push([x, y, z, facing || toward(cx - x, cz - z)]);
    return out;
  }
  if (layout === 'grid') {
    for (const x of spread(x0 + d, x1 - d, spacing)) for (const z of spread(z0 + d, z1 - d, spacing)) out.push([x, y, z, facing || 's']);
    return out;
  }
  if (layout === 'walls') {
    const use = new Set(sides || ['n', 's', 'e', 'w']), gap = 2 * r + 1, nearDoor = (x, z) => doors.some(([dx, dz]) => Math.abs(dx - x) <= r + 1 && Math.abs(dz - z) <= r + 1 + margin);
    const add = (x, z, f) => { if (!nearDoor(x, z)) out.push([x, y, z, facing || f]); };
    // los lados largos se reparten primero; los cortos dejan libres las esquinas que ya ocupan
    if (use.has('n')) for (const x of spread(x0 + d + gap, x1 - d - gap, spacing)) add(x, z0 + d, 's');
    if (use.has('s')) for (const x of spread(x0 + d + gap, x1 - d - gap, spacing)) add(x, z1 - d, 'n');
    if (use.has('w')) for (const z of spread(z0 + d + gap, z1 - d - gap, spacing)) add(x0 + d, z, 'e');
    if (use.has('e')) for (const z of spread(z0 + d + gap, z1 - d - gap, spacing)) add(x1 - d, z, 'w');
    return out;
  }
  throw new Error(`arrange: layout "${layout}" no existe: walls, row, grid, ring o corners`);
}

// ── clasificación de bloques para elegir paleta por tema: rol, familia y color ──
export const ROLES = {
  display: /pedestal|display|item_shelf|showcase|trophy|podium|plinth|_stand$|altar|statue|sword_rack|tool_rack/,
  light: /lantern|lamp|_light$|^light_(?!gray|blue|weighted|detector)|torch|candle|chandelier|sconce|glowstone|sea_lantern|shroomlight|froglight|end_rod|lumi|crystal_block|neon/,
  seat: /chair|stool|bench|sofa|couch|throne|seat/, table: /table|desk|counter/, storage: /chest$|barrel|cabinet|drawer|wardrobe|crate|cupboard/,
  plant: /^potted_|plant|flower|fern|bush|vine|moss_carpet/, glass: /glass/, pillar: /pillar|column|_log$|beam|_post$/, stairs: /_stairs$/, slab: /_slab$/,
  wall: /_wall$/, fence: /_fence$/, carpet: /carpet|rug/, door: /_door$/, trapdoor: /trapdoor/, chain: /chain$/, banner: /banner$/, head: /_head$|_skull$|trophy/,
};
const SHAPE = /_(stairs|slab|wall|fence|fence_gate|pressure_plate|button|door|trapdoor|pane|carpet|sign|hanging_sign|banner)$/;
export function roleOf(b) {
  const p = b.id.split(':')[1];
  for (const [role, re] of Object.entries(ROLES)) if (re.test(p)) return role;
  return !SHAPE.test(p) && b.size.every(v => v === 1) ? 'block' : 'other';
}
export const familyBase = id => id.replace(/_(stairs|slab|wall|fence|fence_gate|pressure_plate|button)$/, '');

// nombre de color aproximado para que cualquier modelo elija bien sin ver la imagen
export function colorName(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const tone = l < 0.2 ? 'muy oscuro' : l < 0.4 ? 'oscuro' : l > 0.8 ? 'muy claro' : l > 0.6 ? 'claro' : '';
  if (d < 0.08) return `${hex} ${l < 0.15 ? 'negro' : l > 0.85 ? 'blanco' : 'gris'} ${tone}`.trim();
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
  const hue = h < 15 ? 'rojo' : h < 40 ? (l < 0.45 ? 'marrón' : 'naranja') : h < 65 ? 'amarillo' : h < 160 ? 'verde' : h < 195 ? 'turquesa' : h < 250 ? 'azul' : h < 290 ? 'morado' : h < 335 ? 'rosa' : 'rojo';
  return `${hex} ${hue} ${tone}`.trim();
}

// mezcla determinista para texturas variadas (80 % ladrillo, 15 % agrietado…): mismo resultado cada vez
export function mixPick(mix, x, y, z) {
  const total = mix.reduce((s, m) => s + m.w, 0);
  let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791); h = ((h >>> 0) % 10007) / 10007 * total;
  for (const m of mix) { if ((h -= m.w) < 0) return m.id; }
  return mix.at(-1).id;
}
