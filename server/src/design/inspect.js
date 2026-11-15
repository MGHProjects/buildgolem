// Ojos del agente: vistas en texto del diseño (planta, capa, alzados) y una revisión automática de calidad con coordenadas y arreglos.
// Funcionan con cualquier modelo de lenguaje: no hace falta que vea imágenes (MineAnyBuild: los LLM fallan sobre todo al pasar
// de un plan a bloques en 3D; con una vista de vuelta y una lista de fallos concretos pueden corregirse).
import { validateModel } from './validate.js';

const K = (x, y, z) => `${x},${y},${z}`;
const LIGHT = [[/sea_lantern|glowstone|lantern|shroomlight|froglight|beacon|redstone_lamp|conduit|lumi|lamp|_light$|^light_|chandelier|sconce/, 15], [/torch|end_rod|campfire/, 14], [/crystal|amethyst_cluster|glow_lichen/, 7], [/candle/, 6]];
const NOT_LIGHT = /light_(gray|blue)|lightning|_light_weighted|daylight/;
const NONSOLID = /stairs|slab|_wall$|fence|pane|glass|bars|door|trapdoor|carpet|lantern|torch|chain$|rod|button|plate|sign|banner|flower|potted|sapling|leaves|pedestal|display|shelf|statue|_head$|skull|candle|rail|ladder|vine|cable|pipe|bed$|chair|table|stand$/;
export const lightOf = id => { const p = (id || '').split(':')[1] || ''; if (NOT_LIGHT.test(p)) return 0; for (const [re, l] of LIGHT) if (re.test(p)) return l; return 0; };

function grid(m) {
  const at = new Map(m.BLOCKS.map(b => [K(b.x, b.y, b.z), b]));
  const solid = b => { const s = b && m.P[b.t]; return !!s && !s.disp && !s.glass && !s.cutout && !b.cable && (s.size || [1, 1, 1]).every(v => v === 1) && !NONSOLID.test(s.id || ''); };
  const xs = m.BLOCKS.map(b => b.x), ys = m.BLOCKS.map(b => b.y), zs = m.BLOCKS.map(b => b.z);
  const box = m.BLOCKS.length ? { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), z0: Math.min(...zs), z1: Math.max(...zs) } : null;
  return { at, solid, box };
}

// ── vistas ──
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuwxyz0123456789#%&@$=+?!';
const ARROW = { n: '^', s: 'v', e: '>', w: '<' };
export function viewDesign(m, { mode = 'plan', y, box: crop } = {}) {
  const { at, box } = grid(m);
  if (!box) return 'El diseño está vacío.';
  const disp = new Map((m.DISPLAYS || []).map(d => [K(d.x, d.y, d.z), d]));
  const [x0, x1, z0, z1] = crop?.length === 4 ? [crop[0], crop[2], crop[1], crop[3]] : [box.x0, box.x1, box.z0, box.z1];
  const chars = new Map(), used = new Set('.* ^v<>'), legend = [];
  const charOf = b => {
    const s = m.P[b.t];
    if (/_stairs$/.test(s?.id || '') && ARROW[b.f]) { if (!legend.some(l => l.startsWith('^v<>'))) legend.push('^v<> = escaleras (la flecha apunta al escalón bajo)'); return ARROW[b.f]; }
    if (chars.has(b.t)) return chars.get(b.t);
    const words = (s?.id || b.t).split(':').pop().split('_');
    let c = [...words.map(w => w[0].toUpperCase()), ...words.map(w => w[0]), ...POOL].find(ch => ch && !used.has(ch)) || '?';
    used.add(c); chars.set(b.t, c); legend.push(`${c} = ${s?.id || b.t}`);
    return c;
  };
  const rows = [], W = x1 - x0 + 1;
  if (W > 64) return `Demasiado ancho (${W}): pide la vista con box [x0,z0,x1,z1] de 64 de ancho como máximo.`;
  const ruler = (a, b) => '    ' + Array.from({ length: b - a + 1 }, (_, i) => String((a + i) % 10)).join('');
  let head;
  if (mode === 'front' || mode === 'side') {
    // alzado: desde el sur (front) o desde el este (side); filas de arriba abajo
    const [a, b] = mode === 'front' ? [x0, x1] : [z0, z1];
    head = mode === 'front' ? `Alzado desde el sur (x ${a}..${b} → este; filas y de arriba abajo; lo más cercano a quien mira)` : `Alzado desde el este (z ${a}..${b} → sur; filas y de arriba abajo)`;
    rows.push(ruler(a, b));
    for (let yy = box.y1; yy >= box.y0; yy--) {
      let line = '';
      for (let u = a; u <= b; u++) {
        let ch = ' ';
        if (mode === 'front') { for (let z = z1; z >= z0; z--) { const bl = at.get(K(u, yy, z)); if (bl) { ch = charOf(bl); break; } } }
        else for (let x = x1; x >= x0; x--) { const bl = at.get(K(x, yy, u)); if (bl) { ch = charOf(bl); break; } }
        line += ch;
      }
      rows.push(`${String(yy).padStart(3)} ${line}`);
    }
  } else {
    const lo = mode === 'layer' ? +y : y != null ? +y : box.y0 + 1;
    // planta: lo más alto de cada columna por debajo del techo (si la capa de arriba cubre más del 60 % es el techo y no se mira)
    let hi = mode === 'layer' ? +y : box.y1;
    if (mode !== 'layer' && y == null) { const top = m.BLOCKS.filter(b => b.y === box.y1).length; if (top > 0.6 * (box.x1 - box.x0 + 1) * (box.z1 - box.z0 + 1) && box.y1 > box.y0 + 1) hi = box.y1 - 1; }
    head = mode === 'layer' ? `Capa y=${lo} (x ${x0}..${x1} → este; z hacia abajo = sur)` : `Planta: lo más alto de cada columna entre y=${lo} e y=${hi} (x → este; z hacia abajo = sur). "." suelo libre, "*" objeto expuesto`;
    rows.push(ruler(x0, x1));
    for (let z = z0; z <= z1; z++) {
      let line = '';
      for (let x = x0; x <= x1; x++) {
        let ch = ' ';
        for (let yy = hi; yy >= lo; yy--) {
          if (disp.has(K(x, yy, z)) && disp.get(K(x, yy, z)).kind !== 'block') { ch = '*'; break; }
          const bl = at.get(K(x, yy, z));
          if (bl) { ch = disp.get(K(x, yy, z))?.kind === 'block' ? '*' : charOf(bl); break; }
        }
        if (ch === ' ' && (at.has(K(x, lo - 1, z)) || mode === 'layer' && x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1)) ch = '.';
        line += ch;
      }
      rows.push(`${String(z).padStart(3)} ${line}`);
    }
  }
  const items = (m.DISPLAYS || []).slice(0, 30).map(d => `${d.x},${d.y},${d.z} ${d.kind === 'block' ? 'en el expositor' : d.kind === 'frame' ? 'marco' : 'soporte'}: ${[].concat(d.item).join(' + ')}`);
  return [head, ...rows, 'Leyenda: ' + legend.join(' · '), items.length ? 'Objetos expuestos (* en la vista):\n' + items.join('\n') : ''].filter(Boolean).join('\n');
}

// ── revisión de calidad ──
export function reviewDesign(m) {
  const { at, solid, box } = grid(m), issues = [];
  if (!box) return { score: 0, issues: [{ level: 'error', msg: 'El diseño está vacío.' }] };
  const add = (level, msg, fix, where) => issues.push({ level, msg, fix, at: where?.slice(0, 6) });
  const K2 = m.KINDS || null, terrain = !!K2?.terrain, buildingish = !K2 || K2.building || K2.room;
  const id = b => m.P[b.t]?.id || '';
  // a cubierto: con algo encima que no sea la copa de un árbol (debajo de un cerezo se está al aire libre)
  const covered = (x, y, z) => { for (let yy = y + 1; yy <= box.y1; yy++) { const b = at.get(K(x, yy, z)); if (b && !/leaves|petals|vine/.test(id(b))) return true; } return false; };
  // celdas donde se puede estar de pie: aire (o algo que no estorba) con suelo debajo y aire encima; fuera de la obra, el terreno
  const free = (x, y, z) => { const b = at.get(K(x, y, z)); return !b || /carpet|pressure_plate|button|torch$|_sign$/.test(id(b)); };
  const footprint = new Set(m.BLOCKS.map(b => `${b.x},${b.z}`));
  const ground = (x, y, z) => (y === box.y0 && !footprint.has(`${x},${z}`)) || (!!at.get(K(x, y - 1, z)) && !free(x, y - 1, z));
  const stand = (x, y, z) => free(x, y, z) && free(x, y + 1, z) && ground(x, y, z);
  const X0 = box.x0 - 2, X1 = box.x1 + 2, Z0 = box.z0 - 2, Z1 = box.z1 + 2;
  const cells = [];
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) for (let y = box.y0; y <= box.y1; y++) if (stand(x, y, z)) cells.push([x, y, z]);
  // interior de verdad: con techo y sobre suelo (no encima de un pedestal, un farol o un mueble)
  const floorish = b => !!b && (solid(b) || /_slab$|carpet/.test(id(b)));   // sobre escaleras no (son tejados casi siempre)
  const inside = cells.filter(([x, y, z]) => covered(x, y, z) && footprint.has(`${x},${z}`) && floorish(at.get(K(x, y - 1, z)) || (free(x, y - 1, z) && at.get(K(x, y - 2, z)))));

  // luz de bloque: desde cada luz, -1 por paso a través de lo que no es macizo (desde 1.18 los monstruos aparecen con luz de bloque 0)
  const light = new Map(), queue = [];
  for (const b of m.BLOCKS) { const l = lightOf(id(b)) || (m.P[b.t]?.glow ? 15 : 0); if (l) { light.set(K(b.x, b.y, b.z), l); queue.push([b.x, b.y, b.z, l]); } }
  for (let i = 0; i < queue.length; i++) {
    const [x, y, z, l] = queue[i];
    if (l <= 1) continue;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const nx = x + dx, ny = y + dy, nz = z + dz, k = K(nx, ny, nz);
      if (nx < X0 || nx > X1 || nz < Z0 || nz > Z1 || ny < box.y0 - 1 || ny > box.y1 + 1 || (light.get(k) || 0) >= l - 1 || solid(at.get(k))) continue;
      light.set(k, l - 1); queue.push([nx, ny, nz, l - 1]);
    }
  }
  const dark0 = inside.filter(([x, y, z]) => !light.get(K(x, y, z))), dim0 = inside.filter(([x, y, z]) => (light.get(K(x, y, z)) || 0) < 8);

  // accesos: desde fuera, andando (subir o bajar 1)
  const seen = new Set(), q = [];
  for (const c of cells) if (!covered(...c)) { seen.add(c.join()); q.push(c); }   // cualquier sitio al aire libre es un acceso (también lo alto de una isla o un tejado)
  const walk = new Set(cells.map(c => c.join()));
  for (let i = 0; i < q.length; i++) {
    const [x, y, z] = q[i];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const dy of [0, 1, -1]) {
      const n = [x + dx, y + dy, z + dz], k = n.join();
      if (!walk.has(k) || seen.has(k) || (dy === 1 && !free(x, y + 2, z))) continue;
      seen.add(k); q.push(n);
    }
  }
  const shutSet = new Set(inside.filter(c => !seen.has(c.join())).map(c => c.join())), open = inside.filter(c => !shutSet.has(c.join()));
  const dark = dark0.filter(c => !shutSet.has(c.join())), darkShut = dark0.filter(c => shutSet.has(c.join())), dim = dim0.filter(c => !shutSet.has(c.join()));
  if (buildingish && inside.length && shutSet.size === inside.length) add('error', 'No se puede entrar: ningún hueco de 1×2 comunica el interior con el exterior', 'abre una puerta (room con door, building con doors, o el prefab arch en la pared)');
  if (dark.length) {
    const c = dark[Math.floor(dark.length / 2)];
    add('error', `${dark.length} de ${open.length} celdas donde se puede estar a cubierto están a oscuras (luz 0: ahí aparecen monstruos)`, `pon luces cada 5-6 bloques; p. ej. una cerca de ${c.join(',')} (farol colgado, aplique, farola)`, dark.filter((_, i) => i % Math.ceil(dark.length / 6) === 0));
  } else if (open.length && dim.length > open.length * 0.4) add('warning', `${dim.length} de ${open.length} celdas interiores con poca luz (<8): la sala se verá lúgubre`, 'añade luces o súbelas (lámparas colgantes en el centro, apliques en las paredes)');
  // desvanes y huecos cerrados: no molestan si tienen luz; a oscuras crían monstruos dentro de la obra
  if (darkShut.length > 3) add('warning', `${darkShut.length} celdas cerradas (desvanes, huecos) a oscuras: ahí aparecerán monstruos`, 'pon un farol cada 8 bloques en el desván o rellena el hueco', darkShut.filter((_, i) => i % Math.ceil(darkShut.length / 6) === 0));

  // objetos expuestos
  const disp = m.DISPLAYS || [];
  for (const d of disp) {
    const where = [d.x, d.y, d.z];
    if (d.kind === 'block') {
      if (!at.has(K(d.x, d.y, d.z))) add('error', `El objeto ${d.item} está en ${where} pero ahí ya no hay expositor`, 'vuelve a ponerlo con display sobre un bloque expositor', [where]);
      else if (!d.inside && at.has(K(d.x, d.y + 1, d.z))) add('error', `El objeto de ${where} queda tapado: hay un bloque justo encima del expositor`, 'deja aire encima del pedestal', [where]);
    } else if (d.kind === 'frame') {
      const back = { n: [0, 0, 1], s: [0, 0, -1], e: [-1, 0, 0], w: [1, 0, 0] }[d.f] || [0, 0, 0];
      if (!at.has(K(d.x + back[0], d.y, d.z + back[2]))) add('error', `El marco de ${where} no tiene pared detrás`, 'ponlo en una celda de aire pegada a una pared, con side hacia la pared', [where]);
    }
    const near = [...seen].some(k => { const [x, y, z] = k.split(',').map(Number); return Math.abs(x - d.x) <= 2 && Math.abs(z - d.z) <= 2 && Math.abs(y - d.y) <= 2; });
    if (seen.size && !near) add('warning', `Nadie puede acercarse al objeto de ${where}`, 'deja un pasillo hasta él', [where]);
  }
  const holders = new Set(disp.filter(d => d.kind === 'block').map(d => K(d.x, d.y, d.z)));
  const empty = m.BLOCKS.filter(b => /pedestal|display|showcase|item_shelf|podium/.test(id(b)) && !holders.has(K(b.x, b.y, b.z)) && !/trophy|head|skull/.test(id(at.get(K(b.x, b.y + 1, b.z)) || {})));
  if (empty.length) add('info', `${empty.length} expositores sin objeto`, 'pon el objeto con {op:"display",x,y,z,item}', empty.map(b => [b.x, b.y, b.z]));

  // estética: paredes planas, materiales, simetría, punto focal, altura
  const walls = [['oeste', b => b.x === box.x0], ['este', b => b.x === box.x1], ['norte', b => b.z === box.z0], ['sur', b => b.z === box.z1]];
  for (const [name, on] of walls) {
    const w = m.BLOCKS.filter(b => on(b) && b.y > box.y0 && b.y < box.y1), n = {};
    for (const b of w) n[b.t] = (n[b.t] || 0) + 1;
    const top = Math.max(0, ...Object.values(n));
    if (w.length >= 24 && top / w.length > 0.85) add('warning', `Pared ${name} plana: ${Math.round(100 * top / w.length)} % del mismo bloque`, 'dale relieve: pilares de otro material cada 3-5 bloques, zócalo y cornisa (remate), ventanas o huecos con arcos');
  }
  // decoración, plantas, luces y bloques de metal o gema (acentos y plintos de exposición): no hacen "paleta"
  const DECO = /carpet|chain|pedestal|display|lantern|lamp|torch|candle|_head$|skull|trophy|flower|petals|sapling|leaves|lily|fern|grass$|bush|azalea|button|pressure_plate|sign|banner|bed$|pot$|statue|altar|anvil|table|chair|bench|_ore$|debris|water|lava|(coal|iron|gold|copper|redstone|lapis|diamond|emerald|netherite|ium|steel|metal|ite|star)_block$/;
  const family = i => i.replace(/_(stairs|slab|wall|fence|fence_gate|log|wood|planks|bricks?|tiles?|pillar)$/, '').replace(/:(stripped_|polished_|chiseled_|cracked_|mossy_|cut_|smooth_)+/, ':');
  // caos de materiales: se mira por zonas de 16 × 16 (lo que se ve de un vistazo), no en todo el conjunto
  const zones = new Map();
  for (const b of m.BLOCKS) { const i = id(b); if (lightOf(i) || DECO.test(i)) continue; const k2 = `${b.x >> 4},${b.z >> 4}`; (zones.get(k2) ?? zones.set(k2, new Set()).get(k2)).add(family(i)); }
  const mats = new Set([...zones.values()].flatMap(z => [...z]));
  const worst = [...zones.entries()].sort((a, b) => b[1].size - a[1].size)[0];
  if (worst && worst[1].size > 12) { const [zx, zz] = worst[0].split(',').map(Number); add('info', `${worst[1].size} familias de materiales en la zona ${zx * 16},${zz * 16} (16 × 16): se ve caótica`, 'cada zona con 3-5 (60 % principal, 30 % secundario, 10 % acento); el tema de cada ala, con su propia paleta corta', [[zx * 16 + 8, box.y0 + 1, zz * 16 + 8]]); }
  if (m.BLOCKS.length > 150 && mats.size <= 2) add('warning', `Solo ${mats.size} material(es) en ${m.BLOCKS.length} bloques: monótono`, 'añade un material de remate (pilares, bordes) y uno de acento');
  const mid = (box.y0 + 1), layer = m.BLOCKS.filter(b => b.y >= mid && b.y <= mid + 2 && b.y < box.y1);
  if (buildingish && !terrain && layer.length >= 12) {
    const mirror = (fx, fz) => layer.filter(b => id(at.get(K(fx(b.x), b.y, fz(b.z))) || {}) === id(b)).length / layer.length;
    const sx = mirror(x => box.x0 + box.x1 - x, z => z), sz = mirror(x => x, z => box.z0 + box.z1 - z), s = Math.max(sx, sz);
    if (s < 0.6) add('info', `Simetría baja (${Math.round(100 * s)} %)`, 'en salas de exposición, halls y tronos, coloca en espejo respecto al eje largo (arrange lo hace solo)');
  }
  const iw = box.x1 - box.x0 - 1, id_ = box.z1 - box.z0 - 1;
  if (buildingish && !terrain && iw >= 9 && id_ >= 9) {
    const cx = (box.x0 + box.x1) >> 1, cz = (box.z0 + box.z1) >> 1;
    let busy = false;
    for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) for (let y = box.y0 + 1; y <= box.y0 + 3; y++) if (at.has(K(x, y, z)) || disp.some(d => d.x === x && d.z === z)) busy = true;
    if (!busy) add('info', `El centro de la sala (${cx},${box.y0 + 1},${cz}) está vacío`, 'pon un punto focal: la pieza estrella en un pedestal_grand, una fuente, una estatua o una lámpara grande encima');
  }
  const low = open.filter(([x, y, z]) => at.has(K(x, y + 2, z)));
  if (open.length && low.length > open.length * 0.5) add('info', 'Techo a 2 de altura en buena parte del interior: agobia', 'sube el techo a 4-5 en salas de exposición');
  // volumen y tejado: lo de arriba de cada columna construida (sin el terreno)
  const tops = new Map();
  for (const b of m.BLOCKS) { if (b.y <= box.y0 + 1) continue; const k2 = `${b.x},${b.z}`, t = tops.get(k2); if (!t || b.y > t.y) tops.set(k2, b); }
  let tlist = [...tops.values()];
  // terreno y plantas (solo los naturales: smooth_stone o polished_deepslate sí pueden ser una azotea) y piezas finas, que no son tejado
  const NATURAL = /^minecraft:(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|moss_block|moss_carpet|stone|andesite|diorite|granite|tuff|deepslate|calcite|sand|red_sand|gravel|snow|snow_block|water|.*_ore|.*leaves|.*_log|.*_wood|short_grass|tall_grass|fern|large_fern|.*flower|poppy|dandelion|azure_bluet|oxeye_daisy|.*tulip|.*_bush|azalea|flowering_azalea|lily_pad|.*petals)$|end_rod|chain|:(soul_)?lantern$|lightning_rod|torch|button|rail|pedestal|_wall$|fence|bars/;
  const flatOk = (m.FLATROOFS || []).length ? b => m.FLATROOFS.some(([x0, z0, x1, z1]) => b.x >= x0 && b.x <= x1 && b.z >= z0 && b.z <= z1) : () => false;
  tlist = tlist.filter(b => !NATURAL.test(id(b)) && !flatOk(b));
  if (terrain) { const ys2 = tlist.map(b => b.y).sort((a, b) => a - b), med = ys2[ys2.length >> 1]; tlist = tlist.filter(b => b.y > med + 3); }
  if (buildingish && tlist.length > 300) {
    const list = tlist, stairs = list.filter(b => /_stairs$/.test(id(b))).length / list.length;
    let top = -Infinity; for (const b of list) if (b.y > top) top = b.y;
    const atTop = list.filter(b => b.y >= top - 1).length / list.length;
    if (stairs < 0.25) add(list.length > 600 && stairs < 0.15 ? 'error' : 'warning', `Tejado plano o casi plano en ${list.length} columnas (solo ${Math.round(100 * stairs)} % de faldones): de lejos se ve una caja`, 'pon tejados con pendiente: building con shape irimoya, hip o gable, o la op roof sobre cada cuerpo; en estilo moderno, peto y voladizos');
    if (atTop > 0.7 && !terrain) add('warning', `El ${Math.round(100 * atTop)} % de la planta acaba a la misma altura (y=${top}): un solo volumen sin articular`, 'parte el programa en cuerpos de alturas distintas (plan_site): uno principal más alto, alas, torres o porches');
    const isLight = b => b && /glowstone|sea_lantern|shroomlight|froglight|redstone_lamp/.test(id(b));
    // una escultura de luz (sol, farol) tiene luz encima o debajo; una tira de luces sobre la cubierta, no
    const shown = list.filter(b => isLight(b) && !isLight(at.get(K(b.x, b.y - 1, b.z))) && !isLight(at.get(K(b.x, b.y + 1, b.z))));
    if (shown.length > 3) add('warning', `${shown.length} bloques de luz a la vista encima del tejado (${id(shown[0])}…)`, 'quítalos de la cubierta: faroles colgados bajo el alero y luces dentro', shown.map(b => [b.x, b.y, b.z]));
  }
  // cables a la vista: un cable de AE2 sin fachada o un cable/tubería de otro mod con alguna cara al aire
  const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  // solo se ve lo que toca aire al que se llega desde fuera (por huecos, puertas, trampillas o escalas): un cable en una sentina cerrada no
  const ox = box.x0 - 1, oy = box.y0 - 1, oz = box.z0 - 1, NX = box.x1 - ox + 2, NY = box.y1 - oy + 2, NZ = box.z1 - oz + 2;
  const outside = new Uint8Array(NX * NY * NZ), oq = [], ix = (x, y, z) => ((x - ox) * NY + (y - oy)) * NZ + (z - oz);
  const pass = (x, y, z) => { const b = at.get(K(x, y, z)); return !b || /door|trapdoor|ladder|fence_gate|carpet/.test(id(b)); };
  for (let x = ox; x < ox + NX; x++) for (let y = oy; y < oy + NY; y++) for (let z = oz; z < oz + NZ; z++) if (x === ox || y === oy || z === oz || x === ox + NX - 1 || y === oy + NY - 1 || z === oz + NZ - 1) { outside[ix(x, y, z)] = 1; oq.push(x, y, z); }
  while (oq.length) { const z = oq.pop(), y = oq.pop(), x = oq.pop(); for (const [dx, dy, dz] of N6) { const nx = x + dx, ny = y + dy, nz = z + dz; if (nx < ox || ny < oy || nz < oz || nx >= ox + NX || ny >= oy + NY || nz >= oz + NZ) continue; const i = ix(nx, ny, nz); if (outside[i] || !pass(nx, ny, nz)) continue; outside[i] = 1; oq.push(nx, ny, nz); } }
  const seen2 = b => N6.some(([dx, dy, dz]) => { const x = b.x + dx, y = b.y + dy, z = b.z + dz; return x >= ox && y >= oy && z >= oz && x < ox + NX && y < oy + NY && z < oz + NZ && outside[ix(x, y, z)] && !at.has(K(x, y, z)); });
  const shown2 = m.BLOCKS.filter(b => ((b.cable && id(b) === 'ae2:cable_bus') || (!b.cable && /(cable|conduit|pipe|duct)(_[a-z0-9]+)?$/.test(id(b)))) && seen2(b));
  if (shown2.length > 3) add('warning', `${shown2.length} cables a la vista (${[...new Set(shown2.map(b => b.cable ? b.cid || 'cable AE2' : id(b)))].slice(0, 3).join(', ')})`, 'escóndelos: route con cable y block (el cable va dentro del bloque como fachada) por dentro del suelo; los cables de energía, por dentro de la roca o del suelo', shown2.map(b => [b.x, b.y, b.z]));
  // oficio: lo que en el juego se ve mal aunque los números cuadren
  const D4 = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }, OPP4 = { n: 's', s: 'n', e: 'w', w: 'e' };
  const thin = /_slab$|_stairs$|_pane$|fence|_wall$|carpet|trapdoor|ladder|lantern|torch|_rod$|chain|bars$|button|lever|rail$|_bed$|banner|sign|flower_pot|candle/;
  const solidB = b => !!b && !thin.test(id(b)) && !b.cable && !/cable|pipe|conduit/.test(id(b));
  const near = (b, d, dy = 0) => at.get(K(b.x + (D4[d]?.[0] || 0), b.y + dy, b.z + (D4[d]?.[1] || 0)));
  // losas de arriba con aire debajo: suelos, cubiertas o voladizos de losa (se ve media altura vacía por debajo y por el canto)
  const slabFloors = m.BLOCKS.filter(b => /_slab$/.test(id(b)) && b.top && !at.has(K(b.x, b.y - 1, b.z)));
  if (slabFloors.length > 12) add('warning', `${slabFloors.length} losas de arriba con aire debajo (suelos, cubiertas o voladizos hechos de losa): por debajo y por el canto se ve media altura vacía`, 'suelos, cubiertas y voladizos de bloques enteros; las losas, solo de remate (encima de un muro, alero de tejado, escalón)', slabFloors.map(b => [b.x, b.y, b.z]));
  // escaleras sueltas: ni apoyadas (detrás, encima si es invertida, debajo si es normal) ni en fila con otras iguales
  const looseStairs = m.BLOCKS.filter(b => {
    if (!/_stairs$/.test(id(b)) || !D4[b.f]) return false;
    const row = b.f === 'n' || b.f === 's' ? ['e', 'w'] : ['n', 's'];
    if (row.some(d => { const o = near(b, d); return o && /_stairs$/.test(id(o)) && o.f === b.f && !!o.top === !!b.top; })) return false;
    return !solidB(near(b, OPP4[b.f])) && !solidB(at.get(K(b.x, b.y + (b.top ? 1 : -1), b.z)));
  });
  if (looseStairs.length > 3) add('warning', `${looseStairs.length} escaleras sueltas: ni apoyadas ni en fila (ménsulas, riostras o remates flotando)`, 'una ménsula es un triángulo macizo: bloques enteros detrás y la escalera invertida solo en la punta, mirando al muro; un remate va en fila continua', looseStairs.map(b => [b.x, b.y, b.z]));
  // cristales en escalón: un panel sin ningún panel ni bloque al lado (en diagonal se ve el hueco)
  const lonePanes = m.BLOCKS.filter(b => /_pane$/.test(id(b)) && !Object.keys(D4).some(d => { const o = near(b, d); return o && (/_pane$/.test(id(o)) || solidB(o)); }));
  if (lonePanes.length > 3) add('warning', `${lonePanes.length} cristales sueltos o en escalón: solo se tocan en diagonal y se ve el hueco`, 'ventanas solo en paredes rectas, en paños enmarcados; en una superficie curva, bloques enteros', lonePanes.map(b => [b.x, b.y, b.z]));
  // terreno de cajas: por debajo de la capa más ancha, capas que son rectángulos llenos (pirámide escalonada)
  const lay = new Map();
  for (const b of m.BLOCKS) { const L = lay.get(b.y) ?? lay.set(b.y, { n: new Set(), x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 }).get(b.y); L.n.add(`${b.x},${b.z}`); L.x0 = Math.min(L.x0, b.x); L.x1 = Math.max(L.x1, b.x); L.z0 = Math.min(L.z0, b.z); L.z1 = Math.max(L.z1, b.z); }
  const ly = [...lay.keys()].sort((a, b) => a - b), widest = ly.reduce((a, y) => (lay.get(y).n.size > lay.get(a).n.size ? y : a), ly[0]);
  const below = ly.filter(y => y < widest && lay.get(y).n.size >= 9);
  const boxy = below.filter(y => { const L = lay.get(y); return L.n.size >= 0.97 * (L.x1 - L.x0 + 1) * (L.z1 - L.z0 + 1); });
  if (below.length >= 4 && boxy.length >= 0.7 * below.length) add('warning', `Por debajo, ${boxy.length} de ${below.length} capas son rectángulos llenos: se ve una pirámide de cajas, no una roca`, 'para una isla o un terreno usa feature island (contorno irregular, roca que se afina con estalactitas) o boulder; nada de capas cuadradas');
  for (const w of validateModel(m).warnings) add('warning', w.msg, 'apóyalos en algo o quítalos');

  const score = Math.max(0, 100 - 20 * issues.filter(i => i.level === 'error').length - 7 * issues.filter(i => i.level === 'warning').length - 2 * issues.filter(i => i.level === 'info').length);
  return { score, interior: open.length, lit: open.length ? `${Math.round(100 * (1 - dim.length / open.length))} % bien iluminado` : undefined, displays: disp.length, issues };
}
