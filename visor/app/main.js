// Arranque: carga el diseño (?d=granja, ?d=p2p, ?d=mekanism; sin parámetro, el Centro AE2), monta el motor y la interfaz, y une el ratón con ambos.
import { createWorld, key, STEP } from './engine/world.js';
import { createGeometry } from './engine/geometry.js';
import { createMesher } from './engine/mesher.js';
import { Viewer, pickGrid } from './engine/viewer.js';
import { createScreens } from './engine/screens.js';
import { createGui } from './ui/ae2gui.js';
import { createPanel } from './ui/panel.js';
import { createCard, createInspector } from './ui/inspector.js';
import { createTooltip, installSlotTips } from './ui/tooltip.js';
import { createAe2Center } from './ui/ae2center.js';
import { $, h, fmt } from './ui/dom.js';

const DESIGNS = [['diseno', 'Centro AE2'], ['granja', 'Granja de hierro'], ['p2p', 'Red P2P'], ['mekanism', 'Sala Mekanism']];
const q = new URLSearchParams(location.search).get('d'), design = DESIGNS.find(([id]) => id === q)?.[0] || 'diseno';
const [M, MODELS] = await Promise.all([import(`../${design}.js`), fetch('modelos.json', { cache: 'no-cache' }).then(r => r.json())]); // no-cache: tras extraer, nada de copias viejas
document.title = M.TITLE || 'Centro AE2';

const world = createWorld(M), geo = createGeometry(M.P, MODELS), mesher = createMesher(world, geo);
const viewer = new Viewer($('view'), { sky: M.SKY });
const gui = createGui(M.ITEMS, M.PATTERNS), card = createCard(world, gui);
const screens = createScreens(viewer.scene, M.SCREENS); // pantallas de CC con lo que dibujan sus programas (datos de ejemplo)
const tooltip = createTooltip($('tip'));
installSlotTips($('slottip'));

let ae2 = null, marked = null, view = null, sig = '';
const shown = b => !ae2 || ae2.shown(b);
const panel = createPanel($('panel'), {
  M, world, gui, designs: DESIGNS, design,
  onCamera: z => camera(z), onPick: b => select(b, true), onMark: t => { marked = t; mark(); },
});
const inspector = createInspector($('inspector'), card, () => viewer.outline('pin', []));
if (M.CHANNELS) ae2 = createAe2Center({ world, panel, viewer, guideRoot: $('guide'), onChange: () => panel.materials(shown) });
panel.setCut(world.Y0 + world.NY, world.Y0, world.Y0 + world.NY);
panel.materials(shown);

function camera(z, instant = false) {
  viewer.fly(z.p, z.t, instant);
  if (z.aw != null) panel.autowall = z.aw;
  if (!M.CHANNELS) panel.setCut(z.cut ?? panel.cutMax);
}
camera(M.ZONES[0], true);

// la malla se rehace (o sale de la caché) solo cuando cambia lo que se ve: paredes ocultas, corte, modo cables, cristal, luces
viewer.hooks.push(now => {
  screens.tick(now);
  const hide = { ...world.wallsHidden(viewer.camera.position, panel.autowall), ...(ae2 ? ae2.hidden() : {}) };
  const cables = !!ae2?.cables, cut = panel.cut, s = JSON.stringify([hide, cut, cables, ae2?.sig()]);
  if (s === sig) return;
  sig = s; view = mesher.get(s, { hide, cut, cables });
  viewer.setWorld(view.group);
  screens.setCut(cut);
  panel.stats(`Motor: ${fmt(view.faces)} caras · ${view.hit ? 'vista en caché' : `malla en ${view.ms.toFixed(0)} ms`} · caché ${mesher.cached}/${mesher.MAX} · ${fmt(world.GB.length)} bloques`);
  if (marked) mark();
});

function mark() {
  viewer.outline('mark', marked ? world.ALL.filter(b => b.t === marked && shown(b) && b.y < panel.cut) : []);
}

// qué hay bajo el ratón: el bloque, o la parte de su cable (terminal, bus) si la cara coincide, o la pieza P2P en modo cables
function pickAt(e) {
  if (!view) return null;
  const hit = pickGrid(viewer.ray(e.clientX, e.clientY), world.idx, view.pick);
  if (!hit) return null;
  const k = key(hit.b.x, hit.b.y, hit.b.z), parts = world.TERMAT.get(k), face = ([dx, dz]) => dx === hit.n[0] && dz === hit.n[2] && !hit.n[1];
  if (ae2?.cables) {
    const ps = world.P2PAT.get(k), p = ps && (ps.find(q => q.d.join() === hit.n.join()) || ps[0]);
    const fb = world.FIBER.find(f => key(f.x, f.y, f.z) === k);
    if (fb) return { b: hit.b, key: 'fiber' + k, html: `<b>Quartz Fiber</b><small>pasa energía de la red principal a la subred del controlador (sin canales) · x${fb.x} y${fb.y} z${fb.z}</small>` };
    if (p) return { b: hit.b, key: 'p2p' + k + p.d, html: p.io === 'in' ? `<b>ME P2P Tunnel · ENTRADA</b><small>pegada al controlador · x${p.x} y${p.y} z${p.z}</small>`
      : `<b>ME P2P Tunnel · SALIDA (32 canales)</b><small>${world.CHANNELS.zones[p.zone].n} · en el cable ${p.col} · x${p.x} y${p.y} z${p.z}</small>` };
  }
  const b = parts?.find(t => face(STEP[t.f])) || (hit.b.t === 'cable' && parts?.[0]) || hit.b;
  const extra = b.cable ? (b.cable === 'c' ? `Cable denso ${b.col} (lleva P2P), forrado con esta fachada.` : 'Cable denso blanco (zona), forrado con esta fachada.') : null;
  return { b, extra, key: `${k},${b.t}` };
}

const at = c => c && world.AT.get(c.join(','));
function hover(e) {
  const hit = pickAt(e);
  if (!hit) { tooltip.hide(); viewer.outline('hover', []); viewer.outline('link', []); return; }
  viewer.outline('hover', [hit.b]);
  viewer.outline('link', at(hit.b.target) ? [at(hit.b.target)] : []);
  tooltip.show(e.clientX, e.clientY, hit.key, () => (hit.html ? h('div', { class: 'card', html: hit.html }) : card(hit.b, { compact: true, extra: hit.extra })));
}
function select(b, fly = false) {
  inspector.show(b);
  viewer.outline('pin', [b]);
  if (fly) { // acerca la cámara al bloque manteniendo la dirección de la vista
    const t = [b.x + .5, b.y + .5, b.z + .5], d = viewer.camera.position.clone().sub(viewer.controls.target).normalize().multiplyScalar(7);
    viewer.fly([t[0] + d.x, Math.max(t[1] + 1.5, t[1] + d.y), t[2] + d.z], t);
  }
}
const cv = viewer.canvas;
let down = null;
cv.addEventListener('pointermove', hover);
cv.addEventListener('pointerleave', () => { tooltip.hide(); viewer.outline('hover', []); viewer.outline('link', []); });
cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; tooltip.hide(); });
cv.addEventListener('pointerup', e => { // clic sin arrastrar: fija la ficha del bloque
  if (down && e.button === 0 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) { const hit = pickAt(e); if (hit && !hit.html) select(hit.b); else inspector.close(); }
  down = null;
});
window.__v = { viewer, world, mesher, camera: viewer.camera, controls: viewer.controls, frame: viewer.frame }; // para depurar desde la consola
