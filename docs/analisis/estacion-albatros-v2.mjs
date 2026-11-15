// Estación aérea Albatros v2 — mismas mecánicas (comprobadas en el pack), construcción hecha con oficio:
// suelos y cubiertas de bloques enteros, perfil del casco con escaleras solo en los escalones (bajo el voladizo, mirando al casco),
// cristal solo en paredes rectas, ménsulas macizas y cables siempre escondidos (sentina, pilares forrados, capa intermedia).
import { runTool } from 'file:///C:/Users/mique/Proyectos/Craftometry/server/src/llm/tools.js';
import { writeFileSync } from 'node:fs';
import { encode } from 'file:///C:/Users/mique/Proyectos/Craftometry/server/src/design/format.js';
const OUT = 'C:/Users/mique/AppData/Local/Temp/claude/09b9b23e0419701f/14ff7dd9-3d96-4484-acca-6e0bddcd938a/scratchpad/';
const ctx = { workspaceId: 'PUCbHICF0Qrz', lang: 'es', design: encode({ TITLE: 'Estación aérea Albatros', P: {}, BLOCKS: [], W: 1, H: 1 }), saveDesign() {} };

const code = String.raw`
const CZ = 35, YB = 4, YL = 9, YH = 14, YD = 24, mir = z => 2 * CZ - z;
const DK = 'minecraft:dark_oak_planks', SP = 'minecraft:spruce_planks', DKST = 'minecraft:dark_oak_stairs', SPST = 'minecraft:spruce_stairs';
const DLOG = 'minecraft:dark_oak_log', SDLOG = 'minecraft:stripped_dark_oak_log', BIR = 'minecraft:birch_planks', YW = 'minecraft:yellow_wool', SEAL = 'minecraft:sea_lantern';
const PANE = 'minecraft:glass_pane', FEN = 'minecraft:dark_oak_fence', LAMP = 'minecraft:lantern', CU = 'create:copper_casing', CUST = 'minecraft:waxed_cut_copper_stairs', CUB = 'minecraft:waxed_cut_copper';
const ENV = 'aeronautics:white_envelope', ENVR = 'aeronautics:red_envelope', ENVG = 'aeronautics:light_gray_envelope';
const CAB = 'powah:energy_cable_niotic', LINK = 'create:redstone_link', THR = 'createpropulsion:ion_thruster';
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' }, D4 = [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 's'], [0, -1, 'n']];
const link = (x, y, z, facing) => set(x, y, z, LINK, { facing, receiver: 'true' });
const sender = (x, y, z, facing) => set(x, y, z, LINK, { facing, receiver: 'false' });
const thr = (x, y, z, facing) => set(x, y, z, THR, { facing, multi: 'false' });
const cab = pts => { for (let i = 1; i < pts.length; i++) route(pts[i - 1], pts[i], { block: CAB, order: 'xzy' }); };
const axisOf = d => (d === 'n' || d === 's' ? 'x' : 'z');            // un tronco a lo largo de un borde que mira a d

// ── 1. Casco: planta (media manga por x) y perfil (lo que entra cada capa por debajo de la cubierta inferior) ──
const hw = x => x < 8 || x > 150 ? -1 : x <= 18 ? 14 + Math.round(3 * (x - 8) / 10) : x <= 112 ? 17 : Math.round(17 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 112) / 39, 2))));
const INSET = { 8: 1, 7: 2, 6: 4, 5: 7, 4: 11 };
const H = (x, y) => { if (y < YB || y > YD) return -1; const w = hw(x); if (w < 0) return -1; const h = w - (INSET[y] || 0); return y < YL && h < 2 ? -1 : h; };
const inR = (x, y, z) => { const h = H(x, y); return h >= 0 && Math.abs(z - CZ) <= h; };
const straightSide = (x, y, z) => { const out = z < CZ ? -1 : 1; return x >= 20 && x <= 110 && !inR(x, y, z + out) && inR(x, y, z - out) && inR(x - 1, y, z) && !inR(x - 1, y, z + out) && inR(x + 1, y, z) && !inR(x + 1, y, z + out); };
for (let x = 8; x <= 150; x++) for (let y = YB; y <= YD; y++) for (let z = CZ - 17; z <= CZ + 17; z++) {
  if (!inR(x, y, z)) continue;
  const open = D4.filter(([dx, dz]) => !inR(x + dx, y, z + dz)).map(d => d[2]), edge = open.length > 0, bottom = !inR(x, y - 1, z);
  if (y === YD) { if (edge) log(x, y, z, SDLOG, axisOf(open[0])); else set(x, y, z, DK); continue; }   // cubierta de vuelo maciza, con canto de tronco
  if (!edge && !bottom) { if (y === YL || y === YH) set(x, y, z, SP); continue; }                       // suelos interiores macizos
  if (y === 4 && z === CZ) { log(x, y, z, SDLOG, 'x'); continue; }                                         // quilla
  if (edge && (y === YL || y === YH)) { log(x, y, z, SDLOG, axisOf(open[0])); continue; }                  // cintas
  if (edge && x > 8 && x % 8 === 0 && y > YH && straightSide(x, y, z)) { log(x, y, z, DLOG, 'y'); continue; }   // cuadernas
  if (edge && straightSide(x, y, z) && ((y >= 11 && y <= 12 && x % 8 >= 3 && x % 8 <= 4) || (y >= 18 && y <= 20 && x % 8 >= 3 && x % 8 <= 5))) { set(x, y, z, PANE); continue; }
  set(x, y, z, y <= YH - 1 ? DK : SP);
}
// pantoque: en cada escalón, una escalera invertida bajo el voladizo, con el lado alto contra el casco
for (let x = 8; x <= 150; x++) for (let y = YB; y < YL; y++) for (let z = CZ - 17; z <= CZ + 17; z++) {
  if (inR(x, y, z) || !inR(x, y + 1, z)) continue;
  const ins = D4.filter(([dx, dz]) => inR(x + dx, y, z + dz));
  if (ins.length === 1) stair(x, y, z, DKST, OPP[ins[0][2]], { top: true }); else if (ins.length > 1) set(x, y, z, DK);
}
// portón de popa del hangar con marco de troncos
for (let y = YH + 1; y <= YD - 2; y++) for (let z = CZ - 12; z <= CZ + 12; z++) del(8, y, z);
for (let y = YH + 1; y <= YD - 1; y++) for (const z of [CZ - 13, CZ + 13]) log(8, y, z, DLOG, 'y');
for (let z = CZ - 13; z <= CZ + 13; z++) log(8, YD - 1, z, SDLOG, 'z');

// ── 2. Cubierta de vuelo: pista, bordes, helipuertos, luces enrasadas y barandilla en proa ──
for (let x = 12; x <= 142; x++) { if (x % 6 < 3) set(x, YD, CZ, BIR); for (const z of [CZ - 14, CZ + 14]) if (inR(x, YD, z) && inR(x, YD, z + (z < CZ ? -1 : 1))) set(x, YD, z, BIR); }
const PADS = [44, 76, 108];
for (const hx of PADS) for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) { const d = Math.hypot(dx, dz); if (d > 4.4 && d <= 5.4) set(hx + dx, YD, CZ - 7 + dz, BIR); }
for (const hx of PADS) for (let k = -2; k <= 2; k++) { set(hx + k, YD, CZ - 9, YW); set(hx + k, YD, CZ - 5, YW); set(hx, YD, CZ - 7 + k, YW); }
for (let x = 20; x <= 136; x += 8) for (const z of [CZ - 15, CZ + 15]) if (inR(x, YD, z) && inR(x, YD, z + (z < CZ ? -1 : 1))) set(x, YD, z, SEAL);
for (let x = 131; x <= 150; x++) for (let z = CZ - 17; z <= CZ + 17; z++) if (inR(x, YD, z) && D4.some(([dx, dz]) => !inR(x + dx, YD, z + dz))) set(x, YD + 1, z, FEN);
for (let z = CZ - 14; z <= CZ + 14; z++) set(8, YD + 1, z, FEN);

// ── 3. Hangar (y 15-23): vigas, faroles, pasarelas con ménsulas, plazas y drones ──
for (let x = 16; x <= 104; x += 8) {
  for (let z = CZ - 16; z <= CZ + 16; z++) log(x, YD - 1, z, SDLOG, 'z');
  for (const z of [CZ - 7, CZ + 7]) set(x, YD - 2, z, LAMP, { hanging: 'true' });
}
for (let x = 12; x <= 110; x++) for (const s of [-1, 1]) {
  if (x % 8 === 0) continue;
  set(x, 19, CZ + s * 16, SP); set(x, 19, CZ + s * 15, SP); set(x, 20, CZ + s * 15, FEN);
  if (x % 8 === 4) { set(x, 18, CZ + s * 16, SP); stair(x, 18, CZ + s * 15, SPST, s < 0 ? 's' : 'n', { top: true }); }
}
for (const [z0, z1] of [[CZ - 14, CZ - 2], [CZ + 2, CZ + 14]]) for (let i = 0; i < 5; i++) {
  const x0 = 14 + i * 15, x1 = x0 + 13;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) set(x, YH, z, YW);
  const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1; set(cx, YH, cz, 'simulated:docking_connector', { facing: 'up' }); link(cx, YH - 1, cz, 'down');
}
for (const x of [86, 91, 96, 101]) for (const z of [CZ - 6, CZ - 2, CZ + 2, CZ + 6]) {
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) set(x + dx, YH, z + dz, 'minecraft:cyan_wool');
  set(x, YH, z, 'simulated:docking_connector', { facing: 'up' }); link(x, YH - 1, z, 'down');
}
// mamparo de proa con puerta, mirador con mesas y librerías
for (let y = YH + 1; y <= YD - 1; y++) for (let z = CZ - 17; z <= CZ + 17; z++) if (inR(112, y, z) && !D4.some(([dx, dz]) => !inR(112 + dx, y, z + dz))) set(112, y, z, SP);
del(112, YH + 1, CZ); del(112, YH + 2, CZ); set(112, YH + 1, CZ, 'minecraft:spruce_door', { half: 'lower', facing: 'east' }); set(112, YH + 2, CZ, 'minecraft:spruce_door', { half: 'upper', facing: 'east' });
for (let x = 117; x <= 133; x += 4) for (const z of [CZ - 5, CZ + 5]) { if (!inR(x, YH + 1, z + 2) || !inR(x, YH + 1, z - 2)) continue; set(x, YH + 1, z, FEN); set(x, YH + 2, z, 'minecraft:spruce_trapdoor', { half: 'top' }); stair(x, YH + 1, z - 1, SPST, 'n'); stair(x, YH + 1, z + 1, SPST, 's'); }
for (let z = CZ - 10; z <= CZ + 10; z++) if (z !== CZ && Math.abs(z - CZ) !== 11) { set(113, YH + 1, z, 'minecraft:bookshelf'); set(113, YH + 2, z, 'minecraft:bookshelf'); }
for (let x = 116; x <= 140; x += 6) for (const z of [CZ - 8, CZ, CZ + 8]) if (inR(x, YD - 1, z) && inR(x, YD - 1, z + 1) && inR(x, YD - 1, z - 1) && get(x, YD - 1, z) == null) set(x, YD - 1, z, LAMP, { hanging: 'true' });

// ── 4. Cubierta inferior (y 10-13): cocina, almacén, camarotes y taller, con puertas ──
for (const wx of [40, 64, 96, 112]) {
  for (let z = CZ - 16; z <= CZ + 16; z++) for (let y = YL + 1; y <= YH - 1; y++) if (inR(wx, y, z)) set(wx, y, z, SP);
  del(wx, YL + 1, CZ); del(wx, YL + 2, CZ); set(wx, YL + 1, CZ, 'minecraft:spruce_door', { half: 'lower', facing: 'east' }); set(wx, YL + 2, CZ, 'minecraft:spruce_door', { half: 'upper', facing: 'east' });
}
for (let x = 14; x <= 140; x += 6) for (const z of [CZ - 10, CZ, CZ + 10]) if (inR(x, YH - 1, z) && inR(x, YH - 1, z + 1) && inR(x, YH - 1, z - 1) && get(x, YH - 1, z) == null) set(x, YH - 1, z, LAMP, { hanging: 'true' });
for (let x = 16; x <= 36; x += 2) { set(x, YL + 1, CZ - 14, 'minecraft:barrel', { facing: 'up' }); set(x, YL + 2, CZ - 14, 'botanypots:terracotta_hopper_botany_pot'); }
for (let x = 18; x <= 34; x += 4) for (const z of [CZ - 4, CZ + 4]) { set(x, YL + 1, z, FEN); set(x, YL + 2, z, 'minecraft:spruce_trapdoor', { half: 'top' }); stair(x - 1, YL + 1, z, SPST, 'w'); stair(x + 1, YL + 1, z, SPST, 'e'); }
for (const x of [14, 16, 18]) set(x, YL + 1, CZ + 14, 'minecraft:smoker', { facing: 'north' });
for (let x = 42; x <= 62; x++) for (const z of [CZ - 14, CZ - 13, CZ + 13, CZ + 14]) for (const y of [YL + 1, YL + 2]) set(x, y, z, 'minecraft:barrel', { facing: 'up' });
for (let x = 44; x <= 60; x += 4) for (const z of [CZ - 5, CZ + 5]) { set(x, YL + 1, z, 'minecraft:chest', { facing: 'south' }); set(x + 1, YL + 1, z, 'minecraft:chest', { facing: 'south' }); }
for (let x = 67; x <= 92; x += 3) for (const s of [-1, 1]) { const z = CZ + s * 13; set(x, YL + 1, z, 'minecraft:red_bed', { part: 'head', facing: s < 0 ? 'north' : 'south' }); set(x, YL + 1, z - s, 'minecraft:red_bed', { part: 'foot', facing: s < 0 ? 'north' : 'south' }); set(x + 1, YL + 1, z, 'minecraft:barrel', { facing: 'up' }); }
for (const [x, a, b] of [[99, 'minecraft:crafting_table', 'minecraft:barrel'], [101, 'minecraft:smithing_table', 'minecraft:barrel'], [103, 'minecraft:cartography_table', 'minecraft:chest'], [105, 'minecraft:loom', 'minecraft:barrel']]) { set(x, YL + 1, CZ - 13, a); set(x, YL + 1, CZ + 13, b, { facing: 'up' }); }
// escala de proa de la cubierta inferior a la de vuelo
for (let y = YL + 1; y <= YD - 1; y++) set(113, y, CZ + 11, 'minecraft:ladder', { facing: 'east' });
del(113, YH, CZ + 11); set(113, YH, CZ + 11, 'minecraft:ladder', { facing: 'east' }); set(113, YD, CZ + 11, 'minecraft:spruce_trapdoor', { half: 'top' });
for (let x = 16; x <= 140; x += 8) for (const z of [CZ - 9, CZ, CZ + 9]) if (inR(x, YL - 1, z) && inR(x, YL - 2, z) && inR(x, YL - 1, z + 1) && inR(x, YL - 1, z - 1) && get(x, YL - 1, z) == null) set(x, YL - 1, z, LAMP, { hanging: 'true' });   // sentina

// ── 5. Plataformas laterales macizas (tres capas: cubierta, capa de cables, panza) con ménsulas ──
const PODS = [9, mir(9)], PXC = 76, PYC = 40, PB = 9, PC = 11;
for (const zc of PODS) {
  const s = zc < CZ ? -1 : 1, zs = s < 0 ? [1, 17] : [53, 69];
  for (let x = 26; x <= 130; x++) for (let z = zs[0]; z <= zs[1]; z++) {
    if (inR(x, YD, z)) continue;
    const rim = x === 26 || x === 130 || z === (s < 0 ? zs[0] : zs[1]);
    if (rim) log(x, YD, z, SDLOG, x === 26 || x === 130 ? 'z' : 'x'); else set(x, YD, z, DK);
    set(x, YD - 1, z, SP); set(x, YD - 2, z, rim ? DK : SP);
  }
  for (const kx of [42, 58, 74, 90, 106]) for (let i = 0; i <= 6; i++) for (let k = 0; k <= 6 - i; k++) {   // ménsulas: triángulo macizo con la escalera en la punta
    const z = s < 0 ? 17 - k : 53 + k, y = YD - 3 - i;
    if (k === 6 - i) stair(kx, y, z, DKST, s < 0 ? 'n' : 's', { top: true }); else set(kx, y, z, DK);
  }
}

// ── 6. Globos, quemadores y montantes de tronco ──
for (const zc of PODS) {
  const E = (x, y, z) => Math.pow((x - PXC) / 56, 2) + Math.pow((y - PYC) / PC, 2) + Math.pow((z - zc) / PB, 2) <= 1;
  for (let x = PXC - 57; x <= PXC + 57; x++) for (let y = PYC - PC - 1; y <= PYC + PC + 1; y++) for (let z = zc - PB - 1; z <= zc + PB + 1; z++) {
    if (!E(x, y, z)) continue;
    let rim = false; for (let dx = -1; dx <= 1 && !rim; dx++) for (let dy = -1; dy <= 1 && !rim; dy++) for (let dz = -1; dz <= 1; dz++) if (!E(x + dx, y + dy, z + dz)) { rim = true; break; }
    if (!rim) continue;
    if (y <= PYC - PC + 2 && Math.abs(z - zc) <= 1 && x >= PXC - 50 && x <= PXC + 50) continue;                 // ranura de abajo, sobre los quemadores
    set(x, y, z, Math.abs(y - PYC) < 0.6 ? ENVR : Math.abs(x - PXC) > 49 ? ENVG : ENV);
  }
  for (let x = 27; x <= 121; x += 6) { set(x, YD + 1, zc, 'aeronautics:adjustable_burner', { variant: 'fire' }); set(x + 2, YD + 1, zc, 'aeronautics:adjustable_burner', { variant: 'fire' }); link(x + 1, YD + 1, zc, 'up'); }
  for (let x = 26; x <= 122; x += 16) for (const dz of [-5, 5]) for (let y = YD + 1; y <= PYC; y++) { if (get(x, y, zc + dz) != null) break; log(x, y, zc + dz, DLOG, 'y'); }
  for (let x = 32; x <= 120; x += 8) for (const dz of [-3, 3]) if (get(x, YD + 1, zc + dz) == null) set(x, YD + 1, zc + dz, LAMP);
  for (let x = PXC - 46; x <= PXC + 46; x += 8) for (const dz of [-4, 0, 4]) { let y = PYC + PC; while (y > PYC && get(x, y, zc + dz) == null) y--; if (get(x, y, zc + dz) != null && get(x, y - 1, zc + dz) == null) set(x, y - 1, zc + dz, LAMP, { hanging: 'true' }); }
  for (let x = PXC - 52; x <= PXC + 52; x += 8) for (const dz of [-6, -3, 3, 6]) { let y = PYC - PC + 1; while (y < PYC && get(x, y + 1, zc + dz) != null) y++; if (y < PYC && get(x, y, zc + dz) != null) set(x, y + 1, zc + dz, LAMP); }
  // cañones de patatas en el borde, con su maceta-tolva y su enlace; el motor va encima de un cable tapado
  const s = zc < CZ ? -1 : 1, ze = s < 0 ? 2 : mir(2), zi = s < 0 ? 3 : mir(3);
  set(31, YD + 1, ze, 'createaddition:electric_motor', { facing: 'east' });
  for (let x = 32; x <= 122; x++) {
    if ((x - 34) % 8 === 0) { set(x, YD + 1, ze, 'aeronautics:mounted_potato_cannon', { facing: s < 0 ? 'north' : 'south', axis_along_first: 'true' }); set(x, YD + 2, ze, 'botanypots:terracotta_hopper_botany_pot'); link(x, YD + 1, zi, 'up'); }
    else set(x, YD + 1, ze, 'create:shaft', { axis: 'x' });
  }
  for (const x of [26, 130]) set(x, YD + 1, s < 0 ? 1 : mir(1), s < 0 ? 'minecraft:red_stained_glass' : 'minecraft:green_stained_glass');
}

// ── 7. Góndolas de cobre con aristas de abajo achaflanadas ──
const nacelle = (xa, xb, zc, rear) => {
  const s = zc < CZ ? -1 : 1, Z0 = s < 0 ? 3 : mir(14), Z1 = s < 0 ? 14 : mir(3), Y0 = 16, Y1 = 21;
  for (let x = xa; x <= xb; x++) for (let y = Y0; y <= Y1; y++) for (let z = Z0; z <= Z1; z++) {
    const shell = x === xa || x === xb || y === Y0 || y === Y1 || z === Z0 || z === Z1; if (!shell) continue;
    if (y === Y0 && (z === Z0 || z === Z1) && x > xa && x < xb) { stair(x, y, z, CUST, z === Z0 ? 'n' : 's', { top: true }); continue; }   // chaflán
    set(x, y, z, (x === xa + 2 || x === xb - 2) && y > Y0 && y < Y1 ? CUB : CU);
  }
  const face = rear ? xa : xb, back = rear ? xa + 1 : xb - 1, dir = rear ? 'east' : 'west', away = rear ? 'west' : 'east';
  const zs = rear ? [Z0 + 1, Z0 + 3, Z0 + 5, Z0 + 7, Z0 + 9] : [Z0 + 2, Z0 + 5, Z0 + 8];
  for (let z = Z0 + 1; z <= Z1 - 1; z++) { set(back, 17, z, CAB); set(back, 19, z, CAB); set(back, 18, z, z === Z1 - 1 ? CAB : CU); }   // la columna que une las dos filas, donde no hay propulsor
  for (const z of zs) { thr(face, 17, z, dir); thr(face, 19, z, dir); link(face, 18, z, away); }
  const outZ = s < 0 ? Z0 : Z1, inZ = s < 0 ? Z0 + 1 : Z1 - 1, push = s < 0 ? 'south' : 'north', xs = rear ? [xa + 4, xa + 6] : [xb - 6, xb - 4];
  for (let x = Math.min(back, xs[0]); x <= Math.max(back, xs[1]); x++) set(x, 17, inZ, CAB);
  for (const x of xs) { thr(x, 18, outZ, push); set(x, 18, inZ, CAB); }
  set(xs[0] + 1, 18, inZ, CU); link(xs[0] + 1, 18, outZ, s < 0 ? 'north' : 'south');
  for (const x of [xa + 3, xb - 3]) set(x, 20, (Z0 + Z1) >> 1, LAMP, { hanging: 'true' });
  return back;
};
const BACK = {};
for (const zc of PODS) { BACK['r' + zc] = nacelle(26, 35, zc, true); BACK['f' + zc] = nacelle(121, 130, zc, false); }
// popa del casco: 8 de avance bajo el portón, con los cables detrás de una pared doble
for (const z of [CZ - 9, CZ - 6, CZ + 6, CZ + 9]) { thr(8, 10, z, 'east'); thr(8, 12, z, 'east'); link(8, 11, z, 'west'); }
for (let z = CZ - 10; z <= CZ + 10; z++) { set(9, 10, z, CAB); set(9, 12, z, CAB); set(9, 11, z, z === CZ - 10 ? CAB : SP); set(9, 13, z, SP); for (let y = 10; y <= 13; y++) set(10, y, z, SP); }
for (const z of [CZ - 11, CZ + 11]) for (let y = 10; y <= 13; y++) set(9, y, z, SP);

// ── 8. Isla de tres alturas: dos plantas con pilares y ventanas, puente acristalado en voladizo sobre ménsulas (por encima
//       de la mitad de los globos) y azotea con antepecho, paneles y mástil ──
const IX0 = 72, IX1 = 92, IZ0 = 44, IZ1 = 51, BX0 = 70, BX1 = 94, BZ0 = 40, BZ1 = 51, F1 = 31, F2 = 37, RF = 44;
const tier = (y0, y1, wa, wb) => { for (let x = IX0; x <= IX1; x++) for (let y = y0; y <= y1; y++) for (let z = IZ0; z <= IZ1; z++) {
  const e = x === IX0 || x === IX1 || z === IZ0 || z === IZ1; if (!e) continue;
  const post = ((x === IX0 || x === IX1) && (z === IZ0 || z === IZ1)) || ((z === IZ0 || z === IZ1) && (x - IX0) % 4 === 0) || ((x === IX0 || x === IX1) && (z - IZ0) % 7 === 0);
  if (post) log(x, y, z, DLOG, 'y'); else if (y === y0) set(x, y, z, DK); else if (y >= wa && y <= wb && (((z === IZ0 || z === IZ1) && (x - IX0) % 4 !== 0) || ((x === IX0 || x === IX1) && z >= IZ0 + 2 && z <= IZ1 - 2))) set(x, y, z, PANE); else set(x, y, z, SP);
} };
tier(YD + 1, F1 - 1, 27, 28); tier(F1 + 1, F2 - 1, 33, 34);
for (let x = IX0; x <= IX1; x++) for (let z = IZ0; z <= IZ1; z++) { const e = x === IX0 || x === IX1 || z === IZ0 || z === IZ1; e ? log(x, F1, z, SDLOG, x === IX0 || x === IX1 ? 'z' : 'x') : set(x, F1, z, SP); }
for (const y of [YD + 1, YD + 2]) del(IX0, y, 47); set(IX0, YD + 1, 47, 'minecraft:spruce_door', { half: 'lower', facing: 'west' }); set(IX0, YD + 2, 47, 'minecraft:spruce_door', { half: 'upper', facing: 'west' });
for (let x = BX0; x <= BX1; x++) for (let z = BZ0; z <= BZ1; z++) {
  const e = x === BX0 || x === BX1 || z === BZ0 || z === BZ1;
  set(x, F2, z, e ? DK : SP);                                                                                   // suelo del puente, macizo
  if (e) { const post = ((x === BX0 || x === BX1) && (z === BZ0 || z === BZ1)) || (z === BZ0 && (x - BX0) % 4 === 0) || ((x === BX0 || x === BX1) && (z - BZ0) % 4 === 0);
    set(x, F2 + 1, z, DK); for (const y of [F2 + 2, F2 + 3]) post ? log(x, y, z, DLOG, 'y') : set(x, y, z, PANE); log(x, F2 + 4, z, SDLOG, x === BX0 || x === BX1 ? 'z' : 'x'); }
  set(x, F2 + 5, z, SP); set(x, F2 + 6, z, SP); set(x, RF, z, DK); if (e) set(x, RF + 1, z, DK);            // techo, cámara, azotea y antepecho
}
for (const kx of [72, 78, 84, 90]) for (let i = 0; i <= 3; i++) for (let k = 0; k <= 3 - i; k++) {            // ménsulas del voladizo norte
  const z = IZ0 - 1 - k, y = F2 - 1 - i; if (k === 3 - i) stair(kx, y, z, DKST, 'n', { top: true }); else set(kx, y, z, DK);
}
for (const kz of [44, 48]) { stair(BX0, F2 - 1, kz, DKST, 'w', { top: true }); set(BX0 + 1, F2 - 1, kz, DK); stair(BX1, F2 - 1, kz, DKST, 'e', { top: true }); set(BX1 - 1, F2 - 1, kz, DK); }
for (let y = YD + 1; y <= F2 - 1; y++) set(91, y, 50, 'minecraft:ladder', { facing: 'north' });
set(91, F1, 50, 'minecraft:spruce_trapdoor', { half: 'top' }); set(91, F2, 50, 'minecraft:spruce_trapdoor', { half: 'top' });
// mandos del puente (y = F2 + 1)
const Y = F2 + 1;
sender(93, Y, 41, 'up'); set(93, Y, 42, 'simulated:throttle_lever', { face: 'floor', facing: 'west' });     // F1 empuje
set(93, Y, 44, 'simulated:linked_typewriter', { facing: 'west' }); set(93, Y, 45, 'aeroworks:control_desk', { facing: 'west' }); set(93, Y, 46, 'simulated:steering_wheel', { facing: 'west' });
set(93, Y, 48, 'simulated:throttle_lever', { face: 'floor', facing: 'west' }); sender(93, Y, 49, 'up');      // F5 ascenso
for (let z = 43; z <= 47; z++) stair(90, Y, z, SPST, 'w');
set(84, Y, 47, 'simulated:altitude_sensor', { face: 'floor', facing: 'east', dial: 'linear' }); set(85, Y, 47, 'simulated:redstone_inductor', { facing: 'east' }); sender(86, Y, 47, 'up');
set(84, Y, 42, 'minecraft:lever', { face: 'floor', facing: 'east' }); sender(85, Y, 42, 'up');              // F6 fuego
set(87, Y, 42, 'minecraft:lever', { face: 'floor', facing: 'east' }); sender(88, Y, 42, 'up');              // F7 amarres
set(80, Y, 44, 'simulated:navigation_table', { facing: 'up' }); set(76, Y, 44, 'simulated:physics_assembler', { face: 'floor', facing: 'east' });
set(78, Y, 49, 'minecraft:bell', { attachment: 'floor', facing: 'east' }); set(72, Y, 42, 'minecraft:cartography_table');
for (let x = 74; x <= 90; x += 4) set(x, F2 + 4, 46, LAMP, { hanging: 'true' });
for (const yy of [F1 - 1, F2 - 1]) for (let x = 75; x <= 89; x += 7) set(x, yy, 47, LAMP, { hanging: 'true' });
for (const [x, z] of [[71, 41], [93, 41], [71, 50], [93, 50], [81, 41]]) if (get(x, F2 - 1, z) == null) set(x, F2 - 1, z, LAMP, { hanging: 'true' });   // bajo el voladizo
for (const x of [75, 81, 87]) set(x, YD + 1, 43, LAMP);                                                     // al pie de la isla, bajo el voladizo
for (let x = 76; x <= 86; x += 5) for (const z of [46, 48]) { set(x, F1 + 1, z, 'minecraft:red_bed', { part: 'head', facing: 'south' }); }   // literas de oficiales
// energía: 12 paneles en dos filas seguidas sobre la azotea, con el cable debajo de ellos y por la cámara del techo
for (let x = 76; x <= 87; x++) for (const z of [43, 48]) { set(x, RF + 1, z, 'powah:solar_panel_niotic'); set(x, RF, z, CAB); }
cab([[76, RF - 1, 43], [76, RF - 1, 48], [73, RF - 1, 48], [73, RF - 1, 49]]);
feature({ type: 'antenna', x: 82, y: RF + 1, z: 45, height: 10 });
for (let x = 74; x <= 81; x++) set(x, YD + 1, 50, 'powah:energy_cell_niotic');                               // celdas seguidas, con su cable debajo
cab([[74, YD, 50], [81, YD, 50]]); for (let x = 74; x <= 81; x++) log(x, YD - 1, 50, SDLOG, 'x');

// ── 9. Cables: bajante forrado (azotea → isla → hangar → cubierta inferior → sentina), troncales en la sentina,
//       subidas forradas a la capa intermedia de las plataformas y bajada a cada góndola ──
const boxed = (x, y0, y1, z) => { for (let y = y0; y <= y1; y++) { set(x, y, z, CAB); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (get(x + dx, y, z + dz) == null || /lantern|fence|ladder/.test(get(x + dx, y, z + dz) || '')) set(x + dx, y, z + dz, SP); } };
const duct = pts => { cab(pts); for (let i = 1; i < pts.length; i++) for (const [x, y, z] of routeCellsOf(pts[i - 1], pts[i])) if (y === 8) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]]) if (get(x + dx, y + dy, z + dz) == null) set(x + dx, y + dy, z + dz, SP); };
const routeCellsOf = (a, b) => { const out = [], p = a.slice(); out.push(p.slice()); for (const k of [0, 2, 1]) while (p[k] !== b[k]) { p[k] += Math.sign(b[k] - p[k]); out.push(p.slice()); } return out; };
boxed(73, YD + 1, 43, 50); boxed(73, YH + 1, YD, 50); boxed(73, YL + 1, YH, 50); duct([[73, YL, 50], [73, 8, 50], [73, 8, CZ + 6]]);
for (const zt of [CZ - 6, CZ + 6]) duct([[12, 8, zt], [128, 8, zt]]);
duct([[76, 8, CZ - 5], [76, 8, CZ + 5]]);
for (const [xr, key, xn] of [[30, 'r', 30], [118, 'f', 126]]) for (const zc of PODS) {   // la subida va donde el casco aún tiene toda la manga; xn, sobre la góndola
  const s = zc < CZ ? -1 : 1, zt = CZ + s * 6, zw = CZ + s * 16, zin = CZ + s * 15;
  duct([[xr, 8, zt + s], [xr, 8, zin]]); cab([[xr, YL, zin], [xr, YL, zw]]);
  boxed(xr, YL + 1, YH, zw); boxed(xr, YH + 1, YD - 1, zw);
  const zEdge = CZ + s * 17, zOut = CZ + s * 18, zN = s < 0 ? 8 : mir(8), back = BACK[key + zc];
  cab([[xr, YD - 1, zEdge], [xr, YD - 1, zN], [xn, YD - 1, zN], [xn, YD - 2, zN], [xn, 21, zN], [xn, 20, zN], [back, 20, zN]]);
}
for (const zc of PODS) { const s = zc < CZ ? -1 : 1, ze = s < 0 ? 2 : mir(2); cab([[30, YD - 1, s < 0 ? 8 : mir(8)], [31, YD - 1, s < 0 ? 8 : mir(8)], [31, YD - 1, ze], [31, YD, ze]]); }
duct([[12, 8, CZ - 6], [9, 8, CZ - 6]]); cab([[9, 9, CZ - 6], [9, 10, CZ - 6]]);

// ── 10. Vistas y guía ──
zone('Vista general', [79, 24, CZ], { from: [205, 88, 160] });
zone('Cubierta de vuelo e isla', [82, 30, 47], { from: [40, 34, 26] });
zone('Puente de mando', [86, 39, 45], { from: [104, 45, 30] });
zone('Costado de babor y ménsulas', [44, 16, 17], { from: [44, 13, -16] });
zone('Góndola de proa de babor', [126, 18, 8], { from: [152, 15, -12] });
zone('Popa y portón del hangar', [9, 18, CZ], { from: [-26, 22, CZ + 6] });
zone('Hangar (corte en y=22)', [60, 15, CZ], { from: [60, 80, 105], cut: 22 });
zone('Cubierta inferior y cables (corte en y=12)', [62, 10, CZ], { from: [62, 75, 105], cut: 12 });
zone('Globo de babor y quemadores', [76, 27, 9], { from: [76, 21, -34] });
explain('Qué es', 'Portaaviones volante de 143 × 71 de planta, de madera y lona, con todos los suelos, cubiertas y voladizos de bloques enteros. Pesa 25 944 con los pesos de Sable. '
  + 'Lo levantan dos globos de 15 934 m³ con 32 quemadores cada uno (500 m³ por quemador y 1,5 por m³ en tu config): 47 800 de sustentación, 1,8 veces su peso, que deja sitio para los vehículos del hangar. '
  + 'Se mueve con 48 propulsores iónicos de Create Propulsion, que solo gastan FE, y la energía sale de 24 paneles solares. No necesita combustible.');
explain('Cómo se queda quieta en el aire', 'Los quemadores no gastan nada: basta la redstone. El sensor de altitud del puente (84,38,47) da una señal según la altura: ponlo en «disminuye al subir» y elige su altura mínima y máxima (por ejemplo 180 y 200). '
  + 'Por debajo de esa franja los 64 quemadores van a tope y por encima se apagan, así que la estación sube y se queda donde la sustentación iguala al peso. El inductor de redstone (85,38,47) suaviza la señal para que no suba y baje sin parar. '
  + 'Los globos van casi 20 bloques por encima del centro de gravedad y alineados con él: si se inclina, se endereza sola como un péndulo. Sin empuje, el rozamiento de los globos la frena y se queda aparcada en el aire.');
explain('Montaje', '1) Constrúyela en tierra o a poca altura: en tu config no se puede desmontar en pleno aire.\n'
  + '2) Cubre toda la estación con Honey Glue, o con el Auto Glue de Create Propulsion, que lo hace de una vez. Son unos 57 000 bloques y el máximo es 128 000.\n'
  + '3) Mantén clic derecho en el Physics Assembler del puente (76,38,44) y tira de la palanca. Se desmonta con el mismo bloque, en tierra y parada.\n'
  + '4) Antes de despegar, configura las frecuencias, los quemadores (máximo 500 en su panel) y el sensor de altitud.');
explain('Frecuencias (Redstone Link)', 'Cada enlace lleva dos objetos de frecuencia: pon la misma pareja en el emisor y en sus receptores.\n'
  + 'F1 Avance: palanca de empuje (93,38,42) → cara trasera de las góndolas de popa y popa del casco (28 propulsores).\n'
  + 'F2 Atrás: cara delantera de las góndolas de proa (12).\n'
  + 'F3 Girar a babor: cara de fuera de la góndola de popa de babor (31,18,3) y de la de proa de estribor (125,18,67).\n'
  + 'F4 Girar a estribor: proa de babor (125,18,3) y popa de estribor (31,18,67).\n'
  + 'F5 Altitud: sensor y palanca de ascenso (93,38,48) → los enlaces entre los quemadores.\n'
  + 'F6 Fuego: palanca (84,38,42) → 24 cañones. F7 Amarres: palanca (87,38,42) → 26 conectores del hangar.\n'
  + 'En el Linked Typewriter (93,38,44) asigna W a F1, S a F2, A a F3, D a F4 y Espacio a F6.');
explain('Energía', '24 paneles solares niotic en la azotea del puente dan 36 000 FE/t de día, y 8 Energy Cells niotic en la planta baja de la isla guardan para la noche. '
  + 'Ningún cable se ve: bajan forrados por la esquina de la isla y del hangar, recorren un conducto bajo el suelo de la cubierta inferior, suben por pilares forrados y van por la capa intermedia de las plataformas hasta cada góndola. '
  + 'Consumo: los 48 propulsores a tope gastan 1920 FE/t (40 cada uno), y cada motor de los cañones hasta 480 FE/t. Si algo no recibe energía, pon con la llave de Powah la cara de la celda en salida.');
explain('Conducción', 'Avance con W, o con la palanca de empuje para dosificar. Atrás con S, giros con A y D. Para subir, la palanca de ascenso, que se suma a la altitud automática; para bajar, baja la franja del sensor de altitud. '
  + 'El escape de los propulsores daña a lo que tiene detrás: no entres al hangar por popa con el avance encendido.');
explain('Hangar y vehículos', 'Hangar de 100 × 33 × 9 con portón de popa de 25 × 8. Tiene 10 plazas de 14 × 13 para aviones de hasta 11 de envergadura y helicópteros, y 16 plataformas de drones de 3 × 3. Cada una lleva un Docking Connector enrasado en el suelo. '
  + 'Pon en cada vehículo un Docking Connector mirando abajo, aterriza encima y activa Amarres (F7): quedan unidos rígidos pero siguen siendo naves aparte, y el conector pasa objetos y fluidos para repostar. '
  + 'Monta cada vehículo con su propio Physics Assembler, nunca dentro de la pega de la estación. Arriba hay tres helipuertos. En la cubierta inferior hay cocina con huerto, almacén, camarotes y taller, y en proa un salón.');
explain('Cañones', '24 Mounted Potato Cannons, 12 por banda, en el borde de las plataformas. Un motor eléctrico al final de cada fila mueve el eje que los carga. '
  + 'Encima de cada cañón hay una botany pot con tolva: ponle tierra y una patata, y la cosecha cae sola al cañón. Disparan mientras la palanca de Fuego (F6) esté activa. '
  + 'Create Big Cannons no está en tu pack: estos son los cañones del propio Aeronautics.');
explain('Comprobado y sin comprobar', 'Comprobado: los globos son herméticos, todo está unido por caras, el centro de sustentación cae sobre el centro de gravedad, no hay bloques solapados, ninguna losa hace de suelo, ninguna escalera está suelta y ningún cable queda a la vista. '
  + 'Sin comprobar en el juego: hacia dónde va la flecha del inductor de redstone (tiene que ir del sensor al enlace), cuánto pierden los globos con la altura y si las Energy Cells sueltan energía a los cables sin tocar sus caras.');
// ── 10. Comprobación de que nada pisó lo importante ──
for (const [p, id] of [[[76, 38, 44], 'simulated:physics_assembler'], [[84, 38, 47], 'simulated:altitude_sensor'], [[93, 38, 44], 'simulated:linked_typewriter'], [[31, YD + 1, 2], 'createaddition:electric_motor'], [[31, YD + 1, mir(2)], 'createaddition:electric_motor']]) if (get(...p) !== id) print('PISADO ' + id + ' en ' + p);
`;

export { code, ctx };
if (process.argv[1].endsWith('estacion2.mjs')) {
  const out = JSON.parse(await runTool('run_code', { code }, ctx));
  console.log('error:', out.error, '| bloques:', out.blocks, '\n', (out.printed || []).join('\n '), '\n notas:', (out.notes || []).filter(n => !/^route/.test(n)).slice(0, 10).join('\n  '));
  writeFileSync(OUT + 'estacion2.json', JSON.stringify(ctx.design));
}
