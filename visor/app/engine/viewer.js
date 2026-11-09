// Visor: renderer, cámara orbital con vuelos suaves, postproceso (bloom solo de lo emisivo), selección por rayo y contornos.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { animate, setAnisotropy } from './textures.js';

// aristas de una caja de celda (12 segmentos), un poco más grande para no pelearse con las caras
function boxEdges(out, x, y, z, s = 1.004) {
  const o = (1 - s) / 2, a = [x + o, y + o, z + o], b = [x + o + s, y + o + s, z + o + s];
  const c = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [i & 1 ? b[0] : a[0], i & 2 ? b[1] : a[1], i & 4 ? b[2] : a[2]]);
  for (const [i, j] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) out.push(...c[i], ...c[j]);
}

export class Viewer {
  constructor(mount, { sky = '#07080b' } = {}) {
    const r = this.renderer = new THREE.WebGLRenderer({ powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.setSize(innerWidth, innerHeight);
    mount.appendChild(r.domElement);
    setAnisotropy(r.capabilities.getMaxAnisotropy());
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(sky);
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    this.controls.addEventListener('start', () => { this.flight = null; }); // el usuario manda: corta el vuelo
    // el búfer del composer lleva su propio MSAA, y en HDR para que solo brille lo emisivo
    this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.2, 1));
    this.composer.addPass(new OutputPass());
    this.composer.setSize(innerWidth, innerHeight);
    this.hooks = [];
    this.lines = {};
    for (const [name, color, depthTest, opacity] of [['hover', '#f8fafc', true, .9], ['link', '#38bdf8', false, .9], ['mark', '#fbbf24', false, .9], ['pin', '#ffffff', false, .95]]) {
      const m = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, depthTest, transparent: true, opacity }));
      m.renderOrder = depthTest ? 1 : 10; m.frustumCulled = false;
      this.scene.add(m); this.lines[name] = m;
    }
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
      r.setSize(innerWidth, innerHeight); this.composer.setSize(innerWidth, innerHeight);
    });
    this.frame = now => {
      animate(now);
      this.flyStep(now);
      this.controls.update();
      for (const h of this.hooks) h(now);
      this.composer.render();
    };
    r.setAnimationLoop(this.frame);
  }
  get canvas() { return this.renderer.domElement; }
  setWorld(group) { if (this.world === group) return; if (this.world) this.scene.remove(this.world); this.scene.add(group); this.world = group; }
  // vuelo de cámara con suavizado (600 ms); instant salta directamente
  fly(p, t, instant = false) {
    const to = { p: new THREE.Vector3(...p), t: new THREE.Vector3(...t) };
    if (instant) { this.camera.position.copy(to.p); this.controls.target.copy(to.t); this.flight = null; return; }
    this.flight = { from: { p: this.camera.position.clone(), t: this.controls.target.clone() }, to, t0: performance.now() };
  }
  flyStep(now) {
    const f = this.flight; if (!f) return;
    const k = Math.min(1, (now - f.t0) / 600), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    this.camera.position.lerpVectors(f.from.p, f.to.p, e); this.controls.target.lerpVectors(f.from.t, f.to.t, e);
    if (k === 1) this.flight = null;
  }
  ray(clientX, clientY) {
    const r = new THREE.Raycaster();
    r.setFromCamera(new THREE.Vector2(clientX / innerWidth * 2 - 1, -clientY / innerHeight * 2 + 1), this.camera);
    return r.ray;
  }
  // contorno de una lista de celdas [{x,y,z}] en una capa: hover (bajo el ratón), link (máquina de un proveedor), mark (resaltado por tipo), pin
  outline(layer, cells = []) {
    const pos = [];
    for (const c of cells) boxEdges(pos, c.x, c.y, c.z, c.s);
    const g = this.lines[layer].geometry;
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeBoundingSphere();
  }
}

// selección: recorre la rejilla celda a celda a lo largo del rayo (DDA) hasta el primer bloque visible
export function pickGrid(ray, idx, pick, steps = 600) {
  const o = ray.origin, d = ray.direction, c = [Math.floor(o.x), Math.floor(o.y), Math.floor(o.z)], dir = [d.x, d.y, d.z], st = dir.map(Math.sign);
  const tD = dir.map(v => (v ? Math.abs(1 / v) : Infinity)), tM = dir.map((v, k) => (v ? ((v > 0 ? c[k] + 1 : c[k]) - [o.x, o.y, o.z][k]) / v : Infinity));
  let n = [0, 0, 0];
  for (let s = 0; s < steps; s++) {
    const i = idx(...c), b = i >= 0 && pick[i];
    if (b) return { b, n };
    const a = tM[0] < tM[1] ? (tM[0] < tM[2] ? 0 : 2) : (tM[1] < tM[2] ? 1 : 2);
    c[a] += st[a]; tM[a] += tD[a]; n = [0, 0, 0]; n[a] = -st[a]; // cara por la que entra el rayo
  }
  return null;
}
