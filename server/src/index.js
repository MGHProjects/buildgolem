// Arranque del servidor de BuildGolem.
import { serve } from '@hono/node-server';
import { PORT, HOST, PUBLIC_URL, assertConfig } from './config.js';
import { createApp } from './app.js';
import { all, run } from './db.js';
import { enqueue } from './workspace/importer.js';

assertConfig();
// los workspaces que estaban procesándose al cerrar vuelven a la cola
for (const w of all("SELECT id FROM workspaces WHERE status IN ('queued','processing')")) enqueue(w.id);
// plazos de la política de privacidad: sesiones y enlaces caducados, registro de seguridad de más de 12 meses
const purge = () => {
  const now = Date.now();
  run('DELETE FROM sessions WHERE expires < ?', now);
  run('DELETE FROM email_tokens WHERE expires < ?', now);
  run('DELETE FROM audit WHERE at < ?', now - 365 * 864e5);
};
purge(); setInterval(purge, 864e5).unref();
serve({ fetch: createApp().fetch, port: PORT, hostname: HOST }, () => console.log(`BuildGolem en http://${HOST}:${PORT} (público: ${PUBLIC_URL})`));
