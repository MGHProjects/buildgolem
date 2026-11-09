// Malla del mundo: solo las caras que dan al aire, agrupadas por material (una llamada de dibujo por textura).
// Sin luces dinámicas: la luz va horneada en los vértices como en Minecraft (sombra por cara + oclusión ambiental + luz propia).
// Cada vista (grupos ocultos, corte, modo cables) se guarda en una caché LRU: volver a una vista ya vista es instantáneo.
import * as THREE from 'three';
import { tex } from './textures.js';
import { boxFaces, shadeOf } from './geometry.js';

const AO = [.5, .66, .83, 1];                                      // vértice con 3, 2, 1 o 0 bloques opacos alrededor
const ONE4 = [1, 1, 1, 1];
const glowOf = s => (s.dim ?? .8) * .5;                             // luz propia; por encima de 1 brilla (bloom)
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const P2P_TINT = { in: new THREE.Color('#ffcf7a'), out: new THREE.Color('#8fe9ff') }; // entradas en ámbar, salidas en cian
// dispositivos que siguen visibles (no fantasma) en el modo cables del Centro AE2
export const DEV = /^(term_[a-z]+|drive|expp|ctrl|cu|cstore|cacc|cmon|qshell|amfr|amgl|emcell|exif|iop|cwb|p2p|wconn|whub)$|^hub_/;

// modo: solid · cutout (recorte, dos caras) · glass (translúcido) · qglass (cristal de cuarzo AE2) · add (capa emisiva) · ghost
const MATS = {};
function mat(k) {
  if (MATS[k]) return MATS[k];
  if (k === 'ghost') return (MATS[k] = new THREE.MeshBasicMaterial({ color: '#5d6678', transparent: true, opacity: .05, depthWrite: false }));
  const [mode, t, bg, off] = k.split('|'), m = new THREE.MeshBasicMaterial({ map: tex(t, bg || undefined), vertexColors: true });
  if (mode === 'cutout') Object.assign(m, { alphaTest: .5, side: THREE.DoubleSide });
  if (mode === 'qglass') m.alphaTest = .1;
  if (mode === 'glass') Object.assign(m, { transparent: true, depthWrite: false });
  if (mode === 'add') Object.assign(m, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  if (+off) Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 * off }); // capas en el mismo plano sin parpadeo
  return (MATS[k] = m);
}

export function createMesher(world, geo) {
  const { P, GB, TERMS, FIBER, CHANNELS, AT, TERMF, TERMCELL, NC, idx, isCable, colOf, groupOf } = world;
  const SOLID = new Uint8Array(NC), CELL = new Array(NC); // SOLID: 1 = opaco, 2 = opaco en fantasma
  const solidAt = (x, y, z) => { const i = idx(x, y, z); return i >= 0 && SOLID[i] === 1; };
  const p2pFace = new Set([...CHANNELS.P2P, ...FIBER].map(p => `${p.x},${p.y},${p.z},${p.d}`));
  let BUFS, STAMP = 0;
  const AOV = [1, 1, 1, 1];
  const bufFor = (mk, layer = '') => { const k = mk + '#' + layer; let B = BUFS.get(k); if (!B) BUFS.set(k, B = { mk, p: [], u: [], c: [], i: [], n: 0 }); return B; };

  // 4 esquinas relativas a (ox, oy, oz) · brillo = sombra de la cara × AO (en lineal) + luz propia, × tinte
  function quad(B, pts, uv, sh, tint, e, ao, ox, oy, oz) {
    const o = B.n;
    for (let k = 0; k < 4; k++) {
      const p = pts[k], v = (sh ? Math.pow(sh * ao[k], 2.2) : 0) + e;
      B.p.push(p[0] + ox, p[1] + oy, p[2] + oz); B.u.push(uv[k][0], uv[k][1]);
      if (tint) B.c.push(v * tint.r, v * tint.g, v * tint.b); else B.c.push(v, v, v);
    }
    if (ao[0] + ao[2] < ao[1] + ao[3]) B.i.push(o, o + 1, o + 3, o + 1, o + 2, o + 3); else B.i.push(o, o + 1, o + 2, o, o + 2, o + 3); // diagonal que no raya la sombra
    B.n += 4;
  }
  function emitBlock(b, ghost) {
    const s = P[b.t], { x, y, z } = b, self = idx(x, y, z), term = TERMCELL.has(self), lit = SOLID[self] === 1, add = glowOf(s);
    for (const f of geo.oriented(b)) {
      const wn = f.wn;
      if (f.bound) {
        const i = idx(x + wn[0], y + wn[1], z + wn[2]);
        if (i >= 0 && (SOLID[i] === 1 || (ghost && SOLID[i]) || (f.cube && f.mode === 'glass' && CELL[i]?.t === b.t))) continue;
      }
      const inset = term && f.cube && TERMF.has(`${x},${y},${z},${f.wkey}`), k = inset ? .125 : 0; // fondo hundido detrás de la terminal
      const ox = x + .5 - wn[0] * k, oy = y + .5 - wn[1] * k, oz = z + .5 - wn[2] * k;
      if (ghost) { quad(bufFor('ghost'), f.pts, f.uv, 0, null, 1, ONE4, ox, oy, oz); continue; }
      let ao = ONE4;
      if (f.ao && lit && !inset) {
        for (let q = 0; q < 4; q++) {
          const [o1, o2, oc] = f.ao[q];
          const s1 = solidAt(x + o1[0], y + o1[1], z + o1[2]), s2 = solidAt(x + o2[0], y + o2[1], z + o2[2]), cc = solidAt(x + oc[0], y + oc[1], z + oc[2]);
          AOV[q] = AO[s1 && s2 ? 0 : 3 - s1 - s2 - cc];
        }
        ao = AOV;
      }
      const B = f.mode === 'glass' ? bufFor(f.key, y) : f.stamp === STAMP ? f.B : (f.stamp = STAMP, f.B = bufFor(f.key)); // translúcidos: una capa por Y
      quad(B, f.pts, f.uv, f.sh, f.tint, f.emis ? add : 0, ao, ox, oy, oz);
      if (f.gkey) quad(bufFor(f.gkey), f.pts, f.uv, 0, null, add, ONE4, ox, oy, oz);
    }
  }
  // cristal de cuarzo AE2 con texturas conectadas (como su GlassBakedModel): sin cara entre dos cristales;
  // en cada cara, base a/b/c/d + marco en los lados sin cristal vecino (bits: 1 arriba, 2 derecha, 4 abajo, 8 izquierda)
  const QFACES = [[[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
  function emitCtm(b, ghost) {
    const s = P[b.t], isQ = d => { const j = idx(b.x + d[0], b.y + d[1], b.z + d[2]); return j >= 0 && CELL[j] && P[CELL[j].t].ctm; };
    for (const [n, r, u] of QFACES) {
      const i = idx(b.x + n[0], b.y + n[1], b.z + n[2]);
      if (isQ(n) || (i >= 0 && (SOLID[i] === 1 || (ghost && SOLID[i])))) continue;
      const c = [b.x + .5 + n[0] * .5, b.y + .5 + n[1] * .5, b.z + .5 + n[2] * .5];
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, e]) => c.map((v, k) => v + (a * r[k] + e * u[k]) * .5)), uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
      if (ghost) { quad(bufFor('ghost'), pts, uv, 0, null, 1, ONE4, 0, 0, 0); continue; }
      const neg = d => d.map(v => -v), mask = (!isQ(u) && 1) | (!isQ(r) && 2) | (!isQ(neg(u)) && 4) | (!isQ(neg(r)) && 8);
      const sh = shadeOf(n), e = s.glow ? glowOf(s) : 0;
      quad(bufFor(`qglass|ae2:glass/quartz_glass_${'abcd'[Math.abs(b.x * 7 + b.y * 13 + b.z * 31) % 4]}||0`), pts, uv, sh, null, e, ONE4, 0, 0, 0);
      if (mask) quad(bufFor(`qglass|ae2:glass/quartz_glass_frame${mask.toString(2).padStart(4, '0')}||1`), pts, uv, sh, null, e, ONE4, 0, 0, 0);
    }
  }
  function emitBox(c, dims, ctr, texOf, tint, addOf) { // pieza de cable o P2P, ya orientada en el mundo
    for (const f of boxFaces(...dims, ...ctr)) quad(bufFor(`solid|${texOf(f.n)}||0`), f.pts, f.uv, shadeOf(f.n), tint, addOf(f.n), ONE4, c.x + .5, c.y + .5, c.z + .5);
  }
  function emitCables(cut) { // modo cables: cable denso real (núcleo + brazos hacia vecinos) y piezas P2P
    for (const b of GB) {
      if (!isCable(b) || b.y >= cut) continue;
      const col = colOf(b), tk = () => 'ae2:part/cable/dense_smart/' + col;
      emitBox(b, [.5, .5, .5], [0, 0, 0], tk, null, () => .25);
      for (const d of N6) {
        if (p2pFace.has(`${b.x},${b.y},${b.z},${d}`)) continue; // en esa cara va la pieza P2P
        const n = AT.get(`${b.x + d[0]},${b.y + d[1]},${b.z + d[2]}`);
        if (n && ((isCable(n) && colOf(n) === col) || DEV.test(n.t))) emitBox(b, d.map(v => (v ? .25 : .5)), d.map(v => v * .375), tk, null, () => .25); // colores distintos no se unen
      }
    }
    for (const p of CHANNELS.P2P) if (p.y < cut) {
      const front = n => n.join() === p.d.join();
      emitBox(p, p.d.map(v => (v ? .125 : .75)), p.d.map(v => v * .4375), n => (front(n) ? 'ae2:part/p2p_tunnel_front' : 'ae2:part/p2p_tunnel_sides'), P2P_TINT[p.io], n => (front(n) ? .35 : 0));
    }
    for (const f of FIBER) if (f.y < cut) emitBox(f, f.d.map(v => (v ? .5 : .125)), f.d.map(v => v * .25), () => 'ae2:part/quartz_fiber', null, () => .3);
  }

  // state: { hide (grupo → oculto), cut (se ve y < cut), cables (modo cables) } → { group: THREE.Group, pick: celda → bloque }
  function build({ hide, cut, cables }) {
    BUFS = new Map(); STAMP++; SOLID.fill(0); CELL.fill(undefined);
    const PICK = new Array(NC);
    const show = b => b.y < cut && !hide[groupOf(b)], ghostOf = b => cables && !DEV.test(b.t);
    const list = GB.filter(b => show(b) && !(cables && isCable(b))); // en modo cables se quitan las fachadas
    for (const b of list) {
      const i = idx(b.x, b.y, b.z);
      CELL[i] = b;
      if (geo.opaqueT(b.t)) SOLID[i] = ghostOf(b) ? 2 : 1;
      if (!ghostOf(b)) PICK[i] = b;
    }
    if (cables) for (const b of GB) if (isCable(b) && b.y < cut) PICK[idx(b.x, b.y, b.z)] = b;
    for (const b of list) (P[b.t].ctm ? emitCtm : emitBlock)(b, ghostOf(b));
    for (const t of TERMS) if (show(t)) emitBlock(t, false);
    if (cables) emitCables(cut);
    const group = new THREE.Group();
    for (const B of BUFS.values()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
      g.setIndex(B.i);
      const m = new THREE.Mesh(g, mat(B.mk));
      if (m.material.transparent) { // los translúcidos se ordenan por la posición del objeto: se centra cada capa
        g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3());
        g.translate(-c.x, -c.y, -c.z); m.position.copy(c);
      }
      group.add(m);
    }
    return { group, pick: PICK, faces: [...BUFS.values()].reduce((s, B) => s + B.n / 4, 0) };
  }

  const cache = new Map(), MAX = 8;
  const dispose = e => e.group.traverse(o => o.geometry?.dispose());
  function get(sig, state) {
    let e = cache.get(sig);
    if (e) { cache.delete(sig); cache.set(sig, e); e.hit = true; return e; } // más reciente al final
    const t0 = performance.now();
    e = build(state); e.ms = performance.now() - t0; e.hit = false;
    cache.set(sig, e);
    if (cache.size > MAX) { const [k, old] = cache.entries().next().value; cache.delete(k); dispose(old); }
    return e;
  }
  const clear = () => { for (const e of cache.values()) dispose(e); cache.clear(); };
  return { get, clear, get cached() { return cache.size; }, MAX };
}
