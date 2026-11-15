// Estación aérea Albatros v3 — helicarrier moderno. Misma física comprobada (sustentación por encima del centro de gravedad),
// casco anguloso de hormigón, góndolas de sustentación, turbinas, torretas giratorias, isla de cristal, vehículos y frecuencias puestas.
import { runTool } from 'file:///C:/Users/mique/Proyectos/Craftometry/server/src/llm/tools.js';
import { writeFileSync } from 'node:fs';
import { encode } from 'file:///C:/Users/mique/Proyectos/Craftometry/server/src/design/format.js';
const OUT = 'C:/Users/mique/AppData/Local/Temp/claude/09b9b23e0419701f/14ff7dd9-3d96-4484-acca-6e0bddcd938a/scratchpad/';
const ctx = { workspaceId: 'PUCbHICF0Qrz', lang: 'es', design: encode({ TITLE: 'Helicarrier Albatros', P: {}, BLOCKS: [], W: 1, H: 1 }), saveDesign() {} };

const code = String.raw`
const CZ = 40, YB = 10, YH = 15, YD = 25, mir = z => 2 * CZ - z;
const WC = 'minecraft:white_concrete', LG = 'minecraft:light_gray_concrete', GC = 'minecraft:gray_concrete', BC = 'minecraft:black_concrete', YC = 'minecraft:yellow_concrete';
const QS = 'minecraft:smooth_quartz_stairs', Q = 'minecraft:smooth_quartz', GLP = 'minecraft:light_blue_stained_glass_pane', GLB = 'minecraft:light_blue_stained_glass', BARS = 'minecraft:iron_bars';
const SEA = 'minecraft:sea_lantern', LAMP = 'minecraft:lantern', IRON = 'create:industrial_iron_block', CAS = 'create:andesite_casing', GIRD = 'create:metal_girder';
const EW = 'aeronautics:white_envelope', EL = 'aeronautics:light_gray_envelope', EB = 'aeronautics:black_envelope', EC = 'aeronautics:light_blue_envelope';
const CAB = 'powah:energy_cable_niotic', LINK = 'create:redstone_link', THR = 'createpropulsion:ion_thruster';
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' }, D4 = [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 's'], [0, -1, 'n']];
// canales: dos objetos de frecuencia y para qué son (van en la ficha de cada enlace y en el NBT)
const CH = {
  avance: ['minecraft:white_wool', 'minecraft:lime_wool', 'F1 Avance'], atras: ['minecraft:white_wool', 'minecraft:red_wool', 'F2 Atrás'],
  babor: ['minecraft:white_wool', 'minecraft:yellow_wool', 'F3 Girar a babor'], estribor: ['minecraft:white_wool', 'minecraft:blue_wool', 'F4 Girar a estribor'],
  altitud: ['minecraft:feather', 'minecraft:white_wool', 'F5 Altitud (quemadores)'], fuego: ['minecraft:gunpowder', 'minecraft:red_wool', 'F6 Fuego'],
  amarres: ['minecraft:chain', 'minecraft:gray_wool', 'F7 Amarres'],
};
const rcv = (x, y, z, facing, ch) => { set(x, y, z, LINK, { facing, receiver: 'true' }); freq(x, y, z, CH[ch][0], CH[ch][1], CH[ch][2] + ': receptor'); };
const snd = (x, y, z, facing, ch) => { set(x, y, z, LINK, { facing, receiver: 'false' }); freq(x, y, z, CH[ch][0], CH[ch][1], CH[ch][2] + ': emisor'); };
const thr = (x, y, z, facing) => set(x, y, z, THR, { facing, multi: 'false' });
const cab = pts => { for (let i = 1; i < pts.length; i++) route(pts[i - 1], pts[i], { block: CAB, order: 'xzy' }); };
const sail = (x, y, z, f) => set(x, y, z, 'create:white_sail', { facing: f });
const fill = (x0, y0, z0, x1, y1, z1, id) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, id); };

// ── 1. Casco anguloso: fondo plano, chaflán de 45° con escaleras en fila, costados rectos con ventanas corridas, proa en cuña ──
const U = x => x < 12 || x > 150 ? -1 : x <= 122 ? 17 : Math.round(17 - (x - 122) * 14 / 28);
const INS = { 14: 0, 13: 1, 12: 2, 11: 3, 10: 4 };
const H = (x, y) => { if (y < YB || y > YD) return -1; const u = U(x); if (u < 0) return -1; const h = u - (INS[y] || 0); return h < 2 ? -1 : h; };
const inR = (x, y, z) => { const h = H(x, y); return h >= 0 && Math.abs(z - CZ) <= h; };
const flatSide = (x, y, z) => { const o = z < CZ ? -1 : 1; return x >= 20 && x <= 118 && !inR(x, y, z + o) && inR(x - 1, y, z) && !inR(x - 1, y, z + o) && inR(x + 1, y, z) && !inR(x + 1, y, z + o); };
for (let x = 12; x <= 150; x++) for (let y = YB; y <= YD; y++) for (let z = CZ - 18; z <= CZ + 18; z++) {
  if (y === YD) { const u = U(x); if (u >= 0 && Math.abs(z - CZ) <= u + 1) set(x, y, z, Math.abs(z - CZ) === u + 1 || x === 12 ? LG : GC); continue; }   // cubierta con canto que vuela uno
  if (!inR(x, y, z)) continue;
  const edge = D4.some(([dx, dz]) => !inR(x + dx, y, z + dz)), bottom = !inR(x, y - 1, z);
  if (!edge && !bottom) { if (y === YH) set(x, y, z, LG); continue; }
  let id = LG;
  if (y === YH || y === 22) id = BC;                                                                                   // franjas negras
  else if (y >= 18 && y <= 20 && flatSide(x, y, z)) id = (x % 8 === 0) ? WC : GLP;                                    // ventanas corridas
  else if (y >= 16) id = WC;
  else if (bottom && y === YB) id = LG;
  set(x, y, z, id);
}
for (let x = 12; x <= 150; x++) for (let y = YB; y < YH; y++) for (let z = CZ - 18; z <= CZ + 18; z++) {               // chaflán: escaleras invertidas bajo cada escalón
  if (inR(x, y, z) || !inR(x, y + 1, z)) continue;
  const ins = D4.filter(([dx, dz]) => inR(x + dx, y, z + dz));
  if (ins.length === 1) stair(x, y, z, QS, OPP[ins[0][2]], { top: true }); else if (ins.length > 1) set(x, y, z, Q);
}
for (let x = 20; x <= 140; x += 2) if (inR(x, YB, CZ)) set(x, YB, CZ, x % 4 === 0 ? SEA : BC);                       // luces de quilla
// portón de popa del hangar, enmarcado en negro
for (let y = YH + 1; y <= 23; y++) for (let z = CZ - 11; z <= CZ + 11; z++) del(12, y, z);
for (let y = YH + 1; y <= 23; y++) { set(12, y, CZ - 12, BC); set(12, y, CZ + 12, BC); } for (let z = CZ - 12; z <= CZ + 12; z++) set(12, 24, z, BC);

// ── 2. Cubierta de vuelo: pista, umbral, helipuertos, luces enrasadas y barandillas ──
for (let x = 18; x <= 146; x++) { if (x % 6 < 3 && x > 24) set(x, YD, CZ, WC); for (const z of [CZ - 9, CZ + 9]) if (x <= 140) set(x, YD, z, WC); }
for (let z = CZ - 7; z <= CZ + 7; z += 2) for (let x = 14; x <= 19; x++) set(x, YD, z, WC);                               // umbral de pista
for (let x = 30; x <= 34; x++) for (const z of [CZ - 5, CZ - 4, CZ + 4, CZ + 5]) set(x, YD, z, WC);                        // marcas de toma
const PADS = [[48, CZ - 12], [104, CZ - 12]];
for (const [hx, hz] of PADS) { for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) { const d = Math.hypot(dx, dz); if (d > 4.4 && d <= 5.4) set(hx + dx, YD, hz + dz, WC); }
  for (let k = -2; k <= 2; k++) { set(hx + k, YD, hz - 2, YC); set(hx + k, YD, hz + 2, YC); set(hx, YD, hz + k, YC); } }
for (let x = 16; x <= 146; x += 6) for (const s of [-1, 1]) { const u = U(x); if (u >= 0) set(x, YD, CZ + s * (u + 1), SEA); }   // luces del canto
for (let x = 123; x <= 150; x++) for (const s of [-1, 1]) { const u = U(x); if (u >= 0) set(x, YD + 1, CZ + s * (u + 1), BARS); }   // barandilla de proa

// ── 3. Hangar: vigas con luces, vigas-conducto de cable en las esquinas, plazas, drones y mamparo de proa ──
for (let x = 16; x <= 118; x += 6) for (const z of [CZ - 15, CZ + 15, CZ + 9]) if (!(z === CZ + 9 && x >= 82 && x <= 108)) set(x, YH, z, SEA);   // luces de suelo
for (let x = 19; x <= 118; x += 6) set(x, YH, CZ, SEA); for (let x = 124; x <= 142; x += 6) for (const dz of [-5, 5]) set(x, YH, CZ + dz, SEA);
for (let z = CZ - 7; z <= CZ + 7; z += 2) set(20, YD, z, SEA); for (const dz of [-6, -3, 3, 6]) set(26, YD, CZ + dz, SEA);                    // luces de umbral
for (let x = 16; x <= 118; x += 8) for (let z = CZ - 16; z <= CZ + 16; z++) set(x, 24, z, Math.abs(z - CZ) === 6 ? SEA : LG);
for (let x = 13; x <= 120; x++) for (const s of [-1, 1]) { set(x, 24, CZ + s * 16, CAB); set(x, 23, CZ + s * 16, LG); set(x, 24, CZ + s * 15, LG); set(x, 23, CZ + s * 15, LG); }
for (let y = YH + 1; y <= 24; y++) for (let z = CZ - 16; z <= CZ + 16; z++) if (!(Math.abs(z - CZ) <= 1 && y <= YH + 2)) set(121, y, z, WC);
del(121, YH + 1, CZ); del(121, YH + 2, CZ); set(121, YH + 1, CZ, 'minecraft:iron_door', { half: 'lower', facing: 'east' }); set(121, YH + 2, CZ, 'minecraft:iron_door', { half: 'upper', facing: 'east' });
const SPOTS = [];
for (let i = 0; i < 3; i++) { const x0 = 18 + i * 22, x1 = x0 + 17, z0 = CZ - 14, z1 = CZ + 2; for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) set(x, YH, z, YC);
  const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1; SPOTS.push([cx, cz]); if (i === 2) { set(cx, YH, cz, 'simulated:docking_connector', { facing: 'up' }); rcv(cx, YH - 1, cz, 'down', 'amarres'); } }
const DRONES = [[86, CZ + 7], [92, CZ + 7], [98, CZ + 7], [104, CZ + 7]];
for (const [x, z] of DRONES) { for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2) set(x + dx, YH, z + dz, 'minecraft:cyan_concrete');
}
for (let x = 20; x <= 118; x += 6) for (const z of [CZ - 16, CZ + 16]) if (get(x, YH + 1, z) == null) set(x, YH + 1, z, 'minecraft:barrel', { facing: 'up' });   // barriles contra las paredes
for (let x = 20; x <= 116; x += 8) for (const z of [CZ - 9, CZ + 9]) set(x, YB + 4, z, LAMP, { hanging: 'true' });   // sala de máquinas del fondo
for (let x = 124; x <= 146; x += 6) if (inR(x, 23, CZ)) set(x, 24, CZ, SEA);                                         // salón de proa
for (let y = YB + 1; y <= YD - 1; y++) set(122, y, CZ + 6, 'minecraft:ladder', { facing: 'east' });
del(122, YH, CZ + 6); set(122, YH, CZ + 6, 'minecraft:ladder', { facing: 'east' }); set(122, YD, CZ + 6, 'minecraft:iron_trapdoor', { half: 'top' });
for (let y = YB + 1; y <= YD - 1; y++) if (get(121, y, CZ + 6) !== WC) set(121, y, CZ + 6, WC);

// ── 4. Plataformas laterales (tres capas) con ménsulas, quemadores, góndolas de sustentación y turbinas ──
const PODS = [CZ - 27, CZ + 27], PXC = 77, PA = 44, PB = 10, PC = 13, PYC = 42;
const fanAt = (zc, x) => [x, zc], FANS = [];
for (const zc of PODS) {
  const s = zc < CZ ? -1 : 1, zin = CZ + s * 19, zout = CZ + s * 35;
  for (let x = 14; x <= 146; x++) for (let z = Math.min(zin, zout); z <= Math.max(zin, zout); z++) {
    const k = Math.abs(z - zin), ex = Math.min(x - 14, 146 - x); if (ex + (16 - k) < 3) continue;                     // esquinas achaflanadas
    const rim = Math.abs(z - zin) === 16 || x === 14 || x === 146 || ex + (16 - k) < 5;
    set(x, YD, z, rim ? LG : GC); set(x, YD - 1, z, LG); set(x, YD - 2, z, LG);
  }
  for (const kx of [40, 56, 72, 88, 104, 120]) for (let i = 0; i <= 5; i++) for (let k = 0; k <= 5 - i; k++) { const z = CZ + s * (18 + k), y = YD - 3 - i; if (k === 5 - i) stair(kx, y, z, QS, s < 0 ? 'n' : 's', { top: true }); else set(kx, y, z, WC); }
  for (let x = 14; x <= 146; x++) if (get(x, YD, zin) != null) for (const y of [YD - 2, YD - 1]) set(x, y, CZ + s * 18, LG);
  for (let x = 20; x <= 140; x += 4) set(x, YD, zout - s, SEA);                                                       // luces del canto exterior
  for (let x = 16; x <= 144; x++) if (get(x, YD + 1, zout) == null && (x < 22 || x > 138 || x % 2 === 0)) set(x, YD + 1, zout, BARS);
  // góndola de sustentación: sección casi cuadrada, morros afilados, dos tonos, franja negra
  const E = (x, y, z) => { const t = (x - PXC) / PA; if (Math.abs(t) > 1) return false; const sc = Math.abs(t) <= 0.5 ? 1 : Math.sqrt(1 - Math.pow((Math.abs(t) - 0.5) / 0.5, 2)); return Math.pow(Math.abs(z - zc) / (PB * sc), 3) + Math.pow(Math.abs(y - PYC) / (PC * sc), 3) <= 1; };
  for (let x = PXC - PA - 1; x <= PXC + PA + 1; x++) for (let y = PYC - PC - 1; y <= PYC + PC + 1; y++) for (let z = zc - PB - 1; z <= zc + PB + 1; z++) {
    if (!E(x, y, z)) continue;
    let rim = false; for (let dx = -1; dx <= 1 && !rim; dx++) for (let dy = -1; dy <= 1 && !rim; dy++) for (let dz = -1; dz <= 1; dz++) if (!E(x + dx, y + dy, z + dz)) { rim = true; break; }
    if (!rim) continue;
    if (y <= PYC - PC + 2 && Math.abs(z - zc) <= 1 && x >= PXC - 42 && x <= PXC + 42) continue;                       // ranura de abajo
    const ax = Math.abs(x - PXC); set(x, y, z, ax === PA / 2 ? EB : ax > PA - 7 ? EL : y === PYC + 2 ? EC : y < PYC ? EL : ax < PA / 2 && ax % 6 === 3 ? EL : EW);
  }
  for (let x = PXC - 40; x <= PXC + 38; x += 3) { set(x, YD + 1, zc, 'aeronautics:adjustable_burner', { variant: 'soulful' }); set(x + 2, YD + 1, zc, 'aeronautics:adjustable_burner', { variant: 'soulful' }); rcv(x + 1, YD + 1, zc, 'up', 'altitud'); }
  for (let x = PXC - 40; x <= PXC + 40; x += 16) for (const dz of [-6, 6]) for (let y = YD + 1; y <= PYC; y++) { if (get(x, y, zc + dz) != null) break; set(x, y, zc + dz, y % 4 === 0 ? BC : WC); }
  for (let x = PXC - PA + 6; x <= PXC + PA - 6; x += 6) for (const dz of [-4, 0, 4]) { let y = PYC + PC; while (y > PYC && get(x, y, zc + dz) == null) y--; if (get(x, y, zc + dz) != null && get(x, y - 1, zc + dz) == null) set(x, y - 1, zc + dz, LAMP, { hanging: 'true' }); }
  for (let x = PXC - PA + 5; x <= PXC + PA - 5; x += 6) for (const dz of [-6, -2, 2, 6]) { let y = PYC - PC; while (y < PYC && get(x, y, zc + dz) == null) y++; while (y < PYC && get(x, y + 1, zc + dz) != null) y++; if (y < PYC && get(x, y, zc + dz) != null && get(x, y + 1, zc + dz) == null) set(x, y + 1, zc + dz, LAMP); }   // faroles en el fondo, también en las puntas
  for (let x = PXC - 40; x <= PXC + 40; x += 8) for (const dz of [-3, 3]) if (get(x, YD + 1, zc + dz) == null) set(x, YD + 1, zc + dz, LAMP);
  for (let x = PXC - PA + 4; x <= PXC - PA + 17; x++) {                                                               // deriva
    let y = PYC + PC + 1; while (y > PYC && get(x, y, zc) == null) y--; if (y <= PYC) continue;
    const top = PYC + PC + 6 - Math.max(0, x - (PXC - PA + 10)); for (let yy = y + 1; yy <= top; yy++) set(x, yy, zc, yy === top ? EC : EW);
  }
  FANS.push([22, zc, true], [138, zc, false]);
}
// turbinas: anillo octogonal enrasado con la plataforma, cruceta debajo con el motor, hélice de velas, y un módulo de propulsores
const oct = (dx, dz, r) => Math.max(Math.abs(dx), Math.abs(dz)) <= r && Math.abs(dx) + Math.abs(dz) <= Math.round(r * 1.42);
const BACK = {};
for (const [fx, fz, rear] of FANS) {
  const s = fz < CZ ? -1 : 1;
  for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) for (let y = YD - 3; y <= YD; y++) { if (oct(dx, dz, 6)) del(fx + dx, y, fz + dz); }
  for (let dx = -7; dx <= 7; dx++) for (let dz = -7; dz <= 7; dz++) if (oct(dx, dz, 7) && !oct(dx, dz, 6)) for (let y = YD - 3; y <= YD; y++) set(fx + dx, y, fz + dz, y === YD - 1 ? BC : WC);
  for (let k = -9; k <= 9; k++) for (let y = YD - 5; y <= YD - 3; y++) for (let w = -1; w <= 1; w++) { if (Math.abs(k) <= 8) set(fx + k, y, fz + w, LG); if (Math.abs(k) <= 8 || k === -9 * s) set(fx + w, y, fz + k, LG); }
  set(fx, YD - 2, fz, 'createaddition:electric_motor', { facing: 'up' }); set(fx, YD - 1, fz, 'aeronautics:propeller_bearing', { facing: 'up' }); set(fx, YD, fz, CAS);
  for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) set(fx + dx, YD - 3, fz + dz, SEA);                    // luces del conducto
  for (let k = 1; k <= 4; k++) for (const [dx, dz] of [[k, 0], [-k, 0], [0, k], [0, -k]]) sail(fx + dx, YD, fz + dz, 'up');
  // módulo de propulsores: detrás de la turbina (avance) o delante (atrás), con giro en la cara de fuera
  const xa = rear ? fx - 11 : fx + 9, xb = xa + 2, face = rear ? xa : xb, back = xa + 1, dir = rear ? 'east' : 'west', away = rear ? 'west' : 'east', ox = rear ? -1 : 1;
  for (let x = xa; x <= xb; x++) for (let y = YD - 4; y <= YD; y++) for (let z = fz - 4; z <= fz + 4; z++) { const sh = x === xa || x === xb || y === YD - 4 || y === YD || z === fz - 4 || z === fz + 4; if (sh) set(x, y, z, y === YD ? LG : (z === fz - 4 || z === fz + 4) && y === YD - 2 ? BC : WC); }
  const zs = rear ? [fz - 3, fz - 1, fz + 1, fz + 3] : [fz - 3, fz, fz + 3];
  for (let z = fz - 3; z <= fz + 3; z++) { set(back, YD - 3, z, CAB); set(back, YD - 1, z, CAB); set(back, YD - 2, z, z === fz + 2 ? CAB : LG); }
  for (const z of zs) { thr(face, YD - 3, z, dir); thr(face, YD - 1, z, dir); rcv(face, YD - 2, z, away, rear ? 'avance' : 'atras'); }
  const outZ = fz + s * 4, push = s < 0 ? 'south' : 'north', yawCh = rear ? (s < 0 ? 'babor' : 'estribor') : (s < 0 ? 'estribor' : 'babor');
  thr(back, YD - 3, outZ, push); thr(back, YD - 1, outZ, push); rcv(back, YD - 2, outZ, s < 0 ? 'north' : 'south', yawCh);
  cab([[fx, YD - 3, fz], [fx, YD - 4, fz], [fx + ox * 8, YD - 4, fz], [fx + ox * 8, YD - 3, fz], [back, YD - 3, fz]]);   // motor y módulo, por dentro de la cruceta
  BACK[fx + ',' + fz] = back;
}
// popa del casco: 2 × 9 propulsores de avance a los lados del portón, con su pared de cables tapada
for (const s of [-1, 1]) { for (const dz of [13, 15]) for (const y of [17, 19, 21]) thr(12, y, CZ + s * dz, 'east');
  for (const dz of [13, 15]) for (const y of [18, 20]) rcv(12, y, CZ + s * dz, 'west', 'avance');
  for (let y = 16; y <= 23; y++) for (let k = 12; k <= 16; k++) { const z = CZ + s * k; set(13, y, z, ((y === 17 || y === 19 || y === 21) && k >= 13) || k === 16 ? CAB : LG); set(14, y, z, LG); }
  cab([[13, 23, CZ + s * 16], [13, 24, CZ + s * 16]]); }
for (let z = CZ - 15; z <= CZ + 15; z++) { set(14, 24, z, LG); if (Math.abs(z - CZ) <= 11) { set(13, 23, z, LG); set(14, 23, z, LG); } }
cab([[13, 24, CZ - 16], [13, 24, CZ + 16]]);                                                                          // dintel del portón: une las dos vigas
// giro de proa y de popa: dos propulsores por costado, empotrados en el casco
for (const [x, sideCh] of [[32, ['babor', 'estribor']], [116, ['estribor', 'babor']]]) for (const s of [-1, 1]) {
  const zw = CZ + s * 17, zi = CZ + s * 16, push = s < 0 ? 'south' : 'north', ch = s < 0 ? sideCh[0] : sideCh[1];
  for (let xx = x - 1; xx <= x + 3; xx++) for (let y = 20; y <= 23; y++) { set(xx, y, zi, LG); set(xx, y, zi - s, LG); }
  thr(x, 21, zw, push); thr(x + 2, 21, zw, push); set(x + 1, 21, zw, WC); rcv(x + 1, 21, zi, push, ch);
  cab([[x, 21, zi], [x, 22, zi], [x + 2, 22, zi], [x + 2, 21, zi]]); cab([[x, 22, zi], [x, 24, zi]]);
}

// ── 5. Torretas giratorias (Swivel Bearing) con su puesto de artillero ──
const TURRETS = [[36, -1], [118, -1], [36, 1], [118, 1]];
for (const [tx, s] of TURRETS) {
  const tz = CZ + s * 15, out = s < 0 ? 'north' : 'south', toIn = -s, zm = tz + s, zf = tz + s * 2, y0 = YD + 3;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let y = y0; y <= y0 + 3; y++) { const id = get(tx + dx, y, tz + dz); if (id && Math.hypot(dx, dz) <= 3) print('TORRETA PISA ' + id + ' en ' + [tx + dx, y, tz + dz]); }
  set(tx, YD - 1, tz, 'createaddition:electric_motor', { facing: 'up' }); set(tx, YD, tz, 'create:shaft', { axis: 'y' });
  set(tx, YD + 1, tz, 'simulated:swivel_bearing', { facing: 'up' }); set(tx, YD + 2, tz, 'simulated:swivel_bearing_link_block', { facing: 'up' });
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) set(tx + dx, y0, tz + dz, GC);                // suelo de la torreta
  set(tx, y0, tz, 'create:gearbox', { axis: 'x' }); set(tx, y0, zm, 'create:shaft', { axis: 'z' }); set(tx, y0, zf, 'create:gearbox', { axis: 'y' });
  for (const dx of [-1, 1]) { set(tx + dx, y0, zf, 'aeronautics:mounted_potato_cannon', { facing: out, axis_along_first: 'true' }); set(tx + dx, y0 + 1, zf, 'botanypots:terracotta_hopper_botany_pot'); rcv(tx + dx, y0 + 1, zm, 'up', 'fuego'); }
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (const y of [y0 + 1, y0 + 2]) {
    if ((Math.abs(dx) < 2 && Math.abs(dz) < 2) || get(tx + dx, y, tz + dz) != null) continue;
    set(tx + dx, y, tz + dz, y === y0 + 2 ? BC : Math.abs(dz) < 2 ? GLP : WC);
  }
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {                                           // techo a cuatro aguas
    const ex = Math.abs(dx) === 2, ez = Math.abs(dz) === 2, x = tx + dx, z = tz + dz;
    if (ex === ez) set(x, y0 + 3, z, LG); else if (ez) stair(x, y0 + 3, z, QS, dz < 0 ? 'n' : 's'); else stair(x, y0 + 3, z, QS, dx < 0 ? 'w' : 'e');
  }
  for (let k = 1; k <= 3; k++) set(tx, YD + 1, tz + toIn * k, 'create:cogwheel', { axis: 'y' });                    // engranajes hasta el volante
  set(tx, YD + 2, tz + toIn * 3, 'simulated:steering_wheel', { facing: s < 0 ? 'south' : 'north', on_floor: 'true' });
  set(tx + 1, YD + 1, tz + toIn * 3, 'minecraft:lever', { face: 'floor', facing: 'east' }); snd(tx + 2, YD + 1, tz + toIn * 3, 'up', 'fuego');
}

// ── 6. Isla de cristal: dos plantas, puente en voladizo, azotea con paneles, radar giratorio, mástil, bandera y escalera exterior ──
const IX0 = 70, IX1 = 92, IZ0 = CZ + 8, IZ1 = CZ + 16, BX0 = 68, BX1 = 94, BZ0 = CZ + 5, BZ1 = CZ + 16, F1 = 30, F2 = 34, RF = 39;
for (let x = IX0; x <= IX1; x++) for (let y = YD + 1; y <= F2 - 1; y++) for (let z = IZ0; z <= IZ1; z++) {
  const e = x === IX0 || x === IX1 || z === IZ0 || z === IZ1; if (!e) { if (y === F1) set(x, y, z, LG); continue; }
  const post = ((x === IX0 || x === IX1) && (z === IZ0 || z === IZ1)) || ((z === IZ0 || z === IZ1) && (x - IX0) % 4 === 0);
  set(x, y, z, post ? WC : (y === YD + 1 || y === F1) ? LG : GLP);
}
for (const y of [YD + 1, YD + 2]) del(IX0, y, CZ + 12); set(IX0, YD + 1, CZ + 12, 'minecraft:iron_door', { half: 'lower', facing: 'west' }); set(IX0, YD + 2, CZ + 12, 'minecraft:iron_door', { half: 'upper', facing: 'west' });
for (let x = BX0; x <= BX1; x++) for (let z = BZ0; z <= BZ1; z++) {
  const e = x === BX0 || x === BX1 || z === BZ0 || z === BZ1, corner = (x === BX0 || x === BX1) && (z === BZ0 || z === BZ1);
  set(x, F2, z, e ? WC : LG);
  if (e) { set(x, F2 + 1, z, WC); for (const y of [F2 + 2, F2 + 3]) set(x, y, z, corner ? WC : GLP); }
  set(x, RF - 1, z, e ? BC : LG); set(x, RF, z, LG); if (e) set(x, RF + 1, z, WC);
}
for (const kx of [70, 76, 82, 88]) for (let i = 0; i <= 2; i++) for (let k = 0; k <= 2 - i; k++) { const z = IZ0 - 1 - k, y = F2 - 1 - i; if (k === 2 - i) stair(kx, y, z, QS, 'n', { top: true }); else set(kx, y, z, WC); }
for (const kz of [CZ + 10, CZ + 14]) { stair(BX0, F2 - 1, kz, QS, 'w', { top: true }); set(BX0 + 1, F2 - 1, kz, WC); stair(BX1, F2 - 1, kz, QS, 'e', { top: true }); set(BX1 - 1, F2 - 1, kz, WC); }
for (let y = YD + 1; y <= F2 - 1; y++) set(91, y, CZ + 15, 'minecraft:ladder', { facing: 'north' });
set(91, F1, CZ + 15, 'minecraft:iron_trapdoor', { half: 'top' }); set(91, F2, CZ + 15, 'minecraft:iron_trapdoor', { half: 'top' });
// escalera exterior de la cubierta al balcón del puente: peldaños de cuarzo sobre una zanca maciza y barandilla
for (let i = 0; i < F2 - YD; i++) { const x = BX0 - (F2 - YD) + i, y = YD + 1 + i; for (const z of [CZ + 14, CZ + 15]) { stair(x, y, z, QS, 'w'); for (let yy = YD + 1; yy < y; yy++) set(x, yy, z, Q); } for (let yy = YD + 1; yy <= y; yy++) set(x, yy, CZ + 13, Q); set(x, y + 1, CZ + 13, BARS); }
for (const y of [F2 + 1, F2 + 2]) del(BX0, y, CZ + 14); set(BX0, F2 + 1, CZ + 14, 'minecraft:iron_door', { half: 'lower', facing: 'west' }); set(BX0, F2 + 2, CZ + 14, 'minecraft:iron_door', { half: 'upper', facing: 'west' });
for (const x of [69, 75, 81, 87, 93]) set(x, F2 - 1, CZ + 6, LAMP, { hanging: 'true' });   // bajo el voladizo del puente
// mandos (y = F2 + 1)
const Y = F2 + 1;
snd(93, Y, CZ + 6, 'up', 'avance'); set(93, Y, CZ + 7, 'simulated:throttle_lever', { face: 'floor', facing: 'west' });
set(93, Y, CZ + 9, 'simulated:linked_typewriter', { facing: 'west' }); set(93, Y, CZ + 10, 'aeroworks:control_desk', { facing: 'west' }); set(93, Y, CZ + 11, 'simulated:steering_wheel', { facing: 'west' });
set(93, Y, CZ + 13, 'simulated:throttle_lever', { face: 'floor', facing: 'west' }); snd(93, Y, CZ + 14, 'up', 'altitud');
set(84, Y, CZ + 13, 'simulated:altitude_sensor', { face: 'floor', facing: 'east', dial: 'linear' }); set(85, Y, CZ + 13, 'simulated:redstone_inductor', { facing: 'east' }); snd(86, Y, CZ + 13, 'up', 'altitud');
set(84, Y, CZ + 7, 'minecraft:lever', { face: 'floor', facing: 'east' }); snd(85, Y, CZ + 7, 'up', 'fuego');
set(87, Y, CZ + 7, 'minecraft:lever', { face: 'floor', facing: 'east' }); snd(88, Y, CZ + 7, 'up', 'amarres');
set(78, Y, CZ + 10, 'simulated:navigation_table', { facing: 'up' }); set(74, Y, CZ + 10, 'simulated:physics_assembler', { face: 'floor', facing: 'east' });
for (let x = 72; x <= 90; x += 6) { set(x, F2 + 3, CZ + 11, SEA); }
for (let x = 73; x <= 89; x += 8) { set(x, F1 - 1, CZ + 12, SEA); set(x, F2 - 1, CZ + 12, SEA); }
for (let z = CZ + 9; z <= CZ + 13; z++) stair(90, Y, z, QS, 'w');
// energía: 24 paneles en dos filas sobre la azotea (el cable va debajo), celdas en la planta baja, bajante tapado hasta la viga del hangar
for (let x = 71; x <= 83; x++) for (const z of [CZ + 8, CZ + 9]) { set(x, RF + 1, z, 'powah:solar_panel_niotic'); set(x, RF, z, CAB); }
set(70, RF, CZ + 8, LG); set(70, RF, CZ + 9, LG);
cab([[71, RF - 1, CZ + 9], [71, RF - 1, CZ + 15]]); for (let z = CZ + 9; z <= CZ + 14; z++) set(71, RF - 2, z, LG);   // viga que tapa el cable del techo
for (let x = 72; x <= 79; x++) { set(x, YD + 1, CZ + 15, 'powah:energy_cell_niotic'); set(x, YD, CZ + 15, CAB); } for (let x = 72; x <= 79; x++) set(x, YD - 1, CZ + 15, LG);
for (let y = YD; y <= RF - 2; y++) { set(71, y, CZ + 15, CAB); for (const [dx, dz] of [[1, 0], [0, -1], [-1, 0], [0, 1]]) if (get(71 + dx, y, CZ + 15 + dz) == null) set(71 + dx, y, CZ + 15 + dz, LG); }
cab([[71, YD - 1, CZ + 15], [71, YD - 1, CZ + 16]]); set(71, YD - 2, CZ + 15, LG); set(70, YD - 1, CZ + 15, LG); set(72, YD - 1, CZ + 15, LG);
// radar giratorio, mástil con antena, bandera y luces de posición
set(88, RF - 1, CZ + 13, 'createaddition:electric_motor', { facing: 'up' }); set(88, RF, CZ + 13, 'create:mechanical_bearing', { facing: 'up' }); set(88, RF + 1, CZ + 13, IRON);
for (let k = -3; k <= 3; k++) for (const y of [RF + 2, RF + 3]) sail(88 + k, y, CZ + 13, 'south');
set(88, RF + 2, CZ + 13, IRON); set(88, RF + 3, CZ + 13, IRON); cab([[87, RF - 1, CZ + 13], [71, RF - 1, CZ + 13]]); for (let x = 72; x <= 87; x++) set(x, RF - 2, CZ + 13, LG);
feature({ type: 'antenna', x: 80, y: RF + 1, z: CZ + 13, height: 12 });
for (const [x, z, c] of [[BX0, BZ0, 'minecraft:red_stained_glass'], [BX1, BZ0, 'minecraft:green_stained_glass']]) { set(x, RF + 2, z, SEA); set(x, RF + 3, z, c); }

// ── 6b. Número de casco «01» en la proa (se lee desde popa) y luces de navegación ──
const GLYPH = { 0: [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '], 1: ['  #  ', ' ##  ', '# #  ', '  #  ', '  #  ', '  #  ', '#####'] };
for (const [ch, z0] of [['0', CZ - 6], ['1', CZ + 2]]) GLYPH[ch].forEach((row, r) => [...row].forEach((c, k) => { if (c === '#') set(136 - r, YD, z0 + k, WC); }));
for (const [s, glass] of [[-1, 'minecraft:red_stained_glass'], [1, 'minecraft:green_stained_glass']]) { const z = CZ + s * 34; set(144, YD + 1, z, SEA); set(144, YD + 2, z, glass); }

// ── 7. Grúa de cubierta a babor ──
fill(58, YD + 1, CZ - 13, 60, YD + 2, CZ - 11, LG); set(59, YD + 2, CZ - 12, BC);
for (let y = YD + 3; y <= YD + 11; y++) set(59, y, CZ - 12, GIRD, { axis: 'y' });
for (let x = 52; x <= 62; x++) set(x, YD + 12, CZ - 12, GIRD, { axis: 'x' });
fill(61, YD + 11, CZ - 12, 62, YD + 11, CZ - 12, IRON);
for (let y = YD + 8; y <= YD + 11; y++) set(53, y, CZ - 12, 'minecraft:chain', { axis: 'y' }); set(53, YD + 7, CZ - 12, IRON);
set(59, YD + 13, CZ - 12, 'minecraft:end_rod', { facing: 'up' });

// ── 8. Vehículos aparcados: cada uno es una nave aparte con su Physics Assembler, un Docking Connector que toca el de la estación
// y una palanca encima de él para extenderlo. El conector de la estación lo extiende Amarres (F7).
const dockBase = (x, y, z) => { set(x, y, z, 'simulated:docking_connector', { facing: 'up' }); rcv(x, y - 1, z, 'down', 'amarres'); };
const heli = (cx, y0, cz) => {                                                                                       // conector de la estación en (cx, y0-1, cz)
  for (let dx = -2; dx <= 2; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = y0 + 1; y <= y0 + 3; y++) {
    const sh = Math.abs(dx) === 2 || dz !== 0 || y === y0 + 1 || y === y0 + 3; if (sh) set(cx + dx, y, cz + dz, dx === 2 && y > y0 + 1 ? GLB : y === y0 + 3 ? LG : WC); }
  fill(cx + 3, y0 + 2, cz - 1, cx + 3, y0 + 2, cz + 1, GLB);                                                          // morro de cristal
  for (const dz of [-2, 2]) { for (let dx = -2; dx <= 2; dx++) set(cx + dx, y0, cz + dz, BARS); for (const dx of [-1, 1]) set(cx + dx, y0 + 1, cz + dz, BARS); }   // patines con sus patas
  for (let dx = -7; dx <= -3; dx++) set(cx + dx, y0 + 2, cz, LG); fill(cx - 7, y0 + 3, cz, cx - 7, y0 + 4, cz, WC);      // cola y deriva
  set(cx - 1, y0 + 2, cz, 'simulated:physics_assembler', { face: 'floor', facing: 'east' }); set(cx, y0 + 2, cz, 'minecraft:lever', { face: 'floor', facing: 'east' }); set(cx + 1, y0 + 2, cz, 'create:white_seat');
  set(cx - 1, y0 + 4, cz, 'simulated:white_portable_engine', { facing: 'east' }); set(cx, y0 + 4, cz, 'create:gearbox', { axis: 'z' });
  set(cx, y0 + 5, cz, 'aeronautics:gyroscopic_propeller_bearing', { facing: 'up' }); set(cx, y0 + 6, cz, CAS);
  for (let k = 1; k <= 4; k++) for (const [dx, dz] of [[k, 0], [-k, 0], [0, k], [0, -k]]) sail(cx + dx, y0 + 6, cz + dz, 'up');
  set(cx, y0, cz, 'simulated:docking_connector', { facing: 'down' }); dockBase(cx, y0 - 1, cz);
};
const plane = (cx, y0, cz) => {                                                                                      // conector bajo la panza en (cx, y0+1)
  const px = cx - 5;
  for (let x = px; x <= px + 10; x++) for (let dz = -1; dz <= 1; dz++) for (let y = y0 + 2; y <= y0 + 4; y++) {
    const sh = x === px || x === px + 10 || dz !== 0 || y === y0 + 2 || y === y0 + 4; if (sh) set(x, y, cz + dz, x >= px + 7 && x <= px + 8 && y === y0 + 4 ? GLB : y === y0 + 3 && dz !== 0 ? 'minecraft:light_blue_concrete' : WC); }
  for (const [x, dz] of [[px + 3, -1], [px + 3, 1], [px + 9, 0]]) { set(x, y0, cz + dz, BARS); set(x, y0 + 1, cz + dz, BARS); }   // tren de aterrizaje
  for (let x = px + 5; x <= px + 6; x++) for (let dz = 2; dz <= 7; dz++) for (const s of [-1, 1]) set(x, y0 + 3, cz + s * dz, 'createpropulsion:wing', { facing: 'up' });
  for (const s of [-1, 1]) for (let dz = 2; dz <= 3; dz++) set(px, y0 + 3, cz + s * dz, 'createpropulsion:tempered_wing', { facing: 'up' }); fill(px, y0 + 5, cz, px + 1, y0 + 6, cz, WC);
  set(px + 7, y0 + 3, cz, 'simulated:physics_assembler', { face: 'floor', facing: 'east' }); set(px + 8, y0 + 3, cz, 'create:white_seat');
  set(px + 9, y0 + 3, cz, 'simulated:white_portable_engine', { facing: 'east' }); set(px + 10, y0 + 3, cz, 'create:shaft', { axis: 'x' });
  set(px + 11, y0 + 3, cz, 'aeronautics:propeller_bearing', { facing: 'east' }); set(px + 12, y0 + 3, cz, CAS);
  for (let k = 1; k <= 3; k++) for (const [dy, dz] of [[k, 0], [-k, 0], [0, k], [0, -k]]) sail(px + 12, y0 + 3 + dy, cz + dz, 'east');
  set(cx, y0 + 3, cz, 'minecraft:lever', { face: 'floor', facing: 'east' });
  set(cx, y0 + 1, cz, 'simulated:docking_connector', { facing: 'down' });
  set(cx, y0, cz, 'simulated:docking_connector', { facing: 'up' }); rcv(cx - 1, y0, cz, 'up', 'amarres');             // poste de amarre sobre la cubierta
};
const drone = (x, y0, z) => {                                                                                        // dron de una plaza, rotor detrás del piloto
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) set(x + dx, y0, z + dz, BARS);
  fill(x - 1, y0 + 1, z - 1, x + 1, y0 + 1, z + 2, WC); set(x, y0 + 1, z + 2, LG);
  set(x, y0 + 2, z - 1, 'create:white_seat'); set(x, y0 + 2, z, 'minecraft:lever', { face: 'floor', facing: 'east' }); set(x + 1, y0 + 2, z, 'simulated:physics_assembler', { face: 'floor', facing: 'east' });
  set(x, y0 + 2, z + 1, 'simulated:white_portable_engine', { facing: 'south' }); set(x, y0 + 2, z + 2, 'create:gearbox', { axis: 'x' });
  set(x, y0 + 3, z + 2, 'create:shaft', { axis: 'y' }); set(x, y0 + 4, z + 2, 'aeronautics:gyroscopic_propeller_bearing', { facing: 'up' }); set(x, y0 + 5, z + 2, CAS);
  for (let k = 1; k <= 2; k++) for (const [dx, dz] of [[k, 0], [-k, 0], [0, k], [0, -k]]) sail(x + dx, y0 + 5, z + 2 + dz, 'up');
  set(x, y0, z, 'simulated:docking_connector', { facing: 'down' }); dockBase(x, y0 - 1, z);
};
heli(PADS[1][0], YD + 1, PADS[1][1]);                                                                                // en el helipuerto de proa
plane(21, YD + 1, CZ);                                                                                               // en el umbral de la pista
plane(SPOTS[0][0], YH + 1, SPOTS[0][1]);                                                                             // en el hangar
heli(SPOTS[1][0], YH + 1, SPOTS[1][1]);
for (const [x, z] of DRONES) drone(x, YH + 1, z);

// ── 9. Cables a las turbinas: de la viga del hangar, por la capa de en medio de la plataforma y por dentro del brazo de la cruceta ──
for (const [fx, fz] of FANS) { const s = fz < CZ ? -1 : 1, x0 = Math.min(fx, 120);
  cab([[x0, YD - 1, CZ + s * 16], [x0, YD - 1, CZ + s * 19], [fx, YD - 1, CZ + s * 19], [fx, YD - 4, CZ + s * 19], [fx, YD - 4, fz]]); }

// ── 10. Vistas y guía ──
zone('Vista general', [79, 30, CZ], { from: [215, 95, 175] });
zone('Cubierta de vuelo desde popa', [90, 26, CZ], { from: [-12, 46, CZ] });
zone('Proa y número de casco', [138, 26, CZ], { from: [178, 44, CZ + 6] });
zone('Isla y escalera exterior', [74, 31, CZ + 10], { from: [48, 42, CZ - 12] });
zone('Puente de mando (sin techo)', [84, 35, CZ + 10], { from: [84, 68, CZ + 34], cut: 37 });
zone('Torreta de proa de estribor', [118, 29, CZ + 15], { from: [132, 38, CZ + 3] });
zone('Turbina de popa de babor', [22, 24, CZ - 27], { from: [6, 42, CZ - 46] });
zone('Góndola de babor y quemadores', [77, 30, CZ - 27], { from: [77, 22, CZ - 70] });
zone('Popa y portón del hangar', [12, 19, CZ], { from: [-26, 24, CZ + 8] });
zone('Hangar (corte en y=23)', [66, 15, CZ], { from: [66, 78, CZ + 62], cut: 23 });
zone('Cubierta inferior (corte en y=14)', [66, 11, CZ], { from: [66, 70, CZ + 60], cut: 14 });
explain('Qué es', 'Helicarrier de 140 × 75 de planta y 52 de alto: casco blanco y gris de hormigón con ventanas corridas, cubierta de vuelo con pista, dos helipuertos, isla de cristal, cuatro turbinas de sustentación en las plataformas laterales y cuatro torretas giratorias. '
  + 'Pesa 39 800 con los pesos de Sable. Lo sostienen dos góndolas de 24 900 m³ con 54 quemadores cada una (500 m³ por quemador y 1,5 por m³ en tu config): 74 800 de sustentación, 1,9 veces su peso, con sitio para carga. '
  + 'Se mueve con 56 propulsores iónicos de Create Propulsion, que solo gastan FE, y 26 paneles solares dan la energía. No necesita combustible; solo los vehículos queman combustible en su motor portátil.');
explain('Frecuencias (Redstone Link)', 'Cada enlace lleva ya su pareja de objetos en el NBT, y su ficha en el visor dice cuál es. Si los pones a mano, mete esos dos objetos en las dos ranuras del enlace, igual en el emisor que en sus receptores.\n'
  + 'F1 Avance: lana blanca + lana lima. Emisor junto a la palanca de empuje del puente (93,35,46). Receptores: 16 propulsores de los módulos de popa y 12 de la popa del casco.\n'
  + 'F2 Atrás: lana blanca + lana roja. 12 propulsores de los módulos de proa.\n'
  + 'F3 Girar a babor: lana blanca + lana amarilla. F4 Girar a estribor: lana blanca + lana azul. 8 propulsores cada uno: en el costado exterior de los módulos y en el casco, delante y detrás.\n'
  + 'F5 Altitud: pluma + lana blanca. Emisores: el sensor de altitud (86,35,53) y la palanca de ascenso (93,35,54). Receptores: los 54 enlaces entre los quemadores.\n'
  + 'F6 Fuego: pólvora + lana roja. Emisores: la palanca del puente (84,35,47) y la de cada artillero. Receptores: los 8 cañones.\n'
  + 'F7 Amarres: cadena + lana gris. Emisor: palanca del puente (87,35,47). Receptores: bajo los 9 conectores de la estación.\n'
  + 'En el Linked Typewriter del puente (93,35,49) asigna W a F1, S a F2, A a F3, D a F4 y Espacio a F6.');
explain('Cómo se queda quieta en el aire', 'Los quemadores no gastan nada: solo necesitan señal. Ponles 500 en su panel. El sensor de altitud del puente (84,35,53) da más señal cuanto más baja va si lo pones en «disminuye al subir»; elige su franja, por ejemplo de 180 a 200. '
  + 'Por debajo de la franja los 108 quemadores van a tope y por encima se apagan, así que la estación sube y se queda donde la sustentación iguala al peso. El inductor (85,35,53) suaviza la señal para que no suba y baje sin parar. '
  + 'Las góndolas van 19 bloques por encima del centro de gravedad y alineadas con él: si se inclina, se endereza sola como un péndulo. Sin empuje, el rozamiento de las góndolas la frena y se queda aparcada en el aire.');
explain('Montaje, en este orden', '1) Vehículos: pon Honey Glue solo en cada vehículo, mantén clic derecho en su Physics Assembler y tira de él. Quedan como naves aparte, amarradas a su conector.\n'
  + '2) Torretas: Super Glue en cada torreta, desde el bloque de enlace de la Swivel Bearing hasta el techo. Al girar el volante del artillero, la torreta se monta y gira. Deja el bloqueo por redstone como viene.\n'
  + '3) Radar: Super Glue en el plato (bloque de hierro y velas).\n'
  + '4) Estación: cúbrela con Honey Glue, o con el Auto Glue de Create Propulsion, sin coger los vehículos. Son unos 52 500 bloques y el máximo es 128 000. Mantén clic derecho en el Physics Assembler del puente (74,35,50) y tira de la palanca. '
  + 'Hazlo en tierra o a poca altura: en tu config no se puede desmontar en pleno aire.');
explain('Conducción', 'W o la palanca de empuje (93,35,47) para avanzar, S para ir atrás, A y D para girar. La palanca de ascenso (93,35,53) se suma a la altitud automática; para bajar, baja la franja del sensor. '
  + 'El escape de los propulsores necesita 10 bloques libres detrás y daña lo que pilla: no entres al hangar por el portón de popa con el avance encendido. '
  + 'Las cuatro turbinas son ayuda para subir: giran con su motor eléctrico. Ajusta las RPM en cada motor (0 las para); si empujan hacia abajo, invierte el giro.');
explain('Energía', '26 paneles solares niotic en la azotea de la isla dan 39 000 FE/t de día, y 8 Energy Cells niotic en la planta baja de la isla guardan para la noche. '
  + 'Ningún cable se ve. Bajan forrados por una esquina de la isla, van por dos vigas a lo largo del techo del hangar y por el dintel del portón, y de ahí salen a cada máquina: por la capa de en medio de las plataformas y por dentro de los brazos de las turbinas. '
  + 'Consumo a tope: los 56 propulsores gastan 2240 FE/t (40 cada uno), y los 9 motores eléctricos (4 turbinas, 4 torretas y el radar) hasta 480 FE/t cada uno. Si algo no recibe energía, pon con la llave de Powah la cara de la celda en salida.');
explain('Hangar y vehículos', 'Hangar de 108 × 33 × 8 con portón de popa de 23 × 7. Tiene tres plazas: un avión, un helicóptero y una libre. Al lado hay cuatro drones de una plaza. En cubierta hay otro avión en el umbral de la pista y otro helicóptero en el helipuerto de proa. '
  + 'Cada vehículo lleva asiento, motor portátil, hélice, Physics Assembler y un Docking Connector debajo, encima del de la estación. El motor portátil quema combustible: ponle carbón, y en su panel puedes cambiar el sentido de giro. '
  + 'Para amarrar, extiende los dos conectores: la palanca del vehículo, que está encima de su conector, y Amarres (F7). Quedan unidos rígidos pero siguen siendo naves aparte, y el conector pasa objetos y fluidos. Para soltar, recoge cualquiera de los dos. '
  + 'Delante hay una sala en la proa, y debajo del hangar una cubierta inferior. Se baja por la escalera de mano de la proa (122,16,46).');
explain('Torretas', 'Cuatro torretas en el canto de la cubierta, dos por banda, con dos Mounted Potato Cannons cada una. Van sobre una Swivel Bearing: el volante del artillero mueve los engranajes y gira la torreta. '
  + 'Un motor eléctrico bajo la cubierta carga los cañones con un eje que pasa por dentro de la Swivel Bearing. Encima de cada cañón hay una botany pot con tolva: ponle tierra y una patata, y la cosecha cae sola al cañón. '
  + 'Disparan mientras Fuego (F6) esté activo: la palanca del puente o la de cada artillero. Create Big Cannons no está en tu pack: estos son los cañones del propio Aeronautics.');
explain('Comprobado y sin comprobar', 'Comprobado: las góndolas son herméticas y el centro de sustentación cae sobre el de gravedad. Cada propulsor, quemador, cañón y conector recibe la señal de su canal, todo lo eléctrico está en una sola red con los paneles y los escapes tienen 10 bloques libres. '
  + 'Además, no hay bloques solapados ni sueltos, ninguna losa hace de suelo, ninguna escalera queda suelta, ningún cable se ve y ningún rincón accesible queda a oscuras. '
  + 'Sin comprobar en el juego: hacia dónde va la flecha del inductor (tiene que ir del sensor al enlace), cuánto pierden las góndolas con la altura, si las Energy Cells sueltan energía sin tocar sus caras, si una torreta montada sigue a la estación al montarla, cómo vuelan los vehículos y si el constructor aplica las frecuencias del NBT.');

// ── 11. Comprobación ──
for (const [p, id] of [[[74, Y, CZ + 10], 'simulated:physics_assembler'], [[84, Y, CZ + 13], 'simulated:altitude_sensor'], [[93, Y, CZ + 9], 'simulated:linked_typewriter']]) if (get(...p) !== id) print('PISADO ' + id + ' en ' + p);
`;

export { code, ctx };
if (process.argv[1].endsWith('estacion3.mjs')) {
  const out = JSON.parse(await runTool('run_code', { code }, ctx));
  console.log('error:', out.error, '| bloques:', out.blocks, '\n', (out.printed || []).join('\n '), '\n notas:', (out.notes || []).filter(n => !/^route/.test(n)).slice(0, 12).join('\n  '), '\n fallos:', JSON.stringify(out.failed || []).slice(0, 600));
  writeFileSync(OUT + 'estacion3.json', JSON.stringify(ctx.design));
}
