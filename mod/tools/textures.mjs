// Texturas y modelos de objeto del mod buildgolem, generados (pixel art en mapas de caracteres + la textura 128×128 del gólem).
// Uso (desde mod/): node tools/textures.mjs   →  golem/resources/assets/buildgolem/{textures,models}/…
// Las cajas del gólem (u, v, ancho, alto, fondo) van a juego con BuilderGolemModel.java.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

const ASSETS = 'golem/resources/assets/buildgolem';
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = b => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function png(w, h, rgba) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const noise = (x, y, s = 0) => { let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
const shade = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v * k))));

class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Uint8Array(w * h * 4); }
  set(x, y, c, a = 255) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 4; this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2]; this.px[i + 3] = a; }
  rect(x, y, w, h, fn) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = fn(i, j, x + i, y + j); if (c) this.set(x + i, y + j, c); } }
  save(file) { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, png(this.w, this.h, this.px)); }
}

// ── objetos 16×16: mapas de caracteres ──
function sprite(rows, pal) {
  const c = new Canvas(16, 16);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') c.set(x, y, hex(pal[ch])); }));
  return c;
}
const ITEMS = {
  builder_dust: [[
    '................', '................', '................', '........w.......', '................', '......y.........', '...........w....', '.......BB.......',
    '.....bBBbb......', '....bbbbBbby....', '...bBbbbbbBbb...', '..bbbbyBbbbbbb..', '.dbBbbbbbbBbbbd.', '.ddbbbbbbbbbbdd.', '..dddddddddddd..', '................',
  ], { b: '#2f6fb0', B: '#6fa8dc', d: '#1d4a78', y: '#ffc21a', w: '#ffffff' }],
  blueprint_alloy: [[
    '................', '................', '................', '................', '................', '.......hhhhhh...', '.....hhLLyLLLd..', '...hhLLLLLLLdd..',
    '..hLLLyLLLLddd..', '..dLLLLLLLddd...', '..ddddLLLddd....', '...dddddddd.....', '................', '................', '................', '................',
  ], { h: '#cfe3f7', L: '#6fa8dc', d: '#1d5a94', y: '#ffd15c' }],
  golem_core: [[
    '................', '................', '.....gggggg.....', '....gGyGGyGg....', '...gGssssssGg...', '..gGsccccccsGg..', '..gysCCCCCCsyg..', '..gGsCCwwCCsGg..',
    '..gGsCCwwCCsGg..', '..gysCCCCCCsyg..', '..gGsccccccsGg..', '...gGssssssGg...', '....gGyGGyGg....', '.....gggggg.....', '................', '................',
  ], { g: '#5b5f63', G: '#c9c6bd', s: '#22282e', c: '#35b7c9', C: '#7fe9f2', w: '#ffffff', y: '#ffc21a' }],
  hi_vis_vest: [[
    '................', '....OO....OO....', '....Oo....oO....', '...Ooo....ooO...', '..Oooo....oooO..', '..Ooooo..ooooO..', '..oooooZZooooo..', '..SSSSSZZSSSSS..',
    '..sssssZZsssss..', '..oooooZZooooo..', '..SSSSSZZSSSSS..', '..sssssZZsssss..', '..oooooZZooooo..', '..dddddddddddd..', '................', '................',
  ], { O: '#c45a00', o: '#ff7a1a', Z: '#9c3d00', S: '#eef3f6', s: '#a9b7c2', d: '#a84a00' }],
  builder_golem: [[
    '.......aa.......', '......oAAo......', '....ohYYYYbo....', '...ohYYYYYYbo...', '..ohYYYYYYYYbo..', '.oBBBBBBBBBBBBo.', '..ouuuuuuuuuuo..', '...oIIIIIIIso...',
    '...oIddIIddso...', '...oIEcIIcEso...', '...oIIInnIIso...', '...oIIInnIIso...', '...ovIImmIIso...', '...ovvIIIIIso...', '...oddddddddo...', '................',
  ], { o: '#3a3530', a: '#ffb000', A: '#3a3f45', h: '#fff0b0', Y: '#ffc21a', b: '#c99200', B: '#e8a800', u: '#7a5a00', I: '#d6d2c9', s: '#b4b0a7', d: '#8c8880',
    E: '#d9feff', c: '#35d0e0', n: '#a19d94', v: '#4f8a2f', m: '#77736b' }],
  work_gear: [[
    '................', '......gGGg......', '...gg.gGGg.gg...', '..gGGgGGGGgGGg..', '..gGGGhhGGGGGg..', '...gGGGddGGGg...', '.ggGGGdyydGGGgg.', '.gGGGdyYYydGGGg.',
    '.gGGGdyYYydGGGg.', '.ggGGGdyydGGGgg.', '...gGGGddGGGg...', '..gGGGGGGGGsGg..', '..gGGgGGGGgsGg..', '...gg.gGGg.gg...', '......gGGg......', '................',
  ], { g: '#4a4e52', G: '#c9c6bd', h: '#efece4', s: '#9a968e', d: '#22282e', y: '#ffc21a', Y: '#fff0b0' }],
  binder: [[
    '................', '....yyyy........', '...yy..yy.......', '..KKKKKKKKKKK...', '..KNNNNNNNNNKp..', '..KNwwwwwwwNKp..', '..KNNNNNNNNNKp..', '..KNwwwwwNNNKp..',
    '..KNNNNNNNNNKp..', '..KNNNCCCNNNKp..', '..KNNNCyCNNNKp..', '..KNNNCCCNNNKp..', '..KNNNNNNNNNKp..', '..KKKKKKKKKKKp..', '...ppppppppppp..', '................',
  ], { K: '#0f2f52', N: '#1d5a94', w: '#cfe3f7', C: '#8b5a2b', y: '#ffc21a', p: '#e8e4d8' }],
  blank_blueprint: [[
    '................', '................', '..RRRRRRRRRRRR..', '..RrrrrrrrrrrR..', '...wwgwwgwwgw...', '...wwwwwwwwww...', '...gwwgwwgwwg...', '...wwwwwwwwww...',
    '...wwgwwgwwgw...', '...wwwwwwwwww...', '...gwwgwwgwwg...', '..RrrrrrrrrrrR..', '..RRRRRRRRRRRR..', '................', '................', '................',
  ], { R: '#8fa6bc', r: '#c9d8e6', w: '#eef4fa', g: '#cddcec' }],
  blueprint: [[
    '................', '................', '..RRRRRRRRRRRR..', '..RrrrrrrrrrrR..', '...bbbbbbbbbb...', '...bbbbLbbbgb...', '...bbbLbLbbbb...', '...bbLLLLLbgb...',
    '...bbLbbbLbbb...', '...bbLbybLbgb...', '...bbLLyLLbbb...', '..RrrrrrrrrrrR..', '..RRRRRRRRRRRR..', '.......yy.......', '......y..y......', '................',
  ], { R: '#0f3d6b', r: '#2f78bf', b: '#1d5a94', L: '#d9ebfb', g: '#6fa8dc', y: '#ffc21a' }],
};
mkdirSync(join(ASSETS, 'models/item'), { recursive: true });
for (const [name, [rows, pal]] of Object.entries(ITEMS)) {
  if (rows.length !== 16 || rows.some(r => r.length !== 16)) throw new Error(`${name}: el mapa debe ser 16×16`);
  sprite(rows, pal).save(join(ASSETS, 'textures/item', name + '.png'));
  writeFileSync(join(ASSETS, 'models/item', name + '.json'),
    JSON.stringify({ parent: 'minecraft:item/generated', textures: { layer0: `buildgolem:item/${name}` } }, null, 2) + '\n');
}

// ── casco de obra: modelo 3D (se ve en la cabeza del jugador) con visera, banda reflectante, nervio central, linterna que
// brilla en la oscuridad, lápiz metido en la banda y la pegatina del gólem a los lados. Textura 32×32: en el modelo, uv = px / 2
{
  const lerp = (p, q, t) => p.map((v, k) => Math.round(v + (q[k] - v) * t));
  const c = new Canvas(32, 32), Y = hex('#ffc21a'), YL = hex('#ffd34d'), YD = hex('#e8a800');
  const shell = (i, j, h, s) => shade(lerp(YL, YD, j / (h - 1)), .96 + noise(i, j, s) * .08);
  c.rect(0, 0, 16, 6, (i, j) => shell(i, j, 6, 1));                                      // A: costado liso (delante y detrás)
  c.rect(0, 6, 16, 6, (i, j) => shell(i, j, 6, 2));                                      // B: costado con pegatina (izquierda y derecha)
  const sticker = [' ggg ', 'gIIIg', 'gEIEg', 'gIIIg', ' gYg '];                          // la cara del gólem, con su casco
  sticker.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ' ') c.set(5 + x, 6 + y, hex({ g: '#3a3530', I: '#d6d2c9', E: '#35d0e0', Y: '#ffc21a' }[ch])); }));
  c.rect(16, 0, 16, 16, (i, j) => { const d = Math.hypot(i - 7.5, j - 7.5) / 10.6; return shade(lerp(hex('#fff0b0'), Y, Math.min(1, d * 1.3)), (d > .8 ? .86 : 1) * (.97 + noise(i, j, 3) * .06)); }); // C: arriba
  c.rect(0, 12, 16, 2, (i, j) => shade(Y, .92 + noise(i, j, 4) * .08));                   // D: ala por arriba
  c.rect(0, 14, 16, 1, () => hex('#c99200'));                                            //    canto del ala
  c.rect(0, 15, 16, 1, () => hex('#7a5a00'));                                            //    ala por debajo
  c.rect(0, 16, 16, 2, (i, j) => (i + j) % 4 === 0 ? hex('#ffffff') : j === 0 ? hex('#eef3f6') : hex('#a9b7c2')); // E: banda reflectante
  c.rect(16, 16, 8, 4, (i, j) => shade(hex('#ffe07a'), j === 0 ? 1.04 : .95 + noise(i, j, 5) * .06));             // F: nervios
  c.rect(24, 16, 4, 4, (i, j) => i === 0 || j === 0 ? hex('#5b6168') : hex('#3a3f45'));                           // G: carcasa de la linterna
  c.rect(28, 16, 4, 4, (i, j) => (i === 1 || i === 2) && (j === 1 || j === 2) ? hex('#ffffff') : hex('#fff2b8'));  // H: cristal (brilla)
  c.rect(16, 20, 4, 2, (i, j) => j === 1 ? hex('#c99200') : Y);                                                    // I: lápiz
  c.rect(20, 20, 2, 2, (i) => i === 1 ? hex('#3a3a3a') : hex('#e0b07a'));                                          //    punta
  c.rect(22, 20, 2, 2, (i) => i === 0 ? hex('#b8c0c8') : hex('#e88aa0'));                                          //    goma
  c.save(join(ASSETS, 'textures/item/hard_hat.png'));
  const px = r => r.map(v => v / 2);                                                       // de píxeles de la textura a uv del modelo
  const box = (from, to, uv, extra = {}) => ({ from, to, faces: Object.fromEntries(['north', 'south', 'east', 'west', 'up', 'down'].map(f => [f, { uv: px(uv[f] || uv.side), texture: '#hat', ...extra[f] }])) });
  const RIDGE = { side: [16, 16, 24, 18], up: [16, 16, 24, 20], down: [16, 18, 24, 20] };
  const GLOW = { neoforge_data: { block_light: 15, sky_light: 15 } };
  const model = {
    textures: { hat: 'buildgolem:item/hard_hat', particle: 'buildgolem:item/hard_hat' },
    elements: [
      box([-0.6, 12.2, -0.6], [16.6, 12.9, 16.6], { up: [0, 12, 16, 14], down: [0, 15, 16, 16], side: [0, 14, 16, 15] }),            // ala
      box([2.5, 12.2, -3], [13.5, 12.9, -0.6], { up: [0, 12, 16, 14], down: [0, 15, 16, 16], side: [0, 14, 16, 15] }),           // visera
      box([0.6, 12.4, 0.6], [15.4, 15.8, 15.4], { north: [0, 0, 16, 6], south: [0, 0, 16, 6], east: [0, 6, 16, 12], west: [0, 6, 16, 12], up: [16, 0, 32, 16], down: [0, 15, 16, 16] }),
      box([0.4, 13, 0.4], [15.6, 13.8, 15.6], { side: [0, 16, 16, 18], up: [0, 16, 16, 18], down: [0, 16, 16, 18] }),           // banda reflectante
      box([1.8, 15.8, 1.8], [14.2, 17, 14.2], { side: [0, 0, 16, 3], up: [16, 0, 32, 16], down: [16, 0, 32, 16] }),                      // cúpula
      box([6.8, 15.8, 0.3], [9.2, 17.3, 15.7], RIDGE), box([7.4, 17.3, 1.2], [8.6, 17.8, 14.8], RIDGE),
      box([6, 13.2, -0.4], [10, 15.2, 0.6], { side: [24, 16, 28, 20] }),                                                           // linterna
      box([6.5, 13.6, -0.7], [9.5, 14.8, -0.4], { side: [28, 16, 32, 20] }, { north: GLOW }),                                      // su cristal
      box([15.6, 13, 3.5], [16.4, 13.8, 12], { side: [16, 20, 20, 22] }),                                                        // lápiz en la banda
      box([15.6, 13, 12], [16.4, 13.8, 13.2], { side: [20, 20, 22, 22] }),
      box([15.6, 13, 2.6], [16.4, 13.8, 3.5], { side: [22, 20, 24, 22] }),
    ],
    display: {
      head: { translation: [0, 0, 0], scale: [1, 1, 1] },
      gui: { rotation: [30, 135, 0], translation: [0, -7.5, 0], scale: [.8, .8, .8] },
      ground: { translation: [0, -2, 0], scale: [.4, .4, .4] },
      fixed: { rotation: [0, 180, 0], translation: [0, -6.5, 0], scale: [.7, .7, .7] },
      thirdperson_righthand: { rotation: [75, 45, 0], translation: [0, -2.5, 0], scale: [.375, .375, .375] },
      thirdperson_lefthand: { rotation: [75, 45, 0], translation: [0, -2.5, 0], scale: [.375, .375, .375] },
      firstperson_righthand: { rotation: [0, 45, 0], translation: [0, -2.5, 0], scale: [.4, .4, .4] },
      firstperson_lefthand: { rotation: [0, 225, 0], translation: [0, -2.5, 0], scale: [.4, .4, .4] },
    },
  };
  writeFileSync(join(ASSETS, 'models/item/hard_hat.json'), JSON.stringify(model, null, 2) + '\n');
}

// ── chaleco reflectante puesto (capa de armadura 64×32 de Minecraft: torso en 16,16; sin mangas) ──
{
  const c = new Canvas(64, 32), OR = hex('#ff7a1a'), SIL = hex('#eef3f6'), SIL_D = hex('#a9b7c2'), EDGE = hex('#a84a00');
  const vest = (x, y, front) => {                                                          // x, y: columna y fila dentro de la cara
    if (y === 6 || y === 9) return SIL;
    if (y === 7 || y === 10) return SIL_D;
    if (y === 11) return EDGE;
    if (front !== undefined && (x === 1 || x === 6)) return x === 1 ? SIL : SIL_D;          // tirantes reflectantes
    return shade(OR, .93 + noise(x, y, 60 + (front ? 1 : 0)) * .1);
  };
  c.rect(20, 20, 8, 12, (i, j) => {                                                        // delante: cuello en V, cremallera, insignia
    if (j === 0 && i >= 2 && i <= 5 || j === 1 && i >= 3 && i <= 4) return null;
    if (j >= 2 && (i === 3 || i === 4) && j !== 6 && j !== 7 && j !== 9 && j !== 10) return i === 3 ? hex('#c45a00') : hex('#9c3d00');
    if (i === 5 && j === 3) return hex('#ffc21a');
    if (i === 5 && j === 4) return hex('#c99200');
    return vest(i, j, true);
  });
  c.rect(32, 20, 8, 12, (i, j) => (i === 3 || i === 4) && (j === 2 || j === 3) ? hex('#ffc21a') : vest(i, j, false)); // detrás, con el logo
  for (const u of [16, 28]) c.rect(u, 20, 4, 12, (i, j) => vest(i, j));                   // costados
  c.rect(20, 16, 8, 4, (i) => i <= 1 || i >= 6 ? shade(OR, .9) : null);                   // hombros (el cuello, libre)
  c.rect(28, 16, 8, 4, () => EDGE);
  c.save(join(ASSETS, 'textures/models/armor/hi_vis_vest_layer_1.png'));
}

// ── gólem 128×128 ──
const T = new Canvas(128, 128);
const IRON = hex('#d6d2c9'), IRON_D = hex('#8c8880'), VINE = hex('#4f8a2f'), VINE_L = hex('#6aa83f');
const iron = (x, y, s) => { const n = noise(x, y, s); return n < .04 ? IRON_D : shade(IRON, .93 + noise(x, y, s + 7) * .1); };
/** Las seis caras de una caja (como ModelPart.Cube): cara → [x, y, ancho, alto]. */
function faces(u, v, w, h, d) {
  return { up: [u + d, v, w, d], down: [u + d + w, v, w, d], west: [u, v + d, d, h], north: [u + d, v + d, w, h], east: [u + d + w, v + d, d, h], south: [u + 2 * d + w, v + d, w, h] };
}
function box(u, v, w, h, d, paint) {
  for (const [f, [x, y, fw, fh]] of Object.entries(faces(u, v, w, h, d))) T.rect(x, y, fw, fh, (i, j, X, Y) => paint(f, i, j, fw, fh, X, Y));
}
function vine(face, len, seed) {
  const [x, y, w, h] = face;
  let cx = x + Math.floor(noise(seed, 1) * w);
  for (let j = 0; j < Math.min(len, h); j++) {
    T.set(cx, y + j, noise(cx, j, seed) < .5 ? VINE : VINE_L);
    if (noise(j, seed, 9) < .25) cx = Math.max(x, Math.min(x + w - 1, cx + (noise(j, seed) < .5 ? -1 : 1)));
    if (noise(j, seed, 3) < .2 && cx + 1 < x + w) T.set(cx + 1, y + j, VINE_L);
  }
}

// cabeza y nariz
box(0, 0, 8, 9, 8, (f, i, j, w, h, X, Y) => iron(X, Y, 1));
{
  const [fx, fy] = faces(0, 0, 8, 9, 8).north;
  for (const i of [1, 2, 5, 6]) T.set(fx + i, fy + 2, hex('#77736b'));
  T.set(fx + 1, fy + 3, hex('#35d0e0')); T.set(fx + 2, fy + 3, hex('#d9feff'));
  T.set(fx + 5, fy + 3, hex('#d9feff')); T.set(fx + 6, fy + 3, hex('#35d0e0'));
  for (const i of [1, 2, 5, 6]) T.set(fx + i, fy + 4, hex('#5f8f99'));
  for (let i = 2; i < 6; i++) T.set(fx + i, fy + 7, hex('#77736b'));
}
box(32, 0, 2, 4, 2, (f, i, j, w, h, X, Y) => shade(iron(X, Y, 2), .92));
// casco: cúpula, ala y cresta; amapola en un lado
const Y_ = hex('#ffc21a');
box(40, 0, 9, 3, 9, (f, i, j, w, h, X, Y) => f === 'up' ? shade(hex('#ffd34d'), .94 + noise(X, Y, 3) * .1) : shade(Y_, j === h - 1 ? .8 : .95 + noise(X, Y, 4) * .08));
{
  const [ex, ey] = faces(40, 0, 9, 3, 9).east;
  T.set(ex + 3, ey, hex('#d22a2a')); T.set(ex + 4, ey, hex('#d22a2a')); T.set(ex + 3, ey + 1, hex('#8a1515')); T.set(ex + 4, ey + 1, hex('#d22a2a')); T.set(ex + 4, ey + 2, hex('#3f7a2a'));
}
box(76, 0, 10, 1, 11, (f, i, j, w, h, X, Y) => f === 'down' ? hex('#7a5a00') : f === 'up' ? shade(Y_, (i === 0 || i === w - 1 || j === 0) ? .85 : .97 + noise(X, Y, 5) * .06) : shade(Y_, .8));
box(40, 12, 2, 1, 8, (f, i, j, w, h, X, Y) => shade(hex('#ffe07a'), .95 + noise(X, Y, 6) * .08));
// pecho y cintura (cinturón de herramientas con hebilla)
box(0, 24, 14, 10, 8, (f, i, j, w, h, X, Y) => iron(X, Y, 7));
vine(faces(0, 24, 14, 10, 8).north, 10, 11);
box(44, 24, 10, 3, 6, (f, i, j, w, h, X, Y) => j === 1 ? hex('#6b4423') : shade(hex('#8a5a33'), .9 + noise(X, Y, 8) * .15));
{ const [nx, ny] = faces(44, 24, 10, 3, 6).north; T.set(nx + 4, ny + 1, Y_); T.set(nx + 5, ny + 1, Y_); T.set(nx + 1, ny + 1, hex('#9aa4ae')); T.set(nx + 8, ny + 1, hex('#9aa4ae')); }
// chaleco reflectante (caja inflada sobre el pecho): bandas plateadas, cremallera, cuello en V, hombros
const ORANGE = hex('#ff7a1a'), SILVER = hex('#eef3f6'), SILVER_D = hex('#a9b7c2');
box(0, 44, 14, 9, 8, (f, i, j, w, h, X, Y) => {
  if (f === 'down') return null;
  if (f === 'up') return (i < 4 || i >= w - 4) ? shade(ORANGE, .95) : null;
  if (j === 3 || j === 6) return SILVER;
  if (j === 4 || j === 7) return SILVER_D;
  if (f === 'north') {
    if (j === 0 && i >= 5 && i <= 8 || j === 1 && i >= 6 && i <= 7) return null;
    if (i === 6 || i === 7) return hex('#9c3d00');
  }
  return shade(ORANGE, .93 + noise(X, Y, 9) * .1);
});
// brazos (puños más oscuros), enredadera en el derecho
for (const [u, seed] of [[60, 12], [80, 13]]) box(u, 36, 4, 17, 5, (f, i, j, w, h, X, Y) => j >= h - 4 && f !== 'up' ? shade(iron(X, Y, seed), .82) : f === 'down' ? shade(IRON, .75) : iron(X, Y, seed));
vine(faces(60, 36, 4, 17, 5).west, 12, 21);
vine(faces(60, 36, 4, 17, 5).north, 7, 22);
// piernas
for (const [u, seed] of [[0, 14], [22, 15]]) box(u, 64, 5, 9, 5, (f, i, j, w, h, X, Y) => j >= h - 2 ? shade(iron(X, Y, seed), .8) : iron(X, Y, seed));
vine(faces(22, 64, 5, 9, 5).north, 6, 23);
// plano enrollado: azul con líneas, extremos en espiral claros
const BLUE = hex('#1d5a94'), BLUE_L = hex('#cfe3f7');
box(44, 64, 3, 3, 12, (f, i, j, w, h) => {
  if (f === 'north' || f === 'south') return (i === 1 && j === 1) ? BLUE : BLUE_L;
  return (f === 'up' || f === 'down') ? (i === 1 ? BLUE_L : BLUE) : (j === 1 ? BLUE_L : BLUE);
});
// plano desplegado: cuadrícula y una fábrica dibujada; sello amarillo
box(76, 64, 16, 10, 1, (f, i, j, w, h) => {
  if (f !== 'north') return f === 'south' ? shade(hex('#5d8fc2'), .95 + noise(i, j, 10) * .08) : hex('#0f3d6b');
  if (i === 0 || j === 0 || i === w - 1 || j === h - 1) return hex('#0f3d6b');
  if (j === 7 && i >= 3 && i <= 11 || (i === 3 || i === 11) && j >= 3 && j <= 7 || j === 3 && i >= 3 && i <= 6 || i === 6 && j >= 2 && j <= 3 || j === 2 && i >= 6 && i <= 9 || i === 9 && j >= 2 && j <= 3 || j === 3 && i >= 9 && i <= 11) return BLUE_L;
  if (i >= 12 && i <= 13 && j >= 6 && j <= 7) return Y_;
  return (i % 3 === 0 || j % 3 === 0) ? hex('#2f6fb0') : BLUE;
});
// baliza del casco (con engranajes de obra): base de metal oscuro y luz ámbar (la luz también se dibuja brillante)
box(0, 82, 3, 1, 3, (f, i, j, w, h, X, Y) => shade(hex('#3a3f45'), .9 + noise(X, Y, 30) * .15));
box(16, 82, 2, 2, 2, (f, i, j) => f === 'up' ? hex('#fff0b0') : (i + j) % 2 === 0 ? hex('#ffd04a') : hex('#ffb000'));
// bolsa de cuero con hebilla, martillo (mango de madera, cabeza de hierro) y lápiz
box(28, 82, 3, 3, 2, (f, i, j, w, h, X, Y) => f === 'north' && j === 0 ? hex('#6b4423') : f === 'north' && i === 1 && j === 1 ? Y_ : shade(hex('#8a5a33'), .9 + noise(X, Y, 31) * .15));
box(44, 82, 1, 5, 1, (f, i, j, w, h, X, Y) => shade(hex('#9b6b3c'), .9 + noise(X, Y, 32) * .15));
box(52, 82, 3, 2, 2, (f, i, j, w, h, X, Y) => f === 'up' ? hex('#8c8880') : shade(hex('#5b5f63'), .95 + noise(X, Y, 33) * .1));
box(64, 82, 1, 1, 4, f => f === 'north' ? hex('#3a3a3a') : f === 'south' ? hex('#e88aa0') : Y_);
T.save(join(ASSETS, 'textures/entity/builder_golem.png'));

// ── logos (CurseForge, la lista de mods del juego y la web): pixel art de 64×64 ampliado ×8, sobre papel de plano ──
const PAPER = hex('#1d5a94'), GRID = hex('#2f6fb0'), INK = hex('#0f3d6b');
const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
function paper() {
  const c = new Canvas(64, 64);
  c.rect(0, 0, 64, 64, (i, j) => i < 2 || j < 2 || i > 61 || j > 61 ? INK : i % 8 === 4 || j % 8 === 4 ? GRID : shade(PAPER, .97 + noise(i, j, 40) * .06));
  return c;
}
function big(c, k = 8) {
  const out = new Canvas(c.w * k, c.h * k);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const i = ((y / k | 0) * c.w + (x / k | 0)) * 4;
    out.set(x, y, [c.px[i], c.px[i + 1], c.px[i + 2]], c.px[i + 3]);
  }
  return out;
}
// BuildGolem: la cabeza del gólem con su casco de obra y el chaleco reflectante
const golemLogo = paper();
{
  const L = golemLogo;
  L.rect(10, 56, 44, 6, (i, j) => j === 3 || j === 4 ? (j === 3 ? SILVER : SILVER_D) : i === 21 || i === 22 ? hex('#9c3d00') : shade(ORANGE, .93 + noise(i, j, 41) * .1));
  L.rect(18, 24, 28, 33, (i, j, X, Y) => i === 0 || i === 27 || j === 32 ? hex('#3a3530') : i >= 24 ? shade(iron(X, Y, 42), .85) : i <= 2 ? shade(iron(X, Y, 42), 1.06) : iron(X, Y, 42));
  for (const [x0, x1] of [[22, 29], [35, 42]]) {
    L.rect(x0, 32, x1 - x0 + 1, 2, () => hex('#77736b'));
    L.rect(x0 + 1, 34, x1 - x0 - 1, 3, (i, j) => j === 0 && i === (x0 < 32 ? 1 : x1 - x0 - 3) ? hex('#d9feff') : hex('#35d0e0'));
  }
  L.rect(30, 36, 4, 12, (i, j, X, Y) => shade(iron(X, Y, 43), i === 3 ? .78 : .9));
  L.rect(26, 51, 12, 2, () => hex('#77736b'));
  for (let y = 38; y < 56; y++) L.set(20 + (noise(y, 7) < .5 ? 0 : 1), y, noise(y, 8) < .5 ? VINE : VINE_L);
  // casco: cúpula, cresta y ala
  for (let y = 12; y < 24; y++) {
    const half = Math.round(10 + Math.sqrt(Math.max(0, 1 - ((23 - y) / 12) ** 2)) * 7);
    L.rect(32 - half, y, half * 2, 1, (i) => i < 4 && y < 20 ? hex('#ffe07a') : y === 23 ? hex('#c99200') : shade(Y_, .95 + noise(i, y, 44) * .08));
  }
  L.rect(30, 9, 4, 14, (i, j) => j === 0 ? hex('#c99200') : hex('#ffe07a'));
  L.rect(12, 24, 40, 2, (i) => i === 0 || i === 39 ? hex('#c99200') : Y_);
  L.rect(12, 26, 40, 1, () => hex('#7a5a00'));
  L.rect(19, 27, 26, 1, (i, j, X, Y) => shade(iron(X, Y, 42), .72));             // sombra del ala en la frente
  // baliza ámbar encendida sobre la cresta, con su halo
  for (const [dx, dy] of [[-1, -1], [4, -1], [-1, 3], [4, 3], [-2, 1], [5, 1]]) L.set(30 + dx, 4 + dy, mix(PAPER, hex('#ffb000'), .45));
  L.rect(30, 4, 4, 4, (i, j) => j === 0 ? hex('#fff0b0') : (i + j) % 2 ? hex('#ffd04a') : hex('#ffb000'));
  L.rect(29, 8, 6, 1, () => hex('#3a3f45'));
}
// BuildGolem Link: un bloque holográfico (cian, con líneas de barrido) sobre su proyector amarillo
const linkLogo = paper();
{
  const L = linkLogo, CY = hex('#35d0e0'), CYL = hex('#d9feff');
  const inTop = (x, y) => Math.abs(x - 32) / 22 + Math.abs(y - 23) / 11 <= 1;
  for (let y = 10; y < 60; y++) for (let x = 9; x < 56; x++) {
    const i = (y * 64 + x) * 4, base = [L.px[i], L.px[i + 1], L.px[i + 2]];
    const lt = 23 + (x - 10) / 2, rt = 34 - (x - 32) / 2;
    let face = null;
    if (inTop(x, y)) face = [hex('#7fe9f2'), .55];
    else if (x >= 10 && x < 32 && y >= lt && y <= lt + 24) face = [CY, .45];
    else if (x >= 32 && x <= 54 && y >= rt && y <= rt + 24) face = [hex('#1f8fa3'), .5];
    if (!face) continue;
    const scan = y % 3 === 0 ? .12 : 0;
    L.set(x, y, mix(base, face[0], Math.min(1, face[1] + scan)));
  }
  const line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) L.set(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), c); };
  for (const [a, b] of [[[32, 12], [54, 23]], [[54, 23], [32, 34]], [[32, 34], [10, 23]], [[10, 23], [32, 12]], [[10, 23], [10, 47]], [[54, 23], [54, 47]],
    [[32, 34], [32, 58]], [[10, 47], [32, 58]], [[54, 47], [32, 58]]]) line(a[0], a[1], b[0], b[1], CYL);
  // proyector y su haz
  for (const x of [25, 39]) line(x, 57, x < 32 ? 10 : 54, 47, mix(PAPER, CYL, .7));
  L.rect(24, 58, 16, 4, (i, j) => j === 0 ? hex('#fff0b0') : i === 0 || i === 15 || j === 3 ? hex('#7a5a00') : Y_);
  L.rect(29, 57, 6, 1, () => hex('#d9feff'));
}
for (const [canvas, file] of [[golemLogo, 'golem/resources/buildgolem_logo.png'], [linkLogo, 'link/resources/buildgolem_link_logo.png']]) {
  big(canvas).save(file);
  big(canvas).save(join('logos', file.split('/').pop()));
}

// ── iconos para la web (../web/public/mod): los de los objetos y uno dibujado del casco (en el juego es un modelo 3D) ──
const WEB = '../web/public/mod';
for (const [name, [rows, pal]] of Object.entries(ITEMS)) sprite(rows, pal).save(join(WEB, name + '.png'));
sprite([
  '................', '................', '................', '................', '......hhhh......', '....hYYYYYYh....', '...hYYYYRYYYY...', '..YYYYYYRYYYYY..',
  '..YYYYYYRYYYYYr.', '..YYYYYYYYYYYgr.', 'BBBBBBBBBBBBBBB.', '.bbbbbbbbbbbbb..', '................', '................', '................', '................',
], { h: '#fff0b0', Y: '#ffc21a', R: '#ffe07a', B: '#c99200', b: '#7a5a00', r: '#d22a2a', g: '#3f7a2a' }).save(join(WEB, 'hard_hat.png'));
console.log('texturas y modelos escritos en', ASSETS, 'e iconos en', WEB);
