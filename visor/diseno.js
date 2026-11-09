// Diseño del Centro AE2 — sala 43 (X) x 43 (Z) x 39 (Y). Norte = Z bajo.
// Coordenadas: 0 y 42 son la capa de revestimiento de paredes; Y=0 suelo, Y=38 techo.

// Paleta: id -> { name, mod id del bloque, texturas por cara, glow, glass/cutout }
export const P = {
  pdeep:  { n: 'Pizarra profunda pulida', id: 'minecraft:polished_deepslate', all: 'minecraft:polished_deepslate' },
  dtiles: { n: 'Baldosas de pizarra profunda', id: 'minecraft:deepslate_tiles', all: 'minecraft:deepslate_tiles' },
  dbricks:{ n: 'Ladrillos de pizarra profunda', id: 'minecraft:deepslate_bricks', all: 'minecraft:deepslate_bricks' },
  cdeep:  { n: 'Pizarra profunda cincelada', id: 'minecraft:chiseled_deepslate', all: 'minecraft:chiseled_deepslate' },
  bsb:    { n: 'Ladrillos de piedra negra pulida', id: 'minecraft:polished_blackstone_bricks', all: 'minecraft:polished_blackstone_bricks' },
  skys:   { n: 'Piedra del cielo lisa', id: 'ae2:smooth_sky_stone_block', all: 'ae2:smooth_sky_stone_block' },
  skyb:   { n: 'Ladrillos de piedra del cielo', id: 'ae2:sky_stone_brick', all: 'ae2:sky_stone_brick' },
  skysm:  { n: 'Ladrillos peq. de piedra del cielo', id: 'ae2:sky_stone_small_brick', all: 'ae2:sky_stone_small_brick' },
  tinted: { n: 'Cristal tintado', id: 'minecraft:tinted_glass', all: 'minecraft:tinted_glass', glass: true },
  vibr:   { n: 'Cristal de cuarzo vibrante (luz)', id: 'ae2:quartz_vibrant_glass', all: 'ae2:glass/quartz_glass_a', glow: true, dim: 0.7, ctm: true },
  lamp:   { n: 'Illuminant Block blanco', id: 'simplylight:illuminant_block_on', all: 'simplylight:full_block/illuminant_block_on', glow: true, dim: 0.55 },
  qglass: { n: 'Cristal de cuarzo (suelo del pozo)', id: 'ae2:quartz_glass', all: 'ae2:glass/quartz_glass_a', ctm: true },
  pg_black:  { n: 'Cristal tintado negro', id: 'minecraft:black_stained_glass', all: 'minecraft:black_stained_glass', glass: true },
  pg_lgray:  { n: 'Cristal tintado gris claro', id: 'minecraft:light_gray_stained_glass', all: 'minecraft:light_gray_stained_glass', glass: true },
  pg_gray:   { n: 'Cristal tintado gris', id: 'minecraft:gray_stained_glass', all: 'minecraft:gray_stained_glass', glass: true },
  pg_tinted: { n: 'Cristal ahumado (tinted)', id: 'minecraft:tinted_glass', all: 'minecraft:tinted_glass', glass: true },
  pg_quartz: { n: 'Cristal de cuarzo AE2', id: 'ae2:quartz_glass', all: 'ae2:glass/quartz_glass_a', glass: true },
  bconc:  { n: 'Hormigón negro (fondo del pozo)', id: 'minecraft:black_concrete', all: 'minecraft:black_concrete' },
  bar:    { n: 'Barra luminosa (Simply Light)', id: 'simplylight:rodlamp', all: 'simplylight:omni2', glow: true, dim: 1.2, shape: 'bar' },
  fix:    { n: 'Vara del End (End Rod)', id: 'minecraft:end_rod', all: 'minecraft:end_rod', glow: true, dim: 1.2, bg: '#f2f4ff', shape: 'rod' },
  dcable: { n: 'Cable denso blanco (oculto, detrás de los drives)', id: 'ae2:cable_bus', all: 'ae2:fluix_block', shape: 'post' },
  bsb_st: { n: 'Escaleras de ladrillos de piedra negra pulida', id: 'minecraft:polished_blackstone_brick_stairs', all: 'minecraft:polished_blackstone_bricks', shape: 'stairs' },
  pdeep_st:{ n: 'Escaleras de pizarra profunda pulida', id: 'minecraft:polished_deepslate_stairs', all: 'minecraft:polished_deepslate', shape: 'stairs' },
  skysm_st:{ n: 'Escaleras de ladrillos peq. de piedra del cielo', id: 'ae2:sky_stone_small_brick_stairs', all: 'ae2:sky_stone_small_brick', shape: 'stairs' },
  skys_st: { n: 'Escaleras de piedra del cielo lisa', id: 'ae2:smooth_sky_stone_stairs', all: 'ae2:smooth_sky_stone_block', shape: 'stairs' },
  elev:   { n: 'Ascensor blanco', id: 'elevatorid:elevator_white', all: 'elevatorid:elevator_white' },

  ctrl:   { n: 'Controlador ME', id: 'ae2:controller', all: 'ae2:controller_powered', glow: 'ae2:controller_lights' },
  emcell: { n: 'MEGA Energy Cell', id: 'megacells:mega_energy_cell', all: 'megacells:mega_energy_cell_4', glow: true, dim: 0.5 },
  wconn:  { n: 'Wireless Connector (ExtendedAE)', id: 'extendedae:wireless_connect', all: 'extendedae:wireless_connector/wireless_connect_white', glow: true, dim: 0.6 },

  drive:  { n: 'ME Drive', id: 'ae2:drive', front: 'ae2:drive/drive_front', side: 'ae2:generics/side', top: 'ae2:generics/top', back: 'ae2:generics/back', glow: { front: 'ae2:drive/drive_front' }, dim: 0.35 },
  iop:    { n: 'ME IO Port', id: 'ae2:io_port', front: 'ae2:io_port_front', side: 'ae2:io_port_side', top: 'ae2:io_port_top' },
  cwb:    { n: 'Cell Workbench', id: 'ae2:cell_workbench', side: 'ae2:cell_workbench_side', top: 'ae2:cell_workbench_top' },
  exif:   { n: 'Extended Interface', id: 'extendedae:ex_interface', all: 'extendedae:ex_interface' },

  cu:     { n: 'Crafting Unit (MEGA)', id: 'megacells:mega_crafting_unit', all: 'megacells:crafting/unit' },
  cstore: { n: 'Crafting Storage 256M (MEGA)', id: 'megacells:256m_crafting_storage', all: 'megacells:crafting/256m_storage', glow: 'megacells:crafting/256m_storage_light' },
  cacc:   { n: 'Crafting Accelerator (MEGA)', id: 'megacells:mega_crafting_accelerator', all: 'megacells:crafting/accelerator', glow: 'megacells:crafting/accelerator_light' },
  cmon:   { n: 'Crafting Monitor (MEGA)', id: 'megacells:mega_crafting_monitor', all: 'megacells:crafting/unit', front: 'megacells:crafting/monitor', glow: { front: 'ae2:crafting/monitor_light_bright' } },

  qshell: { n: 'Quantum Structure', id: 'advanced_ae:quantum_structure', all: 'advanced_ae:crafting/quantum_structure' },
  qcore:  { n: 'Quantum Core', id: 'advanced_ae:quantum_core', all: 'advanced_ae:crafting/quantum_core', glow: true },
  qstore: { n: 'Quantum Storage 256M', id: 'advanced_ae:quantum_storage_256', all: 'advanced_ae:crafting/quantum_storage_256', glow: true, dim: 0.4 },
  qacc:   { n: 'Quantum Accelerator', id: 'advanced_ae:quantum_accelerator', all: 'advanced_ae:crafting/quantum_accelerator', glow: true, dim: 0.4 },
  qthr:   { n: 'Quantum Multi-Threader', id: 'advanced_ae:quantum_multi_threader', all: 'advanced_ae:crafting/quantum_multi_threader', glow: true, dim: 0.5 },
  qent:   { n: 'Data Entangler', id: 'advanced_ae:data_entangler', all: 'advanced_ae:crafting/data_entangler', glow: true, dim: 0.5 },

  masm:   { n: 'Molecular Assembler', id: 'ae2:molecular_assembler', all: 'ae2:molecular_assembler', glow: 'ae2:molecular_assembler_lights', cutout: true },
  expp:   { n: 'Extended Pattern Provider', id: 'extendedae:ex_pattern_provider', all: 'extendedae:ex_pattern_provider' },
  amfr:   { n: 'Assembler Matrix Frame', id: 'extendedae:assembler_matrix_frame', all: 'extendedae:assembler_matrix/frame_column_on', glow: true, dim: 0.35 },
  amgl:   { n: 'Assembler Matrix Glass', id: 'extendedae:assembler_matrix_glass', all: 'extendedae:assembler_matrix/glass/full', glass: true },
  amcr:   { n: 'Assembler Matrix Crafter', id: 'extendedae:assembler_matrix_crafter', all: 'extendedae:assembler_matrix/crafter_core', glow: true, dim: 0.4 },
  ampa:   { n: 'Assembler Matrix Pattern', id: 'extendedae:assembler_matrix_pattern', all: 'extendedae:assembler_matrix/pattern_core', glow: true, dim: 0.4 },
  amsp:   { n: 'Assembler Matrix Speed', id: 'extendedae:assembler_matrix_speed', all: 'extendedae:assembler_matrix/speed_core', glow: true, dim: 0.4 },

  insc:   { n: 'Extended Inscriber', id: 'extendedae:ex_inscriber', all: 'ae2:inscriber' },
  chg:    { n: 'Extended Charger', id: 'extendedae:ex_charger', side: 'extendedae:extended_charger/ex_charger_side', top: 'extendedae:extended_charger/ex_charger' },
  crya:   { n: 'Crystal Assembler', id: 'extendedae:crystal_assembler', side: 'extendedae:crystal_assembler/on', top: 'extendedae:crystal_assembler/top' },
  cut:    { n: 'Circuit Cutter', id: 'extendedae:circuit_cutter', all: 'extendedae:circuit_cutter/frame', front: 'extendedae:circuit_cutter/saw_on' },
  react:  { n: 'Reaction Chamber (AdvancedAE)', id: 'advanced_ae:reaction_chamber', side: 'advanced_ae:reaction_chamber_sides', top: 'advanced_ae:reaction_chamber_top', bottom: 'advanced_ae:reaction_chamber_bottom' },
  grow:   { n: 'Growth Accelerator', id: 'ae2:growth_accelerator', side: 'ae2:growth_accelerator_side_on', top: 'ae2:growth_accelerator_top_on', bottom: 'ae2:growth_accelerator_bottom' },
  budq:   { n: 'Flawless Budding Quartz', id: 'ae2:flawless_budding_quartz', all: 'ae2:flawless_budding_quartz' },
  bude:   { n: 'Budding Entro (ExtendedAE)', id: 'extendedae:entro_budding_fully', all: 'extendedae:entro_budding_fully' },

  // decoración (Chipped, Supplementaries, Simply Light, vanilla)
  cinl:   { n: 'Pizarra profunda con marco (Chipped)', id: 'chipped:smooth_inlayed_deepslate', all: 'chipped:deepslate/smooth_inlayed_deepslate' },
  cinsc:  { n: 'Pizarra profunda grabada (Chipped)', id: 'chipped:inscribed_deepslate', all: 'chipped:deepslate/inscribed_deepslate' },
  cpil:   { n: 'Pilar ornamentado de pizarra profunda (Chipped)', id: 'chipped:ornate_deepslate_pillar', all: 'chipped:deepslate/ornate_deepslate_pillar', top: 'chipped:deepslate/deepslate_pillar_top' },
  ctb:    { n: 'Baldosa con borde de pizarra profunda (Chipped)', id: 'chipped:tiled_bordered_deepslate', all: 'chipped:deepslate/tiled_bordered_deepslate' },
  cchk:   { n: 'Baldosas en damero de pizarra profunda (Chipped)', id: 'chipped:checkered_deepslate_tiles', all: 'chipped:deepslate/checkered_deepslate_tiles' },
  sealamp: { n: 'Farol marino con incrustación (Chipped, siempre encendido)', id: 'chipped:inlayed_sea_lantern', all: 'chipped:sea_lantern/inlayed_sea_lantern', glow: true, dim: 0.6 },
  blamp:  { n: 'Lámpara de piedra negra (Supplementaries)', id: 'supplementaries:blackstone_lamp', side: 'supplementaries:blackstone_lamp', top: 'supplementaries:blackstone_lamp_top', glow: true, dim: 0.7 },
  wlight: { n: 'Aplique de pared blanco (Simply Light)', id: 'simplylight:wall_lamp', model: 'simplylight:block/wall_lamp', glow: true, dim: 1.1 },
  sconce: { n: 'Candelabro de pared de almas (Supplementaries)', id: 'supplementaries:sconce_soul', model: 'supplementaries:block/sconce_wall_soul', glow: ['supplementaries:sconce_fire_soul'], dim: 1.2, yaw: 180 },
  slant:  { n: 'Farol de almas colgante', id: 'minecraft:soul_lantern', model: 'minecraft:block/soul_lantern_hanging', glow: true, dim: 0.9 },
  chain:  { n: 'Cadena', id: 'minecraft:chain', model: 'minecraft:block/chain' },
};
// terminales: parte AE2 = base de pantalla + capas de luz (teñidas por el color del cable) + LED de canal
const TERM_TINT = { 1: '#9a9ea8', 2: '#d4d7de', 3: '#f6f8ff' }; // cable blanco: oscuro, medio, claro
for (const [k, n, id, model] of [
  ['term_craft', 'ME Crafting Terminal', 'ae2:crafting_terminal', 'ae2:part/crafting_terminal_on'],
  ['term_enc', 'ME Pattern Encoding Terminal', 'ae2:pattern_encoding_terminal', 'ae2:part/pattern_encoding_terminal_on'],
  ['term_acc', 'ME Pattern Access Terminal', 'ae2:pattern_access_terminal', 'ae2:part/pattern_access_terminal_on'],
  ['term_exacc', 'ME Extended Pattern Access Terminal (ExtendedAE)', 'extendedae:ex_pattern_access_part', 'extendedae:part/ex_pattern_access_terminal_on'],
  ['term_expenc', 'Expanded Pattern Encoding Terminal (ExpandedAE)', 'expandedae:exp_encoding_terminal', 'expandedae:part/exp_encoding_terminal_on'],
  ['term_qcraft', 'Quantum Crafter Terminal (AdvancedAE)', 'advanced_ae:quantum_crafter_terminal', 'advanced_ae:part/quantum_crafter_terminal_on'],
  ['term_req', 'ME Requester Terminal (ME Requester)', 'merequester:requester_terminal', 'merequester:part/requester_terminal_on'],
]) P[k] = { n: n + ' · parte en el quiosco', id, model: ['ae2:part/display_base', model, 'ae2:part/display_status_has_channel'], tint: TERM_TINT, dim: 0.9, yaw: 180 };
for (const c of ['purple', 'white', 'light_gray', 'orange', 'cyan', 'green', 'red', 'blue', 'lime', 'yellow', 'pink', 'magenta', 'light_blue'])
  P['hub_' + c] = { n: `Wireless Connector (${c})`, id: 'extendedae:wireless_connect', all: `extendedae:wireless_connector/wireless_connect_${c}`, glow: true, dim: 0.5 };
P.qring = { n: 'Quantum Ring', id: 'ae2:quantum_ring', all: 'ae2:quantum_ring', glow: 'ae2:quantum_ring_light', dim: 0.6 };
P.qlink = { n: 'Quantum Link Chamber', id: 'ae2:quantum_link', all: 'ae2:quantum_link', glow: true, dim: 0.5 };
// Factorías Mekanism (Ultimate) alimentadas por Pattern Providers (Applied Mekanistics)
const MEK = ['enriching', 'crushing', 'purifying', 'injecting', 'infusing', 'compressing', 'combining', 'sawing', 'smelting'];
const MEK_ES = { enriching: 'Enriquecedora', crushing: 'Trituradora', purifying: 'Purificadora', injecting: 'Inyectora', infusing: 'Infusora', compressing: 'Compresora', combining: 'Combinadora', sawing: 'Aserradora', smelting: 'Fundidora' };
for (const t of MEK) {
  const b = `mekanism:factory/${t}/${t}_factory_`;
  P['mek_' + t] = { n: `Factoría ${MEK_ES[t]} Ultimate`, id: `mekanism:ultimate_${t}_factory`, front: b + 'front_active', side: b + 'side', top: b + 'top', bottom: b + 'bottom', back: t === 'smelting' ? b + 'side' : b + 'back' };
}

export const W = 43, H = 39, C = 21;
const blocks = new Map();
// o = { tag, top (escalera invertida), cable (cable denso con fachada de este bloque) }
const put = (x, y, z, t, f = 's', o = {}) => blocks.set(`${x},${y},${z}`, { x, y, z, t, f, ...o });
const box = (x0, y0, z0, x1, y1, z1, t, f, o) => {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) put(x, y, z, t, f, o);
};
// cable: 'c' = portador (cable denso AZUL que lleva los túneles P2P) · 'z' = zona (cable denso FLUIX tras una salida P2P)
// los colores distintos no se conectan entre sí: solo las piezas P2P unen portador y zona
// col: color del cable denso. Los de zona son blancos; cada portador tiene su color (colores distintos no se conectan)
const run = (x, y, z, t = 'pdeep', role = 'z', col = 'white') => put(x, y, z, t, 's', { cable: role, col });       // cable nuevo con fachada
const cab = (x, y, z, role = 'z', col = 'white') => { const b = blocks.get(`${x},${y},${z}`); if (b) Object.assign(b, { cable: role, col }); }; // el bloque existente pasa a ser fachada
const P2P = [];                                                    // { x,y,z (celda de cable), d:[dx,dy,dz] (cara), io:'in'|'out', zone }
const p2p = (x, y, z, d, io, zone) => P2P.push({ x, y, z, d, io, zone });
const dist = (x, z) => Math.max(Math.abs(x - C), Math.abs(z - C));
const DIRS = [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 's'], [0, -1, 'n']];

// ── 1. Revestimiento: paredes, suelo y techo ──────────────────────────────
for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) for (let z = 0; z < W; z++) {
  const wallX = x === 0 || x === W - 1, wallZ = z === 0 || z === W - 1;
  if (wallX || wallZ) {
    const u = wallX ? z : x;
    let t = 'pdeep';
    if (wallX && wallZ) t = 'cdeep';
    else if (y <= 2) t = 'bsb';
    else if (y === 12 || y === 25 || y === H - 1) t = 'skyb';
    else if (u % 12 === 9) t = 'lamp';          // tiras de luz verticales (Illuminant: luz sin redstone)
    else if (u % 6 === 3) t = 'cpil';           // pilastras ornamentadas (Chipped)
    else if (y >= 33) t = 'skys';               // friso alto
    else if (y === 3 || y === 13 || y === 26 || y === 32) t = 'cinsc'; // zócalos grabados sobre cada nivel
    else t = 'cinl';                            // paños con marco (Chipped)
    put(x, y, z, t);
  } else if (y === 0) {
    const d = dist(x, z);
    let t = ((x - C) % 6 === 0 && (z - C) % 6 === 0) ? 'sealamp' : ((x - C) % 6 === 0 || (z - C) % 6 === 0) ? 'pdeep' : 'dtiles'; // cruces de la retícula con luz
    if ((x === C || z === C || Math.abs(x - C) === Math.abs(z - C)) && d > 8 && d <= 14) { t = 'vibr'; put(x, -1, z, 'lamp'); } // 8 rayos: cristal vibrante con Illuminant debajo
    put(x, y, z, t);
  } else if (y === H - 1) {
    const d = dist(x, z);
    let t = (x === C || z === C || Math.abs(x - C) === Math.abs(z - C)) && d >= 6 ? 'lamp' : 'skysm';
    if (d <= 4) t = 'skys';
    if (d === 5) t = 'lamp';
    put(x, y, z, t);
  }
}
// Escalones de transición pared↔suelo y pared↔techo (las máquinas los sustituyen donde coinciden)
for (let x = 1; x <= 41; x++) for (let z = 1; z <= 41; z++) {
  const d = [x === 1 && 'e', x === 41 && 'w', z === 1 && 's', z === 41 && 'n'].find(Boolean);
  if (!d) continue;
  put(x, 1, z, 'bsb_st', d);
  put(x, H - 2, z, 'skysm_st', d, { top: true });
}

// ── 1b. Suelo vacío AE2: pozo circular de 15 Ø y 24 de hondo bajo cristal de cuarzo ──
const VOID_R2 = 7.5 ** 2, VOID_D = 24;
const inVoid = (x, z) => (x - C) ** 2 + (z - C) ** 2 <= VOID_R2;
for (let x = C - 9; x <= C + 9; x++) for (let z = C - 9; z <= C + 9; z++) {
  if (inVoid(x, z)) {
    put(x, 0, z, 'qglass');
    put(x, -VOID_D - 1, z, 'bconc');
    continue;
  }
  const nb = DIRS.filter(([dx, dz]) => inVoid(x + dx, z + dz));
  if (!nb.length) continue;
  put(x, 0, z, 'skyb'); // borde
  for (let y = -1; y >= -VOID_D; y--) {
    put(x, y, z, y % 6 === 0 ? 'skyb' : 'skysm');
    // End Rods clavadas en la pared apuntando al centro (la Quartz Fixture queda vertical, no sirve): dan la perspectiva "infinita"
    if (-y % 3 === 1 && (x + z) % 2 === 0) for (const [dx, dz, f] of nb) put(x + dx, y, z + dz, 'fix', f);
  }
}
// capas horizontales de cristal cada 3: cada una vela un poco más el fondo (efecto niebla)
export const PIT_GLASS = ['pg_gray', 'pg_lgray', 'pg_black', 'pg_tinted', 'pg_quartz'];
for (let y = -3; y >= -VOID_D; y -= 3) for (let x = C - 8; x <= C + 8; x++) for (let z = C - 8; z <= C + 8; z++)
  if (inVoid(x, z)) put(x, y, z, PIT_GLASS[0], 's', { tag: 'pitglass' });
// columna central: el tronco "sigue" hacia el fondo; tu ascensor queda encima
for (let y = -1; y >= -VOID_D; y--) put(C, y, C, y % 4 === 0 ? 'lamp' : 'pdeep');

// ── 2. Entreplantas (anillo perimetral) ───────────────────────────────────
function mezzanine(y, width) {
  const inRing = (x, z) => x >= 1 && x <= 41 && z >= 1 && z <= 41 && (x <= width || x >= 42 - width || z <= width || z >= 42 - width);
  for (let x = 1; x <= 41; x++) for (let z = 1; z <= 41; z++) {
    if (!inRing(x, z)) continue;
    const open = DIRS.find(([dx, dz]) => !inRing(x + dx, z + dz));
    put(x, y, z, open ? 'lamp' : 'dtiles');
    if (!open) continue;
    put(x, y + 1, z, (x + z) % 4 === 0 ? 'pdeep' : 'tinted'); // barandilla
    put(x, y - 1, z, 'pdeep_st', open[2], { top: true });   // escalón invertido bajo el borde
  }
}
mezzanine(12, 6);  // Nivel 2 (pasarela de 6)
mezzanine(25, 4);  // Nivel 3 (pasarela de 4, mantenimiento del techo)
// Ascensores (ElevatorID): 2 columnas simétricas en el centro de los lados oeste y este (x=3 y x=39, z=21).
// L1: pasillo, delante de la pilastra de luz (no de una máquina) · L2: las rutas de cable rodean la parada
// L3: dentro de la pasarela, mirando al puente cuántico · encima de cada parada, 2 de aire (se comprueba al final)
for (const x of [3, 39]) for (const y of [0, 12, 25]) put(x, y, C, 'elev');
put(C, 0, C, 'elev'); // tu ascensor central existente

// ── 3. Esquinas: racks de discos (L1 y L2) ────────────────────────────────
for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const yb of [1, 13]) {
  const X = a => (sx < 0 ? a : 42 - a), Z = b => (sz < 0 ? b : 42 - b);
  const cells = [];
  for (let i = 1; i <= 6; i++) cells.push([i, 7, sz < 0 ? 's' : 'n', i]);
  for (let i = 1; i <= 6; i++) cells.push([7, i, sx < 0 ? 'e' : 'w', i]);
  cells.push([7, 7, 's', 0]);
  for (const [a, b, f, i] of cells) {
    const x = X(a), z = Z(b);
    put(x, yb, z, 'bsb');
    for (let y = yb + 1; y <= yb + 8; y++) put(x, y, z, i === 0 ? 'cdeep' : i === 3 ? 'lamp' : i === 6 ? 'pdeep' : 'drive', f);
    put(x, yb + 9, z, 'skyb');
    put(x, yb + 10, z, 'skys');
  }
  // cable denso vertical detrás de cada columna de drives (hueco oculto de la esquina)
  for (const i of [1, 2, 4, 5]) for (let y = yb === 1 ? 2 : 13; y <= (yb === 1 ? 11 : 23); y++) {
    put(X(i), y, Z(6), 'dcable'); put(X(6), y, Z(i), 'dcable');
  }
  // el cable portador pasa por la losa justo encima de las columnas de L1 y debajo de las de L2. Las columnas van por parejas
  // pegadas (1-2 y 4-5 = 16 drives) y cada pareja tiene su salida P2P: un cable denso solo lleva 32 canales, y una bandeja
  // común para 6 columnas (48 drives) dejaba 16 sin canal. Las columnas son blancas: tocar el portador de color no las une.
  if (yb === 13) { // 8 salidas P2P por esquina (16 drives cada una), hacia abajo (L1) y hacia arriba (L2)
    const zone = 'rack_' + (sz < 0 ? 'N' : 'S') + (sx < 0 ? 'O' : 'E');
    for (const [x, z] of [[X(1), Z(6)], [X(4), Z(6)], [X(6), Z(1)], [X(6), Z(4)]]) for (const dy of [-1, 1]) p2p(x, 12, z, [0, dy, 0], 'out', zone);
  }
}
// Nivel 2 norte: puesto de gestión de celdas (IO Ports + Cell Workbenches) y, encima, la fila de ME Requesters (stock mínimo).
// ME Requester (mod ME Requester, en el pack): pide crafteos cuando un objeto baja de la cantidad que le pongas. Config del pack:
// 5 pedidos por bloque y 1 canal cada uno. Los que van sobre un Cell Workbench (que no es de la red) se unen por el Requester
// de al lado, que está sobre un IO Port: 4 tramos de 5 entre las tiras de luz. Se configuran todos desde el ME Requester Terminal.
const REQ_GUI = { title: 'ME Requester', settings: ['5 pedidos por bloque: objeto, <b>cantidad a mantener</b> y tamaño de lote.', 'Se configuran todos juntos desde el <b>ME Requester Terminal</b> de los quioscos (L1).', 'Si falta un ingrediente se queda en "Missing Ingredients" y sigue solo cuando lo hay.'] };
for (let x = 9; x <= 33; x++) {
  run(x, 13, 1, x % 6 === 3 ? 'pdeep' : 'bsb');                 // bus de zona bajo los IO Ports
  if (x % 6 === 3) { for (let y = 14; y <= 16; y++) put(x, y, 1, 'lamp'); continue; }
  put(x, 14, 1, x % 2 ? 'iop' : 'cwb', 's'); put(x, 15, 1, 'req', 's', { gui: REQ_GUI }); put(x, 16, 1, 'skyb');
}
p2p(C, 12, 1, [0, 1, 0], 'out', 'l2_norte');

// ── 4. Norte L1: Ordenador Cuántico 7x7x7 sobre pedestal ─────────────────
box(17, 1, 1, 25, 1, 9, 'bsb');
for (let x = 17; x <= 25; x++) for (let z = 1; z <= 9; z++) if (x === 17 || x === 25 || z === 9) put(x, 1, z, 'vibr');
for (let x = 18; x <= 24; x++) for (let y = 2; y <= 8; y++) for (let z = 2; z <= 8; z++) {
  const shell = x === 18 || x === 24 || y === 2 || y === 8 || z === 2 || z === 8;
  if (shell) { put(x, y, z, 'qshell', 's', { tag: 'shell' }); continue; }
  let t = (x + y + z) % 2 ? 'qacc' : 'qstore';
  if (x === 21 && y === 5 && z === 5) t = 'qcore';
  else if (y === 5 && (x === 19 || x === 23) && z === 5) t = 'qthr';
  else if (x === 21 && y === 7 && z === 5) t = 'qent';
  put(x, y, z, t);
}
// Norte L1: 4 CPUs MEGA 3x3x3 flanqueando el cuántico
for (const x0 of [9, 13, 27, 31]) {
  box(x0 - 1, 1, 1, x0 + 3, 1, 4, 'bsb');
  for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 3; dy++) for (let dz = 0; dz < 3; dz++) {
    const n = (dx !== 1) + (dy !== 1) + (dz !== 1); // 3 = esquina, 2 = arista, 1 = centro de cara
    let t = n === 3 ? 'cu' : n === 2 ? 'cacc' : 'cstore';
    if (dx === 1 && dy === 1 && dz === 2) t = 'cmon';
    put(x0 + dx, 2 + dy, 1 + dz, t, 's');
  }
  for (let y = 5; y <= 11; y++) run(x0 + 1, y, 1);   // bajante desde el bus de la losa
}
for (let y = 2; y <= 11; y++) run(C, y, 1);          // bajante del ordenador cuántico
for (let x = 10; x <= 32; x++) run(x, 11, 1);        // bus de zona bajo la losa que une cuántico y CPUs
p2p(C, 12, 1, [0, -1, 0], 'out', 'l1_norte');

// ── 5. Sur L1: Assembler Matrix 7x7x7 + 2 árboles de crafteo ─────────────
for (let x = 18; x <= 24; x++) for (let y = 1; y <= 7; y++) for (let z = 35; z <= 41; z++) {
  const e = (x === 18 || x === 24) + (y === 1 || y === 7) + (z === 35 || z === 41);
  if (e >= 2) put(x, y, z, 'amfr');
  else if (e === 1) put(x, y, z, 'amgl');
  else put(x, y, z, z === 40 ? 'ampa' : (x + y) % 3 === 0 ? 'amsp' : 'amcr');
}
for (const tx of [11, 31]) {
  const tz = 38;
  box(tx - 1, 1, tz - 1, tx + 1, 2, tz + 1, 'cdeep');
  put(tx, 2, tz, 'sealamp');                      // pedestal de 2 con luz bajo el tronco
  // tronco de 8: los proveedores pegados se conectan entre sí, pero un bloque normal solo pasa 8 canales
  // (GridNode.getMaxChannels) y el de arriba lleva los de todos los de debajo. Con 9, el último se quedaba sin canal.
  for (let y = 3; y <= 10; y++) {
    put(tx, y, tz, 'expp');                       // tronco: pattern providers
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(tx + dx, y, tz + dz, 'masm'); // ramas
  }
  for (let z = tz; z <= 40; z++) run(tx, 11, z);     // ramal hasta el bus sur
}
for (let y = 8; y <= 10; y++) run(C, y, 41);         // bajante de la Assembler Matrix
for (let x = 11; x <= 31; x++) run(x, 11, 41);       // bus de zona bajo la losa (árboles + matrix)
p2p(C, 12, 41, [0, -1, 0], 'out', 'l1_sur');

// ── 6. Este L1: línea de procesado AE2 ───────────────────────────────────
const line = (xm, xp, f, pick) => {
  for (let z = 9; z <= 33; z++) {
    put(xm, 1, z, 'bsb'); put(xp, 1, z, 'bsb');
    if (z % 6 === 3) { for (let y = 2; y <= 4; y++) { put(xm, y, z, 'lamp'); put(xp, y, z, 'pdeep'); } continue; }
    const [a, b, prov] = pick(z);
    put(xm, 2, z, a, f); put(xm, 3, z, b, f);
    put(xp, 2, z, prov ? 'expp' : 'grow'); put(xp, 3, z, prov ? 'expp' : 'grow');
    put(xm, 4, z, 'skyb'); put(xp, 4, z, 'skyb');
  }
  // bus encima de los providers + bajantes en las pilastras hasta la losa L2
  for (let z = 9; z <= 33; z++) {
    cab(xp, 4, z);
    if (z % 6 === 3) for (let y = 5; y <= 11; y++) run(xp, y, z);
  }
};
p2p(41, 12, 21, [0, -1, 0], 'out', 'l1_este');
line(40, 41, 'w', z => {
  if (z <= 14) return ['insc', 'insc', 1];
  if (z <= 20) return z % 2 ? ['crya', 'crya', 1] : ['chg', 'chg', 1];
  if (z <= 26) return z % 2 ? ['cut', 'cut', 1] : ['react', 'react', 1];
  return z % 2 ? ['grow', 'budq', 0] : ['grow', 'bude', 0];
});
// ── 7. Oeste L1: factorías Mekanism vía AE2 ──────────────────────────────
let mi = 0;
p2p(1, 12, 9, [0, -1, 0], 'out', 'l1_oeste'); p2p(1, 12, 33, [0, -1, 0], 'out', 'l1_oeste');
line(2, 1, 'e', () => { const t = 'mek_' + MEK[mi++ % MEK.length]; return [t, t, 1]; });

// ── 8. Nivel 2: banco de energía (E/O) e interfaces (S) ──────────────────
for (const x of [1, 41]) for (let z = 9; z <= 33; z++) { // celdas subidas un bloque: si tocaran el portador de la losa irían a la subred
  run(x, 13, z, z % 6 === 3 ? 'pdeep' : 'bsb');                 // bus de zona bajo las celdas
  if (z % 6 === 3) { for (let y = 14; y <= 17; y++) put(x, y, z, 'lamp'); continue; }
  for (let y = 14; y <= 16; y++) put(x, y, z, 'emcell');
  put(x, 17, z, 'skyb');
}
cab(1, 12, 21); cab(41, 12, 27); // cada banco se une a su línea de L1 por una bajante (las celdas no gastan canales: sin P2P)
for (let x = 9; x <= 33; x++) { // interfaces subidas un bloque: debajo va su bus de zona (así no tocan el portador)
  run(x, 13, 41, x % 6 === 3 ? 'pdeep' : 'bsb');
  if (x % 6 === 3) { for (let y = 14; y <= 17; y++) put(x, y, 41, 'lamp'); continue; }
  for (let y = 14; y <= 16; y++) put(x, y, 41, 'exif', 'n');
  put(x, 17, 41, 'skyb');
}
p2p(15, 12, 41, [0, 1, 0], 'out', 'l2_sur'); p2p(27, 12, 41, [0, 1, 0], 'out', 'l2_sur');

// ── 9. Techo: tu controlador (invertido, colgando) ───────────────────────
// de arriba abajo: placa de anclaje · 3x3 de Wireless Connectors encima · controlador 3x3x3 con un collar de 12 conectores en su fila superior · tronco
// Regla de AE2 (InWorldGridNode.hasCompatibleColor): dos bloques pegados solo se unen si uno no tiene color o los dos tienen el mismo.
// El controlador no tiene color: cada conector que lo TOCA se une, sea del color que sea. Un conector pegado solo a otro conector
// de distinto color queda aislado (y aunque sea del mismo color, comparte los 32 canales del primero). Por eso todos lo tocan.
const HUB = ['purple', 'white', 'light_gray', 'orange', 'cyan', 'green', 'red', 'blue', 'lime', 'yellow', 'pink', 'magenta', 'light_blue'];
let hi = 0;
for (let x = C - 3; x <= C + 3; x++) for (let z = C - 3; z <= C + 3; z++) {
  const dx = Math.abs(x - C), dz = Math.abs(z - C), d = Math.max(dx, dz);
  if (d <= 1) put(x, 36, z, 'hub_' + HUB[hi++ % HUB.length]);                        // cara superior del controlador
  if (d === 2 && Math.min(dx, dz) <= 1) put(x, 35, z, 'hub_' + HUB[hi++ % HUB.length]); // collar: caras laterales, fila superior
  if (d <= 2) put(x, 37, z, 'skys');                                                // anclaje al techo
  if (d === 3) put(x, 37, z, 'skys_st', dx === 3 ? (x > C ? 'e' : 'w') : (z > C ? 's' : 'n'), { top: true }); // cornisa escalonada
}
box(C - 1, 33, C - 1, C + 1, 35, C + 1, 'ctrl');
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const touches = (b, t) => N6.some(([dx, dy, dz]) => blocks.get(`${b.x + dx},${b.y + dy},${b.z + dz}`)?.t === t);
for (const b of blocks.values()) if (b.t.startsWith('hub_') && !touches(b, 'ctrl')) throw new Error(`El Wireless Connector de ${b.x},${b.y},${b.z} no toca el controlador`);

// ── 10. Del controlador salen 9 cables densos de colores (uno por cara inferior) ──
// cada uno = 32 canales = hasta 32 salidas P2P (las ENTRADAS van en el cubo grande, como en el ME Core de la guía de ATM).
// el tronco 3x3 son esos 9 cables, forrados con fachadas; bajan hasta el nivel 2 y salen por 4 puentes transitables
const LANES = [ // color, celda del tronco (dx,dz), puente, desvío lateral, zonas que alimenta, ruta por la losa (puntos x,z)
  { col: 'magenta', tx: 1, tz: 0, br: 'E', off: 0, zones: ['l1_este'], route: [[[36, 21], [38, 21], [38, 19], [41, 19], [41, 21]]] },
  { col: 'orange', tx: 1, tz: -1, br: 'E', off: -1, zones: ['rack_NE'], route: [[[36, 20], [37, 20], [37, 6], [41, 6]], [[37, 6], [36, 6], [36, 1]]] },
  { col: 'light_blue', tx: 1, tz: 1, br: 'E', off: 1, zones: ['rack_SE'], route: [[[36, 22], [37, 22], [37, 36], [41, 36]], [[37, 36], [36, 36], [36, 41]]] },
  { col: 'lime', tx: -1, tz: 0, br: 'W', off: 0, zones: ['l1_oeste'], route: [[[6, 21], [4, 21], [4, 19], [1, 19], [1, 9]], [[4, 21], [4, 23], [1, 23], [1, 33]]] },
  { col: 'yellow', tx: -1, tz: -1, br: 'W', off: -1, zones: ['rack_NO'], route: [[[6, 20], [5, 20], [5, 6], [1, 6]], [[5, 6], [6, 6], [6, 1]]] },
  { col: 'pink', tx: -1, tz: 1, br: 'W', off: 1, zones: ['rack_SO'], route: [[[6, 22], [5, 22], [5, 36], [1, 36]], [[5, 36], [6, 36], [6, 41]]] },
  { col: 'cyan', tx: 0, tz: -1, br: 'N', off: 0, zones: ['l1_norte', 'l2_norte'], route: [[[21, 6], [21, 1]]] },
  { col: 'purple', tx: 0, tz: 1, br: 'S', off: 0, zones: ['l1_sur', 'l2_sur', 'quantum'], route: [[[21, 36], [21, 41]], [[21, 41], [15, 41]], [[21, 41], [27, 41]]] },
  { col: 'blue', tx: 0, tz: 0, zones: [], route: [] }, // centro del tronco: baja hasta la punta (hub de los quioscos); nada a la vista
];
const BR = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };
for (const L of LANES) {
  for (let y = 12; y <= 32; y++) {
    const ring = y % 6 === 2 || y === 32, corner = L.tx && L.tz, center = !L.tx && !L.tz;
    run(C + L.tx, y, C + L.tz, center ? 'pdeep' : ring ? 'cdeep' : corner ? 'pdeep' : 'vibr', 'c', L.col);
  }
  if (!L.br) continue;
  const [ux, uz] = BR[L.br], [px, pz] = [uz ? 1 : 0, ux ? 1 : 0];
  for (let k = 2; k <= 14; k++) run(C + ux * k + px * L.off, 12, C + uz * k + pz * L.off, L.off ? 'pdeep' : 'skys', 'c', L.col); // puente
}
// puentes: N/S llevan 1 cable en el centro y bordes decorativos; barandillas de cristal tintado en los bordes de los 4
for (const [br, [ux, uz]] of Object.entries(BR)) {
  const [px, pz] = [uz ? 1 : 0, ux ? 1 : 0];
  for (let k = 2; k <= 14; k++) for (const o of [-1, 1]) {
    const x = C + ux * k + px * o, z = C + uz * k + pz * o;
    if (br === 'N' || br === 'S') put(x, 12, z, 'pdeep');
    put(x, 13, z, k % 4 === 0 ? 'pdeep' : 'tinted');
  }
  blocks.delete(`${C + ux * 15},13,${C + uz * 15}`); // hueco en la barandilla de la pasarela para entrar al puente
}
// rutas por la losa L2 (tramos rectos); el visor falla si pisan otra ruta, un ascensor o un cable de zona
const routeCells = {};
for (const L of LANES) for (const seg of L.route) for (let i = 1; i < seg.length; i++) {
  const [[x0, z0], [x1, z1]] = [seg[i - 1], seg[i]];
  if (x0 !== x1 && z0 !== z1) throw new Error(`Tramo no recto en ${L.col}`);
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
    const b = blocks.get(`${x},12,${z}`), k = `${x},${z}`;
    if (!b || b.t === 'elev' || b.cable === 'z' || (routeCells[k] && routeCells[k] !== L.col)) throw new Error(`Ruta ${L.col} choca en ${x},12,${z}`);
    routeCells[k] = L.col;
    Object.assign(b, { cable: 'c', col: L.col, t: b.t === 'lamp' ? 'pdeep' : b.t }); // en el borde, la fachada de luz no ilumina: pizarra
  }
}
// quantum bridges (túneles cuánticos): 4 anillos 3x3 verticales en la pasarela L3, contra el centro de cada pared
for (const [ax, az, nx, nz] of [[1, C, 0, 1], [41, C, 0, 1], [C, 1, 1, 0], [C, 41, 1, 0]])
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) put(ax + nx * i, 27 + j, az + nz * i, !i && !j ? 'qlink' : 'qring', 's', { tag: 'quantum' });
// cable azul (centro del tronco): solo baja 1 bloque, justo encima del Wireless Hub de los quioscos (ver 10a).
// Antes cruzaba bajo el puente sur hasta la pared para llevar los puentes cuánticos y rompía la simetría: ahora los
// alimenta el cable morado, que ya sube por dentro de la pared sur (ver 10′), con su propia salida P2P al bus de L3.
run(C, 11, C, 'skys', 'c', 'blue');
for (let x = 1; x <= 41; x++) for (let z = 1; z <= 41; z++) if (x === 1 || x === 41 || z === 1 || z === 41) cab(x, 25, z); // bus blanco perimetral de L3: toca los 4 anillos

// ── 10′. Hornos en L3: galería de Unobtainium Furnaces (Iron Furnaces) en las paredes norte y sur, a los lados del puente cuántico ──
// proveedor abajo (pegado al bus perimetral de L3) y horno encima: el proveedor empuja hacia arriba, a la cara inferior del horno.
// En el horno: aumento Factory (funciona con FE, sin combustible) y cara de abajo en Input/Output + Auto Output → el resultado vuelve al proveedor.
P.furn = { n: 'Horno de Unobtainium (Iron Furnaces) · aumento Factory', id: 'ironfurnaces:unobtainium_furnace', front: 'ironfurnaces:unobtainium_furnace_front_on', side: 'ironfurnaces:unobtainium_furnace_side', top: 'ironfurnaces:unobtainium_furnace_side', glow: { front: 'ironfurnaces:unobtainium_furnace_front_on' }, dim: 0.5 };
const GALLERY = [10, 11, 12, 13, 14, 16, 17, 18, 19, 23, 24, 25, 26, 28, 29, 30, 31, 32]; // simétrica; huecos en las pilastras (x=15, 27) y el puente (20-22)
for (const [z, f] of [[1, 's'], [41, 'n']]) for (const x of GALLERY) {
  put(x, 26, z, 'expp'); put(x, 27, z, 'furn', f); put(x, 28, z, 'skysm');
}
// alimentación: el cable cian (norte) y el morado (sur) suben por dentro de la pilastra x=15 de la pared y dan 1 salida P2P al bus de L3
for (let x = 16; x <= 21; x++) run(x, 12, 0, blocks.get(`${x},12,0`).t, 'c', 'cyan'); // del final del cable cian, por dentro de la pared
for (const [z, col] of [[0, 'cyan'], [42, 'purple']]) for (let y = 12; y <= 25; y++) run(15, y, z, blocks.get(`15,${y},${z}`).t, 'c', col);
p2p(15, 25, 0, [0, 0, 1], 'out', 'hornos_n'); p2p(15, 25, 42, [0, 0, -1], 'out', 'hornos_s');
run(16, 25, 42, blocks.get('16,25,42').t, 'c', 'purple'); p2p(16, 25, 42, [0, 0, -1], 'out', 'quantum'); // puentes cuánticos, dentro de la pared
LANES.find(L => L.col === 'cyan').zones.push('hornos_n'); LANES.find(L => L.col === 'purple').zones.push('hornos_s');
// la subred (controlador del techo) necesita energía: 1 Quartz Fiber entre el portador lima y el bus del banco de energía oeste
export const FIBER = [{ x: 1, y: 12, z: 12, d: [0, 1, 0] }];

// ── 10a. Terminales en L1: 4 quioscos simétricos en las diagonales, al borde del suelo de cristal ──
// a ~8 bloques del ascensor central; las pantallas miran al centro. Sin cables por el suelo ni bajo él:
// la punta del tronco (encima del ascensor central) es un Wireless Hub de ExtendedAE alimentado por 1 salida P2P
// del cable azul, y cada quiosco lleva en su remate un Wireless Connector enlazado al hub (hasta 8 puertos).
P.whub = { n: 'Wireless Hub (ExtendedAE) · enlaza los 4 quioscos', id: 'extendedae:wireless_hub', all: 'extendedae:wireless_hub/wireless_hub_white', glow: true, dim: 0.7 };
P.wconn.n = 'Wireless Connector (ExtendedAE) · enlazado al hub del tronco';
put(C, 10, C, 'whub');
p2p(C, 11, C, [0, -1, 0], 'out', 'term');
export const TERMS = [];
const KIOSKS = [ // [signo x, signo z, 4 terminales]; el Crafting Terminal sustituye al básico (uno en cada quiosco)
  [-1, -1, ['term_craft', 'term_qcraft', 'term_acc', 'term_req']],
  [1, -1, ['term_craft', 'term_enc', 'term_exacc', 'term_req']],
  [1, 1, ['term_craft', 'term_expenc', 'term_exacc', 'term_acc']],
  [-1, 1, ['term_craft', 'term_enc', 'term_expenc', 'term_exacc']],
];
for (const [sx, sz, list] of KIOSKS) {
  const X = a => C + sx * a, Z = b => C + sz * b, fx = sx > 0 ? 'w' : 'e', fz = sz > 0 ? 'n' : 's';
  for (const a of [6, 7]) for (const b of [6, 7]) {           // quiosco 2x2: zócalo, fila de cable blanco forrado con fachadas, remate
    put(X(a), 1, Z(b), 'cinsc'); run(X(a), 2, Z(b), 'skyb');
    put(X(a), 3, Z(b), a === 7 && b === 7 ? 'wconn' : 'skys'); // el conector inalámbrico toca el cable de debajo
  }
  [[6, 7, fx], [6, 6, fx], [6, 6, fz], [7, 6, fz]].forEach(([a, b, f], i) => TERMS.push({ x: X(a), y: 2, z: Z(b), t: list[i], f, zone: 'term' }));
}
LANES.find(L => L.col === 'blue').zones.push('term');

// ── 10b. Anillos de luz en cono alrededor del tronco (se estrechan hacia el pozo) ──
for (const [y, r] of [[30, 7], [24, 5.5], [18, 4]]) {
  for (let x = C - 8; x <= C + 8; x++) for (let z = C - 8; z <= C + 8; z++) {
    const e = Math.hypot(x - C, z - C);
    if (Math.abs(e - r) <= 0.5) put(x, y, z, 'lamp');
  }
  for (const [dx, dz] of DIRS) for (let k = 2; k < Math.round(r) - 0; k++) put(C + dx * k, y, C + dz * k, 'skys'); // radios
}

// ── 10c. Decoración: solo ocupa celdas vacías (no toca máquinas, cables ni rutas) ──
const empty = (x, y, z) => !blocks.has(`${x},${y},${z}`);
const deco = (x, y, z, t, f = 's') => empty(x, y, z) && (put(x, y, z, t, f), true);
// suelo: anillo en damero alrededor del pozo, lámparas de piedra negra donde los 4 rayos de los ejes tocan el borde
for (let x = C - 11; x <= C + 11; x++) for (let z = C - 11; z <= C + 11; z++) {
  const r2 = (x - C) ** 2 + (z - C) ** 2, b = blocks.get(`${x},0,${z}`);
  if (r2 > 8.5 ** 2 && r2 <= 10.5 ** 2 && (b?.t === 'dtiles' || b?.t === 'pdeep') && !b.cable) b.t = 'cchk';
}
for (const [dx, dz] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) {
  const b = blocks.get(`${C + dx},0,${C + dz}`); if (b?.t !== 'skyb') throw new Error(`Borde del pozo inesperado en ${dx},${dz}`);
  b.t = 'blamp';
}
// pasarelas: baldosa con borde
for (const b of blocks.values()) if ((b.y === 12 || b.y === 25) && b.t === 'dtiles' && !b.cable) b.t = 'ctb';
// apliques en las pilastras: Simply Light en L1 (Y=8) y L2 (Y=20), candelabros de almas en la pasarela L3 (Y=27)
const INWARD = [[0, 1, 'e'], [42, 41, 'w']];
for (let u = 3; u <= 39; u += 12) for (const [y, t] of [[8, 'wlight'], [20, 'wlight'], [27, 'sconce']]) {
  for (const [, inner, f] of INWARD) { deco(inner, y, u, t, f); deco(u, y, inner, t, f === 'e' ? 's' : 'n'); }
}
// faroles de almas colgando con cadena bajo el borde de las pasarelas (cada 4 bloques, lejos de los puentes)
for (const [w, yEdge] of [[6, 12], [4, 25]]) {
  const lo = w, hi = 42 - w;
  for (let i = lo + 2; i <= hi - 2; i += 4) {
    if (Math.abs(i - C) <= 2) continue;
    for (const [x, z] of [[i, lo], [i, hi], [lo, i], [hi, i]])
      if (empty(x, yEdge - 2, z) && empty(x, yEdge - 3, z) && blocks.has(`${x},${yEdge - 1},${z}`)) { put(x, yEdge - 2, z, 'chain'); put(x, yEdge - 3, z, 'slant'); }
  }
}
// techo: 8 faroles con cadena larga entre los rayos de luz, alrededor del controlador
for (const [dx, dz] of [[10, 4], [4, 10], [-4, 10], [-10, 4], [-10, -4], [-4, -10], [4, -10], [10, -4]]) {
  for (let y = 34; y <= 37; y++) if (!deco(C + dx, y, C + dz, 'chain')) throw new Error(`Cadena del techo choca en ${dx},${y},${dz}`);
  deco(C + dx, 33, C + dz, 'slant');
}

for (const e of [...blocks.values()].filter(b => b.t === 'elev')) {
  if (!empty(e.x, e.y + 1, e.z) || !empty(e.x, e.y + 2, e.z)) throw new Error(`El ascensor de ${e.x},${e.y},${e.z} no tiene 2 bloques de aire encima`);
  if (e.x === C && e.z === C) continue;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const b = blocks.get(`${e.x + dx},${e.y},${e.z + dz}`);
    if (b && !b.cable && ['dtiles', 'ctb', 'pdeep'].includes(b.t)) b.t = 'cchk';
  }
}

// ── 10c. Pantallas en tiempo real (CC: Tweaked + Advanced Peripherals: NO vienen en el pack, hay que añadirlos) ──
// 2 grandes pantallas de 7 × 6 Advanced Monitors encima de los bancos de energía (E: almacén · O: fabricación), cada una con su
// Advanced Computer, su ME Bridge (1 canal, se une a la red por la MEGA Energy Cell de debajo) y un Wireless Modem.
// Y en el pilar de la esquina de cada sector de discos, una pantalla de 1 × 2 con su ordenador y su modem: recibe por rednet
// el % de su sector, que calcula la pantalla del almacén con getDrives() (bytes usados y totales de cada ME Drive con su posición).
// Programas: cc/pantalla_ae2.lua y cc/sector_ae2.lua.
const APROX = ' · textura aproximada en el visor';
Object.assign(P, {
  req: { n: 'ME Requester · stock mínimo (5 pedidos)', id: 'merequester:requester', model: 'merequester:block/requester', yaw: 180 },
  mon: { n: 'Advanced Monitor (CC: Tweaked)' + APROX, id: 'computercraft:monitor_advanced', side: 'minecraft:gold_block', front: 'minecraft:black_concrete' },
  cpc: { n: 'Advanced Computer (CC: Tweaked)' + APROX, id: 'computercraft:computer_advanced', side: 'minecraft:gold_block', front: 'minecraft:black_concrete' },
  mebr: { n: 'ME Bridge (Advanced Peripherals)' + APROX, id: 'advancedperipherals:me_bridge', all: 'ae2:interface' },
  wmod: { n: 'Wireless Modem (CC: Tweaked)' + APROX, id: 'computercraft:wireless_modem_normal', all: 'minecraft:smooth_stone', shape: 'modem' },
});
export const SCREENS = [];
export const INFO = `
<p><b>Stock mínimo</b>: fila de 20 <b>ME Requesters</b> en el puesto de gestión de L2 norte (100 pedidos: objeto + cantidad a mantener). Se configuran desde el ME Requester Terminal de los quioscos.</p>
<p><b>Pantallas en tiempo real</b> (CC: Tweaked + Advanced Peripherals, <b>hay que añadir los 2 mods</b> a la instancia, versión 1.21.1 NeoForge):</p>
<ol>
<li><b>Almacén</b> (pared este, sobre el banco de energía): % de objetos, fluidos y energía, % de cada sector de discos y top 50 objetos.</li>
<li><b>Fabricación</b> (pared oeste): cada CPU, libre o qué fabrica, cuánto y su progreso, y la producción y el consumo por minuto de cada objeto.</li>
<li><b>Sectores de discos</b>: en el pilar de la esquina de cada rack (8), una pantalla con el % lleno de ese sector.</li>
</ol>
<p>Programas en la carpeta <b>visor/cc</b>: arrastra el archivo a la ventana de cada ordenador, guárdalo como <b>startup.lua</b> y usa <b>set</b> para decirle qué es (pasa el ratón por cada ordenador o monitor para ver el comando exacto). Lo que se ve en el visor son datos de ejemplo.</p>`;
const SET = {
  almacen: ['Muestra: % de objetos, fluidos y energía; % de cada sector de discos; top 50 objetos.', 'Programa <b>cc/pantalla_ae2.lua</b> como startup.lua y, en este ordenador: <b>set ae2.modo almacen</b> y <b>set ae2.centro X,Y,Z</b> (el ascensor central, con F3).', 'Envía el % de cada sector por rednet a las pantallas de los racks.'],
  fabricacion: ['Muestra: cada CPU de crafteo, si está libre o qué fabrica, cuánto y su progreso; lo que más sube y más baja en el último minuto (producción y consumo por minuto); energía de la red.', 'Programa <b>cc/pantalla_ae2.lua</b> como startup.lua y, en este ordenador: <b>set ae2.modo fabricacion</b>.'],
};
const bigScreen = (x, f, kind, title) => {
  for (let y = 18; y <= 23; y++) for (let z = 18; z <= 24; z++) {
    if (blocks.get(`${x},${y},${z}`)) throw new Error(`La gran pantalla choca en ${x},${y},${z}`);
    put(x, y, z, 'mon', f, { gui: { title: `Gran pantalla · ${title}`, settings: SET[kind] } });
  }
  const below = blocks.get(`${x},16,20`);
  if (below?.t !== 'emcell') throw new Error('El ME Bridge tiene que ir encima de una MEGA Energy Cell para unirse a la red');
  put(x, 17, 20, 'mebr', f, { gui: { title: 'ME Bridge', settings: ['Une el ordenador con la red AE2 (gasta 1 canal).', 'Va encima de la MEGA Energy Cell: por ella llega a la red.'] } });
  put(x, 17, 21, 'cpc', f, { gui: { title: `Advanced Computer · ${title}`, settings: SET[kind] } });
  put(x, 17, 22, 'wmod', 's', { boxes: [[.75, .75, .25, 0, 0, -.375]], bkey: 'n', gui: { title: 'Wireless Modem', settings: ['Pegado al ordenador.', kind === 'almacen' ? 'Emite el % de cada sector a las pantallas de los racks.' : 'Libre (por si quieres enviar datos a otra pantalla).'] } });
  SCREENS.push({ kind, title, x, y0: 18, z0: 18, w: 7, h: 6, f });
};
bigScreen(41, 'w', 'almacen', 'ALMACÉN');
bigScreen(1, 'e', 'fabricacion', 'FABRICACIÓN');
for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const yb of [1, 13]) {
  const x = sx < 0 ? 7 : 35, z = sz < 0 ? 7 : 35, f = sz < 0 ? 's' : 'n', sector = `L${yb === 1 ? 1 : 2} ${sz < 0 ? 'N' : 'S'}${sx < 0 ? 'O' : 'E'}`;
  for (let y = yb + 1; y <= yb + 4; y++) if (blocks.get(`${x},${y},${z}`)?.t !== 'cdeep') throw new Error(`El pilar del rack no está donde se esperaba en ${x},${y},${z}`);
  const g = { title: `Pantalla de sector · ${sector}`, settings: [`Muestra el % lleno de los ME Drives de este sector (${sector}).`, `Programa <b>cc/sector_ae2.lua</b> como startup.lua y <b>set ae2.sector "${sector}"</b>.`, 'Recibe los datos por rednet de la gran pantalla del almacén.'] };
  put(x, yb + 1, z, 'wmod', 's', { boxes: [[.75, .25, .75, 0, .375, 0]], bkey: 'u', gui: { title: 'Wireless Modem', settings: ['Pegado debajo del ordenador del sector.'] } });
  put(x, yb + 2, z, 'cpc', f, { gui: g });
  put(x, yb + 3, z, 'mon', f, { gui: g }); put(x, yb + 4, z, 'mon', f, { gui: g });
  SCREENS.push({ kind: 'sector', title: sector, x, y0: yb + 3, z0: z, w: 1, h: 2, f });
}

// ── 11. Plan de canales: cada zona, sus canales y sus salidas P2P (32 canales cada una) ──
const B = () => [...blocks.values()];
const inCorner = (b, sx, sz) => (sx < 0 ? b.x <= 7 : b.x >= 35) && (sz < 0 ? b.z <= 7 : b.z >= 35);
const CH = {
  ...Object.fromEntries([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => ['rack_' + (sz < 0 ? 'N' : 'S') + (sx < 0 ? 'O' : 'E'),
    { n: `Racks esquina ${sz < 0 ? 'N' : 'S'}${sx < 0 ? 'O' : 'E'} (L1+L2)`, ch: B().filter(b => b.t === 'drive' && inCorner(b, sx, sz)).length }])),
  l1_este: { n: 'Procesado AE2 (este) + ME Bridge', ch: B().filter(b => (b.t === 'expp' || b.t === 'mebr') && b.x === 41).length },
  l1_oeste: { n: 'Mekanism (oeste) + ME Bridge', ch: B().filter(b => (b.t === 'expp' || b.t === 'mebr') && b.x === 1).length },
  l1_norte: { n: 'Ordenador cuántico + 4 CPUs', ch: 1 + 4 },                       // cada multibloque usa 1 canal
  l1_sur: { n: 'Árboles + Assembler Matrix', ch: 1 + B().filter(b => b.t === 'expp' && b.z === 38).length },
  l2_norte: { n: 'IO Ports + ME Requesters (L2 norte)', ch: B().filter(b => b.t === 'iop' || b.t === 'req').length },
  l2_sur: { n: 'Interfaces (L2 sur)', ch: B().filter(b => b.t === 'exif').length },
  quantum: { n: 'Puentes cuánticos (L3)', ch: 4 },
  term: { n: 'Terminales (4 quioscos L1)', ch: TERMS.length },
  hornos_n: { n: 'Hornos L3 norte', ch: B().filter(b => b.t === 'expp' && b.y === 26 && b.z === 1).length },
  hornos_s: { n: 'Hornos L3 sur', ch: B().filter(b => b.t === 'expp' && b.y === 26 && b.z === 41).length },
};
// comprobaciones: si el plan no cuadra, el visor falla en vez de enseñar un diseño que no funcionaría
for (const [id, zz] of Object.entries(CH)) {
  zz.outs = P2P.filter(p => p.zone === id).length;
  if (zz.ch > zz.outs * 32) throw new Error(`Zona ${id}: ${zz.ch} canales con solo ${zz.outs} salidas P2P`);
}
const cellOf = (x, y, z) => blocks.get(`${x},${y},${z}`);
for (const p of P2P) {
  const own = cellOf(p.x, p.y, p.z), other = cellOf(p.x + p.d[0], p.y + p.d[1], p.z + p.d[2]);
  if (own?.cable !== 'c') throw new Error(`P2P en ${p.x},${p.y},${p.z} no está en un cable portador`);
  const lane = LANES.find(L => L.zones.includes(p.zone));
  if (own.col !== lane.col) throw new Error(`P2P de ${p.zone} en ${p.x},${p.y},${p.z} está en el cable ${own.col} y no en el ${lane.col}`);
  p.col = own.col;
  const ok = p.io === 'in' ? other?.t === 'ctrl' : other?.cable === 'z' || other?.t === 'dcable' || other?.t === 'whub';
  if (!ok) throw new Error(`P2P ${p.io} en ${p.x},${p.y},${p.z} no apunta a ${p.io === 'in' ? 'el controlador' : 'un cable de zona'}`);
}
for (const f of FIBER) if (cellOf(f.x, f.y, f.z)?.cable !== 'c' || cellOf(f.x + f.d[0], f.y + f.d[1], f.z + f.d[2])?.cable !== 'z') throw new Error(`Quartz Fiber en ${f.x},${f.y},${f.z} no une un portador con un cable de zona`);
for (const b of blocks.values()) if (/redstone_lamp/.test(P[b.t].id)) throw new Error(`${P[b.t].n} en ${b.x},${b.y},${b.z} necesita señal de redstone`); // toda la luz va sin redstone
const nIn = P2P.filter(p => p.io === 'in').length, nOut = P2P.length - nIn;
// un cable denso = 32 canales; cada salida P2P conectada a él ocupa 1
const CARRIERS = LANES.map(L => ({ col: L.col, zones: L.zones.map(z => CH[z].n), outs: P2P.filter(p => p.col === L.col).length }));
for (const c of CARRIERS) if (c.outs > 32) throw new Error(`Cable ${c.col}: ${c.outs} salidas P2P (máximo 32)`);
for (const L of LANES) if (blocks.get(`${C + L.tx},33,${C + L.tz}`)?.t !== 'ctrl' || blocks.get(`${C + L.tx},32,${C + L.tz}`)?.col !== L.col) throw new Error(`El cable ${L.col} no sale del controlador`);
const nWifi = B().filter(b => b.t.startsWith('hub_')).length;
export const CHANNELS = { zones: CH, P2P, nIn, nOut, carriers: CARRIERS, wireless: nWifi, sideFaces: 36 - (nWifi - 9) };

// bloques que forman el pozo (para la guía de construcción)
for (const b of blocks.values()) if ((b.y < 0 && (b.x - C) ** 2 + (b.z - C) ** 2 < 8.6 ** 2) || (b.y === 0 && dist(b.x, b.z) <= 9 && ['qglass', 'skyb', 'elev'].includes(b.t))) b.pit = true;
export const PIT = { cx: C, cz: C, r: 7.5, depth: VOID_D };
// texturas del cristal conectado de AE2 (base a-d + 15 marcos)
export const GLASS_TEX = [...'abcd', ...Array.from({ length: 15 }, (_, i) => 'frame' + (i + 1).toString(2).padStart(4, '0'))].map(k => 'ae2:glass/quartz_glass_' + k);
export const CABLE_TEX = 'ae2:part/cable/dense_smart/transparent'; // cable denso inteligente fluix (zonas)
export const EXTRA_TEX = [CABLE_TEX, ...['white', 'magenta', 'orange', 'light_blue', 'lime', 'yellow', 'pink', 'cyan', 'purple', 'blue'].map(c => 'ae2:part/cable/dense_smart/' + c), 'ae2:part/p2p_tunnel_front', 'ae2:part/p2p_tunnel_sides', 'ae2:part/quartz_fiber', ...GLASS_TEX];

export const BLOCKS = [...blocks.values()];
export const ZONES = [
  { n: 'Vista general', p: [70, 55, 70], t: [21, 14, 21] },
  { n: 'Desde el ascensor', p: [21.5, 2.6, 26], t: [21.5, 5, 8] },
  { n: 'Ordenador cuántico', p: [21.5, 8, 20], t: [21.5, 5, 5] },
  { n: 'Racks de discos', p: [14, 8, 14], t: [4, 6, 4] },
  { n: 'Árboles + Matrix', p: [21.5, 8, 24], t: [21.5, 5, 38] },
  { n: 'Procesado AE2 (E)', p: [28, 7, 21.5], t: [40, 3, 21.5] },
  { n: 'Mekanism (O)', p: [15, 7, 21.5], t: [2, 3, 21.5] },
  { n: 'Controlador', p: [26.5, 31, 27], t: [21.5, 34.6, 21.5] },
  { n: 'Suelo vacío', p: [27, 8, 27], t: [21.5, -10, 21.5] },
  { n: 'Escalones (L2)', p: [12, 9, 30], t: [6, 11, 22] },
  { n: 'Puentes (L2)', p: [30, 19, 30], t: [21.5, 12, 21.5] },
  { n: 'Puentes cuánticos', p: [12, 30, 21.5], t: [1, 27, 21.5] },
  { n: 'Terminales (L1)', p: [21.5, 3.4, 21.5], t: [27.5, 2.3, 15.5] },
  { n: 'Ascensor oeste (L3)', p: [9.5, 29.5, 21.5], t: [3.5, 25.5, 21.5] },
  { n: 'Hornos (L3)', p: [31, 31.5, 17], t: [19, 27, 1] },
  { n: 'Pantalla almacén (E)', p: [27, 19, 21.5], t: [41, 20.5, 21.5] },
  { n: 'Pantalla fabricación (O)', p: [16, 19, 21.5], t: [1, 20.5, 21.5] },
  { n: 'Pantalla de sector', p: [12, 4, 12], t: [7.5, 4.5, 7.5] },
  { n: 'ME Requesters (L2 N)', p: [21.5, 16, 8], t: [21.5, 15, 1] },
];
