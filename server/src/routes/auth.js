// Cuentas: registro, verificación de email, entrada (contraseña, Google, Discord), contraseña olvidada, perfil y borrado.
import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { createHash } from 'node:crypto';
import { one, all, run, audit } from '../db.js';
import { hashPassword, verifyPassword, DUMMY_HASH, sha256, token, id, rateLimit, EMAIL_RE } from '../security.js';
import { body, str, bad, clientIp, requireUser, publicUser, hasPassword, NO_PASSWORD, HttpError, SESSION_COOKIE, SESSION_LIFE, sessionCookie } from '../http.js';
import { SECURE_COOKIES, PUBLIC_URL, OAUTH } from '../config.js';
import { sendMail, linkFor } from '../mail.js';

const LANGS = ['es', 'en'], H = 3600_000;
const TTL = { verify: 24 * H, reset: H };
export const auth = new Hono();

function startSession(c, userId, remember = true) {
  const old = getCookie(c, SESSION_COOKIE);
  if (old) run('DELETE FROM sessions WHERE hash = ?', sha256(old));                // rotación: nunca se reutiliza una sesión previa
  const t = token(), now = Date.now();
  run('INSERT INTO sessions (hash, user_id, created, expires, ip, ua, remember) VALUES (?, ?, ?, ?, ?, ?, ?)', sha256(t), userId, now, now + (remember ? SESSION_LIFE.remember : SESSION_LIFE.short), clientIp(c), (c.req.header('user-agent') || '').slice(0, 200), remember ? 1 : 0);
  sessionCookie(c, t, remember);
}
const limited = (c, email) => !rateLimit('ip:' + clientIp(c)) || (email && !rateLimit('email:' + email));
const handleOf = name => name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'jugador';
const uniqueHandle = name => { let h = handleOf(name); while (one('SELECT 1 FROM users WHERE handle = ?', h)) h = `${handleOf(name).slice(0, 19)}-${Math.floor(Math.random() * 9000 + 1000)}`; return h; };
const userById = uid => one('SELECT * FROM users WHERE id = ?', uid);
const me = u => u && { ...publicUser(u), identities: all('SELECT provider FROM identities WHERE user_id = ?', u.id).map(r => r.provider) };

// enlace de un solo uso: en la base solo queda su sha256; uno nuevo anula los anteriores del mismo tipo
async function mailToken(u, kind) {
  const t = token();
  run('DELETE FROM email_tokens WHERE user_id = ? AND kind = ?', u.id, kind);
  run('INSERT INTO email_tokens (hash, user_id, kind, email, created, expires) VALUES (?, ?, ?, ?, ?, ?)', sha256(t), u.id, kind, u.email, Date.now(), Date.now() + TTL[kind]);
  try { await sendMail(u.email, kind, u.lang, linkFor(kind, t)); } catch (e) { console.error('correo', kind, e.message); throw new HttpError(502, 'No se ha podido enviar el correo. Prueba en unos minutos.'); }
}
function takeToken(raw, kind) {
  const row = one('SELECT * FROM email_tokens WHERE hash = ? AND kind = ?', sha256(String(raw || '')), kind);
  if (!row || row.expires < Date.now()) throw new HttpError(400, 'El enlace no es válido o ha caducado. Pide otro.');
  run('DELETE FROM email_tokens WHERE hash = ?', row.hash);
  const u = userById(row.user_id);
  if (!u || u.email !== row.email) throw new HttpError(400, 'El enlace no es válido o ha caducado. Pide otro.');
  return u;
}

auth.post('/register', async c => {
  const b = await body(c);
  const email = str(b.email, 'email', 5, 254).toLowerCase(), name = str(b.name, 'nombre', 2, 40);
  const pass = typeof b.password === 'string' ? b.password : '';
  if (!EMAIL_RE.test(email)) bad('Email no válido');
  if (pass.length < 10 || pass.length > 200) bad('La contraseña necesita al menos 10 caracteres');
  if (b.accept !== true) bad('Acepta los términos y confirma que tienes 14 años o más (o permiso de tus padres)');
  if (limited(c, email)) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
  if (one('SELECT 1 FROM users WHERE email = ?', email)) bad('Ya hay una cuenta con ese email');
  const uid = id();
  run('INSERT INTO users (id, email, name, handle, pass, lang, created) VALUES (?, ?, ?, ?, ?, ?, ?)', uid, email, name, uniqueHandle(name), await hashPassword(pass), LANGS.includes(b.lang) ? b.lang : 'es', Date.now());
  startSession(c, uid, b.remember !== false);
  audit(uid, 'register', clientIp(c), { terms: 'aceptados' });
  const u = userById(uid);
  await mailToken(u, 'verify').catch(() => {});                                   // la cuenta vale igual; se puede reenviar desde la app
  return c.json({ user: me(u) }, 201);
});

auth.post('/login', async c => {
  const b = await body(c), email = String(b.email || '').trim().toLowerCase(), pass = String(b.password || '');
  if (limited(c, email)) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
  const u = one('SELECT * FROM users WHERE email = ?', email);
  const ok = await verifyPassword(pass, hasPassword(u) ? u.pass : DUMMY_HASH);
  if (!u || !ok || !hasPassword(u)) {
    audit(u?.id || null, 'login_failed', clientIp(c), { email });
    throw new HttpError(401, u && !hasPassword(u) ? 'Esta cuenta entra con Google o Discord.' : 'Email o contraseña incorrectos');
  }
  startSession(c, u.id, b.remember !== false);
  audit(u.id, 'login', clientIp(c));
  return c.json({ user: me(u) });
});

auth.post('/logout', c => {
  const t = getCookie(c, SESSION_COOKIE);
  if (t) run('DELETE FROM sessions WHERE hash = ?', sha256(t));
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

auth.get('/me', c => c.json({ user: me(c.get('user')) }));

auth.patch('/me', async c => {
  const u = requireUser(c, 'write'), b = await body(c);
  if (b.name != null) run('UPDATE users SET name = ? WHERE id = ?', str(b.name, 'nombre', 2, 40), u.id);
  if (b.lang != null) { if (!LANGS.includes(b.lang)) bad('Idioma no válido'); run('UPDATE users SET lang = ? WHERE id = ?', b.lang, u.id); }
  return c.json({ user: me(userById(u.id)) });
});

// derecho de acceso y portabilidad: todo lo de la cuenta en un JSON (sin secretos: ni hash de contraseña, ni claves, ni tokens)
auth.get('/export', c => {
  const u = requireUser(c, 'read');
  if (u.via !== 'session') throw new HttpError(403, 'Solo desde la web');
  const q = (sql, ...a) => all(sql, ...a);
  const data = {
    exported: new Date().toISOString(), service: 'BuildGolem',
    account: { ...publicUser(u), created: new Date(u.created).toISOString() },
    identities: q('SELECT provider, email, created FROM identities WHERE user_id = ?', u.id),
    sessions: q('SELECT created, expires, ip, ua, remember FROM sessions WHERE user_id = ?', u.id),
    aiKeys: q('SELECT provider, label, last4, base_url, model, tool_mode, is_default, created FROM provider_keys WHERE user_id = ?', u.id),
    tokens: q('SELECT name, scopes, created, last_used FROM pats WHERE user_id = ?', u.id),
    workspaces: q('SELECT id, name, source, source_ref, mc_version, loader, status, bytes, stats, created FROM workspaces WHERE user_id = ?', u.id),
    designs: q('SELECT id, title, slug, summary, visibility, workspace_id, size, blocks, created, updated, data FROM designs WHERE user_id = ?', u.id).map(d => ({ ...d, data: JSON.parse(d.data), size: d.size && JSON.parse(d.size) })),
    chats: q('SELECT design_id, messages, updated FROM chats WHERE user_id = ?', u.id).map(x => ({ ...x, messages: JSON.parse(x.messages) })),
    securityLog: q('SELECT action, ip, at, meta FROM audit WHERE user_id = ? ORDER BY at DESC', u.id),
  };
  audit(u.id, 'data_export', clientIp(c));
  c.header('Content-Disposition', `attachment; filename="craftometry-${u.handle}.json"`);
  return c.json(data);
});

// ── verificación de email ──
auth.post('/verify', async c => {
  const b = await body(c);
  if (!rateLimit('verify:' + clientIp(c), 30)) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
  const u = takeToken(b.token, 'verify');
  run('UPDATE users SET verified = 1 WHERE id = ?', u.id);
  audit(u.id, 'email_verified', clientIp(c));
  return c.json({ ok: true, user: c.get('user')?.id === u.id ? me(userById(u.id)) : null });
});
auth.post('/verify/resend', async c => {
  const u = requireUser(c, 'write');
  if (u.verified) return c.json({ ok: true, already: true });
  if (!rateLimit('resend:' + u.id, 3, 15 * 60_000)) throw new HttpError(429, 'Ya te hemos enviado varios correos. Espera unos minutos.');
  await mailToken(u, 'verify');
  return c.json({ ok: true });
});

// ── contraseña olvidada: la respuesta es la misma exista o no la cuenta ──
auth.post('/forgot', async c => {
  const b = await body(c), email = String(b.email || '').trim().toLowerCase();
  if (limited(c, email)) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
  const u = EMAIL_RE.test(email) && one('SELECT * FROM users WHERE email = ?', email);
  if (u) { audit(u.id, 'reset_requested', clientIp(c)); await mailToken(u, 'reset').catch(e => console.error(e.message)); }
  return c.json({ ok: true });
});
auth.post('/reset', async c => {
  const b = await body(c), pass = typeof b.password === 'string' ? b.password : '';
  if (pass.length < 10 || pass.length > 200) bad('La contraseña necesita al menos 10 caracteres');
  if (!rateLimit('reset:' + clientIp(c), 20)) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
  const u = takeToken(b.token, 'reset');
  run('UPDATE users SET pass = ?, verified = 1 WHERE id = ?', await hashPassword(pass), u.id);   // el enlace prueba que el email es suyo
  run('DELETE FROM sessions WHERE user_id = ?', u.id);
  run("DELETE FROM email_tokens WHERE user_id = ? AND kind = 'reset'", u.id);
  startSession(c, u.id);
  audit(u.id, 'password_reset', clientIp(c));
  return c.json({ user: me(userById(u.id)) });
});

auth.post('/password', async c => {
  const u = requireUser(c, 'write'), b = await body(c);
  if (u.via !== 'session') throw new HttpError(403, 'Solo desde la web');
  if (hasPassword(u) && !(await verifyPassword(String(b.current || ''), u.pass))) throw new HttpError(401, 'La contraseña actual no es correcta');
  if (String(b.next || '').length < 10 || String(b.next).length > 200) bad('La contraseña nueva necesita al menos 10 caracteres');
  run('UPDATE users SET pass = ? WHERE id = ?', await hashPassword(b.next), u.id);
  run('DELETE FROM sessions WHERE user_id = ?', u.id);                            // cierra todas las sesiones
  startSession(c, u.id);
  audit(u.id, 'password_changed', clientIp(c));
  return c.json({ ok: true });
});

auth.delete('/me', async c => {
  const u = requireUser(c, 'write'), b = await body(c);
  const ok = u.via === 'session' && (hasPassword(u) ? await verifyPassword(String(b.password || ''), u.pass) : String(b.email || '').trim().toLowerCase() === u.email);
  if (!ok) throw new HttpError(401, hasPassword(u) ? 'Confirma con tu contraseña' : 'Escribe tu email para confirmar');
  run('DELETE FROM users WHERE id = ?', u.id);                                    // en cascada: sesiones, claves, tokens, diseños, chats, identidades
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  audit(null, 'account_deleted', clientIp(c), { user: u.id });
  return c.json({ ok: true });
});

// ── Google y Discord (OAuth 2 con state en cookie y PKCE en Google) ──
const PROVIDERS = {
  google: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', scope: 'openid email profile', pkce: true,
    async profile(at, f) {
      const p = await (await f('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${at}` }, signal: AbortSignal.timeout(10_000) })).json();
      return { subject: String(p.sub || ''), email: String(p.email || '').toLowerCase(), verified: p.email_verified === true, name: p.name || p.given_name || '' };
    },
  },
  discord: {
    authorize: 'https://discord.com/oauth2/authorize', token: 'https://discord.com/api/oauth2/token', scope: 'identify email', pkce: false,
    async profile(at, f) {
      const p = await (await f('https://discord.com/api/users/@me', { headers: { authorization: `Bearer ${at}` }, signal: AbortSignal.timeout(10_000) })).json();
      return { subject: String(p.id || ''), email: String(p.email || '').toLowerCase(), verified: p.verified === true, name: p.global_name || p.username || '' };
    },
  },
};
const OAUTH_COOKIE = 'cm_oauth';
const enabled = k => !!(OAUTH[k]?.id && OAUTH[k]?.secret);
const callbackUrl = k => `${PUBLIC_URL}/api/auth/oauth/${k}/callback`;
const safeNext = n => (typeof n === 'string' && /^\/(?!\/)[\w\-/.%?=&]*$/.test(n) ? n : '/app');
const b64url = buf => buf.toString('base64url');
export const oauthDeps = { fetch: (...a) => fetch(...a) };                       // los tests lo cambian

auth.get('/providers', c => c.json(Object.fromEntries(Object.keys(PROVIDERS).map(k => [k, enabled(k)]))));

auth.get('/oauth/:provider', c => {
  const k = c.req.param('provider'), p = PROVIDERS[k];
  if (!p || !enabled(k)) return c.redirect('/entrar?error=oauth_off');
  const state = token(), verifier = token(), next = safeNext(c.req.query('next')), rem = c.req.query('remember') === '0' ? '0' : '1';
  setCookie(c, OAUTH_COOKIE, `${k}|${state}|${verifier}|${next}|${rem}`, { httpOnly: true, secure: SECURE_COOKIES, sameSite: 'Lax', path: '/api/auth/oauth', maxAge: 600 });
  const q = new URLSearchParams({ client_id: OAUTH[k].id, redirect_uri: callbackUrl(k), response_type: 'code', scope: p.scope, state });
  if (p.pkce) { q.set('code_challenge', b64url(createHash('sha256').update(verifier).digest())); q.set('code_challenge_method', 'S256'); q.set('prompt', 'select_account'); }
  return c.redirect(`${p.authorize}?${q}`);
});

auth.get('/oauth/:provider/callback', async c => {
  const k = c.req.param('provider'), p = PROVIDERS[k], fail = why => { deleteCookie(c, OAUTH_COOKIE, { path: '/api/auth/oauth' }); return c.redirect(`/entrar?error=${why}`); };
  const [ck, state, verifier, next, rem] = String(getCookie(c, OAUTH_COOKIE) || '').split('|');
  if (!p || !enabled(k) || ck !== k || !state || c.req.query('state') !== state) return fail('oauth_state');
  if (c.req.query('error') || !c.req.query('code')) return fail('oauth_cancel');
  if (!rateLimit('oauth:' + clientIp(c), 30)) return fail('oauth_busy');
  let prof;
  try {
    const form = new URLSearchParams({ client_id: OAUTH[k].id, client_secret: OAUTH[k].secret, code: c.req.query('code'), redirect_uri: callbackUrl(k), grant_type: 'authorization_code' });
    if (p.pkce) form.set('code_verifier', verifier);
    const r = await oauthDeps.fetch(p.token, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: form, signal: AbortSignal.timeout(10_000) });
    const tk = await r.json();
    if (!r.ok || !tk.access_token) throw new Error(`token ${r.status}`);
    prof = await p.profile(tk.access_token, oauthDeps.fetch);
  } catch (e) { console.error('oauth', k, e.message); return fail('oauth_failed'); }
  if (!prof.subject) return fail('oauth_failed');

  let u = one('SELECT u.* FROM identities i JOIN users u ON u.id = i.user_id WHERE i.provider = ? AND i.subject = ?', k, prof.subject);
  const cur = c.get('user');
  if (cur?.via === 'session') {                                                    // con sesión abierta: vincular a esta cuenta
    if (u && u.id !== cur.id) return fail('oauth_taken');
    if (!u) { run('INSERT INTO identities (provider, subject, user_id, email, created) VALUES (?, ?, ?, ?, ?)', k, prof.subject, cur.id, prof.email, Date.now()); audit(cur.id, 'identity_linked', clientIp(c), { via: k }); u = userById(cur.id); }
  }
  if (!u) {
    if (!EMAIL_RE.test(prof.email)) return fail('oauth_noemail');
    const existing = one('SELECT * FROM users WHERE email = ?', prof.email);
    if (existing) {
      // solo se une a una cuenta existente si el proveedor confirma el email; si esa cuenta no estaba verificada,
      // quien la creó no probó que el email era suyo: se anulan su contraseña y sus sesiones (evita la cuenta preparada de antemano)
      if (!prof.verified) return fail('oauth_unverified');
      if (!existing.verified) { run('UPDATE users SET pass = ?, verified = 1 WHERE id = ?', NO_PASSWORD, existing.id); run('DELETE FROM sessions WHERE user_id = ?', existing.id); }
      u = userById(existing.id);
    } else {
      const uid = id(), name = (prof.name || prof.email.split('@')[0]).slice(0, 40).padEnd(2, '_');
      const lang = (c.req.header('accept-language') || '').toLowerCase().startsWith('en') ? 'en' : 'es';
      run('INSERT INTO users (id, email, name, handle, pass, lang, created, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', uid, prof.email, name, uniqueHandle(name), NO_PASSWORD, lang, Date.now(), prof.verified ? 1 : 0);
      audit(uid, 'register', clientIp(c), { via: k, terms: 'aceptados al continuar' });
      u = userById(uid);
    }
    run('INSERT INTO identities (provider, subject, user_id, email, created) VALUES (?, ?, ?, ?, ?)', k, prof.subject, u.id, prof.email, Date.now());
  }
  if (prof.verified && prof.email === u.email && !u.verified) run('UPDATE users SET verified = 1 WHERE id = ?', u.id);
  deleteCookie(c, OAUTH_COOKIE, { path: '/api/auth/oauth' });
  startSession(c, u.id, rem !== '0');
  audit(u.id, 'login', clientIp(c), { via: k });
  return c.redirect(safeNext(next));
});

// desvincular un proveedor: solo si queda otra forma de entrar
auth.delete('/identities/:provider', c => {
  const u = requireUser(c, 'write'), k = c.req.param('provider');
  const n = all('SELECT provider FROM identities WHERE user_id = ?', u.id).length;
  if (!hasPassword(u) && n <= 1) bad('Pon una contraseña antes de quitar tu única forma de entrar');
  run('DELETE FROM identities WHERE user_id = ? AND provider = ?', u.id, k);
  return c.json({ user: me(userById(u.id)) });
});
