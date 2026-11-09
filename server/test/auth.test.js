// Pruebas de cuentas: verificación de email, contraseña olvidada, entrada con Google (simulado) y la cuenta preparada de antemano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const tmp = mkdtempSync(join(tmpdir(), 'cm-auth-'));
Object.assign(process.env, { DATA_DIR: tmp, CRAFTOMETRY_MASTER_KEY: randomBytes(32).toString('base64'), PUBLIC_URL: 'http://localhost:9', GOOGLE_CLIENT_ID: 'gid', GOOGLE_CLIENT_SECRET: 'gsecret', RESEND_API_KEY: '' });
const { createApp } = await import('../src/app.js');
const { oauthDeps } = await import('../src/routes/auth.js');
const { solve } = await import('../../engine/process.js');

const app = createApp(), H = { 'content-type': 'application/json', 'x-craftometry': '1', origin: 'http://localhost:9' };
const req = (path, opts = {}) => app.request(path, opts);
const post = (path, b, headers = H) => req(path, { method: 'POST', headers, body: JSON.stringify(b) });
const cookieOf = r => r.headers.get('set-cookie')?.split(';')[0];
// sin RESEND_API_KEY el enlace va al log: lo pescamos de ahí
async function mailed(fn) {
  const logs = [], orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try { await fn(); } finally { console.log = orig; }
  const m = logs.join('\n').match(/token=([\w%-]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

test('registro → verificación por enlace de un solo uso; publicar exige email verificado', async () => {
  let reg;
  const tok = await mailed(async () => { reg = await post('/api/auth/register', { email: 'eva@example.com', password: 'una clave larga', name: 'Eva', accept: true }); });
  assert.equal(reg.status, 201);
  const A = { ...H, cookie: cookieOf(reg) };
  assert.equal((await reg.json()).user.verified, false);
  const d = await (await post('/api/designs', { title: 'Mi sala' }, A)).json();
  assert.equal((await req(`/api/designs/${d.id}`, { method: 'PUT', headers: A, body: JSON.stringify({ visibility: 'public' }) })).status, 403);
  assert.ok(tok, 'el enlace de verificación sale en el log');
  assert.equal((await post('/api/auth/verify', { token: 'otro' })).status, 400);
  assert.equal((await post('/api/auth/verify', { token: tok }, A)).status, 200);
  assert.equal((await post('/api/auth/verify', { token: tok })).status, 400);              // solo una vez
  assert.equal((await (await req('/api/auth/me', { headers: A })).json()).user.verified, true);
  assert.equal((await req(`/api/designs/${d.id}`, { method: 'PUT', headers: A, body: JSON.stringify({ visibility: 'public' }) })).status, 200);
});

test('contraseña olvidada: misma respuesta exista o no la cuenta; el cambio cierra las sesiones', async () => {
  const reg = await post('/api/auth/register', { email: 'leo@example.com', password: 'clave original 1', name: 'Leo', accept: true });
  const old = { ...H, cookie: cookieOf(reg) };
  const none = await mailed(async () => assert.equal((await post('/api/auth/forgot', { email: 'nadie@example.com' })).status, 200));
  assert.equal(none, null);
  const tok = await mailed(async () => assert.equal((await post('/api/auth/forgot', { email: 'leo@example.com' })).status, 200));
  assert.ok(tok);
  assert.equal((await post('/api/auth/reset', { token: tok, password: 'corta' })).status, 400);
  const r = await post('/api/auth/reset', { token: tok, password: 'clave nueva y larga' });
  assert.equal(r.status, 200);
  assert.equal((await (await req('/api/auth/me', { headers: old })).json()).user, null);     // la sesión vieja ya no vale
  assert.equal((await post('/api/auth/login', { email: 'leo@example.com', password: 'clave original 1' })).status, 401);
  assert.equal((await post('/api/auth/login', { email: 'leo@example.com', password: 'clave nueva y larga' })).status, 200);
});

function mockGoogle(profile) {
  oauthDeps.fetch = async (url, opts) => {
    if (url.includes('oauth2.googleapis.com/token')) {
      assert.ok(String(opts.body).includes('code_verifier='), 'PKCE: manda el verifier');
      return new Response(JSON.stringify({ access_token: 'at-1' }), { status: 200 });
    }
    if (url.includes('openidconnect.googleapis.com')) return new Response(JSON.stringify(profile), { status: 200 });
    throw new Error('url inesperada ' + url);
  };
}
async function googleLogin(profile) {
  mockGoogle(profile);
  const start = await req('/api/auth/oauth/google?next=/app/modpacks');
  assert.equal(start.status, 302);
  const loc = new URL(start.headers.get('location')), state = loc.searchParams.get('state');
  assert.equal(loc.host, 'accounts.google.com');
  assert.equal(loc.searchParams.get('code_challenge_method'), 'S256');
  const jar = cookieOf(start);
  assert.equal((await req(`/api/auth/oauth/google/callback?code=c1&state=mal`, { headers: { cookie: jar } })).headers.get('location'), '/entrar?error=oauth_state');
  const cb = await req(`/api/auth/oauth/google/callback?code=c1&state=${state}`, { headers: { cookie: jar } });
  return cb;
}

test('Google: crea la cuenta verificada, sin contraseña, y vuelve a la página pedida', async () => {
  const cb = await googleLogin({ sub: 'g-1', email: 'mia@example.com', email_verified: true, name: 'Mía' });
  assert.equal(cb.status, 302);
  assert.equal(cb.headers.get('location'), '/app/modpacks');
  const A = { ...H, cookie: cb.headers.getSetCookie().find(s => s.startsWith('cm_session=')).split(';')[0] };
  const u = (await (await req('/api/auth/me', { headers: A })).json()).user;
  assert.deepEqual([u.email, u.verified, u.hasPassword, u.identities], ['mia@example.com', true, false, ['google']]);
  assert.equal((await post('/api/auth/login', { email: 'mia@example.com', password: 'lo que sea largo' })).status, 401);
  // segunda vez: misma cuenta por su sub, aunque cambie el nombre
  const again = await googleLogin({ sub: 'g-1', email: 'mia@example.com', email_verified: true, name: 'Otra' });
  const B = { ...H, cookie: again.headers.getSetCookie().find(s => s.startsWith('cm_session=')).split(';')[0] };
  assert.equal((await (await req('/api/auth/me', { headers: B })).json()).user.id, u.id);
});

test('cuenta preparada de antemano: el que la registró sin verificar pierde la contraseña al entrar el dueño con Google', async () => {
  await post('/api/auth/register', { email: 'victima@example.com', password: 'clave del atacante', name: 'Atacante', accept: true });
  const cb = await googleLogin({ sub: 'g-2', email: 'victima@example.com', email_verified: true, name: 'Víctima' });
  assert.equal(cb.status, 302);
  assert.equal((await post('/api/auth/login', { email: 'victima@example.com', password: 'clave del atacante' })).status, 401);
  // y un email que Google no confirma no se une a ninguna cuenta
  const no = await googleLogin({ sub: 'g-3', email: 'eva@example.com', email_verified: false, name: 'X' });
  assert.equal(no.headers.get('location'), '/entrar?error=oauth_unverified');
});

test('proceso: Sala Mekanism con tiempos reales (4 líneas ×5)', async () => {
  const { PROCESS } = await import('../../seed/designs/mekanism.js');
  const base = solve(PROCESS, { upgrades: 0 }), fast = solve(PROCESS, { upgrades: 8 });
  const ingotsPerMin = g => g.edges.find(e => e.output).rate * 60;
  assert.equal(Math.round(ingotsPerMin(base)), 216);           // 4 × 9 procesos × 1 cada 10 s · lavado 9 × 1 mB/t a la par
  assert.equal(Math.round(ingotsPerMin(fast)), 3600);          // 200 ticks → 12 con 8 mejoras: 4 × 9 × 20/12 cristales/s
  assert.equal(fast.bottleneck, 'cry');
  const tierDown = solve(PROCESS, { upgrades: 8, parallelOf: n => (n.id === 'sme' ? 3 : null) });
  assert.equal(tierDown.bottleneck, 'sme');                    // una factoría Basic (3 procesos) frena toda la línea
  assert.equal(Math.round(ingotsPerMin(tierDown)), 1200);
});

test('proceso: Red P2P y laboratorio HNN', async () => {
  const out = g => g.edges.find(e => e.output).rate * 60;
  const p2p = solve((await import('../../seed/designs/p2p.js')).PROCESS);
  assert.equal(Math.round(out(p2p)), 120);                     // Molecular Assembler sin cartas: 100 / 10 por tick = 10 ticks
  assert.equal(p2p.bottleneck, 'mol');
  const hnn = solve((await import('../../seed/designs/granja.js')).PROCESS);
  assert.equal(Math.round(out(hnn)), 3200);                    // 25 modelos × 32 lingotes cada 300 ticks
});

test('sesión: "mantener la sesión" da cookie de 60 días que se renueva; sin marcar, cookie de navegador', async () => {
  (await import('../src/security.js')).resetRateLimits();                                   // todas las pruebas comparten "IP"
  await post('/api/auth/register', { email: 'rem@example.com', password: 'clave larga de rem', name: 'Rem', accept: true });
  const long = await post('/api/auth/login', { email: 'rem@example.com', password: 'clave larga de rem' });
  assert.match(long.headers.get('set-cookie'), /Max-Age=5184000/);
  const short = await post('/api/auth/login', { email: 'rem@example.com', password: 'clave larga de rem', remember: false });
  assert.doesNotMatch(short.headers.get('set-cookie'), /Max-Age/);
  const { run, one } = await import('../src/db.js'), { sha256 } = await import('../src/security.js');
  const tok = cookieOf(long).split('=')[1], h = sha256(tok);
  run('UPDATE sessions SET expires = ? WHERE hash = ?', Date.now() + 5 * 864e5, h);         // a 5 días de caducar
  const me = await req('/api/auth/me', { headers: { ...H, cookie: cookieOf(long) } });
  assert.equal((await me.json()).user.email, 'rem@example.com');
  assert.match(me.headers.get('set-cookie') || '', /Max-Age=5184000/);                       // se renueva
  assert.ok(one('SELECT expires FROM sessions WHERE hash = ?', h).expires > Date.now() + 59 * 864e5);
});

test('registro exige aceptar términos y edad; exportar mis datos no lleva secretos', async () => {
  (await import('../src/security.js')).resetRateLimits();
  assert.equal((await post('/api/auth/register', { email: 'sin@example.com', password: 'clave larga sin', name: 'Sin' })).status, 400);
  const reg = await post('/api/auth/register', { email: 'exp@example.com', password: 'clave larga exp', name: 'Exp', accept: true });
  const A = { ...H, cookie: cookieOf(reg) };
  await post('/api/keys', { provider: 'groq', apiKey: 'gsk_secretisimo_123456', model: 'm' }, A);
  await post('/api/designs', { title: 'Para exportar' }, A);
  const r = await req('/api/auth/export', { headers: A });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition'), /attachment/);
  const txt = await r.text(), j = JSON.parse(txt);
  assert.equal(j.account.email, 'exp@example.com');
  assert.equal(j.designs[0].title, 'Para exportar');
  assert.ok(!txt.includes('gsk_secretisimo') && !txt.includes('scrypt$'), 'sin claves ni hash de contraseña');
});

test('vincular el mod: código de dispositivo → aprobación en la web → token de solo lectura que sale una vez', async () => {
  (await import('../src/security.js')).resetRateLimits();
  const MOD = { 'content-type': 'application/json', 'x-craftometry': '1' };              // el mod no manda Origin
  const st = await (await post('/api/link/start', { client: 'Craftometry Link 1.0' }, MOD)).json();
  assert.match(st.user_code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal((await post('/api/link/poll', { device_code: st.device_code }, MOD)).status, 202);
  const reg = await post('/api/auth/register', { email: 'mc@example.com', password: 'clave larga del mod', name: 'Steve', accept: true });
  const A = { ...H, cookie: cookieOf(reg) };
  assert.equal((await post('/api/link/approve', { code: 'XXXX-XXXX' }, A)).status, 404);
  assert.equal((await post('/api/link/approve', { code: st.user_code.toLowerCase() }, A)).status, 200);
  (await import('../src/routes/link.js'))._linkState.forEach(v => { v.lastPoll = 0; });   // sin esperar los 5 s
  const ok = await (await post('/api/link/poll', { device_code: st.device_code }, MOD)).json();
  assert.equal(ok.status, 'ok'); assert.match(ok.token, /^cmt_/); assert.equal(ok.user.name, 'Steve');
  assert.equal((await post('/api/link/poll', { device_code: st.device_code }, MOD)).status, 410);   // una sola vez
  const R = { authorization: `Bearer ${ok.token}` };
  assert.equal((await req('/api/designs', { headers: R })).status, 200);
  assert.equal((await req('/api/designs', { method: 'POST', headers: { ...R, 'content-type': 'application/json' }, body: '{"title":"xx"}' })).status, 403);   // solo lectura
});
