// Pruebas del núcleo: seguridad, formato de diseño, calculadora, validación de geometría, nbt, zip y flujo de la API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
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
  assert.deepEqual(sizeOf([0, 0, 0], [16, 16, 18]).size, [1, 1, 1]);            // cañón de patatas: el cañón sobresale 2 px
  assert.deepEqual(sizeOf([3, -1, -5], [13, 5, 15]).size, [1, 1, 1]);           // enlace de redstone: sobresale 5 px
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
  assert.deepEqual(size, [3, 1, 1]);
  assert.deepEqual(skipped, {});
  const raw = gunzipSync(file);
  assert.equal(raw[0], 10);                                                       // compuesto raíz
  assert.ok(raw.includes(Buffer.from('minecraft:stone')));
  assert.ok(raw.includes(Buffer.from('ae2:cable_bus')) && raw.includes(Buffer.from('ae2:fluix_covered_dense_cable'))); // el cable va dentro de un cable bus
});

// zip de una sola entrada (deflate), para los tests
const zip1 = (n, raw) => {
  const data = Buffer.from(raw), comp = deflateRawSync(data), name = Buffer.from(n);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(name.length, 28);
  const body = Buffer.concat([local, name, comp]), cdAll = Buffer.concat([cd, name]);
  const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(cdAll.length, 12); eocd.writeUInt32LE(body.length, 16);
  return Buffer.concat([body, cdAll, eocd]);
};

test('indexador: los mods que vienen dentro de otro jar (jarjar) se sacan y se indexan; las librerías no', async () => {
  const { workspaceJars } = await import('../src/workspace/indexer.js'), { mkdirSync } = await import('node:fs');
  const dir = join(tmp, 'wsjarjar'), mods = join(dir, 'files', 'mods'); mkdirSync(mods, { recursive: true });
  writeFileSync(join(mods, 'bundled.jar'), zip1('META-INF/jarjar/aeronautics.jar', zip1('assets/aeronautics/blockstates/envelope.json', '{}')));
  writeFileSync(join(mods, 'conlib.jar'), zip1('META-INF/jarjar/mixinextras.jar', zip1('com/x/A.class', 'x')));
  const jars = workspaceJars(dir).map(j => relative(dir, j).replaceAll('\\', '/'));
  assert.deepEqual(jars.sort(), ['files/mods/bundled.jar', 'files/mods/conlib.jar', 'jarjar/aeronautics.jar']);
  assert.equal(listZip(join(dir, 'jarjar', 'aeronautics.jar'))[0].name, 'assets/aeronautics/blockstates/envelope.json');
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

test('paneles AE2: se giran hacia la máquina que tocan y la validación avisa si no tocan nada', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const P = { fac: { n: 'Factoría', id: 'mekanism:elite_enriching_factory', yaw: 180, tier: { tier: 'elite' } }, cab: { n: 'Cable', id: 'ae2:cable_bus' } };
  const BLOCKS = [{ x: 1, y: 0, z: 0, t: 'fac', f: 's' }, ...[0, 1, 2].map(x => ({ x, y: 1, z: 0, t: 'cab', f: 's' }))];
  const ctx = { design: encode({ P, BLOCKS, TERMS: [], W: 3, H: 2 }), saveDesign() {} };
  const out = JSON.parse(await runTool('edit_design', { ops: [
    { op: 'part', x: 1, y: 1, z: 0, side: 'west', part: 'ae2:pattern_provider' },   // forma de bloque y mirando al cable de al lado, como hizo DeepSeek
    { op: 'place', x: 0, y: 0, z: 0, block: 'minecraft:stone', facing: 'arriba' },    // falla sola y las demás siguen
    { op: 'place', x: 3, y: 1, z: 0, block: 'ae2:cable_bus' },                        // un cable no es un bloque: celda de cable a la vista
  ] }, ctx));
  const m = decode(ctx.design);
  assert.deepEqual(m.TERMS.map(t => [t.x, t.y, t.z, m.P[t.t].id, t.f]), [[1, 1, 0, 'ae2:cable_pattern_provider', 'd']]);
  assert.match(out.failed[0].error, /facing/);
  assert.match(out.notes.join(' '), /girado a down/);
  const c = m.BLOCKS.find(b => b.x === 3 && b.y === 1);
  assert.ok(c.cable && m.P[c.t].shape === 'post');
  assert.ok(validateModel(m).ok);
  m.TERMS.push({ x: 0, y: 1, z: 0, t: m.TERMS[0].t, f: 'w' });                       // en el extremo, sin máquina: no hay a dónde girarlo
  assert.match(validateModel(m).errors[0].msg, /mira a west y ahí hay aire/);
});

test('room y copy: una sala con puerta y una fila copiada con sus paneles', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const P = { st: { id: 'mekanism:steel_casing' }, sky: { id: 'ae2:smooth_sky_stone_block' }, gl: { id: 'ae2:quartz_glass' }, lamp: { id: 'minecraft:sea_lantern' }, fac: { id: 'mekanism:elite_enriching_factory', yaw: 180, tier: { tier: 'elite' } } };
  const ctx = { design: encode({ P, BLOCKS: [], TERMS: [], W: 1, H: 1 }), saveDesign() {} };
  const out = JSON.parse(await runTool('edit_design', { ops: [   // el ejemplo de agents/designer.md
    { op: 'room', from: [0, 0, 0], to: [10, 5, 6], wall: 'mekanism:steel_casing', floor: 'ae2:smooth_sky_stone_block', roof: 'mekanism:steel_casing', glass: 'ae2:quartz_glass', light: 'minecraft:sea_lantern', door: 'south' },
    { op: 'place', x: 2, y: 1, z: 2, block: 'mekanism:elite_enriching_factory', facing: 'south' },
    { op: 'fill', from: [2, 2, 2], to: [3, 2, 2], cable: 'ae2:fluix_covered_cable', block: 'ae2:smooth_sky_stone_block' },
    { op: 'part', x: 2, y: 2, z: 2, side: 'down', part: 'ae2:cable_pattern_provider' },
    { op: 'copy', from: [2, 1, 2], to: [3, 2, 2], step: [2, 0, 0], times: 3 },
  ] }, ctx));
  const m = decode(ctx.design), at = (x, y, z) => m.BLOCKS.find(b => b.x === x && b.y === y && b.z === z);
  assert.equal(out.failed, undefined);
  assert.deepEqual([2, 4, 6, 8].map(x => m.P[at(x, 1, 2).t].id), Array(4).fill('mekanism:elite_enriching_factory'));
  assert.deepEqual(m.TERMS.map(t => `${t.x}${t.f}`).sort(), ['2d', '4d', '6d', '8d']);
  assert.ok(!at(5, 1, 6) && !at(5, 2, 6) && at(5, 3, 6));                                 // puerta de 1×2 en el lado sur
  assert.equal(m.P[at(0, 2, 0).t].id, 'mekanism:steel_casing');                           // esquina: pilar
  assert.equal(m.P[at(2, 2, 0).t].id, 'ae2:quartz_glass');                                // entre pilares: ventana
  assert.equal(m.P[at(2, 5, 2).t].id, 'minecraft:sea_lantern');                            // luz en el techo
  assert.ok(validateModel(m).ok);
  // reflejar en x gira los facing este/oeste
  await runTool('edit_design', { ops: [{ op: 'place', x: 1, y: 3, z: 1, block: 'mekanism:elite_enriching_factory', facing: 'east' }, { op: 'copy', from: [1, 3, 1], to: [1, 3, 1], at: [9, 3, 1], mirror: 'x' }] }, ctx);
  assert.equal(decode(ctx.design).BLOCKS.find(b => b.x === 9 && b.y === 3 && b.z === 1).f, 'w');
});

test('search_docs: lee el manual que trae el mod (GuideME), sin traducciones', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const ws = join(tmp, 'workspaces', 'wsdoc'), { mkdirSync } = await import('node:fs');
  mkdirSync(join(ws, 'index'), { recursive: true }); mkdirSync(join(ws, 'g'), { recursive: true });
  writeFileSync(join(ws, 'g', 'reactor.md'), '---\nnavigation:\n  title: Reactor\n---\n# Reactor\n\nThe Reactor is a multi-block generator. Place 36 <ItemLink id="powah:reactor_nitro" /> blocks in a 3X4 area.');
  writeFileSync(join(ws, 'g', 'fr.md'), '# Réacteur multi-block traduction');
  writeFileSync(join(ws, 'index', 'files.json'), JSON.stringify({ jars: [], files: {
    'assets/powah/guides/powah/book/generators/reactor.md': [0, -1, 0, 0, -1, 'g/reactor.md'],
    'assets/powah/guides/powah/book/_fr_fr/generators/reactor.md': [0, -1, 0, 0, -1, 'g/fr.md'] } }));
  const out = await runTool('search_docs', { query: 'reactor multiblock', mod: 'powah' }, { workspaceId: 'wsdoc' });
  assert.match(out, /36 powah:reactor_nitro blocks in a 3X4 area/);
  assert.doesNotMatch(out, /traduction/);
});

// workspace mínimo con bloques y objetos de Cataclysm para las pruebas de decoración
async function decoWorkspace() {
  const ws = join(tmp, 'workspaces', 'wsdeco'), { mkdirSync } = await import('node:fs');
  mkdirSync(join(ws, 'index'), { recursive: true }); mkdirSync(join(ws, 'g'), { recursive: true });
  const B = id => ({ id, name: id.split(':')[1], model: id.replace(':', ':block/'), yaw: 0, facing: false, size: [1, 1, 1], offset: [0, 0, 0], textures: [], tier: null });
  writeFileSync(join(ws, 'index', 'blocks.json'), JSON.stringify(['cataclysm:obsidian_bricks', 'cataclysm:obsidian_brick_stairs', 'cataclysm:obsidian_brick_slab', 'cataclysm:polished_obsidian', 'supplementaries:pedestal', 'minecraft:lantern', 'minecraft:chain', 'minecraft:red_carpet'].map(B)));
  writeFileSync(join(ws, 'index', 'items.json'), JSON.stringify([{ id: 'cataclysm:void_core', name: 'Void Core' }, { id: 'cataclysm:the_incinerator', name: 'The Incinerator' }]));
  writeFileSync(join(ws, 'g', 'lantern.json'), JSON.stringify({ variants: { 'hanging=false': { model: 'minecraft:block/lantern' }, 'hanging=true': { model: 'minecraft:block/lantern_hanging' } } }));
  writeFileSync(join(ws, 'index', 'files.json'), JSON.stringify({ jars: [], files: { 'assets/minecraft/blockstates/lantern.json': [0, -1, 0, 0, -1, 'g/lantern.json'] } }));
  return { workspaceId: 'wsdeco', design: encode({ P: {}, BLOCKS: [], W: 1, H: 1 }), saveDesign() {} };
}

test('decoración: arrange reparte en espejo mirando al centro, deja libre la puerta y expone los objetos', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const ctx = await decoWorkspace(), style = { base: 'cataclysm:obsidian_bricks', trim: 'cataclysm:polished_obsidian', display: 'supplementaries:pedestal' };
  const out = JSON.parse(await runTool('edit_design', { ops: [
    { op: 'room', from: [0, 0, 0], to: [12, 6, 10], wall: 'cataclysm:obsidian_bricks', floor: 'cataclysm:polished_obsidian', roof: 'cataclysm:obsidian_bricks', door: 'south' },
    { op: 'arrange', prefab: 'pedestal', layout: 'walls', area: [1, 1, 11, 9], y: 1, spacing: 3, margin: 1, style, items: ['cataclysm:void_core', 'cataclysm:the_incinerator'] },
    { op: 'prefab', prefab: 'pedestal_grand', x: 6, y: 1, z: 5, facing: 'south', style },
    { op: 'prefab', prefab: 'chandelier', x: 6, y: 5, z: 5, style },
  ] }, ctx));
  assert.equal(out.failed, undefined, JSON.stringify(out.failed));
  const m = decode(ctx.design), at = (x, y, z) => m.BLOCKS.find(b => b.x === x && b.y === y && b.z === z), id = b => b && m.P[b.t].id;
  const peds = m.BLOCKS.filter(b => id(b) === 'supplementaries:pedestal');
  assert.ok(peds.length >= 6);
  for (const p of peds) assert.ok(peds.some(q => q.x === 12 - p.x && q.z === p.z), `sin pareja en espejo: ${p.x},${p.z}`);
  assert.ok(!peds.some(p => Math.abs(p.x - 6) <= 1 && p.z >= 8));                       // delante de la puerta (6,·,10) no hay nada
  assert.equal(peds.find(p => p.x === 2).f, 'e');                                      // los de la pared oeste miran al este
  assert.deepEqual(m.DISPLAYS.map(d => d.item).sort(), ['cataclysm:the_incinerator', 'cataclysm:void_core']);
  const lamp = at(6, 4, 5);                                                              // farol colgado: modelo y estado de su variante
  assert.equal(m.P[lamp.t].model, 'minecraft:block/lantern_hanging');
  assert.deepEqual(m.P[lamp.t].props, { hanging: 'true' });
  assert.equal(id(at(6, 1, 4)), 'cataclysm:obsidian_brick_stairs');                    // escalera deducida de la familia, hacia fuera
  assert.equal(at(6, 1, 4).f, 'n');
  const nbt = gunzipSync(toStructureNbt(m).file).toString('latin1');                   // el objeto va en el inventario del pedestal
  assert.match(nbt, /Items/); assert.match(nbt, /cataclysm:void_core/);
});

test('decoración: grid por capas, estados y la revisión encuentra lo oscuro y lo tapado', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const { reviewDesign, viewDesign } = await import('../src/design/inspect.js');
  const ctx = await decoWorkspace();
  const bad = JSON.parse(await runTool('edit_design', { ops: [{ op: 'grid', at: [0, 0, 0], legend: { O: 'cataclysm:obsidian_bricks' }, layers: [['OX']] }] }, ctx));
  assert.match(bad.failed[0].error, /"X" no están en legend/);
  await runTool('edit_design', { ops: [
    { op: 'room', from: [0, 0, 0], to: [8, 4, 8], wall: 'cataclysm:obsidian_bricks', floor: 'cataclysm:polished_obsidian', roof: 'cataclysm:obsidian_bricks', door: 'south' },
    { op: 'grid', at: [3, 1, 3], legend: { P: 'cataclysm:polished_obsidian', D: 'supplementaries:pedestal', s: { block: 'cataclysm:obsidian_brick_stairs', facing: 'north', half: 'top' } }, layers: [['P'], ['D'], ['.'], ['s']] },
    { op: 'display', x: 3, y: 2, z: 3, item: 'cataclysm:void_core' },
  ] }, ctx);
  let m = decode(ctx.design);
  assert.ok(m.BLOCKS.find(b => b.x === 3 && b.y === 4 && b.z === 3).top);              // escalera invertida
  let rv = reviewDesign(m);
  assert.ok(rv.issues.some(i => i.level === 'error' && /oscuras/.test(i.msg)));
  assert.ok(!rv.issues.some(i => /tapado/.test(i.msg)));                               // encima del pedestal hay aire
  await runTool('edit_design', { ops: [{ op: 'place', x: 3, y: 3, z: 3, block: 'cataclysm:obsidian_bricks' }, { op: 'arrange', prefab: 'chandelier', layout: 'grid', area: [1, 1, 7, 7], y: 3, spacing: 4, style: {} }] }, ctx);
  rv = reviewDesign(m = decode(ctx.design));
  assert.ok(rv.issues.some(i => /tapado/.test(i.msg)));
  assert.ok(!rv.issues.some(i => /oscuras/.test(i.msg)), JSON.stringify(rv.issues));
  assert.match(viewDesign(m, { mode: 'plan' }), /Leyenda: .*supplementaries:pedestal|\*/);
});

test('tejado a dos aguas: escaleras hacia el alero, cumbrera con caballete y hastiales', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const ctx = await decoWorkspace();
  const out = JSON.parse(await runTool('edit_design', { ops: [{ op: 'roof', from: [1, 5, 1], to: [9, 5, 5], shape: 'gable', style: { base: 'cataclysm:obsidian_bricks' } }] }, ctx));
  assert.equal(out.failed, undefined, JSON.stringify(out.failed));
  const m = decode(ctx.design), at = (x, y, z) => m.BLOCKS.find(b => b.x === x && b.y === y && b.z === z), id = b => b && m.P[b.t].id;
  assert.equal(id(at(0, 5, 0)), 'cataclysm:obsidian_brick_stairs'); assert.equal(at(0, 5, 0).f, 'n');   // alero norte (vuelo 1) en la capa de arriba de las paredes
  assert.equal(at(10, 5, 6).f, 's');                                                                   // alero sur
  assert.equal(at(5, 6, 1).f, 'n');                                                                    // 45°: sube 1 por anillo
  assert.equal(id(at(5, 8, 3)), 'cataclysm:obsidian_bricks'); assert.ok(at(5, 9, 3));                   // cumbrera y caballete
  assert.equal(id(at(1, 6, 3)), 'cataclysm:obsidian_bricks');                                          // hastial oeste relleno
  assert.ok(!at(5, 6, 3));                                                                             // dentro, bajo el tejado, aire
  assert.ok(m.WALLS && m.WALLS.top > 100);                                                             // exterior: el visor no oculta bordes ni cumbrera
});

// workspace con los bloques vanilla que usan los estilos (se sacan construyendo en memoria) y una escalera con su blockstate
async function archWorkspace() {
  const { memoryWorld, building, STYLES, styleOf, tree, pond, bridge, torii, pagoda, island, pad, antenna, solar, dome } = await import('../src/design/arch.js');
  const ws = join(tmp, 'workspaces', 'wsarch'), { mkdirSync } = await import('node:fs');
  mkdirSync(join(ws, 'index'), { recursive: true }); mkdirSync(join(ws, 'g'), { recursive: true });
  const w = memoryWorld();
  for (const e of Object.keys(STYLES)) { const S = styleOf(e, {}, () => false); building(w, { x0: 5, z0: 5, x1: 25, z1: 17, y: 1, porch: 's' }, S); pagoda(w, { x: 40, y: 1, z: 40 }, S); }
  tree(w, { x: 60, y: 1, z: 60 }); pond(w, { area: [50, 50, 54, 54], y: 1 }); bridge(w, { from: [50, 2, 52], to: [54, 2, 52] }); torii(w, { x: 70, y: 1, z: 70 });
  for (let sd = 1; sd < 30; sd++) island(w, { x: 200, y: 60, z: 200, rx: 12, seed: sd }); pad(w, { x: 0, y: 0, z: 0 }); antenna(w, { x: 0, y: 0, z: 0 }); solar(w, { x: 0, y: 0, z: 0 }); dome(w, { x: 0, y: 0, z: 0 });
  for (const id of ['dysoncubeproject:em_railejector_controller', 'dysoncubeproject:ray_receiver_controller', 'powah:energy_cable_nitro', 'pipez:universal_pipe', 'minecraft:end_rod', 'minecraft:stone', 'create:redstone_link'].entries()) w.set(id[0], 99, 0, id[1]);
  const fromStyles = Object.values(STYLES).flatMap(st => Object.values(st).flatMap(v => (typeof v === 'string' ? [v] : Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []))).filter(v => typeof v === 'string' && /^minecraft:/.test(v));
  const ids = [...new Set([...w.cells.values()].map(c => c.id).concat(fromStyles))], STAIR = 'minecraft:deepslate_tile_stairs';
  const B = id => ({ id, name: id.split(':')[1], model: id.replace(':', ':block/') + (id === STAIR ? '_inner' : ''), yaw: 0, facing: /_stairs$|end_rod/.test(id), size: [1, 1, 1], offset: [0, 0, 0], textures: [], tier: null });
  writeFileSync(join(ws, 'index', 'blocks.json'), JSON.stringify(ids.map(B)));
  writeFileSync(join(ws, 'index', 'items.json'), '[]');
  const v = {};   // primero la esquina interior, como en vanilla: sin estado debe salir la recta
  for (const f of ['east', 'north', 'south', 'west']) for (const h of ['bottom', 'top']) for (const sh of ['inner_left', 'inner_right', 'outer_left', 'outer_right', 'straight']) v[`facing=${f},half=${h},shape=${sh}`] = { model: `minecraft:block/deepslate_tile_stairs${sh === 'straight' ? '' : '_' + sh.split('_')[0]}`, y: { east: 0, south: 90, west: 180, north: 270 }[f] };
  writeFileSync(join(ws, 'g', 'stairs.json'), JSON.stringify({ variants: v }));
  writeFileSync(join(ws, 'g', 'log.json'), JSON.stringify({ variants: { 'axis=x': { model: 'minecraft:block/stripped_mangrove_log_horizontal', x: 90, y: 90 }, 'axis=y': { model: 'minecraft:block/stripped_mangrove_log' }, 'axis=z': { model: 'minecraft:block/stripped_mangrove_log_horizontal', x: 90 } } }));
  writeFileSync(join(ws, 'g', 'end_rod_bs.json'), JSON.stringify({ variants: { 'facing=up': { model: 'minecraft:block/end_rod' }, 'facing=down': { model: 'minecraft:block/end_rod', x: 180 }, 'facing=north': { model: 'minecraft:block/end_rod', x: 90 }, 'facing=east': { model: 'minecraft:block/end_rod', x: 90, y: 90 }, 'facing=south': { model: 'minecraft:block/end_rod', x: 90, y: 180 }, 'facing=west': { model: 'minecraft:block/end_rod', x: 90, y: 270 } } }));
  writeFileSync(join(ws, 'g', 'end_rod.json'), JSON.stringify({ elements: [{ from: [7, 1, 7], to: [9, 16, 9], faces: { up: { texture: '#a' }, east: { texture: '#a' } } }], textures: { a: 'minecraft:block/end_rod' } }));
  writeFileSync(join(ws, 'g', 'part.json'), JSON.stringify({ elements: [{ from: [0, 0, 0], to: [16, 8, 16], faces: { up: { texture: '#a' } } }], textures: { a: 'minecraft:block/stone' } }));
  writeFileSync(join(ws, 'index', 'files.json'), JSON.stringify({ jars: [], files: { 'assets/minecraft/blockstates/deepslate_tile_stairs.json': [0, -1, 0, 0, -1, 'g/stairs.json'], 'assets/minecraft/blockstates/stripped_mangrove_log.json': [0, -1, 0, 0, -1, 'g/log.json'], 'assets/dysoncubeproject/models/block/em_railejector_base.json': [0, -1, 0, 0, -1, 'g/part.json'], 'assets/dysoncubeproject/models/block/em_railejector_gun.json': [0, -1, 0, 0, -1, 'g/part.json'], 'assets/minecraft/blockstates/end_rod.json': [0, -1, 0, 0, -1, 'g/end_rod_bs.json'], 'assets/minecraft/models/block/end_rod.json': [0, -1, 0, 0, -1, 'g/end_rod.json'] } }));
  return { workspaceId: 'wsarch', design: encode({ P: {}, BLOCKS: [], W: 1, H: 1 }), saveDesign() {} };
}

test('building: edificio japonés completo con tejado curvo, puerta, luces y estados por defecto bien dibujados', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const ctx = await archWorkspace();
  const out = JSON.parse(await runTool('edit_design', { ops: [
    { op: 'building', name: 'Sala', from: [4, 1, 4], to: [24, 1, 16], estilo: 'japones', doors: [{ side: 'south' }], porch: 'south' },
    { op: 'place', x: 30, y: 1, z: 30, block: 'minecraft:deepslate_tile_stairs' },
    { op: 'building', from: [1, 1, 1], to: [3, 1, 3], estilo: 'japones' },
  ] }, ctx));
  assert.equal(out.failed?.length, 1); assert.match(out.failed[0].error, /mínimo 5 × 5/);
  assert.ok(out.notes.some(n => /building "Sala": interior \[5,5,23,15\].*se pisa en y=2/.test(n)), JSON.stringify(out.notes));
  const m = decode(ctx.design), at = (x, y, z) => m.BLOCKS.find(b => b.x === x && b.y === y && b.z === z), id = b => b && m.P[b.t].id;
  assert.equal(m.P[at(30, 1, 30).t].model, 'minecraft:block/deepslate_tile_stairs');   // sin estado: escalera recta, no la esquina del índice
  const post = at(4, 3, 4);
  assert.equal(id(post), 'minecraft:stripped_mangrove_log'); assert.equal(m.P[post.t].model, 'minecraft:block/stripped_mangrove_log');   // pilar de pie
  assert.ok(!at(14, 2, 16) && !at(14, 4, 16));                                          // puerta abierta en el centro del muro sur
  assert.ok(m.BLOCKS.some(b => id(b) === 'minecraft:lantern' && b.y < 10));             // luz dentro
  assert.ok(m.BLOCKS.some(b => /deepslate_tile_stairs/.test(id(b)) && b.y > 10));        // tejado
  const corner = m.BLOCKS.filter(b => /deepslate_tile_stairs/.test(id(b)) && m.P[b.t].props?.shape?.startsWith('outer'));
  assert.ok(corner.length >= 4);                                                         // esquinas del faldón con escalera exterior
  assert.ok(m.WALLS.top > 100);
});

test('run_code: el código del agente construye en un sandbox sin acceso al sistema y con tope de tiempo', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const { runCode } = await import('../src/design/sandbox.js');
  const ctx = await archWorkspace();
  const out = JSON.parse(await runTool('run_code', { code: `
    for (let x = 0; x < 5; x++) set(x, 0, 0, 'minecraft:stone_bricks');
    stair(0, 1, 0, 'minecraft:deepslate_tile_stairs', 'north');
    const info = building({ from: [10, 1, 10], to: [20, 1, 20], estilo: 'japones' });
    print(typeof process, typeof require, get(0, 0, 0), info.slice(0, 8));
    set(1, 1, 1, 'minecraft:no_existe');
  ` }, ctx));
  assert.equal(out.error, null);
  assert.ok(out.placed > 500, JSON.stringify(out).slice(0, 300));
  assert.match(out.printed[0], /^undefined undefined minecraft:stone_bricks building/);
  assert.ok(out.failed.some(f => /No existe minecraft:no_existe/.test(f)));
  const m = decode(ctx.design), st = m.BLOCKS.find(b => b.x === 0 && b.y === 1 && b.z === 0);
  assert.equal(st.f, 'n');                                                               // low = norte → escalón bajo al norte
  const err = JSON.parse(await runTool('run_code', { code: 'building({ from: [0,0,0], to: [2,0,2] })' }, ctx));
  assert.match(err.error, /mínimo 5 × 5/);
  const loop = await runCode('while (true) {}', {}, { timeoutMs: 300 });
  assert.match(loop.error, /Tiempo agotado/);
  const esc = await runCode('this.constructor.constructor("return process")().exit(1)', {}, { timeoutMs: 300 });
  assert.ok(esc.error);                                                                  // no hay process que alcanzar
});

test('render_design: imagen PNG del diseño desde una esquina, sin texturas cae al color medio', async () => {
  const { renderDesign } = await import('../src/design/render.js');
  const m = { P: { a: { id: 'minecraft:stone', all: 'minecraft:stone' } }, BLOCKS: [{ x: 0, y: 0, z: 0, t: 'a', f: 's' }, { x: 1, y: 0, z: 0, t: 'a', f: 's' }, { x: 0, y: 1, z: 0, t: 'a', f: 's' }] };
  const img = renderDesign(m, null, { view: 'se', maxSize: 200 });
  assert.equal(img.png.readUInt32BE(0), 0x89504e47);
  assert.ok(img.width > 20 && img.height > 20);
  assert.match(img.summary, /3 bloques/);
  assert.match(renderDesign(m, null, { view: 'front' }).summary, /3 bloques/);
});

test('search_quests: lee capítulos de FTB Quests con sus jefes, objetos y títulos traducidos', async () => {
  const { searchQuests, parseSnbt } = await import('../src/workspace/quests.js');
  const { mkdirSync } = await import('node:fs');
  assert.deepEqual(parseSnbt('{ a: 1.5d, b: [1L 2L], c: { id: "x:y" }, d: true }'), { a: 1.5, b: [1, 2], c: { id: 'x:y' }, d: true });
  const dir = join(tmp, 'workspaces', 'wsq'), q = join(dir, 'files', 'config', 'ftbquests', 'quests');
  mkdirSync(join(q, 'chapters'), { recursive: true }); mkdirSync(join(q, 'lang', 'es_es', 'chapters'), { recursive: true });
  writeFileSync(join(q, 'chapters', 'jefes.snbt'), '{\n\tid: "C1"\n\tfilename: "jefes"\n\tquests: [\n\t\t{\n\t\t\tid: "Q1"\n\t\t\ttasks: [{ entity: "cataclysm:ignis", type: "kill", value: 1L }]\n\t\t\trewards: [{ item: { count: 1, id: "cataclysm:the_incinerator" }, type: "item" }]\n\t\t}\n\t\t{\n\t\t\tid: "Q2"\n\t\t\ttasks: [{ item: { count: 1, id: "cataclysm:flame_eye" }, type: "item" }]\n\t\t}\n\t]\n}\n');
  writeFileSync(join(q, 'lang', 'es_es.snbt'), '{\n\tchapter.C1.title: "&6Jefes"\n}\n');
  writeFileSync(join(q, 'lang', 'es_es', 'chapters', 'jefes.snbt'), '{\n\tquest.Q1.title: "&bIgnis"\n\tquest.Q2.title: "Ojo de Fuego"\n}\n');
  assert.match(searchQuests(dir, {}).chapters[0], /jefes · Jefes · 2 misiones · jefes: ignis/);
  const c = searchQuests(dir, { chapter: 'jefes' });
  assert.deepEqual(c.bosses, ['cataclysm:ignis']);
  assert.match(c.quests[0], /^Ignis: matar cataclysm:ignis → premio cataclysm:the_incinerator/);
  assert.equal(searchQuests(dir, { query: 'flame_eye' }).total, 1);
});

test('review_design: una caja con tejado plano y luces encima suspende; un edificio con tejado no', async () => {
  const { reviewDesign } = await import('../src/design/inspect.js');
  const { runTool } = await import('../src/llm/tools.js');
  const P = { s: { id: 'minecraft:dark_oak_slab' }, p: { id: 'minecraft:dark_oak_planks' }, g: { id: 'minecraft:glowstone' } }, B = [];
  for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) { B.push({ x, y: 0, z, t: 'p', f: 's' }); B.push({ x, y: 8, z, t: (x * 7 + z) % 23 ? 's' : 'g', f: 's' }); if (x === 0 || z === 0 || x === 39 || z === 39) for (let y = 1; y < 8; y++) B.push({ x, y, z, t: 'p', f: 's' }); }
  const box = reviewDesign({ P, BLOCKS: B });
  assert.ok(box.issues.some(i => i.level === 'error' && /Tejado plano/.test(i.msg)), JSON.stringify(box.issues));
  assert.ok(box.issues.some(i => /luz a la vista/.test(i.msg)));
  // regresión: sea_lantern no es un farol, y una tira de luces de 2 de ancho sobre la cubierta sigue siendo luz a la vista
  const sea = reviewDesign({ P: { ...P, g: { id: 'minecraft:sea_lantern' } }, BLOCKS: B.map(b => b.y === 8 && b.t !== 'p' ? { ...b, t: b.x % 10 < 2 ? 'g' : 's' } : b) });
  assert.ok(sea.issues.some(i => /Tejado plano/.test(i.msg)) && sea.issues.some(i => /luz a la vista/.test(i.msg)), JSON.stringify(sea.issues));
  const ctx = await archWorkspace();
  await runTool('edit_design', { ops: [{ op: 'building', from: [3, 1, 3], to: [33, 1, 23], estilo: 'japones' }] }, ctx);
  const good = reviewDesign(decode(ctx.design));
  assert.ok(!good.issues.some(i => /Tejado plano|luz a la vista|encerradas/.test(i.msg)), JSON.stringify(good.issues));
});

test('isla flotante: forma orgánica, roca que se afina, y la revisión no le pide puerta ni tejado', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const { reviewDesign } = await import('../src/design/inspect.js');
  const ctx = await archWorkspace();
  const bad = JSON.parse(await runTool('run_code', { code: "feature({ type: 'island', x: 30, y: 8, z: 30, rx: 20 })" }, ctx));
  assert.match(bad.error, /no cabe por debajo; pon y ≥/);
  const out = JSON.parse(await runTool('run_code', { code: "print(feature({ type: 'island', x: 30, y: 40, z: 30, rx: 20, rz: 16, seed: 5 }))" }, ctx));
  assert.equal(out.error, null);
  assert.match(out.printed[0], /island: hierba en y=40/);
  const m = decode(ctx.design), layer = y => m.BLOCKS.filter(b => b.y === y).length;
  assert.ok(layer(40) > layer(30) && layer(30) > layer(20), 'la roca se afina hacia abajo');
  const top = m.BLOCKS.filter(b => b.y === 40), xs = top.map(b => b.x), zs = top.map(b => b.z);
  assert.ok(top.length < 0.9 * (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...zs) - Math.min(...zs) + 1), 'el contorno no es un rectángulo');
  assert.ok(m.KINDS.terrain);
  const rv = reviewDesign(m);
  assert.ok(!rv.issues.some(i => /No se puede entrar|Tejado plano|pirámide de cajas/.test(i.msg)), JSON.stringify(rv.issues));
});

test('bloques que dibuja el mod: piezas desplazadas y huella real del multibloque', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const { reader } = await import('../src/workspace/reader.js');
  const ctx = await archWorkspace();
  const out = JSON.parse(await runTool('edit_design', { ops: [{ op: 'place', x: 5, y: 1, z: 5, block: 'dysoncubeproject:em_railejector_controller' }] }, ctx));
  assert.ok(out.notes?.some(n => /Multibloque de 3×3×3/.test(n)), JSON.stringify(out));
  const p = Object.values(decode(ctx.design).P).find(p => p.id === 'dysoncubeproject:em_railejector_controller');
  assert.deepEqual(p.model, ['dysoncubeproject:block/em_railejector_base', 'dysoncubeproject:block/em_railejector_gun@0,2.5,0']);
  assert.deepEqual(p.size, [3, 3, 3]); assert.deepEqual(p.offset, [-1, 0, -1]);
  const els = reader('wsarch').models([p.model.join('+')])[p.model.join('+')];
  assert.equal(els.length, 2); assert.equal(els[1].from[1], 40);                       // el cañón, 2,5 bloques más arriba
  assert.match(await runTool('get_block', { id: 'dysoncubeproject:em_railejector_controller' }, ctx), /"size":\[3,3,3\].*multiblock/);
  const mod = JSON.parse(await runTool('inspect_mod', { mod: 'dysoncubeproject' }, ctx));
  assert.ok(mod.blocks.some(b => b.size.join() === '3,6,3'));
  assert.match(mod.manual, /sin manual/);
});

test('route: cable escondido con fachada no avisa; a la vista, sí', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const { reviewDesign } = await import('../src/design/inspect.js');
  const ctx = await archWorkspace();
  await runTool('edit_design', { ops: [
    { op: 'fill', from: [0, 0, 0], to: [12, 2, 4], block: 'minecraft:stone' },
    { op: 'route', from: [1, 1, 2], to: [11, 1, 2], cable: 'ae2:fluix_covered_cable', block: 'minecraft:stone' },
  ] }, ctx);
  let m = decode(ctx.design), cell = m.BLOCKS.find(b => b.x === 6 && b.y === 1 && b.z === 2);
  assert.ok(cell.cable); assert.equal(m.P[cell.t].id, 'minecraft:stone');               // por fuera se ve piedra
  assert.ok(!reviewDesign(m).issues.some(i => /cables a la vista/.test(i.msg)));
  const bad = JSON.parse(await runTool('edit_design', { ops: [{ op: 'route', from: [0, 3, 0], to: [10, 3, 0], cable: 'ae2:fluix_covered_cable' }, { op: 'route', from: [0, 5, 0], to: [2, 5, 0], cable: 'minecraft:stone' }] }, ctx));
  assert.match(bad.failed[0].error, /solo de AE2/);
  m = decode(ctx.design);
  assert.ok(reviewDesign(m).issues.some(i => /11 cables a la vista/.test(i.msg)));
});

test('Redstone Link con su frecuencia: en el diseño, en su ficha y ya puesta en el NBT', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const { toStructureNbt } = await import('../src/design/nbt.js');
  const ctx = await archWorkspace();
  const out = JSON.parse(await runTool('run_code', { code: "set(0, 0, 0, 'minecraft:stone'); set(0, 1, 0, 'create:redstone_link', { facing: 'up', receiver: 'true' }); freq(0, 1, 0, 'minecraft:feather', 'minecraft:white_wool', 'F5 altitud: a los quemadores');" }, ctx));
  assert.ok(!out.error, out.error);
  const m = decode(ctx.design), b = m.BLOCKS.find(b => /redstone_link/.test(m.P[b.t].id));
  assert.deepEqual(b.freq, ['minecraft:feather', 'minecraft:white_wool']);
  assert.match(b.gui.title, /Receptor · feather \+ white_wool/); assert.match(b.gui.settings[0], /F5 altitud/);
  const raw = gunzipSync(toStructureNbt(m).file).toString('latin1');
  assert.ok(raw.includes('FrequencyFirst') && raw.includes('minecraft:feather') && raw.includes('FrequencyLast') && raw.includes('minecraft:white_wool'));
  const bad = JSON.parse(await runTool('edit_design', { ops: [{ op: 'freq', x: 0, y: 0, z: 0, items: ['minecraft:feather', 'minecraft:white_wool'] }] }, ctx));
  assert.match(bad.failed[0].error, /no hay un Redstone Link/);
});

test('revisión de oficio: losas como suelo, escaleras sueltas y cables a la vista', async () => {
  const { reviewDesign } = await import('../src/design/inspect.js');
  const P = { s: { id: 'minecraft:spruce_slab' }, p: { id: 'minecraft:spruce_planks' }, st: { id: 'minecraft:dark_oak_stairs' }, c: { id: 'powah:energy_cable_niotic' } }, B = [];
  for (let x = 0; x < 10; x++) for (let z = 0; z < 10; z++) B.push({ x, y: 0, z, t: 'p', f: 's' });
  for (let x = 0; x < 6; x++) for (let z = 0; z < 4; z++) B.push({ x, y: 5, z, t: 's', f: 's', top: true });   // cubierta de losas en el aire
  for (const x of [1, 4, 7, 9]) B.push({ x, y: 3, z: 8, t: 'st', f: 'n', top: true });                       // ménsulas sueltas
  for (let x = 0; x < 5; x++) B.push({ x, y: 1, z: 6, t: 'c', f: 's' });                                    // cable por encima del suelo
  const msgs = reviewDesign({ P, BLOCKS: B }).issues.map(i => i.msg).join(' | ');
  assert.match(msgs, /24 losas de arriba con aire debajo/);
  assert.match(msgs, /4 escaleras sueltas/);
  assert.match(msgs, /5 cables a la vista \(powah:energy_cable_niotic\)/);
});

test('variantes giradas: una vara tumbada se dibuja tumbada', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const { reader } = await import('../src/workspace/reader.js');
  const ctx = await archWorkspace();
  await runTool('edit_design', { ops: [{ op: 'place', x: 1, y: 1, z: 1, block: 'minecraft:end_rod', facing: 'east' }, { op: 'place', x: 3, y: 1, z: 1, block: 'minecraft:end_rod', state: { facing: 'down' } }] }, ctx);
  const m = decode(ctx.design), P = b => m.P[b.t];
  const side = P(m.BLOCKS.find(b => b.x === 1)), down = P(m.BLOCKS.find(b => b.x === 3));
  assert.equal(side.model, 'minecraft:block/end_rod@x90');                              // el giro y lo pone el visor con facing
  assert.equal(down.model, 'minecraft:block/end_rod@x180');
  const els = reader('wsarch').models([side.model, down.model]);
  assert.deepEqual([els[side.model][0].from, els[side.model][0].to], [[7, 7, 0], [9, 9, 15]]);   // a lo largo de z: la punta al norte
  assert.deepEqual([els[down.model][0].from, els[down.model][0].to], [[7, 0, 7], [9, 15, 9]]);
  assert.ok(els[side.model][0].faces.north && els[side.model][0].faces.east.rotation === 90);
});

test('máquinas por su cara, vistas, explicación sin HTML y varas sueltas', async () => {
  const { runTool } = await import('../src/llm/tools.js');
  const { validateModel } = await import('../src/design/validate.js');
  const ctx = await archWorkspace(), E = 'dysoncubeproject:em_railejector_controller';
  const fresh = await archWorkspace();
  await runTool('edit_design', { ops: [{ op: 'fill', from: [0, 0, 0], to: [30, 0, 30], block: 'minecraft:stone' }] }, fresh);
  assert.ok(decode(fresh.design).ZONES[0].auto);                                      // sin vistas propias: una general que encuadra la obra
  const out = JSON.parse(await runTool('run_code', { code: `
    box(0, 0, 0, 20, 0, 20, 'minecraft:stone');
    set(5, 1, 5, '${E}');                                                             // encima de piedra: no le llega nada
    set(14, 0, 14, 'pipez:universal_pipe'); set(14, 1, 14, '${E}');                   // tubería universal debajo: bien
    zone('Disparadores', [10, 1, 10], { cut: 0 });
    explain('Cómo funciona', 'Los paquetes <b>llegan</b> por la tubería');
    for (let y = 1; y <= 6; y++) set(1, y, 15, 'minecraft:stone');
    for (let x = 2; x <= 8; x++) { set(x, 6, 15, 'minecraft:end_rod', { facing: 'east' }); set(x, 6, 17, 'minecraft:end_rod', { facing: 'up' }); }
  ` }, ctx));
  const io = out.notes.find(n => /solo por la cara de abajo/.test(n));
  assert.ok(io && /debajo hay minecraft:stone/.test(io) && /5,1,5/.test(io) && !/14,1,14/.test(io), JSON.stringify(out.notes));
  const m = decode(ctx.design), z = m.ZONES.find(z => z.n === 'Disparadores');
  assert.deepEqual([z.t, z.p, z.cut], [[10, 1, 10], [26, 12, 26], 0]);
  assert.match(m.INFO, /<b>Cómo funciona\.<\/b> Los paquetes &lt;b&gt;llegan/);           // el texto del agente, escapado
  const loose = validateModel(m).warnings.find(w => /piezas sueltas/.test(w.msg));
  // en una isla, lo que se sale del borde (nada debajo en toda la columna) avisa; lo que está encima de la isla, no
  const isl = await archWorkspace();
  await runTool('run_code', { code: "feature({ type: 'island', x: 30, y: 40, z: 30, rx: 10, rz: 10, seed: 3 }); set(30, 41, 30, 'pipez:universal_pipe'); for (let x = 40; x <= 46; x++) set(x, 41, 30, 'pipez:universal_pipe');" }, isl);
  const over = validateModel(decode(isl.design)).warnings.find(w => /sobre el vacío/.test(w.msg));
  assert.ok(over && !over.at.some(([x, , z]) => x === 30 && z === 30) && over.at.some(([x]) => x === 46), JSON.stringify(over));
  assert.match(loose.msg, /^7 piezas sueltas.*minecraft:end_rod.*de lado no las une/);  // las 7 hacia arriba; las que van al este cuelgan del pilar
});

test('chat: el turno sigue aunque se corte la conexión y se puede volver a enganchar', async () => {
  const app = createApp(), H = { 'content-type': 'application/json', 'x-craftometry': '1', origin: 'http://localhost:9' }, req = (p, o = {}) => app.request(p, o);
  const reg = await req('/api/auth/register', { method: 'POST', headers: H, body: JSON.stringify({ email: 'cris@example.com', password: 'una clave larga', name: 'Cris', accept: true }) });
  const A = { ...H, cookie: reg.headers.get('set-cookie').split(';')[0] };
  await req('/api/keys', { method: 'POST', headers: A, body: JSON.stringify({ provider: 'custom', apiKey: 'x'.repeat(12), model: 'lento', baseUrl: 'https://8.8.8.8/v1' }) });
  const d = await (await req('/api/designs', { method: 'POST', headers: A, body: JSON.stringify({ title: 'Corte' }) })).json();
  const real = globalThis.fetch, wait = ms => new Promise(r => setTimeout(r, ms));
  let calls = 0;
  globalThis.fetch = async () => {   // modelo lento: una llamada a calc y luego la respuesta
    await wait(150);
    const message = ++calls % 2 ? { content: null, tool_calls: [{ id: 'c', type: 'function', function: { name: 'calc', arguments: '{"expr":"2+2"}' } }] } : { content: 'Listo' };
    return new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 });
  };
  try {
    const history = async () => (await (await req(`/api/designs/${d.id}/chat`, { headers: A })).json()).map(m => m.content);
    const r1 = await req(`/api/designs/${d.id}/chat`, { method: 'POST', headers: A, body: JSON.stringify({ message: 'hola' }) });
    assert.equal(r1.status, 200);
    await r1.body.cancel();                                                       // el navegador pierde la conexión al momento
    for (let i = 0; i < 40 && (await history()).length < 2; i++) await wait(50);
    assert.deepEqual(await history(), ['hola', 'Listo']);
    const r2 = await req(`/api/designs/${d.id}/chat`, { method: 'POST', headers: A, body: JSON.stringify({ message: 'otra' }) });
    await r2.body.cancel();
    const live = await req(`/api/designs/${d.id}/chat/live?from=0`, { headers: A });    // se vuelve a enganchar y recibe hasta el final
    assert.equal(live.status, 200);
    const text = await live.text();
    assert.match(text, /"type":"tool"/); assert.match(text, /"type":"done"/);
    assert.equal((await req(`/api/designs/${d.id}/chat/live?from=0`, { headers: A })).status, 204);   // ya terminado: su respuesta está en el historial
  } finally { globalThis.fetch = real; }
});

test('agentes: sin razonamiento en el texto y preguntas escritas como texto = ask_user', async () => {
  const { runAgent, cleanText } = await import('../src/llm/agent.js');
  assert.equal(cleanText('<think>planeo</think>Hola'), 'Hola');
  assert.equal(cleanText('pienso…</thought>\nHola'), 'Hola');
  const seen = [];
  const ctx = { key: { toolMode: 'native' }, lang: 'es', design: encode({ P: {}, BLOCKS: [], W: 1, H: 1 }), saveDesign() {},
    chat: async ({ messages }) => { seen.push(messages[0].content); return { text: '<think>no sé</think>{"questions":[{"question":"¿Energía?","options":["La traigo yo"]}]}', toolCalls: [] }; } };
  const r = await runAgent('orchestrator', [{ role: 'user', content: 'Haz una fábrica' }], ctx, () => {});
  assert.deepEqual(r.asked, [{ question: '¿Energía?', options: ['La traigo yo'] }]);
  assert.match(seen[0], /Condiciones del diseño/);                                 // ask-constraints ya va en el prompt
  assert.doesNotMatch(seen[0], /json-protocol/);
});

test('Gemini 3: la firma de cada llamada a herramienta vuelve en el mensaje siguiente', async () => {
  const { chat } = await import('../src/llm/providers.js');
  const sent = [], real = globalThis.fetch, extra = { google: { thought_signature: 'firma' } };
  globalThis.fetch = async (url, o) => {
    sent.push(JSON.parse(o.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'read_skill', arguments: '{"name":"ae2"}' }, extra_content: extra }] } }] }), { status: 200 });
  };
  try {
    const key = { provider: 'custom', baseUrl: 'https://8.8.8.8/v1', apiKey: 'x', model: 'm' };   // IP pública: sin DNS en la prueba
    const r = await chat({ ...key, messages: [{ role: 'user', content: 'hola' }], tools: [{ name: 'read_skill', description: 'd', parameters: { type: 'object', properties: {} } }] });
    await chat({ ...key, messages: [{ role: 'user', content: 'hola' }, { role: 'assistant', content: r.text, toolCalls: r.toolCalls }, { role: 'tool', toolCallId: 'c1', content: 'guía' }] });
    assert.deepEqual(sent[1].messages[1].tool_calls[0].extra_content, extra);
  } finally { globalThis.fetch = real; }
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
