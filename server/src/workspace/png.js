// Color medio de una textura PNG (primer frame, ponderado por alfa). Para ver diseños públicos sin redistribuir texturas.
import { inflateSync } from 'node:zlib';

export function averageColor(buf) {
  if (!buf || buf.readUInt32BE(0) !== 0x89504e47) return null;
  let p = 8, w = 0, h = 0, depth = 0, type = 0, plte = null, trns = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), kind = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; if (data[12]) return null; }   // sin entrelazado
    else if (kind === 'PLTE') plte = data;
    else if (kind === 'tRNS') trns = data;
    else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || !w) return null;
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!ch) return null;
  const raw = inflateSync(Buffer.concat(idat)), stride = w * ch, rows = Math.min(h, w);   // solo el primer frame cuadrado
  const px = Buffer.alloc(stride * rows);
  for (let y = 0; y < rows; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), out = px.subarray(y * stride, (y + 1) * stride), prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? out[i - ch] : 0, b = prev ? prev[i] : 0, c = prev && i >= ch ? prev[i - ch] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      out[i] = (src[i] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
  }
  let r = 0, g = 0, bl = 0, wsum = 0;
  for (let i = 0; i < w * rows; i++) {
    let R, G, B, A = 255;
    if (type === 6) [R, G, B, A] = px.subarray(i * 4, i * 4 + 4);
    else if (type === 2) [R, G, B] = px.subarray(i * 3, i * 3 + 3);
    else if (type === 0) R = G = B = px[i];
    else if (type === 4) { R = G = B = px[i * 2]; A = px[i * 2 + 1]; }
    else { const k = px[i]; if (!plte || k * 3 + 2 >= plte.length) continue; [R, G, B] = plte.subarray(k * 3, k * 3 + 3); A = trns && k < trns.length ? trns[k] : 255; }
    r += R * A; g += G * A; bl += B * A; wsum += A;
  }
  if (!wsum) return null;
  const hex = v => Math.round(v / wsum).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}
