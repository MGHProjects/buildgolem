// Objetos de Mekanism en 3D flotando alrededor del plano del hero: cada píxel opaco de su textura real (MIT) es un vóxel,
// como un objeto en la mano en Minecraft. Siguen al ratón con un poco de inercia y se dispersan al bajar.
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const TEX = '/api/workspaces/atm10-demo/tex/mekanism/item/';
// [textura, posición en pantalla (−1..1), profundidad, escala]
const ITEMS = [ // en los márgenes: nunca encima del titular ni del plano
  ['alloy_atomic', [-.93, -.74], -1, .85], ['ultimate_control_circuit', [-.36, -.86], 1, .7], ['pellet_antimatter', [.985, .66], 0, .8],
  ['alloy_reinforced', [.985, -.72], -1, .8], ['elite_control_circuit', [-.04, -.9], .5, .62], ['alloy_infused', [.4, .86], -3, .7],
];

function voxels(THREE, img) {
  const c = document.createElement('canvas'), n = img.width;
  c.width = n; c.height = n;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, n, n, 0, 0, n, n);
  const px = g.getImageData(0, 0, n, n).data, cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = (y * n + x) * 4; if (px[i + 3] > 100) cells.push([x, y, px[i], px[i + 1], px[i + 2]]); }
  const s = 1 / n, mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(s, s, s * 1.4), new THREE.MeshLambertMaterial(), cells.length);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  cells.forEach(([x, y, r, gg, b], i) => {
    m.makeTranslation((x + .5) * s - .5, .5 - (y + .5) * s, 0); mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.setRGB(r / 255, gg / 255, b / 255, THREE.SRGBColorSpace));
  });
  return mesh;
}

export default function VoxelItems({ trigger }) {
  const wrap = useRef(null);
  useEffect(() => {
    if (!matchMedia('(min-width: 768px)').matches) return undefined;          // en móvil el hero va sin objetos: menos peso
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dispose = () => {}, dead = false;
    import('three').then(async THREE => {
      if (dead || !wrap.current) return;
      const el = wrap.current, W = () => el.clientWidth, H = () => el.clientHeight;
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(W(), H()); el.appendChild(r.domElement);
      const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, W() / H(), .1, 100);
      cam.position.set(0, 0, 14);
      sc.add(new THREE.AmbientLight('#cfe3ff', 1.6)); const sun = new THREE.DirectionalLight('#ffffff', 2.4); sun.position.set(3, 5, 6); sc.add(sun);
      const imgs = await Promise.all(ITEMS.map(([n]) => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = `${TEX}${n}.png`; })));
      if (dead) { r.dispose(); return; }
      const half = () => { const h = Math.tan(cam.fov * Math.PI / 360) * cam.position.z; return [h * cam.aspect, h]; };
      const items = [];
      ITEMS.forEach(([, [nx, ny], z, k], i) => {
        if (!imgs[i]) return;
        const g = new THREE.Group(), v = voxels(THREE, imgs[i]);
        g.add(v); g.scale.setScalar(1.55 * k); sc.add(g);
        items.push({ g, nx, ny, z, ph: i * 1.7, spin: (i % 2 ? -1 : 1) * (.25 + i * .04) });
      });
      const layout = () => { const [hw, hh] = half(); for (const it of items) it.base = [it.nx * hw * .93, it.ny * hh * .86, it.z]; };
      layout();
      const mouse = { x: 0, y: 0, tx: 0, ty: 0 }, scatter = { v: 0 };
      const onMove = e => { mouse.tx = e.clientX / innerWidth * 2 - 1; mouse.ty = e.clientY / innerHeight * 2 - 1; };
      addEventListener('pointermove', onMove, { passive: true });
      const st = !reduce && trigger?.current ? gsap.to(scatter, { v: 1, ease: 'none', scrollTrigger: { trigger: trigger.current, start: 'top top', end: 'bottom top', scrub: .6 } }) : null;
      let raf = 0, on = true, t0 = performance.now();
      const loop = now => {
        const t = (now - t0) / 1000;
        mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
        for (const it of items) {
          const [bx, by, bz] = it.base, s = scatter.v;
          it.g.position.set(bx * (1 + s * .6) + mouse.x * (.4 + bz * -.08), by + Math.sin(t * .9 + it.ph) * .18 + s * 6 * Math.sign(by || 1), bz - s * 4);
          it.g.rotation.set(-.25 + mouse.y * .35, (reduce ? .6 : t * it.spin) + mouse.x * .5, Math.sin(t * .6 + it.ph) * .12);
        }
        r.render(sc, cam);
        raf = on && !reduce ? requestAnimationFrame(loop) : 0;
      };
      const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(loop); });
      io.observe(el);
      const ro = new ResizeObserver(() => { cam.aspect = W() / H(); cam.updateProjectionMatrix(); r.setSize(W(), H()); layout(); if (reduce) loop(performance.now()); });
      ro.observe(el);
      raf = requestAnimationFrame(loop);
      gsap.from(items.map(i => i.g.scale), { x: 0, y: 0, z: 0, duration: 1.1, ease: 'back.out(1.6)', stagger: .12, delay: 1.2 });
      dispose = () => { on = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); removeEventListener('pointermove', onMove); st?.scrollTrigger?.kill(); st?.kill(); sc.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); r.dispose(); r.domElement.remove(); };
    });
    return () => { dead = true; dispose(); };
  }, [trigger]);
  return <div ref={wrap} className="pointer-events-none absolute inset-0 z-0" aria-hidden="true" />;
}
