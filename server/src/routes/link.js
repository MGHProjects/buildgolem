// Vincular el mod BuildGolem Link sin escribir la contraseña en Minecraft (flujo de "código de dispositivo", como en las teles):
// 1. el mod pide un código (POST /link/start) y lo enseña en el juego;
// 2. el jugador abre buildgolem.dualix.io/vincular con su sesión y lo confirma (POST /link/approve);
// 3. el mod pregunta cada 5 s (POST /link/poll) y recibe un token personal de solo lectura.
// Los códigos viven 10 minutos y solo en memoria: si el servidor se reinicia, se pide otro.
import { Hono } from 'hono';
import { randomInt } from 'node:crypto';
import { run, audit } from '../db.js';
import { sha256, token, id, rateLimit } from '../security.js';
import { body, clientIp, requireUser, HttpError } from '../http.js';
import { PUBLIC_URL } from '../config.js';

export const link = new Hono();
const TTL = 10 * 60_000, INTERVAL = 5, pending = new Map();      // sha256(device_code) → { user, userCode, expires, token, name, lastPoll }
const ALPHA = 'BCDFGHJKLMNPQRSTVWXZ23456789';                      // sin vocales ni 0/1/O/I: no forma palabras ni se confunde
const userCode = () => Array.from({ length: 8 }, (_, i) => (i === 4 ? '-' : '') + ALPHA[randomInt(ALPHA.length)]).join('');
const sweep = () => { const now = Date.now(); for (const [k, v] of pending) if (v.expires < now) pending.delete(k); };
const byUserCode = code => [...pending.entries()].find(([, v]) => v.userCode === code);

link.post('/link/start', async c => {
  const b = await body(c, 10_000).catch(() => ({}));
  if (!rateLimit('link:' + clientIp(c), 20)) throw new HttpError(429, 'Demasiados códigos. Espera unos minutos.');
  sweep();
  if (pending.size > 5000) throw new HttpError(503, 'Prueba en un momento');
  const device = token('cmd_'), code = userCode();
  const name = String(b.client || 'BuildGolem Link').replace(/[^\w .()-]/g, '').slice(0, 40) || 'BuildGolem Link';
  pending.set(sha256(device), { userCode: code, expires: Date.now() + TTL, name });
  return c.json({ device_code: device, user_code: code, verification_uri: `${PUBLIC_URL}/vincular`, verification_uri_complete: `${PUBLIC_URL}/vincular?code=${code}`, interval: INTERVAL, expires_in: TTL / 1000 });
});

link.get('/link/:code', c => {                                    // la página de vincular enseña qué aparato pide acceso
  requireUser(c);
  const hit = byUserCode(String(c.req.param('code')).toUpperCase());
  if (!hit || hit[1].expires < Date.now()) throw new HttpError(404, 'El código no existe o ha caducado. Pide otro en el juego.');
  return c.json({ client: hit[1].name, expires: hit[1].expires });
});

link.post('/link/approve', async c => {
  const u = requireUser(c, 'write');
  if (u.via !== 'session') throw new HttpError(403, 'Solo desde la web');
  const b = await body(c);
  if (!rateLimit('linkok:' + u.id, 10)) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
  const hit = byUserCode(String(b.code || '').trim().toUpperCase());
  if (!hit || hit[1].expires < Date.now() || hit[1].token) throw new HttpError(404, 'El código no existe o ha caducado. Pide otro en el juego.');
  const t = token('cmt_');
  run('INSERT INTO pats (id, user_id, name, hash, scopes, created) VALUES (?, ?, ?, ?, ?, ?)', id(), u.id, `${hit[1].name} (Minecraft)`, sha256(t), 'read', Date.now());
  Object.assign(hit[1], { token: t, user: { name: u.name, handle: u.handle } });
  audit(u.id, 'link_approved', clientIp(c), { client: hit[1].name });
  return c.json({ ok: true });
});

link.post('/link/poll', async c => {
  const b = await body(c, 10_000), k = sha256(String(b.device_code || '')), p = pending.get(k);
  if (!p || p.expires < Date.now()) { pending.delete(k); throw new HttpError(410, 'expired'); }
  if (p.lastPoll && Date.now() - p.lastPoll < (INTERVAL - 1) * 1000) throw new HttpError(429, 'slow_down');
  p.lastPoll = Date.now();
  if (!p.token) return c.json({ status: 'pending' }, 202);
  pending.delete(k);                                               // el token sale una sola vez
  return c.json({ status: 'ok', token: p.token, user: p.user });
});

export const _linkState = pending;                                // para las pruebas
