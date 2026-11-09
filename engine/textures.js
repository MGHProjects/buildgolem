// Texturas de bloque (three.js, animadas como Minecraft) e iconos para la interfaz (dataURL del primer frame).
import * as THREE from 'three';

const loader = new THREE.TextureLoader(), cache = {}, ANIMS = [], icons = {};
let anisotropy = 1;
export const setAnisotropy = a => { anisotropy = a; };
let BASE = 'texturas/', COLORS = null;
// base de las texturas (p. ej. /api/workspaces/<id>/tex/) o, para diseños públicos ajenos, colores medios por textura
let OPEN = null;
export function setTextureSource({ base, colors, open } = {}) { BASE = base || BASE; COLORS = colors || null; OPEN = open ? new Set(open) : null; for (const k in cache) delete cache[k]; for (const k in icons) delete icons[k]; ANIMS.length = 0; }
export const texUrl = key => { const [ns, path] = key.split(':'); return `${BASE}${ns}/${path}.png`; };
function flat(key) {
  const c = document.createElement('canvas'); c.width = c.height = 2;
  const g = c.getContext('2d'); g.fillStyle = COLORS[key] || '#6b7280'; g.fillRect(0, 0, 2, 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}

// bg: dibuja el primer frame sobre un fondo de color (texturas de luz que en Minecraft no transparentan)
export function tex(key, bg) {
  const k = key + (bg || '');
  if (cache[k]) return cache[k];
  if (COLORS && !OPEN?.has(key.split(':')[0])) return (cache[k] = flat(key));
  const t = loader.load(texUrl(key), t => {
    const { width: w, height: h } = t.image;
    if (h > w && !bg) { // tira de frames: se anima según su .mcmeta (frametime en ticks, interpolate, frames)
      const src = t.image, c = document.createElement('canvas');
      c.width = c.height = w; c.getContext('2d').drawImage(src, 0, 0, w, w, 0, 0, w, w);
      t.image = c;
      fetch(texUrl(key) + '.mcmeta').then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(m => {
        const a = m.animation || {}, ft = a.frametime || 1;
        const frames = (a.frames || [...Array(h / w).keys()]).map(f => (typeof f === 'number' ? { i: f, t: ft } : { i: f.index, t: f.time ?? ft }));
        ANIMS.push({ t, c, src, w, frames, total: frames.reduce((s, f) => s + f.t, 0), lerp: !!a.interpolate });
      });
    }
    if (bg) {
      const c = document.createElement('canvas'); c.width = c.height = w;
      const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, w); g.drawImage(t.image, 0, 0, w, w, 0, 0, w, w);
      t.image = c;
    }
    t.needsUpdate = true;
  });
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.anisotropy = anisotropy;
  return (cache[k] = t);
}

export function animate(now) {
  const tick = now / 50; // 20 ticks por segundo
  for (const a of ANIMS) {
    let k = tick % a.total, j = 0;
    while (k >= a.frames[j].t) k -= a.frames[j++].t;
    const g = a.c.getContext('2d'), fr = i => a.frames[i % a.frames.length].i * a.w;
    g.clearRect(0, 0, a.w, a.w); g.globalAlpha = 1;
    g.drawImage(a.src, 0, fr(j), a.w, a.w, 0, 0, a.w, a.w);
    if (a.lerp) { g.globalAlpha = k / a.frames[j].t; g.drawImage(a.src, 0, fr(j + 1), a.w, a.w, 0, 0, a.w, a.w); }
    a.t.needsUpdate = true;
  }
}

const loadImg = key => new Promise(res => { if (COLORS && !OPEN?.has(key.split(':')[0])) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = texUrl(key); });
// icono de interfaz: una textura o varias capas (base + superposición, como las tarjetas de AE2); tint multiplica el color (fluidos)
export function icon(keys, tint) {
  const list = [].concat(keys || []), k = list.join('+') + (tint || '');
  return (icons[k] ??= Promise.all(list.map(loadImg)).then(imgs => {
    const ok = imgs.filter(Boolean);
    if (!ok.length) return null;
    const w = ok[0].width, c = document.createElement('canvas'); c.width = c.height = w;
    const g = c.getContext('2d');
    for (const i of ok) g.drawImage(i, 0, 0, i.width, i.width, 0, 0, w, w);
    if (tint) {
      g.globalCompositeOperation = 'multiply'; g.fillStyle = tint; g.fillRect(0, 0, w, w);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(ok[0], 0, 0, w, w, 0, 0, w, w);
    }
    return c.toDataURL();
  }));
}
