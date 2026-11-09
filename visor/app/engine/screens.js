// Pantallas de CC: Tweaked en el visor: emula la rejilla de caracteres de un Advanced Monitor y dibuja lo mismo que los
// programas de cc/ (pantalla_ae2.lua, sector_ae2.lua) con datos de ejemplo, para ver cómo quedan en el diseño.
// Diseño: SCREENS [{ kind: 'almacen' | 'fabricacion' | 'sector', title, x, y0, z0, w, h, f }] (f = hacia dónde mira).
import * as THREE from 'three';

const CC = { white: '#F0F0F0', orange: '#F2B233', lightBlue: '#99B2F2', yellow: '#DEDE6C', lime: '#7FCC19', gray: '#4C4C4C',
  lightGray: '#999999', blue: '#3366CC', red: '#CC4C4C', black: '#111111' };
const K = 4;                                                     // píxeles de lienzo por píxel de monitor (64 por bloque)

// terminal de W × H caracteres como el de CC (escala de texto: 1 en las grandes, 0,5 en las de sector)
function term(wBlocks, hBlocks, scale) {
  const W = Math.round((64 * wBlocks - 20) / (6 * scale)), H = Math.round((64 * hBlocks - 20) / (9 * scale));
  const cells = Array.from({ length: H }, () => Array.from({ length: W }, () => ({ c: ' ', fg: CC.white, bg: CC.black })));
  const t = {
    W, H, cells,
    text(x, y, s, fg = CC.white, bg = CC.black) { s = String(s); for (let i = 0; i < s.length; i++) { const r = cells[y - 1], cell = r?.[x - 1 + i]; if (cell) Object.assign(cell, { c: s[i], fg, bg }); } },
    fill(x, y, n, bg) { for (let i = 0; i < n; i++) { const cell = cells[y - 1]?.[x - 1 + i]; if (cell) Object.assign(cell, { c: ' ', bg }); } },
    line(y, bg) { t.fill(1, y, W, bg); },
    bar(x, y, w, p, col) { const n = Math.floor(w * p + .5); t.fill(x, y, n, col || colorOf(p)); t.fill(x + n, y, w - n, CC.gray); },
    center(y, s, fg, bg) { t.text(Math.max(1, Math.floor((W - s.length) / 2) + 1), y, s, fg, bg); },
  };
  return t;
}
const colorOf = p => (p >= .9 ? CC.red : p >= .75 ? CC.orange : CC.lime);
const short = n => (n >= 1e12 ? (n / 1e12).toFixed(1) + 'T' : n >= 1e9 ? (n / 1e9).toFixed(1) + 'G' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.floor(n)));
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '.' : s);
const pct = (u, t) => (t > 0 ? Math.max(0, Math.min(1, u / t)) : 0);

// datos de ejemplo (solo para el visor)
const SECTORS = ['L1 NO', 'L1 NE', 'L1 SO', 'L1 SE', 'L2 NO', 'L2 NE', 'L2 SO', 'L2 SE'];
const FILL = [.62, .48, .81, .35, .27, .93, .18, .54];
const SAMPLE_ITEMS = ['Cobblestone', 'Iron Ingot', 'Netherrack', 'Dirt', 'Redstone Dust', 'Copper Ingot', 'Gold Ingot', 'Coal', 'Certus Quartz Crystal',
  'Fluix Crystal', 'Diamond', 'Silicon', 'Allthemodium Ingot', 'Osmium Ingot', 'Sky Stone', 'Glass', 'Sand', 'Gravel', 'Andesite', 'Tuff', 'Deepslate',
  'Oak Log', 'Nether Quartz', 'Lapis Lazuli', 'Emerald', 'Bone Meal', 'String', 'Ender Pearl', 'Blaze Rod', 'Slime Ball', 'Obsidian', 'Clay Ball',
  'Engineering Processor', 'Logic Processor', 'Calculation Processor', 'Printed Silicon', 'Uranium Ingot', 'Tin Ingot', 'Lead Ingot', 'Zinc Ingot',
  'Steel Ingot', 'Bronze Ingot', 'Quartz Block', 'Glowstone Dust', 'Gunpowder', 'Leather', 'Wheat', 'Sugar Cane', 'Bamboo', 'Kelp'];
const ITEMS = SAMPLE_ITEMS.map((n, i) => ({ n, c: Math.round(4.2e7 / (i + 1) ** 1.6) }));
const CPUS = [{ n: 'Quantum Computer', s: 2.7e11, x: 8, job: ['Singularity', 4, .37] }, { n: 'CPU 1', s: 2.6e8, x: 1, job: ['ME P2P Tunnel', 672, .58] },
  { n: 'CPU 2', s: 2.6e8, x: 1, job: ['Engineering Processor', 256, .21] }, { n: 'CPU 3', s: 2.6e8, x: 1, job: null }, { n: 'CPU 4', s: 2.6e8, x: 1, job: null }];

const RATE_UP = [['ME P2P Tunnel', 96], ['Engineering Processor', 88], ['Fluix Crystal', 264], ['Printed Silicon', 92], ['Printed Engineering Circuit', 90],
  ['Cobblestone', 4800], ['Netherrack', 3200], ['Iron Ingot', 640], ['Charged Certus Quartz Crystal', 132], ['Silicon', 75], ['Copper Ingot', 410],
  ['Gold Ingot', 220], ['Osmium Ingot', 180], ['Coal', 512], ['Glass', 300], ['Sand', 280], ['Gravel', 260], ['Diamond', 24], ['Redstone Dust', 96],
  ['Certus Quartz Crystal', 160], ['Tin Ingot', 120], ['Lead Ingot', 110], ['Zinc Ingot', 95]].sort((a, b) => b[1] - a[1]);
const RATE_DOWN = [['Diamond', 88], ['Silicon', 92], ['Redstone Dust', 264], ['Iron Ingot', 288], ['Nether Quartz', 132], ['Certus Quartz Crystal', 132],
  ['Engineering Processor', 96], ['Fluix Crystal', 288], ['Printed Silicon', 88], ['Printed Engineering Circuit', 88], ['Coal', 64], ['Sand', 40],
  ['Glowstone Dust', 12], ['Clay Ball', 8], ['Blaze Rod', 4]].sort((a, b) => b[1] - a[1]);
function header(t, title) {
  t.line(1, CC.blue); t.text(2, 1, title, CC.white, CC.blue);
  const hora = '14:32'; t.text(t.W - hora.length, 1, hora, CC.lightBlue, CC.blue);
}
const DRAW = {
  almacen(t) { // como almacen() de pantalla_ae2.lua
    header(t, 'CENTRO AE2  -  ALMACEN');
    const bw = t.W - 42;
    const row = (y, name, u, tot, unit) => { const p = pct(u, tot); t.text(2, y, name, CC.lightGray); t.bar(11, y, bw, p); t.text(12 + bw, y, `${(p * 100).toFixed(1).padStart(5)}%  ${short(u)} / ${short(tot)} ${unit}`); };
    row(3, 'Objetos', 1.21e9, 1.95e9, 'bytes'); row(4, 'Fluidos', 3.1e7, 1.6e8, 'bytes'); row(5, 'Energia', 1.37e8, 1.6e8, 'AE');
    t.text(12 + bw, 6, 'uso 4.1k AE/t', CC.lightGray);
    t.text(2, 8, 'DISCOS POR SECTOR', CC.yellow);
    const cw = Math.floor((t.W - 3) / 2);
    SECTORS.forEach((k, i) => {
      const x = 2 + (i % 2) * (cw + 1), y = 9 + Math.floor(i / 2), p = FILL[i];
      t.text(x, y, k, CC.lightGray); t.bar(x + 6, y, cw - 22, p); t.text(x + cw - 15, y, `${(p * 100).toFixed(1).padStart(5)}%  16 dr`);
    });
    t.text(2, 14, `TOP OBJETOS  (${1873} tipos)`, CC.yellow);
    const rows = t.H - 15, colw = Math.floor((t.W - 3) / 2);
    ITEMS.slice(0, rows * 2).forEach((it, i) => {
      const x = 2 + Math.floor(i / rows) * (colw + 1), y = 15 + (i % rows), n = short(it.c);
      t.text(x, y, String(i + 1).padStart(2) + ' ', CC.gray); t.text(x + 3, y, cut(it.n, colw - 4 - n.length)); t.text(x + colw - n.length, y, n, CC.lime);
    });
  },
  fabricacion(t, now) { // como fabricacion() de pantalla_ae2.lua; el progreso avanza para que se vea vivo
    header(t, 'CENTRO AE2  -  FABRICACION');
    t.text(2, 3, `CPUs: ${CPUS.length}    ocupadas: ${CPUS.filter(c => c.job).length}    objetos con patron: 1342`);
    t.text(2, 5, 'CPU             MEMORIA    ESTADO', CC.yellow);
    CPUS.forEach((c, i) => {
      const y = 6 + i;
      t.text(2, y, cut(c.n, 15), CC.lightGray); t.text(18, y, `${short(c.s)} x${c.x}`, CC.gray);
      if (!c.job) { t.text(29, y, 'libre', CC.lime); return; }
      const [n, q, p0] = c.job, p = (p0 + now / 60000) % 1;
      t.text(29, y, cut(`${n} x${short(q)}`, t.W - 29 - 18)); t.bar(t.W - 16, y, 10, p, CC.lightBlue); t.text(t.W - 5, y, `${String(Math.round(p * 100)).padStart(3)}%`);
    });
    const y0 = 6 + CPUS.length + 1, colw = Math.floor((t.W - 3) / 2);
    t.text(2, y0, 'PRODUCCION / min', CC.yellow); t.text(3 + colw, y0, 'CONSUMO / min', CC.yellow);
    for (let i = 1; i <= t.H - 4 - y0; i++) {
      const up = RATE_UP[i - 1], down = RATE_DOWN[i - 1];
      if (up) { const n = '+' + short(up[1]); t.text(2, y0 + i, cut(up[0], colw - 2 - n.length)); t.text(1 + colw - n.length, y0 + i, n, CC.lime); }
      if (down) { const n = '-' + short(down[1]); t.text(3 + colw, y0 + i, cut(down[0], colw - 2 - n.length)); t.text(2 + 2 * colw - n.length, y0 + i, n, CC.red); }
    }
    t.text(2, t.H - 2, 'ENERGIA', CC.yellow); t.bar(11, t.H - 2, t.W - 48, .86); t.text(t.W - 36, t.H - 2, '137.2M / 160.0M AE  uso 4.1k AE/t');
  },
  sector(t, now, s) { // como dibuja() de sector_ae2.lua
    const i = SECTORS.indexOf(s.title), p = FILL[i] ?? .5, col = colorOf(p);
    t.line(1, CC.blue); t.center(1, s.title, CC.white, CC.blue);
    t.center(3, `${(p * 100).toFixed(1)}%`, col);
    const alto = t.H - 10, ancho = 7, x0 = Math.floor((t.W - ancho) / 2) + 1, n = Math.floor(alto * p + .5);
    for (let k = 0; k < alto; k++) t.fill(x0, 5 + k, ancho, k >= alto - n ? col : CC.gray);
    t.center(t.H - 3, `${short(p * 2.6e8)}/${short(2.6e8)}`); t.center(t.H - 2, '16 drives', CC.lightGray); t.center(t.H, '14:32', CC.gray);
  },
};

function paint(ctx, t, wBlocks, hBlocks) {
  const Wpx = 64 * wBlocks * K, Hpx = 64 * hBlocks * K, m = 10 * K, cw = (Wpx - 2 * m) / t.W, ch = (Hpx - 2 * m) / t.H;
  ctx.fillStyle = '#c9a227'; ctx.fillRect(0, 0, Wpx, Hpx);              // marco dorado del Advanced Monitor
  ctx.fillStyle = CC.black; ctx.fillRect(m * .6, m * .6, Wpx - m * 1.2, Hpx - m * 1.2);
  ctx.font = `bold ${Math.floor(ch * .82)}px ui-monospace, Consolas, monospace`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  t.cells.forEach((row, y) => row.forEach((c, x) => {
    if (c.bg !== CC.black) { ctx.fillStyle = c.bg; ctx.fillRect(m + x * cw, m + y * ch, Math.ceil(cw), Math.ceil(ch)); }
    if (c.c !== ' ') { ctx.fillStyle = c.fg; ctx.fillText(c.c, m + (x + .5) * cw, m + (y + .55) * ch); }
  }));
}

export function createScreens(scene, list = []) {
  const items = list.map(s => {
    const scale = s.kind === 'sector' ? .5 : 1, canvas = document.createElement('canvas');
    canvas.width = 64 * s.w * K; canvas.height = 64 * s.h * K;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, color: new THREE.Color(1.12, 1.12, 1.12) }));
    const e = .004, side = { w: [-Math.PI / 2, s.x - e, s.z0 + s.w / 2], e: [Math.PI / 2, s.x + 1 + e, s.z0 + s.w / 2] }[s.f];
    if (side) { mesh.rotation.y = side[0]; mesh.position.set(side[1], s.y0 + s.h / 2, side[2]); }
    else { mesh.rotation.y = s.f === 'n' ? Math.PI : 0; mesh.position.set(s.x + s.w / 2, s.y0 + s.h / 2, s.f === 'n' ? s.z0 - e : s.z0 + 1 + e); }
    scene.add(mesh);
    const draw = now => { const t = term(s.w, s.h, scale); DRAW[s.kind](t, now, s); paint(canvas.getContext('2d'), t, s.w, s.h); texture.needsUpdate = true; };
    draw(0);
    return { s, mesh, draw };
  });
  let last = 0;
  return {
    setCut(c) { for (const it of items) it.mesh.visible = it.s.y0 < c; },
    tick(now) { if (now - last < 1000) return; last = now; for (const it of items) if (it.s.kind === 'fabricacion' && it.mesh.visible) it.draw(now); },
  };
}
