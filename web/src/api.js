// Cliente de la API: misma origen, cookie de sesión y cabecera anti-CSRF en todo lo que cambia datos.
export class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

export async function api(path, { method = 'GET', body, signal } = {}) {
  const r = await fetch(`/api${path}`, {
    method, signal, credentials: 'same-origin',
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), 'x-craftometry': '1' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  if (!r.ok) throw new ApiError(r.status, data?.error || `Error ${r.status}`);
  return data;
}

// subida por trozos de 50 MB (el túnel corta a 100 MB por petición); se puede reanudar desde lo que ya tiene el servidor
export async function uploadChunks(workspaceId, file, onProgress) {
  const CH = 50 * 1024 * 1024;
  let offset = 0;
  while (offset < file.size) {
    const r = await fetch(`/api/workspaces/${workspaceId}/chunk?offset=${offset}`, { method: 'PUT', headers: { 'x-craftometry': '1', 'content-type': 'application/octet-stream' }, body: file.slice(offset, offset + CH) });
    const j = await r.json();
    if (r.status === 409 && Number.isFinite(j.have)) { offset = j.have; continue; }
    if (!r.ok) throw new ApiError(r.status, j.error);
    offset = j.have;
    onProgress?.(offset / file.size);
  }
  return api(`/workspaces/${workspaceId}/complete`, { method: 'POST', body: {} });
}

async function readSSE(r, onEvent) {
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const line = chunk.split('\n').find(l => l.startsWith('data:'));
      if (line) { try { onEvent(JSON.parse(line.slice(5))); } catch { /* evento roto */ } }
    }
  }
}

// chat con agentes por SSE (fetch + lector de flujo, porque EventSource no admite POST). El turno sigue en el servidor aunque
// se corte la conexión: aquí se reengancha solo con …/chat/live desde el último evento visto. payload null = solo engancharse.
export async function chatStream(designId, payload, onEvent, signal) {
  const headers = { 'content-type': 'application/json', 'x-craftometry': '1' };
  let from = 0, finished = false, fails = 0;
  const on = ev => { if (ev.n != null) from = ev.n + 1; if (ev.type === 'done' || ev.type === 'error') finished = true; onEvent(ev); };
  for (let first = payload != null; ;) {
    try {
      const r = first ? await fetch(`/api/designs/${designId}/chat`, { method: 'POST', signal, headers, body: JSON.stringify(payload) })
        : await fetch(`/api/designs/${designId}/chat/live?from=${from}`, { signal, headers });
      first = false;
      if (r.status === 204) return;                                  // no hay turno en marcha (o ya terminó)
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new ApiError(r.status, j.error || `Error ${r.status}`); }
      fails = 0;
      await readSSE(r, on);
      if (finished) return;
    } catch (e) {
      if (signal?.aborted || e instanceof ApiError) throw e;
      if (++fails > 20) throw new ApiError(0, e.message || 'network error');
    }
    onEvent({ type: 'reconnecting' });
    await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** fails, 15_000)));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  }
}
