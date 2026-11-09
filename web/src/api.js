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

// chat con agentes por SSE (fetch + lector de flujo, porque EventSource no admite POST)
export async function chatStream(designId, payload, onEvent, signal) {
  const r = await fetch(`/api/designs/${designId}/chat`, { method: 'POST', signal, headers: { 'content-type': 'application/json', 'x-craftometry': '1' }, body: JSON.stringify(payload) });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new ApiError(r.status, j.error || `Error ${r.status}`); }
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
