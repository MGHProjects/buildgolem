// Templo de los Trofeos — recinto japonés de 59 × 65 sobre podio, con un ala por mod.
// Norte = z bajo. Entrada por el sur. Suelo del podio en y=3 (se camina en y=4).
import { createWorld, toDesign, saveLocal, withModel } from './lib.mjs';
import { roof, walls, toro, cherry, pagoda } from './arch.mjs';
import { section } from './sec.mjs';
import { writeFileSync } from 'node:fs';

const w = createWorld();
const R = { stairs: 'minecraft:deepslate_tile_stairs', slab: 'minecraft:deepslate_tile_slab', block: 'minecraft:deepslate_tiles', ridge: 'minecraft:polished_blackstone_bricks', tip: 'minecraft:polished_blackstone', gable: 'minecraft:dark_oak_planks' };
const RG = { ...R, tip: 'minecraft:gold_block' };                  // sala principal: remates dorados (shachihoko)
const WALL = { post: 'minecraft:stripped_mangrove_log', beam: 'minecraft:stripped_dark_oak_log', plaster: 'minecraft:calcite', window: 'minecraft:white_stained_glass', windowY: [2, 3], bracket: 'minecraft:dark_oak_stairs' };
const PED = 'supplementaries:pedestal';
const ped = (x, y, z, item, base) => { if (base) w.set(x, y - 1, z, base); w.set(x, y, z, PED); if (item) w.show(x, y, z, item); };
const hang = (x, y, z, id = 'minecraft:lantern', chain = 0) => { for (let i = 1; i <= chain; i++) w.set(x, y + i, z, 'minecraft:chain', { axis: 'y' }); w.set(x, y, z, id, /:(soul_)?lantern$/.test(id) ? { hanging: 'true' } : undefined); };
const lamp = (x, y, z, id = 'mcwlights:white_paper_lamp') => w.set(x, y, z, id);
const mix = (a, b, pct, x, y, z) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 100 < pct ? b : a;

// ── 1. Terreno y podio ────────────────────────────────────────────────────
const GX = 62, GZ = 82;
w.box(0, 0, 0, GX, 0, GZ, 'minecraft:grass_block');
for (let x = 2; x <= 60; x++) for (let z = 2; z <= 66; z++) {
  const edge = x === 2 || x === 60 || z === 2 || z === 66;
  for (let y = 1; y <= 3; y++) {
    if (edge) w.set(x, y, z, y === 3 ? 'minecraft:smooth_stone' : mix(mix('minecraft:stone_bricks', 'minecraft:mossy_stone_bricks', 18, x, y, z), 'minecraft:cracked_stone_bricks', 8, z, x, y));
    else w.set(x, y, z, y === 3 ? 'minecraft:gravel' : 'minecraft:stone');
  }
}
// escalinata del podio (sur) con zancas de piedra
for (let x = 27; x <= 35; x++) { w.stair(x, 3, 67, 'minecraft:stone_brick_stairs', 's'); w.stair(x, 2, 68, 'minecraft:stone_brick_stairs', 's'); w.stair(x, 1, 69, 'minecraft:stone_brick_stairs', 's'); w.box(x, 1, 67, x, 2, 67, 'minecraft:stone'); w.set(x, 1, 68, 'minecraft:stone'); w.set(x, 3, 66, 'minecraft:polished_andesite'); }
for (const x of [26, 36]) { w.box(x, 1, 67, x, 3, 67, 'minecraft:stone_bricks'); w.box(x, 1, 68, x, 2, 68, 'minecraft:stone_bricks'); w.set(x, 1, 69, 'minecraft:stone_bricks'); toro(w, x, 4, 66); }

// ── 2. Patio: caminos, estanques, puentes, progresión ─────────────────────
const PATH = 'minecraft:polished_andesite', PEDGE = 'minecraft:stone_bricks';
for (let z = 30; z <= 66; z++) for (let x = 29; x <= 33; x++) w.set(x, 3, z, x === 29 || x === 33 ? PEDGE : PATH);
for (let x = 18; x <= 44; x++) for (let z = 43; z <= 47; z++) if (x < 29 || x > 33) w.set(x, 3, z, z === 43 || z === 47 ? PEDGE : PATH);
for (let x = 18; x <= 44; x++) for (let z = 29; z <= 29; z++) w.set(x, 3, z, PATH);          // frente de la sala principal
// estanques con borde de piedra y musgo, nenúfares; puente arqueado rojo encima del camino transversal
const pond = (x0, x1) => {
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = 32; z <= 54; z++) {
    const rim = x === x0 - 1 || x === x1 + 1 || z === 32 || z === 54;
    if (z >= 43 && z <= 47 && !rim) continue;                     // aquí va el puente
    if (rim) { if (!(z >= 43 && z <= 47)) w.set(x, 3, z, mix('minecraft:mossy_cobblestone', 'minecraft:moss_block', 35, x, 3, z)); continue; }
    w.set(x, 3, z, 'minecraft:water'); w.set(x, 2, z, 'minecraft:water'); w.set(x, 1, z, 'minecraft:mud');
    if (mix(0, 1, 9, x, 4, z) && (z < 42 || z > 48)) w.set(x, 4, z, 'minecraft:lily_pad');
  }
  // agua bajo el puente
  for (let x = x0; x <= x1; x++) for (let z = 43; z <= 47; z++) { w.set(x, 3, z, 'minecraft:water'); w.set(x, 2, z, 'minecraft:water'); w.set(x, 1, z, 'minecraft:mud'); }
  // tablero: sube medio bloque por paso hasta el centro
  const cx = (x0 + x1) / 2, H = [1, 2, 3, 3, 3, 2, 1];
  for (let x = x0; x <= x1; x++) {
    const h = H[x - x0], low = x < cx ? 'w' : 'e';
    for (let z = 44; z <= 46; z++) { if (h === 1) w.slab(x, 4, z, 'minecraft:mangrove_slab'); else if (h === 2) w.stair(x, 4, z, 'minecraft:mangrove_stairs', low); else w.slab(x, 5, z, 'minecraft:mangrove_slab'); }
    // barandillas rojas con postes en los extremos y en el centro
    for (const z of [43, 47]) { const yb = h === 3 ? 5 : 4; if (h === 1) w.slab(x, 4, z, 'minecraft:mangrove_slab'); else if (h === 2) w.stair(x, 4, z, 'minecraft:mangrove_stairs', low); else w.slab(x, 5, z, 'minecraft:mangrove_slab'); w.set(x, yb + 1, z, x === x0 || x === x1 ? 'minecraft:stripped_mangrove_log' : 'minecraft:mangrove_fence', x === x0 || x === x1 ? { axis: 'y' } : undefined); }
    if (x === x0 || x === x1) for (const z of [43, 47]) w.set(x, 6, z, 'chipped:red_paper_lantern');
  }
};
pond(19, 25); pond(37, 43);
// rocas y musgo junto al agua
for (const [x, z] of [[18, 34], [18, 52], [26, 36], [26, 50], [44, 34], [44, 52], [36, 36], [36, 50]]) { w.set(x, 4, z, 'minecraft:mossy_cobblestone'); w.set(x, 4, z + 1, 'minecraft:moss_carpet'); }
// progresión de minerales: del portón a la sala, mena a la izquierda y lingote a la derecha, sobre un plinto de su bloque
const TIERS = [
  ['minecraft:coal_ore', 'minecraft:coal', 'minecraft:coal_block'],
  ['minecraft:iron_ore', 'minecraft:iron_ingot', 'minecraft:iron_block'],
  ['minecraft:gold_ore', 'minecraft:gold_ingot', 'minecraft:gold_block'],
  ['minecraft:redstone_ore', 'minecraft:redstone', 'minecraft:redstone_block'],
  ['minecraft:lapis_ore', 'minecraft:lapis_lazuli', 'minecraft:lapis_block'],
  ['minecraft:diamond_ore', 'minecraft:diamond', 'minecraft:diamond_block'],
  ['minecraft:emerald_ore', 'minecraft:emerald', 'minecraft:emerald_block'],
  ['minecraft:ancient_debris', 'minecraft:netherite_ingot', 'minecraft:netherite_block'],
  ['allthemodium:allthemodium_ore', 'allthemodium:allthemodium_ingot', 'allthemodium:allthemodium_block'],
  ['allthemodium:vibranium_ore', 'allthemodium:vibranium_ingot', 'allthemodium:vibranium_block'],
  ['allthemodium:unobtainium_ore', 'allthemodium:unobtainium_ingot', 'allthemodium:unobtainium_block'],
];
const TZ = [56, 54, 52, 50, 48, 42, 40, 38, 36, 34, 32];
TIERS.forEach(([ore, ingot, blk], i) => { const z = TZ[i]; for (const [x, it] of [[27, ore], [35, ingot]]) { w.set(x, 3, z, 'minecraft:chiseled_stone_bricks'); w.set(x, 4, z, blk); ped(x, 5, z, it); } });
// faroles de piedra en el patio
for (const [x, z] of [[24, 30], [38, 30], [27, 45], [35, 45]]) { if (z === 45) continue; toro(w, x, 4, z); }
for (const [x, z] of [[19, 31], [43, 31], [19, 55], [43, 55]]) toro(w, x, 4, z);
// cerezos en las esquinas del patio, volcados sobre el agua
cherry(w, 21, 4, 31, 3, 1); cherry(w, 41, 4, 31, 5, 1); cherry(w, 21, 4, 56, 7, 1); cherry(w, 41, 4, 56, 9, 1);

// ── 3. Sala de la Estrella (All the Mods) ────────────────────────────────
const AS = 'allthemodium:ancient_stone_bricks', AP = 'allthemodium:ancient_polished_stone', ASM = 'allthemodium:ancient_smooth_stone';
for (let x = 9; x <= 53; x++) for (let z = 4; z <= 28; z++) for (let y = 4; y <= 5; y++) {
  const edge = x === 9 || x === 53 || z === 4 || z === 28;
  w.set(x, y, z, edge ? (y === 5 ? AP : AS) : y === 5 ? 'minecraft:dark_oak_planks' : 'minecraft:stone');
}
for (let x = 26; x <= 36; x++) { w.stair(x, 5, 28, 'allthemodium:ancient_polished_stone_stairs', 's'); w.stair(x, 4, 29, 'allthemodium:ancient_polished_stone_stairs', 's'); }
for (const x of [25, 37]) { w.box(x, 4, 28, x, 5, 29, AS); lamp(x, 6, 29, 'mcwlights:red_paper_lamp'); }
const hallDoor = (x, z) => z === 26 && x >= 29 && x <= 33;
walls(w, { x0: 11, z0: 6, x1: 51, z1: 26, y0: 6, y1: 16, m: { ...WALL, windowY: [7, 9] }, door: hallDoor, doorH: 6, nukiAt: 5 });
// tejado intermedio (mokoshi) alrededor, y porche con hastial sobre la escalinata
const porch = (x, z) => x >= 24 && x <= 38 && z >= 26;
roof(w, { x0: 11, z0: 6, x1: 51, z1: 26, y: 11, over: 2, mat: R, stopAt: 2, ornaments: false, skip: porch });
for (const x of [25, 37]) for (let y = 4; y <= 10; y++) w.log(x, y, 30, WALL.post, 'y');
for (let x = 25; x <= 37; x++) w.log(x, 11, 30, WALL.beam, 'x');
roof(w, { x0: 25, z0: 27, x1: 37, z1: 30, y: 11, over: 1, mat: RG, axis: 'z', gable: 0, flat: 2 });
roof(w, { x0: 11, z0: 6, x1: 51, z1: 26, y: 16, over: 3, mat: RG, gable: 5 });
// interior: artesonado, columnas rojas, estrado de la estrella
for (let x = 12; x <= 50; x++) for (let z = 7; z <= 25; z++) w.set(x, 16, z, (x - 11) % 4 === 0 || (z - 6) % 4 === 0 ? 'minecraft:stripped_dark_oak_log' : 'minecraft:mangrove_planks', (x - 11) % 4 === 0 || (z - 6) % 4 === 0 ? { axis: (x - 11) % 4 === 0 ? 'z' : 'x' } : undefined);
for (const x of [19, 43]) for (const z of [10, 14, 18, 22]) { w.box(x, 6, z, x, 15, z, 'minecraft:stripped_mangrove_log', { axis: 'y' }); w.set(x, 6, z, AP); }
for (let x = 30; x <= 32; x++) for (let z = 22; z <= 25; z++) w.set(x, 5, z, ASM);            // pasillo de la puerta al estrado
const CX = 31, CZ = 16;
for (let x = CX - 6; x <= CX + 6; x++) for (let z = CZ - 6; z <= CZ + 6; z++) {
  const d = Math.hypot(x - CX, z - CZ);
  if (d <= 6.4) w.set(x, 6, z, d > 5.6 ? AS : ASM);
  if (d <= 3.2) w.set(x, 7, z, d > 2.4 ? AS : AP);
}
w.set(CX, 8, CZ, 'allthetweaks:atm_star_block'); ped(CX, 9, CZ, 'allthetweaks:atm_star');
const INGR = ['allthetweaks:pulsating_black_hole', 'allthetweaks:dimensional_seed', 'allthetweaks:dragon_soul', 'allthetweaks:improbable_probability_device', 'allthetweaks:nexium_emitter', 'allthetweaks:oblivion_shard', 'allthetweaks:philosophers_fuel', 'allthetweaks:withers_compass', 'allthetweaks:allthecatalystium'];
const RING = [[0, -5], [-3, -4], [-5, -1], [-4, 3], [-2, 5], [2, 5], [4, 3], [5, -1], [3, -4]];
RING.forEach(([dx, dz], i) => ped(CX + dx, 7, CZ + dz, INGR[i]));
// anillo de faroles dorados colgando sobre el estrado
for (const [dx, dz] of [[0, -4], [0, 4], [-4, 0], [4, 0], [-3, -3], [3, -3], [-3, 3], [3, 3]]) hang(CX + dx, 12, CZ + dz, 'chipped:golden_paper_soul_lantern', 3);
hang(CX, 13, CZ, 'minecraft:lantern', 2);
// altar del fondo: trofeo de ATM entre las estrellas, con columnas de los tres metales
for (let x = 23; x <= 39; x++) for (let z = 7; z <= 9; z++) w.set(x, 6, z, z === 9 ? AP : AS);
for (let x = 26; x <= 36; x++) for (let z = 7; z <= 8; z++) w.set(x, 7, z, AP);
w.set(31, 8, 7, 'allthetweaks:trophy_atm'); w.set(28, 8, 7, 'allthetweaks:nether_star_block'); w.set(34, 8, 7, 'allthetweaks:greg_star_block');
for (const [x, m] of [[24, 'allthemodium:allthemodium_block'], [31, 'allthemodium:unobtainium_block'], [38, 'allthemodium:vibranium_block']]) { const y0 = x === 31 ? 10 : 7; w.box(x, y0, 7, x, 13, 7, m); w.set(x, 14, 7, 'minecraft:gold_block'); }
lamp(26, 8, 8); lamp(36, 8, 8);
// naves laterales: metales ATM (oeste) y tesoros de la estrella (este), tres pedestales por crujía
const AISLE_W = [
  ['allthemodium:raw_allthemodium', 'allthemodium:allthemodium_ingot', 'allthemodium:allthemodium_mace', 'allthemodium:allthemodium_block'],
  ['allthemodium:raw_vibranium', 'allthemodium:vibranium_ingot', 'allthemodium:vibranium_mace', 'allthemodium:vibranium_block'],
  ['allthemodium:raw_unobtainium', 'allthemodium:unobtainium_ingot', 'allthemodium:unobtainium_mace', 'allthemodium:unobtainium_block'],
  ['allthemodium:vibranium_allthemodium_alloy_ingot', 'allthemodium:unobtainium_allthemodium_alloy_ingot', 'allthemodium:unobtainium_vibranium_alloy_ingot', 'allthemodium:unobtainium_vibranium_alloy_block'],
  ['allthemodium:allthemodium_upgrade_smithing_template', 'allthemodium:vibranium_upgrade_smithing_template', 'allthemodium:unobtainium_upgrade_smithing_template', AP],
];
const AISLE_E = [
  ['allthetweaks:patrick_star', 'allthetweaks:atm_star_shard', 'allthetweaks:greg_star', 'allthetweaks:atm_star_block'],
  ['allthemodium:piglich_heart', 'minecraft:nether_star', 'minecraft:dragon_egg', 'allthemodium:piglich_heart_block'],
  ['powah:energy_cell_creative', 'pneumaticcraft:creative_compressor', 'modularrouters:creative_module', AP],
  ['allthemodium:allthemodium_pickaxe', 'allthemodium:vibranium_sword', 'allthemodium:unobtainium_pickaxe', AP],
  ['allthemodium:allthemodium_chestplate', 'allthemodium:vibranium_chestplate', 'allthemodium:unobtainium_chestplate', AP],
];
[7, 11, 15, 19, 23].forEach((z0, i) => {
  for (const [x, wall, list] of [[13, 12, AISLE_W[i]], [49, 50, AISLE_E[i]]]) {
    for (let z = z0; z <= z0 + 2; z++) { w.set(wall, 6, z, AS); w.set(x, 6, z, z === z0 + 1 ? list[3] : AP); ped(x, 7, z, list[z - z0]); }
    hang(x, 13, z0 + 1, 'minecraft:lantern', 2);
  }
});
for (const z of [12, 20]) { lamp(19, 6, z); lamp(43, 6, z); }
for (const z of [10, 22]) for (const x of [24, 38]) hang(x, 13, z, 'mcwlights:white_paper_lamp', 2);

// ── 4. Alas: muros japoneses por fuera, materiales del mod por dentro ─────
function wing({ x0, x1, side, base, line, pillar, floor, runner, ceil, light, label, stations, north, south, accent }) {
  const z0 = 31, z1 = 59, door = side === 'e' ? x1 : x0;
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 1; z++) w.set(x, 4, z, base(x, z));
  const isDoor = (x, z) => x === door && z >= 44 && z <= 46;
  walls(w, { x0, z0, x1, z1, y0: 5, y1: 12, m: { ...WALL, windowY: [5, 6] }, door: isDoor, doorH: 4, nukiAt: 4 });
  roof(w, { x0, z0, x1, z1, y: 12, over: 2, mat: R, gable: 3 });
  // escalón y faroles de la puerta
  const ox = side === 'e' ? x1 + 1 : x0 - 1, dir = side === 'e' ? 'w' : 'e';
  for (let z = 44; z <= 46; z++) w.stair(ox, 4, z, 'minecraft:stone_brick_stairs', side === 'e' ? 'e' : 'w');
  lamp(ox, 5, 43, label); lamp(ox, 5, 47, label);
  // forro interior del mod (muro doble), suelo, techo
  const ix0 = x0 + 1, ix1 = x1 - 1, iz0 = z0 + 1, iz1 = z1 - 1;
  for (let z = iz0; z <= iz1; z++) for (let y = 5; y <= 11; y++) for (const x of [ix0, ix1]) {
    if (x === (side === 'e' ? ix1 : ix0) && z >= 44 && z <= 46 && y <= 8) continue;
    w.set(x, y, z, (z - z0) % 4 === 0 ? pillar : y === 5 || y === 11 ? accent : line);
  }
  for (let x = ix0; x <= ix1; x++) for (let y = 5; y <= 11; y++) for (const z of [iz0, iz1]) w.set(x, y, z, (x === ix0 || x === ix1) ? pillar : y === 5 || y === 11 ? accent : line);
  for (let x = ix0 + 1; x <= ix1 - 1; x++) for (let z = iz0 + 1; z <= iz1 - 1; z++) { w.set(x, 4, z, x === (x0 + x1) / 2 ? runner : floor); w.set(x, 12, z, ceil); }
  for (let z = 44; z <= 46; z++) for (let x = Math.min(door, side === 'e' ? ix1 : ix0); x <= Math.max(door, side === 'e' ? ix1 : ix0); x++) w.set(x, 4, z, runner);
  // estaciones: plinto del material del jefe, arma en el centro, ojo y trofeo a los lados
  const wallX = side === 'e' ? ix0 + 1 : ix1 - 1, doorX = side === 'e' ? ix1 - 1 : ix0 + 1;
  const bays = [[36, 38], [40, 42], [44, 46], [48, 50], [52, 54]];
  const slots = [...bays.map(b => [wallX, b]), ...bays.filter(b => b[0] !== 44).map(b => [doorX, b])];
  stations.forEach((s, i) => {
    const [x, [za]] = slots[i];
    for (let k = 0; k < 3; k++) {
      const z = za + k;
      if (s.trophy && k === 1) { w.set(x, 5, z, s.plinth); w.set(x, 6, z, 'twilightforest:trophy_pedestal'); w.set(x, 7, z, s.trophy); continue; }
      w.set(x, 5, z, k === 1 ? s.plinth : accent); ped(x, 6, z, s.items[k]);
    }
    hang(x, 10, za + 1, side === 'e' ? 'minecraft:soul_lantern' : 'minecraft:lantern', 1);
  });
  // cabeceras: pieza central al norte y al sur
  north(Math.round((x0 + x1) / 2), iz0 + 1); south(Math.round((x0 + x1) / 2), iz1 - 1);
  for (const z of [36, 40, 50, 54]) hang(Math.round((x0 + x1) / 2), 10, z, light, 1);
}

const C = { ob: 'cataclysm:obsidian_bricks', po: 'cataclysm:polished_obsidian', pil: 'cataclysm:obsidian_pillar', ch: 'cataclysm:chiseled_obsidian_bricks' };
wing({
  x0: 4, x1: 16, side: 'e', label: 'mcwlights:purple_paper_lamp', light: 'cataclysm:void_lantern_block',
  base: (x, z) => mix(C.ob, C.ch, 12, x, 4, z), line: C.ob, pillar: C.pil, accent: C.ch, floor: C.po, runner: 'minecraft:purple_carpet', ceil: 'minecraft:crying_obsidian',
  stations: [
    { plinth: 'minecraft:netherite_block', items: ['cataclysm:monstrous_eye', 'cataclysm:infernal_forge', 'cataclysm:monstrous_helm'] },
    { plinth: 'cataclysm:enderite_block', items: ['cataclysm:void_eye', 'cataclysm:gauntlet_of_guard', 'cataclysm:void_forge'] },
    { plinth: 'cataclysm:ignitium_block', items: ['cataclysm:flame_eye', 'cataclysm:the_incinerator', 'cataclysm:bulwark_of_the_flame'] },
    { plinth: 'cataclysm:witherite_block', items: ['cataclysm:mech_eye', 'cataclysm:wither_assault_shoulder_weapon', 'cataclysm:laser_gatling'] },
    { plinth: 'cataclysm:azure_seastone_bricks', items: ['cataclysm:abyss_eye', 'cataclysm:tidal_claws', 'cataclysm:abyssal_sacrifice'] },
    { plinth: 'cataclysm:ancient_metal_block', items: ['cataclysm:desert_eye', 'cataclysm:wrath_of_the_desert', 'cataclysm:sandstorm_in_a_bottle'] },
    { plinth: 'cataclysm:cursium_block', items: ['cataclysm:cursed_eye', 'cataclysm:the_annihilator', 'cataclysm:soul_render'] },
    { plinth: 'cataclysm:polished_azure_seastone', items: ['cataclysm:storm_eye', 'cataclysm:ceraunus', 'cataclysm:astrape'] },
    { plinth: 'cataclysm:black_steel_block', items: ['cataclysm:khopesh', 'cataclysm:meat_shredder', 'cataclysm:coral_bardiche'] },
  ],
  north: (x, z) => { w.set(x, 5, z, C.ch); w.set(x, 6, z, 'cataclysm:goddess_statue'); w.set(x - 2, 5, z, 'cataclysm:altar_of_fire'); w.set(x + 2, 5, z, 'cataclysm:altar_of_void'); hang(x, 10, z + 1, 'cataclysm:void_lantern_block', 1); },
  south: (x, z) => { ped(x - 1, 6, z - 1, 'cataclysm:ignitium_ingot', 'cataclysm:ignitium_block'); ped(x + 1, 6, z - 1, 'cataclysm:cursium_ingot', 'cataclysm:cursium_block'); w.set(x, 5, z, 'cataclysm:mechanical_fusion_anvil'); w.set(x - 2, 5, z, 'cataclysm:altar_of_abyss'); w.set(x + 2, 5, z, 'cataclysm:altar_of_amethyst'); w.set(x - 3, 5, z, 'cataclysm:aptrgangr_head'); w.set(x + 3, 5, z, 'cataclysm:kobolediator_skull'); },
});
const T = { cb: 'twilightforest:castle_brick', mcb: 'twilightforest:mossy_castle_brick', ccb: 'twilightforest:cracked_castle_brick', pil: 'twilightforest:encased_castle_brick_pillar', dk: 'twilightforest:dark_planks', bold: 'twilightforest:bold_castle_brick_tile' };
wing({
  x0: 46, x1: 58, side: 'w', label: 'mcwlights:green_paper_lamp', light: 'twilightforest:firefly_jar',
  base: (x, z) => mix(mix(T.cb, T.mcb, 25, x, 4, z), T.ccb, 10, z, x, 4), line: T.cb, pillar: T.pil, accent: T.bold, floor: T.dk, runner: 'minecraft:green_carpet', ceil: 'twilightforest:canopy_planks',
  stations: [
    { plinth: T.mcb, trophy: 'twilightforest:naga_trophy', items: ['twilightforest:naga_scale', null, 'twilightforest:naga_chestplate'] },
    { plinth: T.mcb, trophy: 'twilightforest:lich_trophy', items: ['twilightforest:twilight_scepter', null, 'twilightforest:lifedrain_scepter'] },
    { plinth: T.mcb, trophy: 'twilightforest:minoshroom_trophy', items: ['twilightforest:diamond_minotaur_axe', null, 'twilightforest:meef_stroganoff'] },
    { plinth: T.mcb, trophy: 'twilightforest:hydra_trophy', items: ['twilightforest:fiery_blood', null, 'twilightforest:fiery_sword'] },
    { plinth: T.mcb, trophy: 'twilightforest:knight_phantom_trophy', items: ['twilightforest:phantom_helmet', null, 'twilightforest:knightmetal_sword'] },
    { plinth: T.mcb, trophy: 'twilightforest:ur_ghast_trophy', items: ['twilightforest:fiery_tears', null, 'twilightforest:carminite'] },
    { plinth: T.mcb, trophy: 'twilightforest:alpha_yeti_trophy', items: ['twilightforest:alpha_yeti_fur', null, 'twilightforest:yeti_helmet'] },
    { plinth: T.mcb, trophy: 'twilightforest:snow_queen_trophy', items: ['twilightforest:ice_bow', null, 'twilightforest:ice_sword'] },
    { plinth: T.mcb, trophy: 'twilightforest:quest_ram_trophy', items: ['twilightforest:crumble_horn', null, 'twilightforest:charm_of_life_2'] },
  ],
  // portal del Crepúsculo: charca de 2×2 rodeada de flores y hierba (al norte) · mesa de desfabricar al sur
  north: (x, z) => { for (let dx = -2; dx <= 1; dx++) for (let dz = 0; dz <= 3; dz++) { const inner = dx >= -1 && dx <= 0 && dz >= 1 && dz <= 2; w.set(x + dx, 4, z + dz, inner ? 'minecraft:water' : 'minecraft:grass_block'); if (!inner) w.set(x + dx, 5, z + dz, (dx + dz) % 2 ? 'minecraft:poppy' : 'minecraft:oxeye_daisy'); } },
  south: (x, z) => { ped(x - 2, 6, z - 1, 'twilightforest:giant_pickaxe', 'twilightforest:knightmetal_block'); ped(x, 6, z - 2, 'twilightforest:lamp_of_cinders', 'twilightforest:fiery_block'); ped(x + 2, 6, z - 1, 'twilightforest:giant_sword', 'twilightforest:knightmetal_block'); w.set(x, 5, z, 'twilightforest:uncrafting_table'); w.set(x - 2, 5, z, 'twilightforest:keepsake_casket'); w.set(x + 2, 5, z, 'twilightforest:cinder_furnace', { facing: 'north' }); },
});
// pedestales con trofeo: el del centro de cada estación ya lleva el trofeo; el null del medio no va (el trofeo ocupa)

// ── 5. Puerta sur (sanmon) con dos salas: jefes clásicos y otros mundos ───
const gateDoor = (x, z) => (z === 57 || z === 65) && x >= 29 && x <= 33;
walls(w, { x0: 21, z0: 57, x1: 41, z1: 65, y0: 4, y1: 11, m: { ...WALL, windowY: [3, 4] }, door: gateDoor, doorH: 6, nukiAt: 3 });
for (const x of [28, 34]) for (let z = 58; z <= 64; z++) for (let y = 4; y <= 11; y++) w.set(x, y, z, (z - 57) % 4 === 0 || y === 4 || y === 11 ? WALL.beam : WALL.plaster, (z - 57) % 4 === 0 || y === 4 || y === 11 ? { axis: (z - 57) % 4 === 0 ? 'y' : 'z' } : undefined);
for (const x of [28, 34]) for (let y = 4; y <= 6; y++) for (const z of [59, 60]) w.del(x, y, z);               // puertas a las salas laterales
roof(w, { x0: 21, z0: 57, x1: 41, z1: 65, y: 11, over: 2, mat: R, gable: 3 });
for (let x = 29; x <= 33; x++) for (let z = 57; z <= 65; z++) w.set(x, 10, z, 'minecraft:dark_oak_planks');   // techo del paso
hang(31, 9, 59, 'chipped:red_paper_lantern'); hang(31, 9, 63, 'chipped:red_paper_lantern');
for (const [x, z] of [[28, 66], [34, 66], [28, 56], [34, 56]]) lamp(x, 4, z, 'mcwlights:red_paper_lamp');
// salas de la puerta: 8 expositores junto a los muros (sin tapar la puerta del paso) y una pieza en el centro
const room = (x0, outer, list, center) => {
  for (let x = x0; x <= x0 + 5; x++) for (let z = 58; z <= 64; z++) { w.set(x, 3, z, 'minecraft:spruce_planks'); w.set(x, 11, z, 'minecraft:dark_oak_planks'); }
  const inner = outer === x0 ? x0 + 5 : x0;                       // columna junto al paso (ahí está la puerta)
  const spots = [[x0 + 1, 58], [x0 + 3, 58], [outer, 58], [outer, 60], [outer, 62], [outer, 64], [x0 + 3, 64], [x0 + 1, 64]].map(([x, z]) => [x === inner ? x0 + 2 : x, z]);
  list.forEach((it, i) => { const [x, z] = spots[i]; if (it.block) { w.set(x, 4, z, 'minecraft:polished_andesite'); w.set(x, 5, z, it.block); } else ped(x, 5, z, it, 'minecraft:polished_andesite'); });
  const cx = outer === x0 ? x0 + 3 : x0 + 2; w.set(cx, 4, 61, 'minecraft:chiseled_stone_bricks'); w.set(cx, 5, 61, center);
  hang(x0 + 2, 9, 59, 'minecraft:lantern', 1); hang(x0 + 3, 9, 63, 'minecraft:lantern', 1);
};
room(22, 22, ['minecraft:nether_star', { block: 'minecraft:wither_skeleton_skull' }, 'minecraft:totem_of_undying', { block: 'minecraft:dragon_head' }, 'minecraft:elytra', 'minecraft:heart_of_the_sea', 'minecraft:echo_shard', 'deeperdarker:heart_of_the_deep'], 'minecraft:dragon_egg');
room(35, 40, ['aether:victory_medal', 'aether:valkyrie_lance', 'aether:hammer_of_kingbdogz', 'iceandfire:fire_dragon_heart', 'iceandfire:dragonsteel_ice_ingot', 'draconicevolution:chaos_shard', 'draconicevolution:dragon_heart', 'draconicevolution:chaotic_core'], 'iceandfire:dragon_bone_block');
// muros bajos (tsuijibei) que cierran el patio entre la puerta y las alas
for (const [xa, xb] of [[18, 20], [42, 44]]) for (let x = xa; x <= xb; x++) { w.set(x, 4, 60, 'minecraft:stone_bricks'); w.set(x, 5, 60, WALL.plaster); w.set(x, 6, 60, WALL.plaster); w.stair(x, 7, 59, R.stairs, 'n'); w.stair(x, 7, 61, R.stairs, 's'); w.set(x, 7, 60, R.block); }

// ── 6. Jardín delantero, camino y torii ───────────────────────────────────
for (let z = 70; z <= GZ; z++) for (let x = 29; x <= 33; x++) w.set(x, 0, z, x === 29 || x === 33 ? 'minecraft:gravel' : (z % 2 ? 'minecraft:polished_andesite' : 'minecraft:andesite'));
const TP = 'minecraft:stripped_mangrove_log', TK = 'minecraft:polished_blackstone';
for (const x of [27, 35]) { w.set(x, 1, 76, 'minecraft:stone_bricks'); for (let y = 2; y <= 7; y++) w.log(x, y, 76, TP, 'y'); }
for (let x = 26; x <= 36; x++) if (x !== 27 && x !== 35) w.log(x, 5, 76, TP, 'x');                       // nuki
for (let x = 26; x <= 36; x++) w.set(x, 8, 76, 'minecraft:mangrove_planks');  // shimaki
w.set(31, 7, 76, 'minecraft:mangrove_planks');                                 // gakuzuka
for (let x = 25; x <= 37; x++) w.set(x, 9, 76, TK);                           // kasagi
w.stair(24, 9, 76, 'minecraft:polished_blackstone_stairs', 'w', { top: true }); w.stair(38, 9, 76, 'minecraft:polished_blackstone_stairs', 'e', { top: true });
w.slab(24, 10, 76, 'minecraft:polished_blackstone_slab'); w.slab(38, 10, 76, 'minecraft:polished_blackstone_slab');
for (const z of [72, 80]) for (const x of [26, 36]) toro(w, x, 1, z);
cherry(w, 46, 1, 73, 13, 2); cherry(w, 22, 1, 79, 11, 1); toro(w, 50, 1, 79);
// rincones traseros del podio: jardín de musgo con azaleas y farol de piedra
for (const [bx, bz] of [[5, 28], [57, 28]]) { for (let dx = -2; dx <= 2; dx++) for (let dz = -1; dz <= 1; dz++) { w.set(bx + dx, 3, bz + dz, 'minecraft:moss_block'); if ((dx + dz) % 2 === 0 && dx) w.set(bx + dx, 4, bz + dz, (dx + 2 * dz) % 3 ? 'minecraft:flowering_azalea' : 'minecraft:azalea'); } toro(w, bx, 4, bz); }
// pagoda al oeste del jardín delantero (hito vertical que se ve desde el patio por encima del portón)
pagoda(w, 12, 1, 74, { mat: R, wallM: WALL });

// ── 7. Faroles colgados de los aleros que dan al patio ────────────────────
for (const z of [35, 39, 51, 55]) { hang(18, 11, z); hang(44, 11, z); }
for (const x of [15, 23, 39, 47]) hang(x, 10, 28, 'chipped:red_paper_lantern');
for (const x of [23, 39]) { hang(x, 10, 55); hang(x, 10, 67); }

// ── 8. Luz en los desvanes: dentro de los tejados no aparecen monstruos ───
for (const x of [15, 23, 31, 39, 47]) for (const z of [9, 16, 23]) w.set(x, 17, z, 'minecraft:lantern');
for (const x of [10, 52]) for (const z of [34, 40, 46, 52, 58]) w.set(x, 13, z, 'minecraft:lantern');
for (const x of [24, 38]) w.set(x, 12, 61, 'minecraft:lantern'); w.set(31, 11, 61, 'minecraft:lantern');
// faroles bajo el tejado intermedio de la sala, por detrás y por los lados
for (let x = 15; x <= 47; x += 8) hang(x, 10, 4);
for (let z = 10; z <= 22; z += 6) { hang(9, 10, z); hang(53, 10, z); }
for (let z = 34; z <= 58; z += 8) { hang(2, 11, z); hang(60, 11, z); }
for (const x of [6, 14, 48, 56]) hang(x, 11, 61);
for (const [x, z] of [[8, 70], [16, 70], [8, 78], [16, 78]]) hang(x, 4, z);
for (const x of [27, 35]) w.set(x, 12, 28, 'minecraft:lantern');

// ── salida ────────────────────────────────────────────────────────────────
if (process.argv.includes('--sec')) { console.log(section(w, { x: 31, y0: 0, y1: 32, a0: 0, a1: 82 })); process.exit(0); }
const { ctx, model, tool } = await toDesign(w, { title: 'Templo de los Trofeos', workspaceId: 'atm10-mio' });
const ZONES = [
  { n: 'Vista general', p: [31, 52, 118], t: [31, 6, 36] },
  { n: 'Torii y entrada', p: [31, 8, 96], t: [31, 8, 66] },
  { n: 'Patio y progresión', p: [31, 21, 58], t: [31, 5, 37] },
  { n: 'Sala de la Estrella', p: [31, 11, 24], t: [31, 8, 14], aw: false },
  { n: 'Ala de Cataclysm', p: [10, 9, 57], t: [10, 6, 36], aw: false },
  { n: 'Ala del Crepúsculo', p: [52, 9, 57], t: [52, 6, 36], aw: false },
  { n: 'Tejados', p: [-14, 44, 2], t: [31, 12, 30] },
  { n: 'Planta', p: [31, 110, 38], t: [31, 0, 37] },
];
const doc = withModel(ctx.design, { ZONES, WALLS: { x0: -1, x1: GX + 1, z0: -1, z1: GZ + 1, top: 999 } });
writeFileSync(new URL('templo.json', import.meta.url), JSON.stringify(doc));
await saveLocal(doc, { id: 'TEMPLOtest01', slug: 'templo-trofeos-prueba', title: 'Templo de los Trofeos (prueba)' });
console.log('bloques', model.BLOCKS.length, 'expositores', (model.DISPLAYS || []).length, 'paleta', Object.keys(model.P).length);
if (process.argv.includes('--review')) console.log((await tool('review_design', {})).slice(0, 3000));
