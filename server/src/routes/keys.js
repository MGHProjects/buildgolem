// Claves de proveedor de IA (BYOK, cifradas) y tokens personales de la API (cmt_…).
import { Hono } from 'hono';
import { one, all, run, audit } from '../db.js';
import { encrypt, decrypt, token, sha256, id } from '../security.js';
import { body, str, bad, requireUser, clientIp, HttpError } from '../http.js';
import { MASTER_KEY } from '../config.js';
import { PROVIDERS, chat, resolveBase } from '../llm/providers.js';

export const keys = new Hono();
const keyRow = k => ({ id: k.id, provider: k.provider, label: k.label, last4: k.last4, baseUrl: k.base_url, model: k.model, toolMode: k.tool_mode, isDefault: !!k.is_default, created: k.created });

keys.get('/providers', c => c.json(Object.entries(PROVIDERS).map(([key, p]) => ({ key, name: p.name, models: p.models, keyUrl: p.keyUrl, free: p.free, custom: key === 'custom' }))));

keys.get('/keys', c => {
  const u = requireUser(c);
  return c.json(all('SELECT * FROM provider_keys WHERE user_id = ? ORDER BY created', u.id).map(keyRow));
});

keys.post('/keys', async c => {
  const u = requireUser(c, 'write'), b = await body(c);
  if (u.via !== 'session') throw new HttpError(403, 'Las claves de IA solo se gestionan desde la web');
  const provider = String(b.provider || '');
  if (!PROVIDERS[provider]) bad('Proveedor desconocido');
  const apiKey = str(b.apiKey, 'clave', 8, 400), model = str(b.model, 'modelo', 2, 120);
  const baseUrl = provider === 'custom' ? await resolveBase('custom', str(b.baseUrl, 'URL base', 8, 300)).catch(e => bad(e.message)) : null;
  const toolMode = b.toolMode === 'json' ? 'json' : 'native';
  const count = one('SELECT COUNT(*) n FROM provider_keys WHERE user_id = ?', u.id).n;
  if (count >= 20) bad('Máximo 20 claves');
  const kid = id();
  run('INSERT INTO provider_keys (id, user_id, provider, label, secret, last4, base_url, model, tool_mode, is_default, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    kid, u.id, provider, (b.label && String(b.label).slice(0, 60)) || PROVIDERS[provider].name, encrypt(MASTER_KEY, apiKey, u.id), apiKey.slice(-4), baseUrl, model, toolMode, count === 0 ? 1 : 0, Date.now());
  audit(u.id, 'key_created', clientIp(c), { provider });
  return c.json(keyRow(one('SELECT * FROM provider_keys WHERE id = ?', kid)), 201);
});

keys.post('/keys/:id/default', c => {
  const u = requireUser(c, 'write');
  if (!one('SELECT 1 FROM provider_keys WHERE id = ? AND user_id = ?', c.req.param('id'), u.id)) throw new HttpError(404, 'No existe');
  run('UPDATE provider_keys SET is_default = (id = ?) WHERE user_id = ?', c.req.param('id'), u.id);
  return c.json({ ok: true });
});

keys.post('/keys/:id/test', async c => {
  const u = requireUser(c, 'write'), k = one('SELECT * FROM provider_keys WHERE id = ? AND user_id = ?', c.req.param('id'), u.id);
  if (!k) throw new HttpError(404, 'No existe');
  try {
    const r = await chat({ provider: k.provider, apiKey: decrypt(MASTER_KEY, k.secret, u.id), baseUrl: k.base_url, model: k.model, messages: [{ role: 'user', content: 'Reply with the single word: ok' }], signal: AbortSignal.timeout(30_000) });
    return c.json({ ok: true, reply: r.text.slice(0, 80) });
  } catch (e) { return c.json({ ok: false, error: e.message.slice(0, 300) }); }
});

keys.delete('/keys/:id', c => {
  const u = requireUser(c, 'write');
  const r = run('DELETE FROM provider_keys WHERE id = ? AND user_id = ?', c.req.param('id'), u.id);
  if (!r.changes) throw new HttpError(404, 'No existe');
  audit(u.id, 'key_deleted', clientIp(c));
  return c.json({ ok: true });
});

// ── tokens personales ──
keys.get('/tokens', c => {
  const u = requireUser(c);
  return c.json(all('SELECT id, name, scopes, created, last_used FROM pats WHERE user_id = ? ORDER BY created', u.id));
});
keys.post('/tokens', async c => {
  const u = requireUser(c, 'write'), b = await body(c);
  if (u.via !== 'session') throw new HttpError(403, 'Los tokens solo se crean desde la web');
  const scopes = b.write ? 'read,write' : 'read', t = token('cmt_'), tid = id();
  run('INSERT INTO pats (id, user_id, name, hash, scopes, created) VALUES (?, ?, ?, ?, ?, ?)', tid, u.id, str(b.name, 'nombre', 1, 60), sha256(t), scopes, Date.now());
  audit(u.id, 'token_created', clientIp(c), { scopes });
  return c.json({ id: tid, token: t, scopes }, 201);                               // única vez que se ve el token
});
keys.delete('/tokens/:id', c => {
  const u = requireUser(c, 'write');
  const r = run('DELETE FROM pats WHERE id = ? AND user_id = ?', c.req.param('id'), u.id);
  if (!r.changes) throw new HttpError(404, 'No existe');
  audit(u.id, 'token_revoked', clientIp(c));
  return c.json({ ok: true });
});

export function keyForUser(userId, keyId) {
  const k = keyId ? one('SELECT * FROM provider_keys WHERE id = ? AND user_id = ?', keyId, userId)
    : one('SELECT * FROM provider_keys WHERE user_id = ? ORDER BY is_default DESC, created LIMIT 1', userId);
  if (!k) return null;
  return { provider: k.provider, apiKey: decrypt(MASTER_KEY, k.secret, userId), baseUrl: k.base_url, model: k.model, toolMode: k.tool_mode, label: k.label };
}
