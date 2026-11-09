// Ventanas con el aspecto de las interfaces de AE2 (gris Minecraft, huecos hundidos, iconos de objeto reales):
// Pattern Encoding Terminal (patrón de crafteo o de procesado), Pattern Provider (sus 9 huecos) y máquinas (huecos y ajustes).
// Datos del diseño: ITEMS { id: { n, icon, tint?, fluid? } } · PATTERNS { id: { name, kind, grid | in, out } }
import { h, fmt } from './dom.js';
import { icon } from '../engine/textures.js';

const ARROW = '<svg viewBox="0 0 22 15" width="44" height="30"><path d="M0 5h13V0l9 7.5-9 7.5v-5H0z" fill="#8b8b8b"/></svg>';
const PATTERN_ICON = { crafting: 'ae2:item/crafting_pattern', processing: 'ae2:item/processing_pattern' };

export function createGui(ITEMS = {}, PATTERNS = {}) {
  const item = id => ITEMS[id] || { n: id };
  const img = (keys, tint, cls) => { const i = h('img', { alt: '', class: cls }); icon(keys, tint).then(u => { if (u) i.src = u; }); return i; };
  const amount = (it, n) => (it.fluid ? (n >= 1000 ? `${n / 1000}B` : `${n}mB`) : n > 1 ? String(n) : '');

  // hueco con objeto: entry = [id, cantidad] o null; big = hueco de resultado
  function slot(entry, { big = false, label } = {}) {
    const s = h('span', { class: 'mc-slot' + (big ? ' big' : '') });
    if (label) s.dataset.label = label;
    if (!entry) return s;
    const [id, n = 1] = entry, it = item(id);
    s.append(img(it.icon, it.tint));
    const a = amount(it, n);
    if (a) s.append(h('b', {}, a));
    s.dataset.tip = it.n + (it.fluid ? ` · ${fmt(n)} mB` : n > 1 ? ` × ${n}` : '');
    return s;
  }
  const pad = (list, k) => [...list, ...Array(Math.max(0, k - list.length)).fill(null)];

  // patrón como en la Pattern Encoding Terminal: pestaña Crafteo/Procesado, rejilla de entradas → salida(s)
  function pattern(id, { compact = false } = {}) {
    const p = PATTERNS[id], craft = p.kind === 'crafting';
    return h('div', { class: 'mc-win mc-pattern' + (compact ? ' compact' : '') },
      h('div', { class: 'mc-head' }, img(PATTERN_ICON[p.kind], null, 'mc-ico'), h('span', { class: 'mc-name' }, p.name)),
      h('div', { class: 'mc-tabs' }, h('span', { class: craft ? 'on' : '' }, 'Crafteo'), h('span', { class: craft ? '' : 'on' }, 'Procesado')),
      h('div', { class: 'mc-row' },
        h('div', { class: 'mc-grid' }, pad(craft ? p.grid : p.in, 9).slice(0, 9).map(e => slot(e))),
        h('span', { class: 'mc-arrow', html: ARROW }),
        craft ? slot(p.out[0], { big: true }) : h('div', { class: 'mc-col' }, pad(p.out, 3).map(e => slot(e)))));
  }

  // cómo se codifica y dónde se pone, paso a paso
  function steps(id, providerName) {
    const p = PATTERNS[id], craft = p.kind === 'crafting';
    const list = craft
      ? ['Abre la <b>ME Pattern Encoding Terminal</b> y elige la pestaña <b>Crafteo</b>.',
        'Pon los objetos en la rejilla 3 × 3 exactamente como en el dibujo (con JEI: clic en el <b>+</b> de la receta y se rellena sola).',
        'Mete un <b>Blank Pattern</b> en su hueco y pulsa <b>Codificar</b> (la flecha).',
        `Clic derecho a ${providerName} y deja el patrón codificado en cualquiera de sus 9 huecos.`]
      : ['Abre la <b>ME Pattern Encoding Terminal</b> y elige la pestaña <b>Procesado</b>.',
        'Pon las entradas a la izquierda y la salida a la derecha (con JEI: el <b>+</b> de la receta). Para cambiar una cantidad, clic derecho en el hueco y escríbela' + (p.in.some(([i]) => item(i).fluid) ? '. El agua: clic en el hueco con un cubo de agua (entra 1.000 mB) y luego clic derecho para dejarla en 100.' : '.'),
        'Mete un <b>Blank Pattern</b> y pulsa <b>Codificar</b>.',
        `Clic derecho a ${providerName} y deja el patrón codificado en cualquiera de sus 9 huecos.`];
    return h('ol', { class: 'steps' }, list.map(s => h('li', { html: s })));
  }

  // Pattern Provider: sus 9 huecos con los patrones que lleva (se ve el objeto que fabrica, como con Mayús en AE2)
  function provider(b, machineName) {
    const pats = b.patterns || [];
    return h('div', { class: 'mc-win mc-provider' },
      h('div', { class: 'mc-head' }, h('span', { class: 'mc-name' }, 'Pattern Provider')),
      h('div', { class: 'mc-sub' }, 'Patrones'),
      h('div', { class: 'mc-line' }, pad(pats, 9).map(id => {
        if (!id) return slot(null);
        const p = PATTERNS[id], s = slot(p.out[0]);
        s.classList.add('encoded'); s.append(img(PATTERN_ICON[p.kind], null, 'mc-badge'));
        s.dataset.tip = `Patrón codificado: ${p.name}`;
        return s;
      })),
      h('div', { class: 'mc-chips' },
        h('span', { class: 'mc-chip' }, `Empuja hacia ${b.push}: ${machineName}`),
        h('span', { class: 'mc-chip' + (b.blocking ? ' on' : '') }, b.blocking ? 'Blocking Mode: Sí' : 'Blocking Mode: No')));
  }

  // máquina o parte: huecos con su nombre, ajustes y tarjetas de mejora
  function machine(g) {
    return h('div', { class: 'mc-win mc-machine' },
      h('div', { class: 'mc-head' }, h('span', { class: 'mc-name' }, g.title)),
      g.slots?.length && h('div', { class: 'mc-slots' }, g.slots.map(s => h('label', { class: 'mc-lab' }, slot(s.item), h('span', {}, s.label, s.hint && h('small', {}, s.hint))))),
      g.cards?.length && h('div', { class: 'mc-cards' }, h('span', { class: 'mc-sub' }, 'Mejoras'), h('div', { class: 'mc-line' }, g.cards.map(c => slot(c)))),
      g.settings?.length && h('ul', { class: 'mc-set' }, g.settings.map(s => h('li', { html: s }))));
  }
  return { slot, pattern, steps, provider, machine, item };
}
