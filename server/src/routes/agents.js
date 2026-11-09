// Chat con los agentes por diseño. El turno se ejecuta en el servidor (la clave del usuario no sale de aquí) y los eventos salen por SSE.
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { one, run } from '../db.js';
import { id } from '../security.js';
import { body, str, requireUser, HttpError } from '../http.js';
import { getAgents } from '../llm/catalog.js';
import { runAgent } from '../llm/agent.js';
import { keyForUser } from './keys.js';
import { validateDoc, decode } from '../design/format.js';
import { stats } from '../design/format.js';

export const agents = new Hono();
const running = new Set();                       // un turno a la vez por usuario

agents.get('/agents', c => c.json(Object.values(getAgents()).map(a => ({ name: a.name, title: a.title, description: a.description, tools: a.tools }))));

agents.get('/designs/:id/chat', c => {
  const u = requireUser(c), d = one('SELECT id FROM designs WHERE id = ? AND user_id = ?', c.req.param('id'), u.id);
  if (!d) throw new HttpError(404, 'No existe');
  const ch = one('SELECT messages FROM chats WHERE design_id = ? AND user_id = ?', d.id, u.id);
  return c.json(ch ? JSON.parse(ch.messages).filter(m => m.role === 'user' || (m.role === 'assistant' && m.content && !m.toolCalls)) : []);
});
agents.delete('/designs/:id/chat', c => {
  const u = requireUser(c, 'write');
  run('DELETE FROM chats WHERE design_id = ? AND user_id = ?', c.req.param('id'), u.id);
  return c.json({ ok: true });
});

agents.post('/designs/:id/chat', async c => {
  const u = requireUser(c, 'write'), b = await body(c);
  const d = one('SELECT d.*, w.name wname, w.mc_version, w.status wstatus, w.user_id wowner FROM designs d LEFT JOIN workspaces w ON w.id = d.workspace_id WHERE d.id = ? AND d.user_id = ?', c.req.param('id'), u.id);
  if (!d) throw new HttpError(404, 'No existe');
  const key = keyForUser(u.id, b.keyId);
  if (!key) throw new HttpError(400, 'Añade una clave de IA en Ajustes → Claves de IA');
  if (running.has(u.id)) throw new HttpError(429, 'Ya tienes un agente trabajando');
  const agentName = getAgents()[b.agent] ? b.agent : 'orchestrator', text = str(b.message, 'mensaje', 1, 8000);
  const ch = one('SELECT * FROM chats WHERE design_id = ? AND user_id = ?', d.id, u.id);
  const history = ch ? JSON.parse(ch.messages) : [];
  history.push({ role: 'user', content: text });
  let doc = JSON.parse(d.data);
  const saveDesign = next => {
    validateDoc(next);
    const st = stats(decode(next));
    run('UPDATE designs SET data = ?, size = ?, blocks = ?, updated = ? WHERE id = ?', JSON.stringify(next), JSON.stringify(st.size), st.blocks, Date.now(), d.id);
    doc = next;
  };
  running.add(u.id);
  const ac = new AbortController();
  return streamSSE(c, async stream => {
    stream.onAbort(() => ac.abort());
    const emit = ev => { stream.writeSSE({ data: JSON.stringify(ev) }).catch(() => {}); if (ev.type === 'tool' && ev.name === 'edit_design') pendingReload = true; };
    let pendingReload = false;
    try {
      const ctx = { key, userId: u.id, workspaceId: d.workspace_id && d.wstatus === 'ready' && (d.wowner === u.id || d.wowner == null) ? d.workspace_id : null, workspaceName: d.wname, mcVersion: d.mc_version,
        lang: u.lang, signal: ac.signal, get design() { return doc; }, set design(v) { doc = v; }, saveDesign };
      const r = await runAgent(agentName, history.slice(-30), ctx, emit);
      if (r.text) history.push({ role: 'assistant', content: r.text });
      if (r.asked) history.push({ role: 'assistant', content: JSON.stringify({ questions: r.asked }), asked: true });
      const now = Date.now();
      if (ch) run('UPDATE chats SET messages = ?, updated = ? WHERE id = ?', JSON.stringify(history.slice(-80)), now, ch.id);
      else run('INSERT INTO chats (id, design_id, user_id, messages, updated) VALUES (?, ?, ?, ?, ?)', id(), d.id, u.id, JSON.stringify(history.slice(-80)), now);
      await stream.writeSSE({ data: JSON.stringify({ type: 'done', reload: pendingReload }) });
    } catch (e) {
      await stream.writeSSE({ data: JSON.stringify({ type: 'error', text: String(e.message || e).slice(0, 400) }) });
    } finally { running.delete(u.id); }
  });
});
