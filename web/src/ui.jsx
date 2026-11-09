// Piezas compartidas: sesión, botones, campos, navegación pública, armazón de la app, pie, tarjeta de diseño y el lienzo 3D.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Moon, Sun, Translate, List, X, SquaresFour, Package, Images, Key, GearSix, SignOut, SealCheck, Warning } from '@phosphor-icons/react';
import { api } from './api.js';
import Golem, { GolemMark } from './golem/Golem.jsx';
import { useI18n } from './i18n.jsx';

// ── sesión ──
const AuthCtx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const refresh = () => api('/auth/me').then(r => setUser(r.user)).catch(() => setUser(null));
  useEffect(() => { refresh(); }, []);
  return <AuthCtx.Provider value={{ user, setUser, refresh }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
export function RequireAuth({ children }) {
  const { user } = useAuth(), loc = useLocation();
  if (user === undefined) return <Loading />;
  return user ? children : <Navigate to={`/entrar?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;   // con ?code= de /vincular
}

// ── botones: bloques con canto inferior que se hunde al pulsar (radio 6 px) ──
const BTN = {
  primary: 'bg-accent text-on-accent border border-accent-deep border-b-[3px] hover:brightness-105 active:border-b active:translate-y-[2px]',
  secondary: 'bg-surface text-fg border border-line border-b-[3px] hover:border-ink/50 hover:bg-surface-2 active:border-b active:translate-y-[2px]',
  quiet: 'border border-transparent text-muted hover:text-fg hover:bg-ink/[.08] active:translate-y-px',
  danger: 'bg-surface border border-danger/60 border-b-[3px] text-danger hover:bg-danger/10 active:border-b active:translate-y-[2px]',
};
export function Button({ variant = 'primary', size = 'md', className = '', as: As = 'button', ...p }) {
  const v = BTN[variant === 'ghost' ? 'secondary' : variant];
  const s = size === 'sm' ? 'min-h-8 px-2.5 text-[13px] gap-1.5' : size === 'lg' ? 'min-h-12 px-5 text-[15px] gap-2' : 'min-h-10 px-3.5 text-sm gap-2';
  return <As className={`inline-flex items-center justify-center whitespace-nowrap rounded-[6px] font-semibold transition-[background-color,border-color,color,filter,transform] duration-100 ${s} ${v} ${className}`} {...(As === 'button' && !p.type ? { type: 'button' } : {})} {...p} />;
}
// botón de icono con su nombre en un tooltip (y en aria-label)
export function IconButton({ label, side, active = false, className = '', as: As = 'button', children, ...p }) {
  return (
    <As aria-label={label} {...(As === 'button' && !p.type ? { type: 'button' } : {})} {...p}
      className={`tip-host relative grid size-9 shrink-0 place-items-center rounded-[6px] border transition-colors duration-150 active:translate-y-px ${active ? 'border-accent/70 bg-accent/15 text-accent-ink' : 'border-transparent text-muted hover:border-line hover:bg-ink/[.07] hover:text-fg'} ${className}`}>
      {children}<span className="tip" data-side={side} aria-hidden="true">{label}</span>
    </As>
  );
}
export function Segmented({ items, value, onChange, label, size = 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-[6px] border border-line p-0.5">
      {items.map(([v, l]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`${size === 'sm' ? 'min-h-7 px-2 text-xs' : 'min-h-9 px-3 text-sm'} rounded-[4px] font-medium tabular-nums ${value === v ? 'bg-accent text-on-accent' : 'text-muted hover:bg-ink/[.07] hover:text-fg'}`}>{l}</button>
      ))}
    </div>
  );
}
export function Switch({ checked, onChange, children, id }) {
  return (
    <label htmlFor={id} className="flex min-h-9 cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{children}</span>
      <span className="relative inline-flex">
        <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-5 w-9 rounded-[4px] border border-line bg-surface-2 transition-colors peer-checked:border-accent peer-checked:bg-accent/80 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]" />
        <span className="absolute left-[3px] top-[3px] size-3.5 rounded-[2px] bg-muted transition-transform peer-checked:translate-x-4 peer-checked:bg-on-accent" />
      </span>
    </label>
  );
}

const FIELD = 'min-h-10 w-full rounded-[6px] border border-line bg-surface px-3 text-sm text-fg placeholder:text-muted/80 transition-colors hover:border-ink/50 focus:border-ink';
export function Field({ label, hint, error, id, className = '', ...p }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-medium">{label}</label>
      {p.as === 'select' ? <select id={id} name={id} {...p} as={undefined} className={FIELD} />
        : p.as === 'textarea' ? <textarea id={id} name={id} {...p} as={undefined} className={`${FIELD} py-2`} />
          : <input id={id} name={id} spellCheck={p.type === 'email' ? false : undefined} aria-invalid={error ? true : undefined} {...p} className={FIELD} />}
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}
export function Loading({ label }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-[40vh] place-items-center" role="status">
      <div className="grid justify-items-center gap-2">
        <Golem pose="build" className="h-24 w-auto" />
        <span className="font-pixel text-sm text-muted">{label || t('common.loading')}</span>
      </div>
    </div>
  );
}
export function ErrorNote({ error }) { return error ? <p className="rounded-[6px] border border-danger/40 bg-danger/[.06] px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null; }
export function Notice({ children, tone = 'info', icon }) {
  const c = tone === 'warn' ? 'border-accent/50 bg-accent/[.07]' : 'border-line bg-surface';
  return <div className={`flex items-start gap-3 rounded-[6px] border px-4 py-3 text-sm ${c}`}>{icon}<div className="grid gap-1">{children}</div></div>;
}

// ── tema e idioma ──
export function ThemeToggle({ side }) {
  const { t } = useI18n();
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  const flip = () => { const v = dark ? 'light' : 'dark'; document.documentElement.dataset.theme = v; try { localStorage.setItem('cm-theme', v); } catch { /* sin almacenamiento */ } setDark(!dark); };
  return <IconButton label={t('nav.theme')} side={side} onClick={flip}>{dark ? <Sun size={18} /> : <Moon size={18} />}</IconButton>;
}
export function LangToggle({ side }) {
  const { t, lang, setLang } = useI18n();
  return <IconButton label={t('nav.lang')} side={side} onClick={() => setLang(lang === 'es' ? 'en' : 'es')}><span className="flex items-center gap-1 text-[11px] font-semibold uppercase"><Translate size={15} aria-hidden="true" />{lang === 'es' ? 'en' : 'es'}</span></IconButton>;
}

export const Wordmark = ({ to = '/' }) => (
  <Link to={to} translate="no" className="group inline-flex items-center gap-2 text-[17px] font-bold tracking-tight">
    <GolemMark className="size-7 transition-transform duration-300 group-hover:-rotate-6" />
    <span>Build<span className="text-accent-ink">Golem</span></span>
  </Link>
);

// ── navegación pública (landing, galería, guías) ──
export function Nav({ floating = false }) {
  const { t } = useI18n(), { user } = useAuth();
  const [open, setOpen] = useState(false);
  const links = [['/#flujo', t('nav.how')], ['/galeria', t('nav.gallery')], ['/guia/ia-gratis', t('nav.freeai')]];
  return (
    <header className={floating ? 'fixed inset-x-0 top-3 z-40 px-4' : 'sticky top-0 z-40 border-b border-line bg-bg/92 backdrop-blur'}>
      <a href="#main" className="sr-only rounded-[6px] bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:absolute focus:left-4 focus:top-2">{t('common.skip')}</a>
      <nav className={`mx-auto flex h-14 max-w-[1240px] items-center gap-2 ${floating ? 'rounded-[6px] border border-line bg-surface/90 px-3 backdrop-blur' : 'px-4'}`} aria-label={t('nav.main')}>
        <Wordmark />
        <div className="ml-4 hidden flex-1 items-center gap-1 md:flex">
          {links.map(([to, l]) => to.includes('#') ? <a key={to} href={to} className="rounded-[6px] px-3 py-2 text-sm text-muted hover:text-fg">{l}</a>
            : <NavLink key={to} to={to} className={({ isActive }) => `rounded-[6px] px-3 py-2 text-sm ${isActive ? 'text-fg' : 'text-muted hover:text-fg'}`}>{l}</NavLink>)}
        </div>
        <div className="ml-auto hidden items-center gap-1 md:flex">
          <LangToggle /><ThemeToggle />
          {user ? <Button as={Link} to="/app" className="ml-1">{t('nav.app')}</Button>
            : <><Button variant="quiet" as={Link} to="/entrar">{t('nav.login')}</Button><Button as={Link} to="/registro">{t('nav.signup')}</Button></>}
        </div>
        <button type="button" className="ml-auto grid size-10 place-items-center rounded-[6px] md:hidden" aria-expanded={open} aria-label={t('nav.menu')} onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <List size={20} />}</button>
      </nav>
      {open && (
        <div className="mx-auto mt-2 grid max-w-[1240px] gap-1 rounded-[6px] border border-line bg-surface p-3 md:hidden">
          {links.map(([to, l]) => <a key={to} href={to} onClick={() => setOpen(false)} className="rounded-[6px] px-3 py-3 text-sm">{l}</a>)}
          <div className="flex gap-1"><LangToggle /><ThemeToggle /></div>
          {user ? <Button as={Link} to="/app">{t('nav.app')}</Button> : <><Button variant="secondary" as={Link} to="/entrar">{t('nav.login')}</Button><Button as={Link} to="/registro">{t('nav.signup')}</Button></>}
        </div>
      )}
    </header>
  );
}

// ── armazón de la app: barra lateral con secciones, cuenta abajo; en móvil, cajón ──
export function AppShell({ children, title, actions }) {
  const { t } = useI18n(), { user, setUser } = useAuth(), nav = useNavigate();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  const logout = async () => { await api('/auth/logout', { method: 'POST', body: {} }); setUser(null); nav('/'); };
  const items = [['/app', t('nav.app'), SquaresFour, true], ['/app/modpacks', t('nav.workspaces'), Package], ['/galeria', t('nav.gallery'), Images], ['/guia/ia-gratis', t('nav.freeai'), Key], ['/app/ajustes', t('nav.settings'), GearSix]];
  const side = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between"><Wordmark to="/app" /><button type="button" onClick={() => setOpen(false)} aria-label={t('common.close')} className="grid size-9 place-items-center rounded-[6px] md:hidden"><X size={18} /></button></div>
      <nav aria-label={t('nav.main')} className="grid gap-0.5">
        {items.map(([to, l, Icon, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `group flex min-h-10 items-center gap-3 rounded-[6px] border px-3 text-sm transition-colors ${isActive ? 'border-line bg-surface-2 text-fg' : 'border-transparent text-muted hover:bg-ink/[.06] hover:text-fg'}`}>
            {({ isActive }) => <><Icon size={18} weight={isActive ? 'fill' : 'regular'} className={isActive ? 'text-accent-ink' : ''} aria-hidden="true" />{l}</>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto grid gap-3 border-t border-line pt-4">
        {user && (
          <Link to="/app/ajustes" className="grid grid-cols-[36px_1fr] items-center gap-3 rounded-[6px] p-1 hover:bg-ink/[.06]">
            <span className="grid size-9 place-items-center rounded-[6px] border border-line bg-surface-2 font-mono text-sm uppercase text-accent-ink" aria-hidden="true">{(user.name || user.email)[0]}</span>
            <span className="grid min-w-0">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="flex items-center gap-1 truncate text-xs text-muted">{user.verified ? <SealCheck size={12} weight="fill" className="text-ok" aria-label={t('acc.verified')} /> : <Warning size={12} className="text-accent-ink" aria-label={t('acc.unverified')} />}{user.email}</span>
            </span>
          </Link>
        )}
        <div className="flex items-center gap-1"><LangToggle side="right" /><ThemeToggle side="right" /><Button variant="quiet" size="sm" className="ml-auto" onClick={logout}><SignOut size={16} aria-hidden="true" />{t('nav.logout')}</Button></div>
      </div>
    </div>
  );
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <a href="#main" className="sr-only rounded-[6px] bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50">{t('common.skip')}</a>
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-surface md:block">{side}</aside>
      {open && <div className="fixed inset-0 z-50 md:hidden"><button type="button" aria-label={t('common.close')} className="absolute inset-0 bg-bg/70" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 w-[280px] border-r border-line bg-surface">{side}</aside></div>}
      <div className="bp-paper min-w-0">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-line bg-bg/92 px-4 backdrop-blur md:px-8">
          <button type="button" className="grid size-9 place-items-center rounded-[6px] md:hidden" aria-label={t('nav.menu')} aria-expanded={open} onClick={() => setOpen(true)}><List size={20} /></button>
          {title && <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>}
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>
        {user && !user.verified && <VerifyBanner />}
        <main id="main" className="mx-auto grid w-full max-w-[1180px] gap-10 px-4 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

function VerifyBanner() {
  const { t } = useI18n(), [sent, setSent] = useState(false), [err, setErr] = useState(null);
  const resend = async () => { setErr(null); try { await api('/auth/verify/resend', { method: 'POST', body: {} }); setSent(true); } catch (x) { setErr(x.message); } };
  return (
    <div className="border-b border-accent/40 bg-accent/[.07] px-4 py-2.5 text-sm md:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2"><Warning size={16} className="text-accent-ink" aria-hidden="true" />{t('acc.verify.banner')}</span>
        {sent ? <span className="text-muted">{t('acc.verify.sent')}</span> : <Button variant="secondary" size="sm" onClick={resend}>{t('acc.verify.resend')}</Button>}
        {err && <span className="text-danger">{err}</span>}
      </div>
    </div>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1240px] gap-6 px-4 py-10 text-sm text-muted md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-3">
          <Wordmark />
          <span>{t('footer.notaffiliated')}</span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label={t('footer.nav')}>
          <Link to="/galeria" className="hover:text-fg">{t('nav.gallery')}</Link>
          <Link to="/guia/ia-gratis" className="hover:text-fg">{t('nav.freeai')}</Link>
          <Link to="/privacidad" className="hover:text-fg">{t('footer.privacy')}</Link>
          <Link to="/terminos" className="hover:text-fg">{t('footer.terms')}</Link>
          <Link to="/privacidad#cookies" className="hover:text-fg">{t('footer.cookies')}</Link>
        </nav>
      </div>
    </footer>
  );
}

// tarjeta de diseño: lámina con su cajetín (medidas, autor, visibilidad)
export function DesignCard({ d, to }) {
  const { t } = useI18n();
  return (
    <Link to={to} className="group grid overflow-hidden rounded-[6px] border border-line bg-surface transition-colors hover:border-ink/60">
      <div className="bp-paper relative aspect-[16/10] overflow-hidden border-b border-line">
        <span className="absolute inset-x-[18%] top-1/2 -translate-y-1/2" aria-hidden="true"><span className="cota">{d.size?.join(' × ') || '—'}</span></span>
        <img src={`/shots/${d.slug}.webp`} onError={e => { e.currentTarget.style.display = 'none'; }} alt="" width="640" height="400" loading="lazy" className="relative size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
      </div>
      <div className="grid gap-1.5 px-4 pb-3 pt-3.5">
        <span className="font-medium leading-snug">{d.title}</span>
        {d.summary && <span className="line-clamp-2 text-sm leading-relaxed text-muted">{d.summary}</span>}
      </div>
      <div className="cajetin mx-4 mb-4">
        <div><small>{t('card.size')}</small><span>{d.size?.join(' × ') || '—'}</span></div>
        {d.author ? <div><small>{t('card.author')}</small><span>{d.author.name}</span></div>
          : d.visibility ? <div><small>{t('ed.share')}</small><span>{t(`vis.${d.visibility}`)}</span></div> : null}
      </div>
    </Link>
  );
}

// lienzo 3D: monta el motor sobre un diseño; carga modelos y aspecto (texturas o colores) desde la API
export function DesignViewer({ design, className = '', onReady, onChange }) {
  const ref = useRef(null), { t, lang } = useI18n();
  const [err, setErr] = useState(null), [busy, setBusy] = useState(true);
  useEffect(() => {
    let handle = null, dead = false;
    setBusy(true);
    (async () => {
      try {
        const [{ mountDesign }, { decode }, { setTextureSource }] = await Promise.all([import('@engine/mount.js'), import('./design-format.js'), import('@engine/textures.js')]);
        const M = decode(design.data), refs = [...new Set(Object.values(M.P).flatMap(s => (s.model ? [[].concat(s.model).join('+')] : [])))];
        const MODELS = refs.length ? await api(`/designs/${design.id}/models`, { method: 'POST', body: { refs } }) : {};
        const keys = [...new Set([...Object.values(M.P).flatMap(s => [s.all, s.side, s.top, s.bottom, s.front, s.back].filter(Boolean)), ...Object.values(MODELS).flatMap(els => els.flatMap(e => Object.values(e.faces).map(f => f.texture)))])];
        const look = await api(`/designs/${design.id}/look`, { method: 'POST', body: { keys } });
        setTextureSource(look.mode === 'textures' ? { base: look.base } : { base: look.base, colors: look.colors, open: look.open });
        if (dead) return;
        M.SKY = '#15191d'; // el 3D siempre sobre cianotipo, en los dos temas
        handle = mountDesign(ref.current, M, MODELS, { t: s => s, lang, onChange, loadModels: r => api(`/designs/${design.id}/models`, { method: 'POST', body: { refs: r } }) });
        setBusy(false);
        onReady?.(handle, M, look.mode);
      } catch (e) { setErr(e.message); setBusy(false); }
    })();
    return () => { dead = true; handle?.destroy(); };
  }, [design.id, design.updated]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`${className.includes('absolute') ? '' : 'relative'} bg-bg ${className}`}>
      <div ref={ref} className="absolute inset-0" />
      {busy && !err && <div className="pointer-events-none absolute inset-0"><Loading label={t('sim.loading')} /></div>}
      {err && <div className="absolute inset-0 grid place-items-center p-6 text-sm text-danger" role="alert">{err}</div>}
    </div>
  );
}
