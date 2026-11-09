// Montaje de la Sala Mekanism al hacer scroll: plano → bloque a bloque → pintado → proceso en marcha.
// Datos reales del diseño (scripts/blueprint.mjs → sala-mekanism.json) y el mismo cálculo y animación de proceso que el simulador.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useI18n } from '../i18n.jsx';
import { Button } from '../ui.jsx';

gsap.registerPlugin(ScrollTrigger);
const COLORS = { struct: '#4d5a6b', glass: '#bfe3f5', light: '#fff1c4', mek: '#ff7a1a', gen: '#6d8fb3', ae2: '#3ab3da', cable: '#8a96a6' };
const KEYS = [ // cámara a lo largo del scroll: planta → vuelta → de frente → sobre la pared → dentro del pasillo de las líneas ×5
  { p: 0, pos: [21.5, 84, 44], tgt: [21.5, 0, 21.5] },
  { p: .34, pos: [-16, 46, 58], tgt: [21.5, 2, 21.5] },
  { p: .6, pos: [62, 34, 62], tgt: [21.5, 3, 21.5] },
  { p: .8, pos: [12, 30, 64], tgt: [10, 2, 22] },
  { p: .9, pos: [4, 24, 48], tgt: [4, 1.4, 22] },
  { p: 1, pos: [4, 3.2, 33.5], tgt: [4, 1.6, 18] },
];
const sm = t => t * t * (3 - 2 * t), cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function scene(THREE, wrap, room, flowLib) {
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(W, H);
  wrap.appendChild(r.domElement);
  r.domElement.setAttribute('aria-hidden', 'true');
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, W / H, .1, 600);
  sc.background = new THREE.Color('#15191d'); sc.fog = new THREE.Fog('#15191d', 90, 190);
  const g1 = new THREE.GridHelper(96, 96, '#2f6595', '#15304c'); g1.position.set(21.5, -.01, 21.5); g1.material.transparent = true; g1.material.opacity = .6; sc.add(g1);
  // contorno de la sala con sus cotas: lo primero que se dibuja
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(room.W, room.H, room.D)), new THREE.LineBasicMaterial({ color: '#FFC21A', transparent: true, opacity: .9 }));
  frame.position.set(room.W / 2, room.H / 2, room.D / 2); sc.add(frame);

  // bloques: un solo InstancedMesh; el sombreador dibuja la arista de cada cubo (plano) y mezcla hacia el color (pintado)
  const B = room.blocks, N = B.length / 4, geo = new THREE.BoxGeometry(.94, .94, .94);
  const mat = new THREE.ShaderMaterial({
    uniforms: { ink: { value: new THREE.Color('#8fc1ec') }, paint: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vC; varying vec3 vN;
      void main() { vUv = uv; vC = instanceColor; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 ink; uniform float paint; varying vec2 vUv; varying vec3 vC; varying vec3 vN;
      void main() { vec2 d = min(vUv, 1.0 - vUv); float e = min(d.x, d.y), w = fwidth(e);
        float line = 1.0 - smoothstep(.035, .035 + w * 1.5, e);
        float sh = .62 + .38 * max(dot(vN, normalize(vec3(.45, 1.0, .3))), 0.0);
        vec3 fillc = mix(ink * .18, vC * sh, paint);
        vec3 col = mix(fillc, mix(ink, vC * 1.25, paint), line * (1.0 - paint * .55));
        gl_FragColor = vec4(col, 1.0); }`,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, N), c = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const at = new Float32Array(N), hash = i => ((B[i * 4] * 73856093) ^ (B[i * 4 + 2] * 19349663)) % 1000 / 1000;
  for (let i = 0; i < N; i++) {
    c.set(COLORS[room.cats[B[i * 4 + 3]]] || COLORS.struct); mesh.setColorAt(i, c);
    // llegada de cada bloque: por capas de abajo arriba, con un poco de desorden dentro de la capa
    at[i] = .12 + .38 * (B[i * 4 + 1] / room.H) + .06 * Math.abs(hash(i));
  }
  mesh.instanceColor.needsUpdate = true; mesh.frustumCulled = false; sc.add(mesh);

  // proceso real (4 líneas ×5 con 8 mejoras): mismo motor que el simulador
  const flow = flowLib.createFlow(sc, cam, { labelSize: 2.2 });
  flow.set(flowLib.solve(room.process, { upgrades: room.process.upgrades ?? 8 })); flow.setVisible(false);

  let p = -1, raf = 0, on = false;
  const pos = new THREE.Vector3(), tgt = new THREE.Vector3();
  function place(pp) {
    let k = 0; while (k < KEYS.length - 2 && pp > KEYS[k + 1].p) k++;
    const a = KEYS[k], b = KEYS[k + 1], t = sm(cl((pp - a.p) / (b.p - a.p)));
    pos.set(...a.pos).lerp(v.set(...b.pos), t); tgt.set(...a.tgt).lerp(v.set(...b.tgt), t);
    cam.position.copy(pos); cam.lookAt(tgt);
  }
  function set(pp) {
    if (pp === p) return; p = pp;
    for (let i = 0; i < N; i++) {
      const t = cl((p - at[i]) / .08), e = 1 - (1 - t) ** 3, k = t <= 0 ? 0 : .3 + .7 * e;
      v.set(B[i * 4] + .5, B[i * 4 + 1] + .5 + (1 - e) * 9, B[i * 4 + 2] + .5);
      m4.compose(v, q, s.set(k, k, k)); mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mat.uniforms.paint.value = sm(cl((p - .56) / .16));
    frame.material.opacity = .9 * (1 - sm(cl((p - .45) / .2)));
    flow.setVisible(p > .76);
    place(p);
  }
  const loop = now => { flow.tick(now); r.render(sc, cam); raf = on ? requestAnimationFrame(loop) : 0; };
  const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(loop); });
  io.observe(wrap);
  const ro = new ResizeObserver(() => { const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return; cam.aspect = w / h; cam.updateProjectionMatrix(); r.setSize(w, h); });
  ro.observe(wrap);
  set(0);
  return {
    set, flow,
    dispose() { on = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); flow.dispose(); geo.dispose(); mat.dispose(); r.dispose(); r.domElement.remove(); },
  };
}

export default function Assembly() {
  const { t, lang } = useI18n(), root = useRef(null), wrap = useRef(null), api = useRef(null);
  const [step, setStep] = useState(0), [room, setRoom] = useState(null);
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    let dead = false;
    Promise.all([import('three'), import('./sala-mekanism.json'), import('@engine/flow.js')]).then(([THREE, data, flowLib]) => {
      if (dead || !wrap.current) return;
      const rm = data.default || data;
      api.current = scene(THREE, wrap.current, rm, flowLib);
      if (reduce) { api.current.set(.72); api.current.flow.setPlaying(false); }
      const o = flowLib.solve(rm.process, { upgrades: rm.process.upgrades ?? 8 }).edges.find(e => e.output);
      setRoom({ ...rm, outPerMin: o ? o.rate * 60 : null });
    });
    return () => { dead = true; api.current?.dispose(); api.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!room || reduce) return;
    const st = ScrollTrigger.create({
      trigger: root.current, start: 'top top', end: '+=360%', pin: '[data-asm-pin]', scrub: .8, refreshPriority: 1, // va antes en la página que el alzado: se calcula primero aunque llegue después
      onUpdate: self => { api.current?.set(self.progress); setStep(Math.min(3, Math.floor(self.progress * 4.2))); },
    });
    ScrollTrigger.sort(); ScrollTrigger.refresh();
    return () => st.kill();
  }, [room, reduce]);

  const out = room?.process && room.process.edges.find(e => e.output);
  const steps = [
    { h: t('asm.1.t'), p: t('asm.1.d'), m: room ? `${room.W - 2} × ${room.D - 2} × ${room.H - 2}` : '' },
    { h: t('asm.2.t'), p: t('asm.2.d'), m: room ? room.total.toLocaleString(lang) : '', u: t('sim.blocks') },
    { h: t('asm.3.t'), p: t('asm.3.d', { n: room?.entries ?? '' }), m: room ? `${room.entries}` : '', u: t('asm.3.u') },
    { h: t('asm.4.t'), p: t('asm.4.d'), m: room?.outPerMin ? Math.round(room.outPerMin).toLocaleString(lang) : '', u: out ? `${(out.item?.[lang] || out.item?.es || '').toLowerCase()}/min` : '' },
  ];
  return (
    <section id="flujo" ref={root} className="border-b border-line" aria-label={t('asm.label')}>
      <div data-asm-pin className="relative h-dvh overflow-hidden bg-[#15191d]">
        <div ref={wrap} className="absolute inset-0" />
        {/* viñeta para que el texto se lea sobre el 3D */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(21_25_29/.94)_0%,rgb(21_25_29/.6)_42%,transparent_70%)] md:bg-[linear-gradient(90deg,rgb(21_25_29/.92)_0%,rgb(21_25_29/.55)_38%,transparent_62%)]" aria-hidden="true" />
        <div className="relative mx-auto grid h-full max-w-[1320px] grid-rows-[1fr_auto] px-4 pb-10 pt-24 text-[#eef1f4] md:grid-rows-1 md:items-center">
          <div className="relative max-w-[460px]">
            {steps.map((s, i) => (
              <div key={i} aria-hidden={step !== i} className={`grid gap-4 transition-[opacity,transform] duration-500 ease-out ${i ? 'absolute inset-x-0 top-0' : ''} ${step === i ? 'opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}>
                <span className="font-mono text-[clamp(2.4rem,5vw,4rem)] font-medium leading-none tracking-tight text-[#ffd15c]">{s.m}{s.u && <span className="ml-2 align-middle text-base font-normal text-[#9aa4ae]">{s.u}</span>}</span>
                <h2 className="text-[clamp(1.8rem,3.2vw,2.8rem)] font-semibold leading-[1.06] tracking-[-0.03em]">{s.h}</h2>
                <p className="max-w-[42ch] text-[17px] leading-relaxed text-[#c9d0d6]">{s.p}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 md:absolute md:bottom-10 md:left-4">
            <ol className="flex gap-1.5" aria-label={t('asm.progress')}>
              {steps.map((_, i) => <li key={i} className={`h-1 rounded-[1px] transition-all duration-500 ${i <= step ? 'w-10 bg-[#FFC21A]' : 'w-5 bg-[#333b43]'}`} aria-current={i === step ? 'step' : undefined} />)}
            </ol>
            <Button as={Link} to="/d/sala-mekanism" size="sm" variant="secondary" className="!border-[#24476b] !text-[#eef1f4]">{t('asm.open')}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
