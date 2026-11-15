// Piezas de arquitectura japonesa sobre el mundo en memoria (lib.mjs).
import { OPP, NAME } from './lib.mjs';

// Perfil cóncavo del tejado en medias alturas por anillo (desde el alero hacia la cumbrera):
// los primeros anillos suben medio bloque (losa, escalera…) y luego uno entero: el tejado se curva como un kawara.
export const profile = (n, flat = 3) => { const h = []; let v = 0; for (let i = 0; i < n; i++) { v += i === 0 ? 1 : i <= flat ? 1 : 2; h.push(v); } return h; };

// Tejado a cuatro aguas con alero curvo, esquinas levantadas y opcionalmente irimoya (hastial arriba).
// x0..x1, z0..z1: línea de los muros; y: capa donde va la losa del alero; over: vuelo.
// mat: { stairs, slab, block, ridge (bloque de cumbrera), ridgeStairs?, tip (remate), gable (relleno del hastial) }
export function roof(w, { x0, z0, x1, z1, y, over = 2, mat, gable = null, flat = 3, stopAt = null, upturn = true, ornaments = true, axis = null, skip = null }) {
  const X0 = x0 - over, X1 = x1 + over, Z0 = z0 - over, Z1 = z1 + over;
  const alongX = axis ? axis === 'x' : (X1 - X0) >= (Z1 - Z0);                          // la cumbrera va a lo largo del lado largo
  const half = Math.floor((alongX ? Z1 - Z0 : X1 - X0) / 2);      // anillos hasta la cumbrera
  const P = profile(half + 1, flat);
  const rings = stopAt == null ? half : Math.min(half, stopAt - 1);
  const top = new Map();                                          // altura (medias) de la superficie por columna, para el hastial
  const put = (x, z, h, low, shape = 'straight') => {             // h: medias alturas sobre y
    if (skip && skip(x, z)) return;
    const n = Math.floor((h - 1) / 2), yy = y + n;
    if (h % 2 === 1) w.slab(x, yy, z, mat.slab);                  // impar: losa abajo en y+n
    else w.stair(x, yy, z, mat.stairs, low, { shape });           // par: escalera en y+n-… (su cara alta llega a y+n+1)
    top.set(`${x},${z}`, h);
  };
  const lift = d => (!upturn ? 0 : Math.max(0, 2 - d)); // esquina levantada (sori): +1 bloque en la punta, +½ al lado
  for (let i = 0; i <= rings; i++) {
    let ax0 = X0 + i, ax1 = X1 - i, az0 = Z0 + i, az1 = Z1 - i;
    const gab = gable != null && i > gable;                        // por encima de gable, los extremos cortos son hastiales
    if (gab) { if (alongX) { ax0 = X0 + gable; ax1 = X1 - gable; } else { az0 = Z0 + gable; az1 = Z1 - gable; } }
    if (ax0 > ax1 || az0 > az1) break;
    if (alongX ? az0 === az1 : ax0 === ax1) break;                 // fila central: cumbrera
    const h = P[i], up = d => lift(d + i);
    // faldones largos (bajan a los lados de la cumbrera); las esquinas, escalera exterior si es a cuatro aguas
    // punta levantada: losa de arriba debajo para que la esquina tenga grosor (viga de esquina) y no flote
    const thick = (x, z) => { if (skip && skip(x, z)) return; const yy = y + Math.floor((h - 1) / 2); if (!w.has(x, yy, z)) w.slab(x, yy, z, mat.slab, true); };
    if (!gab && up(0) > 0) for (const [cx2, cz2] of [[ax0, az0], [ax1, az0], [ax0, az1], [ax1, az1]]) thick(cx2, cz2);
    if (alongX) for (let x = ax0; x <= ax1; x++) {
      const d = Math.min(x - ax0, ax1 - x), corner = d === 0 && !gab, hh = h + (gab ? 0 : up(d));
      put(x, az0, hh, 'n', corner ? (x === ax0 ? 'outer_left' : 'outer_right') : 'straight');
      put(x, az1, hh, 's', corner ? (x === ax0 ? 'outer_right' : 'outer_left') : 'straight');
    } else for (let z = az0; z <= az1; z++) {
      const d = Math.min(z - az0, az1 - z), corner = d === 0 && !gab, hh = h + (gab ? 0 : up(d));
      put(ax0, z, hh, 'w', corner ? (z === az0 ? 'outer_right' : 'outer_left') : 'straight');
      put(ax1, z, hh, 'e', corner ? (z === az0 ? 'outer_left' : 'outer_right') : 'straight');
    }
    if (gab) continue;                                             // hastial: en los extremos no hay faldón
    // faldones de los extremos (cuatro aguas)
    if (alongX) for (let z = az0 + 1; z < az1; z++) { const d = Math.min(z - az0, az1 - z), hh = h + up(d); put(ax0, z, hh, 'w'); put(ax1, z, hh, 'e'); }
    else for (let x = ax0 + 1; x < ax1; x++) { const d = Math.min(x - ax0, ax1 - x), hh = h + up(d); put(x, az0, hh, 'n'); put(x, az1, hh, 's'); }
  }
  // cumbrera: la fila (o las dos filas) del centro, con bloque y caballete encima
  const ri = half, rh = P[Math.min(ri, P.length - 1)], n = y + Math.floor((rh - 1) / 2);
  const even = (alongX ? Z1 - Z0 : X1 - X0) % 2 === 1;                 // nº de filas par: la cumbrera ocupa dos
  const gx0 = gable != null && alongX ? X0 + gable : X0 + ri, gx1 = gable != null && alongX ? X1 - gable : X1 - ri;
  const gz0 = gable != null && !alongX ? Z0 + gable : Z0 + ri, gz1 = gable != null && !alongX ? Z1 - gable : Z1 - ri;
  if (stopAt == null) {
    const rows = alongX ? [Z0 + ri, ...(even ? [Z0 + ri + 1] : [])] : [X0 + ri, ...(even ? [X0 + ri + 1] : [])];
    if (alongX) for (let x = gx0; x <= gx1; x++) for (const z of rows) { w.set(x, n, z, mat.block); w.set(x, n + 1, z, mat.ridge); }
    else for (let z = gz0; z <= gz1; z++) for (const x of rows) { w.set(x, n, z, mat.block); w.set(x, n + 1, z, mat.ridge); }
    if (ornaments) {
      const ends = alongX ? rows.flatMap(z => [[gx0, z, 'w'], [gx1, z, 'e']]) : rows.flatMap(x => [[x, gz0, 'n'], [x, gz1, 's']]);
      for (const [x, z, d] of ends) {
        w.set(x, n + 2, z, mat.tip || mat.ridge);
        const [dx, dz] = d === 'w' ? [-1, 0] : d === 'e' ? [1, 0] : d === 'n' ? [0, -1] : [0, 1];
        w.stair(x + dx, n + 2, z + dz, mat.stairs, OPP[d], { top: true });
      }
    }
  }
  // hastial (tsuma): pared triangular bajo los faldones en los extremos cortos
  if (gable != null && stopAt == null) {
    const base = y + Math.floor((P[gable] - 1) / 2);
    const faces = alongX ? [X0 + gable + 1, X1 - gable - 1] : [Z0 + gable + 1, Z1 - gable - 1];
    const span = alongX ? [Z0 + gable + 1, Z1 - gable - 1] : [X0 + gable + 1, X1 - gable - 1];
    for (const f of faces) for (let u = span[0]; u <= span[1]; u++) {
      const r = alongX ? Math.min(u - Z0, Z1 - u) : Math.min(u - X0, X1 - u);
      const lay = r > rings ? n : y + Math.floor((P[r] - 1) / 2) - 1;
      for (let yy = base; yy <= lay; yy++) { const [x, z] = alongX ? [f, u] : [u, f]; if (!w.has(x, yy, z)) w.set(x, yy, z, mat.gable || mat.block); }
    }
  }
  return { top: n + 1, X0, X1, Z0, Z1 };
}

// Muro japonés: pilares cada `bay`, durmiente abajo, viga (nuki) a media altura y viga de cabeza; paños de yeso; ventanas shoji.
// m: { post, beam, plaster, base?, window?, windowY: [a,b] (relativo) }  door(x,z) => true si esa columna es hueco de puerta
export function walls(w, { x0, z0, x1, z1, y0, y1, m, bay = 4, door = () => false, doorH = 4, nukiAt = null, brackets = true }) {
  const onRing = (x, z) => x === x0 || x === x1 || z === z0 || z === z1;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (!onRing(x, z)) continue;
    const ex = x === x0 || x === x1, ez = z === z0 || z === z1, u = ez ? x - x0 : z - z0;
    const post = (ex && ez) || u % bay === 0, axis = ez ? 'x' : 'z';
    for (let y = y0; y <= y1; y++) {
      const ry = y - y0;
      if (door(x, z) && ry < doorH) { w.del(x, y, z); continue; }
      if (post) { w.log(x, y, z, m.post, 'y'); continue; }
      if (ry === 0 || y === y1 || ry === (nukiAt ?? Math.floor((y1 - y0) / 2))) { w.log(x, y, z, m.beam, axis); continue; }
      if (door(x, z) && ry === doorH) { w.log(x, y, z, m.beam, axis); continue; }
      const win = m.window && m.windowY && ry >= m.windowY[0] && ry <= m.windowY[1] && !door(x, z);
      w.set(x, y, z, win ? m.window : m.plaster, win && m.windowState ? m.windowState(ex ? (x === x0 ? 'w' : 'e') : z === z0 ? 'n' : 's') : undefined);
    }
    // ménsulas (tokyō) bajo el alero, por fuera de cada pilar
    if (post && brackets && !(ex && ez)) {
      const d = ez ? (z === z0 ? 'n' : 's') : (x === x0 ? 'w' : 'e'), [dx, dz] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[d];
      w.stair(x + dx, y1 - 1, z + dz, m.bracket || m.stairsBeam, d, { top: true });
    }
  }
}

// Linterna de piedra (tōrō) de 4 de alto: base, fuste, caja de luz, tejadillo y remate
export function toro(w, x, y, z, m = {}) {
  const S = m.stone || 'minecraft:stone_bricks', W = m.wall || 'minecraft:stone_brick_wall', SL = m.slab || 'minecraft:stone_brick_slab', ST = m.stairs || 'minecraft:stone_brick_stairs';
  w.set(x, y, z, m.base || 'minecraft:chiseled_stone_bricks');
  w.set(x, y + 1, z, W);
  w.set(x, y + 2, z, m.light || 'minecraft:lantern', { hanging: 'false' });
  w.slab(x, y + 3, z, SL);
  w.set(x, y + 4, z, m.cap || 'minecraft:stone_button', { face: 'floor', facing: 'north' });
}

// Cerezo: tronco inclinado con 3-4 ramas abiertas; copa en paraguas (ancha y baja) con hojas que cuelgan del borde
export function cherry(w, x, y, z, seed = 1, size = 1) {
  const rnd = (() => { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();
  const L = 'minecraft:cherry_log', LV = 'minecraft:cherry_leaves', H = 3 + size;
  const lean = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rnd() * 4)];
  let cx = x, cz = z;
  for (let i = 0; i < H; i++) { if (i === H - 1) { cx += lean[0]; cz += lean[1]; } w.log(cx, y + i, cz, L, 'y'); }
  const top = y + H - 1, tips = [[cx, top + 1, cz]];
  w.log(cx, top + 1, cz, L, 'y');
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].sort(() => rnd() - .5).slice(0, 3 + (size > 1 ? 1 : 0));
  for (const [dx, dz] of dirs) {
    const len = 2 + size; let bx = cx, bz = cz, by = top;
    for (let k = 1; k <= len; k++) { bx = cx + Math.round(dx * k); bz = cz + Math.round(dz * k); by = top + Math.floor(k / 2); w.log(bx, by, bz, L, dx && !dz ? 'x' : !dx && dz ? 'z' : 'y'); }
    tips.push([bx, by + 1, bz]);
  }
  const R = 2 + size;
  for (const [tx, ty, tz] of tips) for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) for (let dy = -1; dy <= 1; dy++) {
    const d = (dx * dx + dz * dz) / (R * R) + (dy * dy) / 2.2;
    if (d > 1 || (d > .7 && rnd() < .35)) continue;
    const X = tx + dx, Y = ty + dy, Z = tz + dz;
    if (!w.has(X, Y, Z)) w.set(X, Y, Z, LV);
    if (d > .55 && dy === -1 && rnd() < .3 && !w.has(X, Y - 1, Z)) w.set(X, Y - 1, Z, LV);   // hojas que cuelgan
  }
  for (let i = 0; i < 12 + size * 8; i++) { const a = rnd() * 6.28, r = 1 + rnd() * (R + 1), X = Math.round(x + Math.cos(a) * r), Z = Math.round(z + Math.sin(a) * r); if (!w.has(X, y, Z)) w.set(X, y, Z, 'minecraft:pink_petals'); }
}

// Pagoda de cinco pisos: cada piso más pequeño, con su alero curvo; arriba tejado a cuatro aguas y aguja (sōrin)
export function pagoda(w, cx, y, cz, { mat, wallM, floors = [[7, 5], [7, 4], [5, 4], [5, 4], [5, 4]] } = {}) {
  let yy = y;
  w.box(cx - 5, y - 1, cz - 5, cx + 5, y - 1, cz + 5, 'minecraft:stone_bricks');
  floors.forEach(([size, h], i) => {
    const r = (size - 1) >> 1, x0 = cx - r, x1 = cx + r, z0 = cz - r, z1 = cz + r, top = yy + h - 1;
    walls(w, { x0, z0, x1, z1, y0: yy, y1: top, m: { ...wallM, windowY: i ? [1, 2] : [2, 3] }, bay: 2, door: (x, z) => i === 0 && z === z1 && x === cx, doorH: 3, nukiAt: 1, brackets: false });
    for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++) for (let q = yy; q <= top; q++) w.set(x, q, z, i === 0 && q < top ? (q === yy + 1 && x === cx && z === cz ? 'minecraft:lantern' : null) : 'minecraft:dark_oak_planks');
    if (i === 0) w.set(cx, yy, cz, 'minecraft:chiseled_stone_bricks');
    const last = i === floors.length - 1;
    const rr = roof(w, { x0, z0, x1, z1, y: top, over: 2, mat, stopAt: last ? null : 3, ornaments: false });
    if (!last) { for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (!w.has(x, top + 1, z)) w.set(x, top + 1, z, 'minecraft:dark_oak_planks'); yy = top + 2; }
    else { const s = rr.top; for (let q = s; q <= s + 4; q++) w.set(cx, q, cz, q === s ? 'minecraft:polished_blackstone_wall' : 'minecraft:chain', q === s ? undefined : { axis: 'y' }); w.set(cx, s + 5, cz, 'minecraft:gold_block'); w.set(cx, s + 6, cz, 'minecraft:end_rod', { facing: 'up' }); }
  });
}
export { OPP, NAME };
