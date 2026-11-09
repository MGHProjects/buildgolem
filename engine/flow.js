// Animación del proceso en 3D: objetos que viajan entre máquinas, barras de progreso, pulsos y etiquetas.
import * as THREE from 'three';
import { list } from './process.js';
export { solve, machineRate, MAX_UPGRADES } from './process.js';

// ── animación ──
const RED = new THREE.Color('#ff4d3d'), COPPER = new THREE.Color('#FFC21A');
const nearest = (arr, p) => arr.reduce((a, q) => (!a || (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2 < (a[0] - p[0]) ** 2 + (a[1] - p[1]) ** 2 + (a[2] - p[2]) ** 2 ? q : a), null);
const v3 = p => new THREE.Vector3(p[0] + .5, p[1] + .5, p[2] + .5);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function labelSprite(lines, color, size = 2.6) {
  const c = document.createElement('canvas'), W = 512, H = 136, g = c.getContext('2d');
  c.width = W; c.height = H;
  g.fillStyle = 'rgba(18,21,24,.9)'; g.fillRect(0, 0, W, H);
  g.strokeStyle = color; g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, H - 3);
  g.fillStyle = color; g.fillRect(0, 0, 10, H);
  g.font = '600 40px "Geist Variable", system-ui, sans-serif'; g.fillStyle = '#eef1f4'; g.textBaseline = 'top';
  g.fillText(lines[0], 28, 18, W - 44);
  g.font = '500 32px "Geist Mono Variable", ui-monospace, monospace'; g.fillStyle = color;
  g.fillText(lines[1], 28, 76, W - 44);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(size, size * H / W, 1); s.renderOrder = 30;
  return s;
}

const DESCRIBE = n => [n.label || n.id, n.rate.perTick ? `${n.rate.count} × ${n.rate.parallel}` : `${+n.rate.cycle.toFixed(2)} s`];

export function createFlow(scene, camera, { describe = DESCRIBE, labelSize = 2.6 } = {}) {
  const group = new THREE.Group(); group.name = 'flow'; scene.add(group);
  const cube = new THREE.BoxGeometry(.2, .2, .2), drop = new THREE.IcosahedronGeometry(.1, 0), frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.06, 1.06, 1.06));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), e = new THREE.Euler();
  let lanes = [], machines = [], labels = [], simT = 0, last = 0, playing = true, speed = 1, labelsOn = true, frame = 0;
  const pv = new THREE.Vector3();
  // etiquetas: solo las cercanas y sin pisarse en pantalla (gana la más cercana a la cámara)
  function declutter() {
    const k = 1 / Math.tan(camera.fov * Math.PI / 360), taken = [];
    const near = labels.map(s => ({ s, d: camera.position.distanceTo(s.position) })).filter(x => x.d < 10 * labelSize).sort((a, b) => a.d - b.d);
    for (const s of labels) s.visible = false;
    for (const { s, d } of near) {
      pv.copy(s.position).project(camera);
      if (pv.z > 1 || Math.abs(pv.x) > 1.1 || Math.abs(pv.y) > 1.1) continue;
      const hw = s.scale.x * k / (2 * d * camera.aspect), hh = s.scale.y * k / (2 * d), r = [pv.x - hw, pv.x + hw, pv.y - hh, pv.y + hh];
      if (taken.some(o => r[0] < o[1] && r[1] > o[0] && r[2] < o[3] && r[3] > o[2])) continue;
      taken.push(r); s.visible = true;
    }
  }

  function clear() {
    for (const o of [...group.children]) { group.remove(o); if (o.geometry && ![cube, drop, frameGeo].includes(o.geometry)) o.geometry.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }
    lanes = []; machines = []; labels = [];
  }

  function set(g) {
    clear();
    if (!g?.nodes?.length) return;
    const byId = new Map(g.nodes.map(n => [n.id, n]));
    for (const ed of g.edges || []) {
      const a = list(byId.get(ed.from)?.at), b = list(byId.get(ed.to)?.at);
      const paths = ed.paths || (ed.path ? [ed.path] : a.map(p => [p, nearest(b, p)]).filter(x => x[1]));
      const per = (ed.rate || 0) / Math.max(1, paths.length), color = new THREE.Color(ed.color || '#E07A3F');
      for (const path of paths) {
        const pts = path.map(v3);
        if (pts.length < 2) continue;
        const curve = new THREE.CurvePath();
        for (let i = 0; i < pts.length - 1; i++) curve.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
        const len = curve.getLength() || 1;
        // velocidad visual (bloques/s) que crece con el caudal; los objetos en la ruta salen de caudal × largo / velocidad
        const vel = clamp(.8 + 1.1 * Math.log10(1 + per), .8, 3.5);
        const count = per > 0 ? clamp(Math.round(len * per / vel), 1, ed.fluid ? 40 : 28) : 0;
        const rail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .45 }));
        group.add(rail);
        if (!count) continue;
        const mat = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(ed.fluid ? 1 : 1.25), transparent: !!ed.fluid, opacity: ed.fluid ? .8 : 1 });
        const mesh = new THREE.InstancedMesh(ed.fluid ? drop : cube, mat, count);
        mesh.frustumCulled = false;
        group.add(mesh);
        lanes.push({ curve, len, count, vel, mesh, fluid: !!ed.fluid });
      }
    }
    for (const n of g.nodes) {
      if (!n.rate) continue;
      const slow = n.id === g.bottleneck, col = slow ? RED : COPPER, pos = list(n.at);
      pos.forEach((p, i) => {
        const c = v3(p);
        const frame = new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({ color: col.clone(), transparent: true, opacity: .35 }));
        frame.position.copy(c); group.add(frame);
        const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#081626', depthTest: false, transparent: true, opacity: .85 }));
        const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: col.clone().multiplyScalar(1.4), depthTest: false }));
        for (const s of [bg, fill]) { s.center.set(0, .5); s.position.set(c.x - .42, c.y + .72, c.z); s.renderOrder = 25; group.add(s); }
        bg.scale.set(.84, .09, 1);
        machines.push({ frame, fill, n, slow, phase: i * .37, cycle: n.rate.cycle, perTick: !!n.rate.perTick, load: n.load ?? 1 });
      });
      if (pos.length) {
        const s = labelSprite(describe(n), slow ? '#ff6b5e' : '#ffd15c', labelSize);
        const top = pos.reduce((a, p) => (p[1] > a[1] ? p : a), pos[0]);
        s.position.set(top[0] + .5, top[1] + 1 + labelSize * .42, top[2] + .5); group.add(s);
        labels.push(s);
      }
    }
    for (const s of labels) s.visible = labelsOn;
  }

  return {
    group, set,
    tick(now) {
      const dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
      if (!group.visible) return;
      if (playing) simT += dt * speed;
      for (const l of lanes) {
        const base = simT * l.vel / l.len;
        for (let k = 0; k < l.count; k++) {
          const u = (base + k / l.count) % 1, p = l.curve.getPointAt(u), s = Math.min(1, u * 10, (1 - u) * 10);
          if (l.fluid) q.identity(); else q.setFromEuler(e.set(simT * 1.3 + k, simT * .9 + k, 0));
          m4.compose(p, q, sc.set(s, s, s)); l.mesh.setMatrixAt(k, m4);
        }
        l.mesh.instanceMatrix.needsUpdate = true;
      }
      for (const m of machines) {
        // un ciclo por operación; si al paso le falta entrada (carga < 1) espera y el ciclo se alarga
        const period = m.perTick ? 1 : m.cycle / Math.max(.02, m.load), ph = ((simT / period) + m.phase) % 1;
        m.fill.scale.set(.84 * (m.perTick ? m.load : ph), .09, 1);
        const flash = m.perTick ? .5 + .5 * Math.sin(simT * 6 + m.phase * 9) : Math.exp(-ph * 9);
        m.frame.material.opacity = .25 + .65 * flash * Math.min(1, m.load + .2);
      }
      if (labelsOn && ++frame % 6 === 0) declutter();
    },
    setVisible(v) { group.visible = v; },
    setPlaying(v) { playing = v; },
    setSpeed(v) { speed = v; },
    setLabels(v) { labelsOn = v; for (const s of labels) s.visible = v; },
    dispose() { clear(); scene.remove(group); cube.dispose(); drop.dispose(); frameGeo.dispose(); },
  };
}
