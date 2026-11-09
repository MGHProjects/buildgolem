// Lector de zip mínimo (también jars y .mrpack), con zip64: lista el directorio central y lee entradas sueltas sin extraer todo.
import { openSync, readSync, closeSync, fstatSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

function readAt(fd, pos, len) { const b = Buffer.alloc(len); readSync(fd, b, 0, len, pos); return b; }

// entradas: { name, offset (cabecera local), csize, usize, method }
export function listZip(path) {
  const fd = openSync(path, 'r');
  try {
    const size = fstatSync(fd).size, tail = Math.min(size, 65_557), buf = readAt(fd, size - tail, tail);
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('No es un zip');
    let count = buf.readUInt16LE(eocd + 10), cdSize = buf.readUInt32LE(eocd + 12), cdOff = buf.readUInt32LE(eocd + 16);
    if (count === 0xffff || cdOff === 0xffffffff) {                       // zip64
      const loc = eocd - 20;
      if (loc >= 0 && buf.readUInt32LE(loc) === 0x07064b50) {
        const e64 = readAt(fd, Number(buf.readBigUInt64LE(loc + 8)), 56);
        count = Number(e64.readBigUInt64LE(32)); cdSize = Number(e64.readBigUInt64LE(40)); cdOff = Number(e64.readBigUInt64LE(48));
      }
    }
    const cd = readAt(fd, cdOff, cdSize), out = [];
    for (let p = 0, i = 0; i < count && p < cd.length; i++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) break;
      const method = cd.readUInt16LE(p + 10), nlen = cd.readUInt16LE(p + 28), xlen = cd.readUInt16LE(p + 30), clen = cd.readUInt16LE(p + 32);
      let csize = cd.readUInt32LE(p + 20), usize = cd.readUInt32LE(p + 24), offset = cd.readUInt32LE(p + 42);
      const name = cd.toString('utf8', p + 46, p + 46 + nlen);
      if (csize === 0xffffffff || usize === 0xffffffff || offset === 0xffffffff) {   // campo extra zip64
        for (let x = p + 46 + nlen; x < p + 46 + nlen + xlen;) {
          const id = cd.readUInt16LE(x), len = cd.readUInt16LE(x + 2);
          if (id === 1) { let q = x + 4; if (usize === 0xffffffff) { usize = Number(cd.readBigUInt64LE(q)); q += 8; } if (csize === 0xffffffff) { csize = Number(cd.readBigUInt64LE(q)); q += 8; } if (offset === 0xffffffff) offset = Number(cd.readBigUInt64LE(q)); }
          x += 4 + len;
        }
      }
      if (!name.endsWith('/')) out.push({ name, offset, csize, usize, method });
      p += 46 + nlen + xlen + clen;
    }
    return out;
  } finally { closeSync(fd); }
}

export function readEntry(path, e, maxBytes = 64 * 1024 * 1024) {
  if (e.usize > maxBytes) throw new Error(`Entrada demasiado grande: ${e.name}`);
  const fd = openSync(path, 'r');
  try {
    const h = readAt(fd, e.offset, 30);
    if (h.readUInt32LE(0) !== 0x04034b50) throw new Error('Cabecera local no válida');
    const data = readAt(fd, e.offset + 30 + h.readUInt16LE(26) + h.readUInt16LE(28), e.csize);
    if (e.method === 0) return data;
    if (e.method === 8) return inflateRawSync(data, { maxOutputLength: maxBytes });
    throw new Error(`Compresión no soportada (${e.method})`);
  } finally { closeSync(fd); }
}

// nombre seguro dentro de un directorio: sin rutas absolutas ni "..", separadores normalizados
export function safeRelPath(name) {
  const parts = name.replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
  if (!parts.length || parts.some(p => p === '..' || p.includes(':'))) return null;
  return parts.join('/');
}
