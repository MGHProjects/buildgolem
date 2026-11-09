// Mis diseños y mis modpacks (workspaces), dentro del armazón de la app.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash, UploadSimple, MagnifyingGlass, Plus, Package, ArrowSquareOut, Warning } from '@phosphor-icons/react';
import { useI18n } from '../i18n.jsx';
import Golem, { Bubble } from '../golem/Golem.jsx';
import { api, uploadChunks } from '../api.js';
import { AppShell, Button, Field, ErrorNote, IconButton, DesignCard, Segmented } from '../ui.jsx';

// lámina vacía de la rejilla mientras carga: misma forma que la tarjeta
const Skeleton = () => <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">{[0, 1, 2].map(i => <div key={i} className="aspect-[16/14] animate-pulse rounded-[6px] border border-line bg-surface" />)}</div>;

export function Designs() {
  const { t } = useI18n(), nav = useNavigate();
  const [list, setList] = useState(null), [ws, setWs] = useState([]), [title, setTitle] = useState(''), [wid, setWid] = useState(''), [err, setErr] = useState(null), [open, setOpen] = useState(false);
  useEffect(() => { api('/designs').then(setList).catch(e => setErr(e.message)); api('/workspaces').then(w => { const r = w.filter(x => x.status === 'ready'); setWs(r); setWid(r.find(x => !x.demo)?.id || r[0]?.id || ''); }).catch(() => {}); }, []);
  const create = async e => {
    e.preventDefault(); setErr(null);
    try { const d = await api('/designs', { method: 'POST', body: { title, workspaceId: wid || null } }); nav(`/app/diseno/${d.id}`); } catch (x) { setErr(x.message); }
  };
  const form = (
    <form onSubmit={create} className="grid items-end gap-4 rounded-[6px] border border-line bg-surface p-5 md:grid-cols-[1.4fr_1fr_auto]">
      <Field id="t" label={t('dash.new')} placeholder={t('dash.title.ph')} value={title} onChange={e => setTitle(e.target.value)} required minLength={2} maxLength={80} autoFocus />
      <Field id="w" as="select" label={t('dash.workspace')} value={wid} onChange={e => setWid(e.target.value)} hint={!ws.some(w => !w.demo) ? <Link to="/app/modpacks" className="text-accent-ink underline-offset-2 hover:underline">{t('dash.addmodpack')}</Link> : null}>
        <option value="">{t('dash.noworkspace')}</option>
        {ws.map(w => <option key={w.id} value={w.id}>{w.name}{w.demo ? ` (${t('ws.demo')})` : ''}</option>)}
      </Field>
      <Button type="submit" disabled={title.trim().length < 2}>{t('dash.create')}</Button>
    </form>
  );
  return (
    <AppShell title={t('dash.title')} actions={<Button size="sm" onClick={() => setOpen(!open)} aria-expanded={open}><Plus size={16} aria-hidden="true" />{t('dash.new')}</Button>}>
      {(open || list?.length === 0) && form}
      <ErrorNote error={err} />
      {list === null ? <Skeleton /> : !list.length ? (
        <div className="grid items-end gap-6 rounded-[6px] border border-dashed border-line p-8 sm:grid-cols-[auto_1fr]">
          <Golem pose="think" className="w-24" title={t('golem.alt')} />
          <div className="grid justify-items-start gap-3">
            <Bubble>{t('golem.empty')}</Bubble>
            <p className="max-w-[56ch] leading-relaxed text-muted">{t('dash.empty')}</p>
            <Button as={Link} to="/galeria" variant="secondary">{t('dash.browse')}</Button>
          </div>
        </div>
      ) : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{list.map(d => <DesignCard key={d.id} d={d} to={`/app/diseno/${d.id}`} />)}</div>}
    </AppShell>
  );
}

function ModrinthSearch({ onPick }) {
  const { t } = useI18n(), [q, setQ] = useState(''), [hits, setHits] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const ctl = new AbortController(), timer = setTimeout(() => {
      fetch(`https://api.modrinth.com/v2/search?limit=8&facets=${encodeURIComponent('[["project_type:modpack"]]')}&query=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then(r => r.json()).then(j => setHits(j.hits || [])).catch(() => {});
    }, 300);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [q]);
  return (
    <div className="grid content-start gap-3">
      <h2 className="text-sm font-semibold">{t('ws.modrinth')}</h2>
      <label htmlFor="mr" className="sr-only">{t('ws.modrinth')}</label>
      <div className="relative"><MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input id="mr" value={q} onChange={e => setQ(e.target.value)} placeholder={t('ws.modrinth.ph')} className="min-h-10 w-full rounded-[6px] border border-line bg-bg pl-9 pr-3 text-sm placeholder:text-muted" /></div>
      {hits.length > 0 && <ul className="grid max-h-80 gap-1 overflow-auto rounded-[6px] border border-line p-1">
        {hits.map(h => <li key={h.project_id}><button type="button" onClick={() => onPick(h)} className="grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 rounded-[4px] p-2 text-left hover:bg-ink/[.07]">
          {h.icon_url ? <img src={h.icon_url} alt="" width="40" height="40" className="size-10 rounded-[4px]" /> : <span className="size-10 rounded-[4px] bg-surface-2" />}
          <span className="min-w-0"><span className="block truncate text-sm font-medium">{h.title}</span><span className="block font-mono text-xs text-muted">{h.versions?.slice(-1)[0]}</span></span>
          <span className="text-xs text-accent-ink">{t('ws.import')}</span>
        </button></li>)}
      </ul>}
    </div>
  );
}

function CurseForgeSearch({ onPick }) {
  const { t } = useI18n(), [q, setQ] = useState(''), [hits, setHits] = useState([]), [on, setOn] = useState(null), [err, setErr] = useState(null);
  useEffect(() => { api('/curseforge/status').then(r => setOn(r.enabled)).catch(() => setOn(false)); }, []);
  useEffect(() => {
    if (!on || q.trim().length < 2) { setHits([]); return; }
    const timer = setTimeout(() => api(`/curseforge/search?q=${encodeURIComponent(q)}`).then(h => { setHits(h); setErr(null); }).catch(e => setErr(e.message)), 350);
    return () => clearTimeout(timer);
  }, [q, on]);
  if (on === false) return (
    <div className="grid content-start gap-3">
      <h2 className="text-sm font-semibold">{t('ws.cf')}</h2>
      <p className="flex items-start gap-2 rounded-[6px] border border-line bg-bg p-3 text-sm leading-relaxed text-muted"><Warning size={16} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden="true" />{t('ws.cf.off')}</p>
    </div>
  );
  return (
    <div className="grid content-start gap-3">
      <h2 className="text-sm font-semibold">{t('ws.cf')}</h2>
      <label htmlFor="cfq" className="sr-only">{t('ws.cf')}</label>
      <div className="relative"><MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input id="cfq" value={q} onChange={e => setQ(e.target.value)} placeholder={t('ws.modrinth.ph')} disabled={!on} className="min-h-10 w-full rounded-[6px] border border-line bg-bg pl-9 pr-3 text-sm placeholder:text-muted" /></div>
      <ErrorNote error={err} />
      {hits.length > 0 && <ul className="grid max-h-80 gap-1 overflow-auto rounded-[6px] border border-line p-1">
        {hits.map(h => <li key={h.id}><button type="button" onClick={() => onPick(h)} className="grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 rounded-[4px] p-2 text-left hover:bg-ink/[.07]">
          {h.logo ? <img src={h.logo} alt="" width="40" height="40" className="size-10 rounded-[4px]" /> : <span className="size-10 rounded-[4px] bg-surface-2" />}
          <span className="min-w-0"><span className="block truncate text-sm font-medium">{h.name}</span><span className="block font-mono text-xs text-muted">{h.versions.join(' · ')}</span></span>
          <span className="text-xs text-accent-ink">{t('ws.import')}</span>
        </button></li>)}
      </ul>}
    </div>
  );
}

// mods que el autor no deja descargar a otras apps: enlace a su página y subida del .jar
function Missing({ w, onDone }) {
  const { t } = useI18n(), [busy, setBusy] = useState(false), [err, setErr] = useState(null);
  const up = async files => {
    setErr(null); setBusy(true);
    try {
      for (const f of files) {
        const r = await fetch(`/api/workspaces/${w.id}/jar?name=${encodeURIComponent(f.name)}`, { method: 'POST', headers: { 'x-craftometry': '1', 'content-type': 'application/java-archive' }, body: f });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
      }
      onDone();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-3 rounded-[6px] border border-accent/50 bg-accent/[.05] p-4 md:col-span-4">
      <p className="text-sm"><b className="font-semibold">{t('ws.missing', { n: w.missing.length })}</b> {t('ws.missing.sub')}</p>
      <ul className="grid gap-1 text-sm">{w.missing.slice(0, 30).map(m => (
        <li key={m.fileName} className="flex flex-wrap items-center gap-x-3"><span>{m.name}</span><span className="font-mono text-xs text-muted">{m.fileName}</span>
          {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-ink underline-offset-2 hover:underline">CurseForge<ArrowSquareOut size={13} aria-hidden="true" /></a>}</li>))}</ul>
      <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-[6px] border border-line bg-surface px-3 py-2 text-sm hover:border-ink/60">
        <UploadSimple size={16} aria-hidden="true" />{busy ? t('ws.uploading') : t('ws.missing.upload')}
        <input type="file" accept=".jar" multiple className="sr-only" disabled={busy} onChange={e => up([...e.target.files])} />
      </label>
      <ErrorNote error={err} />
    </div>
  );
}

export function Workspaces() {
  const { t } = useI18n(), file = useRef(null);
  const [list, setList] = useState(null), [name, setName] = useState(''), [mc, setMc] = useState(''), [progress, setProgress] = useState(null), [err, setErr] = useState(null), [picked, setPicked] = useState('');
  const load = () => api('/workspaces').then(setList).catch(e => setErr(e.message));
  useEffect(() => { load(); const i = setInterval(load, 4000); return () => clearInterval(i); }, []);
  const upload = async e => {
    e.preventDefault(); setErr(null);
    const f = file.current?.files?.[0];
    if (!f) return;
    try {
      const w = await api('/workspaces', { method: 'POST', body: { name: name || f.name.replace(/\.(zip|mrpack)$/, ''), source: 'upload', size: f.size, mcVersion: mc || undefined } });
      await uploadChunks(w.id, f, setProgress);
      setProgress(null); setName(''); setPicked(''); file.current.value = ''; load();
    } catch (x) { setErr(x.message); setProgress(null); }
  };
  const modrinth = async h => {
    setErr(null);
    try { await api('/workspaces', { method: 'POST', body: { name: h.title, source: 'modrinth', ref: h.slug, mcVersion: h.versions?.slice(-1)[0] } }); load(); } catch (x) { setErr(x.message); }
  };
  const curseforge = async h => {
    setErr(null);
    try { await api('/workspaces', { method: 'POST', body: { name: h.name.slice(0, 60), source: 'curseforge', ref: h.id, mcVersion: h.versions[0] } }); load(); } catch (x) { setErr(x.message); }
  };
  const [src, setSrc] = useState('curseforge');
  const del = async w => { if (confirm(`${t('dash.delete')}: ${w.name}?`)) { await api(`/workspaces/${w.id}`, { method: 'DELETE' }).catch(x => setErr(x.message)); load(); } };
  return (
    <AppShell title={t('ws.title')}>
      <p className="-mt-4 max-w-[70ch] leading-relaxed text-muted">{t('ws.sub')}</p>
      <div className="grid gap-px overflow-hidden rounded-[6px] border border-line bg-line md:grid-cols-2">
        <form onSubmit={upload} className="grid content-start gap-4 bg-surface p-5">
          <h2 className="text-sm font-semibold">{t('ws.new')}</h2>
          <label htmlFor="wf" className="grid min-h-28 cursor-pointer place-items-center gap-1 rounded-[6px] border border-dashed border-line bg-bg p-4 text-center text-sm hover:border-ink/60">
            <UploadSimple size={22} className="text-accent-ink" aria-hidden="true" />
            <span className="font-medium">{picked || t('ws.file')}</span>
            <span className="text-xs text-muted">.zip · .mrpack</span>
            <input id="wf" ref={file} type="file" accept=".zip,.mrpack" className="sr-only" onChange={e => setPicked(e.target.files?.[0]?.name || '')} />
          </label>
          <p className="text-xs leading-relaxed text-muted">{t('ws.howto')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="wn" label={t('ws.name')} value={name} onChange={e => setName(e.target.value)} maxLength={60} />
            <Field id="mc" label={t('ws.mc')} placeholder="1.21.1" value={mc} onChange={e => setMc(e.target.value)} maxLength={20} />
          </div>
          <div><Button type="submit" disabled={progress != null || !picked}>{progress != null ? `${t('ws.uploading')} ${Math.round(progress * 100)} %` : t('ws.upload')}</Button></div>
          {progress != null && <div className="h-1 overflow-hidden rounded-[2px] bg-surface-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-accent transition-[width]" style={{ width: `${progress * 100}%` }} /></div>}
        </form>
        <div className="grid content-start gap-4 bg-surface p-5">
          <Segmented size="sm" label={t('ws.source')} value={src} onChange={setSrc} items={[['curseforge', 'CurseForge'], ['modrinth', 'Modrinth']]} />
          {src === 'curseforge' ? <CurseForgeSearch onPick={curseforge} /> : <ModrinthSearch onPick={modrinth} />}
        </div>
      </div>
      <ErrorNote error={err} />
      {list === null ? <Skeleton /> : !list.length ? <p className="text-muted">{t('ws.empty')}</p> : (
        <ul className="grid gap-2">
          {list.map(w => (
            <li key={w.id} className="grid items-center gap-3 rounded-[6px] border border-line bg-surface px-4 py-3 md:grid-cols-[auto_1fr_auto_auto]">
              <Package size={20} className="text-muted" aria-hidden="true" />
              <div className="grid min-w-0 gap-0.5">
                <span className="truncate font-medium">{w.name} {w.demo && <span className="text-xs font-normal text-muted">({t('ws.demo')})</span>}</span>
                <span className={`text-sm ${w.status === 'error' ? 'text-danger' : w.status === 'ready' ? 'text-muted' : 'text-accent-ink'}`}>{t(`ws.status.${w.status}`)}{w.progress ? ` · ${w.progress}` : ''}{w.mcVersion ? ` · ${w.mcVersion}` : ''}</span>
                {w.error && <span className="text-sm text-danger">{w.error}</span>}
              </div>
              {w.stats ? <div className="cajetin">
                <div><small>{t('ws.blocks')}</small><span>{w.stats.blocks.toLocaleString()}</span></div>
                <div><small>{t('ws.recipes')}</small><span>{w.stats.recipes.toLocaleString()}</span></div>
                <div><small>{t('ws.mods')}</small><span>{w.stats.mods}</span></div>
              </div> : <span />}
              {!w.demo ? <IconButton label={`${t('dash.delete')} ${w.name}`} onClick={() => del(w)}><Trash size={16} /></IconButton> : <span />}
              {w.missing?.length > 0 && w.status !== 'processing' && <Missing w={w} onDone={load} />}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
export { Link };
