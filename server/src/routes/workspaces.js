// Workspaces (un modpack cada uno): crear, subir por trozos, estado, borrar, y consultar bloques, recetas, configs, texturas y modelos.
import { Hono } from 'hono';
import { mkdirSync, openSync, writeSync, closeSync, statSync, existsSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { one, all, run } from '../db.js';
import { id } from '../security.js';
import { body, str, bad, requireUser, HttpError } from '../http.js';
import { QUOTA_BYTES, CHUNK_BYTES } from '../config.js';
import { wsDir, enqueue } from '../workspace/importer.js';
import { cfEnabled, searchPacks } from '../curseforge.js';
import { listZip } from '../workspace/zip.js';
import { writeFileSync } from 'node:fs';
import { rateLimit } from '../security.js';
import { reader, forget } from '../workspace/reader.js';

export const workspaces = new Hono();
const row = w => ({ id: w.id, name: w.name, source: w.source, sourceRef: w.source_ref, mcVersion: w.mc_version, loader: w.loader, status: w.status, progress: w.progress,
  error: w.error, bytes: w.bytes, stats: w.stats ? JSON.parse(w.stats) : null, created: w.created, updated: w.updated, demo: !w.user_id, missing: missingOf(w.id) });
// mods que CurseForge no deja descargar a otras apps: el usuario los sube a mano
const missingOf = wid => { try { return JSON.parse(readFileSync(join(wsDir(wid), 'missing.json'), 'utf8')); } catch { return []; } };

// dueño, o workspace de ejemplo (sin dueño) en solo lectura
function own(c, write = false) {
  const u = requireUser(c, write ? 'write' : 'read'), w = one('SELECT * FROM workspaces WHERE id = ?', c.req.param('id'));
  if (!w || (w.user_id !== u.id && (write || w.user_id))) throw new HttpError(404, 'No existe');
  return w;
}
const ready = w => { if (w.status !== 'ready') throw new HttpError(409, 'El workspace todavía no está listo'); return reader(w.id); };

workspaces.get('/workspaces', c => {
  const u = requireUser(c);
  return c.json(all('SELECT * FROM workspaces WHERE user_id = ? OR user_id IS NULL ORDER BY user_id IS NULL, updated DESC', u.id).map(row));
});

workspaces.post('/workspaces', async c => {
  const u = requireUser(c, 'write'), b = await body(c);
  const source = ['upload', 'modrinth', 'curseforge'].includes(b.source) ? b.source : bad('Origen no válido');
  if (source === 'curseforge' && !cfEnabled()) bad('CurseForge aún no está conectado: sube la carpeta de la instancia en zip');
  const used = one('SELECT COALESCE(SUM(bytes), 0) n FROM workspaces WHERE user_id = ?', u.id).n;
  if (source === 'upload' && (!Number.isFinite(b.size) || b.size <= 0)) bad('Falta el tamaño del archivo');
  if (used + (b.size || 0) > QUOTA_BYTES) bad(`Te quedan ${((QUOTA_BYTES - used) / 1024 ** 3).toFixed(1)} GB de espacio para workspaces`);
  if (one("SELECT COUNT(*) n FROM workspaces WHERE user_id = ? AND status IN ('uploading','queued','processing')", u.id).n >= 2) bad('Ya tienes dos workspaces en proceso');
  const ref = source === 'modrinth' ? str(b.ref, 'proyecto de Modrinth', 2, 80).replace(/[^\w-]/g, '') : source === 'curseforge' ? String(Number(b.ref) > 0 ? Math.floor(Number(b.ref)) : bad('Falta el proyecto de CurseForge')) : null;
  const mc = b.mcVersion ? String(b.mcVersion).replace(/[^\w.-]/g, '').slice(0, 20) : null;
  const wid = id(), now = Date.now();
  mkdirSync(wsDir(wid), { recursive: true });
  run('INSERT INTO workspaces (id, user_id, name, source, source_ref, mc_version, status, bytes, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    wid, u.id, str(b.name, 'nombre', 2, 60), source, ref, mc, source === 'upload' ? 'uploading' : 'queued', 0, now, now);
  if (source === 'upload') writeFileSyncSafe(join(wsDir(wid), 'expected'), String(Math.floor(b.size)));
  else enqueue(wid);
  return c.json(row(one('SELECT * FROM workspaces WHERE id = ?', wid)), 201);
});
function writeFileSyncSafe(p, s) { const fd = openSync(p, 'w'); writeSync(fd, s); closeSync(fd); }

// subida por trozos: el cliente manda cada trozo con su offset; solo se acepta el que continúa el archivo
workspaces.put('/workspaces/:id/chunk', async c => {
  const w = own(c, true);
  if (w.status !== 'uploading') bad('Este workspace no espera archivos');
  const dir = wsDir(w.id), part = join(dir, 'upload.zip'), offset = +c.req.query('offset');
  const have = existsSync(part) ? statSync(part).size : 0, expected = +readFileSync(join(dir, 'expected'), 'utf8');
  if (offset !== have) return c.json({ error: 'Offset inesperado', have }, 409);
  const buf = Buffer.from(await c.req.arrayBuffer());
  if (!buf.length || buf.length > CHUNK_BYTES + 1024) bad('Trozo vacío o demasiado grande');
  if (have + buf.length > expected) bad('El archivo es más grande de lo anunciado');
  if (have === 0 && buf.readUInt32LE(0) !== 0x04034b50) bad('Solo se admiten .zip y .mrpack');
  const fd = openSync(part, 'a');
  try { writeSync(fd, buf); } finally { closeSync(fd); }
  return c.json({ have: have + buf.length, expected });
});

workspaces.post('/workspaces/:id/complete', c => {
  const w = own(c, true), dir = wsDir(w.id), part = join(dir, 'upload.zip');
  if (w.status !== 'uploading') bad('Este workspace no espera archivos');
  if (!existsSync(part) || statSync(part).size !== +readFileSync(join(dir, 'expected'), 'utf8')) bad('La subida no está completa');
  run("UPDATE workspaces SET status = 'queued', updated = ? WHERE id = ?", Date.now(), w.id);
  enqueue(w.id);
  return c.json({ ok: true });
});

workspaces.get('/workspaces/:id', c => c.json(row(own(c))));

// CurseForge: estado de la conexión y búsqueda de modpacks (la clave nunca sale del servidor)
workspaces.get('/curseforge/status', c => c.json({ enabled: cfEnabled() }));
workspaces.get('/curseforge/search', async c => {
  const u = requireUser(c);
  if (!rateLimit('cfsearch:' + u.id, 60, 60_000)) throw new HttpError(429, 'Demasiadas búsquedas seguidas');
  const q = String(c.req.query('q') || '').trim();
  return c.json(q.length < 2 ? [] : await searchPacks(q));
});

// añadir a mano un mod que falta (o cualquier .jar) y volver a analizar el workspace
workspaces.post('/workspaces/:id/jar', async c => {
  const w = own(c, true);
  if (['uploading', 'queued', 'processing'].includes(w.status)) bad('Espera a que termine lo que está haciendo');
  const name = String(c.req.query('name') || '').replace(/[^\w.+-]/g, '_');
  if (!/\.jar$/i.test(name) || name.length > 160) bad('Solo archivos .jar');
  const buf = Buffer.from(await c.req.arrayBuffer());
  if (!buf.length || buf.length > CHUNK_BYTES) bad(`El .jar debe pesar menos de ${CHUNK_BYTES / 1024 ** 2} MB`);
  if (buf.readUInt32LE(0) !== 0x04034b50) bad('Ese archivo no es un .jar válido');
  const dir = join(wsDir(w.id), 'files', 'mods');
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, name);
  writeFileSync(dest, buf);
  try { listZip(dest); } catch { rmSync(dest, { force: true }); bad('Ese archivo no es un .jar válido'); }
  const left = missingOf(w.id).filter(m => m.fileName.replace(/[^\w.+-]/g, '_') !== name);
  writeFileSync(join(wsDir(w.id), 'missing.json'), JSON.stringify(left));
  forget(w.id);
  run("UPDATE workspaces SET status = 'queued', updated = ? WHERE id = ?", Date.now(), w.id);
  enqueue(w.id);
  return c.json(row(one('SELECT * FROM workspaces WHERE id = ?', w.id)));
});

workspaces.delete('/workspaces/:id', c => {
  const w = own(c, true);
  if (w.status === 'processing') bad('Espera a que termine de procesarse');
  forget(w.id);
  rmSync(wsDir(w.id), { recursive: true, force: true });
  run('DELETE FROM workspaces WHERE id = ?', w.id);
  return c.json({ ok: true });
});

// ── consultas ──
workspaces.get('/workspaces/:id/blocks', c => {
  const r = ready(own(c)), q = (c.req.query('q') || '').toLowerCase().trim(), mod = c.req.query('mod');
  const words = q.split(/\s+/).filter(Boolean);
  const hits = r.blocks.filter(b => (!mod || b.id.startsWith(mod + ':')) && words.every(w => `${b.id} ${b.name} ${b.nameEs || ''}`.toLowerCase().includes(w)));
  return c.json({ total: hits.length, items: hits.slice(0, +(c.req.query('limit') || 40)) });
});
workspaces.get('/workspaces/:id/block', c => {
  const r = ready(own(c)), b = r.blocks.find(x => x.id === c.req.query('id'));
  if (!b) throw new HttpError(404, 'Ese bloque no existe en este modpack');
  const family = b.tier ? r.blocks.filter(x => x.tier?.family === b.tier.family).sort((a, z) => a.tier.rank - z.tier.rank).map(x => x.id) : [];
  return c.json({ ...b, family });
});
workspaces.get('/workspaces/:id/recipes', c => {
  const r = ready(own(c)), { output, input, type, mod } = c.req.query(), lim = Math.min(50, +(c.req.query('limit') || 20));
  const hits = r.recipes.filter(x => (!type || x.type === type || x.type.includes(type)) && (!mod || x.id.startsWith(mod + ':'))
    && (!output || x.out.some(o => o.includes(output))) && (!input || x.in.some(i => i.includes(input))));
  return c.json({ total: hits.length, items: hits.slice(0, lim).map(x => ({ ...x, json: r.json(x.path) })) });
});
workspaces.get('/workspaces/:id/config', c => {
  const w = own(c), dir = join(wsDir(w.id), 'files', 'config'), mod = String(c.req.query('mod') || '').replace(/[^\w-]/g, '');
  if (!existsSync(dir)) return c.json({ files: [] });
  const list = readdirSync(dir, { recursive: true }).map(String).filter(f => /\.(toml|json5?|cfg|txt)$/.test(f) && f.toLowerCase().includes(mod.toLowerCase()));
  const file = c.req.query('file');
  if (file) {
    if (!list.includes(file)) throw new HttpError(404, 'No existe');
    return c.json({ file, text: readFileSync(join(dir, file), 'utf8').slice(0, 60_000) });
  }
  return c.json({ files: list.slice(0, 50) });
});

// texturas: solo para el dueño (o el ejemplo); el resto ve colores medios
workspaces.get('/workspaces/:id/tex/*', c => {
  const w = one('SELECT * FROM workspaces WHERE id = ?', c.req.param('id')), u = c.get('user');
  const key = c.req.path.split('/tex/')[1] || '', m = key.match(/^([a-z0-9_.-]+)\/([a-z0-9_./-]+)\.png(\.mcmeta)?$/);
  if (!w || w.status !== 'ready' || !m) throw new HttpError(404, 'No existe');
  const r = reader(w.id);
  // el dueño ve todo; los demás, solo texturas de mods con licencia libre
  if (!(u && w.user_id === u.id) && !r.open.has(m[1])) throw new HttpError(404, 'No existe');
  const data = r.texture(`${m[1]}:${m[2]}`, m[3] ? '.png.mcmeta' : '.png');
  if (!data) throw new HttpError(404, 'No existe');
  return new Response(data, { headers: { 'content-type': m[3] ? 'application/json' : 'image/png', 'cache-control': 'public, max-age=86400' } });
});
workspaces.post('/workspaces/:id/models', async c => {
  const w = own(c), b = await body(c);
  const refs = (Array.isArray(b.refs) ? b.refs : []).filter(r => typeof r === 'string' && /^[\w:./+-]{3,300}$/.test(r)).slice(0, 400);
  return c.json(reader(w.id).models(refs));
});
export function colorsFor(workspaceId, keys) {
  const r = reader(workspaceId), out = {};
  for (const k of keys.slice(0, 3000)) out[k] = r.color(k);
  return out;
}
