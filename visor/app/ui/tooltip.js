// Etiqueta que sigue al ratón: en el 3D (ficha compacta del bloque) y sobre los huecos de objeto de las ventanas AE2 (nombre).
import { h } from './dom.js';

export function createTooltip(root) {
  let key = null;
  const place = (x, y) => {
    const r = root.getBoundingClientRect(), pad = 14;
    let left = x + pad, top = y + pad;
    if (left + r.width > innerWidth - 8) left = x - r.width - pad;
    if (top + r.height > innerHeight - 8) top = Math.max(8, innerHeight - r.height - 8);
    Object.assign(root.style, { left: left + 'px', top: top + 'px' });
  };
  return {
    // k: identifica el contenido (si no cambia, solo se mueve) · make(): crea el contenido
    show(x, y, k, make) {
      if (k !== key) { key = k; root.replaceChildren(make()); }
      root.hidden = false; place(x, y);
    },
    hide() { root.hidden = true; key = null; },
  };
}

// nombre del objeto al pasar por un hueco de las ventanas AE2 (data-tip), con el estilo de Minecraft
export function installSlotTips(tipRoot) {
  addEventListener('pointerover', e => {
    const s = e.target.closest?.('[data-tip]');
    if (!s) { tipRoot.hidden = true; return; }
    tipRoot.replaceChildren(h('span', {}, s.dataset.tip));
    tipRoot.hidden = false;
  });
  addEventListener('pointermove', e => {
    if (tipRoot.hidden) return;
    Object.assign(tipRoot.style, { left: e.clientX + 12 + 'px', top: e.clientY - 28 + 'px' });
  });
}
