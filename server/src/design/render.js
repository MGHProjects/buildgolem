// Imagen del diseño en el servidor, para que los agentes VEAN lo que construyen: los mismos modelos y texturas que el
// visor (reader.models), en isométrica desde una esquina, alzado o planta, con z-buffer y sombreado por cara. PNG sin dependencias.
import { inflateSync, deflateSync } from 'node:zlib';

// ── PNG ──
function decodePng(buf) {
  if (!buf || buf.readUInt32BE(0) !== 0x89504e47) return null;
  let o = 8, w = 0, h = 0, depth = 8, type = 6, pal = null, trns = null; const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; if (d[12]) return null; }
    else if (t === 'PLTE') pal = d; else if (t === 'tRNS') trns = d; else if (t === 'IDAT') idat.push(d); else if (t === 'IEND') break;
    o += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type]; if (!ch || (depth !== 8 && type !== 3 && type !== 0)) return null;
  const bpp = Math.max(1, (ch * depth) >> 3), stride = (w * ch * depth + 7) >> 3, raw = inflateSync(Buffer.concat(idat)), px = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride), p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++], line = new Uint8Array(raw.subarray(p, p + stride)); p += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let pred = 0;
      if (f === 1) pred = a; else if (f === 2) pred = b; else if (f === 3) pred = (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = (line[i] + pred) & 255;
    }
    for (let x = 0; x < w; x++) {
      const q = (y * w + x) * 4;
      if (type === 3 || (type === 0 && depth < 8)) {
        const bit = x * depth, v = (line[bit >> 3] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
        if (type === 3) { px[q] = pal[v * 3]; px[q + 1] = pal[v * 3 + 1]; px[q + 2] = pal[v * 3 + 2]; px[q + 3] = trns && v < trns.length ? trns[v] : 255; }
        else { const g = v * 255 / ((1 << depth) - 1); px[q] = px[q + 1] = px[q + 2] = g; px[q + 3] = 255; }
      } else if (ch === 1) { px[q] = px[q + 1] = px[q + 2] = line[x]; px[q + 3] = 255; }
      else if (ch === 2) { px[q] = px[q + 1] = px[q + 2] = line[x * 2]; px[q + 3] = line[x * 2 + 1]; }
      else { px[q] = line[x * ch]; px[q + 1] = line[x * ch + 1]; px[q + 2] = line[x * ch + 2]; px[q + 3] = ch === 4 ? line[x * 4 + 3] : 255; }
    }
    prev = line;
  }
  return { w, h, px };
}
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = b => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function encodePng(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'latin1'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}

// ── geometría (igual que engine/geometry.js, sin three) ──
const ROT = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
const CORNERS = {
  north: ([a, b, c], [d, e]) => [[d, e, c], [a, e, c], [a, b, c], [d, b, c]],
  south: ([a, b], [d, e, f]) => [[a, e, f], [d, e, f], [d, b, f], [a, b, f]],
  east: ([, b, c], [d, e, f]) => [[d, e, f], [d, e, c], [d, b, c], [d, b, f]],
  west: ([a, b, c], [, e, f]) => [[a, e, c], [a, e, f], [a, b, f], [a, b, c]],
  up: ([a, , c], [d, e, f]) => [[a, e, c], [d, e, c], [d, e, f], [a, e, f]],
  down: ([a, b, c], [d, , f]) => [[a, b, f], [d, b, f], [d, b, c], [a, b, c]],
};
const DEF_UV = {
  north: ([a, b], [d, e]) => [16 - d, 16 - e, 16 - a, 16 - b], south: ([a, b], [d, e]) => [a, 16 - e, d, 16 - b],
  east: ([, b, c], [, e, f]) => [16 - f, 16 - e, 16 - c, 16 - b], west: ([, b, c], [, e, f]) => [c, 16 - e, f, 16 - b],
  up: ([a, , c], [d, , f]) => [a, c, d, f], down: ([a, , c], [d, , f]) => [a, 16 - f, d, 16 - c],
};
const CUBE = { from: [0, 0, 0], to: [16, 16, 16] };
const FACEKEY = { north: 'side', south: 'side', east: 'side', west: 'side', up: 'top', down: 'bottom' };
const hex = c => { const n = parseInt(String(c).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

const VIEWS = { se: [0, 'iso'], ne: [1, 'iso'], nw: [2, 'iso'], sw: [3, 'iso'], front: [0, 'ortho'], right: [1, 'ortho'], back: [2, 'ortho'], left: [3, 'ortho'], top: [0, 'top'] };

export function renderDesign(m, r, { view = 'se', box = null, maxSize = 1400 } = {}) {
  const [k, mode] = VIEWS[view] || VIEWS.se;
  const turn = ([x, y, z]) => { for (let i = 0; i < k; i++) [x, z] = [-z, x]; return [x, y, z]; };
  // proyección: pantalla (u hacia la derecha, v hacia abajo) y profundidad (más = más cerca)
  const C30 = Math.cos(Math.PI / 6);
  const proj = mode === 'iso' ? ([x, y, z]) => [(x - z) * C30, (x + z) * 0.5 - y, x + y + z]
    : mode === 'top' ? ([x, y, z]) => [x, z, y] : ([x, y, z]) => [x, -y, z];
  const cam = mode === 'iso' ? [1, 1, 1] : mode === 'top' ? [0, 1, 0] : [0, 0, 1];
  // celdas a dibujar: bloques + objetos expuestos (como el visor, encima del expositor salvo en vitrinas)
  const inBox = b => !box || (b.x >= box[0] && b.y >= box[1] && b.z >= box[2] && b.x <= box[3] && b.y <= box[4] && b.z <= box[5]);
  const cells = m.BLOCKS.filter(inBox);
  for (const d of m.DISPLAYS || []) if (m.P[d.t]) { const c = { x: d.x, y: d.y + (d.inside || d.kind !== 'block' ? 0 : 1), z: d.z, t: d.t, f: d.f || 's' }; if (inBox(c)) cells.push(c); }
  // modelos: los mismos que pide el visor
  const refs = [...new Set(cells.map(b => m.P[b.t]?.model).filter(Boolean).map(x => [].concat(x).join('+')))];
  const MODELS = r ? r.models(refs) : {};
  const tex = new Map(), texOf = key => {
    if (!tex.has(key)) { let t = null; try { t = r && decodePng(r.texture(key)); } catch { t = null; } if (t && t.h > t.w) t = { w: t.w, h: t.w, px: t.px.subarray(0, t.w * t.w * 4) }; tex.set(key, t); }
    return tex.get(key);
  };
  const colorOf = key => { const c = r?.color?.(key); return c ? hex(c) : [128, 128, 128]; };
  // un bloque macizo opaco tapa la cara del vecino
  const opaque = new Map(), isOpaque = t => {
    if (!opaque.has(t)) {
      const s = m.P[t], els = s?.model ? MODELS[[].concat(s.model).join('+')] : null, id = s?.id || '';
      const full = s && !s.disp && !s.glass && !/glass|leaves|ice$|slime|honey|water|lava|grate|bars|chain|lantern/.test(id) && (els ? els.length === 1 && els[0].from.every(v => v === 0) && els[0].to.every(v => v === 16) : !s.shape || s.shape === 'cube');
      opaque.set(t, !!full);
    }
    return opaque.get(t);
  };
  const at = new Map(cells.map(b => [`${b.x},${b.y},${b.z}`, b]));
  // caras: 4 esquinas en el mundo + uv + textura + tinte + sombra
  const faces = [];
  for (const b of cells) {
    const s = m.P[b.t]; if (!s) continue;
    const yaw = s.model ? (s.yaw || 0) * Math.PI / 180 : 0, a = (ROT[b.f] ?? 0) + yaw, ca = Math.cos(a), sa = Math.sin(a), fl = b.top ? -1 : 1;
    const xf = ([x, y, z]) => turn([fl * x * ca + z * sa + b.x + 0.5, fl * y + b.y + 0.5, -fl * x * sa + z * ca + b.z + 0.5]);
    const els = s.model ? MODELS[[].concat(s.model).join('+')] || [] : [{ ...CUBE, faces: Object.fromEntries(Object.keys(CORNERS).map(d => [d, { texture: s[d === 'up' ? 'top' : d === 'down' ? 'bottom' : 'side'] || s.all || s.side || s.top }])), old: true }];
    for (const e of els) {
      const rot = e.rotation && (() => {
        const ang = e.rotation.angle * Math.PI / 180, c = Math.cos(ang), sn = Math.sin(ang), o = e.rotation.origin, ax = e.rotation.axis;
        return p => { const v = [p[0] - o[0], p[1] - o[1], p[2] - o[2]]; const [x, y, z] = ax === 'x' ? [v[0], v[1] * c - v[2] * sn, v[1] * sn + v[2] * c] : ax === 'y' ? [v[0] * c + v[2] * sn, v[1], -v[0] * sn + v[2] * c] : [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c, v[2]]; return [x + o[0], y + o[1], z + o[2]]; };
      })();
      for (const [dir, f] of Object.entries(e.faces || {})) {
        if (!f?.texture) continue;
        let pts = CORNERS[dir](e.from, e.to).map(p => { const q = rot ? rot(p) : p; return xf(q.map(v => v / 16 - 0.5)); });
        const n = (() => { const u = pts[1].map((v, i) => v - pts[0][i]), w = pts[3].map((v, i) => v - pts[0][i]); return [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]]; })();   // hacia fuera
        const len = Math.hypot(...n); if (len < 1e-9) continue;
        const nn = n.map(v => v / len);
        if (nn[0] * cam[0] + nn[1] * cam[1] + nn[2] * cam[2] <= 1e-6) continue;                 // de espaldas
        // cara contra un bloque opaco vecino: no se ve
        if (!e.old ? (e.from.every((v, i) => v === CUBE.from[i]) && e.to.every((v, i) => v === CUBE.to[i])) : true) {
          const w0 = turn([nn[0], nn[1], nn[2]].map(Math.round)), unturn = v => { let [x, y, z] = v; for (let i = 0; i < (4 - k) % 4; i++) [x, z] = [-z, x]; return [x, y, z]; };
          const d = unturn(w0), nb = at.get(`${b.x + d[0]},${b.y + d[1]},${b.z + d[2]}`);
          if (nb && isOpaque(nb.t)) continue;
        }
        const [u0, v0, u1, v1] = f.uv || DEF_UV[dir](e.from, e.to);
        let uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
        for (let q = (f.rotation || 0) / 90; q > 0; q--) uv = [uv[3], uv[0], uv[1], uv[2]];
        const ti = f.tintindex, tint = ti != null && s.tint?.[ti] ? hex(s.tint[ti]) : s.ctint?.[FACEKEY[dir]] ? hex(s.ctint[FACEKEY[dir]]) : null;
        const shade = nn[1] > 0.5 ? 1 : nn[1] < -0.5 ? 0.5 : Math.abs(nn[2]) > Math.abs(nn[0]) ? 0.8 : 0.62;
        faces.push({ p: pts.map(proj), uv, tex: f.texture, tint, shade, glass: !!s.glass });
      }
    }
  }
  if (!faces.length) return { width: 1, height: 1, png: encodePng(1, 1, Buffer.alloc(3)), summary: 'nada visible' };
  // encuadre
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const f of faces) for (const [u, v] of f.p) { if (u < minU) minU = u; if (u > maxU) maxU = u; if (v < minV) minV = v; if (v > maxV) maxV = v; }
  const pad = 1, sc = Math.max(2, Math.min(24, Math.floor(maxSize / Math.max(maxU - minU + 2 * pad, maxV - minV + 2 * pad))));
  const W = Math.ceil((maxU - minU + 2 * pad) * sc), H = Math.ceil((maxV - minV + 2 * pad) * sc);
  const rgb = Buffer.alloc(W * H * 3), zb = new Float32Array(W * H).fill(-Infinity);
  for (let i = 0; i < W * H; i++) { const y = Math.floor(i / W); rgb[i * 3] = 22 + (y * 10 / H) | 0; rgb[i * 3 + 1] = 26 + (y * 10 / H) | 0; rgb[i * 3 + 2] = 33 + (y * 12 / H) | 0; }
  const toS = ([u, v, d]) => [(u - minU + pad) * sc, (v - minV + pad) * sc, d];
  const tri = (A, B, Cc, ta, tb, tc, f, T) => {
    const x0 = Math.max(0, Math.floor(Math.min(A[0], B[0], Cc[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(A[0], B[0], Cc[0])));
    const y0 = Math.max(0, Math.floor(Math.min(A[1], B[1], Cc[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(A[1], B[1], Cc[1])));
    const den = (B[1] - Cc[1]) * (A[0] - Cc[0]) + (Cc[0] - B[0]) * (A[1] - Cc[1]); if (Math.abs(den) < 1e-9) return;
    const fallback = T ? null : colorOf(f.tex);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l1 = ((B[1] - Cc[1]) * (px - Cc[0]) + (Cc[0] - B[0]) * (py - Cc[1])) / den, l2 = ((Cc[1] - A[1]) * (px - Cc[0]) + (A[0] - Cc[0]) * (py - Cc[1])) / den, l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
      const depth = l1 * A[2] + l2 * B[2] + l3 * Cc[2], i = y * W + x;
      if (depth <= zb[i] + 1e-4) continue;
      let c;
      if (T) {
        const tu = (l1 * ta[0] + l2 * tb[0] + l3 * tc[0]) / 16, tv = (l1 * ta[1] + l2 * tb[1] + l3 * tc[1]) / 16;
        const sx = Math.min(T.w - 1, Math.max(0, Math.floor(tu * T.w))), sy = Math.min(T.h - 1, Math.max(0, Math.floor(tv * T.h))), q = (sy * T.w + sx) * 4;
        if (T.px[q + 3] < 100) continue;
        c = [T.px[q], T.px[q + 1], T.px[q + 2]];
      } else c = fallback;
      const k2 = f.shade, tt = f.tint;
      let R = c[0] * k2, G = c[1] * k2, Bl = c[2] * k2;
      if (tt) { R = R * tt[0] / 255; G = G * tt[1] / 255; Bl = Bl * tt[2] / 255; }
      if (f.glass) { R = R * 0.55 + rgb[i * 3] * 0.45; G = G * 0.55 + rgb[i * 3 + 1] * 0.45; Bl = Bl * 0.55 + rgb[i * 3 + 2] * 0.45; }
      else zb[i] = depth;
      rgb[i * 3] = R; rgb[i * 3 + 1] = G; rgb[i * 3 + 2] = Bl;
    }
  };
  // primero lo opaco y luego el cristal (de lejos a cerca) para que se vea a través
  faces.sort((a, b) => (a.glass - b.glass) || (a.glass ? a.p[0][2] - b.p[0][2] : 0));
  for (const f of faces) {
    const T = texOf(f.tex), P = f.p.map(toS);
    tri(P[0], P[1], P[2], f.uv[0], f.uv[1], f.uv[2], f, T);
    tri(P[0], P[2], P[3], f.uv[0], f.uv[2], f.uv[3], f, T);
  }
  let y0 = Infinity, y1 = -Infinity; for (const b of cells) { if (b.y < y0) y0 = b.y; if (b.y > y1) y1 = b.y; }
  return { width: W, height: H, png: encodePng(W, H, rgb), summary: `${cells.length} bloques, ${faces.length} caras visibles, alto ${y1 - y0 + 1}, escala ${sc} px por bloque` };
}
