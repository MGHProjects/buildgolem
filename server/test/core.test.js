// Pruebas del núcleo: seguridad, formato de diseño, calculadora, validación de geometría, nbt, zip y flujo de la API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import zlib, { gunzipSync, deflateRawSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';

const tmp = mkdtempSync(join(tmpdir(), 'cm-'));
Object.assign(process.env, { DATA_DIR: tmp, CRAFTOMETRY_MASTER_KEY: randomBytes(32).toString('base64'), PUBLIC_URL: 'http://localhost:9', REDIRECT_HOSTS: 'old.example' });
const sec = await import('../src/security.js');
const { encode, decode, validateDoc } = await import('../src/design/format.js');
const { calc } = await import('../src/llm/tools.js');
const { validateModel } = await import('../src/design/validate.js');
const { toStructureNbt } = await import('../src/design/nbt.js');
const { listZip, readEntry, safeRelPath } = await import('../src/workspace/zip.js');
const { sizeOf, tierOf } = await import('../src/workspace/indexer.js');
const { extractJson } = await import('../src/llm/providers.js');
const { averageColor } = await import('../src/workspace/png.js');
const { createApp } = await import('../src/app.js');

test('contraseñas y cifrado', async () => {
  const h = await sec.hashPassword('correct horse battery');
  assert.ok(await sec.verifyPassword('correct horse battery', h));
  assert.ok(!(await sec.verifyPassword('otra cosa', h)));
  const k = randomBytes(32), blob = sec.encrypt(k, 'sk-secreta', 'user1');
  assert.equal(sec.decrypt(k, blob, 'user1'), 'sk-secreta');
  assert.throws(() => sec.decrypt(k, blob, 'user2'));            // el dato autenticado ata la clave a su usuario
});

test('SSRF: rechaza direcciones privadas y http', async () => {
  await assert.rejects(sec.assertPublicUrl('http://example.com'));
  await assert.rejects(sec.assertPublicUrl('https://127.0.0.1/x'));
  await assert.rejects(sec.assertPublicUrl('https://192.168.1.59/'));
  await assert.rejects(sec.assertPublicUrl('https://[::1]/'));
});

test('formato: objetos compartidos se guardan una vez y vuelven compartidos', () => {
  const gui = { title: 'Máquina', settings: ['a'] };
  const m = { P: { a: { n: 'A', id: 'x:a' } }, BLOCKS: [{ x: 0, y: 0, z: 0, t: 'a', gui }, { x: 1, y: 0, z: 0, t: 'a', gui }] };
  const doc = encode(m);
  assert.equal(doc.refs.length, 1);
  validateDoc(doc);
  const back = decode(doc);
  assert.equal(back.BLOCKS[0].gui, back.BLOCKS[1].gui);
  assert.throws(() => validateDoc({ ...doc, model: { ...doc.model, BLOCKS: [{ x: 0, y: 0, z: 0, t: 'zz' }] } }));
});

test('calculadora sin eval', () => {
  assert.equal(calc('ceil(1000/ (9*20/100))'), 556);
  assert.equal(calc('2^3*-1+min(4,2)'), -6);
  assert.throws(() => calc('process.exit()'));
});

test('tamaño real y familias de tier', () => {
  assert.deepEqual(sizeOf([0, 0, 0], [16, 32, 16]).size, [1, 2, 1]);           // Isotopic Centrifuge
  assert.deepEqual(sizeOf([-16, 0, -16], [32, 32, 32]).size, [3, 2, 3]);        // Digital Miner
  assert.deepEqual(sizeOf([-1, -0.01, -0.01], [17, 29, 16]).size, [1, 2, 1]);   // Solar Neutron Activator (salientes de 1 px)
  assert.deepEqual(tierOf('mekanism:ultimate_purifying_factory'), { family: 'mekanism:purifying_factory', tier: 'ultimate', rank: 3 });
  assert.equal(tierOf('minecraft:stone'), null);
});

test('validación: un bloque de 2 de alto choca con lo que tiene encima', () => {
  const m = { P: { c: { n: 'Centrífuga', id: 'mekanism:isotopic_centrifuge', size: [1, 2, 1] }, k: { n: 'Cable', id: 'x:cable' } },
    BLOCKS: [{ x: 0, y: 1, z: 0, t: 'c', f: 's' }, { x: 0, y: 2, z: 0, t: 'k' }] };
  const v = validateModel(m);
  assert.equal(v.ok, false);
  assert.match(v.errors[0].msg, /1×2×1/);
});

test('nbt: estructura con paleta, tamaño y bloques', () => {
  const { file, size, skipped } = toStructureNbt({ P: { a: { id: 'minecraft:stone' }, b: { id: 'ae2:fluix_covered_dense_cable' } }, BLOCKS: [{ x: 5, y: 1, z: 5, t: 'a' }, { x: 6, y: 1, z: 5, t: 'a' }, { x: 7, y: 1, z: 5, t: 'b' }] });
  assert.deepEqual(size, [2, 1, 1]);
  assert.equal(skipped['ae2:fluix_covered_dense_cable'], 1);
  const raw = gunzipSync(file);
  assert.equal(raw[0], 10);                                                       // compuesto raíz
  assert.ok(raw.includes(Buffer.from('minecraft:stone')));
});

test('zip: lista y lee entradas (deflate) y rechaza rutas peligrosas', () => {
  const data = Buffer.from('{"hola":1}'), comp = deflateRawSync(data), name = Buffer.from('assets/x/a.json');
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(0, 42);
  const body = Buffer.concat([local, name, comp]), cdAll = Buffer.concat([cd, name]);
  const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(cdAll.length, 12); eocd.writeUInt32LE(body.length, 16);
  const p = join(tmp, 't.zip'); writeFileSync(p, Buffer.concat([body, cdAll, eocd]));
  const [e] = listZip(p);
  assert.equal(e.name, 'assets/x/a.json');
  assert.equal(readEntry(p, e).toString(), '{"hola":1}');
  assert.equal(safeRelPath('../../etc/passwd'), null);
  assert.equal(safeRelPath('C:/Windows'), null);
  assert.equal(safeRelPath('mods\\a.jar'), 'mods/a.jar');
});

test('protocolo JSON: saca el objeto aunque venga con texto alrededor', () => {
  assert.deepEqual(extractJson('Vale. {"tool": "calc", "args": {"expr": "1+1"}} listo'), { tool: 'calc', args: { expr: '1+1' } });
  assert.equal(extractJson('sin json'), null);
});

test('color medio de un PNG', () => {
  // PNG 2×2 RGBA: tres píxeles rojos opacos y uno transparente → rojo
  const { crc32, deflateSync } = zlib;
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.from([0, 255, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 0, 255, 0, 0, 0, 0]);
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  assert.equal(averageColor(png), '#ff0000');
});

test('API: registro, CSRF, claves cifradas, diseños y visibilidad', async () => {
  const app = createApp(), H = { 'content-type': 'application/json', 'x-craftometry': '1', origin: 'http://localhost:9' };
  const req = (path, opts = {}) => app.request(path, opts);
  // sin cabecera propia → rechazado
  assert.equal((await req('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 403);
  const reg = await req('/api/auth/register', { method: 'POST', headers: H, body: JSON.stringify({ email: 'ana@example.com', password: 'una clave larga', name: 'Ana', accept: true }) });
  assert.equal(reg.status, 201);
  const cookie = reg.headers.get('set-cookie').split(';')[0], A = { ...H, cookie };
  assert.equal((await req('/api/auth/login', { method: 'POST', headers: H, body: JSON.stringify({ email: 'ana@example.com', password: 'mal' }) })).status, 401);
  // clave de IA: se guarda cifrada y nunca vuelve
  const k = await (await req('/api/keys', { method: 'POST', headers: A, body: JSON.stringify({ provider: 'groq', apiKey: 'gsk_123456789abcdef', model: 'openai/gpt-oss-120b' }) })).json();
  assert.equal(k.last4, 'cdef');
  assert.ok(!JSON.stringify(await (await req('/api/keys', { headers: A })).json()).includes('gsk_'));
  // proveedor personalizado a una IP privada → rechazado
  assert.equal((await req('/api/keys', { method: 'POST', headers: A, body: JSON.stringify({ provider: 'custom', apiKey: 'x'.repeat(10), model: 'm1', baseUrl: 'https://10.0.0.5/v1' }) })).status, 400);
  // diseño privado: otro usuario no lo ve; al hacerlo público, sí
  const d = await (await req('/api/designs', { method: 'POST', headers: A, body: JSON.stringify({ title: 'Sala de prueba' }) })).json();
  const reg2 = await req('/api/auth/register', { method: 'POST', headers: H, body: JSON.stringify({ email: 'bea@example.com', password: 'otra clave larga', name: 'Bea', accept: true }) });
  const B = { ...H, cookie: reg2.headers.get('set-cookie').split(';')[0] };
  assert.equal((await req(`/api/designs/${d.id}`, { headers: B })).status, 404);
  assert.equal((await req(`/api/designs/${d.id}`, { method: 'PUT', headers: B, body: JSON.stringify({ title: 'robado' }) })).status, 404);
  assert.equal((await req(`/api/designs/${d.id}`, { method: 'PUT', headers: A, body: JSON.stringify({ visibility: 'public' }) })).status, 403);   // sin email verificado no publica
  (await import('../src/db.js')).run("UPDATE users SET verified = 1 WHERE email = 'ana@example.com'");
  await req(`/api/designs/${d.id}`, { method: 'PUT', headers: A, body: JSON.stringify({ visibility: 'public' }) });
  assert.equal((await req(`/api/designs/${d.id}`, { headers: B })).status, 200);
  assert.equal((await (await req('/api/gallery')).json()).length, 1);
  // token personal: lee, no puede crear claves
  const t = await (await req('/api/tokens', { method: 'POST', headers: A, body: JSON.stringify({ name: 'mod' }) })).json();
  assert.equal((await req('/api/designs', { headers: { authorization: `Bearer ${t.token}` } })).status, 200);
  assert.equal((await req('/api/designs', { method: 'POST', headers: { authorization: `Bearer ${t.token}`, 'content-type': 'application/json' }, body: '{"title":"xx"}' })).status, 403);
});

test('licencias: solo los modId de [[mods]]; las dependencias no heredan la licencia', async () => {
  const { licensesFromToml } = await import('../src/workspace/indexer.js');
  const toml = 'license="MIT"\n[[mods]]\n    modId="mekanism"\n[[dependencies.mekanism]]\n    modId="minecraft"\n[[dependencies.mekanism]]\n    modId="jei"\n';
  assert.deepEqual(licensesFromToml(toml), { mekanism: 'MIT' });
});

test('dominio antiguo: las páginas redirigen al nuevo y la API sigue', async () => {
  const app = createApp();
  const page = await app.request('/galeria?q=ae2', { headers: { host: 'old.example' } });
  assert.equal(page.status, 301);
  assert.equal(page.headers.get('location'), 'http://localhost:9/galeria?q=ae2');
  const apiCall = await app.request('/api/auth/me', { headers: { host: 'old.example', 'x-craftometry': '1' } });
  assert.notEqual(apiCall.status, 301);
});
