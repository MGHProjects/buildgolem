// CurseForge por su API oficial (api.curseforge.com) con la clave del servidor (CURSEFORGE_API_KEY).
// Desde el 16 de julio de 2026 su CDN también exige la clave, así que sin ella no hay forma legítima de descargar.
// Los mods cuyo autor no permite la distribución a otras apps no traen downloadUrl: se piden al usuario.
import { CURSEFORGE_API_KEY } from './config.js';
import { HttpError } from './http.js';

const BASE = 'https://api.curseforge.com', MINECRAFT = 432, MODPACKS = 4471;
export const CF_HOSTS = new Set(['edge.forgecdn.net', 'mediafilez.forgecdn.net']);
export const deps = { fetch: (...a) => fetch(...a) };                          // los tests lo cambian

export const cfEnabled = () => !!CURSEFORGE_API_KEY;

export async function cf(path, { method = 'GET', body } = {}) {
  if (!cfEnabled()) throw new HttpError(503, 'CurseForge aún no está conectado: falta la clave de su API. Mientras tanto, sube la carpeta de la instancia en zip.');
  const r = await deps.fetch(BASE + path, {
    method, body: body && JSON.stringify(body), signal: AbortSignal.timeout(20_000),
    headers: { 'x-api-key': CURSEFORGE_API_KEY, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
  });
  if (r.status === 401 || r.status === 403) throw new HttpError(502, 'CurseForge ha rechazado la clave de la API');
  if (!r.ok) throw new HttpError(502, `CurseForge respondió ${r.status}`);
  return (await r.json()).data;
}

const pick = m => ({
  id: m.id, name: m.name, slug: m.slug, summary: m.summary, downloads: m.downloadCount,
  logo: m.logo?.thumbnailUrl || null, url: m.links?.websiteUrl || null, distributable: m.allowModDistribution !== false,
  versions: [...new Set((m.latestFilesIndexes || []).map(f => f.gameVersion))].slice(0, 6),
});

export async function searchPacks(q) {
  const qs = new URLSearchParams({ gameId: MINECRAFT, classId: MODPACKS, searchFilter: String(q).slice(0, 80), sortField: 2, sortOrder: 'desc', pageSize: 12 });
  return (await cf(`/v1/mods/search?${qs}`)).map(pick);
}

/** El archivo del modpack que toca: el de esa versión de Minecraft si se pidió, o el principal. */
export async function packFile(modId, mc) {
  const mod = await cf(`/v1/mods/${Number(modId)}`);
  if (mod.classId !== MODPACKS) throw new Error('Ese proyecto de CurseForge no es un modpack');
  const files = mc ? (await cf(`/v1/mods/${mod.id}/files?gameVersion=${encodeURIComponent(mc)}&pageSize=20`)) : [];
  const file = files.find(f => f.releaseType === 1 && !f.isServerPack) || files[0] || await cf(`/v1/mods/${mod.id}/files/${mod.mainFileId}`);
  if (!file.downloadUrl) throw new Error(`El autor de «${mod.name}» no permite descargarlo desde otras apps. Descárgalo en CurseForge (o comprime la carpeta de la instancia) y súbelo aquí.`);
  return { mod: pick(mod), file };
}

/** Archivos de los mods del manifest: los descargables y, aparte, los que hay que subir a mano (con su página). */
export async function manifestFiles(manifest) {
  const wanted = (manifest.files || []).filter(f => f.required !== false);
  const data = wanted.length ? await cf('/v1/mods/files', { method: 'POST', body: { fileIds: wanted.map(f => f.fileID) } }) : [];
  const ok = data.filter(f => f.downloadUrl && CF_HOSTS.has(new URL(f.downloadUrl).hostname));
  const blocked = data.filter(f => !ok.includes(f));
  let pages = {};
  if (blocked.length) {
    const mods = await cf('/v1/mods', { method: 'POST', body: { modIds: [...new Set(blocked.map(f => f.modId))] } });
    pages = Object.fromEntries(mods.map(m => [m.id, m.links?.websiteUrl]));
  }
  return {
    ok: ok.map(f => ({ url: f.downloadUrl, fileName: f.fileName, sha1: f.hashes?.find(h => h.algo === 1)?.value })),
    missing: blocked.map(f => ({ name: f.displayName, fileName: f.fileName, url: pages[f.modId] ? `${pages[f.modId]}/files/${f.id}` : null })),
  };
}
