// Panel izquierdo: diseños, explicación, patrones (dónde va cada uno), cámaras, vista, materiales y estado del motor.
import { h, fmt } from './dom.js';

export function createPanel(root, { M, world, gui, designs, design, onCamera, onPick, onMark }) {
  const { P } = world;
  const sec = (title, ...kids) => h('section', {}, h('h2', {}, title), ...kids);
  const nav = h('nav', {}, designs.map(([id, name]) => h('a', { href: id === 'diseno' ? './' : `?d=${id}`, class: id === design ? 'on' : '' }, name)));

  // patrones agrupados por su Pattern Provider: clic = volar hasta él y abrir su ficha
  const providers = world.ALL.filter(b => b.patterns);
  const patSec = providers.length ? sec('Patrones · dónde va cada uno',
    h('p', { class: 'hint' }, 'Cada patrón se codifica en la Pattern Encoding Terminal y se mete en el Pattern Provider de su máquina. Pasa el ratón por un proveedor en el 3D o elige uno aquí.'),
    h('div', { class: 'provs' }, providers.map(b => {
      const target = b.target && world.AT.get(b.target.join(','));
      return h('button', { class: 'prov', onclick: () => onPick(b) },
        h('span', { class: 'prov-name' }, target ? P[target.t].n.split(' · ')[0] : 'Pattern Provider', h('small', {}, `proveedor en x${b.x} y${b.y} z${b.z}`)),
        h('span', { class: 'prov-pats' }, b.patterns.map(id => gui.slot(M.PATTERNS[id].out[0]))));
    }))) : null;

  const autowall = h('input', { type: 'checkbox', checked: true });
  const cut = h('input', { type: 'range' }), cutv = h('span', { class: 'num' });
  cut.oninput = () => { cutv.textContent = cut.value; };
  const extra = h('div', {});                                   // controles propios del diseño (Centro AE2)
  const mats = h('table', { class: 'tbl mats' });
  const stats = h('p', { class: 'hint stats' });
  const camBtns = h('div', { class: 'cams' }, M.ZONES.map(z => h('button', { onclick: () => onCamera(z) }, z.n)));

  root.replaceChildren(...[
    nav,
    h('h1', {}, M.TITLE || 'Centro AE2 · ATM10 Aeronautics'),
    h('p', { class: 'sub' }, M.SUB || '43 × 43 × 39 · texturas reales de tu instancia'),
    M.INFO && h('details', { class: 'info', open: true }, h('summary', {}, 'Cómo funciona y cómo montarlo'), h('div', { html: M.INFO })),
    patSec,
    sec('Cámaras', camBtns),
    sec('Vista',
      h('label', {}, autowall, 'Ocultar paredes hacia la cámara'),
      extra,
      h('label', {}, 'Corte Y', cut, cutv),
      h('p', { class: 'hint' }, 'Arrastra para girar · rueda para zoom · clic derecho para mover. Pasa el ratón por un bloque para ver qué es; clic para fijar su ficha.')),
    sec('Lista de materiales', h('p', { class: 'hint' }, 'Clic en una fila para resaltar esos bloques.'), mats),
    stats].filter(Boolean));

  let marked = null;
  function materials(shown) {
    const counts = {};
    for (const b of world.ALL) { if (!shown(b)) continue; const k = b.t + (b.cable ? '|f' : ''); counts[k] = (counts[k] || 0) + 1; }
    mats.replaceChildren(...Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => {
      const [t, f] = k.split('|');
      const row = h('tr', { class: t === marked ? 'on' : '', title: P[t].id, onclick: () => { marked = marked === t ? null : t; onMark(marked); materials(shown); } },
        h('td', {}, (f ? 'Fachada: ' : '') + P[t].n), h('td', {}, fmt(n)));
      return row;
    }));
  }
  return {
    extra, materials,
    get autowall() { return autowall.checked; }, set autowall(v) { autowall.checked = v; },
    get cut() { return +cut.value; },
    setCut(v, min, max) { if (min != null) { cut.min = min; cut.max = max; } cut.value = v; cutv.textContent = v; },
    get cutMax() { return +cut.max; },
    stats(s) { stats.textContent = s; },
  };
}
