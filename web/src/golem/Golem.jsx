// Mascota de BuildGolem: un gólem de hierro con casco de obra, chaleco reflectante y su plano.
// Dibujo propio en bloques (SVG), con poses: "blueprint" (sujeta el plano), "wave" (saluda), "build" (martillea), "think" (lee el plano).
// Parpadea y respira; el resto del movimiento lo ponen las animaciones CSS de abajo (se apagan con prefers-reduced-motion).
const IRON = '#c9d0d6', IRON_D = '#9aa4ad', IRON_DD = '#6e7882', VEST = '#ff7a1a', VEST_D = '#d85f0a', HAT = '#ffc21a', HAT_D = '#c99200';

function Arm({ side, pose }) {
  const left = side === 'l', x = left ? 18 : 120;
  const cls = pose === 'wave' && !left ? 'g-wave' : pose === 'build' && !left ? 'g-hammer' : 'g-arm';
  const origin = left ? '31px 92px' : '133px 92px';
  return (
    <g className={cls} style={{ transformOrigin: origin }}>
      <rect x={x} y={86} width={26} height={74} rx={4} fill={IRON} />
      <rect x={x} y={86} width={26} height={12} rx={4} fill={VEST} />
      <rect x={x + (left ? 0 : 16)} y={98} width={10} height={62} fill={IRON_D} opacity=".55" />
      <rect x={x - 1} y={150} width={28} height={16} rx={4} fill={IRON_D} />
      {pose === 'build' && !left && (
        <g transform={`translate(${x + 4} 148)`}>
          <rect x={6} y={-30} width={6} height={40} rx={2} fill="#7a4b2a" />
          <rect x={-6} y={-38} width={30} height={12} rx={2} fill={IRON_DD} />
        </g>
      )}
    </g>
  );
}

export default function Golem({ pose = 'blueprint', className = '', title }) {
  const plan = pose === 'blueprint' || pose === 'think';
  return (
    <svg viewBox="0 0 164 236" className={`golem ${className}`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <ellipse cx="82" cy="228" rx="54" ry="6" fill="#000" opacity=".18" className="g-shadow" />
      <g className="g-body">
        {/* piernas, con enredadera en una */}
        <rect x="46" y="168" width="28" height="54" rx="4" fill={IRON_D} />
        <rect x="90" y="168" width="28" height="54" rx="4" fill={IRON_D} />
        <rect x="46" y="212" width="28" height="12" rx="3" fill={IRON_DD} />
        <rect x="90" y="212" width="28" height="12" rx="3" fill={IRON_DD} />
        <path d="M96 172 q8 10 0 20 q-8 10 2 22" stroke="#4f9a5a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <rect x="100" y="186" width="7" height="5" rx="2" fill="#62b56d" />
        {/* torso de hierro con remaches y chaleco */}
        <rect x="40" y="84" width="84" height="88" rx="6" fill={IRON} />
        <rect x="40" y="150" width="84" height="22" rx="4" fill={IRON_D} />
        <path d="M44 88 h26 l12 22 l12 -22 h26 v58 h-76 z" fill={VEST} />
        <path d="M44 88 h26 l12 22 l12 -22 h26 v6 h-23 l-15 26 l-15 -26 h-23 z" fill={VEST_D} />
        <rect x="44" y="120" width="76" height="7" fill="#e9eef2" />
        <rect x="44" y="134" width="76" height="7" fill="#e9eef2" />
        <rect x="76" y="110" width="12" height="36" fill={IRON_D} />
        {[52, 112].map(cx => <circle key={cx} cx={cx} cy="160" r="2.6" fill={IRON_DD} />)}
        <Arm side="l" pose={pose} />
        <Arm side="r" pose={pose} />
        {/* plano: enrollado en la mano izquierda, o abierto delante si lo está leyendo */}
        {pose === 'blueprint' && (
          <g className="g-plan">
            <rect x="8" y="138" width="46" height="14" rx="7" fill="#1d5a94" transform="rotate(-18 31 145)" />
            <path d="M14 145 h34 M14 141 h20" stroke="#bfe0ff" strokeWidth="1.6" transform="rotate(-18 31 145)" />
            <circle cx="52" cy="138" r="7" fill="#2f78bd" stroke="#bfe0ff" strokeWidth="1.5" />
          </g>
        )}
        {pose === 'think' && (
          <g className="g-plan">
            <rect x="30" y="118" width="104" height="58" rx="3" fill="#1d5a94" />
            <path d="M38 128 h40 v20 h-40 z M84 128 h40 v38 h-40 z M38 154 h40 v12 h-40 z" stroke="#bfe0ff" strokeWidth="1.5" fill="none" />
            <path d="M38 172 h86" stroke="#ffc21a" strokeWidth="1.5" strokeDasharray="3 3" />
          </g>
        )}
        {/* cabeza: frente marcada, ojos que brillan y la nariz larga de los gólems */}
        <g className="g-head" style={{ transformOrigin: '82px 84px' }}>
          <rect x="56" y="34" width="52" height="52" rx="6" fill={IRON} />
          <rect x="56" y="52" width="52" height="8" fill={IRON_D} />
          <g className="g-eyes" style={{ transformOrigin: '82px 64px' }}>
            <rect x="64" y="60" width="11" height="7" rx="1.5" fill="#7fd8ff" />
            <rect x="89" y="60" width="11" height="7" rx="1.5" fill="#7fd8ff" />
            <rect x="64" y="60" width="11" height="7" rx="1.5" fill="#7fd8ff" opacity=".5" filter="url(#glow)" />
            <rect x="89" y="60" width="11" height="7" rx="1.5" fill="#7fd8ff" opacity=".5" filter="url(#glow)" />
          </g>
          <rect x="76" y="64" width="12" height="28" rx="3" fill={IRON_D} />
          <rect x="70" y="80" width="24" height="4" rx="2" fill={IRON_DD} opacity=".6" />
          {/* casco de obra con una amapola */}
          <path d="M54 40 q0 -26 28 -26 q28 0 28 26 z" fill={HAT} />
          <rect x="48" y="38" width="68" height="8" rx="3" fill={HAT_D} />
          <rect x="78" y="14" width="8" height="26" rx="2" fill={HAT_D} opacity=".7" />
          <g transform="translate(104 22)"><circle r="5" fill="#e5484d" /><circle r="1.8" fill="#2a1a10" /><path d="M0 5 q2 6 -2 10" stroke="#4f9a5a" strokeWidth="2" fill="none" /></g>
        </g>
      </g>
      <defs><filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="2.5" /></filter></defs>
    </svg>
  );
}

/** Bocadillo del gólem en letra pixelada. */
export function Bubble({ children, className = '' }) {
  return (
    <span className={`relative inline-block rounded-[6px] border-2 border-fg bg-surface px-3 py-1.5 font-pixel text-[15px] leading-tight text-fg shadow-[3px_3px_0_0_var(--fg)] ${className}`}>
      {children}
      <span className="absolute -bottom-[9px] left-6 size-4 rotate-45 border-b-2 border-r-2 border-fg bg-surface" aria-hidden="true" />
    </span>
  );
}

/** Marca pequeña: la cabeza del gólem con su casco (logotipo provisional hasta tener uno definitivo). */
export function GolemMark({ className = 'size-6' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="6" y="11" width="20" height="19" rx="3" fill="#c9d0d6" />
      <rect x="6" y="17" width="20" height="3" fill="#9aa4ad" />
      <rect x="9.5" y="20" width="4.5" height="3" rx=".8" fill="#7fd8ff" /><rect x="18" y="20" width="4.5" height="3" rx=".8" fill="#7fd8ff" />
      <rect x="14" y="21" width="4" height="9" rx="1.2" fill="#9aa4ad" />
      <path d="M5 13 q0 -11 11 -11 q11 0 11 11 z" fill="#ffc21a" />
      <rect x="3" y="12" width="26" height="3.2" rx="1.2" fill="#c99200" />
    </svg>
  );
}
