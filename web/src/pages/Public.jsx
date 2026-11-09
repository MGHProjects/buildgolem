// Páginas públicas: galería, diseño por enlace, guía de claves gratis, privacidad y términos.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowSquareOut, MagnifyingGlass } from '@phosphor-icons/react';
import { useI18n } from '../i18n.jsx';
import { api } from '../api.js';
import { Nav, Footer, Button, Loading, ErrorNote, DesignCard, AppShell, useAuth } from '../ui.jsx';
import Simulator from '../sim/Simulator.jsx';
import { LEGAL, OWNER, UPDATED } from './legal-content.js';
import Golem, { Bubble } from '../golem/Golem.jsx';

// con sesión, las páginas públicas van dentro del armazón de la app; sin sesión, con la barra pública
function Page({ title, children, width = 'max-w-[1240px]' }) {
  const { user } = useAuth();
  if (user) return <AppShell title={title}>{children}</AppShell>;
  return <><Nav /><main id="main" className={`bp-paper`}><div className={`mx-auto grid ${width} gap-8 px-4 py-12`}><h1 className="text-3xl font-semibold tracking-tight">{title}</h1>{children}</div></main><Footer /></>;
}

export function Gallery() {
  const { t } = useI18n(), [q, setQ] = useState(''), [list, setList] = useState(null);
  useEffect(() => { const h = setTimeout(() => api(`/gallery?q=${encodeURIComponent(q)}`).then(setList).catch(() => setList([])), 250); return () => clearTimeout(h); }, [q]);
  return (
    <Page title={t('gallery.title')}>
      <div className="relative max-w-md">
        <label htmlFor="gq" className="sr-only">{t('gallery.search')}</label>
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input id="gq" value={q} onChange={e => setQ(e.target.value)} placeholder={t('gallery.search')} className="min-h-10 w-full rounded-[6px] border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-muted" />
      </div>
      {list === null ? <Loading /> : !list.length ? <div className="flex items-end gap-4"><Golem pose="think" className="w-20" title={t('golem.alt')} /><Bubble>{t('gallery.empty')}</Bubble></div>
        : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{list.map(d => <DesignCard key={d.id} d={d} to={`/d/${d.slug}`} />)}</div>}
    </Page>
  );
}

export function PublicDesign() {
  const { slug } = useParams(), { user } = useAuth();
  const [d, setD] = useState(null), [err, setErr] = useState(null);
  useEffect(() => { api(`/d/${slug}`).then(setD).catch(e => setErr(e.message)); }, [slug]);
  if (err) return <><Nav /><main id="main" className="p-8"><ErrorNote error={err} /></main></>;
  if (!d) return <Loading />;
  return <Simulator design={d} mine={false} backTo={user ? '/galeria' : '/'} />;
}

export function FreeApis() {
  const { t, lang } = useI18n(), [p, setP] = useState([]);
  useEffect(() => { api('/providers').then(setP); }, []);
  const steps = lang === 'es'
    ? ['Crea la clave en la web del proveedor (enlace de cada tarjeta).', 'En BuildGolem: Ajustes → Claves de IA → elige el proveedor, pega la clave y el modelo.', 'Pulsa "Probar". Si el modelo no admite herramientas, marca "protocolo JSON": los agentes siguen funcionando.']
    : ['Create the key on the provider site (link on each card).', 'In BuildGolem: Settings → AI keys → pick the provider, paste the key and the model.', 'Press "Test". If the model does not support tools, tick "JSON protocol": agents keep working.'];
  return (
    <Page title={t('free.title')} width="max-w-[920px]">
      <div className="grid gap-10">
        <p className="-mt-4 text-muted">{t('free.sub')}</p>
        <ol className="grid gap-2 text-sm">{steps.map((s, i) => <li key={i} className="grid grid-cols-[28px_1fr] gap-2"><span className="font-mono text-accent-ink">{i + 1}.</span>{s}</li>)}</ol>
        <ul className="grid gap-3">
          {p.map(x => (
            <li key={x.key} className="grid gap-2 rounded-[6px] border border-line bg-surface p-5">
              <div className="flex items-center gap-3"><span className="font-medium">{x.name}</span>{!x.free && <span className="text-xs text-muted">{lang === 'es' ? 'de pago' : 'paid'}</span>}
                {x.keyUrl && <a href={x.keyUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-sm text-accent-ink hover:underline">{new URL(x.keyUrl).host}<ArrowSquareOut size={14} aria-hidden="true" /></a>}</div>
              {x.free && <p className="text-sm leading-relaxed text-muted">{x.free[lang]}</p>}
              {x.models.length > 0 && <p className="font-mono text-xs text-muted">{x.models.join(' · ')}</p>}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">{lang === 'es' ? 'También gratis, en tu propio equipo: Ollama o LM Studio. Para usarlos desde BuildGolem necesitan una URL https pública (un túnel); el servidor no se conecta a direcciones privadas.' : 'Also free, on your own machine: Ollama or LM Studio. To use them from BuildGolem they need a public https URL (a tunnel); the server does not connect to private addresses.'}</p>
      </div>
    </Page>
  );
}

export function Legal({ kind }) {
  const { t, lang } = useI18n(), doc = LEGAL[kind][lang] || LEGAL[kind].es;
  useEffect(() => { if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView(); }, [kind]);
  const Table = ({ tb }) => (
    <div className="overflow-x-auto rounded-[6px] border border-line">
      <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
        <thead className="bg-surface-2 text-xs text-muted"><tr>{tb.head.map(x => <th key={x} scope="col" className="px-3 py-2 font-medium">{x}</th>)}</tr></thead>
        <tbody>{tb.rows.map((r, i) => <tr key={i} className="border-t border-line align-top">{r.map((c, j) => <td key={j} className={`px-3 py-2.5 leading-relaxed ${j === 0 ? 'font-mono text-xs text-fg' : 'text-muted'}`}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
  return (
    <><Nav />
      <main id="main" className="bp-paper">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-14 md:grid-cols-[220px_minmax(0,1fr)] md:gap-14">
          <aside className="md:sticky md:top-20 md:self-start">
            <nav aria-label={doc.title} className="grid gap-0.5 text-[13px]">
              {doc.sections.map(x => <a key={x.id} href={`#${x.id}`} className="rounded-[4px] px-2.5 py-1.5 text-muted hover:bg-ink/[.07] hover:text-fg">{x.h}</a>)}
              <span className="my-2 h-px bg-line" />
              <Link to={kind === 'privacy' ? '/terminos' : '/privacidad'} className="rounded-[4px] px-2.5 py-1.5 text-accent-ink hover:bg-ink/[.07]">{kind === 'privacy' ? t('footer.terms') : t('footer.privacy')}</Link>
            </nav>
          </aside>
          <article className="grid max-w-[76ch] gap-10 rounded-[6px] border border-line bg-surface p-6 md:p-10">
            <header className="grid gap-4">
              <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em]">{doc.title}</h1>
              <p className="text-[17px] leading-relaxed text-muted">{doc.intro}</p>
              <div className="cajetin w-fit">
                <div><small>{t('legal.owner')}</small><span>{OWNER.name}</span></div>
                <div><small>{t('legal.contact')}</small><span><a href={`mailto:${OWNER.email}`} className="hover:text-accent-ink">{OWNER.email}</a></span></div>
                <div><small>{t('legal.updated')}</small><span>{new Date(UPDATED).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
              </div>
            </header>
            {doc.sections.map(x => (
              <section key={x.id} id={x.id} className="grid scroll-mt-20 gap-3">
                <h2 className="text-xl font-semibold tracking-tight">{x.h}</h2>
                {x.table && <Table tb={x.table} />}
                {x.p?.map((q, i) => <p key={i} className="leading-relaxed text-muted">{q}</p>)}
                {x.list && <ul className="grid gap-2.5">{x.list.map((q, i) => <li key={i} className="grid grid-cols-[14px_1fr] gap-2 leading-relaxed text-muted"><span className="mt-[11px] h-px w-2.5 bg-accent" aria-hidden="true" />{q}</li>)}</ul>}
              </section>
            ))}
          </article>
        </div>
      </main><Footer /></>
  );
}

export function NotFound() {
  const { t } = useI18n();
  return (
    <><Nav />
      <main id="main" className="mx-auto grid max-w-[720px] items-end gap-8 px-4 py-24 sm:grid-cols-[auto_1fr]">
        <Golem pose="think" className="w-32" title={t('golem.alt')} />
        <div className="grid justify-items-start gap-4">
          <Bubble>{t('golem.lost')}</Bubble>
          <h1 className="font-mono text-5xl font-semibold">404</h1>
          <Link to="/" className="text-accent-ink hover:underline">BuildGolem</Link>
        </div>
      </main>
    </>
  );
}
