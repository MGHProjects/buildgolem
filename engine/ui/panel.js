// Piezas del diseño que la interfaz coloca donde quiera: la explicación (INFO) y los patrones agrupados por proveedor.
import { h } from './dom.js';

export const infoBlock = M => (M.INFO ? h('div', { class: 'cm-info', html: M.INFO }) : null);

// patrones por Pattern Provider: clic = volar hasta él y abrir su ficha
export function patternsList({ M, world, gui, onPick, t = s => s }) {
  const { P } = world, providers = world.ALL.filter(b => b.patterns);
  if (!providers.length) return null;
  return h('div', { class: 'provs' }, providers.map(b => {
    const target = b.target && world.AT.get(b.target.join(','));
    return h('button', { class: 'prov', type: 'button', onclick: () => onPick(b) },
      h('span', { class: 'prov-name' }, target ? P[target.t].n.split(' · ')[0] : 'Pattern Provider', h('small', {}, `${t('proveedor en')} x${b.x} y${b.y} z${b.z}`)),
      h('span', { class: 'prov-pats' }, b.patterns.map(id => gui.slot(M.PATTERNS[id].out[0]))));
  }));
}
