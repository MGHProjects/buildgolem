// Aplicación Hono: cabeceras de seguridad, usuario por petición, CSRF, rutas de la API y la web compilada con fallback de SPA.
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { WEB_DIR, PUBLIC_URL, REDIRECT_HOSTS } from './config.js';
import { HttpError, loadUser, csrfOk, body } from './http.js';
import { one } from './db.js';
import { auth } from './routes/auth.js';
import { keys } from './routes/keys.js';
import { designs } from './routes/designs.js';
import { workspaces, colorsFor } from './routes/workspaces.js';
import { agents } from './routes/agents.js';
import { link } from './routes/link.js';
import { reader } from './workspace/reader.js';

const CSP = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https://cdn.modrinth.com https://media.forgecdn.net", "font-src 'self' data:",
  "connect-src 'self' https://api.modrinth.com", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join('; ');

export function createApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    await next();
    c.header('Content-Security-Policy', CSP);
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    c.header('Cross-Origin-Opener-Policy', 'same-origin');
  });
  // dominio antiguo (craftometry.dualix.io): las páginas se mudan al nuevo; la API sigue respondiendo para los mods ya instalados
  app.use('*', async (c, next) => {
    const host = (c.req.header('host') || '').toLowerCase();
    if (!REDIRECT_HOSTS.has(host) || c.req.path.startsWith('/api/')) return next();
    const q = c.req.url.indexOf('?');
    return c.redirect(PUBLIC_URL + c.req.path + (q < 0 ? '' : c.req.url.slice(q)), 301);
  });
  app.use('/api/*', async (c, next) => {
    if (!csrfOk(c)) return c.json({ error: 'Petición rechazada (origen)' }, 403);
    c.set('user', loadUser(c));
    c.header('Cache-Control', 'no-store');
    await next();
  });
  app.onError((e, c) => {
    if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
    console.error(e);
    return c.json({ error: 'Error interno' }, 500);
  });

  app.route('/api/auth', auth);
  app.route('/api', keys);
  app.route('/api', designs);
  app.route('/api', workspaces);
  app.route('/api', agents);
  app.route('/api', link);
  app.get('/api/health', c => c.json({ ok: true }));

  // geometría y colores de un diseño legible por quien mira: modelos siempre; texturas solo al dueño del workspace
  const designFor = c => {
    const d = one('SELECT * FROM designs WHERE id = ?', c.req.param('id')), u = c.get('user');
    if (!d || (d.visibility === 'private' && d.user_id !== u?.id)) throw new HttpError(404, 'No existe');
    return d;
  };
  app.post('/api/designs/:id/models', async c => {
    const d = designFor(c), b = await body(c);
    if (!d.workspace_id) return c.json({});
    const refs = (Array.isArray(b.refs) ? b.refs : []).filter(r => typeof r === 'string' && /^[\w:./+-]{3,300}$/.test(r)).slice(0, 400);
    return c.json(reader(d.workspace_id).models(refs));
  });
  app.post('/api/designs/:id/look', async c => {
    const d = designFor(c), b = await body(c), u = c.get('user');
    if (!d.workspace_id) return c.json({ mode: 'colors', colors: {} });
    const w = one('SELECT user_id FROM workspaces WHERE id = ?', d.workspace_id), base = `/api/workspaces/${d.workspace_id}/tex/`;
    if (u && w && w.user_id === u.id) return c.json({ mode: 'textures', base });
    const open = reader(d.workspace_id).open;
    const keys = (Array.isArray(b.keys) ? b.keys : []).filter(k => typeof k === 'string' && /^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(k) && !open.has(k.split(':')[0]));
    return c.json({ mode: keys.length ? 'mixed' : 'textures', base, open: [...open], colors: colorsFor(d.workspace_id, keys) });
  });

  app.all('/api/*', c => c.json({ error: 'No existe' }, 404));

  // web: archivos con hash cacheados un año; el resto de rutas devuelven index.html (la app decide la página)
  if (existsSync(WEB_DIR)) {
    const index = () => readFileSync(join(WEB_DIR, 'index.html'), 'utf8');
    app.use('/assets/*', async (c, next) => { await next(); c.header('Cache-Control', 'public, max-age=31536000, immutable'); });
    app.use('*', serveStatic({ root: relative(process.cwd(), WEB_DIR) || '.' }));
    app.get('*', c => c.html(index()));
  }
  return app;
}
