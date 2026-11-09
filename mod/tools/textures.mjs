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
    '................', '......hYYh......', '....YYYYYYYY....', '...YYYhYYYYYY...', '...YYYYYYYYYY...', '.BBBBBBBBBBBBBB.', '..bbbbbbbbbbbb..', '...IIIIIIIIII...',
    '...IddIIIIddI...', '...IEcIIIIcEI...', '...IIIInnIIII...', '...IIIInnIIII...', '...IvIIIIIIII...', '...IvvIImmIII...', '...dddddddddd...', '................',
  ], { h: '#fff0b0', Y: '#ffc21a', B: '#c99200', b: '#7a5a00', I: '#d6d2c9', d: '#8c8880', E: '#d9feff', c: '#35d0e0', n: '#b4b0a7', v: '#4f8a2f', m: '#77736b' }],
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

// ── casco de obra: textura-paleta y modelo 3D (se ve en la cabeza del jugador) ──
{
  const c = new Canvas(16, 16), Y = hex('#ffc21a');
  c.rect(0, 0, 8, 8, (i, j) => shade(hex('#ffd34d'), .95 + noise(i, j, 1) * .1));
  c.rect(8, 0, 8, 8, (i, j) => shade(Y, j > 5 ? .82 : .96 + noise(i, j, 2) * .08));
  c.rect(0, 8, 16, 2, (i, j) => shade(Y, .9 + noise(i, j, 3) * .08));
  c.rect(0, 10, 16, 2, () => hex('#8a6500'));
  c.rect(0, 12, 4, 4, (i, j) => j === 3 ? hex('#8a1515') : hex('#d22a2a'));
  c.rect(4, 12, 4, 4, () => hex('#3f7a2a'));
  c.rect(8, 12, 8, 4, (i, j) => shade(hex('#ffe07a'), .96 + noise(i, j, 4) * .08));
  c.save(join(ASSETS, 'textures/item/hard_hat.png'));
  const all = uv => Object.fromEntries(['north', 'south', 'east', 'west', 'up', 'down'].map(f => [f, { uv: f === 'up' ? uv.up : f === 'down' ? uv.down : uv.side, texture: '#hat' }]));
  const model = {
    textures: { hat: 'buildgolem:item/hard_hat', particle: 'buildgolem:item/hard_hat' },
    elements: [
      { from: [1, 14, -1.5], to: [15, 15, 15], faces: all({ up: [0, 8, 16, 10], down: [0, 10, 16, 12], side: [0, 8, 16, 9] }) },
      { from: [2, 15, 2], to: [14, 18.5, 14], faces: all({ up: [0, 0, 8, 8], down: [0, 10, 16, 12], side: [8, 0, 16, 8] }) },
      { from: [7, 18.5, 2.5], to: [9, 19.5, 13.5], faces: all({ up: [8, 12, 16, 16], down: [8, 12, 16, 16], side: [8, 12, 16, 16] }) },
      { from: [13.5, 16, 6.5], to: [14.6, 17.2, 7.7], faces: all({ up: [0, 12, 4, 15], down: [0, 12, 4, 16], side: [0, 12, 4, 16] }) },
      { from: [13.8, 15, 7], to: [14.3, 16, 7.3], faces: all({ up: [4, 12, 8, 16], down: [4, 12, 8, 16], side: [4, 12, 8, 16] }) },
    ],
    display: {
      head: { translation: [0, 0, 0], scale: [1, 1, 1] },
      gui: { rotation: [30, 135, 0], translation: [0, -6.5, 0], scale: [.8, .8, .8] },
      ground: { translation: [0, -2, 0], scale: [.4, .4, .4] },
      fixed: { rotation: [0, 180, 0], translation: [0, -6, 0], scale: [.7, .7, .7] },
      thirdperson_righthand: { rotation: [75, 45, 0], translation: [0, -2, 0], scale: [.375, .375, .375] },
      thirdperson_lefthand: { rotation: [75, 45, 0], translation: [0, -2, 0], scale: [.375, .375, .375] },
      firstperson_righthand: { rotation: [0, 45, 0], translation: [0, -2, 0], scale: [.4, .4, .4] },
      firstperson_lefthand: { rotation: [0, 225, 0], translation: [0, -2, 0], scale: [.4, .4, .4] },
    },
  };
  writeFileSync(join(ASSETS, 'models/item/hard_hat.json'), JSON.stringify(model, null, 2) + '\n');
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
T.save(join(ASSETS, 'textures/entity/builder_golem.png'));

// ── iconos para la web (../web/public/mod): los de los objetos y uno dibujado del casco (en el juego es un modelo 3D) ──
const WEB = '../web/public/mod';
for (const [name, [rows, pal]] of Object.entries(ITEMS)) sprite(rows, pal).save(join(WEB, name + '.png'));
sprite([
  '................', '................', '................', '................', '......hhhh......', '....hYYYYYYh....', '...hYYYYRYYYY...', '..YYYYYYRYYYYY..',
  '..YYYYYYRYYYYYr.', '..YYYYYYYYYYYgr.', 'BBBBBBBBBBBBBBB.', '.bbbbbbbbbbbbb..', '................', '................', '................', '................',
], { h: '#fff0b0', Y: '#ffc21a', R: '#ffe07a', B: '#c99200', b: '#7a5a00', r: '#d22a2a', g: '#3f7a2a' }).save(join(WEB, 'hard_hat.png'));
console.log('texturas y modelos escritos en', ASSETS, 'e iconos en', WEB);
