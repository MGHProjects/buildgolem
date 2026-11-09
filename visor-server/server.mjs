// Visor de diseños de Minecraft: sirve la carpeta www/ con acceso por token de usuario, y sin token desde la red de casa.
// Sin dependencias (Node 20+). Variables: PORT (8097), HOST (0.0.0.0), ROOT (./www), DATA (./tokens.json),
// PUBLIC_URL (para los enlaces del panel), LAN_PUBLIC_IP=off para no fiarse de la IP pública de casa.
// Prueba: node server.mjs --test
import http from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, rename, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const PORT = +(process.env.PORT || 8097), HOST = process.env.HOST || '0.0.0.0';
const ROOT = resolve(process.env.ROOT || 'www'), DATA = resolve(process.env.DATA || 'tokens.json');
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const TRUST_PUBLIC_IP = process.env.LAN_PUBLIC_IP !== 'off';
const COOKIE = 'visor_token';

// ── ¿viene de la red de casa? ──
const clean = ip => (ip || '').replace(/^::ffff:/, '');
const isPrivate = ip => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|fe80:|f[cd][0-9a-f]{2}:)/i.test(ip);
const isLoop = ip => ip === '127.0.0.1' || ip === '::1';
// 'direct': conexión desde una IP privada (o el propio servidor) · 'public': por Cloudflare desde la IP pública de casa · null: de fuera.
// CF-Connecting-IP solo se cree si la conexión llega del cloudflared local (127.0.0.1); Cloudflare siempre la pone y pisa la del cliente.
export function lanOf(peer, cfIp, homeIp) {
  peer = clean(peer);
  if (isPrivate(peer)) return 'direct';
  if (isLoop(peer)) {
    if (!cfIp) return 'direct';
    if (homeIp && clean(cfIp) === homeIp) return 'public';
  }
  return null;
}
let homeIp = null;
async function refreshHomeIp() {
  try {
    const r = await fetch('https://1.1.1.1/cdn-cgi/trace', { signal: AbortSignal.timeout(5000) });
    const ip = (await r.text()).match(/^ip=(\d+\.\d+\.\d+\.\d+)$/m)?.[1];
    if (ip && ip !== homeIp) { homeIp = ip; console.log('IP pública de casa:', ip); }
  } catch (e) { console.warn('No pude leer la IP pública:', e.message); }
}

// ── tokens: se guarda solo su SHA-256; el token se enseña una vez, al crearlo ──
let db = { tokens: [] }, dirty = false;
const sha = s => createHash('sha256').update(String(s)).digest('hex');
async function load() { try { db = JSON.parse(await readFile(DATA, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
async function save() { await writeFile(DATA + '.tmp', JSON.stringify(db, null, 2), { mode: 0o600 }); await rename(DATA + '.tmp', DATA); dirty = false; }
const find = tok => (tok ? db.tokens.find(t => t.hash === sha(tok)) : null);
function createToken(user) {
  const token = randomBytes(32).toString('base64url');
  const t = { id: randomUUID().slice(0, 8), user, hash: sha(token), created: new Date().toISOString(), lastUsed: null, lastIp: null };
  db.tokens.push(t);
  return { id: t.id, user, token };
}
function touch(t, ip) { t.lastUsed = new Date().toISOString(); t.lastIp = ip; dirty = true; }
setInterval(() => { if (dirty) save().catch(e => console.error('No pude guardar los tokens:', e)); }, 60_000).unref();

// ── HTTP ──
const BASE = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mcmeta': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.lua': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };
const send = (res, code, body, type = 'text/plain; charset=utf-8', extra = {}) => { res.writeHead(code, { ...BASE, 'Content-Type': type, 'Cache-Control': 'no-store', ...extra }); res.end(body); };
const json = (res, data, code = 200) => send(res, code, JSON.stringify(data), 'application/json; charset=utf-8');
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(([k, v]) => k && v).map(([k, ...v]) => [k, v.join('=')]));
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
function readBody(req, max = 10_000) {
  return new Promise((ok, ko) => {
    let s = '';
    req.on('data', d => { s += d; if (s.length > max) { ko(new Error('demasiado grande')); req.destroy(); } });
    req.on('end', () => ok(s)); req.on('error', ko);
  });
}

const page = (title, body) => `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>body{font:15px system-ui,sans-serif;background:#14171d;color:#e6e8ee;max-width:760px;margin:40px auto;padding:0 16px}
input,button{font:inherit;padding:8px 10px;border-radius:6px;border:1px solid #3a4150;background:#1d222b;color:inherit}button{cursor:pointer;background:#2b5cff;border-color:#2b5cff}
table{width:100%;border-collapse:collapse;margin:16px 0}td,th{padding:8px;border-bottom:1px solid #2a303c;text-align:left}small,.hint{color:#9aa3b5}
code{background:#1d222b;padding:2px 6px;border-radius:4px;word-break:break-all}.danger{background:#7a2330;border-color:#7a2330}</style>${body}</html>`;
const DENIED = msg => page('Visor privado', `<h1>Visor privado</h1><p>${esc(msg)}</p>
<form method="get" action="/"><p><input name="token" placeholder="Pega aquí tu token" size="50" autocomplete="off" required> <button>Entrar</button></p></form>
<p class="hint">Si tienes el enlace con <code>?token=…</code>, ábrelo una vez: el navegador lo recuerda.</p>`);
const ADMIN = page('Tokens del visor', `<h1>Tokens del visor</h1>
<p class="hint">Solo se abre desde la red de casa. El token se ve una sola vez, al crearlo: cópialo entonces. Revocar corta el acceso al momento.</p>
<form id="f"><input id="u" placeholder="Nombre del usuario" maxlength="60" required> <button>Crear token</button></form>
<div id="nuevo"></div><table><thead><tr><th>Usuario</th><th>Creado</th><th>Último uso</th><th></th></tr></thead><tbody id="t"></tbody></table>
<script>
const H={'X-Visor':'1','Content-Type':'application/json'}, BASE=${JSON.stringify(PUBLIC_URL)}||location.origin;
const fecha=s=>s?new Date(s).toLocaleString('es'):'—';
async function lista(){const r=await fetch('/admin/api/tokens');const l=await r.json();const tb=document.getElementById('t');tb.replaceChildren(...l.map(x=>{const tr=document.createElement('tr');
tr.innerHTML='<td></td><td></td><td></td><td><button class="danger">Revocar</button></td>';tr.cells[0].textContent=x.user;tr.cells[1].textContent=fecha(x.created);
tr.cells[2].textContent=fecha(x.lastUsed)+(x.lastIp?' · '+x.lastIp:'');tr.querySelector('button').onclick=async()=>{if(confirm('¿Revocar el token de '+x.user+'?')){await fetch('/admin/api/tokens/'+x.id,{method:'DELETE',headers:H});lista();}};return tr;}));}
document.getElementById('f').onsubmit=async e=>{e.preventDefault();const r=await fetch('/admin/api/tokens',{method:'POST',headers:H,body:JSON.stringify({user:document.getElementById('u').value})});
const x=await r.json();const link=BASE+'/?token='+x.token;const d=document.getElementById('nuevo');d.innerHTML='<p>Token de <b></b> (cópialo ahora, no se vuelve a ver):</p><p><code></code></p>';
d.querySelector('b').textContent=x.user;d.querySelector('code').textContent=link;document.getElementById('u').value='';lista();};
lista();
</script>`);

async function admin(req, res, url, lan) {
  if (!lan) return send(res, 403, 'La gestión de tokens solo se abre desde la red de casa.');
  if (url.pathname === '/admin' && req.method === 'GET') return send(res, 200, ADMIN, TYPES['.html']);
  const write = req.method !== 'GET';
  if (write && req.headers['x-visor'] !== '1') return send(res, 403, 'Falta la cabecera X-Visor'); // fuerza el preflight CORS: ninguna web ajena puede crear ni revocar
  if (url.pathname === '/admin/api/tokens') {
    if (req.method === 'GET') return json(res, db.tokens.map(({ hash, ...t }) => t));
    if (req.method === 'POST') {
      let user;
      try { user = String(JSON.parse(await readBody(req)).user || '').trim(); } catch { return send(res, 400, 'JSON no válido'); }
      if (!user || user.length > 60) return send(res, 400, 'Nombre no válido');
      const t = createToken(user); await save();
      console.log(`Token creado para ${user} (${t.id})`);
      return json(res, t, 201);
    }
  }
  const m = url.pathname.match(/^\/admin\/api\/tokens\/([\w-]+)$/);
  if (m && req.method === 'DELETE') {
    const before = db.tokens.length; db.tokens = db.tokens.filter(t => t.id !== m[1]);
    if (db.tokens.length === before) return send(res, 404, 'No existe');
    await save(); console.log('Token revocado:', m[1]);
    return json(res, { ok: true });
  }
  return send(res, 404, 'No existe');
}

// ruta pedida → archivo dentro de ROOT (nunca fuera)
export function safePath(root, pathname) {
  let p;
  try { p = decodeURIComponent(pathname); } catch { return null; }
  if (p.includes('\0')) return null;
  const f = resolve(root, '.' + (p.endsWith('/') ? p + 'index.html' : p));
  return f === root || f.startsWith(root + sep) ? f : null;
}
async function serveFile(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método no permitido');
  let f = safePath(ROOT, pathname), st = f && await stat(f).catch(() => null);
  if (st?.isDirectory()) { f = resolve(f, 'index.html'); st = await stat(f).catch(() => null); }
  if (!st?.isFile()) return send(res, 404, 'No existe');
  const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
  const head = { ...BASE, 'Content-Type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', ETag: etag };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, head); return res.end(); }
  res.writeHead(200, { ...head, 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(f).on('error', () => res.destroy()).pipe(res);
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://visor');
  const peer = clean(req.socket.remoteAddress), cf = req.headers['cf-connecting-ip'];
  const lan = lanOf(peer, cf, TRUST_PUBLIC_IP ? homeIp : null), ip = clean(cf) || peer;
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return admin(req, res, url, lan);
  const q = url.searchParams.get('token');
  if (q) {                                                      // enlace con token: se guarda en una cookie y se quita de la dirección
    const t = find(q);
    if (!t) { console.log('Token no válido desde', ip); return send(res, 401, DENIED('Ese token no vale o lo han revocado.'), TYPES['.html']); }
    touch(t, ip);
    url.searchParams.delete('token');
    res.writeHead(303, { ...BASE, Location: url.pathname + url.search, 'Cache-Control': 'no-store',
      'Set-Cookie': `${COOKIE}=${q}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${cf ? '; Secure' : ''}` });
    return res.end();
  }
  if (!lan) {
    const t = find(cookies(req)[COOKIE]);
    if (!t) return send(res, 401, DENIED('Este visor es privado: necesitas tu enlace con token.'), TYPES['.html']);
    if (!t.lastUsed || Date.now() - Date.parse(t.lastUsed) > 60_000) touch(t, ip);
  }
  return serveFile(req, res, url.pathname);
}

function selfTest() {
  const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); };
  assert(lanOf('::ffff:192.168.1.20', undefined, '1.2.3.4') === 'direct', 'IP de casa directa');
  assert(lanOf('127.0.0.1', undefined, '1.2.3.4') === 'direct', 'el propio servidor');
  assert(lanOf('127.0.0.1', '1.2.3.4', '1.2.3.4') === 'public', 'por Cloudflare desde casa');
  assert(lanOf('127.0.0.1', '5.6.7.8', '1.2.3.4') === null, 'por Cloudflare desde fuera');
  assert(lanOf('127.0.0.1', '5.6.7.8', null) === null, 'sin IP de casa conocida');
  assert(lanOf('8.8.8.8', '1.2.3.4', '1.2.3.4') === null, 'cabecera CF desde fuera: no se cree');
  assert(lanOf('172.32.0.1', undefined, null) === null, '172.32 no es privada');
  const R = resolve('/srv/www');
  assert(safePath(R, '/../etc/passwd') === null && safePath(R, '/%2e%2e/%2e%2e/etc/passwd') === null, 'no sale de la raíz');
  assert(safePath(R, '/app/main.js') === resolve(R, 'app/main.js') && safePath(R, '/') === resolve(R, 'index.html'), 'rutas normales');
  assert(safePath(resolve('/srv/www'), '/%E0%A4%A') === null, 'ruta mal codificada');
  const t = createToken('prueba'); assert(find(t.token)?.user === 'prueba' && !find(t.token + 'x') && !find(undefined), 'tokens');
  db.tokens = [];
  console.log('ok: todas las pruebas pasan');
}

if (process.argv.includes('--test')) selfTest();
else {
  await load();
  await refreshHomeIp();
  setInterval(refreshHomeIp, 5 * 60_000).unref();
  http.createServer((req, res) => handle(req, res).catch(e => { console.error(e); if (!res.headersSent) send(res, 500, 'Error'); else res.destroy(); }))
    .listen(PORT, HOST, () => console.log(`Visor en http://${HOST}:${PORT} · raíz ${ROOT} · ${db.tokens.length} tokens`));
}
