/* Plan de diseño (gpt-taste / design-taste / antislop):
   RNG (len(prompt)=1847): hero = editorial split · fuente = Geist · componentes = acordeón horizontal (agentes), imagen en línea dentro del titular (CTA), rejilla sin huecos (proveedores)
   GSAP = pin de sección (flujo, la secuencia importa) + escala y fundido de imágenes al hacer scroll (hero y pasos).
   AIDA: nav flotante · hero · flujo fijado · tiers interactivo · agentes · BYOK · galería · CTA · pie. H1 en max-w-[13ch] a clamp(2.6rem,5vw,4.6rem): 2-3 líneas.
   Sin etiquetas numeradas, sin cifras inventadas (todas las de Mekanism salen de los jars), un acento cobre, radio 10/8 px, tema claro y oscuro. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowSquareOut, ArrowRight, DownloadSimple } from '@phosphor-icons/react';
import { useI18n } from '../i18n.jsx';
import { Nav, Footer, Button, DesignCard } from '../ui.jsx';
import { api } from '../api.js';
import Blueprint, { data as bp } from '../landing/Blueprint.jsx';
import Assembly from '../landing/Assembly.jsx';
import VoxelItems from '../landing/VoxelItems.jsx';
import Golem, { Bubble } from '../golem/Golem.jsx';

gsap.registerPlugin(ScrollTrigger);
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Mekanism 10.7: lingotes por crudo en cada nivel (recetas reales) y operaciones por tier de factoría
const LEVELS = [
  { x: 2, perRaw: 4 / 3, chain: ['Enrichment Chamber', 'Energized Smelter'] },
  { x: 3, perRaw: 2, chain: ['Purification Chamber', 'Crusher', 'Enrichment Chamber', 'Energized Smelter'] },
  { x: 4, perRaw: 8 / 3, chain: ['Chemical Injection Chamber', 'Purification Chamber', 'Crusher', 'Enrichment Chamber', 'Energized Smelter'] },
  { x: 5, perRaw: 10 / 3, chain: ['Chemical Dissolution Chamber', 'Chemical Washer', 'Chemical Crystallizer', 'Chemical Injection Chamber', 'Purification Chamber', 'Crusher', 'Enrichment Chamber', 'Energized Smelter'] },
];
const TIERS = [['basic', 3], ['advanced', 5], ['elite', 7], ['ultimate', 9]];
const AGENTS = ['orchestrator', 'mod-expert', 'optimizer', 'designer', 'researcher', 'process-animator', 'validator', 'skill-writer'];

// planta del Centro AE2 que se dibuja sola al entrar: marco, estructura, máquinas, cotas y llamadas
function Hero() {
  const { t, lang } = useI18n(), root = useRef(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (reduce()) return;
      const q = s => root.current.querySelectorAll(s);
      gsap.set(q('[data-draw]'), { strokeDasharray: 1, strokeDashoffset: 1 });
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
      tl.from('[data-hero-line]', { yPercent: 110, opacity: 0, duration: .8, ease: 'power3.out', stagger: .05 })
        .from('[data-hero-fade]', { y: 14, opacity: 0, duration: .7, ease: 'power2.out', stagger: .08 }, .3)
        .to(q('[data-bp=frame]'), { strokeDashoffset: 0, duration: .9 }, .2)
        .to(q('[data-bp=edge-struct]'), { strokeDashoffset: 0, duration: 1.6 }, .6)
        .from(q('[data-bp=fill-struct], [data-bp=fill-glass]'), { opacity: 0, duration: .8 }, 1.4)
        .to(q('[data-bp=edge-cable], [data-bp=edge-ae2], [data-bp=cells-ae2]'), { strokeDashoffset: 0, duration: 1.3 }, 1.5)
        .from(q('[data-bp=fill-ae2], [data-bp=fill-cable]'), { opacity: 0, duration: .6 }, 2.3)
        .to(q('[data-bp=edge-mek], [data-bp=cells-mek]'), { strokeDashoffset: 0, duration: .6 }, 2.4)
        .from(q('[data-bp=fill-mek]'), { opacity: 0, duration: .5 }, 2.7)
        .to(q('[data-bp=dim] [data-draw]'), { strokeDashoffset: 0, duration: .6, stagger: .1 }, 2.6)
        .from(q('[data-bp=dimtext]'), { opacity: 0, duration: .4, stagger: .1 }, 3)
        .from(q('[data-bp=dot]'), { scale: 0, transformOrigin: 'center', transformBox: 'fill-box', duration: .3, stagger: .1, ease: 'back.out(2)' }, 3)
        .to(q('[data-bp=leader]'), { strokeDashoffset: 0, duration: .5, stagger: .1 }, 3.1)
        .from(q('[data-bp=label]'), { opacity: 0, x: -1.5, duration: .4, stagger: .1 }, 3.3)
        .from('[data-hero-sheet]', { opacity: 0, y: 8, duration: .5 }, 3.4)
        .from('[data-hero-golem]', { y: 60, opacity: 0, duration: .8, ease: 'back.out(1.6)' }, 1.1)
        .from('[data-hero-golem] > span', { scale: 0, transformOrigin: '20% 100%', duration: .4, ease: 'back.out(2)' }, 1.9);
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} className="bp-paper relative overflow-hidden border-b border-line pt-24 md:pt-20">
      <VoxelItems trigger={root} />
      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1320px] items-center gap-10 px-4 pb-14 md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] md:gap-6">
        <div className="grid gap-7">
          <h1 className="max-w-[17ch] text-[clamp(2.4rem,4vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.035em]" aria-label={t('hero.title')}>
            {t('hero.title').split(' ').map((w, i) => (
              <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-1 align-top"><span data-hero-line className="inline-block">{w}&nbsp;</span></span>))}
          </h1>
          <p data-hero-fade className="max-w-[46ch] text-lg leading-relaxed text-muted">{t('hero.sub')}</p>
          <div data-hero-fade className="flex flex-wrap gap-3">
            <Button as={Link} to="/registro" size="lg">{t('nav.signup')}</Button>
            <Button as={Link} to="/d/centro-ae2" variant="secondary" size="lg">{t('hero.cta3')}</Button>
          </div>
        </div>
        <figure className="relative grid gap-3">
          <div className="border border-line bg-surface/70 p-2 sm:p-4"><Blueprint view="plan" className="block h-auto w-full" /></div>
          {/* la mascota delante del plano, con su bocadillo */}
          <div data-hero-golem className="pointer-events-none absolute -bottom-6 -left-4 z-10 w-[92px] sm:-left-10 sm:w-[132px] lg:w-[150px]">
            <Bubble className="absolute -top-12 left-6 whitespace-nowrap max-sm:hidden">{t('golem.hi')}</Bubble>
            <Golem pose="blueprint" className="h-auto w-full drop-shadow-[0_10px_18px_rgb(0_0_0/.35)]" title={t('golem.alt')} />
          </div>
          <figcaption data-hero-sheet className="cajetin bg-surface">
            <div><small>{t('bp.sheet')}</small><span>{t('bp.sheet.plan')}</span></div>
            <div><small>{t('card.size')}</small><span>{bp.W} × {bp.H} × {bp.D}</span></div>
            <div><small>{t('sim.blocks')}</small><span>{bp.blocks.toLocaleString(lang)}</span></div>
            <div className="hidden sm:grid"><small>Modpack</small><span>ATM10</span></div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// alzado fijado: al bajar, el plano se levanta capa a capa, del fondo del pozo al controlador
const lv = y => (y > 0 ? `+${y}` : y === 0 ? '±0' : `−${-y}`);
function Elevation() {
  const { t, lang } = useI18n(), root = useRef(null), level = useRef(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 900px)' }, ctx => {
      const q = s => root.current.querySelectorAll(s), clip = q('[data-bp=clip]')[0], H = bp.H;
      if (!ctx.conditions.motion) { gsap.set(clip, { attr: { y: -4, height: H + 8 } }); if (level.current) level.current.textContent = lv(bp.Y1); return; }
      gsap.set(q('[data-bp=leader]'), { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(q('[data-bp=label], [data-bp=dot]'), { opacity: 0 });
      const st = { trigger: root.current, start: 'top top', end: '+=160%', scrub: .6, pin: ctx.conditions.wide ? '[data-elev-pin]' : false };
      if (!ctx.conditions.wide) Object.assign(st, { start: 'top 70%', end: 'bottom 60%' });
      const tl = gsap.timeline({ scrollTrigger: st, defaults: { ease: 'none' } }), o = { p: 0 };
      tl.to(clip, { attr: { y: -4, height: H + 8 }, duration: 1 }, 0)
        .to(q('[data-elev-cut]'), { attr: { y1: -2, y2: -2 }, duration: 1 }, 0)
        .to(o, { p: 1, duration: 1, onUpdate: () => { if (level.current) level.current.textContent = lv(Math.round(bp.Y0 + o.p * (bp.H - 1))); } }, 0);
      for (const g of q('[data-bp=call]')) {
        const at = Math.max(0, 1 - +g.dataset.at / H - .02);
        tl.to(g.querySelectorAll('[data-bp=dot], [data-bp=label]'), { opacity: 1, duration: .04 }, at)
          .to(g.querySelector('[data-bp=leader]'), { strokeDashoffset: 0, duration: .08 }, at);
      }
    });
    return () => mm.revert();
  }, []);
  return (
    <section ref={root} className="border-b border-line">
      <div data-elev-pin className="bp-paper">
        <div className="mx-auto grid min-h-dvh max-w-[1320px] items-center gap-10 px-4 py-16 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <div className="grid content-center gap-6">
            <h2 className="max-w-[14ch] text-[clamp(2rem,3.6vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{t('bp.elev.title')}</h2>
            <p className="max-w-[48ch] leading-relaxed text-muted">{t('bp.elev.sub', { n: bp.blocks.toLocaleString(lang), h: bp.H })}</p>
            <div className="grid gap-1" aria-hidden="true">
              <span className="text-[13px] text-muted">{t('bp.level')}</span>
              <span ref={level} className="font-mono text-[clamp(3rem,7vw,5.5rem)] font-medium leading-none tracking-tight text-accent-ink">{lv(bp.Y0)}</span>
            </div>
            <div><Button as={Link} to="/d/centro-ae2" variant="secondary">{t('hero.cta3')}</Button></div>
          </div>
          <div className="relative mx-auto w-full max-w-[640px] border border-line bg-surface/70 p-2 sm:p-4">
            <div className="relative">
              <Blueprint view="section" clipId="elev-clip" className="block h-auto w-full" />
              <svg className="pointer-events-none absolute inset-0 size-full" viewBox={`-7 -4 ${bp.W + 38} ${bp.H + 9}`} aria-hidden="true">
                <line data-elev-cut x1={-6} x2={bp.W + 2} y1={bp.H} y2={bp.H} stroke="var(--accent)" strokeWidth=".16" strokeDasharray="1 .5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// manifiesto: las palabras se encienden a medida que bajas
function Manifesto() {
  const { t } = useI18n(), root = useRef(null);
  useLayoutEffect(() => {
    if (reduce()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-word]', { opacity: .12 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top 75%', end: 'bottom 45%', scrub: true } });
    }, root);
    return () => ctx.revert();
  }, []);
  const words = t('man.text').split(' ');
  return (
    <section ref={root} className="mx-auto max-w-[1240px] px-4 py-32 md:py-44">
      <p className="max-w-[24ch] text-[clamp(2rem,4.6vw,4rem)] font-semibold leading-[1.08] tracking-[-0.035em]" aria-label={t('man.text')}>
        {words.map((w, i) => <span key={i} data-word aria-hidden="true" className={/\d|tick|tier|config|receta|recipe/i.test(w) ? 'text-accent-ink' : ''}>{w} </span>)}
      </p>
    </section>
  );
}

function Tiers() {
  const { t } = useI18n(), [level, setLevel] = useState(3), [tier, setTier] = useState(3), num = useRef(null);
  const ingots = Math.floor(64 * LEVELS[level].perRaw), par = TIERS[tier][1];
  useEffect(() => {
    if (!num.current) return;
    if (reduce()) { num.current.textContent = ingots; return; }
    const o = { v: +num.current.textContent || 0 };
    const tw = gsap.to(o, { v: ingots, duration: .6, ease: 'power2.out', onUpdate: () => { num.current.textContent = Math.round(o.v); } });
    return () => tw.kill();
  }, [ingots]);
  const seg = (items, value, set, label) => (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-lg border border-line p-1">
      {items.map((it, i) => <button key={i} type="button" role="radio" aria-checked={value === i} onClick={() => set(i)} className={`min-h-11 rounded-md px-4 text-sm font-medium ${value === i ? 'bg-accent text-on-accent' : 'text-muted hover:bg-surface-2 hover:text-fg'}`}>{it}</button>)}
    </div>
  );
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-4 py-32 md:py-44">
        <div className="grid max-w-[62ch] gap-4">
          <h2 className="text-[clamp(2rem,3.6vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{t('tiers.title')}</h2>
          <p className="leading-relaxed text-muted">{t('tiers.sub')}</p>
        </div>
        <div className="grid gap-10 md:grid-cols-[1fr_1.1fr]">
          <div className="grid content-start gap-6">
            <div className="grid gap-2"><span className="text-sm font-medium">{t('tiers.level')}</span>{seg(LEVELS.map(l => `×${l.x}`), level, setLevel, t('tiers.level'))}</div>
            <div className="grid gap-2"><span className="text-sm font-medium">{t('tiers.tier')}</span>{seg(TIERS.map(([n]) => n[0].toUpperCase() + n.slice(1)), tier, setTier, t('tiers.tier'))}</div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">{t('tiers.machines')}</span>
              <ol className="flex flex-wrap gap-2">{LEVELS[level].chain.map((m, i) => <li key={m + i} className="rounded-md border border-line px-2.5 py-1.5 text-xs">{m}</li>)}</ol>
            </div>
          </div>
          <div className="grid content-start gap-8 rounded-[6px] border border-line bg-bg p-8">
            <div>
              <span ref={num} className="block font-mono text-[clamp(3.5rem,8vw,6.5rem)] font-medium leading-none tracking-tight text-accent-ink">0</span>
              <span className="text-muted">{t('tiers.ingots')}</span>
            </div>
            <div>
              <div className="grid grid-cols-9 gap-1.5" aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => <span key={i} className={`aspect-square rounded-[4px] transition-colors duration-300 ${i < par ? 'bg-accent' : 'border border-line'}`} />)}
              </div>
              <p className="mt-3"><span className="font-mono text-2xl font-medium">{par}</span> <span className="text-muted">{t('tiers.parallel')}</span></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// los mods: la cadena de fabricación del gólem con sus texturas reales (public/mod) y las descargas
const MOD_STEPS = [[1, ['builder_dust', 'blueprint_alloy', 'golem_core']], [2, ['hard_hat', 'hi_vis_vest', 'builder_golem']], [3, ['binder']], [4, ['blank_blueprint', 'blueprint']]];
const MOD_FILES = [['BuildGolem Link', 'mod.client', '/mod/buildgolem_link-1.2.0+1.21.1.jar'], ['BuildGolem', 'mod.server', '/mod/buildgolem-1.0.0+1.21.1.jar']];
function Mods() {
  const { t } = useI18n(), root = useRef(null);
  useLayoutEffect(() => {
    if (reduce()) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-mod-step]', { y: 40, opacity: 0, duration: .7, ease: 'power3.out', stagger: .12, scrollTrigger: { trigger: '[data-mod-steps]', start: 'top 75%' } });
      gsap.from('[data-mod-icon]', { scale: .3, opacity: 0, duration: .45, ease: 'back.out(2.4)', stagger: .05, scrollTrigger: { trigger: '[data-mod-steps]', start: 'top 70%' } });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} className="bp-paper border-b border-line">
      <div className="mx-auto grid max-w-[1240px] gap-14 px-4 py-32 md:grid-cols-[.85fr_1.15fr] md:py-44">
        <div className="grid content-start gap-6 md:sticky md:top-24">
          <h2 className="text-[clamp(2rem,3.6vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{t('mod.title')}</h2>
          <p className="max-w-[48ch] leading-relaxed text-muted">{t('mod.sub')}</p>
          <ul className="grid gap-3">
            {MOD_FILES.map(([name, note, href]) => (
              <li key={href}>
                <a href={href} download className="group flex items-center gap-4 rounded-[6px] border border-line bg-surface p-4 transition-colors hover:border-accent/70">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[6px] bg-accent text-on-accent"><DownloadSimple size={20} weight="bold" aria-hidden="true" /></span>
                  <span className="grid min-w-0">
                    <span className="font-semibold">{name}</span>
                    <span className="text-sm text-muted">{t(note)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('mod.req')}</p>
        </div>
        <ol data-mod-steps className="grid content-start gap-4">
          {MOD_STEPS.map(([n, icons]) => (
            <li key={n} data-mod-step className="grid gap-5 rounded-[6px] border border-line bg-surface p-6 sm:grid-cols-[13rem_1fr] sm:items-center">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {icons.map((ic, i) => (
                  <span key={ic} className="flex items-center gap-1.5">
                    {i > 0 && <ArrowRight size={14} className="text-muted" />}
                    <img data-mod-icon src={`/mod/${ic}.png`} width="48" height="48" alt="" className="size-12 [image-rendering:pixelated]" />
                  </span>
                ))}
              </div>
              <div className="grid gap-1.5">
                <h3 className="font-semibold">{t(`mod.${n}.t`)}</h3>
                <p className="text-sm leading-relaxed text-muted">{t(`mod.${n}.d`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Agents({ list }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(0);
  const items = AGENTS.map(n => list.find(a => a.name === n)).filter(Boolean);
  return (
    <section className="mx-auto grid max-w-[1240px] gap-12 px-4 py-32 md:py-48">
      <div className="grid max-w-[60ch] gap-4">
        <h2 className="text-[clamp(2rem,3.6vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{t('agents.title')}</h2>
        <p className="leading-relaxed text-muted">{t('agents.sub')}</p>
      </div>
      <div className="flex flex-col gap-2 md:h-[420px] md:flex-row">
        {items.map((a, i) => {
          const on = open === i;
          return (
            <button key={a.name} type="button" onMouseEnter={() => setOpen(i)} onFocus={() => setOpen(i)} onClick={() => setOpen(i)} aria-expanded={on}
              className={`group relative flex overflow-hidden rounded-[6px] border text-left transition-[flex-grow,background-color,border-color] duration-500 ease-out md:min-w-0 ${on ? 'border-accent/60 bg-surface md:grow-[5]' : 'border-line bg-surface-2/60 md:grow'}`}>
              <div className="flex w-full flex-col justify-between gap-6 p-5">
                <span className={`font-medium ${on ? '' : 'md:[writing-mode:vertical-rl] md:rotate-180'}`}>{a.title?.[lang] || a.name}</span>
                {on && <span className="max-w-[44ch] text-sm leading-relaxed text-muted">{a.description}</span>}
                {on && <span className="font-mono text-xs text-accent-ink">{a.tools.join(' · ')}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Byok({ providers }) {
  const { t, lang } = useI18n();
  const free = providers.filter(p => p.free && !p.custom);
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-4 py-32 md:grid-cols-[.9fr_1.1fr] md:py-44">
        <div className="grid content-start gap-5">
          <h2 className="text-[clamp(2rem,3.6vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{t('byok.title')}</h2>
          <p className="max-w-[52ch] leading-relaxed text-muted">{t('byok.sub')}</p>
          <div><Button as={Link} to="/guia/ia-gratis" variant="ghost">{t('byok.guide')}</Button></div>
        </div>
        <ul className="grid grid-flow-dense gap-3 sm:grid-cols-2">
          {free.map((p, i) => (
            <li key={p.key} className={`grid content-between gap-4 rounded-[6px] border border-line bg-bg p-5 ${free.length % 2 && i === 0 ? 'sm:col-span-2' : ''}`}>
              <span className="font-medium">{p.name}</span>
              <span className="text-sm leading-relaxed text-muted">{p.free[lang]}</span>
              {p.keyUrl && <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent-ink hover:underline">{new URL(p.keyUrl).host}<ArrowSquareOut size={14} aria-hidden="true" /></a>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Gallery({ designs }) {
  const { t } = useI18n(), root = useRef(null);
  useLayoutEffect(() => {
    if (reduce() || !designs.length) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-card]').forEach(el => gsap.fromTo(el, { scale: .9, opacity: .25, y: 40 }, { scale: 1, opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 55%', scrub: true } }));
    }, root);
    return () => ctx.revert();
  }, [designs]);
  if (!designs.length) return null;
  return (
    <section ref={root} className="mx-auto grid max-w-[1240px] gap-10 px-4 py-32 md:py-48">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-[clamp(2rem,3.6vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{t('gallery.title')}</h2>
        <Link to="/galeria" className="text-sm text-accent-ink hover:underline">{t('nav.gallery')}</Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{designs.slice(0, 4).map(d => <div key={d.id} data-card><DesignCard d={d} to={`/d/${d.slug}`} /></div>)}</div>
    </section>
  );
}

function Cta() {
  const { t } = useI18n();
  const words = t('cta.title').split(' '), mid = Math.ceil(words.length / 2);
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-32 md:pb-48">
      <div className="grid gap-8 rounded-[6px] border border-line bg-surface px-6 py-16 md:px-14 md:py-24">
        <h2 className="max-w-[22ch] text-[clamp(2.2rem,4.4vw,4rem)] font-semibold leading-[1.05] tracking-[-0.035em]">
          {words.slice(0, mid).join(' ')}{' '}
          <span className="mx-1 inline-block h-[0.8em] w-[2.4em] rounded-full bg-cover bg-center align-middle" style={{ backgroundImage: 'url(/shots/pill-ae2.webp)' }} aria-hidden="true" />{' '}
          {words.slice(mid).join(' ')}
        </h2>
        <div><Button as={Link} to="/registro">{t('cta.button')}</Button></div>
      </div>
    </section>
  );
}

export default function Landing() {
  const [agents, setAgents] = useState([]), [providers, setProviders] = useState([]), [designs, setDesigns] = useState([]);
  useEffect(() => {
    api('/agents').then(setAgents).catch(() => {});
    api('/providers').then(setProviders).catch(() => {});
    api('/gallery').then(setDesigns).catch(() => {});
  }, []);
  useEffect(() => { ScrollTrigger.refresh(); }, [agents, providers, designs]);
  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <Nav floating />
      <main id="main">
        <Hero />
        <Assembly />
        <Manifesto />
        <Elevation />
        <Tiers />
        <Mods />
        {agents.length > 0 && <Agents list={agents} />}
        {providers.length > 0 && <Byok providers={providers} />}
        <Gallery designs={designs} />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
