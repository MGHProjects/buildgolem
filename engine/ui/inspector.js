// Ficha de un bloque: lo que es, dónde está y, si el diseño lo trae, su ventana de AE2 (proveedor con sus patrones, máquina).
// La usan el panel derecho (clic: se fija) y la etiqueta que sigue al ratón (versión compacta).
import { h } from './dom.js';

export function createCard(world, gui) {
  const { P, AT } = world;
  const at = ([x, y, z]) => AT.get(`${x},${y},${z}`);
  const nameOf = b => P[b.t].n.split(' · ')[0];
  return function card(b, { compact = false, extra } = {}) {
    const s = P[b.t], target = b.target && at(b.target);
    const parts = [
      h('div', { class: 'card-head' }, h('b', {}, nameOf(b)), h('small', {}, `${s.id} · x${b.x} y${b.y} z${b.z}`)),
      extra && h('p', { class: 'card-note', html: extra }),
      s.n.includes(' · ') && h('p', { class: 'card-note' }, s.n.split(' · ').slice(1).join(' · ')),
    ];
    if (b.patterns) {
      const machine = target ? nameOf(target) : 'su máquina';
      parts.push(gui.provider(b, machine));
      parts.push(h('div', { class: 'card-sub' }, b.patterns.length === 1 ? 'El patrón que va aquí' : `Los ${b.patterns.length} patrones que van aquí`));
      for (const id of b.patterns) {
        parts.push(gui.pattern(id, { compact }));
        if (!compact) parts.push(gui.steps(id, 'este Pattern Provider'));
      }
      if (compact) parts.push(h('p', { class: 'card-hint' }, 'Clic para fijar la ficha con los pasos.'));
    }
    if (b.gui) parts.push(gui.machine(b.gui));                      // máquina o parte: sus huecos, mejoras y ajustes
    return h('div', { class: 'card' }, parts);
  };
}

export function createInspector(root, card, onClose) {
  let current = null;
  const close = () => { root.hidden = true; current = null; onClose?.(); };
  addEventListener('keydown', e => { if (e.key === 'Escape' && current) close(); });
  return {
    show(b) {
      current = b;
      root.replaceChildren(h('button', { class: 'close', onclick: close, title: 'Cerrar (Esc)' }, '×'), card(b));
      root.hidden = false; root.scrollTop = 0;
    },
    close, get current() { return current; },
  };
}
