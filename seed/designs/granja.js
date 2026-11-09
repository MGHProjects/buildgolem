// Laboratorio de golems — granja de hierro con Hostile Neural Networks (sin Easy Villagers ni abejas).
// Independiente del Centro AE2 (diseno.js): el visor la abre con index.html?d=granja.
// Rejilla 45 x 45, centro C = 22. Nave octogonal de 23 x 23 con cúpula, sótano-bóveda y jardines. Norte = Z bajo. Y=0 = césped.
// Comprobado en los jars de la instancia (HostileNeuralNetworks 6.5.1, Pipez 1.2.31, allthemodium 3.2.1):
//  · data_models/iron_golem: sim_cost 1024 FE/t, consume 1 Prediction Matrix, da siempre 1 Overworld Prediction y, con la
//    precisión del modelo, 1 predicción que el Loot Fabricator convierte en 32 lingotes de hierro (o 24 amapolas).
//  · SimMode: Inference = 300/1,25 = 240 ticks y coste ×1 · Training = 300 ticks, coste ×1,2 y +1 dato por simulación
//    (config "Sim Chamber Upgrades Model" = 1 en ATM10). Model tiers: Basic 6 datos (5 %), Advanced 54, Superior 354,
//    Self Aware 1254 (100 %). Faulty no simula. Al matar, todos los modelos del Deep Learner que coinciden suman datos.
//  · Loot Fabricator: 60 ticks y 256 FE/t por fabricación, 1 hueco de entrada + 16 de salida.
//  · Data Center: 25 huecos de modelo, 4 de entrada, 16 de salida; solo modelos Self Aware; 300 ticks por ciclo y modelo,
//    coste ceil(sim_cost × 1,5) FE/t; cada ciclo gasta 1 matriz y da la Overworld Prediction + el producto elegido.
//    Carcasa (DataCenterShell): 7 × 7 × 7, suelo #c:obsidians, paredes y techo #data_center_wall (cristal negro o IO Port),
//    controlador 1 bloque por encima del suelo en una pared, mirando afuera; interior vacío. Fuerza la carga de sus chunks.
//    Inventario: modelos (0-24) no se extraen; entradas (25-28) solo matrices de un modelo presente; salidas (29-44) no admiten.
//  · Sim Chamber: se inserta en los huecos 0-1 (modelo, matriz) y se extrae de los 2-3 (predicciones).
//  · Pipez: una conexión en modo extraer no recibe; sin mejora mueve 8 objetos / 40 ticks, Basic 16 / 20 ticks.
//  · mining dimension: plana, césped en Y=252, techo Y=319, bioma sin aparición de mobs.

export const TITLE = 'Laboratorio de golems · ATM10 Aeronautics';
export const SUB = 'Granja de hierro con el Data Center de Hostile Neural Networks · nave octogonal 23 × 23 con cúpula, bóveda y jardines';
export const SKY = '#6eb1ff';                                         // sky_color de allthemodium:mining
const GRASS = '#55c93f', WATER = '#3f76e4';                             // grass_color y water_color del bioma

const mc = n => 'minecraft:' + n;
const cube = (n, id, t, o = {}) => ({ n, id: mc(id), all: mc(t || id), ...o });
export const P = {
  // terreno y jardín
  grass:   { n: 'Bloque de césped', id: mc('grass_block'), top: mc('grass_block_top'), side: mc('grass_block_side'), bottom: mc('dirt'), ctint: { top: GRASS } },
  water:   { n: 'Agua', id: mc('water'), all: mc('water_still'), ctint: { top: WATER, side: WATER }, glass: true },
  mudbr:   cube('Ladrillos de barro', 'mud_bricks'),
  cherlog: { n: 'Tronco de cerezo', id: mc('cherry_log'), side: mc('cherry_log'), top: mc('cherry_log_top') },
  cherlf:  cube('Hojas de cerezo', 'cherry_leaves', null, { cutout: true }),
  azal:    cube('Hojas de azalea', 'azalea_leaves', null, { cutout: true }),
  fazal:   cube('Hojas de azalea florecida', 'flowering_azalea_leaves', null, { cutout: true }),
  poppy:   { n: 'Amapola', id: mc('poppy'), model: mc('block/poppy') },
  cornf:   { n: 'Aciano', id: mc('cornflower'), model: mc('block/cornflower') },
  allium:  { n: 'Allium', id: mc('allium'), model: mc('block/allium') },
  bluet:   { n: 'Rubiácea azul', id: mc('azure_bluet'), model: mc('block/azure_bluet') },
  daisy:   { n: 'Margarita', id: mc('oxeye_daisy'), model: mc('block/oxeye_daisy') },
  lily:    { n: 'Lirio de los valles', id: mc('lily_of_the_valley'), model: mc('block/lily_of_the_valley') },
  pot:     { n: 'Maceta con amapola', id: mc('flower_pot'), model: mc('block/potted_poppy') },
  // piedra
  pdeep:   cube('Pizarra profunda pulida', 'polished_deepslate'),
  dtile:   cube('Baldosas de pizarra profunda', 'deepslate_tiles'),
  dbr:     cube('Ladrillos de pizarra profunda', 'deepslate_bricks'),
  cdeep:   cube('Pizarra profunda cincelada', 'chiseled_deepslate'),
  ptuff:   cube('Toba pulida', 'polished_tuff'),
  tbr:     cube('Ladrillos de toba', 'tuff_bricks'),
  ctbr:    { n: 'Ladrillos de toba cincelados', id: mc('chiseled_tuff_bricks'), side: mc('chiseled_tuff_bricks'), top: mc('chiseled_tuff_bricks_top') },
  ctuff:   { n: 'Toba cincelada', id: mc('chiseled_tuff'), side: mc('chiseled_tuff'), top: mc('chiseled_tuff_top') },
  pbas:    { n: 'Basalto pulido', id: mc('polished_basalt'), side: mc('polished_basalt_side'), top: mc('polished_basalt_top') },
  ptuffst: cube('Escaleras de toba pulida', 'polished_tuff_stairs', 'polished_tuff', { shape: 'stairs' }),
  tbrst:   cube('Escaleras de ladrillos de toba', 'tuff_brick_stairs', 'tuff_bricks', { shape: 'stairs' }),
  tbrsl:   cube('Losa de ladrillos de toba', 'tuff_brick_slab', 'tuff_bricks', { shape: 'slab' }),
  tbwall:  cube('Muro de ladrillos de toba', 'tuff_brick_wall', 'tuff_bricks', { shape: 'post' }),
  // cobre oxidado (encerado para que no cambie)
  ocut:    cube('Cobre cortado oxidado encerado', 'waxed_oxidized_cut_copper', 'oxidized_cut_copper'),
  ochis:   cube('Cobre cincelado oxidado encerado', 'waxed_oxidized_chiseled_copper', 'oxidized_chiseled_copper'),
  ogrt:    cube('Rejilla de cobre oxidado encerada', 'waxed_oxidized_copper_grate', 'oxidized_copper_grate', { cutout: true }),
  lrod:    { n: 'Pararrayos', id: mc('lightning_rod'), model: mc('block/lightning_rod') },
  // cristal y luz (ninguna luz necesita redstone)
  glass:   cube('Cristal', 'glass', null, { cutout: true }),
  dome:    cube('Cristal tintado cian', 'cyan_stained_glass', null, { glass: true }),
  pfrog:   { n: 'Luz de rana perlada', id: mc('pearlescent_froglight'), side: mc('pearlescent_froglight_side'), top: mc('pearlescent_froglight_top'), glow: true, dim: 0.9 },
  vfrog:   { n: 'Luz de rana verde', id: mc('verdant_froglight'), side: mc('verdant_froglight_side'), top: mc('verdant_froglight_top'), glow: true, dim: 0.8 },
  lantern: { n: 'Farol', id: mc('lantern'), model: mc('block/lantern'), glow: true, dim: 0.9 },
  lanth:   { n: 'Farol colgante', id: mc('lantern'), model: mc('block/lantern_hanging'), glow: true, dim: 0.9 },
  slanth:  { n: 'Farol de almas colgante', id: mc('soul_lantern'), model: mc('block/soul_lantern_hanging'), glow: true, dim: 0.9 },
  chain:   { n: 'Cadena', id: mc('chain'), model: mc('block/chain') },
  // mobiliario
  books:   { n: 'Librería', id: mc('bookshelf'), side: mc('bookshelf'), top: mc('oak_planks') },
  lectern: { n: 'Atril', id: mc('lectern'), model: mc('block/lectern'), yaw: 180 },
  craft:   { n: 'Mesa de trabajo (matrices y oro)', id: mc('crafting_table'), front: mc('crafting_table_front'), side: mc('crafting_table_side'), top: mc('crafting_table_top'), bottom: mc('oak_planks') },
  barrel:  { n: 'Barril (arcilla, oro, paneles de cristal)', id: mc('barrel'), side: mc('barrel_side'), top: mc('barrel_top'), bottom: mc('barrel_bottom') },
  iblock:  cube('Bloque de hierro (estatua del golem)', 'iron_block'),
  // la granja
  sim:     { n: 'Simulation Chamber (Hostile Neural Networks) · modelo de golem de hierro', id: 'hostilenetworks:sim_chamber', model: 'hostilenetworks:block/sim_chamber', yaw: 180, glow: ['hostilenetworks:simulation_chamber_north'], dim: 0.5 },
  fab:     { n: 'Loot Fabricator (Hostile Neural Networks) · fabrica lingotes de hierro', id: 'hostilenetworks:loot_fabricator', model: 'hostilenetworks:block/loot_fabricator', yaw: 180, glow: ['hostilenetworks:loot_fabricator_north'], dim: 0.5 },
  flux:    { n: 'Flux Point (Flux Networks) · energía desde tu base', id: 'fluxnetworks:flux_point', model: 'fluxnetworks:block/flux_point', glow: true, dim: 0.8 },
  pipe:    { n: 'Tubería de objetos (Pipez)', id: 'pipez:item_pipe', all: 'pipez:item_pipe', shape: 'pipe' },
  dc:      { n: 'Data Center (Hostile Neural Networks) · controlador, mirando afuera', id: 'hostilenetworks:data_center', model: 'hostilenetworks:block/data_center', yaw: 180, glow: ['hostilenetworks:data_center_north'], dim: 0.6 },
  obsid:   cube('Obsidiana (suelo del Data Center)', 'obsidian'),
  bglass:  cube('Cristal tintado negro (carcasa del Data Center)', 'black_stained_glass', null, { glass: true }),
  ioen:    { n: 'Data Center IO Port · modo Energy', id: 'hostilenetworks:data_center_io_port', all: 'hostilenetworks:data_center_io_port_energy', glow: true, dim: 0.4 },
  ioin:    { n: 'Data Center IO Port · modo Inputs (matrices)', id: 'hostilenetworks:data_center_io_port', all: 'hostilenetworks:data_center_io_port_inputs', glow: true, dim: 0.4 },
  ioout:   { n: 'Data Center IO Port · modo Outputs (hierro)', id: 'hostilenetworks:data_center_io_port', all: 'hostilenetworks:data_center_io_port_outputs', glow: true, dim: 0.4 },
  fsctrl:  { n: 'Storage Controller (Functional Storage)', id: 'functionalstorage:storage_controller', front: 'functionalstorage:controller_front', side: mc('polished_deepslate'), glow: { front: 'functionalstorage:controller_front' }, dim: 0.4 },
  fscomp:  { n: 'Compacting Drawer bloqueado en hierro (Functional Storage)', id: 'functionalstorage:compacting_drawer', front: 'functionalstorage:compacting_drawer_front', side: mc('polished_deepslate') },
  fsmat:   { n: 'Cajón 1x1 bloqueado en Overworld Prediction (Functional Storage)', id: 'functionalstorage:dark_oak_1', front: 'functionalstorage:dark_oak_front_1', side: 'functionalstorage:dark_oak_side' },
  fsmtx:   { n: 'Cajón 1x1 de Prediction Matrix (Functional Storage, fuera del controlador)', id: 'functionalstorage:spruce_1', front: 'functionalstorage:spruce_front_1', side: 'functionalstorage:spruce_side' },
};

export const W = 45, WX = 45, WZ = 45, H = 21;
const C = 22, R = 11, S = 16;                                           // octógono: |dx|,|dz| <= 11 y |dx|+|dz| <= 16
export const WALLS = { x0: C - R, x1: C + R, z0: C - R, z1: C + R, top: 20 };
const blocks = new Map(), A = Math.abs, K = (x, y, z) => `${x},${y},${z}`;
const at = (dx, y, dz, t, f = 's', o = {}) => blocks.set(K(C + dx, y, C + dz), { x: C + dx, y, z: C + dz, t, f, ...o });
const get = (dx, y, dz) => blocks.get(K(C + dx, y, C + dz));
const del = (dx, y, dz) => blocks.delete(K(C + dx, y, C + dz));
const inOct = (dx, dz, r = R, s = S) => A(dx) <= r && A(dz) <= r && A(dx) + A(dz) <= s;
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const isWall = (dx, dz) => inOct(dx, dz) && N8.some(([a, b]) => !inOct(dx + a, dz + b));
const sideOf = (dx, dz) => (A(dx) >= A(dz) ? (dx < 0 ? 'W' : 'E') : dz < 0 ? 'N' : 'S'); // grupo que se oculta hacia la cámara
const outward = (dx, dz) => (A(dx) >= A(dz) ? (dx < 0 ? 'w' : 'e') : dz < 0 ? 'n' : 's');
const rnd = (x, z) => (((x + 101) * 73856093) ^ ((z + 211) * 19349663)) >>> 0;  // azar fijo: el diseño no cambia al recargar
const HALF = (W - 1) / 2, sym = f => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) f(sx, sz); };
const G = { tag: 'g' }, CEIL = { tag: 'ceil' };                         // g: suelo, nunca se oculta

// ═══ 1. Terreno: césped, plaza octogonal, 4 avenidas con farolas y setos, jardines con cerezos y 2 fuentes ═══
for (let dx = -HALF; dx <= HALF; dx++) for (let dz = -HALF; dz <= HALF; dz++) {
  if (inOct(dx, dz)) continue;
  const plaza = inOct(dx, dz, 14, 20), ax = A(dx) <= 2 && A(dz) > 14, az = A(dz) <= 2 && A(dx) > 14;
  let t = 'grass';
  if (plaza) t = inOct(dx, dz, 12, 18) ? 'dtile' : inOct(dx, dz, 13, 19) ? 'ptuff' : 'tbr';
  else if (ax || az) t = A(ax ? dx : dz) <= 1 ? 'mudbr' : 'ptuff';
  at(dx, 0, dz, t, 's', G);
}
for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {            // avenida en la dirección (ux, uz)
  const L = (along, lat, y, t, f) => at(ux * along + uz * lat, y, uz * along + ux * lat, t, f);
  for (let a = 15; a <= HALF; a++) for (const s of [-1, 1]) {
    if (a === 16 || a === 20) { L(a, 3 * s, 1, 'tbwall'); L(a, 3 * s, 2, 'tbwall'); L(a, 3 * s, 3, 'lantern'); }
    else if (a === 18 && uz) L(a, 3 * s, 1, 'tbrst', s > 0 ? 'w' : 'e');           // bancos en las avenidas N y S
    L(a, 4 * s, 1, (a + (s > 0)) % 3 ? 'azal' : 'fazal');                          // seto de azalea
  }
}
for (const sx of [-1, 1]) {                                              // fuentes al final de las avenidas E y O
  const fx = 18 * sx;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    const r = Math.hypot(dx, dz);
    if (r <= 2.5) at(fx + dx, 0, dz, dx || dz ? 'water' : 'ptuff', 's', G);
    else if (r <= 3.3) { at(fx + dx, 0, dz, 'ptuff', 's', G); at(fx + dx, 1, dz, 'ctuff'); }
  }
  at(fx, 1, 0, 'ptuff'); at(fx, 2, 0, 'ctbr'); at(fx, 3, 0, 'pfrog');
}
const FLOWERS = ['poppy', 'cornf', 'allium', 'bluet', 'daisy', 'lily'];
for (let dx = -HALF; dx <= HALF; dx++) for (let dz = -HALF; dz <= HALF; dz++) {
  const h = rnd(dx, dz) % 23;
  if (h < FLOWERS.length && get(dx, 0, dz)?.t === 'grass' && !get(dx, 1, dz)) at(dx, 1, dz, FLOWERS[h]);
}
sym((sx, sz) => {                                                        // cerezos en las 4 esquinas del jardín
  const tx = 17 * sx, tz = 17 * sz;
  for (let y = 1; y <= 5; y++) at(tx, y, tz, 'cherlog');
  for (let y = 4; y <= 8; y++) {
    const rad = [0, 0, 0, 0, 2.6, 3.2, 3.2, 2.4, 1.3][y];
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      const r = Math.hypot(dx, dz);
      if (r > rad || (y <= 5 && !dx && !dz)) continue;
      if (r > rad - 0.8 && rnd(tx + dx + y, tz + dz) % 3 === 0) continue;     // borde irregular
      at(tx + dx, y, tz + dz, 'cherlf');
      if (y === 4 && r > 1.8 && rnd(tx + dx, tz + dz + 7) % 4 === 0) at(tx + dx, 3, tz + dz, 'cherlf'); // ramas colgantes
    }
  }
});

// ═══ 2. Nave octogonal: sótano (bóveda), suelo, muros con ventanales de cobre, azotea con parapeto y cúpula de cristal ═══
const wallAt = (dx, dz, y) => {
  const sx = A(dx) === R && A(dz) <= 5, sz = A(dz) === R && A(dx) <= 5, t = sx ? A(dz) : sz ? A(dx) : null;
  if (y === 1) return sz && t <= 1 ? null : 'pdeep';                    // puertas N y S
  if (y === 9) return 'ocut';
  if (y === 10) return 'pdeep';
  if (t !== null) {
    if (sz && t <= 1) return y <= 4 ? null : y === 5 ? 'ctbr' : y <= 7 ? 'glass' : 'tbr';
    if (t === 2 || t === 5) return 'ctbr';                              // pilastras
    if (t <= 1) return y === 8 ? 'ocut' : 'glass';                      // ventanal alto en E y O
    return y === 2 || y === 8 ? 'ocut' : 'glass';                       // ventanas laterales
  }
  const win = A(dx) + A(dz) >= 15 && Math.min(A(dx), A(dz)) >= 7 && Math.max(A(dx), A(dz)) <= 9;
  if (win) return y === 2 || y === 8 ? 'ocut' : 'glass';
  return y === 8 ? 'ogrt' : 'tbr';
};
for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
  if (!inOct(dx, dz)) continue;
  const wall = isWall(dx, dz), r = Math.hypot(dx, dz), side = { tag: sideOf(dx, dz) };
  at(dx, -5, dz, wall ? 'dbr' : (dx + dz) & 1 ? 'dtile' : 'pdeep', 's', G); // suelo de la bóveda
  if (wall) for (let y = -4; y <= -1; y++) at(dx, y, dz, 'dbr', 's', G);
  at(dx, 0, dz, wall ? (A(dz) === R && A(dx) <= 1 ? 'tbr' : 'pdeep')
    : r <= 7 ? 'pdeep' : r <= 8.2 ? 'ocut' : A(dx) <= 1 ? 'tbr' : (dx + dz) & 1 ? 'pdeep' : 'dtile', 's', G);
  if (wall) {
    for (let y = 1; y <= 10; y++) { const t = wallAt(dx, dz, y); if (t) at(dx, y, dz, t, 's', side); }
    if (A(dx) === R || A(dz) === R || A(dx) + A(dz) === S) {          // parapeto con pináculos
      const pin = (A(dx) === R && A(dz) % 5 === 0) || (A(dz) === R && A(dx) % 5 === 0) || (A(dx) === 8 && A(dz) === 8);
      at(dx, 11, dz, pin ? 'ctbr' : 'tbwall', 's', side);
      if (pin) at(dx, 12, dz, 'lrod', 's', side);
    }
  } else if (r > 8.5) at(dx, 10, dz, 'dtile', 's', CEIL);               // azotea; dentro de r 8,5 se abre la cúpula
  if (!wall && r <= 7) at(dx, 1, dz, r > 6.2 ? 'ptuffst' : 'ptuff', outward(dx, dz)); // estrado central
}
for (let dx = -9; dx <= 9; dx++) for (let dz = -9; dz <= 9; dz++) for (let y = 10; y <= 18; y++) {
  const d = Math.hypot(dx, y - 10, dz);
  if (d > 7.5 && d <= 8.5) at(dx, y, dz, y === 10 || y === 14 || !dx || !dz ? 'ocut' : 'dome', 's', CEIL); // 4 nervios y 2 anillos de cobre
}
at(0, 19, 0, 'ochis', 's', CEIL); at(0, 20, 0, 'lrod', 's', CEIL);
for (const sz of [-1, 1]) {                                             // pórticos de las puertas N y S
  for (const sx of [-2, 2]) { at(sx, 1, 13 * sz, 'pdeep'); for (let y = 2; y <= 5; y++) at(sx, y, 13 * sz, 'pbas'); at(sx, 6, 13 * sz, 'ochis'); }
  for (let dx = -3; dx <= 3; dx++) for (let a = 12; a <= 14; a++) at(dx, 7, a * sz, A(dx) === 3 || a === 14 ? 'ocut' : 'tbrsl');
  at(0, 6, 13 * sz, 'lanth');
}

// ═══ 3. Interior: columnas, librerías bajo las ventanas, atriles, faroles, estatua del golem y lámpara de la cúpula ═══
for (const [a, b] of [[8, 3], [3, 8]]) sym((sx, sz) => {
  at(a * sx, 1, b * sz, 'pdeep'); for (let y = 2; y <= 8; y++) at(a * sx, y, b * sz, 'pbas'); at(a * sx, 9, b * sz, 'ochis');
});
for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++)
  if (A(dx) + A(dz) === 14 && Math.min(A(dx), A(dz)) >= 4 && !isWall(dx, dz)) {
    at(dx, 1, dz, 'books'); at(dx, 2, dz, 'books'); at(dx, 3, dz, (dx + dz) & 2 ? 'pot' : 'lantern');
  }
sym((sx, sz) => { at(7 * sx, 9, 7 * sz, 'lanth'); at(3 * sx, 1, 10 * sz, 'lectern', sz < 0 ? 's' : 'n'); });
for (const [a, b] of [[0, 10], [0, -10], [10, 0], [-10, 0]]) at(a, 9, b, 'lanth');
// estatua en el lado sur del estrado, mirando a la puerta sur: hierro en T sin calabaza (sin calabaza no aparece ningún golem)
for (let dx = -1; dx <= 1; dx++) at(dx, 2, 5, dx ? 'ptuff' : 'ctbr');
for (const sx of [-1, 1]) { at(sx, 3, 5, 'iblock'); for (let y = 2; y <= 5; y++) at(2 * sx, y, 5, 'iblock'); at(3 * sx, 2, 5, 'pot'); }
for (let dx = -1; dx <= 1; dx++) for (let y = 4; y <= 5; y++) at(dx, y, 5, 'iblock');
at(0, 6, 5, 'iblock');
for (const sx of [-1, 1]) at(2 * sx, 2, -5, 'lectern', 'n');           // 2 atriles delante del controlador
for (let y = 13; y <= 17; y++) at(0, y, 0, 'chain');                    // lámpara colgada del vértice de la cúpula
at(0, 12, 0, 'pfrog');
for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { at(a, 12, b, 'ocut'); at(2 * a, 12, 2 * b, 'ocut'); at(2 * a, 11, 2 * b, 'lanth'); }

// ═══ 4. Data Center en el centro del estrado: carcasa 7 × 7 × 7 (DataCenterShell) ═══
// Suelo de obsidiana en y=1, paredes de cristal tintado negro en y=2..6, techo en y=7, interior 5 × 5 × 5 vacío.
// Controlador en la fila baja de la pared norte mirando afuera. Puertos IO: Energy en el centro del techo (Flux Point encima),
// Inputs al oeste y Outputs al este, cada uno con su tubería bajando a la bóveda.
const DC_R = 3, DC_Y0 = 1;
for (let dx = -DC_R; dx <= DC_R; dx++) for (let dz = -DC_R; dz <= DC_R; dz++) for (let y = DC_Y0; y <= DC_Y0 + 6; y++) {
  if (y === DC_Y0) at(dx, y, dz, 'obsid');
  else if (y === DC_Y0 + 6 || A(dx) === DC_R || A(dz) === DC_R) at(dx, y, dz, 'bglass');
  else del(dx, y, dz);
}
at(0, DC_Y0 + 1, -DC_R, 'dc', 'n');
at(0, DC_Y0 + 6, 0, 'ioen'); at(0, DC_Y0 + 7, 0, 'flux');
at(-DC_R, DC_Y0 + 1, 0, 'ioin'); at(DC_R, DC_Y0 + 1, 0, 'ioout');
const pipe = (dx, y, dz) => at(dx, y, dz, 'pipe', 's', G);
const run = pts => { for (let i = 1; i < pts.length; i++) { // tubería recta entre puntos (en el techo de la bóveda, y = -1)
  const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
  for (let k = 0; k <= Math.max(A(x1 - x0), A(z1 - z0)); k++) pipe(x0 + Math.sign(x1 - x0) * k, -1, z0 + Math.sign(z1 - z0) * k);
} };
for (const sx of [-1, 1]) for (let y = -1; y <= DC_Y0 + 1; y++) pipe((DC_R + 1) * sx, y, 0);
run([[-(DC_R + 1), 0], [DC_R + 1, 0]]); run([[0, 0], [0, -10]]); run([[0, 0], [0, 10]]);

// ═══ 5. Bóveda (sótano): pared de cajones al norte, puesto de matrices al sur, 2 escaleras de caracol (E y O) ═══
pipe(0, -2, -10); at(0, -3, -10, 'fsctrl', 's');
for (const x of [-2, -1, 1, 2]) for (const y of [-3, -2]) at(x, y, -10, 'fscomp', 's');
for (const x of [-1, 0, 1]) at(x, -4, -10, 'fsmat', 's');
for (const x of [-2, 2]) at(x, -4, -10, 'cdeep');
pipe(0, -2, 10); at(0, -3, 10, 'fsmtx', 'n'); at(0, -4, 10, 'craft', 'n');
for (const x of [-1, 1]) { at(x, -2, 10, 'ochis'); at(x, -3, 10, 'craft', 'n'); at(x, -4, 10, 'barrel'); }
for (const x of [-2, 2]) for (let y = -4; y <= -3; y++) at(x, y, 10, 'barrel');
for (const z of [-10, 10]) for (const x of [-3, 3]) { for (let y = -4; y <= -1; y++) at(x, y, z, 'pdeep'); at(x, -2, z, 'vfrog'); }
sym((sx, sz) => { at(7 * sx, -1, 7 * sz, 'slanth'); at(3 * sx, -1, 4 * sz, 'slanth'); });
for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {   // bóveda: medallón con luz bajo el Data Center y archivo de librerías
  const r = Math.hypot(dx, dz);
  if (r <= 3.5) at(dx, -5, dz, !dx && !dz ? 'pfrog' : r <= 2.5 ? 'ctuff' : 'ocut', 's', G);
  if (A(dx) + A(dz) === 14 && Math.min(A(dx), A(dz)) >= 4 && !isWall(dx, dz)) { at(dx, -4, dz, 'books'); at(dx, -3, dz, 'books'); }
}
// estación de entrenamiento (el Data Center solo admite modelos Self Aware): 4 Simulation Chamber en Training y 1 Loot
// Fabricator que convierte sus predicciones en hierro. Tubería encima (insertar) y detrás (extraer); Flux Point entre máquinas.
const MACH = [-6, -4, 0, 4, 6].map(x => ({ t: x ? 'sim' : 'fab', x, y: -4, z: 7 }));
for (const m of MACH) {
  at(m.x, m.y, m.z, m.t, 'n');
  for (let y = m.y + 1; y <= -1; y++) pipe(m.x, y, m.z);
  for (let y = m.y; y <= -1; y++) pipe(m.x, y, m.z + 1);
}
for (const x of [-5, -1, 1, 5]) at(x, -4, 7, 'flux');
run([[-6, 7], [6, 7]]);
for (let dx = -12; dx <= 12; dx++) for (let dz = -12; dz <= 12; dz++) { // jardineras de azalea pegadas a la nave
  if (inOct(dx, dz) || !inOct(dx, dz, 12, 17) || (A(dx) <= 3 && A(dz) >= 12)) continue;
  at(dx, 1, dz, rnd(dx, dz) % 5 ? (rnd(dz, dx) % 2 ? 'azal' : 'fazal') : 'pot');
}
sym((sx, sz) => { at(15 * sx, 1, 17 * sz, 'tbrst', sx > 0 ? 'w' : 'e'); at(17 * sx, 1, 15 * sz, 'tbrst', sz > 0 ? 'n' : 's'); }); // bancos bajo los cerezos
const RING = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
for (const sx of [-1, 1]) {                                             // caracol: 1 escalón por casilla, 5 bajadas
  const cx = 9 * sx, start = sx > 0 ? 7 : 3;                            // empieza en la casilla que mira al estrado
  for (let y = -4; y <= 0; y++) at(cx, y, 0, 'pbas', 's', G);
  at(cx, 1, 0, 'tbwall'); at(cx, 2, 0, 'lantern');
  for (let k = 0; k < 8; k++) {                                        // en espejo: el oeste gira al revés
    const [ox, oz] = RING[(start + sx * k + 8) % 8], x = cx + ox, z = oz;
    if (k >= 1) del(x, 0, z);
    if (k >= 1 && k <= 4) at(x, -k, z, 'ptuff', 's', G);
  }
}

// ═══ 6. Tuberías: brazo hacia cada vecino conectado; comprobaciones del diseño ═══
const LINK = new Set(['sim', 'fab', 'fsctrl', 'fscomp', 'fsmtx', 'ioin', 'ioout']), INV = new Set([...LINK, 'fsmat', 'barrel', 'dc', 'ioen']);
const D6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const nb = (b, d) => blocks.get(K(b.x + d[0], b.y + d[1], b.z + d[2]));
const PIPES = [...blocks.values()].filter(b => b.t === 'pipe');
for (const b of PIPES) {
  b.boxes = [[0.375, 0.375, 0.375, 0, 0, 0]]; b.bkey = 0;
  D6.forEach((d, i) => {
    const n = nb(b, d);
    if (!n || !INV.has(n.t) && n.t !== 'pipe') return;
    if (!LINK.has(n.t) && n.t !== 'pipe') throw new Error(`La tubería de ${b.x},${b.y},${b.z} toca ${n.t}: lo llenaría de objetos`);
    b.bkey |= 1 << i;
    b.boxes.push(d.map(v => (v ? 0.3125 : 0.25)).concat(d.map(v => v * 0.34375)));
  });
}
const seen = new Set([K(PIPES[0].x, PIPES[0].y, PIPES[0].z)]), queue = [PIPES[0]];
while (queue.length) { const b = queue.pop(); for (const d of D6) { const n = nb(b, d); const k = n && K(n.x, n.y, n.z); if (n?.t === 'pipe' && !seen.has(k)) { seen.add(k); queue.push(n); } } }
if (seen.size !== PIPES.length) throw new Error(`Las tuberías forman ${PIPES.length - seen.size} piezas sueltas: deben ser una sola red`);
for (const m of MACH) {
  const b = blocks.get(K(C + m.x, m.y, C + m.z)), pipes = D6.filter(d => nb(b, d)?.t === 'pipe').length;
  if (pipes !== 2) throw new Error(`${m.t} en ${b.x},${b.z} tiene ${pipes} tuberías (hacen falta 2: insertar y extraer)`);
  if (!D6.some(d => nb(b, d)?.t === 'flux')) throw new Error(`${m.t} en ${b.x},${b.z} sin Flux Point`);
}
// carcasa del Data Center con las reglas de DataCenterShell: suelo #c:obsidians, paredes y techo de cristal negro o puertos IO,
// controlador en la fila baja de una pared mirando afuera, interior vacío
let nCtrl = 0;
for (let dx = -DC_R; dx <= DC_R; dx++) for (let dz = -DC_R; dz <= DC_R; dz++) for (let y = DC_Y0; y <= DC_Y0 + 6; y++) {
  const t = get(dx, y, dz)?.t, shell = y === DC_Y0 + 6 || A(dx) === DC_R || A(dz) === DC_R;
  const ok = y === DC_Y0 ? t === 'obsid' : shell ? ['bglass', 'ioen', 'ioin', 'ioout'].includes(t) || (t === 'dc' && y === DC_Y0 + 1) : !t;
  if (!ok) throw new Error(`Carcasa del Data Center inválida en ${C + dx},${y},${C + dz} (${t || 'aire'})`);
  if (t === 'dc') { nCtrl++; if (get(dx, y, dz).f !== outward(dx, dz)) throw new Error('El controlador del Data Center debe mirar hacia fuera'); }
}
if (nCtrl !== 1) throw new Error(`El Data Center tiene ${nCtrl} controladores`);
const portNb = t => { const b = [...blocks.values()].find(q => q.t === t); return D6.map(d => nb(b, d)?.t); };
if (!portNb('ioen').includes('flux')) throw new Error('El puerto Energy no tiene Flux Point');
for (const t of ['ioin', 'ioout']) if (!portNb(t).includes('pipe')) throw new Error(`El puerto ${t} no tiene tubería`);
for (const b of blocks.values()) if (/pumpkin|jack/.test(P[b.t].id)) throw new Error('Una calabaza sobre el hierro haría aparecer un golem');
for (const b of blocks.values()) if (b.t === 'ptuff' && b.y < 0 && b.y > -5)  // escalones: 2 de aire encima
  for (const dy of [1, 2]) if (blocks.get(K(b.x, b.y + dy, b.z))) throw new Error(`Escalón sin altura en ${b.x},${b.y},${b.z}`);

// ═══ 7. Números ═══
const DC_SLOTS = 25, CYC_H = 72000 / 300, DC_FE = Math.ceil(1024 * 1.5); // RUNTIME_TICKS 300 · sim_cost × "Data Center Sim Cost Multiplier"
const dcOut = DC_SLOTS * 33 / 15;                                       // objetos/s con los 25 modelos (32 lingotes + 1 Overworld Prediction)
if (dcOut > 64 * 20 / 10) throw new Error('La salida del Data Center necesita más que una Advanced Upgrade');
const nTrain = MACH.filter(m => m.t === 'sim').length, trainFab = 32 * nTrain * CYC_H / 3600; // Training: también 300 ticks
if (nTrain * CYC_H > 72000 / 60) throw new Error('El Loot Fabricator de entrenamiento no da abasto');
if (trainFab > 16) throw new Error('La tubería del fabricador de entrenamiento necesita más que una Basic Upgrade');
export const STATS = {
  slots: DC_SLOTS, perModel: 32 * CYC_H, iron: DC_SLOTS * 32 * CYC_H, fe: DC_SLOTS * DC_FE, matrices: DC_SLOTS * CYC_H,
  matter: DC_SLOTS * CYC_H, dcOut, feTrain: Math.round(nTrain * 1024 * 1.2 + 256), trainFab, pipes: PIPES.length,
};
// ── proceso animado: 1 unidad = 1 ciclo de un modelo del Data Center (300 ticks, 1 matriz → 32 lingotes + 1 Overworld Prediction) ──
const G2 = (dx, y, dz) => [C + dx, y, C + dz];
export const PROCESS = {
  title: { es: 'Data Center: hierro con 25 modelos Self Aware', en: 'Data Center: iron with 25 Self Aware models' },
  unit: { es: 'ciclo', en: 'cycle' },
  nodes: [
    { id: 'mtx', label: { es: 'Cajón de Prediction Matrix', en: 'Prediction Matrix drawer' }, at: G2(0, -3, 10) },
    { id: 'dc', label: { es: 'Data Center · 25 modelos', en: 'Data Center · 25 models' }, at: G2(0, 2, -3), ticks: 300, parallel: DC_SLOTS, perUnit: 1, upgrades: false },
    { id: 'store', label: { es: 'Storage Controller', en: 'Storage Controller' }, at: G2(0, -3, -10) },
  ],
  edges: [
    { from: 'mtx', to: 'dc', item: { es: 'Prediction Matrix', en: 'Prediction Matrix' }, color: '#7fd1ff', perUnit: 1,
      paths: [[G2(0, -2, 10), G2(0, -1, 10), G2(0, -1, 0), G2(-4, -1, 0), G2(-4, 2, 0), G2(-3, 2, 0)]] },
    { from: 'dc', to: 'store', item: { es: 'Lingotes de hierro', en: 'Iron ingots' }, color: '#E07A3F', perUnit: 32, output: true,
      paths: [[G2(3, 2, 0), G2(4, 2, 0), G2(4, -1, 0), G2(0, -1, 0), G2(0, -1, -10), G2(0, -2, -10)]] },
  ],
  notes: {
    es: 'Cada ciclo da también 1 Overworld Prediction. La tubería de salida (Pipez con Advanced Upgrade) mueve 128 objetos/s: no frena. Las 4 Simulation Chamber del sótano solo entrenan modelos nuevos.',
    en: 'Each cycle also gives 1 Overworld Prediction. The output pipe (Pipez with Advanced Upgrade) moves 128 items/s: it does not slow down. The 4 Simulation Chambers in the vault only train new models.',
  },
};

export const BLOCKS = [...blocks.values()];
export const ZONES = [
  { n: 'Vista aérea', p: [C + 12, 26, C + 40], t: [C, 4, C], aw: false },
  { n: 'Entrada norte', p: [C - 6, 4, C - 24], t: [C, 5, C - 11], aw: false },
  { n: 'Data Center', p: [C + 1.5, 6.5, C - 10], t: [C + 0.5, 3.5, C - 2], aw: true },
  { n: 'Estatua', p: [C - 3, 4.5, C + 10], t: [C + 0.5, 4, C + 5], aw: true },
  { n: 'Cúpula', p: [C + 6, 2.6, C + 7], t: [C, 14, C], aw: true },
  { n: 'Bóveda', p: [C + 4, -2.4, C + 1], t: [C, -3, C - 10], aw: true },
  { n: 'Entrenamiento', p: [C + 2.5, -2.2, C + 0.5], t: [C + 0.5, -3.5, C + 7], aw: true },
  { n: 'Tuberías (corte Y 0)', p: [C + 12, 9, C + 14], t: [C, -2, C], aw: true, cut: 0 },
  { n: 'Planta (sin techo)', p: [C, 55, C + 14], t: [C, 0, C], aw: true },
  { n: 'Jardín', p: [C + 21, 4, C + 29], t: [C + 15, 4, C + 15], aw: false },
];
const n = x => Math.round(x).toLocaleString('es');
export const INFO = `
<p><b>Data Center</b> de Hostile Neural Networks con hasta ${DC_SLOTS} modelos de golem de hierro Self Aware. Cada modelo hace 1 ciclo cada 15 s: ${n(CYC_H)} ciclos/h × 32 lingotes = <b>${n(STATS.perModel)} hierro/h por modelo</b>. Con los ${DC_SLOTS}: <b>${n(STATS.iron)} hierro/h</b>. No hace falta Loot Fabricator: el Data Center fabrica directamente el producto que elijas.</p>
<p><b>Energía</b>: ${n(DC_FE)} FE/t por modelo (sim_cost 1.024 × 1,5, el multiplicador de ATM10), ${n(STATS.fe)} FE/t con ${DC_SLOTS}. Entra por el puerto Energy del techo, con un Flux Point encima conectado a un Flux Plug en tu base. La estación de entrenamiento gasta ${n(STATS.feTrain)} FE/t mientras entrena.</p>
<p><b>Consumo</b>: 1 Prediction Matrix por ciclo y modelo, ${n(CYC_H)}/h por modelo (${n(STATS.matrices)}/h con ${DC_SLOTS}, ${n(STATS.matrices / 16)} recetas/h de 1 hierro, 1 oro, 1 arcilla y 4 paneles de cristal). El oro sale de las Overworld Prediction que da cada ciclo: 4 + 1 netherrack = 1 Nether Prediction, y esta + glowstone + hierro = 6 de oro. <b>La arcilla y el cristal los pones tú</b>; con muchos modelos, mejor autocraftear las matrices en tu red AE2.</p>
<ol>
<li><b>Sitio.</b> El centro del octógono (x22 z22 del visor) en una esquina de chunk. El Data Center fuerza la carga de los chunks de su carcasa; carga el resto de la nave con FTB Chunks.</li>
<li><b>Carcasa 7 × 7 × 7.</b> Suelo de obsidiana, paredes y techo de cristal tintado negro (valen también los negros de Connected Glass y Chipped) e interior vacío. El controlador va en la fila baja de la pared norte, mirando hacia fuera. Cambia el modo de los puertos IO con clic derecho: <i>Energy</i> en el centro del techo, <i>Inputs</i> al oeste y <i>Outputs</i> al este. Receta del Data Center: 1 estrella del Nether, 2 fragmentos de eco, 1 Sim Chamber, 1 Loot Fabricator y 4 de obsidiana.</li>
<li><b>Modelos.</b> El Data Center solo usa modelos Self Aware. Mete 4 Data Model en el Deep Learner, atúnalos con clic derecho sobre un golem y mata 6 golems: cada muerte cuenta para los 4 y llegan a Basic. Después, la estación de la bóveda los sube sola: 4 Sim Chamber en <i>Training</i> (+1 dato por simulación, unas 5,2 h hasta Self Aware) y un Loot Fabricator que convierte en hierro las predicciones del entrenamiento.</li>
<li><b>Producto.</b> En el Data Center, clic derecho sobre cada modelo y elige el lingote de hierro.</li>
<li><b>Tuberías (Pipez).</b> Una sola red. Con la llave, pon en <i>extraer</i> la tubería del puerto Outputs, la de detrás de cada máquina de entrenamiento y la que hay sobre el cajón de matrices; las demás, en insertar. Mejoras: Advanced en la del puerto Outputs (salen ${n(dcOut)} objetos/s con ${DC_SLOTS} modelos; Advanced mueve 128) y Basic en la de detrás del Loot Fabricator (${trainFab.toFixed(1)}/s). No hacen falta filtros: cada destino solo acepta lo suyo.</li>
<li><b>Cajones.</b> Bloquea los Compacting Drawer con un lingote de hierro y los 3 de abajo con una Overworld Prediction, y enlázalos al Storage Controller. Con ${DC_SLOTS} modelos entran ${n(STATS.iron / 9)} bloques de hierro/h: ponles mejoras de capacidad o lleva el hierro a AE2.</li>
</ol>
<p class="hint">Si los cajones se llenan, el Data Center guarda la salida en su búfer y se para: no se pierde nada. Comprobado al cargar: la carcasa cumple las reglas de DataCenterShell, los puertos tienen su Flux Point y sus tuberías, hay una sola red de ${STATS.pipes} tuberías, ninguna toca un barril ni el controlador, cada máquina de entrenamiento tiene 2 tuberías y Flux Point, y cada escalón tiene 2 de aire encima.</p>`;
export const EXTRA_TEX = [];
