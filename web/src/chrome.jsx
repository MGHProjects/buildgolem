// Piezas de la "carcasa" del navegador: menú contextual propio y aro que sigue al cursor.
// El menú sustituye al del navegador fuera de los campos de texto (ahí sigue el nativo, para pegar y corregir);
// Mayús + clic derecho abre siempre el nativo. Los componentes añaden sus opciones con useContextMenu().open(...).
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowClockwise, LinkSimple, ArrowSquareOut, Copy, Moon, Sun, Translate, House, SquaresFour } from '@phosphor-icons/react';
import { useI18n } from './i18n.jsx';
import { useAuth } from './ui.jsx';

const Ctx = createContext(null);
export const useContextMenu = () => useContext(Ctx);
const copy = s => navigator.clipboard?.writeText(s);
const NATIVE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], .cm-viewer canvas';

function Menu({ menu, close }) {
  const ref = useRef(null), [pos, setPos] = useState({ left: menu.x, top: menu.y });
  const items = menu.items.filter(Boolean);
  useLayoutEffect(() => {                                       // que no se salga de la ventana
    const r = ref.current.getBoundingClientRect(), pad = 8;
    setPos({ left: Math.max(pad, Math.min(menu.x, innerWidth - r.width - pad)), top: Math.max(pad, Math.min(menu.y, innerHeight - r.height - pad)) });
    ref.current.querySelector('[role=menuitem]:not([aria-disabled=true])')?.focus({ preventScroll: true });
  }, [menu]);
  const onKey = e => {
    const list = [...ref.current.querySelectorAll('[role=menuitem]:not([aria-disabled=true])')], i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); list[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); list.at(-1)?.focus(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); close(); }
  };
  return (
    <div ref={ref} role="menu" aria-label={menu.title || 'Menú'} onKeyDown={onKey} onContextMenu={e => e.preventDefault()}
      style={{ left: pos.left, top: pos.top }} className="cm-menu fixed z-[100] grid min-w-[232px] max-w-[320px] gap-px rounded-[6px] border border-line bg-surface p-1 text-[13px] shadow-[0_18px_44px_-18px_rgb(2_10_20/.75)]">
      {menu.title && <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-1"><span className="truncate text-xs font-semibold">{menu.title}</span>{menu.sub && <span className="ml-auto shrink-0 font-mono text-[11px] text-accent-ink">{menu.sub}</span>}</div>}
      {items.map((it, i) => it === '-' ? <div key={i} className="my-1 h-px bg-line" role="separator" />
        : (
          <button key={i} type="button" role="menuitem" aria-disabled={it.disabled || undefined} tabIndex={-1}
            onClick={() => { if (it.disabled) return; close(); it.run(); }}
            className="flex min-h-8 items-center gap-2.5 rounded-[4px] px-2.5 text-left outline-none hover:bg-ink/[.09] focus-visible:bg-ink/[.09] aria-disabled:opacity-45">
            {it.icon && <it.icon size={16} className="shrink-0 text-muted" aria-hidden="true" />}
            <span className="flex-1 truncate">{it.label}</span>
            {it.hint && <span className="font-mono text-[11px] text-muted">{it.hint}</span>}
          </button>
        ))}
    </div>
  );
}

export function ContextMenuProvider({ children }) {
  const { t, lang, setLang } = useI18n(), nav = useNavigate(), auth = useAuth();
  const [menu, setMenu] = useState(null), back = useRef(null);
  const close = useCallback(() => { setMenu(null); back.current?.focus?.({ preventScroll: true }); }, []);
  const open = useCallback((x, y, items, extra = {}) => { back.current = document.activeElement; setMenu({ x, y, items, ...extra }); }, []);

  const pageItems = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    return [
      { label: t('cm.back'), icon: ArrowLeft, run: () => history.back(), disabled: history.length < 2 },
      { label: t('cm.reload'), icon: ArrowClockwise, hint: 'F5', run: () => location.reload() },
      { label: t('cm.copypage'), icon: LinkSimple, run: () => copy(location.href) },
      '-',
      { label: dark ? t('cm.light') : t('cm.dark'), icon: dark ? Sun : Moon, run: () => { const v = dark ? 'light' : 'dark'; document.documentElement.dataset.theme = v; try { localStorage.setItem('cm-theme', v); } catch { /* sin almacenamiento */ } } },
      { label: lang === 'es' ? 'English' : 'Español', icon: Translate, run: () => setLang(lang === 'es' ? 'en' : 'es') },
      '-',
      auth?.user ? { label: t('nav.app'), icon: SquaresFour, run: () => nav('/app') } : { label: t('cm.home'), icon: House, run: () => nav('/') },
    ];
  };

  useEffect(() => {
    const onMenu = e => {
      if (e.shiftKey || e.defaultPrevented || e.target.closest?.(NATIVE)) return;
      e.preventDefault();
      const a = e.target.closest?.('a[href]'), sel = String(getSelection() || '').trim(), items = [];
      if (sel) items.push({ label: t('cm.copy'), icon: Copy, hint: 'Ctrl C', run: () => copy(sel) }, '-');
      if (a) {
        const href = a.href, local = new URL(href).origin === location.origin;
        items.push({ label: t('cm.open'), icon: ArrowSquareOut, run: () => (local ? nav(new URL(href).pathname + new URL(href).search) : open_(href)) },
          { label: t('cm.newtab'), icon: ArrowSquareOut, run: () => open_(href) },
          { label: t('cm.copylink'), icon: LinkSimple, run: () => copy(href) }, '-');
      }
      open(e.clientX, e.clientY, [...items, ...pageItems()], { title: a ? (a.textContent.trim().slice(0, 40) || t('cm.link')) : document.title.split(' · ')[0], sub: a ? null : location.pathname });
    };
    const open_ = href => window.open(href, '_blank', 'noopener,noreferrer');
    addEventListener('contextmenu', onMenu);
    return () => removeEventListener('contextmenu', onMenu);
  }); // se reengancha en cada render para usar el idioma y la sesión actuales

  useEffect(() => {
    if (!menu) return;
    const shut = e => { if (!e.target.closest?.('.cm-menu')) setMenu(null); };
    const quiet = () => setMenu(null);
    addEventListener('pointerdown', shut, true); addEventListener('wheel', quiet, { passive: true }); addEventListener('resize', quiet); addEventListener('blur', quiet);
    return () => { removeEventListener('pointerdown', shut, true); removeEventListener('wheel', quiet); removeEventListener('resize', quiet); removeEventListener('blur', quiet); };
  }, [menu]);

  return <Ctx.Provider value={{ open, close, pageItems }}>{children}{menu && <Menu menu={menu} close={close} />}</Ctx.Provider>;
}

// aro que sigue al cursor con un poco de retraso y se abre sobre lo que se puede pulsar; solo con ratón y con movimiento permitido
export function CursorRing() {
  const ref = useRef(null);
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current, p = { x: -100, y: -100 }, q = { x: -100, y: -100 };
    let raf = 0, hot = false, shown = false, over3d = false;
    const loop = () => {
      q.x += (p.x - q.x) * .22; q.y += (p.y - q.y) * .22;
      el.style.transform = `translate3d(${q.x}px, ${q.y}px, 0)`;
      raf = Math.abs(p.x - q.x) + Math.abs(p.y - q.y) > .1 ? requestAnimationFrame(loop) : 0;
    };
    const move = e => {
      p.x = e.clientX; p.y = e.clientY;
      const t = e.target;
      const nowHot = !!t.closest?.('a, button, [role=button], [role=menuitem], [role=radio], summary, select, label[for], input[type=checkbox], input[type=range]');
      const now3d = !!t.closest?.('.cm-viewer canvas'), text = !!t.closest?.('input:not([type=checkbox]):not([type=range]), textarea');
      if (nowHot !== hot) { hot = nowHot; el.dataset.hot = hot ? '1' : ''; }
      if (now3d !== over3d) { over3d = now3d; el.dataset.view = over3d ? '1' : ''; }
      el.dataset.hide = text ? '1' : '';
      if (!shown) { shown = true; q.x = p.x; q.y = p.y; el.dataset.on = '1'; }
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const leave = () => { shown = false; el.dataset.on = ''; };
    const press = () => { el.dataset.down = '1'; }, release = () => { el.dataset.down = ''; };
    addEventListener('pointermove', move, { passive: true }); document.documentElement.addEventListener('pointerleave', leave);
    addEventListener('pointerdown', press); addEventListener('pointerup', release);
    return () => { cancelAnimationFrame(raf); removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', leave); removeEventListener('pointerdown', press); removeEventListener('pointerup', release); };
  }, []);
  return <div ref={ref} className="cm-ring" aria-hidden="true"><span /></div>;
}
