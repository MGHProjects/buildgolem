// Diseños: los míos, crear, editar, duplicar, borrar, galería pública, página por slug y exportación .nbt.
import { Hono } from 'hono';
import { one, all, run, audit } from '../db.js';
import { id } from '../security.js';
import { body, str, bad, requireUser, clientIp, HttpError } from '../http.js';
import { validateDoc, decode, stats, FORMAT } from '../design/format.js';
import { toStructureNbt } from '../design/nbt.js';
import { validateModel } from '../design/validate.js';

export const designs = new Hono();
const VIS = ['private', 'unlisted', 'public'];
const slugOf = t => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'diseno';
const card = d => ({ id: d.id, title: d.title, slug: d.slug, summary: d.summary, visibility: d.visibility, size: d.size ? JSON.parse(d.size) : null, blocks: d.blocks,
  workspaceId: d.workspace_id, updated: d.updated, created: d.created, author: d.author ? { name: d.author, handle: d.handle } : undefined });

function uniqueSlug(title) {
  let s = slugOf(title);
  while (one('SELECT 1 FROM designs WHERE slug = ?', s)) s = `${slugOf(title).slice(0, 40)}-${Math.random().toString(36).slice(2, 7)}`;
  return s;
}
const EMPTY = { format: FORMAT, refs: [], model: { TITLE: '', P: {}, BLOCKS: [], ZONES: [{ n: 'Vista general', p: [12, 12, 24], t: [8, 0, 8] }], W: 16, H: 8 } };

export function insertDesign(userId, { title, summary = '', visibility = 'private', data = EMPTY, workspaceId = null }) {
  validateDoc(data);
  const did = id(), now = Date.now(), st = stats(decode(data));
  run('INSERT INTO designs (id, user_id, workspace_id, title, slug, summary, visibility, data, size, blocks, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    did, userId, workspaceId, title, uniqueSlug(title), summary, visibility, JSON.stringify(data), JSON.stringify(st.size), st.blocks, now, now);
  return did;
}
// lectura: dueño siempre; los demás solo si es público u oculto con enlace
function readable(c, d) {
  const u = c.get('user');
  if (!d) throw new HttpError(404, 'No existe');
  if (d.user_id !== u?.id && d.visibility === 'private') throw new HttpError(404, 'No existe');
  return d;
}
const withAuthor = 'SELECT d.*, u.name author, u.handle FROM designs d JOIN users u ON u.id = d.user_id';

designs.get('/designs', c => {
  const u = requireUser(c);
  return c.json(all('SELECT * FROM designs WHERE user_id = ? ORDER BY updated DESC', u.id).map(card));
});

designs.post('/designs', async c => {
  const u = requireUser(c, 'write'), b = await body(c, 30_000_000);
  if (b.workspaceId && !one('SELECT 1 FROM workspaces WHERE id = ? AND (user_id = ? OR user_id IS NULL)', b.workspaceId, u.id)) bad('Workspace no válido');
  try {
    const did = insertDesign(u.id, { title: str(b.title, 'título', 2, 80), summary: b.summary ? str(b.summary, 'resumen', 0, 280) : '', data: b.data || EMPTY, workspaceId: b.workspaceId || null });
    return c.json(card(one('SELECT * FROM designs WHERE id = ?', did)), 201);
  } catch (e) { if (e instanceof HttpError) throw e; bad(e.message); }
});

designs.get('/designs/:id', c => {
  const d = readable(c, one(withAuthor + ' WHERE d.id = ?', c.req.param('id')));
  return c.json({ ...card(d), mine: d.user_id === c.get('user')?.id, data: JSON.parse(d.data) });
});
designs.get('/d/:slug', c => {
  const d = readable(c, one(withAuthor + ' WHERE d.slug = ?', c.req.param('slug')));
  return c.json({ ...card(d), mine: d.user_id === c.get('user')?.id, data: JSON.parse(d.data) });
});

designs.put('/designs/:id', async c => {
  const u = requireUser(c, 'write'), b = await body(c, 30_000_000);
  const d = one('SELECT * FROM designs WHERE id = ? AND user_id = ?', c.req.param('id'), u.id);
  if (!d) throw new HttpError(404, 'No existe');
  const sets = [], args = [];
  if (b.title != null) { sets.push('title = ?'); args.push(str(b.title, 'título', 2, 80)); }
  if (b.summary != null) { sets.push('summary = ?'); args.push(str(b.summary, 'resumen', 0, 280)); }
  if (b.visibility != null) {
    if (!VIS.includes(b.visibility)) bad('Visibilidad no válida');
    if (b.visibility === 'public' && d.visibility !== 'public' && !u.verified) throw new HttpError(403, 'Confirma tu email para publicar diseños en la galería');
    sets.push('visibility = ?'); args.push(b.visibility);
    if (b.visibility !== d.visibility) audit(u.id, 'visibility', clientIp(c), { design: d.id, to: b.visibility });
  }
  if (b.data != null) {
    try { validateDoc(b.data); } catch (e) { bad(e.message); }
    const st = stats(decode(b.data));
    sets.push('data = ?', 'size = ?', 'blocks = ?'); args.push(JSON.stringify(b.data), JSON.stringify(st.size), st.blocks);
  }
  if (!sets.length) bad('Nada que cambiar');
  run(`UPDATE designs SET ${sets.join(', ')}, updated = ? WHERE id = ?`, ...args, Date.now(), d.id);
  return c.json(card(one('SELECT * FROM designs WHERE id = ?', d.id)));
});

designs.post('/designs/:id/duplicate', c => {
  const u = requireUser(c, 'write');
  const d = readable(c, one('SELECT * FROM designs WHERE id = ?', c.req.param('id')));
  const did = insertDesign(u.id, { title: `${d.title} (copia)`.slice(0, 80), summary: d.summary, data: JSON.parse(d.data), workspaceId: d.workspace_id });   // la copia sigue usando el mismo modpack para verse; los agentes solo lo leen si es tuyo o de ejemplo
  return c.json(card(one('SELECT * FROM designs WHERE id = ?', did)), 201);
});

designs.delete('/designs/:id', c => {
  const u = requireUser(c, 'write');
  if (!run('DELETE FROM designs WHERE id = ? AND user_id = ?', c.req.param('id'), u.id).changes) throw new HttpError(404, 'No existe');
  return c.json({ ok: true });
});

designs.get('/gallery', c => {
  const q = (c.req.query('q') || '').trim().slice(0, 60), page = Math.max(0, +(c.req.query('page') || 0));
  const rows = q ? all(withAuthor + " WHERE d.visibility = 'public' AND (d.title LIKE ? OR d.summary LIKE ?) ORDER BY d.updated DESC LIMIT 24 OFFSET ?", `%${q}%`, `%${q}%`, page * 24)
    : all(withAuthor + " WHERE d.visibility = 'public' ORDER BY d.updated DESC LIMIT 24 OFFSET ?", page * 24);
  return c.json(rows.map(card));
});

designs.get('/designs/:id/export.nbt', c => {
  const d = readable(c, one('SELECT * FROM designs WHERE id = ?', c.req.param('id')));
  const { file, skipped, size } = toStructureNbt(decode(JSON.parse(d.data)));
  return new Response(file, { headers: {
    'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${d.slug}.nbt"`,
    'x-craftometry-size': size.join('x'), 'x-craftometry-skipped': encodeURIComponent(JSON.stringify(skipped)).slice(0, 4000) } });
});

designs.get('/designs/:id/validate', c => c.json(validateModel(decode(JSON.parse(readable(c, one('SELECT * FROM designs WHERE id = ?', c.req.param('id'))).data)))));
