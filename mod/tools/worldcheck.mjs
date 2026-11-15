// Compara un diseño exportado (.nbt de /api/designs/<id>/export.nbt) con lo que hay construido en un mundo guardado (sus .mca):
// bloques que faltan o sobran, propiedades distintas (orientación, mitad…) y, en los cables de AE2, cable, piezas y fachadas.
// Uso (con el juego cerrado): node tools/worldcheck.mjs <export.nbt> <carpeta del mundo> <x> <y> <z> [giro 0-3 | -] [--dump x,y,z]
// x y z: la esquina donde quedó el diseño (la de Link); sin giro prueba los 4 y se queda con el que más coincide.
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync, inflateSync } from 'node:zlib';

export function parseNbt(buf) {
  let o = 0;
  const u8 = () => buf[o++], i16 = () => { const v = buf.readInt16BE(o); o += 2; return v; };
  const i32 = () => { const v = buf.readInt32BE(o); o += 4; return v; };
  const str = () => { const n = buf.readUInt16BE(o); o += 2; const s = buf.toString('utf8', o, o + n); o += n; return s; };
  const pay = t => {
    switch (t) {
      case 1: { const v = buf.readInt8(o); o += 1; return v; }
      case 2: return i16();
      case 3: return i32();
      case 4: { const v = buf.readBigInt64BE(o); o += 8; return v; }
      case 5: { const v = buf.readFloatBE(o); o += 4; return v; }
      case 6: { const v = buf.readDoubleBE(o); o += 8; return v; }
      case 7: { const n = i32(); const v = buf.subarray(o, o + n); o += n; return v; }
      case 8: return str();
      case 9: { const et = u8(), n = i32(), a = []; for (let i = 0; i < n; i++) a.push(pay(et)); return a; }
      case 10: { const c = {}; for (;;) { const tt = u8(); if (!tt) return c; const k = str(); c[k] = pay(tt); } }
      case 11: { const n = i32(), a = []; for (let i = 0; i < n; i++) a.push(i32()); return a; }
      case 12: { const n = i32(), a = []; for (let i = 0; i < n; i++) { a.push(buf.readBigInt64BE(o)); o += 8; } return a; }
      default: throw new Error('tag ' + t + ' at ' + o);
    }
  };
  const t = u8(); str(); return pay(t);
}

export function openWorld(dir) {
  const regions = new Map(), chunks = new Map();
  const region = (rx, rz) => {
    const k = rx + ',' + rz;
    if (!regions.has(k)) { const f = `${dir}/region/r.${rx}.${rz}.mca`; regions.set(k, existsSync(f) ? readFileSync(f) : null); }
    return regions.get(k);
  };
  const chunk = (cx, cz) => {
    const k = cx + ',' + cz;
    if (chunks.has(k)) return chunks.get(k);
    const r = region(cx >> 5, cz >> 5); let c = null;
    if (r) {
      const i = 4 * ((cx & 31) + (cz & 31) * 32), off = ((r[i] << 16) | (r[i + 1] << 8) | r[i + 2]) * 4096;
      if (off) {
        const len = r.readUInt32BE(off), comp = r[off + 4], data = r.subarray(off + 5, off + 4 + len);
        c = parseNbt(comp === 2 ? inflateSync(data) : comp === 1 ? gunzipSync(data) : data);
        c.bes = new Map((c.block_entities || []).map(b => [`${b.x},${b.y},${b.z}`, b]));
      }
    }
    chunks.set(k, c); return c;
  };
  return {
    state(x, y, z) {
      const c = chunk(x >> 4, z >> 4); if (!c) return null;
      const sec = c.sections.find(s => s.Y === (y >> 4)); if (!sec?.block_states) return { Name: 'minecraft:air' };
      const pal = sec.block_states.palette; if (pal.length === 1) return pal[0];
      const bits = Math.max(4, Math.ceil(Math.log2(pal.length))), per = Math.floor(64 / bits);
      const idx = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
      const long = BigInt.asUintN(64, sec.block_states.data[Math.floor(idx / per)]);
      return pal[Number((long >> BigInt((idx % per) * bits)) & ((1n << BigInt(bits)) - 1n))];
    },
    be(x, y, z) { return chunk(x >> 4, z >> 4)?.bes.get(`${x},${y},${z}`) ?? null; },
  };
}

const ROT = ['north', 'east', 'south', 'west'];
export const rotFacing = (f, r) => ROT.includes(f) ? ROT[(ROT.indexOf(f) + r) % 4] : f;
export function placer(size, anchor, r) {
  const [sx, , sz] = size;
  return ([x, y, z]) => {
    const [a, c] = r === 0 ? [x, z] : r === 1 ? [sz - 1 - z, x] : r === 2 ? [sx - 1 - x, sz - 1 - z] : [z, sx - 1 - x];
    return [anchor[0] + a, anchor[1] + y, anchor[2] + c];
  };
}

if (process.argv[1]?.endsWith('worldcheck.mjs')) {
  const [file, dir, ax, ay, az, rArg] = process.argv.slice(2);
  const S = parseNbt(gunzipSync(readFileSync(file)));
  const W = openWorld(dir), anchor = [+ax, +ay, +az];
  const name = s => s?.Name ?? '∅';
  const score = r => { const at = placer(S.size, anchor, r); let ok = 0; for (const b of S.blocks) { const st = S.palette[b.state]; if (name(W.state(...at(b.pos))) === st.Name) ok++; } return ok; };
  const r = rArg != null && rArg !== '-' ? +rArg : [0, 1, 2, 3].map(r => [score(r), r]).sort((a, b) => b[0] - a[0])[0][1];
  const at = placer(S.size, anchor, r);
  const out = { rot: r, total: S.blocks.length, ok: 0, missing: 0, wrongBlock: {}, wrongProp: {}, bus: { total: 0, cable: 0, parts: 0, facades: 0, facadesWorld: 0, noCable: [], lostFacade: {}, lostPart: {} }, samples: {} };
  const sample = (k, v) => { (out.samples[k] ??= []).length < 6 && out.samples[k].push(v); };
  for (const b of S.blocks) {
    const want = S.palette[b.state], p = at(b.pos), have = W.state(...p);
    if (!have || name(have) === 'minecraft:air') { out.missing++; sample('missing ' + want.Name, p.join(' ')); continue; }
    if (name(have) !== want.Name) { const k = want.Name + ' → ' + name(have); out.wrongBlock[k] = (out.wrongBlock[k] || 0) + 1; sample('wrong ' + k, p.join(' ')); continue; }
    let bad = false;
    for (const [k, v] of Object.entries(want.Properties || {})) {
      const exp = k === 'facing' ? rotFacing(v, r) : v, got = have.Properties?.[k];
      if (got !== exp) { bad = true; const key = `${want.Name}.${k} ${exp}→${got}`; out.wrongProp[key] = (out.wrongProp[key] || 0) + 1; sample('prop ' + key, p.join(' ')); }
    }
    if (b.nbt) {
      out.bus.total++;
      const be = W.be(...p) || {};
      if (be.cable?.id === b.nbt.cable?.id) out.bus.cable++; else out.bus.noCable.push(`${p.join(' ')} want ${b.nbt.cable?.id} got ${be.cable?.id}`);
      for (const [k, v] of Object.entries(b.nbt)) {
        if (k === 'id' || k === 'cable') continue;
        if (k.startsWith('facade')) { out.bus.facades++; if (be[k]) out.bus.facadesWorld++; else { out.bus.lostFacade[v.Name] = (out.bus.lostFacade[v.Name] || 0) + 1; sample('lost facade ' + v.Name, p.join(' ') + ' ' + k); } }
        else { out.bus.parts++; if (be[k]?.id !== v.id) { out.bus.lostPart[v.id] = (out.bus.lostPart[v.id] || 0) + 1; sample('lost part ' + v.id, p.join(' ') + ' ' + k); } }
      }
    }
    if (!bad) out.ok++;
  }
  out.bus.noCableCount = out.bus.noCable.length; out.bus.noCable = out.bus.noCable.slice(0, 5);
  console.log(JSON.stringify(out, (k, v) => typeof v === 'bigint' ? v.toString() : v, 1));
  const di = process.argv.indexOf('--dump');
  if (di > 0) { const q = process.argv[di + 1].split(',').map(Number); console.log(JSON.stringify({ state: W.state(...q), be: W.be(...q) }, (k, v) => typeof v === 'bigint' ? v.toString() : v)); }
}
