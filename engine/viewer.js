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
  constructor(mount, { sky = '#07080b', preserve = false } = {}) {
    this.mount = mount;
    const innerWidth = mount.clientWidth || 640, innerHeight = mount.clientHeight || 480;   // el tamaño es el del contenedor, no el de la ventana
    const r = this.renderer = new THREE.WebGLRenderer({ powerPreference: 'high-performance', preserveDrawingBuffer: preserve });
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
    this.resizer = new ResizeObserver(() => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      r.setSize(w, h); this.composer.setSize(w, h);
    });
    this.resizer.observe(mount);
    this.walk = createWalk(this, r.domElement);
    this.frame = now => {
      animate(now);
      this.flyStep(now);
      this.walk.step(now);
      this.controls.update();
      for (const h of this.hooks) h(now);
      this.composer.render();
    };
    r.setAnimationLoop(this.frame);
  }
  get canvas() { return this.renderer.domElement; }
  dispose() {
    this.walk.dispose();
    this.renderer.setAnimationLoop(null); this.resizer.disconnect(); this.controls.dispose();
    this.scene.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => m.dispose()); });
    this.composer.dispose?.(); this.renderer.dispose(); this.canvas.remove();
  }
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
    const box = this.renderer.domElement.getBoundingClientRect();
    r.setFromCamera(new THREE.Vector2((clientX - box.left) / box.width * 2 - 1, -(clientY - box.top) / box.height * 2 + 1), this.camera);
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

// WASD (y flechas) para moverse por el diseño; Q/E o espacio/C para bajar y subir; Mayús para ir rápido.
// Solo cuando el lienzo tiene el foco (clic encima o Tab), para no robar teclas a los campos de la página.
const KEYS = { KeyW: [0, 0, 1], ArrowUp: [0, 0, 1], KeyS: [0, 0, -1], ArrowDown: [0, 0, -1], KeyA: [-1, 0, 0], ArrowLeft: [-1, 0, 0], KeyD: [1, 0, 0], ArrowRight: [1, 0, 0],
  KeyE: [0, 1, 0], Space: [0, 1, 0], KeyQ: [0, -1, 0], KeyC: [0, -1, 0] };
function createWalk(v, el) {
  const down = new Set(), fwd = new THREE.Vector3(), side = new THREE.Vector3(), move = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let last = 0, fast = false;
  el.tabIndex = 0;
  el.setAttribute('aria-label', 'Vista 3D: arrastra para girar, WASD para moverte');
  const onDown = e => {
    if (!KEYS[e.code] && e.key !== 'Shift') return;
    fast = e.shiftKey;
    if (KEYS[e.code]) { down.add(e.code); e.preventDefault(); v.flight = null; }
  };
  const onUp = e => { down.delete(e.code); fast = e.shiftKey; };
  const clear = () => down.clear();
  el.addEventListener('keydown', onDown); el.addEventListener('keyup', onUp); el.addEventListener('blur', clear);
  el.addEventListener('pointerdown', () => el.focus({ preventScroll: true }));
  return {
    step(now) {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      if (!down.size || !dt) return;
      v.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      side.crossVectors(fwd, UP).normalize();
      move.set(0, 0, 0);
      for (const k of down) { const [x, y, z] = KEYS[k]; move.addScaledVector(side, x).addScaledVector(fwd, z); move.y += y; }
      if (!move.lengthSq()) return;
      // velocidad según la distancia al punto que se mira: cerca va fino, lejos cruza el diseño rápido
      const dist = v.camera.position.distanceTo(v.controls.target), speed = Math.max(4, Math.min(40, dist * 1.2)) * (fast ? 3 : 1);
      move.normalize().multiplyScalar(speed * dt);
      v.camera.position.add(move); v.controls.target.add(move);
    },
    dispose() { el.removeEventListener('keydown', onDown); el.removeEventListener('keyup', onUp); el.removeEventListener('blur', clear); },
  };
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
