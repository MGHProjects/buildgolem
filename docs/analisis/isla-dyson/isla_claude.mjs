// Isla Dyson a mi manera (Claude): mismo prompt que el jugador dio a los agentes.
// Uso las piezas del kit donde sirven y código propio para lo que ningún kit trae (monumento de la esfera, estrado, terraza, arco).
import { runTool } from 'file:///C:/Users/mique/Proyectos/Craftometry/server/src/llm/tools.js';
import { encode, decode } from 'file:///C:/Users/mique/Proyectos/Craftometry/server/src/design/format.js';
import { writeFileSync } from 'node:fs';
const OUT = 'C:/Users/mique/AppData/Local/Temp/claude/09b9b23e0419701f/14ff7dd9-3d96-4484-acca-6e0bddcd938a/scratchpad/';
const ctx = { workspaceId: 'atm10-mio', lang: 'es', design: encode({ TITLE: 'Puesto de lanzamiento Dyson', P: {}, BLOCKS: [], W: 1, H: 1 }), saveDesign() {} };
const T = (n, a) => runTool(n, a, ctx);

const code = String.raw`
const Y = 60, CX = 60, CZ = 50;               // hierba de la isla en y=60; centro de la isla
const SS = 'minecraft:smooth_stone', SSL = 'minecraft:smooth_stone_slab', PA = 'minecraft:polished_andesite', CU = 'minecraft:waxed_cut_copper', CUS = 'minecraft:waxed_cut_copper_slab';
const SKY = 'ae2:sky_stone_brick', SKYS = 'ae2:smooth_sky_stone_block', QP = 'ae2:quartz_pillar';
// ¿hay isla debajo de todo el rectángulo (con margen) y aire encima? Lo que se sale del borde se ve flotando
const PLANT = /short_grass|tall_grass|fern|poppy|dandelion|bluet|daisy|tulip|orchid|allium|cornflower|bush/, busy = (x, z) => { const id = get(x, Y + 1, z); return id != null && !PLANT.test(id); };
const fits = (x0, z0, x1, z1, m = 2) => { for (let x = x0 - m; x <= x1 + m; x++) for (let z = z0 - m; z <= z1 + m; z++) if (get(x, Y - 1, z) == null || get(x, Y, z) == null || busy(x, z)) return false; return true; };   // margen libre también de otras obras
const spot = (name, cands, w, d, m, zone) => {
  let c = cands.find(([x, z]) => fits(x, z, x + w - 1, z + d - 1, m));
  if (!c && zone) for (let x = zone[0]; x <= zone[2] && !c; x++) for (let z = zone[1]; z <= zone[3] && !c; z++) if (fits(x, z, x + w - 1, z + d - 1, m)) c = [x, z];
  if (!c) print('SIN SITIO ' + name); return c || cands[0];
};
const ring = (cx, cz, r0, r1, a0, a1, fn) => { for (let x = Math.floor(cx - r1 - 1); x <= cx + r1 + 1; x++) for (let z = Math.floor(cz - r1 - 1); z <= cz + r1 + 1; z++) { const d = Math.hypot(x - cx, z - cz), a = Math.atan2(z - cz, x - cx) * 180 / Math.PI; if (d >= r0 && d <= r1 && a >= a0 && a <= a1) fn(x, z, d, a); } };

// ── 1. Isla principal grande y dos islotes satélite ─────────────────────
print(feature({ type: 'island', x: CX, y: Y, z: CZ, rx: 34, rz: 27, seed: 33, ores: ['minecraft:copper_ore', 'minecraft:iron_ore', 'minecraft:lapis_ore', 'minecraft:coal_ore'] }));
print(feature({ type: 'island', x: 14, y: Y + 7, z: 16, rx: 7, rz: 6, seed: 4 }));
print(feature({ type: 'island', x: 108, y: Y + 4, z: 86, rx: 8, rz: 6, seed: 9 }));
feature({ type: 'tree', x: 14, y: Y + 8, z: 16, variant: 'abedul', size: 2 });
feature({ type: 'tree', x: 108, y: Y + 5, z: 86, variant: 'roble', size: 1 });
// bajo la isla: bayas brillantes y racimos de amatista colgando (la cara de abajo también se ve)
for (let i = 0; i < 160; i++) {
  const a = i * 2.399, r = Math.sqrt(i / 160) * 30, x = Math.round(CX + Math.cos(a) * r * 1.1), z = Math.round(CZ + Math.sin(a) * r * 0.85);
  let y = Y - 2; while (y > 5 && get(x, y - 1, z) != null) y--;
  if (get(x, y, z) == null || y <= 5) continue;
  if (i % 3 === 0) set(x, y - 1, z, 'minecraft:amethyst_cluster', { facing: 'down' });
  else if (i % 3 === 1) { set(x, y - 1, z, 'minecraft:cave_vines_plant', { berries: 'true' }); set(x, y - 2, z, 'minecraft:cave_vines', { berries: 'true' }); }
}

// ── 2. Estrado del receptor (punto focal) con la Ender Cell debajo ─────
const RX = CX, RZ = CZ - 8;
ring(RX, RZ, 0, 6.4, -181, 181, (x, z, d) => set(x, Y, z, d > 5.6 ? CU : SS));                 // plaza de piedra lisa con anillo de cobre
ring(RX, RZ, 0, 4.4, -181, 181, (x, z, d) => set(x, Y + 1, z, d > 3.6 ? SSL : SS));            // primer escalón
ring(RX, RZ, 0, 2.4, -181, 181, (x, z, d) => set(x, Y + 2, z, d > 1.6 ? CU : SS));             // segundo escalón con borde de cobre
set(RX, Y + 2, RZ, 'powah:ender_cell_nitro');                                                     // batería justo debajo del controlador
set(RX, Y + 3, RZ, 'dysoncubeproject:ray_receiver_controller');                                   // multibloque 3×6×3 encima
for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) set(RX + dx, Y + 2, RZ + dz, 'minecraft:end_rod', { facing: 'up' });
// conductos de energía radiales: líneas de rejilla de cobre en el suelo hacia el estrado
for (const [ux, uz] of [[1, 0], [-1, 0], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) for (let k = 7; k <= 12; k++) set(Math.round(RX + ux * k), Y, Math.round(RZ + uz * k), 'minecraft:waxed_copper_grate');

// ── 3. Terraza de lanzamiento: media luna al sur con 6 disparadores ─────
const TX = CX, TZ = CZ - 2;
ring(TX, TZ, 17, 23, 15, 165, (x, z, d) => set(x, Y, z, Math.abs(d - 20) < 0.6 ? 'minecraft:waxed_copper_grate' : d < 17.6 || d > 22.4 ? PA : SS));
const EJ = [25, 51, 77, 103, 129, 155].map(a => [Math.round(TX + 20 * Math.cos(a * Math.PI / 180)), Math.round(TZ + 20 * Math.sin(a * Math.PI / 180))]);
for (const [x, z] of EJ) {
  feature({ type: 'pad', x, y: Y, z, size: 3, block: 'minecraft:polished_deepslate', edge: SS, light: 'minecraft:sea_lantern' });
  set(x, Y + 1, z, 'dysoncubeproject:em_railejector_controller');
}
// camino del estrado a la terraza
feature({ type: 'path', from: [CX - 1, Y, RZ + 7], to: [CX + 1, Y, TZ + 17], block: SS, edge: PA });

// ── 4. Portal cuántico de AE2 al norte, en un arco de piedra del cielo ───
const PX = CX, PZ = CZ - 18;
for (let x = PX + 8; x <= PX + 16; x++) for (let z = PZ - 2; z <= PZ + 6; z++) if (get(x, Y - 1, z) == null) print('nodo sin isla debajo en ' + x + ',' + z);   // con sus aleros
box(PX - 5, Y, PZ - 2, PX + 5, Y, PZ + 2, SKYS);                                                    // andén
for (let dx = -3; dx <= 3; dx++) for (let dy = 1; dy <= 6; dy++) {
  const edge = Math.abs(dx) === 3 || dy === 6;
  if (!edge) continue;
  set(PX + dx, Y + dy, PZ, Math.abs(dx) === 3 ? QP : dx === 0 ? 'ae2:fluix_block' : SKY, Math.abs(dx) === 3 ? { axis: 'y' } : undefined);
}
for (const s of [-1, 1]) { stair(PX + 4 * s, Y + 6, PZ, 'ae2:sky_stone_brick_stairs', s < 0 ? 'west' : 'east', { top: true }); set(PX + 3 * s, Y + 7, PZ, 'ae2:quartz_block'); set(PX + 3 * s, Y + 8, PZ, 'minecraft:end_rod', { facing: 'up' }); }
for (let dx = -1; dx <= 1; dx++) for (let dy = 2; dy <= 4; dy++) set(PX + dx, Y + dy, PZ, dx === 0 && dy === 3 ? 'ae2:quantum_link' : 'ae2:quantum_ring');
set(PX - 2, Y + 1, PZ, SKY); set(PX + 2, Y + 1, PZ, SKY); for (let dx = -1; dx <= 1; dx++) set(PX + dx, Y + 1, PZ, SKYS);
// los objetos del mod a los lados del portal, en pedestales
for (const [dx, it] of [[-5, 'dysoncubeproject:solar_sail_package'], [5, 'dysoncubeproject:beam_package']]) { set(PX + dx, Y + 1, PZ + 2, QP, { axis: 'y' }); set(PX + dx, Y + 2, PZ + 2, 'supplementaries:pedestal'); show(PX + dx, Y + 2, PZ + 2, it); }
feature({ type: 'path', from: [PX - 1, Y, PZ + 3], to: [PX + 1, Y, RZ - 7], block: SS, edge: PA });

for (const s of [-1, 1]) set(PX + 4 * s, Y + 1, PZ, 'minecraft:lantern');                         // bajo los voladizos del arco
// ── 5. Nodo AE2 junto al portal: casita con el ancla espacial (el puente necesita las dos puntas cargadas) ──
print(building({ name: 'Nodo AE2', from: [PX + 9, Y + 1, PZ - 1], to: [PX + 15, Y + 1, PZ + 5], estilo: 'tecnologico', height: 5, base: 0, doors: [{ side: 'west' }] }));
set(PX + 12, Y + 1, PZ, 'ae2:spatial_anchor');

// ── 6. Monumento: el cubo de Dyson en miniatura (sol de froglight dentro de un armazón de varas, con velas a medio montar) ──
const MX = CX - 25, MY = Y + 9, MZ = CZ - 2;
for (let x = MX - 5; x <= MX + 5; x++) for (let z = MZ - 5; z <= MZ + 5; z++) if (get(x, Y - 1, z) == null) print('cubo sin isla debajo en ' + x + ',' + z);
feature({ type: 'boulder', x: MX, y: Y + 1, z: MZ, r: 3, block: 'minecraft:andesite', seed: 5 });
for (let q = Y + 3; q <= MY - 3; q++) set(MX, q, MZ, 'minecraft:chain', { axis: 'y' });
for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) if (Math.hypot(dx, dy, dz) <= 2.2) set(MX + dx, MY + dy, MZ + dz, 'minecraft:ochre_froglight');
// armazón del cubo de Dyson (el mod es Dyson Cube Project): 12 aristas de varas, cada una a lo largo de su arista, nodos de cobre
// en las 8 esquinas y una cruz abajo que lo cuelga de la cadena; las velas, tiras de cristal pegadas a las aristas
const R = 5, BULB = 'minecraft:waxed_copper_bulb', ROD = { x: 'east', y: 'up', z: 'south' };
for (const a of ['x', 'y', 'z']) for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) for (let t = -R + 1; t <= R - 1; t++)
  set(...(a === 'x' ? [MX + t, MY + s1 * R, MZ + s2 * R] : a === 'y' ? [MX + s1 * R, MY + t, MZ + s2 * R] : [MX + s1 * R, MY + s2 * R, MZ + t]), 'minecraft:end_rod', { facing: ROD[a] });
for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1]) set(MX + i * R, MY + j * R, MZ + k * R, BULB, { lit: 'true' });
for (let t = -R + 1; t <= R - 1; t++) if (t) { set(MX + t, MY - R, MZ, 'minecraft:end_rod', { facing: 'east' }); set(MX, MY - R, MZ + t, 'minecraft:end_rod', { facing: 'south' }); }
set(MX, MY - R, MZ, BULB, { lit: 'true' });                                                       // donde la cruz coge la cadena
const SAIL = 'minecraft:light_blue_stained_glass';
for (let t = -R + 1; t <= R - 1; t++) { set(MX + t, MY + R, MZ - R + 1, SAIL); set(MX + R, MY - R + 1, MZ + t, SAIL); set(MX - R + 1, MY + t, MZ + R, SAIL); }
for (let t = -R + 1; t <= 0; t++) set(MX + t, MY + R, MZ - R + 2, SAIL);                           // la vela de arriba, a medio montar

// ── 7. Observatorio y energía: cúpula, antena y campos de placas ───────────
feature({ type: 'dome', x: CX + 24, y: Y + 1, z: CZ - 6, r: 5, block: 'minecraft:light_blue_stained_glass' });
ring(CX + 24, CZ - 6, 0, 4.4, -181, 181, (x, z) => set(x, Y, z, SS));
set(CX + 24, Y + 1, CZ - 6, 'minecraft:sea_lantern');
feature({ type: 'antenna', x: CX + 27, y: Y + 1, z: CZ - 10, height: 12 });
{ const [x, z] = spot('antena oeste', [[CX - 24, CZ - 16], [CX - 26, CZ - 14], [CX - 22, CZ - 20]], 1, 1, 2, [CX - 30, CZ - 24, CX - 18, CZ - 12]); print('antena oeste en ' + x + ',' + z); feature({ type: 'antenna', x, y: Y + 1, z, height: 9 }); }
{ const [x, z] = spot('placas este', [[CX + 18, CZ - 16], [CX + 14, CZ + 18], [CX + 20, CZ + 14], [CX + 8, CZ + 22], [CX - 20, CZ + 16]], 7, 4, 2, [CX + 8, CZ - 24, CX + 26, CZ + 20]); print('placas este en ' + x + ',' + z); feature({ type: 'solar', x, y: Y, z, width: 7, depth: 4 }); }
{ const [x, z] = spot('placas oeste', [[CX - 22, CZ - 18], [CX - 20, CZ - 16], [CX - 16, CZ - 20]], 6, 4, 2); print('placas oeste en ' + x + ',' + z); feature({ type: 'solar', x, y: Y, z, width: 6, depth: 4 }); }

// ── 8. Red: el portal trae los paquetes por AE2; una tubería universal de Pipez los lleva, con la energía de la Ender Cell,
// a la cara de abajo de cada disparador (la única por la que coge objetos y energía). Todo enterrado a y=58.
const PIPE = 'pipez:universal_pipe', DENSE = 'ae2:fluix_covered_dense_cable', COV = 'ae2:fluix_covered_cable', NET = Y - 2;
route([PX, Y + 1, PZ], [PX, Y, PZ], { cable: DENSE, block: SKYS });             // sale del anillo de abajo del puente (de los 4 que aceptan cable), tapado
route([PX, Y - 1, PZ], [PX, NET, PZ + 1], { cable: DENSE, order: 'yzx' });      // baja y se aparta del borde norte (ahí la isla es fina)
route([PX + 1, NET, PZ + 1], [PX + 12, NET, PZ + 1], { cable: DENSE });          // bajo tierra hasta el Nodo AE2
route([PX + 12, NET + 1, PZ + 1], [PX + 12, NET + 1, PZ], { cable: COV, order: 'zyx' });   // sube al ancla espacial…
route([PX + 12, Y, PZ], [PX + 12, Y, PZ], { cable: COV, block: get(PX + 12, Y, PZ) || SS });   // …por el suelo de la caseta
const IX = PX + 11, IZ = PZ + 2;
set(IX, Y, IZ, 'ae2:interface');                                                  // interfaz en el suelo de la caseta, a mano para configurarla
route([IX, NET, IZ], [IX, NET + 1, IZ], { cable: COV, order: 'zyx' });          // la alimenta por debajo
route([IX + 1, Y, IZ], [IX + 1, NET, IZ], { block: PIPE });                       // junto a la interfaz: saca los paquetes
route([IX + 1, NET, IZ + 1], [RX, NET, RZ], { block: PIPE, order: 'zxy' });
route([RX, Y + 1, RZ], [RX, NET + 1, RZ], { block: PIPE });                       // bajo la Ender Cell: saca la energía
route([RX, NET, RZ + 1], [TX, NET, TZ], { block: PIPE });
for (const [x, z] of EJ) { route([TX, NET, TZ], [x, NET, z], { block: PIPE, order: 'xzy' }); route([x, NET + 1, z], [x, Y, z], { block: PIPE }); }   // sube al centro de su plataforma

// ── 9. Luz en toda la isla (de noche no deben salir monstruos) y algo de vida ──
for (const [x, z] of [[CX - 4, RZ - 10], [CX + 4, RZ - 10], [CX - 4, RZ + 9], [CX + 4, RZ + 9], [CX - 14, CZ - 14], [CX + 14, CZ - 16], [CX - 30, CZ + 12], [CX + 30, CZ + 8], [CX - 18, CZ + 2], [CX + 12, CZ - 2], [CX - 8, CZ - 30], [CX + 20, CZ - 22], [CX - 26, CZ - 20], [CX + 26, CZ + 18], [CX - 12, CZ + 12], [CX + 6, CZ + 10], [CX - 12, CZ - 22], [CX - 6, CZ - 26], [PX - 7, PZ + 3], [PX + 6, PZ + 5], [CX + 31, CZ - 1]]) if (get(x, Y + 1, z) == null && get(x, Y, z) != null) feature({ type: 'lantern', x, y: Y + 1, z, variant: 'farola' });
for (const [x, y, z] of [[17, Y + 8, 19], [11, Y + 8, 13], [105, Y + 5, 88], [111, Y + 5, 84]]) if (get(x, y, z) == null && get(x, y - 1, z) != null) feature({ type: 'lantern', x, y, z, variant: 'farola' });   // islotes
for (const [x, z, v] of [[CX - 30, CZ + 10, 'abedul'], [CX + 33, CZ + 2, 'abedul'], [CX - 10, CZ - 24, 'roble'], [CX + 14, CZ + 22, 'roble']]) if (get(x, Y + 1, z) == null && get(x, Y, z) != null) feature({ type: 'tree', x, y: Y + 1, z, variant: v, size: 1 });
// comprobación final: ninguna pieza posterior pisó una máquina
for (const [x, z] of EJ) if (get(x, Y + 1, z) !== 'dysoncubeproject:em_railejector_controller') print('PISADO disparador ' + x + ',' + z);
if (get(RX, Y + 3, RZ) !== 'dysoncubeproject:ray_receiver_controller' || get(RX, Y + 2, RZ) !== 'powah:ender_cell_nitro') print('PISADO receptor');

// ── 10. Vistas y explicación ──
zone('Vista general', [CX, Y - 10, CZ], { from: [CX + 70, Y + 35, CZ + 75] });
zone('Portal cuántico y Nodo AE2', [PX + 5, Y + 3, PZ], { from: [PX + 2, Y + 9, PZ + 20] });
zone('Estrado del receptor', [RX, Y + 3, RZ], { from: [RX + 12, Y + 10, RZ + 14] });
zone('Terraza de lanzamiento', [TX, Y + 1, TZ + 12], { from: [TX, Y + 18, TZ + 47] });
zone('Cubo de Dyson', [MX, MY, MZ], { from: [MX - 16, MY + 6, MZ + 12] });
zone('Por debajo', [CX, Y - 25, CZ], { from: [CX + 70, Y - 55, CZ + 70] });
zone('Red de abajo (corte en y=' + NET + ')', [CX + 6, NET, CZ - 4], { from: [CX + 6, NET + 55, CZ + 34], cut: NET });
explain('Cómo funciona', 'El receptor de rayos (' + RX + ',' + (Y + 3) + ',' + RZ + ') recoge la energía de la esfera y la empuja sola a la Ender Cell que tiene debajo (' + RX + ',' + (Y + 2) + ',' + RZ + '). '
  + 'Los paquetes de vela solar y de rayo llegan desde la red AE2 de tu base por el puente cuántico del portal (' + PX + ',' + (Y + 3) + ',' + PZ + '), bajan por cable denso enterrado hasta la interfaz ME del Nodo AE2 (' + IX + ',' + Y + ',' + IZ + ') '
  + 'y de ahí una tubería universal de Pipez los lleva, junto con la energía de la Ender Cell, a la cara de abajo de cada disparador: es la única cara por la que el disparador coge objetos y energía. Disparadores: ' + EJ.map(([x, z]) => '(' + x + ',' + (Y + 1) + ',' + z + ')').join(' ') + '.');
explain('Qué configurar en el juego', '1) Interfaz ME (' + IX + ',' + Y + ',' + IZ + '): en su stock, paquetes de vela solar y de rayo (p. ej. 16 de cada); ella los pide a tu red.\n'
  + '2) Llave de Pipez: la tubería junto a la interfaz (' + (IX + 1) + ',' + Y + ',' + IZ + '), conexión oeste, en extraer y solo objetos; la de debajo de la Ender Cell (' + RX + ',' + (Y + 1) + ',' + RZ + '), conexión de arriba, en extraer y solo energía. Pon una mejora a esas dos y el reparto en rotación (round robin). Las de los disparadores se quedan en insertar.\n'
  + '3) Ender Cell: si la tubería no saca energía, pon su cara de abajo en salida con la llave de Powah.\n'
  + '4) Puente cuántico: una pareja de Quantum Entangled Singularity, una en este enlace y la otra en el de tu base.\n'
  + '5) Receptor y disparadores: en su pantalla, suscríbelos a tu esfera (sin comprobar en el juego).');
explain('Energía', 'Cada disparador gasta 40 FE/t mientras dispara y guarda 400 000 FE: los 6, 240 FE/t. La pone el receptor, que solo produce cuando la esfera ya tiene velas: para arrancar, carga la Ender Cell desde tu base con otra Ender Cell en el mismo canal (comparten la energía). '
  + 'La red AE2 de la isla (puente, interfaz y ancla) es la misma que la de tu base a través del puente y usa su energía.');
explain('Carga de chunks', 'El puente cuántico solo funciona con sus dos puntas cargadas. El ancla espacial del Nodo AE2 (' + (PX + 12) + ',' + (Y + 1) + ',' + PZ + ') carga los chunks donde hay piezas de la red AE2 (portal, cable e interfaz), pero no los de los disparadores ni el del receptor: '
  + 'fuerza la carga de toda la isla (69 × 55, unos 5 × 4 chunks) con FTB Chunks. La punta del puente en tu base también tiene que estar cargada.');
explain('Lo que no se ve', 'Cables y tuberías van enterrados a y=' + NET + ': mira la vista «Red de abajo» o corta en y=' + NET + ' en Capas. Bajo cada disparador, en el centro de su plataforma, una tubería universal sube hasta su cara de abajo; bajo el estrado, otra baja de la Ender Cell. '
  + 'En la superficie solo asoman la tubería junto a la interfaz y el cable bajo el ancla, tapado con el suelo de la caseta.');
`;
const out = JSON.parse(await T('run_code', { code }));
console.log('error:', out.error, '| bloques:', out.placed, '| fallos:', out.failed, '\n', (out.printed || []).join('\n '));
for (const v of ['se', 'sw', 'ne', 'front']) { const img = await T('render_design', { view: v }); writeFileSync(OUT + 'claude-' + v + '.png', Buffer.from(img.image.data, 'base64')); console.log(v, img.text); }
console.log(await T('review_design', {}));
writeFileSync(OUT + 'claude-dyson.json', JSON.stringify(ctx.design));