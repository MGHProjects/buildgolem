// Utilidades HTTP compartidas: IP del cliente, usuario de la petición, errores con código y validación de entrada.
import { getCookie, setCookie } from 'hono/cookie';
import { one, run } from './db.js';
import { sha256, isPrivateIp } from './security.js';
import { ALLOWED_ORIGINS, SECURE_COOKIES } from './config.js';

export class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
export const bad = msg => { throw new HttpError(400, msg); };
export const SESSION_COOKIE = 'cm_session';
// "Mantener la sesión": 60 días que se renuevan con el uso; si no, cookie de navegador y 12 h sin actividad
export const SESSION_LIFE = { remember: 60 * 864e5, short: 12 * 36e5 };
export function sessionCookie(c, tok, remember) {
  setCookie(c, SESSION_COOKIE, tok, { httpOnly: true, secure: SECURE_COOKIES, sameSite: 'Lax', path: '/', ...(remember ? { maxAge: SESSION_LIFE.remember / 1000 } : {}) });
}

// IP real: si llega desde cloudflared (loopback) se usa CF-Connecting-IP; si no, la del socket
export function clientIp(c) {
  const peer = (c.env?.incoming?.socket?.remoteAddress || '').replace(/^::ffff:/, '');
  const cf = c.req.header('cf-connecting-ip');
  return (peer === '127.0.0.1' || peer === '::1') && cf ? cf : peer;
}

// usuario por cookie de sesión o por token personal (Authorization: Bearer cmt_…)
export function loadUser(c) {
  const auth = c.req.header('authorization');
  if (auth?.startsWith('Bearer cmt_')) {
    const p = one('SELECT p.id pid, p.scopes, u.* FROM pats p JOIN users u ON u.id = p.user_id WHERE p.hash = ?', sha256(auth.slice(7)));
    if (!p) return null;
    run('UPDATE pats SET last_used = ? WHERE id = ?', Date.now(), p.pid);
    return { ...p, via: 'token', scopes: p.scopes.split(',') };
  }
  const tok = getCookie(c, SESSION_COOKIE);
  if (!tok) return null;
  const h = sha256(tok), s = one('SELECT u.*, s.expires, s.remember FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.hash = ?', h), now = Date.now();
  if (!s || s.expires < now) return null;
  // renovación deslizante: como mucho una escritura al día (o cada 15 min en las sesiones cortas)
  const life = s.remember ? SESSION_LIFE.remember : SESSION_LIFE.short;
  if (s.expires - now < life - (s.remember ? 864e5 : 15 * 60e3)) {
    run('UPDATE sessions SET expires = ? WHERE hash = ?', now + life, h);
    if (s.remember) sessionCookie(c, tok, true);
  }
  return { ...s, via: 'session', scopes: ['read', 'write'] };
}
// cuentas creadas con Google o Discord no tienen contraseña: su hash empieza por "!" y no pasa verifyPassword
export const NO_PASSWORD = '!';
export const hasPassword = u => !!u?.pass && !u.pass.startsWith(NO_PASSWORD);
export const publicUser = u => u && { id: u.id, email: u.email, name: u.name, handle: u.handle, lang: u.lang, verified: !!u.verified, hasPassword: hasPassword(u) };

export function requireUser(c, scope = 'read') {
  const u = c.get('user');
  if (!u) throw new HttpError(401, 'Inicia sesión para continuar');
  if (!u.scopes.includes(scope)) throw new HttpError(403, `El token no tiene el permiso ${scope}`);
  return u;
}

// CSRF: las peticiones con cookie que cambian datos deben venir de nuestro origen y llevar la cabecera propia
export function csrfOk(c) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return true;
  if (c.req.header('authorization')?.startsWith('Bearer cmt_')) return true;    // sin cookies: no hay CSRF
  const origin = c.req.header('origin');
  return c.req.header('x-craftometry') === '1' && (!origin || ALLOWED_ORIGINS.has(origin));
}

export async function body(c, max = 2_000_000) {
  const len = +(c.req.header('content-length') || 0);
  if (len > max) throw new HttpError(413, 'Petición demasiado grande');
  try { return await c.req.json(); } catch { throw new HttpError(400, 'JSON no válido'); }
}
export const str = (v, name, min = 1, max = 200) => {
  if (typeof v !== 'string') bad(`Falta ${name}`);
  const s = v.trim();
  if (s.length < min || s.length > max) bad(`${name}: entre ${min} y ${max} caracteres`);
  return s;
};
export { isPrivateIp };
