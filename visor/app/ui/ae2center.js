// Extras del Centro AE2 (diseños que exportan CHANNELS): carcasa del cuántico, modo cables, luces y cristal del pozo,
// tablas de canales y la guía del pozo capa a capa.
import { h, fmt } from './dom.js';
import { tex } from '../engine/textures.js';

const SW = { magenta: '#c74ebd', orange: '#f9801d', light_blue: '#3ab3da', lime: '#80c71f', yellow: '#fed83d', pink: '#f38baa', cyan: '#169c9c', purple: '#8932b8', blue: '#3c44aa' };
const ARROW = { e: [1, 0], w: [-1, 0], s: [0, 1], n: [0, -1] };

export function createAe2Center({ world, panel, viewer, guideRoot, onChange }) {
  const { M, P, BLOCKS, CHANNELS, ALL } = world, PIT = M.PIT, PIT_GLASS = M.PIT_GLASS ?? [];
  const shell = h('input', { type: 'checkbox' }), cables = h('input', { type: 'checkbox' });
  const plight = h('select', {}, [['end', 'End Rods'], ['bar', 'Barra luminosa'], ['bar2', 'Barra luminosa ×2 (más larga)']].map(([v, n]) => h('option', { value: v }, n)));
  const pglass = h('select', {}, h('option', { value: 'none' }, 'Sin capas'), PIT_GLASS.map(t => h('option', { value: t }, P[t].n)));
  if (PIT_GLASS.length) pglass.value = PIT_GLASS[0];
  const lightHidden = () => { const v = plight.value; return { L_end: v !== 'end', L_bar: v === 'end', L_bar2: v !== 'bar2' }; };
  const shown = b => !(b.tag === 'pitglass' && pglass.value === 'none') && !lightHidden()[b.tag];
  pglass.onchange = () => { const t = pglass.value; if (t !== 'none') for (const b of BLOCKS) if (b.tag === 'pitglass') b.t = t; onChange(); };
  plight.onchange = () => { onChange(); if (!guideRoot.hidden) drawLayer(+gy.value); };
  shell.onchange = cables.onchange = onChange;
  panel.extra.append(
    h('label', {}, shell, 'Ver interior del ordenador cuántico'),
    h('label', {}, cables, 'Ver rutas de cable (cian)'),
    h('label', {}, 'Luces del pozo', plight),
    h('label', {}, 'Cristal del pozo', pglass));

  // tablas de canales, al final del panel
  const zones = Object.values(CHANNELS.zones);
  panel.extra.closest('section').after(h('section', {},
    h('h2', {}, 'Canales y túneles P2P'),
    h('p', { class: 'hint' }, 'Activa "Ver rutas de cable": cada color = un cable denso que sale del controlador y lleva sus salidas P2P (cian); blanco = cable de cada zona hacia sus máquinas.'),
    h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('td', {}, 'Zona'), h('td', {}, 'Canales'), h('td', {}, 'P2P'))),
      h('tbody', {}, zones.map(z => h('tr', {}, h('td', {}, z.n), h('td', {}, z.ch), h('td', {}, z.outs))),
        h('tr', {}, h('td', {}, h('b', {}, 'Total')), h('td', {}, zones.reduce((s, z) => s + z.ch, 0)), h('td', {}, CHANNELS.nOut)))),
    h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('td', {}, 'Cable denso del controlador'), h('td', {}, 'P2P'))),
      h('tbody', {}, CHANNELS.carriers.map(c => h('tr', {}, h('td', {}, h('i', { class: 'swatch', style: `background:${SW[c.col]}` }), c.zones.join(' + ') || 'Reserva'), h('td', {}, `${c.outs}/32`))))),
    h('p', { class: 'hint' }, `${CHANNELS.carriers.length} cables densos salen de las caras inferiores del controlador (hasta ${CHANNELS.carriers.length * 32} salidas P2P). Los ${CHANNELS.wireless} Wireless Connectors tocan el controlador (9 encima + 12 en la fila superior de los lados; 32 canales cada uno) y traen las entradas de los ${CHANNELS.nOut} túneles desde el cubo grande: 1 entrada por salida. Quedan ${CHANNELS.sideFaces} caras laterales libres. La subred recibe energía por 1 Quartz Fiber (banco oeste, L2). Comprobado con verificar_red.mjs (reglas de AE2 19.2.17).`),
    h('h2', {}, 'Construcción'),
    h('button', { onclick: () => { guideRoot.hidden = false; drawLayer(+gy.value); } }, 'Guía del pozo capa a capa')));

  // ── guía del pozo ──
  const pit = ALL.filter(b => b.pit);
  const nAt = (t, y) => pit.filter(b => b.t === t && (y === undefined || b.y === y)).length;
  const fixLayers = [...new Set(pit.filter(b => b.t === 'fix').map(b => b.y))].sort((a, b) => b - a), D = PIT?.depth;
  const gmap = h('canvas', { width: 380, height: 380, class: 'gmap' }), gmat = h('table', { class: 'tbl' }), gyv = h('span', {});
  const gy = h('input', { type: 'range', min: -25, max: 0, value: 0, oninput: () => drawLayer(+gy.value) });
  guideRoot.replaceChildren(
    h('button', { class: 'close', onclick: () => { guideRoot.hidden = true; panel.setCut(panel.cutMax); viewer.fly(M.ZONES[0].p, M.ZONES[0].t); } }, '×'),
    h('h1', {}, 'Guía del pozo'),
    h('p', { class: 'sub' }, 'Coordenadas relativas a tu ascensor central (0, 0). Capa 0 = nivel del suelo de la sala.'),
    h('ol', {}, [
      `<b>Marca el centro.</b> Ponte encima del ascensor central y apunta X/Z con F3: ese es el (0, 0) del mapa.`,
      `<b>Excava el cilindro.</b> Disco de radio 7,5 (${nAt('bconc')} bloques por capa) desde la capa -1 hasta la -${D + 1}. Mining Gadgets o FTB Ultimine lo hacen en minutos. No toques el ascensor.`,
      `<b>Fondo (capa -${D + 1}).</b> ${nAt('bconc')} de hormigón negro en todo el disco.`,
      `<b>Columna central.</b> En (0, 0), de -${D} a -1: pizarra profunda pulida, con Illuminant blanco cada 4 capas (-4, -8…). Súbela desde el fondo: te sirve de andamio.`,
      `<b>Pared.</b> El anillo que rodea el disco (${nAt('skysm', -1)} bloques por capa), de -1 a -${D}: ladrillo pequeño de piedra del cielo; en las capas -6, -12, -18 y -24 ladrillo de piedra del cielo. Con el Exchanger de Building Gadgets 2 cambias la piedra que ya hay sin cavar.`,
      `<b>Luces (${nAt('fix')} posiciones).</b> En las capas ${fixLayers.join(', ')}, en las casillas marcadas con flecha. End Rod: colócala apuntando a la pared y sale en horizontal hacia el centro. Barra luminosa: va en el eje que apunta al centro (pon el bloque mirando a la pared); con "×2" pon otra igual justo delante. Vuela con un Iron Jetpack y hazlo de abajo arriba.`,
      `<b>Capas de cristal.</b> En las capas -3, -6, -9 … -24, un disco completo de cristal (el de "Cristal del pozo"), sin tapar la columna central. Cada capa vela un poco más lo que hay debajo: el fondo se difumina y parece no acabar. Ponlas de abajo arriba a la vez que las End Rods.`,
      `<b>Tapa (capa 0).</b> ${nAt('qglass', 0)} de cristal de cuarzo de AE2 sobre el disco, dejando el ascensor en (0, 0), y ${nAt('skyb', 0)} de ladrillo de piedra del cielo en el borde.`,
    ].map(s => h('li', { html: s }))),
    h('h2', {}, 'Mapa de la capa ', gyv, ' · norte arriba'), gy, gmap, gmat);

  function drawLayer(y) {
    const R = 9, cs = 18, off = 19, g = gmap.getContext('2d'), counts = {};
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#07080b'; g.fillRect(0, 0, 380, 380);
    for (const b of pit) {
      if (b.y !== y || !shown(b)) continue;
      const px = off + (b.x - PIT.cx + R) * cs, py = off + (b.z - PIT.cz + R) * cs, s = P[b.t];
      counts[b.t] = (counts[b.t] || 0) + 1;
      if (b.t === 'fix' || b.t === 'bar') { // flecha: sale de la pared hacia el centro
        const [ax, az] = ARROW[b.f], cx = px + cs / 2, cy = py + cs / 2;
        g.strokeStyle = '#e8eeff'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(cx - ax * cs / 2, cy - az * cs / 2); g.lineTo(cx + ax * cs / 4, cy + az * cs / 4); g.stroke();
        continue;
      }
      const img = tex(s.top || s.all || s.side, s.bg).image;
      g.fillStyle = '#3a4150'; g.fillRect(px, py, cs, cs);
      if (img?.width) g.drawImage(img, 0, 0, img.width, img.width, px, py, cs, cs);
      g.strokeStyle = 'rgba(232,240,255,.35)'; g.lineWidth = 1; g.strokeRect(px + .5, py + .5, cs - 1, cs - 1);
    }
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
    for (let i = 0; i <= 2 * R + 1; i++) {
      g.beginPath(); g.moveTo(off + i * cs, off); g.lineTo(off + i * cs, off + (2 * R + 1) * cs); g.stroke();
      g.beginPath(); g.moveTo(off, off + i * cs); g.lineTo(off + (2 * R + 1) * cs, off + i * cs); g.stroke();
    }
    g.fillStyle = '#8a93a6'; g.font = '10px system-ui'; g.textAlign = 'center';
    for (let i = -R; i <= R; i += 3) { g.fillText(i, off + (i + R + .5) * cs, 12); g.fillText(i, 9, off + (i + R + .5) * cs + 3); }
    g.strokeStyle = '#ff5b5b'; g.strokeRect(off + R * cs + .5, off + R * cs + .5, cs - 1, cs - 1); // (0,0)
    gyv.textContent = y;
    gmat.replaceChildren(...(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, n]) => h('tr', {}, h('td', {}, P[t].n), h('td', {}, fmt(n))))));
    if (!Object.keys(counts).length) gmat.append(h('tr', {}, h('td', {}, 'Capa de aire (solo pared)')));
    panel.setCut(y + 1);
    viewer.fly([PIT.cx + .5, y + 24, PIT.cz + 6], [PIT.cx + .5, y, PIT.cz + .5], true);
  }

  return {
    shown,
    hidden: () => ({ shell: shell.checked, pitglass: pglass.value === 'none', ...lightHidden() }),
    get cables() { return cables.checked; },
    sig: () => [shell.checked, cables.checked, pglass.value, plight.value].join(),
  };
}
