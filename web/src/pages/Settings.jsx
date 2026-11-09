// Ajustes: cuenta (email, accesos, contraseña), claves de IA (BYOK), tokens personales y borrado de cuenta.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash, Star, Copy, SealCheck, Warning, GoogleLogo, DiscordLogo, Plugs, DownloadSimple } from '@phosphor-icons/react';
import { useI18n } from '../i18n.jsx';
import { api } from '../api.js';
import { AppShell, Button, Field, ErrorNote, IconButton, Switch, useAuth } from '../ui.jsx';

const when = (ts, lang) => (ts ? new Date(ts).toLocaleDateString(lang) : '');
const Block = ({ id, title, sub, children }) => (
  <section id={id} className="grid scroll-mt-20 gap-5 md:grid-cols-[260px_minmax(0,1fr)] md:gap-10">
    <div className="grid content-start gap-1.5"><h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>{sub && <p className="text-sm leading-relaxed text-muted">{sub}</p>}</div>
    <div className="grid content-start gap-4">{children}</div>
  </section>
);
const Card = ({ children, className = '' }) => <div className={`rounded-[6px] border border-line bg-surface p-5 ${className}`}>{children}</div>;

function Account() {
  const { t } = useI18n(), { user, setUser } = useAuth();
  const [name, setName] = useState(user.name), [pw, setPw] = useState({ current: '', next: '' }), [msg, setMsg] = useState(null), [err, setErr] = useState(null), [prov, setProv] = useState({});
  const [sent, setSent] = useState(false);
  useEffect(() => { api('/auth/providers').then(setProv).catch(() => {}); }, []);
  const saveName = async e => { e.preventDefault(); setErr(null); try { setUser((await api('/auth/me', { method: 'PATCH', body: { name } })).user); setMsg(t('set.saved')); } catch (x) { setErr(x.message); } };
  const savePw = async e => { e.preventDefault(); setErr(null); try { await api('/auth/password', { method: 'POST', body: pw }); setPw({ current: '', next: '' }); setUser({ ...user, hasPassword: true }); setMsg(t('set.pwsaved')); } catch (x) { setErr(x.message); } };
  const unlink = async k => { setErr(null); try { setUser((await api(`/auth/identities/${k}`, { method: 'DELETE' })).user); } catch (x) { setErr(x.message); } };
  const resend = async () => { setErr(null); try { await api('/auth/verify/resend', { method: 'POST', body: {} }); setSent(true); } catch (x) { setErr(x.message); } };
  const ICON = { google: GoogleLogo, discord: DiscordLogo };
  return (
    <Block id="cuenta" title={t('set.account')} sub={t('set.account.sub')}>
      <Card className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid gap-0.5"><span className="text-[13px] text-muted">{t('auth.email')}</span><span className="font-mono text-sm">{user.email}</span></span>
          {user.verified ? <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-ok"><SealCheck size={16} weight="fill" aria-hidden="true" />{t('acc.verified')}</span>
            : <span className="ml-auto inline-flex flex-wrap items-center gap-2 text-sm text-accent-ink"><Warning size={16} aria-hidden="true" />{t('acc.unverified')}
              {sent ? <span className="text-muted">{t('acc.verify.sent')}</span> : <Button variant="secondary" size="sm" onClick={resend}>{t('acc.verify.resend')}</Button>}</span>}
        </div>
        <form onSubmit={saveName} className="grid items-end gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_auto]">
          <Field id="nm" label={t('auth.name')} value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={40} required />
          <Button type="submit" variant="secondary" disabled={name.trim() === user.name || name.trim().length < 2}>{t('set.save')}</Button>
        </form>
      </Card>
      {(prov.google || prov.discord || user.identities?.length > 0) && (
        <Card className="grid gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Plugs size={16} aria-hidden="true" />{t('set.access')}</h3>
          <ul className="grid gap-2">
            {['google', 'discord'].filter(k => prov[k] || user.identities?.includes(k)).map(k => {
              const Icon = ICON[k], linked = user.identities?.includes(k);
              return (
                <li key={k} className="flex min-h-11 items-center gap-3 rounded-[6px] border border-line px-3">
                  <Icon size={18} aria-hidden="true" /><span className="text-sm font-medium">{k === 'google' ? 'Google' : 'Discord'}</span>
                  <span className="text-xs text-muted">{linked ? t('set.linked') : t('set.notlinked')}</span>
                  <span className="ml-auto">{linked ? <Button variant="quiet" size="sm" onClick={() => unlink(k)}>{t('set.unlink')}</Button>
                    : <Button variant="secondary" size="sm" as="a" href={`/api/auth/oauth/${k}?next=/app/ajustes`}>{t('set.link')}</Button>}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Card>
        <form onSubmit={savePw} className="grid gap-4">
          <h3 className="text-sm font-semibold">{user.hasPassword ? t('set.changepw') : t('set.setpw')}</h3>
          {!user.hasPassword && <p className="text-sm text-muted">{t('set.setpw.sub')}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {user.hasPassword && <Field id="pc" type="password" label={t('set.currentpw')} value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required />}
            <Field id="pn" type="password" label={t('auth.newpassword')} hint={t('auth.pwhint')} value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" minLength={10} required />
          </div>
          <div><Button type="submit" variant="secondary" disabled={pw.next.length < 10 || (user.hasPassword && !pw.current)}>{t('set.save')}</Button></div>
        </form>
      </Card>
      {msg && <p className="text-sm text-ok" role="status">{msg}</p>}
      <ErrorNote error={err} />
    </Block>
  );
}

function Keys() {
  const { t, lang } = useI18n();
  const [providers, setProviders] = useState([]), [keys, setKeys] = useState([]), [f, setF] = useState({ provider: 'gemini', apiKey: '', model: '', baseUrl: '', toolMode: false });
  const [err, setErr] = useState(null), [test, setTest] = useState({}), [busy, setBusy] = useState(null);
  const load = () => api('/keys').then(setKeys).catch(e => setErr(e.message));
  useEffect(() => { api('/providers').then(p => { setProviders(p); setF(x => ({ ...x, model: p.find(y => y.key === x.provider)?.models[0] || '' })); }); load(); }, []);
  const prov = providers.find(p => p.key === f.provider);
  const add = async e => {
    e.preventDefault(); setErr(null);
    try { await api('/keys', { method: 'POST', body: { ...f, toolMode: f.toolMode ? 'json' : 'native' } }); setF({ ...f, apiKey: '' }); load(); } catch (x) { setErr(x.message); }
  };
  return (
    <Block id="claves" title={t('set.keys')} sub={t('set.keys.sub')}>
      <Card>
        <form onSubmit={add} className="grid gap-4 md:grid-cols-2">
          <Field id="pv" as="select" label={t('set.provider')} value={f.provider} onChange={e => { const p = providers.find(x => x.key === e.target.value); setF({ ...f, provider: e.target.value, model: p?.models[0] || '' }); }}>
            {providers.map(p => <option key={p.key} value={p.key}>{p.name}{p.free ? ` · ${t('set.free')}` : ''}</option>)}
          </Field>
          <Field id="md" label={t('set.model')} value={f.model} onChange={e => setF({ ...f, model: e.target.value })} list="models" required />
          <datalist id="models">{prov?.models.map(m => <option key={m} value={m} />)}</datalist>
          <Field id="ak" type="password" label={t('set.key')} value={f.apiKey} onChange={e => setF({ ...f, apiKey: e.target.value })} autoComplete="off" required className="md:col-span-2"
            hint={prov?.keyUrl ? <>{t('set.getkey')} <a href={prov.keyUrl} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline-offset-2 hover:underline">{new URL(prov.keyUrl).host}</a></> : null} />
          {prov?.custom && <Field id="bu" label={t('set.baseurl')} value={f.baseUrl} onChange={e => setF({ ...f, baseUrl: e.target.value })} placeholder="https://…/v1" required className="md:col-span-2" />}
          <div className="md:col-span-2"><Switch id="tm" checked={f.toolMode} onChange={v => setF({ ...f, toolMode: v })}>{t('set.toolmode')}</Switch></div>
          <div className="md:col-span-2"><Button type="submit" disabled={!f.apiKey || !f.model}>{t('set.add')}</Button></div>
        </form>
      </Card>
      <ErrorNote error={err} />
      {keys.length > 0 && <ul className="grid gap-2">
        {keys.map(k => (
          <li key={k.id} className="grid items-center gap-3 rounded-[6px] border border-line bg-surface px-4 py-3 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-0.5">
              <span className="flex items-center gap-2 text-sm font-medium">{k.label}{k.isDefault && <span className="rounded-[4px] border border-accent/50 px-1.5 py-0.5 text-[11px] text-accent-ink">{t('set.default')}</span>}</span>
              <span className="font-mono text-xs text-muted">…{k.last4} · {k.model}{k.toolMode === 'json' ? ' · JSON' : ''} · {when(k.created, lang)}</span>
              {test[k.id] && <span className={`text-xs ${test[k.id].ok ? 'text-ok' : 'text-danger'}`}>{test[k.id].ok ? `OK · ${test[k.id].reply}` : test[k.id].error}</span>}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="sm" disabled={busy === k.id} onClick={async () => { setBusy(k.id); setTest({ ...test, [k.id]: await api(`/keys/${k.id}/test`, { method: 'POST', body: {} }).catch(x => ({ ok: false, error: x.message })) }); setBusy(null); }}>{busy === k.id ? t('auth.working') : t('set.test')}</Button>
              {!k.isDefault && <IconButton label={t('set.makedefault')} onClick={async () => { await api(`/keys/${k.id}/default`, { method: 'POST', body: {} }); load(); }}><Star size={16} /></IconButton>}
              <IconButton label={t('dash.delete')} onClick={async () => { if (!confirm(t('common.confirmkey'))) return; await api(`/keys/${k.id}`, { method: 'DELETE' }); load(); }}><Trash size={16} /></IconButton>
            </div>
          </li>
        ))}
      </ul>}
    </Block>
  );
}

function Tokens() {
  const { t, lang } = useI18n();
  const [list, setList] = useState([]), [name, setName] = useState(''), [write, setWrite] = useState(false), [fresh, setFresh] = useState(null), [err, setErr] = useState(null), [copied, setCopied] = useState(false);
  const load = () => api('/tokens').then(setList).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const create = async e => { e.preventDefault(); setErr(null); try { setFresh(await api('/tokens', { method: 'POST', body: { name, write } })); setName(''); load(); } catch (x) { setErr(x.message); } };
  return (
    <Block id="tokens" title={t('set.tokens')} sub={t('set.tokens.sub')}>
      <Card>
        <form onSubmit={create} className="grid items-end gap-4 md:grid-cols-[1fr_auto]">
          <Field id="tn" label={t('set.tokenname')} value={name} onChange={e => setName(e.target.value)} required maxLength={60} placeholder={t('set.tokenname.ph')} />
          <Button type="submit" variant="secondary" disabled={!name.trim()}>{t('set.newtoken')}</Button>
          <div className="md:col-span-2"><Switch id="tw" checked={write} onChange={setWrite}>{t('set.tokenwrite')}</Switch></div>
        </form>
      </Card>
      {fresh && <div className="grid gap-2 rounded-[6px] border border-accent/60 bg-accent/[.06] p-4"><span className="text-sm">{t('set.copy')}</span>
        <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-[4px] border border-line bg-bg px-3 py-2 font-mono text-xs">{fresh.token}</code>
          <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(fresh.token); setCopied(true); }}><Copy size={15} aria-hidden="true" />{copied ? t('common.copied') : t('common.copy')}</Button></div></div>}
      <ErrorNote error={err} />
      {list.length > 0 && <ul className="grid gap-2">{list.map(k => (
        <li key={k.id} className="flex items-center gap-3 rounded-[6px] border border-line bg-surface px-4 py-3">
          <span className="grid flex-1 gap-0.5"><span className="text-sm font-medium">{k.name}</span><span className="font-mono text-xs text-muted">{k.scopes} · {when(k.created, lang)} · {t('set.lastused')} {k.last_used ? when(k.last_used, lang) : t('set.never')}</span></span>
          <Button variant="danger" size="sm" onClick={async () => { if (!confirm(t('common.confirmrevoke'))) return; await api(`/tokens/${k.id}`, { method: 'DELETE' }); load(); }}>{t('set.revoke')}</Button>
        </li>))}</ul>}
    </Block>
  );
}

function Danger() {
  const { t } = useI18n(), { user, setUser } = useAuth(), nav = useNavigate();
  const [v, setV] = useState(''), [err, setErr] = useState(null);
  const del = async e => {
    e.preventDefault(); setErr(null);
    if (!confirm(t('set.delete.confirm'))) return;
    try { await api('/auth/me', { method: 'DELETE', body: user.hasPassword ? { password: v } : { email: v } }); setUser(null); nav('/'); } catch (x) { setErr(x.message); }
  };
  return (
    <Block id="borrar" title={t('set.delete')} sub={user.hasPassword ? t('set.delete.sub') : t('set.delete.sub.email')}>
      <div className="flex flex-wrap items-center gap-3 rounded-[6px] border border-line bg-surface p-4">
        <span className="grid flex-1 gap-0.5"><span className="text-sm font-medium">{t('set.export')}</span><span className="text-xs text-muted">{t('set.export.sub')}</span></span>
        <Button variant="secondary" size="sm" as="a" href="/api/auth/export" download><DownloadSimple size={15} aria-hidden="true" />{t('set.export.btn')}</Button>
      </div>
      <form onSubmit={del} className="grid max-w-md gap-4 rounded-[6px] border border-danger/40 p-5">
        <Field id="dp" type={user.hasPassword ? 'password' : 'email'} label={user.hasPassword ? t('auth.password') : t('auth.email')} value={v} onChange={e => setV(e.target.value)} autoComplete={user.hasPassword ? 'current-password' : 'off'} required />
        <ErrorNote error={err} />
        <div><Button type="submit" variant="danger" disabled={!v}>{t('set.delete')}</Button></div>
      </form>
    </Block>
  );
}

export default function Settings() {
  const { t } = useI18n();
  return (
    <AppShell title={t('set.title')}>
      <nav aria-label={t('set.title')} className="flex flex-wrap gap-1 border-b border-line pb-3 text-sm">
        {[['cuenta', 'set.account'], ['claves', 'set.keys'], ['tokens', 'set.tokens'], ['borrar', 'set.delete']].map(([id, k]) => <a key={id} href={`#${id}`} className="rounded-[6px] px-3 py-1.5 text-muted hover:bg-ink/[.07] hover:text-fg">{t(k)}</a>)}
      </nav>
      <div className="grid gap-14"><Account /><Keys /><Tokens /><Danger /></div>
    </AppShell>
  );
}
