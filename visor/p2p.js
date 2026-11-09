// Red P2P — red AE2 mínima, autónoma y separada del Centro AE2, que fabrica sola ME P2P Tunnels. Visor: index.html?d=p2p
// Va en la mining dimension, sobre el césped; energía por un Ender Gate de Powah pegado al controlador.
// Comprobado en los jars de la instancia (AE2 19.2.17, ExtendedAE 2.2.35, KubeJS de ATM10, Powah):
//  · ae2:network/parts/tunnels_me: 3 hierro + 1 Engineering Processor + 3 fluix (tag ae2:all_fluix) = 1 ME P2P Tunnel.
//  · KubeJS de ATM10: la Universal Press (kubejs:universal_press) en un Inscriber imprime cualquier circuito
//    (diamante → Printed Engineering, silicio → Printed Silicon).
//  · ExtendedAE Crystal Assembler (enable_crystal_assembler_inscribe_processors = true en la config):
//    4 Printed Engineering + 4 Printed Silicon + 4 redstone = 4 Engineering Processor;
//    4 Charged Certus + 4 redstone + 4 cuarzo del Nether + 100 mB de agua = 8 fluix.
//  · ae2:charger: 1 Certus = 1 Charged Certus. El Charger no devuelve nada solo (ChargerBlockEntity no empuja); su
//    inventario solo deja sacar lo ya cargado (ChargerInvFilter.allowExtract) → un Import Bus lo recoge sin llevarse el certus.
//  · Inscriber, Charger y Crystal Assembler son nodos de la red sin canal y toman energía de ella; el Inscriber trae
//    Auto-Export en NO y Separate Sides en NO (todo lo que entra por un lado va a su hueco). Inscriber y Crystal Assembler: 4 mejoras.
//  · El controlador (AEBasePoweredBlockEntity) acepta FE: el Ender Gate alimenta toda la red. Ender Gate Basic = 2.000 FE/t.

export const TITLE = 'Red P2P · ATM10 Aeronautics';
export const SUB = 'Red AE2 autónoma que fabrica ME P2P Tunnels sola · 5 × 2 × 3 · energía por Ender Gate de Powah';
export const SKY = '#6eb1ff';
const GRASS = '#55c93f';

// ── objetos que salen en los patrones y en las máquinas (nombre e icono de su textura de objeto) ──
const IT = (n, icon, o = {}) => ({ n, icon, ...o });
export const ITEMS = {
  'minecraft:iron_ingot': IT('Lingote de hierro', 'minecraft:item/iron_ingot'),
  'minecraft:diamond': IT('Diamante', 'minecraft:item/diamond'),
  'minecraft:redstone': IT('Polvo de redstone', 'minecraft:item/redstone'),
  'minecraft:quartz': IT('Cuarzo del Nether', 'minecraft:item/quartz'),
  'minecraft:water': IT('Agua', 'minecraft:water_still', { tint: '#3f76e4', fluid: true }),
  'ae2:silicon': IT('Silicio', 'ae2:item/silicon'),
  'ae2:printed_silicon': IT('Printed Silicon', 'ae2:item/printed_silicon'),
  'ae2:printed_engineering_processor': IT('Printed Engineering Circuit', 'ae2:item/printed_engineering_processor'),
  'ae2:engineering_processor': IT('Engineering Processor', 'ae2:item/engineering_processor'),
  'ae2:certus_quartz_crystal': IT('Certus Quartz Crystal', 'ae2:item/certus_quartz_crystal'),
  'ae2:charged_certus_quartz_crystal': IT('Charged Certus Quartz Crystal', 'ae2:item/certus_quartz_crystal_charged'),
  'ae2:fluix_crystal': IT('Fluix Crystal', 'ae2:item/fluix_crystal'),
  'ae2:me_p2p_tunnel': IT('ME P2P Tunnel', ['ae2:part/p2p_tunnel_front', 'ae2:part/p2p_tunnel_me']),
  'kubejs:universal_press': IT('Universal Press', 'kubejs:item/universal_press'),
  'ae2:speed_card': IT('Acceleration Card', ['ae2:item/advanced_card', 'ae2:item/card_speed']),
  'ae2:item_storage_cell_64k': IT('ME Item Storage Cell 64k', 'ae2:item/item_storage_cell_64k'),
  'ae2:fluid_storage_cell_4k': IT('ME Fluid Storage Cell 4k', 'ae2:item/fluid_storage_cell_4k'),
};
// ── los 6 patrones: crafteo = rejilla 3 × 3 tal cual · procesado = entradas con cantidad → salidas ──
const S = (id, n = 1) => [id, n];
export const PATTERNS = {
  p2p: { name: 'ME P2P Tunnel', kind: 'crafting', grid: [null, S('minecraft:iron_ingot'), null, S('minecraft:iron_ingot'), S('ae2:engineering_processor'), S('minecraft:iron_ingot'), S('ae2:fluix_crystal'), S('ae2:fluix_crystal'), S('ae2:fluix_crystal')], out: [S('ae2:me_p2p_tunnel')] },
  pengineering: { name: 'Printed Engineering Circuit', kind: 'processing', in: [S('minecraft:diamond')], out: [S('ae2:printed_engineering_processor')] },
  psilicon: { name: 'Printed Silicon', kind: 'processing', in: [S('ae2:silicon')], out: [S('ae2:printed_silicon')] },
  processor: { name: 'Engineering Processor', kind: 'processing', in: [S('ae2:printed_engineering_processor', 4), S('ae2:printed_silicon', 4), S('minecraft:redstone', 4)], out: [S('ae2:engineering_processor', 4)] },
  fluix: { name: 'Fluix Crystal', kind: 'processing', in: [S('ae2:charged_certus_quartz_crystal', 4), S('minecraft:redstone', 4), S('minecraft:quartz', 4), S('minecraft:water', 100)], out: [S('ae2:fluix_crystal', 8)] },
  charged: { name: 'Charged Certus Quartz', kind: 'processing', in: [S('ae2:certus_quartz_crystal')], out: [S('ae2:charged_certus_quartz_crystal')] },
};

const TERM_TINT = { 1: '#9a9ea8', 2: '#d4d7de', 3: '#f6f8ff' };
export const P = {
  grass:  { n: 'Bloque de césped', id: 'minecraft:grass_block', top: 'minecraft:grass_block_top', side: 'minecraft:grass_block_side', bottom: 'minecraft:dirt', ctint: { top: GRASS } },
  pad:    { n: 'Piedra del cielo lisa (base)', id: 'ae2:smooth_sky_stone_block', all: 'ae2:smooth_sky_stone_block' },
  lantern:{ n: 'Farol', id: 'minecraft:lantern', model: 'minecraft:block/lantern', glow: true, dim: 0.9 },
  ctrl:   { n: 'ME Controller', id: 'ae2:controller', all: 'ae2:controller_powered', glow: 'ae2:controller_lights' },
  gate:   { n: 'Ender Gate Basic (Powah)', id: 'powah:ender_gate_basic', model: 'powah:block/ender_gate_basic', yaw: 180, glow: true, dim: 0.5 },
  drive:  { n: 'ME Drive', id: 'ae2:drive', front: 'ae2:drive/drive_front', side: 'ae2:generics/side', top: 'ae2:generics/top', back: 'ae2:generics/back', glow: { front: 'ae2:drive/drive_front' }, dim: 0.35 },
  cstore: { n: 'Crafting Storage 64k', id: 'ae2:64k_crafting_storage', all: 'ae2:crafting/64k_storage', glow: 'ae2:crafting/64k_storage_light' },
  cacc:   { n: 'Crafting Co-Processing Unit', id: 'ae2:crafting_accelerator', all: 'ae2:crafting/accelerator', glow: 'ae2:crafting/accelerator_light' },
  pp:     { n: 'Pattern Provider · direccional (llave), la cara clara mira a su máquina', id: 'ae2:pattern_provider', front: 'ae2:pattern_provider_alternate_front', side: 'ae2:pattern_provider_alternate', back: 'ae2:pattern_provider' },
  ppb:    { n: 'Pattern Provider · direccional y en Blocking Mode', id: 'ae2:pattern_provider', front: 'ae2:pattern_provider_alternate_front', side: 'ae2:pattern_provider_alternate', back: 'ae2:pattern_provider' },
  ins:    { n: 'Inscriber', id: 'ae2:inscriber', model: 'ae2:block/inscriber', yaw: 180 },
  cas:    { n: 'Crystal Assembler (ExtendedAE)', id: 'extendedae:crystal_assembler', side: 'extendedae:crystal_assembler/on', top: 'extendedae:crystal_assembler/top', glow: { side: 'extendedae:crystal_assembler/on' }, dim: 0.4 },
  chg:    { n: 'Charger', id: 'ae2:charger', model: 'ae2:block/charger', yaw: 180 },
  mol:    { n: 'Molecular Assembler', id: 'ae2:molecular_assembler', all: 'ae2:molecular_assembler', glow: 'ae2:molecular_assembler_lights', cutout: true },
  cable:  { n: 'ME Glass Cable (fluix)', id: 'ae2:fluix_glass_cable', all: 'ae2:part/cable/glass/transparent', shape: 'pipe' },
  term:   { n: 'ME Pattern Encoding Terminal · parte en el cable', id: 'ae2:pattern_encoding_terminal', model: ['ae2:part/display_base', 'ae2:part/pattern_encoding_terminal_on', 'ae2:part/display_status_has_channel'], tint: TERM_TINT, dim: 0.9, yaw: 180 },
  ibus:   { n: 'ME Import Bus · parte en el cable', id: 'ae2:import_bus', model: ['ae2:part/import_bus_base', 'ae2:part/import_bus_on'], dim: 0.6, yaw: 180 },
};

export const W = 11, WX = 11, WZ = 9, H = 5;
export const WALLS = { x0: -1, x1: W, z0: -1, z1: WZ, top: 9 };     // nada que ocultar: es una mesa al aire libre
const blocks = new Map(), K = (x, y, z) => `${x},${y},${z}`;
const put = (x, y, z, t, f = 's', o = {}) => blocks.set(K(x, y, z), { x, y, z, t, f, ...o });
const get = (x, y, z) => blocks.get(K(x, y, z));
const G = { tag: 'g' };

// ── terreno y base ──
for (let x = 0; x < WX; x++) for (let z = 0; z < WZ; z++) put(x, 0, z, x >= 2 && x <= 8 && z >= 2 && z <= 6 ? 'pad' : 'grass', 's', G);
for (const x of [2, 8]) put(x, 1, 6, 'lantern');

// ── la red: pared de 5 × 2 en z=4, mirando al sur (te pones en z=6) ──
// y=1:  Molecular Assembler · PP→ · Controller · PP→ · Charger
// y=2:  Inscriber           · PP→ · ME Drive   · PP→ · Crystal Assembler
// y=3:  CPU (Co-Processor · Storage 64k · Co-Processor) encima del Drive y de los 2 proveedores de arriba
const Z = 4, card = S('ae2:speed_card', 4);
const CPU = { title: 'Crafting CPU', settings: ['Crafting Storage 64k + 2 Co-Processing Units pegadas: forman una sola CPU.', 'Si al pedir los 672 dice que no tiene memoria, pídelos en 2 tandas de 336.'] };
put(3, 1, Z, 'mol', 's', { gui: { title: 'Molecular Assembler', settings: ['No se configura: su proveedor le pasa los ingredientes y él devuelve el ME P2P Tunnel a la red.', 'Opcional: Acceleration Cards para ir más rápido.'] } });
put(4, 1, Z, 'pp', 'w', { patterns: ['p2p'], target: [3, 1, Z], push: 'el oeste' });
put(5, 1, Z, 'ctrl', 's', { gui: { title: 'ME Controller', settings: ['Recibe la energía del Ender Gate de detrás: el controlador acepta FE y la reparte por toda la red.'] } });
put(6, 1, Z, 'pp', 'e', { patterns: ['charged'], target: [7, 1, Z], push: 'el este' });
put(7, 1, Z, 'chg', 's', { gui: { title: 'Charger', settings: ['No se configura.', 'El Import Bus de delante saca el Charged Certus a la red; el certus sin cargar no puede salir.'] } });
put(3, 2, Z, 'ins', 's', { gui: { title: 'Inscriber', slots: [
  { label: 'Hueco de arriba', item: S('kubejs:universal_press'), hint: 'la Universal Press se queda puesta' },
  { label: 'Hueco del centro', item: null, hint: 'lo llena el proveedor (diamante o silicio)' },
  { label: 'Hueco de abajo', item: null, hint: 'vacío' }], cards: [card],
  settings: ['<b>Auto-Export: Sí</b> (botón de la izquierda): devuelve el circuito al proveedor.', 'Separate Sides: No (viene así).'] } });
put(4, 2, Z, 'pp', 'w', { patterns: ['pengineering', 'psilicon'], target: [3, 2, Z], push: 'el oeste' });
put(5, 2, Z, 'drive', 's', { gui: { title: 'ME Drive', slots: [
  { label: 'Celda de objetos', item: S('ae2:item_storage_cell_64k'), hint: 'todos los materiales y los túneles' },
  { label: 'Celda de fluidos', item: S('ae2:fluid_storage_cell_4k'), hint: 'el agua: vacía los cubos en la terminal' }] } });
put(6, 2, Z, 'ppb', 'e', { patterns: ['processor', 'fluix'], target: [7, 2, Z], push: 'el este', blocking: true });
put(7, 2, Z, 'cas', 's', { gui: { title: 'Crystal Assembler', slots: [{ label: 'Entradas', item: null, hint: 'las llena el proveedor (objetos y agua)' }], cards: [card],
  settings: ['<b>Auto-Export: Sí</b>: devuelve los procesadores y el fluix al proveedor.', 'Su proveedor va en <b>Blocking Mode</b>: no le mete una receta hasta que acaba la anterior.'] } });
put(4, 3, Z, 'cacc', 's', { gui: CPU }); put(5, 3, Z, 'cstore', 's', { gui: CPU }); put(6, 3, Z, 'cacc', 's', { gui: CPU });
put(5, 1, Z - 1, 'gate', 'n', { gui: { title: 'Ender Gate Basic (Powah)', settings: ['Ponlo en el mismo canal que tus Ender Cells.', 'Basic mueve 2.000 FE/t: de sobra para esta red.', 'Si el controlador no se enciende, revisa la configuración del lado que lo toca.'] } });
for (let x = 3; x <= 7; x++) put(x, 1, Z + 1, 'cable');              // barra de cable delante (une el Import Bus y la terminal)
export const TERMS = [                                                // el Drive queda libre a la altura de los ojos para meter las celdas
  { x: 5, y: 1, z: Z + 1, t: 'term', f: 's', gui: { title: 'ME Pattern Encoding Terminal', settings: ['Aquí codificas los 6 patrones: pasa el ratón por cada Pattern Provider para ver los suyos.', 'Aquí también pides los túneles: busca ME P2P Tunnel, clic con la rueda y escribe 672.'] } },
  { x: 7, y: 1, z: Z + 1, t: 'ibus', f: 'n', gui: { title: 'ME Import Bus', settings: ['Mira al Charger y saca el Charged Certus a la red.', 'Sin filtro: el Charger solo deja sacar lo que ya está cargado.'] } },
];

// ── cables: brazo hacia cada vecino de la red (una cara con una parte no conecta) ──
const AE = new Set(['ctrl', 'drive', 'cstore', 'cacc', 'pp', 'ppb', 'ins', 'cas', 'chg', 'mol', 'cable']);
const D6 = [[1, 0, 0, 'e'], [-1, 0, 0, 'w'], [0, 1, 0, 'u'], [0, -1, 0, 'd'], [0, 0, 1, 's'], [0, 0, -1, 'n']];
const partOn = (b, f) => TERMS.some(t => t.x === b.x && t.y === b.y && t.z === b.z && t.f === f);
const links = b => D6.filter(([dx, dy, dz, f]) => AE.has(get(b.x + dx, b.y + dy, b.z + dz)?.t) && !(b.t === 'cable' && partOn(b, f)));
for (const b of blocks.values()) if (b.t === 'cable') {
  b.boxes = [[0.375, 0.375, 0.375, 0, 0, 0]]; b.bkey = 0;
  for (const [dx, dy, dz, f] of links(b)) { b.bkey |= 1 << D6.findIndex(d => d[3] === f); const d = [dx, dy, dz]; b.boxes.push(d.map(v => (v ? 0.3125 : 0.25)).concat(d.map(v => v * 0.34375))); }
}

// ── comprobaciones ──
const net = [...blocks.values()].filter(b => AE.has(b.t)), seen = new Set([K(5, 1, Z)]), queue = [get(5, 1, Z)];
while (queue.length) { const b = queue.pop(); for (const [dx, dy, dz] of links(b)) { const n = get(b.x + dx, b.y + dy, b.z + dz), k = K(n.x, n.y, n.z); if (!seen.has(k) && !(n.t === 'cable' && partOn(n, D6.find(d => d[0] === -dx && d[1] === -dy && d[2] === -dz)[3]))) { seen.add(k); queue.push(n); } } }
if (seen.size !== net.length) throw new Error(`${net.length - seen.size} bloques de AE2 no están unidos a la red`);
const STEP = { e: [1, 0, 0], w: [-1, 0, 0], s: [0, 0, 1], n: [0, 0, -1] };
const FITS = { mol: ['p2p'], ins: ['pengineering', 'psilicon'], cas: ['processor', 'fluix'], chg: ['charged'] }; // qué patrón puede ir a cada máquina
const placed = [];
for (const b of net) if (b.t === 'pp' || b.t === 'ppb') {             // cada proveedor apunta a su máquina y lleva patrones que esa máquina sabe hacer
  const [dx, dy, dz] = STEP[b.f], m = get(b.x + dx, b.y + dy, b.z + dz);
  if (!FITS[m?.t]) throw new Error(`El Pattern Provider de ${b.x},${b.y},${b.z} no mira a una máquina`);
  if (K(...b.target) !== K(m.x, m.y, m.z)) throw new Error(`El Pattern Provider de ${b.x},${b.y},${b.z} apunta a otra máquina que la de su ficha`);
  for (const id of b.patterns) { if (!FITS[m.t].includes(id)) throw new Error(`El patrón ${id} no se puede hacer en ${m.t}`); placed.push(id); }
}
if (placed.sort().join() !== Object.keys(PATTERNS).sort().join()) throw new Error('Cada patrón debe estar en un proveedor, una sola vez');
const cnt = (list, id) => list.filter(e => e?.[0] === id).reduce((s, e) => s + e[1], 0);
if (cnt(PATTERNS.p2p.grid, 'minecraft:iron_ingot') !== 3 || cnt(PATTERNS.p2p.grid, 'ae2:engineering_processor') !== 1 || cnt(PATTERNS.p2p.grid, 'ae2:fluix_crystal') !== 3) throw new Error('La rejilla del P2P no es la receta tunnels_me');
for (const [id, p] of Object.entries(PATTERNS)) for (const [i] of [...(p.grid || []).filter(Boolean), ...(p.in || []), ...p.out]) if (!ITEMS[i]) throw new Error(`Falta ${i} en ITEMS (patrón ${id})`);
const touch = (a, t) => D6.some(([dx, dy, dz]) => get(a.x + dx, a.y + dy, a.z + dz)?.t === t);
const one = t => net.find(b => b.t === t);
if (touch(one('cas'), 'mol')) throw new Error('El Crystal Assembler no puede tocar el Molecular Assembler: le metería fluix');
if (!touch(one('ctrl'), 'gate')) throw new Error('El Ender Gate debe tocar el controlador');
const ib = TERMS.find(t => t.t === 'ibus'), [ix, iy, iz] = STEP[ib.f];
if (get(ib.x + ix, ib.y + iy, ib.z + iz)?.t !== 'chg') throw new Error('El Import Bus debe mirar al Charger');
const channels = net.filter(b => ['drive', 'pp', 'ppb'].includes(b.t)).length + 1 /* CPU */ + TERMS.length;

// ── números para 672 túneles ──
const N = 672, fluixCrafts = Math.ceil(3 * N / 8), procCrafts = Math.ceil(N / 4);
export const STATS = {
  p2p: N, iron: 3 * N, diamonds: procCrafts * 4, silicon: procCrafts * 4, redstone: procCrafts * 4 + fluixCrafts * 4,
  certus: fluixCrafts * 4, quartz: fluixCrafts * 4, water: fluixCrafts * 100, channels,
};
export const BLOCKS = [...blocks.values()];
export const ZONES = [
  { n: 'Frente', p: [5.5, 3.2, 10.5], t: [5.5, 2, 4.5], aw: false },
  { n: 'Tres cuartos', p: [10, 5, 9.5], t: [5.5, 2, 4.5], aw: false },
  { n: 'Detrás (Ender Gate)', p: [7.5, 3.5, -1.5], t: [5.5, 1.5, 4], aw: false },
];
const n = x => Math.round(x).toLocaleString('es');
export const INFO = `
<p><b>Red AE2 autónoma</b>, sin conexión con el Centro AE2: su propio controlador, su Drive y su CPU (${channels} canales). Le pides <b>${N} ME P2P Tunnel</b> en la terminal y fabrica sola toda la cadena.</p>
<p><b>Lo que tienes que meter</b> por la terminal para ${N}: ${n(STATS.iron)} hierro, ${n(STATS.diamonds)} diamantes, ${n(STATS.silicon)} silicio, ${n(STATS.redstone)} redstone, ${n(STATS.certus)} Certus Quartz Crystal, ${n(STATS.quartz)} cuarzo del Nether y ${n(Math.ceil(STATS.water / 1000))} cubos de agua (${n(STATS.water)} mB).</p>
<ol>
<li><b>Sitio y energía.</b> En la mining dimension, en un chunk que cargues con FTB Chunks. Ender Gate Basic o mejor detrás del controlador, en el mismo canal que tus Ender Cells.</li>
<li><b>Máquinas.</b> Pasa el ratón por cada una (o clic para fijar su ficha): verás sus huecos, mejoras y ajustes como en el juego.</li>
<li><b>Patrones.</b> En la sección <b>Patrones</b> de abajo, o pasando el ratón por cada Pattern Provider, ves los 6 patrones dibujados como en la Pattern Encoding Terminal y en qué proveedor va cada uno.</li>
<li><b>Pedido.</b> En la terminal, busca ME P2P Tunnel, clic con la rueda y escribe ${N}.</li>
</ol>`;
export const EXTRA_TEX = [...new Set([...Object.values(ITEMS).flatMap(i => [].concat(i.icon)), 'ae2:item/crafting_pattern', 'ae2:item/processing_pattern'])];
