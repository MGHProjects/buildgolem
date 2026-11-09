// Pruebas de CurseForge con su API simulada: búsqueda, mods que el autor no deja descargar y subir un .jar a mano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';

const tmp = mkdtempSync(join(tmpdir(), 'cm-cf-'));
Object.assign(process.env, { DATA_DIR: tmp, CRAFTOMETRY_MASTER_KEY: randomBytes(32).toString('base64'), PUBLIC_URL: 'http://localhost:9', CURSEFORGE_API_KEY: 'cf-test-key' });
const cfmod = await import('../src/curseforge.js');
const { createApp } = await import('../src/app.js');
const app = createApp(), H = { 'content-type': 'application/json', 'x-craftometry': '1', origin: 'http://localhost:9' };

const seen = [];
cfmod.deps.fetch = async (url, opts) => {
  seen.push({ url, key: opts.headers['x-api-key'] });
  const u = new URL(url), json = d => new Response(JSON.stringify({ data: d }), { status: 200 });
  if (u.pathname === '/v1/mods/search') return json([{ id: 925200, name: 'All the Mods 10', slug: 'all-the-mods-10', summary: 'ATM10', downloadCount: 5, logo: { thumbnailUrl: 'https://media.forgecdn.net/x.png' }, links: { websiteUrl: 'https://www.curseforge.com/minecraft/modpacks/all-the-mods-10' }, latestFilesIndexes: [{ gameVersion: '1.21.1' }, { gameVersion: '1.21.1' }] }]);
  if (u.pathname === '/v1/mods/files') return json([
    { id: 1, modId: 10, displayName: 'Mekanism', fileName: 'Mekanism-1.21.1.jar', downloadUrl: 'https://edge.forgecdn.net/files/1/1/Mekanism-1.21.1.jar', hashes: [{ algo: 1, value: 'abc' }] },
    { id: 2, modId: 20, displayName: 'Sin distribución', fileName: 'privado.jar', downloadUrl: null },
    { id: 3, modId: 30, displayName: 'Otro host', fileName: 'raro.jar', downloadUrl: 'https://evil.example/raro.jar' },
  ]);
  if (u.pathname === '/v1/mods') return json([{ id: 20, links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/privado' } }, { id: 30, links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/raro' } }]);
  return new Response('{}', { status: 404 });
};

test('CurseForge: busca modpacks con la clave del servidor y la clave nunca sale', async () => {
  const reg = await app.request('/api/auth/register', { method: 'POST', headers: H, body: JSON.stringify({ email: 'cf@example.com', password: 'clave larga de cf', name: 'Cf', accept: true }) });
  const A = { ...H, cookie: reg.headers.get('set-cookie').split(';')[0] };
  assert.deepEqual(await (await app.request('/api/curseforge/status', { headers: A })).json(), { enabled: true });
  const hits = await (await app.request('/api/curseforge/search?q=all%20the%20mods', { headers: A })).json();
  assert.equal(hits[0].id, 925200);
  assert.deepEqual(hits[0].versions, ['1.21.1']);
  assert.ok(!JSON.stringify(hits).includes('cf-test-key'));
  assert.equal(seen.at(-1).key, 'cf-test-key');
});

test('CurseForge: los mods sin descarga permitida (o de otro host) se piden a mano, con su página', async () => {
  const { ok, missing } = await cfmod.manifestFiles({ files: [{ fileID: 1 }, { fileID: 2 }, { fileID: 3 }, { fileID: 4, required: false }] });
  assert.deepEqual(ok.map(f => f.fileName), ['Mekanism-1.21.1.jar']);
  assert.deepEqual(missing.map(m => m.name), ['Sin distribución', 'Otro host']);
  assert.equal(missing[0].url, 'https://www.curseforge.com/minecraft/mc-mods/privado/files/2');
});

test('subir a mano un .jar que falta: solo .jar válidos y lo quita de la lista', async () => {
  const reg = await app.request('/api/auth/register', { method: 'POST', headers: H, body: JSON.stringify({ email: 'jar@example.com', password: 'clave larga de jar', name: 'Jar', accept: true }) });
  const A = { ...H, cookie: reg.headers.get('set-cookie').split(';')[0] };
  const w = await (await app.request('/api/workspaces', { method: 'POST', headers: A, body: JSON.stringify({ name: 'Pack', source: 'upload', size: 10 }) })).json();
  const { run } = await import('../src/db.js');
  run("UPDATE workspaces SET status = 'ready' WHERE id = ?", w.id);
  const dir = join(tmp, 'workspaces', w.id);
  mkdirSync(join(dir, 'files', 'mods'), { recursive: true });
  writeFileSync(join(dir, 'missing.json'), JSON.stringify([{ name: 'Privado', fileName: 'privado.jar', url: null }]));
  assert.equal((await (await app.request(`/api/workspaces/${w.id}`, { headers: A })).json()).missing.length, 1);
  const J = { ...A, 'content-type': 'application/java-archive' };
  assert.equal((await app.request(`/api/workspaces/${w.id}/jar?name=x.zip`, { method: 'POST', headers: J, body: Buffer.from('PK\x03\x04') })).status, 400);
  assert.equal((await app.request(`/api/workspaces/${w.id}/jar?name=privado.jar`, { method: 'POST', headers: J, body: Buffer.from('no es un zip') })).status, 400);
  // zip mínimo con una entrada
  const name = Buffer.from('a.txt'), data = deflateRawSync(Buffer.from('hola')), crc = 0;
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(4, 22); lh.writeUInt16LE(name.length, 26);
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(data.length, 20); cd.writeUInt32LE(4, 24); cd.writeUInt16LE(name.length, 28);
  const body = Buffer.concat([lh, name, data]), cdir = Buffer.concat([cd, name]);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(cdir.length, 12); end.writeUInt32LE(body.length, 16);
  const r = await app.request(`/api/workspaces/${w.id}/jar?name=privado.jar`, { method: 'POST', headers: J, body: Buffer.concat([body, cdir, end]) });
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).missing, []);
  assert.ok(existsSync(join(dir, 'files', 'mods', 'privado.jar')));
});
