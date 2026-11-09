// Vincular el mod BuildGolem Link: el jugador confirma aquí, con su sesión, el código que le enseña Minecraft.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SealCheck, Cube } from '@phosphor-icons/react';
import { useI18n } from '../i18n.jsx';
import { api } from '../api.js';
import { Nav, Button, ErrorNote, Notice } from '../ui.jsx';

export default function LinkDevice() {
  const { t } = useI18n(), [q] = useSearchParams();
  const [code, setCode] = useState((q.get('code') || '').toUpperCase()), [info, setInfo] = useState(null), [err, setErr] = useState(null), [done, setDone] = useState(false), [busy, setBusy] = useState(false);
  const valid = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code);
  useEffect(() => { setInfo(null); if (valid) api(`/link/${code}`).then(setInfo).catch(e => setErr(e.message)); }, [code, valid]);
  const approve = async e => {
    e.preventDefault(); setErr(null); setBusy(true);
    try { await api('/link/approve', { method: 'POST', body: { code } }); setDone(true); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const fmt = v => { const s = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); return s.length > 4 ? `${s.slice(0, 4)}-${s.slice(4)}` : s; };
  return (
    <>
      <Nav />
      <main id="main" className="bp-paper grid min-h-[calc(100dvh-3.5rem)] place-items-center px-4 py-14">
        <div className="grid w-full max-w-[460px] gap-6 border border-line bg-surface p-7 sm:p-9">
          <div className="grid gap-2">
            <Cube size={28} className="text-accent-ink" aria-hidden="true" />
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{t('link.title')}</h1>
            <p className="text-sm leading-relaxed text-muted">{t('link.sub')}</p>
          </div>
          {done ? (
            <Notice icon={<SealCheck size={20} weight="fill" className="text-ok" />}><span className="font-medium">{t('link.done')}</span><span className="text-muted">{t('link.done.sub')}</span></Notice>
          ) : (
            <form onSubmit={approve} className="grid gap-4">
              <label htmlFor="lc" className="text-[13px] font-medium">{t('link.code')}</label>
              <input id="lc" value={code} onChange={e => { setErr(null); setCode(fmt(e.target.value)); }} autoComplete="one-time-code" spellCheck={false} inputMode="text" placeholder="ABCD-2345"
                className="min-h-14 rounded-[6px] border border-line bg-bg px-4 text-center font-mono text-2xl tracking-[.25em] placeholder:text-muted/50 focus:border-ink" />
              {info && <p className="text-sm text-muted">{t('link.asks', { client: info.client })}</p>}
              <ErrorNote error={err} />
              <Button type="submit" size="lg" disabled={!valid || !info || busy}>{busy ? t('auth.working') : t('link.approve')}</Button>
              <p className="text-xs leading-relaxed text-muted">{t('link.scope')} <Link to="/app/ajustes#tokens" className="text-accent-ink underline underline-offset-2">{t('set.tokens')}</Link>.</p>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
