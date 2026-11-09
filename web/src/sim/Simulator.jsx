// Simulador: el diseño en 3D con barra superior, carril de herramientas, panel lateral, cajetín de estado y, para el dueño, los agentes.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ArrowLeft, Pulse, Info, VideoCamera, Stack, ListBullets, GridFour, Gauge, CheckCircle, Warning, DownloadSimple, CopySimple,
  Camera, ArrowsOut, ArrowsIn, ChatCircleText, Play, Pause, Crosshair, CaretRight, Copy, Highlighter, Scissors, Hash, CornersOut, Eye,
} from '@phosphor-icons/react';
import { useContextMenu } from '../chrome.jsx';
import { useI18n } from '../i18n.jsx';
import { api } from '../api.js';
import { Button, IconButton, Segmented, Switch, DesignViewer, useAuth } from '../ui.jsx';
import Chat from './Chat.jsx';

const L = (v, lang) => (v && typeof v === 'object' ? v[lang] ?? v.es : v);
const num = (x, lang) => (x == null || !Number.isFinite(x) ? '—' : x >= 100 ? Math.round(x).toLocaleString(lang) : (+x.toFixed(x >= 10 ? 1 : 2)).toLocaleString(lang));
const Cap = s => s[0].toUpperCase() + s.slice(1);

// el nodo de DOM que prepara el motor (explicación, patrones, canales), metido tal cual en el panel
function DomSlot({ node, className = '' }) {
  const ref = useRef(null);
  useLayoutEffect(() => { const el = ref.current; if (node && el) el.replaceChildren(node); return () => el?.replaceChildren(); }, [node]);
  return node ? <div ref={ref} className={`cm-panel ${className}`} /> : null;
}
// cursor del cajetín: se suscribe solo él para no repintar el simulador entero al mover el ratón
function Cursor({ h }) {
  const [b, setB] = useState(null);
  useEffect(() => h?.on((type, data) => { if (type === 'hover') setB(data); }), [h]);
  return <span>{b ? `${b.name} · ${b.x} ${b.y} ${b.z}` : '—'}</span>;
}
const Section = ({ title, children, aside }) => (
  <section className="grid gap-3 border-b border-line px-4 py-4 last:border-b-0">
    {title && <div className="flex items-center justify-between gap-2"><h3 className="text-[13px] font-semibold">{title}</h3>{aside}</div>}
    {children}
  </section>
);

// número que cuenta hasta su valor nuevo
function Count({ value, lang }) {
  const ref = useRef(null), last = useRef(0);
  useEffect(() => {
    const el = ref.current; if (!el || value == null || !Number.isFinite(value)) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = num(value, lang); last.current = value; return; }
    const o = { v: last.current }, tw = gsap.to(o, { v: value, duration: .7, ease: 'power2.out', onUpdate: () => { el.textContent = num(o.v, lang); } });
    last.current = value;
    return () => tw.kill();
  }, [value, lang]);
  return <span ref={ref} className="tabular-nums">{num(value, lang)}</span>;
}

function Transport({ h, view, compact = false }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton label={view.playing ? t('sim.pause') : t('sim.play')} active={view.playing} onClick={() => h.setPlaying(!view.playing)}>{view.playing ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}</IconButton>
      <Segmented size="sm" label={t('sim.speed')} value={view.speed} onChange={v => h.setSpeed(v)} items={[[.25, '¼×'], [1, '1×'], [4, '4×'], [16, '16×']]} />
      {!compact && <span className="text-xs text-muted">{t('sim.realtime')}</span>}
    </div>
  );
}

function ProcessPanel({ h, process: g, view, fams }) {
  const { t, lang } = useI18n();
  const out = g.edges.find(e => e.output) || g.edges.at(-1);
  const outOf = id => g.edges.find(e => e.from === id);
  const unitRate = e => (e?.fluid ? [e.rate, 'mB/s'] : [e?.rate * 60, '/min']);
  const [ov, ou] = unitRate(out);
  const nodes = g.nodes.filter(n => n.rate), maxCap = Math.max(...nodes.map(n => (Number.isFinite(n.cap) ? n.cap : 0)), 1e-9);
  const bott = g.nodes.find(n => n.id === g.bottleneck);
  return (
    <>
      <Section>
        {L(g.title, lang) && <p className="text-[13px] font-medium text-muted">{L(g.title, lang)}</p>}
        <div className="grid gap-1">
          <span className="font-mono text-[40px] font-medium leading-none tracking-tight text-accent-ink"><Count value={ov} lang={lang} /></span>
          <span className="text-sm text-muted">{L(out?.item, lang)} {ou}</span>
        </div>
        {g.through != null && <p className="font-mono text-xs text-muted">{t('sim.in')}: {num(g.through * 60, lang)} {L(g.unit, lang)}/min</p>}
        <Transport h={h} view={view} />
      </Section>
      {g.through != null && nodes.some(n => n.upgrades !== false) && (
        <Section title={t('sim.upgrades')} aside={<span className="font-mono text-sm text-accent-ink">{view.upgrades}/{h.maxUpgrades}</span>}>
          <input type="range" min={0} max={h.maxUpgrades} step={1} value={view.upgrades} onChange={e => h.setUpgrades(+e.target.value)} aria-label={t('sim.upgrades')} className="w-full" />
          <p className="text-xs leading-relaxed text-muted">{t('sim.upgrades.hint')}</p>
        </Section>
      )}
      <Section title={t('sim.stages')}>
        {bott && <p className="flex items-start gap-2 text-[13px] leading-snug"><Warning size={16} className="mt-px shrink-0 text-danger" aria-hidden="true" /><span><b className="font-semibold">{t('sim.bottleneck')}: {L(bott.label, lang)}.</b> {g.saturated?.length > 1 ? t('sim.saturated', { n: g.saturated.length }) : t('sim.bottleneck.hint')}</span></p>}
        <ol className="grid gap-1">
          {nodes.map(n => {
            const e = outOf(n.id), [rv, ru] = unitRate(e), slow = n.id === g.bottleneck, sat = g.saturated?.includes(n.id);
            const fam = n.factory && fams.find(f => f.types.includes(n.t));
            return (
              <li key={n.id} className={`grid gap-1.5 rounded-[6px] border px-2.5 py-2 ${slow ? 'border-danger/50 bg-danger/[.06]' : 'border-line'}`}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => h.focusNode(n.id)} className="group flex min-w-0 flex-1 items-center gap-1.5 text-left text-[13px] font-medium" aria-label={`${t('sim.goto')} ${L(n.label, lang)}`}>
                    <Crosshair size={14} className="shrink-0 text-muted group-hover:text-accent-ink" aria-hidden="true" /><span className="truncate">{L(n.label, lang)}</span>
                  </button>
                  <span className="font-mono text-xs tabular-nums text-fg">{num(rv, lang)}<span className="text-muted">{ru}</span></span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-[2px] bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((n.load ?? 0) * 100)} aria-label={t('sim.load')}>
                  <div className={`h-full transition-[width] duration-500 ${slow ? 'bg-danger' : sat ? 'bg-accent' : 'bg-ink'}`} style={{ width: `${Math.min(100, (Number.isFinite(n.cap) ? n.cap / maxCap : 1) * 100)}%` }} />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-muted">
                  <span>{n.rate.count}× {n.rate.parallel > 1 ? `· ${n.rate.parallel} ${t('sim.proc')}` : ''}</span>
                  <span>{n.rate.perTick ? `${num(n.rate.perTick, lang)} ${t('sim.pertick')}` : `${t('sim.cycle')} ${num(n.rate.cycle, lang)} s`}</span>
                  {n.load != null && <span className={sat ? 'text-accent-ink' : ''}>{Math.round(n.load * 100)} %</span>}
                  {fam && (
                    <select aria-label={`${t('sim.tier')} · ${fam.label}`} value={fam.tier} onChange={ev => h.setTier(fam.key, ev.target.value)} className="ml-auto min-h-7 rounded-[4px] border border-line bg-bg px-1.5 font-sans text-[11px] text-fg">
                      {fam.options.map(o => <option key={o} value={o}>{Cap(o)}</option>)}
                    </select>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="text-xs leading-relaxed text-muted">{t('sim.bar.hint')}</p>
      </Section>
      <Section title={t('sim.flows')}>
        <ul className="grid gap-1.5">
          {g.edges.map((e, i) => { const [v, u] = unitRate(e); return (
            <li key={i} className="flex items-center gap-2 text-[13px]"><span className={`size-2.5 shrink-0 ${e.fluid ? 'rounded-full' : 'rounded-[1px]'}`} style={{ background: e.color || 'var(--accent)' }} aria-hidden="true" /><span className="flex-1 truncate">{L(e.item, lang)}</span><span className="font-mono text-xs tabular-nums text-muted">{num(v, lang)}{u}</span></li>
          ); })}
        </ul>
        <div className="grid gap-1">
          <Switch id="sw-flow" checked={view.flow} onChange={v => h.setFlow(v)}>{t('sim.showflow')}</Switch>
          <Switch id="sw-labels" checked={view.labels} onChange={v => h.setLabels(v)}>{t('sim.labels')}</Switch>
        </div>
      </Section>
      {L(g.notes, lang) && <Section><p className="text-xs leading-relaxed text-muted">{L(g.notes, lang)}</p></Section>}
    </>
  );
}

function MaterialsPanel({ h, view, mats }) {
  const { t, lang } = useI18n(), [copied, setCopied] = useState(false);
  const total = mats.reduce((s, m) => s + m.n, 0);
  const copy = () => { navigator.clipboard.writeText(mats.map(m => `${m.n}\t${m.facade ? `${t('sim.facade')}: ` : ''}${m.name}\t${m.id}`).join('\n')); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  return (
    <Section title={`${t('sim.materials')} · ${total.toLocaleString(lang)}`} aside={<Button variant="quiet" size="sm" onClick={copy}><Copy size={15} aria-hidden="true" />{copied ? t('common.copied') : t('common.copy')}</Button>}>
      <p className="text-xs text-muted">{t('sim.materials.hint')}</p>
      <ul className="grid">
        {mats.map(m => (
          <li key={m.t + m.facade}>
            <button type="button" onClick={() => h.mark(m.t)} aria-pressed={view.marked === m.t}
              className={`grid w-full grid-cols-[1fr_auto] items-baseline gap-3 border-b border-line/60 py-1.5 text-left text-[13px] hover:text-fg ${view.marked === m.t ? 'text-accent-ink' : 'text-fg/90'}`}>
              <span className="min-w-0">{m.facade ? <span className="text-muted">{t('sim.facade')}: </span> : null}{m.name}</span>
              <span className="font-mono text-xs tabular-nums">{m.n.toLocaleString(lang)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const TABS = [
  ['process', Pulse, 'sim.tab.process'], ['info', Info, 'sim.tab.info'], ['views', VideoCamera, 'sim.tab.views'], ['layers', Stack, 'sim.tab.layers'],
  ['materials', ListBullets, 'sim.tab.materials'], ['patterns', GridFour, 'sim.tab.patterns'], ['tiers', Gauge, 'sim.tab.tiers'],
];

export default function Simulator({ design: d, mine = false, onPatch, onReload, backTo = '/galeria' }) {
  const { t, lang } = useI18n(), { user } = useAuth(), nav = useNavigate();
  const [h, setH] = useState(null), [M, setM] = useState(null), [mode, setMode] = useState(null), [ver, setVer] = useState(0);
  const [view, setView] = useState(null), [stats, setStats] = useState(null), [proc, setProc] = useState(null), [mats, setMats] = useState([]), [fams, setFams] = useState([]);
  const [tab, setTab] = useState(null), [panel, setPanel] = useState(() => matchMedia('(min-width: 768px)').matches), [chat, setChat] = useState(() => mine && matchMedia('(min-width: 1280px)').matches);
  const [check, setCheck] = useState(null), [full, setFull] = useState(false);
  const shell = useRef(null);

  const onReady = (handle, model, look) => {
    setH(handle); setM(model); setMode(look);
    setView(handle.state); setProc(handle.process); setMats(handle.materials()); setFams(handle.families());
    setTab(x => x || (handle.process ? 'process' : 'info'));
  };
  const menu = useContextMenu();
  // clic derecho sin arrastrar en el 3D: opciones del bloque (o de la vista si no hay bloque)
  useEffect(() => h?.on((type, ev) => {
    if (type !== 'context') return;
    const b = ev.block, v = h.state, cp = x => navigator.clipboard?.writeText(x);
    const items = b ? [
      { label: t('cm.b.card'), icon: Info, run: () => h.select(ev.ref) },
      { label: t('cm.b.focus'), icon: Crosshair, run: () => h.focus(ev.ref) },
      { label: t('cm.b.mark'), icon: Highlighter, run: () => h.mark(b.t) },
      { label: t('cm.b.cut'), icon: Scissors, hint: `y ${b.y + 1}`, run: () => h.setCut(b.y + 1) },
      '-',
      { label: t('cm.b.coords'), icon: Hash, hint: `${b.x} ${b.y} ${b.z}`, run: () => cp(`${b.x} ${b.y} ${b.z}`) },
      { label: t('cm.b.id'), icon: Copy, run: () => cp(b.id) },
    ] : [
      { label: h.zones[0].n, icon: CornersOut, run: () => h.camera(h.zones[0]) },
      h.process && { label: v.playing ? t('sim.pause') : t('sim.play'), icon: v.playing ? Pause : Play, run: () => h.setPlaying(!v.playing) },
      h.process && { label: t('sim.showflow'), icon: Eye, hint: v.flow ? '✓' : '', run: () => h.setFlow(!v.flow) },
      { label: t('sim.shot'), icon: Camera, run: () => { const a = document.createElement('a'); a.href = h.screenshot(); a.download = `${d.slug || 'craftometry'}.png`; a.click(); } },
    ];
    menu.open(ev.x, ev.y, [...items, '-', ...menu.pageItems()], { title: b ? b.name : d.title, sub: b ? `${b.x} ${b.y} ${b.z}` : null });
  }), [h, menu, d, t]);
  useEffect(() => {
    if (!h) return;
    setStats(h.stats);                                    // el primer fotograma pudo emitirlo antes de suscribirnos
    return h.on((type, data) => {
      if (type === 'view') setView(data);
      else if (type === 'stats') setStats(data);
      else if (type === 'process') setProc(data);
      else if (type === 'materials') { setMats(h.materials()); setFams(h.families()); setVer(v => v + 1); }
    });
  }, [h]);
  useEffect(() => { const f = () => setFull(!!document.fullscreenElement); addEventListener('fullscreenchange', f); return () => removeEventListener('fullscreenchange', f); }, []);

  const tabs = useMemo(() => TABS.filter(([k]) => ({
    process: !!proc, patterns: !!h?.sections.patterns, tiers: fams.length > 0, info: true, views: true, layers: true, materials: true,
  })[k]), [proc, h, fams, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickTab = k => { if (k === tab && panel) setPanel(false); else { setTab(k); setPanel(true); } };
  const shot = () => { const a = document.createElement('a'); a.href = h.screenshot(); a.download = `${d.slug || 'craftometry'}.png`; a.click(); };
  const out = proc && (proc.edges.find(e => e.output) || proc.edges.at(-1));

  return (
    <div ref={shell} className="grid h-dvh grid-rows-[52px_minmax(0,1fr)_auto] overflow-hidden bg-bg text-fg">
      {/* barra superior */}
      <header className="flex min-w-0 items-center gap-2 border-b border-line bg-surface px-2">
        <IconButton label={t('common.back')} as={Link} to={backTo}><ArrowLeft size={18} /></IconButton>
        <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
        {mine ? (
          <><label htmlFor="ti" className="sr-only">{t('sim.title')}</label>
            <input id="ti" key={d.title} defaultValue={d.title} onBlur={e => e.target.value.trim() && e.target.value.trim() !== d.title && onPatch({ title: e.target.value.trim() })}
              className="min-h-9 min-w-0 flex-1 truncate rounded-[6px] border border-transparent bg-transparent px-2 text-[15px] font-semibold hover:border-line focus:border-ink md:max-w-[420px]" /></>
        ) : <h1 className="min-w-0 truncate px-1 text-[15px] font-semibold">{d.title}</h1>}
        {d.size && <span className="cota hidden w-36 shrink-0 lg:flex" aria-label={t('card.size')}>{d.size.join(' × ')}</span>}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {mine && (
            <><label htmlFor="vis" className="sr-only">{t('ed.share')}</label>
              <select id="vis" value={d.visibility} onChange={e => onPatch({ visibility: e.target.value })} className="mr-1 hidden min-h-9 rounded-[6px] border border-line bg-bg px-2 text-sm sm:block">
                {['private', 'unlisted', 'public'].map(v => <option key={v} value={v}>{t(`vis.${v}`)}</option>)}
              </select></>
          )}
          {mine && <IconButton side="end" label={t('ed.validate')} onClick={async () => setCheck(await api(`/designs/${d.id}/validate`))}><CheckCircle size={18} /></IconButton>}
          <IconButton side="end" label={t('ed.export')} as="a" href={`/api/designs/${d.id}/export.nbt`} download><DownloadSimple size={18} /></IconButton>
          {user && <IconButton side="end" className="max-sm:hidden" label={t('ed.duplicate')} onClick={async () => { const c = await api(`/designs/${d.id}/duplicate`, { method: 'POST', body: {} }); nav(`/app/diseno/${c.id}`); }}><CopySimple size={18} /></IconButton>}
          <IconButton side="end" className="max-sm:hidden" label={t('sim.shot')} onClick={shot} disabled={!h}><Camera size={18} /></IconButton>
          <IconButton side="end" label={full ? t('sim.exitfull') : t('sim.full')} onClick={() => (full ? document.exitFullscreen() : shell.current.requestFullscreen?.())}>{full ? <ArrowsIn size={18} /> : <ArrowsOut size={18} />}</IconButton>
          {mine && <Button size="sm" variant={chat ? 'primary' : 'secondary'} className="ml-1" onClick={() => setChat(!chat)} aria-pressed={chat}><ChatCircleText size={16} aria-hidden="true" /><span className="hidden sm:inline">{t('sim.agents')}</span></Button>}
        </div>
      </header>

      <div className="relative flex min-h-0">
        {/* carril de herramientas */}
        <nav aria-label={t('sim.tools')} className="z-30 flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-2">
          {tabs.map(([k, Icon, label]) => <IconButton key={k} label={t(label)} side="right" active={panel && tab === k} aria-pressed={panel && tab === k} onClick={() => pickTab(k)}><Icon size={19} weight={panel && tab === k ? 'fill' : 'regular'} /></IconButton>)}
        </nav>

        {/* panel */}
        {panel && h && view && (
          <section aria-label={t(TABS.find(x => x[0] === tab)?.[2] || 'sim.tab.info')} className="absolute inset-y-0 left-[52px] z-20 w-[min(340px,calc(100%-52px))] overflow-y-auto overflow-x-hidden border-r border-line bg-surface shadow-[12px_0_32px_-24px_rgb(2_10_20/.8)] md:static md:w-[330px] md:shadow-none">
            <div className="sticky top-0 z-10 flex h-11 items-center justify-between border-b border-line bg-surface px-4">
              <h2 className="text-sm font-semibold">{t(TABS.find(x => x[0] === tab)?.[2] || 'sim.tab.info')}</h2>
              <IconButton side="end" label={t('sim.hidepanel')} onClick={() => setPanel(false)}><CaretRight size={16} className="rotate-180" /></IconButton>
            </div>
            {tab === 'process' && proc && <ProcessPanel h={h} process={proc} view={view} fams={fams} />}
            {tab === 'info' && (
              <>
                <Section><p className="text-[15px] font-semibold leading-snug">{M?.TITLE || d.title}</p>{(M?.SUB || d.summary) && <p className="text-[13px] leading-relaxed text-muted">{M?.SUB || d.summary}</p>}</Section>
                {h.sections.info && <Section title={t('sim.howto')}><DomSlot node={h.sections.info} className="text-[13px]" /></Section>}
                {h.sections.tables.childElementCount > 0 && <Section><DomSlot node={h.sections.tables} key={ver} /></Section>}
                <Section title={t('sim.controls')}><p className="text-xs leading-relaxed text-muted">{t('sim.controls.hint')}</p></Section>
              </>
            )}
            {tab === 'views' && (
              <Section>
                <ul className="grid gap-1">{h.zones.map((z, i) => (
                  <li key={i}><button type="button" onClick={() => h.camera(z)} className="flex min-h-10 w-full items-center gap-2.5 rounded-[6px] border border-line px-3 text-left text-[13px] hover:border-ink/60 hover:bg-ink/[.06]">
                    <span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, '0')}</span>{z.n}</button></li>
                ))}</ul>
              </Section>
            )}
            {tab === 'layers' && (
              <>
                <Section title={t('sim.cut')} aside={<span className="font-mono text-sm text-accent-ink">y {view.cut}</span>}>
                  <input type="range" min={view.cutMin} max={view.cutMax} value={view.cut} onChange={e => h.setCut(e.target.value)} aria-label={t('sim.cut')} className="w-full" />
                  <p className="text-xs leading-relaxed text-muted">{t('sim.cut.hint')}</p>
                </Section>
                <Section><Switch id="sw-walls" checked={view.autowall} onChange={v => h.setAutowall(v)}>{t('sim.walls')}</Switch></Section>
                {h.sections.controls.childElementCount > 0 && <Section title={t('sim.design.layers')}><DomSlot node={h.sections.controls} key={ver} /></Section>}
              </>
            )}
            {tab === 'materials' && <MaterialsPanel h={h} view={view} mats={mats} />}
            {tab === 'patterns' && <Section><p className="text-xs leading-relaxed text-muted">{t('sim.patterns.hint')}</p><DomSlot node={h.sections.patterns} key={ver} /></Section>}
            {tab === 'tiers' && (
              <Section>
                <p className="text-xs leading-relaxed text-muted">{t('sim.tiers.hint')}</p>
                <ul className="grid gap-2">{fams.map(f => (
                  <li key={f.key} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[6px] border border-line px-3 py-2">
                    <span className="grid min-w-0"><span className="truncate text-[13px] font-medium">{f.label}</span><span className="font-mono text-[11px] text-muted">{f.count} {t('sim.blocks')}{f.parallel ? ` · ${f.parallel} ${t('sim.proc')}` : ''}</span></span>
                    <select aria-label={f.label} value={f.tier} onChange={e => h.setTier(f.key, e.target.value)} className="min-h-8 rounded-[4px] border border-line bg-bg px-2 text-[13px]">{f.options.map(o => <option key={o} value={o}>{Cap(o)}</option>)}</select>
                  </li>
                ))}</ul>
              </Section>
            )}
          </section>
        )}

        {/* lienzo */}
        <div className="relative min-w-0 flex-1">
          <DesignViewer design={d} className="absolute inset-0" onReady={onReady} />
          {proc && view && (
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-start">
              <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-[6px] border border-line bg-surface/92 px-3 py-2 backdrop-blur">
                <Transport h={h} view={view} compact />
                {out && <span className="font-mono text-sm"><span className="text-accent-ink"><Count value={out.fluid ? out.rate : out.rate * 60} lang={lang} /></span> <span className="text-muted">{L(out.item, lang)}{out.fluid ? ' mB/s' : '/min'}</span></span>}
                {tab !== 'process' && <Button variant="quiet" size="sm" onClick={() => pickTab('process')}>{t('sim.details')}</Button>}
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute left-3 top-3 hidden items-center gap-1.5 rounded-[6px] border border-line bg-surface/85 px-2.5 py-1.5 text-[11px] text-muted backdrop-blur md:flex" aria-hidden="true">
            {['W', 'A', 'S', 'D'].map(k => <kbd key={k} className="grid size-5 place-items-center rounded-[4px] border border-line bg-bg font-mono text-[10px] text-fg">{k}</kbd>)}<span className="mr-1.5">{t('sim.keys.move')}</span>
            {['Q', 'E'].map(k => <kbd key={k} className="grid size-5 place-items-center rounded-[4px] border border-line bg-bg font-mono text-[10px] text-fg">{k}</kbd>)}<span className="mr-1.5">{t('sim.keys.height')}</span>
            <kbd className="grid h-5 place-items-center rounded-[4px] border border-line bg-bg px-1 font-mono text-[10px] text-fg">⇧</kbd><span>{t('sim.keys.fast')}</span>
          </div>
          {check && (
            <div className="absolute left-1/2 top-3 z-10 grid w-[min(560px,calc(100%-24px))] -translate-x-1/2 gap-2 rounded-[6px] border border-line bg-surface p-4 text-sm shadow-[0_16px_40px_-20px_rgb(2_10_20/.8)]" role="status">
              <div className="flex items-center gap-2 font-medium">{check.ok ? <CheckCircle size={18} className="text-ok" /> : <Warning size={18} className="text-danger" />}{check.ok ? t('ed.valid.ok') : `${check.errorCount} ${t('ed.valid.errors')}`}
                <Button variant="quiet" size="sm" className="ml-auto" onClick={() => setCheck(null)}>{t('common.close')}</Button></div>
              {check.errors.slice(0, 6).map((e, i) => <span key={i} className="font-mono text-xs text-muted">[{e.at?.join(', ')}] {e.msg}</span>)}
              {check.warnings.map((w, i) => <span key={i} className="text-xs text-muted">{w.msg}</span>)}
            </div>
          )}
        </div>

        {mine && chat && <aside aria-label={t('sim.agents')} className="absolute inset-y-0 right-0 z-30 w-full max-w-[400px] border-l border-line md:static md:w-[380px]"><Chat design={d} onDesignChanged={onReload} onClose={() => setChat(false)} /></aside>}
      </div>

      {/* cajetín */}
      <footer className="cajetin border-x-0 border-b-0 bg-surface" aria-label={t('sim.status')}>
        <div className="hidden sm:grid"><small>{t('sim.design')}</small><span>{d.title}</span></div>
        <div><small>{t('card.size')}</small><span>{d.size?.join(' × ') || '—'}</span></div>
        <div><small>{t('sim.blocks')}</small><span>{stats ? stats.blocks.toLocaleString(lang) : '—'}</span></div>
        <div className="hidden md:grid"><small>{t('sim.faces')}</small><span>{stats ? stats.faces.toLocaleString(lang) : '—'}</span></div>
        <div className="min-w-0"><small>{t('sim.cursor')}</small><Cursor h={h} /></div>
        {mode === 'mixed' && <div className="hidden lg:grid" title={t('sim.mixed.long')}><small>{t('sim.look')}</small><span>{t('sim.mixed')}</span></div>}
      </footer>
    </div>
  );
}
