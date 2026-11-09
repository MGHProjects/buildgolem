// Primitivas de seguridad: contraseñas (scrypt), tokens, cifrado de claves (AES-256-GCM), límite de intentos y protección SSRF.
import { scrypt, randomBytes, createHash, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { promisify } from 'node:util';

const scryptP = promisify(scrypt);
const N = 32768, R = 8, P = 1, KEYLEN = 32, MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(pw) {
  const salt = randomBytes(16), dk = await scryptP(pw, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${dk.toString('base64')}`;
}
export async function verifyPassword(pw, stored) {
  const [alg, n, r, p, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expect = Buffer.from(hash, 'base64');
  const dk = await scryptP(pw, Buffer.from(salt, 'base64'), expect.length, { N: +n, r: +r, p: +p, maxmem: MAXMEM });
  return timingSafeEqual(dk, expect);
}
// hash falso para que "usuario no existe" tarde lo mismo que "contraseña mal"
export const DUMMY_HASH = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(32).toString('base64');

export const sha256 = s => createHash('sha256').update(String(s)).digest('hex');
export const token = (prefix = '') => prefix + randomBytes(32).toString('base64url');
export const id = () => randomBytes(9).toString('base64url');

// ── cifrado de claves de proveedor: iv(12) | tag(16) | texto cifrado, con el id de usuario como dato autenticado ──
export function encrypt(master, plain, aad) {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', master, iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]);
}
export function decrypt(master, blob, aad) {
  const b = Buffer.from(blob), d = createDecipheriv('aes-256-gcm', master, b.subarray(0, 12));
  d.setAAD(Buffer.from(aad)); d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}

// ── límite de intentos en memoria (por clave: ip o email) ──
const buckets = new Map();
export function rateLimit(key, max = 10, windowMs = 15 * 60_000) {
  const now = Date.now(), b = buckets.get(key) || { n: 0, reset: now + windowMs };
  if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
  b.n++; buckets.set(key, b);
  return b.n <= max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k); }, 60_000).unref();
export const resetRateLimits = () => buckets.clear();   // solo para las pruebas

// ── SSRF: solo https a IPs públicas ──
const PRIVATE = [/^10\./, /^127\./, /^0\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^::1$/, /^f[cd]/i, /^fe80/i, /^::ffff:/i, /^::$/];
export const isPrivateIp = ip => PRIVATE.some(r => r.test(ip));
export async function assertPublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error('URL no válida'); }
  if (u.protocol !== 'https:') throw new Error('Solo se admiten URLs https');
  if (u.username || u.password) throw new Error('La URL no puede llevar usuario ni contraseña');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map(a => a.address);
  if (!ips.length || ips.some(isPrivateIp)) throw new Error('La URL apunta a una dirección privada');
  return u;
}
// fetch que no sigue redirecciones a direcciones privadas
export async function safeFetch(url, opts = {}, hops = 3) {
  await assertPublicUrl(url);
  const r = await fetch(url, { ...opts, redirect: 'manual', signal: opts.signal || AbortSignal.timeout(20_000) });
  if (r.status >= 300 && r.status < 400 && r.headers.get('location') && hops > 0) return safeFetch(new URL(r.headers.get('location'), url).href, opts, hops - 1);
  return r;
}

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
