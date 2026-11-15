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
// turnos en curso por diseño. El turno no depende de la conexión: si el navegador o el túnel la cortan, sigue en el servidor,
// guarda lo que hace y el cliente se vuelve a enganchar con GET …/chat/live?from=<eventos ya vistos>
const runs = new Map();                          // designId → { userId, events, done, subs, ac }
const TURN_MAX_MS = 40 * 60_000, KEEP_MS = 10 * 60_000;
const activeFor = userId => [...runs.values()].some(r => !r.done && r.userId === userId);

function follow(c, run, from) {
  return streamSSE(c, async stream => {
    // latido (comentario SSE, el cliente lo ignora): Cloudflare corta un flujo que pasa ~100 s sin datos
    const ping = setInterval(() => stream.write(': ping\n\n').catch(() => {}), 20_000);
    let wake = () => {};
    const sub = () => wake();
    run.subs.add(sub);
    stream.onAbort(() => wake());
    try {
      for (let i = from; ;) {
        while (i < run.events.length && !stream.aborted) await stream.writeSSE({ data: JSON.stringify(run.events[i++]) });
        if (run.done || stream.aborted) break;
        await new Promise(r => { wake = r; });
      }
    } finally { clearInterval(ping); run.subs.delete(sub); }
  });
}

agents.get('/agents', c => c.json(Object.values(getAgents()).map(a => ({ name: a.name, title: a.title, description: a.description, tools: a.tools }))));

agents.get('/designs/:id/chat', c => {
  const u = requireUser(c), d = one('SELECT id FROM designs WHERE id = ? AND user_id = ?', c.req.param('id'), u.id);
  if (!d) throw new HttpError(404, 'No existe');
  const ch = one('SELECT messages FROM chats WHERE design_id = ? AND user_id = ?', d.id, u.id);
  return c.json(ch ? JSON.parse(ch.messages).filter(m => m.role === 'user' || (m.role === 'assistant' && m.content && !m.toolCalls)).map(({ trace, ...m }) => m) : []);
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
  if (activeFor(u.id)) throw new HttpError(429, 'Ya tienes un agente trabajando');
  const agentName = getAgents()[b.agent] ? b.agent : 'orchestrator', text = str(b.message, 'mensaje', 1, 8000);
  const history = (() => { const ch = one('SELECT messages FROM chats WHERE design_id = ? AND user_id = ?', d.id, u.id); return ch ? JSON.parse(ch.messages) : []; })();
  const saveChat = () => {
    const ch = one('SELECT id FROM chats WHERE design_id = ? AND user_id = ?', d.id, u.id), now = Date.now();
    // la traza (herramientas y resultados) solo de los últimos turnos: sirve para saber por qué un diseño salió mal
    const keep = history.slice(-80).map((m, i, a) => (m.trace && i < a.length - 10 ? { ...m, trace: undefined } : m));
    if (ch) run('UPDATE chats SET messages = ?, updated = ? WHERE id = ?', JSON.stringify(keep), now, ch.id);
    else run('INSERT INTO chats (id, design_id, user_id, messages, updated) VALUES (?, ?, ?, ?, ?)', id(), d.id, u.id, JSON.stringify(keep), now);
  };
  history.push({ role: 'user', content: text });
  saveChat();                                                      // el mensaje queda guardado aunque el turno se corte
  let doc = JSON.parse(d.data);
  const saveDesign = next => {
    validateDoc(next);
    const st = stats(decode(next));
    run('UPDATE designs SET data = ?, size = ?, blocks = ?, updated = ? WHERE id = ?', JSON.stringify(next), JSON.stringify(st.size), st.blocks, Date.now(), d.id);
    doc = next;
  };
  const turn = { userId: u.id, events: [], done: false, subs: new Set(), ac: new AbortController() };
  const emit = ev => { turn.events.push({ ...ev, n: turn.events.length, at: Date.now() }); for (const f of turn.subs) f(); };
  const trace = () => turn.events.filter(e => e.type === 'tool' || e.type === 'result' || e.type === 'step').slice(-600).map(e => e.type === 'tool'
    ? { t: 'tool', agent: e.agent, name: e.name, args: JSON.stringify(e.args ?? {}).slice(0, 2000) }
    : e.type === 'result' ? { t: 'result', agent: e.agent, name: e.name, text: String(e.text || '').slice(0, 400), image: e.image ? true : undefined } : { t: 'step', agent: e.agent, text: e.text });
  runs.set(d.id, turn);
  const limit = setTimeout(() => turn.ac.abort(new Error('El turno ha superado el tiempo máximo')), TURN_MAX_MS);
  (async () => {
    let reload = false;
    try {
      const ctx = { key, userId: u.id, workspaceId: d.workspace_id && d.wstatus === 'ready' && (d.wowner === u.id || d.wowner == null) ? d.workspace_id : null, workspaceName: d.wname, mcVersion: d.mc_version,
        lang: u.lang, signal: turn.ac.signal, get design() { return doc; }, set design(v) { doc = v; }, saveDesign: next => { saveDesign(next); reload = true; } };
      const r = await runAgent(agentName, history.slice(-30), ctx, emit);
      if (r.text) history.push({ role: 'assistant', content: r.text, trace: trace(), model: `${key.provider}/${key.model}` });
      if (r.asked) history.push({ role: 'assistant', content: JSON.stringify({ questions: r.asked }), asked: true });
      saveChat();
      emit({ type: 'done', reload });
    } catch (e) {
      // lo hecho hasta aquí ya está guardado en el diseño; la nota deja constancia en el chat para poder decir "continúa"
      const msg = String(turn.ac.signal.reason?.message || e.message || e).slice(0, 400);
      history.push({ role: 'assistant', content: `Turno interrumpido: ${msg}. Lo que se llegó a construir está guardado en el diseño; escribe "continúa" para seguir.`, trace: trace(), model: `${key.provider}/${key.model}` });
      saveChat();
      emit({ type: 'error', text: msg, reload });
    } finally {
      clearTimeout(limit);
      turn.done = true;
      for (const f of turn.subs) f();
      setTimeout(() => { if (runs.get(d.id) === turn) runs.delete(d.id); }, KEEP_MS).unref?.();
    }
  })();
  return follow(c, turn, 0);
});

// volver a engancharse a un turno en curso (corte de red, recarga de la página, chat cerrado y vuelto a abrir)
agents.get('/designs/:id/chat/live', c => {
  const u = requireUser(c), turn = runs.get(c.req.param('id')), from = Math.max(0, Math.floor(+c.req.query('from') || 0));
  // un turno ya terminado solo se repite a quien lo seguía (from > 0); al abrir la página, su respuesta ya está en el historial
  if (!turn || turn.userId !== u.id || (turn.done && (from === 0 || from >= turn.events.length))) return c.body(null, 204);
  return follow(c, turn, from);
});
agents.post('/designs/:id/chat/stop', c => {
  const u = requireUser(c, 'write'), turn = runs.get(c.req.param('id'));
  if (turn && turn.userId === u.id && !turn.done) turn.ac.abort(new Error('Detenido por el jugador'));
  return c.json({ ok: true });
});
