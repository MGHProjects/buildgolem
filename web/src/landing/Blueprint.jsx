// Lámina de plano del Centro AE2, dibujada con los datos reales del diseño (scripts/blueprint.mjs):
// planta a la altura de las máquinas o alzado del pozo al controlador, con cotas y llamadas.
// Los trazos llevan pathLength=1 para que GSAP los dibuje con strokeDashoffset.
import { useI18n } from '../i18n.jsx';
import data from './centro-ae2.json';

export { data };
const STYLE = {
  struct: { fill: 'var(--ink)', fo: .07, sw: .09, so: .55 },
  glass: { fill: 'var(--ink)', fo: .03, sw: .07, so: .5, dash: '.4 .3' },
  cable: { fill: 'var(--accent-ink)', fo: .35, sw: .06, so: .8 },
  ae2: { fill: 'var(--ink)', fo: .2, sw: .14, so: 1 },
  mek: { fill: 'var(--accent)', fo: .85, sw: .14, so: 1, stroke: 'var(--accent-ink)' },
};
const ORDER = ['struct', 'glass', 'cable', 'ae2', 'mek'];
// línea de llamada en ángulo recto: si el punto queda en la mitad izquierda, sale por arriba o por abajo del marco y rodea el dibujo
function leader(c, W, H) {
  const [x, y] = c.at;
  if (x > W * .6) return `M${x} ${y}H${W + 1.5}V${c.ly}H${c.lx - .6}`;
  const e = y < H / 2 ? -1.4 : H + 1.4;
  return `M${x} ${y}V${e}H${W + 1.5}V${c.ly}H${c.lx - .6}`;
}

// coloca las etiquetas en el margen derecho sin que se pisen
function place(calls, x0, minGap = 3.4) {
  const s = [...calls].sort((a, b) => a.at[1] - b.at[1]);
  let last = -Infinity;
  return s.map(c => { const ly = Math.max(c.at[1], last + minGap); last = ly; return { ...c, lx: x0, ly }; });
}

function Dim({ x1, y1, x2, y2, label, vertical = false }) {
  const t = .7;
  return (
    <g data-bp="dim">
      <path d={`M${x1} ${y1}L${x2} ${y2}`} pathLength="1" stroke="var(--accent-ink)" strokeWidth=".08" fill="none" data-draw />
      <path d={vertical ? `M${x1 - t} ${y1}h${2 * t}M${x2 - t} ${y2}h${2 * t}` : `M${x1} ${y1 - t}v${2 * t}M${x2} ${y2 - t}v${2 * t}`} pathLength="1" stroke="var(--accent-ink)" strokeWidth=".08" fill="none" data-draw />
      <text data-bp="dimtext" x={vertical ? x1 - 1 : (x1 + x2) / 2} y={vertical ? (y1 + y2) / 2 : y1 - .8} fill="var(--accent-ink)" fontSize="1.5" fontFamily="var(--font-mono)" textAnchor="middle"
        transform={vertical ? `rotate(-90 ${x1 - 1} ${(y1 + y2) / 2})` : undefined}>{label}</text>
    </g>
  );
}

export default function Blueprint({ view = 'plan', className = '', clipId }) {
  const { t, lang } = useI18n();
  const layer = data[view], W = data.W, H = view === 'plan' ? data.D : data.H;
  const LX = W + 3.5, calls = place(data.calls[view], LX + 1.5);
  const label = c => t(`bp.${c.id}`, { n: c.n?.toLocaleString(lang) ?? '', y: c.y > 0 ? `+${c.y}` : c.y === 0 ? '±0' : `−${-c.y}` });
  const vb = view === 'plan' ? `-6 -4 ${W + 40} ${H + 11}` : `-7 -4 ${W + 38} ${H + 9}`;
  return (
    <svg viewBox={vb} className={className} role="img" aria-label={view === 'plan' ? t('bp.plan.alt', { w: W, d: data.D }) : t('bp.section.alt', { h: data.H })} data-bp-view={view}>
      {clipId && <defs><clipPath id={clipId}><rect data-bp="clip" x={-8} y={H} width={W + 40} height={0} /></clipPath></defs>}
      <g clipPath={clipId ? `url(#${clipId})` : undefined}>
        <rect data-bp="frame" x="0" y="0" width={W} height={H} fill="none" stroke="var(--ink)" strokeWidth=".18" pathLength="1" data-draw />
        {ORDER.filter(k => layer[k]).map(k => {
          const s = STYLE[k], l = layer[k];
          return (
            <g key={k}>
              <path data-bp={`fill-${k}`} d={l.fill} fill={s.fill} fillOpacity={s.fo} />
              {l.cells && <path data-bp={`cells-${k}`} d={l.cells} fill="none" stroke={s.stroke || 'var(--ink)'} strokeOpacity=".45" strokeWidth=".04" pathLength="1" data-draw />}
              <path data-bp={`edge-${k}`} d={l.edge} fill="none" stroke={s.stroke || 'var(--ink)'} strokeOpacity={s.so} strokeWidth={s.sw} strokeDasharray={s.dash} pathLength={s.dash ? undefined : 1} data-draw={s.dash ? undefined : ''} />
            </g>
          );
        })}
      </g>
      {view === 'plan' ? (
        <>
          <Dim x1={0} y1={H + 3} x2={W} y2={H + 3} label={`${W}`} />
          <Dim x1={-3} y1={0} x2={-3} y2={H} label={`${data.D}`} vertical />
        </>
      ) : (
        <>
          <Dim x1={-3.5} y1={0} x2={-3.5} y2={H} label={`${data.H}`} vertical />
          <Dim x1={0} y1={H + 3} x2={W} y2={H + 3} label={`${W}`} />
          <path data-bp="ground" d={`M-1 ${data.Y1 + 1}H${W + 1}`} stroke="var(--ink)" strokeOpacity=".5" strokeWidth=".08" strokeDasharray=".6 .4" fill="none" />
        </>
      )}
      {calls.map(c => (
        <g key={c.id} data-bp="call" data-at={c.at[1]}>
          <path data-bp="leader" d={leader(c, W, H)} pathLength="1" fill="none" stroke="var(--fg)" strokeOpacity=".7" strokeWidth=".07" data-draw />
          <circle data-bp="dot" cx={c.at[0]} cy={c.at[1]} r=".45" fill="var(--accent)" />
          <text data-bp="label" x={c.lx} y={c.ly + .5} fill="var(--fg)" fontSize="1.45" fontFamily="var(--font-sans)">{label(c)}</text>
        </g>
      ))}
    </svg>
  );
}
