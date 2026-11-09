// Monta el visor de un diseño dentro de un elemento: motor 3D, fichas, tooltips, tiers y proceso animado.
// La interfaz (React) la pone quien lo monta: mountDesign devuelve un API con el estado y las acciones,
// y emite eventos con on(fn): 'stats', 'view', 'hover', 'select', 'process', 'materials'.
import * as THREE from 'three';
import { createWorld, key, STEP } from './world.js';
import { createGeometry } from './geometry.js';
import { createMesher } from './mesher.js';
import { Viewer, pickGrid } from './viewer.js';
import { createScreens } from './screens.js';
import { createFlow, solve, MAX_UPGRADES } from './flow.js';
import { families, applyTier, PARALLEL, tierOf } from './tiers.js';
import { createGui } from './ui/ae2gui.js';
import { infoBlock, patternsList } from './ui/panel.js';
import { createCard, createInspector } from './ui/inspector.js';
import { createTooltip, installSlotTips } from './ui/tooltip.js';
import { createAe2Center } from './ui/ae2center.js';
import { h } from './ui/dom.js';

const pick = (v, lang) => (v && typeof v === 'object' && !Array.isArray(v) ? v[lang] ?? v.es ?? Object.values(v)[0] : v);

export function mountDesign(root, M, MODELS, opts = {}) {
  const t = opts.t || (s => s), lang = opts.lang || 'es';
  const view = h('div', { id: 'view' }), inspEl = h('aside', { id: 'inspector', hidden: true });
  const guideEl = h('aside', { id: 'guide', hidden: true }), tipEl = h('div', { id: 'tip', hidden: true }), slotEl = h('div', { id: 'slottip', hidden: true });
  root.classList.add('cm-viewer');
  root.replaceChildren(view, inspEl, guideEl, tipEl, slotEl);
  M.ZONES ??= [{ n: t('Vista general'), p: [16, 16, 32], t: [8, 0, 8] }];

  const viewer = new Viewer(view, { sky: M.SKY || '#0b0d12', preserve: true });
  const tooltip = createTooltip(tipEl);
  installSlotTips(slotEl);
  const listeners = new Set(), emit = (type, data) => { for (const fn of listeners) fn(type, data); };
  const ui = { autowall: true, cut: 0, cutMin: 0, cutMax: 0, marked: null, flow: true, playing: true, speed: 1, labels: true, upgrades: M.PROCESS?.upgrades ?? 0 };
  const sections = { info: infoBlock(M), patterns: null, controls: h('div', { class: 'cm-extra' }), tables: h('div', { class: 'cm-tables' }) };
  const setCut = (v, min, max) => { if (min != null) { ui.cutMin = min; ui.cutMax = max; } ui.cut = v; emit('view', { ...ui }); };
  const panel = { extra: sections.controls, tables: sections.tables, setCut, get cutMax() { return ui.cutMax; }, materials: () => emit('materials') };
  let world, geo, mesher, gui, card, inspector, screens, ae2 = null, flow = null, vw = null, sig = '', solved = null, stats = null;

  const shown = b => !ae2 || ae2.shown(b);
  const parallelOf = n => (n.factory && n.t && M.P[n.t] ? PARALLEL[tierOf(M.P[n.t].id)] ?? null : null);
  const describe = n => {
    const r = n.rate, lines = [pick(n.label, lang) || n.id];
    const bits = [[r.count > 1 && `${r.count} ×`, r.parallel > 1 && `${r.parallel} ${t('proc.')}`].filter(Boolean).join(' '), r.perTick ? `${fmtN(r.perTick * 20)}/s` : `${+r.cycle.toFixed(2)} s`, n.load != null && `${Math.round(n.load * 100)} %`];
    lines.push(bits.filter(Boolean).join(' · '));
    return lines;
  };
  const fmtN = x => (x >= 100 ? Math.round(x).toLocaleString(lang) : (+x.toFixed(x >= 10 ? 1 : 2)).toLocaleString(lang));
  function resolve() {
    solved = solve(M.PROCESS, { parallelOf, upgrades: ui.upgrades });
    flow?.set(solved);
    emit('process', solved);
  }

  function build() {
    world = createWorld(M); geo = createGeometry(M.P, MODELS); mesher = createMesher(world, geo);
    gui = createGui(M.ITEMS || {}, M.PATTERNS || {}); card = createCard(world, gui);
    screens?.dispose?.(); screens = createScreens(viewer.scene, M.SCREENS);
    inspector = createInspector(inspEl, card, () => { viewer.outline('pin', []); emit('select', null); });
    sections.controls.replaceChildren(); sections.tables.replaceChildren();
    ae2 = M.CHANNELS ? createAe2Center({ world, panel, viewer, guideRoot: guideEl, onChange: () => { sig = ''; emit('materials'); } }) : null;
    sections.patterns = patternsList({ M, world, gui, t, onPick: b => select(b, true) });
    if (!ui.cutMax) setCut(world.Y0 + world.NY, world.Y0, world.Y0 + world.NY);
    flow ??= createFlow(viewer.scene, viewer.camera, { describe, labelSize: Math.min(2.6, Math.max(1.3, Math.max(M.WX || M.W || 32, M.WZ || M.W || 32) / 16)) });
    flow.setVisible(ui.flow);
    resolve();
    sig = '';
    emit('materials');
  }

  function camera(z, instant = false) {
    viewer.fly(z.p, z.t, instant);
    if (z.aw != null) ui.autowall = z.aw;
    if (!M.CHANNELS) setCut(z.cut ?? ui.cutMax);
    emit('view', { ...ui });
  }
  build();
  camera(M.ZONES[0], true);
  { // papel de plano bajo el diseño: rejilla de 1 bloque, línea gruesa cada 8
    const W = Math.max(M.WX || M.W || 32, M.WZ || M.W || 32), size = Math.ceil((W + 24) / 8) * 8;
    const grid = new THREE.GridHelper(size, size, '#2d5f8c', '#1d2a36'), minor = new THREE.GridHelper(size, size / 8, '#2f6595', '#2f6595');
    for (const g of [grid, minor]) { g.position.set((M.WX || M.W || 32) / 2, world.Y0 - .002, (M.WZ || M.W || 32) / 2); g.material.transparent = true; g.material.opacity = g === grid ? .55 : .5; viewer.scene.add(g); }
  }

  viewer.hooks.push(now => {
    screens.tick(now); flow?.tick(now);
    const hide = { ...world.wallsHidden(viewer.camera.position, ui.autowall), ...(ae2 ? ae2.hidden() : {}) };
    const cables = !!ae2?.cables, cut = ui.cut, s = JSON.stringify([hide, cut, cables, ae2?.sig()]);
    if (s === sig) return;
    sig = s; vw = mesher.get(s, { hide, cut, cables });
    viewer.setWorld(vw.group);
    screens.setCut(cut);
    stats = { faces: vw.faces, blocks: world.GB.length }; emit('stats', stats);
    if (ui.marked) mark();
  });
  function mark() { viewer.outline('mark', ui.marked ? world.ALL.filter(b => b.t === ui.marked && shown(b) && b.y < ui.cut) : []); }

  function pickAt(e) {
    if (!vw) return null;
    const hit = pickGrid(viewer.ray(e.clientX, e.clientY), world.idx, vw.pick);
    if (!hit) return null;
    const k = key(hit.b.x, hit.b.y, hit.b.z), parts = world.TERMAT.get(k), face = ([dx, dz]) => dx === hit.n[0] && dz === hit.n[2] && !hit.n[1];
    const b = parts?.find(tt => face(STEP[tt.f])) || (hit.b.t === 'cable' && parts?.[0]) || hit.b;
    return { b, key: `${k},${b.t}` };
  }
  const at = c => c && world.AT.get(c.join(','));
  const brief = b => b && { x: b.x, y: b.y, z: b.z, t: b.t, name: M.P[b.t]?.n?.split(' · ')[0], id: M.P[b.t]?.id };
  let lastHover = null;
  function hover(e) {
    const hit = pickAt(e);
    if (hit?.key !== lastHover) { lastHover = hit?.key ?? null; emit('hover', brief(hit?.b)); }
    if (!hit) { tooltip.hide(); viewer.outline('hover', []); viewer.outline('link', []); return; }
    viewer.outline('hover', [hit.b]);
    viewer.outline('link', at(hit.b.target) ? [at(hit.b.target)] : []);
    tooltip.show(e.clientX, e.clientY, hit.key, () => card(hit.b, { compact: true }));
  }
  function select(b, fly = false) {
    inspector.show(b);
    viewer.outline('pin', [b]);
    emit('select', brief(b));
    if (fly) {
      const tg = [b.x + .5, b.y + .5, b.z + .5], d = viewer.camera.position.clone().sub(viewer.controls.target).normalize().multiplyScalar(7);
      viewer.fly([tg[0] + d.x, Math.max(tg[1] + 1.5, tg[1] + d.y), tg[2] + d.z], tg);
    }
  }
  const cv = viewer.canvas;
  let down = null;
  const onLeave = () => { tooltip.hide(); viewer.outline('hover', []); viewer.outline('link', []); if (lastHover) { lastHover = null; emit('hover', null); } };
  cv.addEventListener('pointermove', hover);
  cv.addEventListener('pointerleave', onLeave);
  cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; tooltip.hide(); });
  cv.addEventListener('pointerup', e => {
    const still = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5;
    if (still && e.button === 0) { const hit = pickAt(e); if (hit) select(hit.b); else inspector.close(); }
    // clic derecho sin arrastrar: menú del bloque (arrastrando, el botón derecho sigue moviendo la cámara)
    if (still && e.button === 2) { const hit = pickAt(e); emit('context', { x: e.clientX, y: e.clientY, block: hit && brief(hit.b), ref: hit?.b || null }); }
    down = null;
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());

  return {
    viewer, get world() { return world; }, rebuild: build, sections,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get state() { return { ...ui }; },
    get stats() { return stats; },
    zones: M.ZONES, camera,
    setCut: v => setCut(+v),
    setAutowall(v) { ui.autowall = !!v; emit('view', { ...ui }); },
    materials() {
      const counts = {};
      for (const b of world.ALL) { if (!shown(b)) continue; const k = b.t + (b.cable ? '|f' : ''); counts[k] = (counts[k] || 0) + 1; }
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => { const [tt, f] = k.split('|'); return { t: tt, n, facade: !!f, name: M.P[tt].n, id: M.P[tt].id }; });
    },
    mark(tt) { ui.marked = ui.marked === tt ? null : tt; mark(); emit('view', { ...ui }); },
    families() {
      return Object.entries(families(M.P)).map(([k, f]) => ({ key: k, label: f.label, tier: f.tier, options: f.options, types: f.types, count: M.BLOCKS.filter(b => f.types.includes(b.t)).length, parallel: PARALLEL[f.tier] }));
    },
    async setTier(fk, to) {
      const f = families(M.P)[fk];
      if (!f || f.tier === to) return;
      const before = PARALLEL[f.tier];
      applyTier(M.P, f, to);
      const refs = [...new Set(f.types.map(tt => [].concat(M.P[tt].model).join('+')).filter(r => r && !MODELS[r]))];
      if (refs.length && opts.loadModels) Object.assign(MODELS, await opts.loadModels(refs));
      build();
      opts.onChange?.(M, { family: fk, from: before, to: PARALLEL[to] });
    },
    get process() { return solved; },
    maxUpgrades: MAX_UPGRADES,
    setUpgrades(n) { ui.upgrades = Math.max(0, Math.min(MAX_UPGRADES, n | 0)); resolve(); emit('view', { ...ui }); },
    setFlow(v) { ui.flow = !!v; flow.setVisible(ui.flow); emit('view', { ...ui }); },
    setPlaying(v) { ui.playing = !!v; flow.setPlaying(ui.playing); emit('view', { ...ui }); },
    setSpeed(v) { ui.speed = v; flow.setSpeed(v); emit('view', { ...ui }); },
    setLabels(v) { ui.labels = !!v; flow.setLabels(ui.labels); emit('view', { ...ui }); },
    select: b => select(b, false),
    focus: b => select(b, true),
    focusNode(id) {
      const n = solved?.nodes.find(x => x.id === id), p = n && [].concat(Array.isArray(n.at?.[0]) ? n.at : n.at ? [n.at] : [])[0];
      if (p) viewer.fly([p[0] + 5, p[1] + 4, p[2] + 6], [p[0] + .5, p[1] + .5, p[2] + .5]);
    },
    screenshot: () => viewer.canvas.toDataURL('image/png'),
    destroy() { listeners.clear(); flow?.dispose(); viewer.dispose(); root.replaceChildren(); root.classList.remove('cm-viewer'); },
  };
}
export { tierOf };
