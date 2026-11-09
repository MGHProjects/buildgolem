// Acceso: entrar, crear cuenta, Google y Discord, contraseña olvidada, elegir una nueva y confirmar el email.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogo, DiscordLogo, EnvelopeSimple, SealCheck } from '@phosphor-icons/react';
import { useI18n } from '../i18n.jsx';
import { api } from '../api.js';
import { Nav, Button, Field, ErrorNote, Notice, Switch, useAuth } from '../ui.jsx';

const safeNext = n => (n && /^\/(?!\/)/.test(n) ? n : '/app');
// último método de entrada de este navegador (solo aquí, en localStorage): se marca y, si fue el email, se rellena
const LAST = 'cm-last-login';
const readLast = () => { try { return JSON.parse(localStorage.getItem(LAST)) || null; } catch { return null; } };
const saveLast = v => { try { localStorage.setItem(LAST, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const Badge = () => { const { t } = useI18n(); return <span className="ml-auto rounded-[4px] border border-accent/50 px-1.5 py-0.5 text-[11px] font-medium text-accent-ink">{t('auth.lastused')}</span>; };

function Sheet({ title, sub, children, code }) {
  return (
    <>
      <Nav />
      <main id="main" className="bp-paper grid min-h-[calc(100dvh-3.5rem)] place-items-center px-4 py-14">
        <div className="grid w-full max-w-[440px] border border-line bg-surface">
          <div className="grid gap-2 px-6 pb-2 pt-7 sm:px-8">
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
            {sub && <p className="text-sm leading-relaxed text-muted">{sub}</p>}
          </div>
          <div className="grid gap-5 px-6 pb-7 pt-4 sm:px-8">{children}</div>
          <div className="cajetin border-x-0 border-b-0">
            <div><small>BuildGolem</small><span>{code}</span></div>
            <div><small>1:1</small><span>{new Date().getFullYear()}</span></div>
          </div>
        </div>
      </main>
    </>
  );
}

function Providers({ next, remember, last }) {
  const { t } = useI18n(), [p, setP] = useState(null);
  useEffect(() => { api('/auth/providers').then(setP).catch(() => setP({})); }, []);
  if (!p || (!p.google && !p.discord)) return null;
  const href = k => `/api/auth/oauth/${k}?next=${encodeURIComponent(next)}${remember ? '' : '&remember=0'}`;
  const btn = (k, Icon, label, weight) => p[k] && (
    <Button as="a" href={href(k)} variant="secondary" onClick={() => saveLast({ method: k })} className="w-full !justify-start">
      <Icon size={18} weight={weight} aria-hidden="true" />{label}{last?.method === k && <Badge />}
    </Button>
  );
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">{btn('google', GoogleLogo, t('auth.google'), 'bold')}{btn('discord', DiscordLogo, t('auth.discord'), 'fill')}</div>
      <p className="text-xs leading-relaxed text-muted">{t('auth.oauth.legal')} <Link to="/terminos" className="underline underline-offset-2">{t('footer.terms')}</Link> · <Link to="/privacidad" className="underline underline-offset-2">{t('footer.privacy')}</Link></p>
      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true"><span className="h-px flex-1 bg-line" />{t('auth.or')}<span className="h-px flex-1 bg-line" /></div>
    </div>
  );
}

export default function Auth({ mode }) {
  const { t, lang } = useI18n(), { setUser } = useAuth(), nav = useNavigate(), [q] = useSearchParams();
  const [f, setF] = useState({ email: '', password: '', name: '' }), [err, setErr] = useState(q.get('error') ? t(`auth.err.${q.get('error')}`) : null), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const next = safeNext(q.get('next')), on = k => e => setF({ ...f, [k]: e.target.value });
  const [last] = useState(readLast), [remember, setRemember] = useState(true), [accept, setAccept] = useState(false);
  useEffect(() => { if (mode === 'login' && last?.method === 'email' && last.email) setF(x => ({ ...x, email: x.email || last.email })); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = async fn => { setErr(null); setBusy(true); try { await fn(); } catch (x) { setErr(x.message); } finally { setBusy(false); } };

  // confirmar email: se lanza solo al abrir el enlace
  useEffect(() => {
    if (mode !== 'verify') return;
    go(async () => { const r = await api('/auth/verify', { method: 'POST', body: { token: q.get('token') || '' } }); if (r.user) setUser(r.user); setDone(true); });
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (mode === 'verify') return (
    <Sheet title={t('auth.verify.title')} code="verificar">
      {busy && <p className="text-sm text-muted">{t('auth.working')}</p>}
      {done && <Notice icon={<SealCheck size={20} weight="fill" className="text-ok" />}><span>{t('auth.verify.ok')}</span></Notice>}
      <ErrorNote error={err} />
      {!busy && <Button as={Link} to="/app">{t('nav.app')}</Button>}
    </Sheet>
  );

  if (mode === 'forgot') return (
    <Sheet title={t('auth.forgot.title')} sub={t('auth.forgot.sub')} code="recuperar">
      {done ? <Notice icon={<EnvelopeSimple size={20} className="text-accent-ink" />}><span>{t('auth.forgot.sent')}</span></Notice> : (
        <form onSubmit={e => { e.preventDefault(); go(async () => { await api('/auth/forgot', { method: 'POST', body: { email: f.email } }); setDone(true); }); }} className="grid gap-5">
          <Field id="email" type="email" label={t('auth.email')} value={f.email} onChange={on('email')} autoComplete="email" required />
          <ErrorNote error={err} />
          <Button type="submit" disabled={busy || !f.email}>{busy ? t('auth.working') : t('auth.forgot.send')}</Button>
        </form>
      )}
      <p className="text-sm text-muted"><Link className="text-accent-ink underline-offset-2 hover:underline" to="/entrar">{t('auth.backlogin')}</Link></p>
    </Sheet>
  );

  if (mode === 'reset') return (
    <Sheet title={t('auth.reset.title')} code="restablecer">
      <form onSubmit={e => { e.preventDefault(); go(async () => { const r = await api('/auth/reset', { method: 'POST', body: { token: q.get('token') || '', password: f.password } }); setUser(r.user); nav('/app'); }); }} className="grid gap-5">
        <Field id="password" type="password" label={t('auth.newpassword')} hint={t('auth.pwhint')} value={f.password} onChange={on('password')} autoComplete="new-password" required minLength={10} />
        <ErrorNote error={err} />
        <Button type="submit" disabled={busy || f.password.length < 10}>{busy ? t('auth.working') : t('auth.reset.save')}</Button>
      </form>
    </Sheet>
  );

  const signup = mode === 'signup';
  const submit = e => {
    e.preventDefault();
    go(async () => {
      const r = await api(signup ? '/auth/register' : '/auth/login', { method: 'POST', body: signup ? { ...f, lang, remember, accept } : { email: f.email, password: f.password, remember } });
      saveLast({ method: 'email', email: f.email.trim().toLowerCase() });
      setUser(r.user); nav(next);
    });
  };
  return (
    <Sheet title={signup ? t('auth.signup.title') : t('auth.login.title')} sub={signup ? t('auth.signup.sub') : null} code={signup ? 'registro' : 'entrar'}>
      <Providers next={next} remember={remember} last={signup ? null : last} />
      <form onSubmit={submit} className="grid gap-5" noValidate>
        {signup && <Field id="name" label={t('auth.name')} value={f.name} onChange={on('name')} autoComplete="nickname" required minLength={2} maxLength={40} />}
        <Field id="email" type="email" label={<span className="flex items-center">{t('auth.email')}{!signup && last?.method === 'email' && <Badge />}</span>} value={f.email} onChange={on('email')} autoComplete="email" required />
        <Field id="password" type="password" label={t('auth.password')} hint={signup ? t('auth.pwhint') : null} value={f.password} onChange={on('password')} autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 10 : 1} />
        <div className="-mt-1 flex flex-wrap items-center justify-between gap-2">
          <Switch id="remember" checked={remember} onChange={setRemember}>{t('auth.remember')}</Switch>
          {!signup && <Link to="/recuperar" className="text-[13px] text-accent-ink underline-offset-2 hover:underline">{t('auth.forgot.link')}</Link>}
        </div>
        {signup && (
          <label htmlFor="accept" className="flex items-start gap-2.5 text-[13px] leading-relaxed">
            <input id="accept" type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} required className="mt-0.5 size-4 shrink-0" />
            <span>{t('auth.accept.a')} <Link to="/terminos" className="text-accent-ink underline underline-offset-2">{t('footer.terms')}</Link> {t('auth.accept.b')} <Link to="/privacidad" className="text-accent-ink underline underline-offset-2">{t('footer.privacy')}</Link>{t('auth.accept.c')}</span>
          </label>
        )}
        <ErrorNote error={err} />
        <Button type="submit" disabled={busy || (signup && !accept)}>{busy ? t('auth.working') : signup ? t('auth.signup') : t('auth.login')}</Button>
      </form>
      <p className="text-sm text-muted">{signup ? t('auth.haveaccount') : t('auth.noaccount')} <Link className="text-accent-ink underline-offset-2 hover:underline" to={`${signup ? '/entrar' : '/registro'}${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`}>{signup ? t('auth.login') : t('auth.signup')}</Link></p>
    </Sheet>
  );
}
