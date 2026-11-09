// Geometría local de cada tipo de bloque (centrada en la celda, de -0,5 a 0,5) y su versión girada en el mundo.
import * as THREE from 'three';

export const shadeOf = n => n[0] * n[0] * .6 + n[2] * n[2] * .8 + n[1] * n[1] * (n[1] > 0 ? 1 : .5); // arriba 1 · N/S 0,8 · E/O 0,6 · abajo 0,5
export const ROT = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };

// caja: normal, "derecha" y "arriba" vistas desde fuera; UV "de mundo" (media losa = media textura)
const BOXN = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const BOXR = [[0, 0, -1], [0, 0, 1], [1, 0, 0], [1, 0, 0], [1, 0, 0], [-1, 0, 0]];
const BOXU = [[0, 1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [0, 1, 0], [0, 1, 0]];
const NAMES = ['side', 'side', 'top', 'bottom', 'front', 'back'];
const uvOf = (n, [x, y, z]) => { x += .5; y += .5; z += .5; return n[0] ? [n[0] > 0 ? 1 - z : z, y] : n[1] ? [x, n[1] > 0 ? 1 - z : z] : [n[2] > 0 ? x : 1 - x, y]; };
export function boxFaces(w, h, d, cx, cy, cz) {
  const half = [w / 2, h / 2, d / 2], c = [cx, cy, cz];
  return BOXN.map((n, i) => {
    const fc = c.map((v, k) => v + n[k] * half[k]), r = BOXR[i].map((v, k) => v * half[k]), u = BOXU[i].map((v, k) => v * half[k]);
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => fc.map((v, k) => v + a * r[k] + b * u[k])); // antihorario visto desde fuera
    return { n, pts, uv: pts.map(p => uvOf(n, p)), name: NAMES[i] };
  });
}
export const SHAPES = { // cajas [ancho, alto, fondo, centro x, y, z]; un shape sin entrada usa las cajas propias del bloque (b.boxes)
  cube: [[1, 1, 1, 0, 0, 0]],
  stairs: [[1, .5, 1, 0, -.25, 0], [1, .5, .5, 0, .25, -.25]], // escalón bajo hacia el "frente"
  bar: [[.125, .125, 1, 0, 0, 0]],                              // Barra luminosa: 2x2 px, centrada, 1 bloque de largo
  rod: [[.375, .375, .0625, 0, 0, -.47], [.125, .125, .94, 0, 0, -.03]], // End Rod: base en la pared de detrás + vara de 15 px
  post: [[.4, 1, .4, 0, 0, 0]],
  slab: [[1, .5, 1, 0, -.25, 0]],                                // losa (top: true = losa de arriba)
};
const faceTex = (s, f) => f === 'front' ? s.front || s.side || s.all : f === 'back' ? s.back || s.side || s.all
  : f === 'top' ? s.top || s.all || s.side : f === 'bottom' ? s.bottom || s.top || s.all || s.side : s.side || s.all;
// esquinas de cada cara de un elemento de modelo vistas desde fuera (arriba-izq, arriba-der, abajo-der, abajo-izq), como las UV de Minecraft
const CORNERS = {
  north: ([a, b, c], [d, e]) => [[d, e, c], [a, e, c], [a, b, c], [d, b, c]],
  south: ([a, b], [d, e, f]) => [[a, e, f], [d, e, f], [d, b, f], [a, b, f]],
  east: ([, b, c], [d, e, f]) => [[d, e, f], [d, e, c], [d, b, c], [d, b, f]],
  west: ([a, b, c], [, e, f]) => [[a, e, c], [a, e, f], [a, b, f], [a, b, c]],
  up: ([a, , c], [d, e, f]) => [[a, e, c], [d, e, c], [d, e, f], [a, e, f]],
  down: ([a, b, c], [d, , f]) => [[a, b, f], [d, b, f], [d, b, c], [a, b, c]],
};
const DEF_UV = { // UV por defecto si la cara no la trae: la zona de textura que cubre la caja
  north: ([a, b], [d, e]) => [16 - d, 16 - e, 16 - a, 16 - b], south: ([a, b], [d, e]) => [a, 16 - e, d, 16 - b],
  east: ([, b, c], [, e, f]) => [16 - f, 16 - e, 16 - c, 16 - b], west: ([, b, c], [, e, f]) => [c, 16 - e, f, 16 - b],
  up: ([a, , c], [d, , f]) => [a, c, d, f], down: ([a, , c], [d, , f]) => [a, 16 - f, d, 16 - c],
};
const normalOf = p => new THREE.Vector3(...p[1]).sub(new THREE.Vector3(...p[0])).cross(new THREE.Vector3(...p[3]).sub(new THREE.Vector3(...p[0])));

export function xform(b, yaw) { // giro del bloque: hacia dónde mira (+ escalera invertida = volteada sobre Z)
  const a = (ROT[b.f] ?? 0) + yaw, c = Math.cos(a), s = Math.sin(a), fl = b.top ? -1 : 1;
  return ([x, y, z]) => [fl * x * c + z * s, fl * y, -fl * x * s + z * c];
}

// P: paleta del diseño · MODELS: modelos de bloque reales (modelos.json, sacados de los jars)
export function createGeometry(P, MODELS) {
  const isCubeT = t => !P[t].model && !P[t].ctm && (!P[t].shape || P[t].shape === 'cube');
  const opaqueT = t => isCubeT(t) && !P[t].glass && !P[t].cutout;
  const LOCAL = {}, ORI = {};

  function localFaces(t, boxes, bk = '') {
    const ck = t + '|' + bk;
    if (LOCAL[ck]) return LOCAL[ck];
    const s = P[t], out = [];
    if (s.model) {
      const els = MODELS[[].concat(s.model).join('+')];
      if (!els) throw new Error(`Falta el modelo ${s.model} en modelos.json: vuelve a ejecutar extraer_texturas.py`);
      for (const e of els) {
        const rot = e.rotation && new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...{ x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[e.rotation.axis]), e.rotation.angle * Math.PI / 180);
        for (const [dir, f] of Object.entries(e.faces)) {
          const [u0, v0, u1, v1] = f.uv || DEF_UV[dir](e.from, e.to);
          let uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
          for (let r = (f.rotation || 0) / 90; r > 0; r--) uv = [uv[3], uv[0], uv[1], uv[2]]; // giro de textura en la cara
          const pts = CORNERS[dir](e.from, e.to).map(p => {
            const v = new THREE.Vector3(...p);
            if (rot) { const o = new THREE.Vector3(...e.rotation.origin); v.sub(o).applyMatrix4(rot).add(o); }
            return v.divideScalar(16).subScalar(.5).toArray();
          });
          const ord = [3, 2, 1, 0], P4 = ord.map(i => pts[i]), nv = normalOf(P4); // abajo-izq, abajo-der, arriba-der, arriba-izq
          if (nv.lengthSq() < 1e-12) continue; // cara sin área (elemento plano)
          const ti = f.tintindex;
          out.push({ pts: P4, uv: ord.map(i => [uv[i][0] / 16, 1 - uv[i][1] / 16]), n: nv.normalize().toArray(), tex: f.texture, mode: 'cutout', off: ti ? +ti : 0,
            tint: ti != null && s.tint?.[ti] ? new THREE.Color(s.tint[ti]) : null,
            emis: s.glow === true || (Array.isArray(s.glow) && s.glow.includes(f.texture)) || !!f.neoforge_data?.block_light });
        }
      }
    } else for (const bx of boxes || SHAPES[s.shape || 'cube']) for (const f of boxFaces(...bx)) {
      const tile = s.tile?.[bx[6] || 'arm']; // tile: trozo de la textura para cada caja (nudo / brazo), estirado a toda la cara
      if (tile) {
        const us = f.uv.map(q => q[0]), vs = f.uv.map(q => q[1]), u0 = Math.min(...us), v0 = Math.min(...vs), du = Math.max(...us) - u0 || 1, dv = Math.max(...vs) - v0 || 1;
        f.uv = f.uv.map(([u, v]) => [tile[0] + (u - u0) / du * (tile[2] - tile[0]), tile[1] + (v - v0) / dv * (tile[3] - tile[1])]);
      }
      const k = faceTex(s, f.name), g = s.glow === true ? k : typeof s.glow === 'string' ? s.glow : s.glow?.[f.name];
      out.push({ ...f, tex: k, bg: s.bg, mode: s.glass ? 'glass' : s.cutout ? 'cutout' : 'solid', off: 0, cube: isCubeT(t), emis: g === k, glow: g && g !== k ? g : null,
        tint: s.ctint?.[f.name] ? new THREE.Color(s.ctint[f.name]) : null }); // ctint: tinte del bioma por cara (césped, agua)
    }
    for (const f of out) { // cara en el borde de la celda: se oculta si el vecino es opaco
      const c = [0, 1, 2].map(k => (f.pts[0][k] + f.pts[2][k]) / 2), ax = f.n.findIndex(v => Math.abs(v) > .999);
      f.bound = ax >= 0 && Math.abs(c[ax] * Math.sign(f.n[ax]) - .5) < 1e-3;
    }
    return (LOCAL[ck] = out);
  }

  // caras ya giradas, una vez por (tipo, orientación, cajas): normal en el mundo, sombra, clave de material y vecinos para la AO
  function oriented(b) {
    const key = b.t + '|' + b.f + '|' + (b.top ? 1 : 0) + '|' + (b.bkey ?? '');
    if (ORI[key]) return ORI[key];
    const s = P[b.t], R = xform(b, s.model ? (s.yaw || 0) * Math.PI / 180 : 0);
    return (ORI[key] = localFaces(b.t, b.boxes, b.bkey).map(f => {
      const n = R(f.n), wn = n.map(Math.round), pts = f.pts.map(R), a = wn.findIndex(v => v), t1 = (a + 1) % 3, t2 = (a + 2) % 3;
      const ao = f.cube && f.bound && pts.map(p => { // oclusión ambiental (smooth lighting): delante de la cara, sus 2 lados y la esquina
        const o1 = [...wn], o2 = [...wn], oc = [...wn], d1 = Math.sign(p[t1]), d2 = Math.sign(p[t2]);
        o1[t1] += d1; o2[t2] += d2; oc[t1] += d1; oc[t2] += d2;
        return [o1, o2, oc];
      });
      return { ...f, wn, pts, ao, sh: shadeOf(n), wkey: `${wn}`, key: `${f.mode}|${f.tex}|${f.bg || ''}|${f.off}`, gkey: f.glow && `add|${f.glow}|${f.bg || ''}|1` };
    }));
  }
  return { isCubeT, opaqueT, localFaces, oriented };
}
