// La isla Dyson del jugador, construida solo con las herramientas de los agentes (run_code + render_design + review_design).
import { runTool } from 'file:///C:/Users/mique/Proyectos/Craftometry/server/src/llm/tools.js';
import { encode } from 'file:///C:/Users/mique/Proyectos/Craftometry/server/src/design/format.js';
import { writeFileSync } from 'node:fs';
const OUT = 'C:/Users/mique/AppData/Local/Temp/claude/09b9b23e0419701f/14ff7dd9-3d96-4484-acca-6e0bddcd938a/scratchpad/';
const ctx = { workspaceId: 'atm10-mio', lang: 'es', design: encode({ TITLE: 'Isla Dyson', P: {}, BLOCKS: [], W: 1, H: 1 }), saveDesign() {} };
const T = async (n, a) => { const t = Date.now(); const o = await runTool(n, a, ctx); console.log(`### ${n} ${Date.now() - t} ms`); return o; };

const code = `
// ── isla grande y orgánica ──
const Y = 50, CX = 44, CZ = 40;
print(feature({ type: 'island', x: CX, y: Y, z: CZ, rx: 32, rz: 25, seed: 21 }));

// ── receptor de rayos en el punto focal, con la Ender Cell debajo ──
feature({ type: 'pad', x: CX, y: Y, z: CZ - 4, size: 5, block: 'minecraft:polished_deepslate', edge: 'minecraft:smooth_stone' });
set(CX, Y, CZ - 4, 'powah:ender_cell_nitro');
set(CX, Y + 1, CZ - 4, 'dysoncubeproject:ray_receiver_controller');

// ── 6 disparadores en arco por el sur, a radios distintos, cada uno en su plataforma ──
const ej = [[-20, 8], [-12, 14], [-3, 17], [7, 16], [15, 12], [22, 5]].map(([dx, dz]) => [CX + dx, CZ + dz]);
for (const [x, z] of ej) { feature({ type: 'pad', x, y: Y, z, size: 3 }); set(x, Y + 1, z, 'dysoncubeproject:em_railejector_controller'); }

// ── portal cuántico de AE2 al norte: anillo vertical enmarcado ──
const PX = CX, PZ = CZ - 17;
for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy <= 4; dy++) {
  const edge = Math.abs(dx) === 2 || dy === 0 || dy === 4;
  if (edge) set(PX + dx, Y + 1 + dy, PZ, dy === 4 && dx === 0 ? 'minecraft:end_rod' : 'minecraft:polished_deepslate');
}
for (let dx = -1; dx <= 1; dx++) for (let dy = 1; dy <= 3; dy++) set(PX + dx, Y + 1 + dy, PZ, dx === 0 && dy === 2 ? 'ae2:quantum_link' : 'ae2:quantum_ring');
feature({ type: 'path', from: [PX - 2, Y, PZ + 1], to: [PX + 2, Y, CZ - 8], block: 'minecraft:polished_andesite', edge: 'minecraft:smooth_stone' });

// ── red AE2 escondida: del portal baja por dentro de la isla y sube bajo cada disparador con un export bus ──
route([PX, Y + 1, PZ + 1], [PX, Y - 1, PZ + 1], { cable: 'ae2:fluix_covered_dense_cable', block: 'minecraft:dirt', order: 'yxz' });
route([PX, Y - 1, PZ + 1], [CX, Y - 1, CZ + 6], { cable: 'ae2:fluix_covered_dense_cable', block: 'minecraft:dirt', order: 'zxy' });
for (const [x, z] of ej) {
  route([CX, Y - 2, CZ + 6], [x, Y - 2, z], { cable: 'ae2:fluix_covered_cable', block: 'minecraft:stone', order: 'xzy' });
  route([x, Y - 1, z], [x, Y, z], { cable: 'ae2:fluix_covered_cable', block: 'minecraft:polished_deepslate' });
  part(x, Y, z, 'up', 'ae2:export_bus');
}
route([CX, Y - 1, CZ + 6], [CX, Y - 2, CZ + 6], { cable: 'ae2:fluix_covered_dense_cable', block: 'minecraft:dirt' });

// ── decoración del tema: antenas, placas solares, laboratorio en cúpula, farolas, objetos del mod en pedestales ──
feature({ type: 'antenna', x: CX - 24, y: Y + 1, z: CZ - 8, height: 11 });
feature({ type: 'antenna', x: CX + 25, y: Y + 1, z: CZ - 6, height: 9 });
feature({ type: 'solar', x: CX + 12, y: Y, z: CZ - 16, width: 7, depth: 4 });
feature({ type: 'solar', x: CX - 20, y: Y, z: CZ - 18, width: 6, depth: 4 });
feature({ type: 'dome', x: CX - 14, y: Y + 1, z: CZ - 2, r: 5 });
set(CX - 14, Y + 1, CZ - 2, 'minecraft:sea_lantern');
for (const [x, z, it] of [[PX - 4, PZ + 3, 'dysoncubeproject:solar_sail'], [PX + 4, PZ + 3, 'dysoncubeproject:beam'], [PX - 4, PZ + 6, 'dysoncubeproject:solar_sail_package'], [PX + 4, PZ + 6, 'dysoncubeproject:beam_package']]) { set(x, Y + 1, z, 'minecraft:polished_deepslate'); set(x, Y + 2, z, 'supplementaries:pedestal'); show(x, Y + 2, z, it); }
for (const [x, z] of [[CX - 6, CZ - 10], [CX + 6, CZ - 10], [CX - 8, CZ + 4], [CX + 8, CZ + 4], [CX - 18, CZ + 2], [CX + 18, CZ + 2]]) feature({ type: 'lantern', x, y: Y + 1, z, variant: 'farola' });
for (const [x, z] of [[CX - 26, CZ + 6], [CX + 27, CZ + 12], [CX - 4, CZ - 21]]) feature({ type: 'tree', x, y: Y + 1, z, variant: 'abedul', size: 1 });
for (const [x, z] of [[CX + 20, CZ - 18], [CX - 28, CZ - 6]]) feature({ type: 'boulder', x, y: Y + 1, z, r: 2 });
`;
const out = JSON.parse(await T('run_code', { code }));
console.log(out.error, out.placed, out.failed, out.printed, (out.notes || []).slice(0, 6));
for (const v of ['se', 'nw', 'front']) { const img = await T('render_design', { view: v }); writeFileSync(OUT + `dyson-${v}.png`, Buffer.from(img.image.data, 'base64')); console.log(img.text); }
console.log(await T('review_design', {}));
writeFileSync(OUT + 'dyson.json', JSON.stringify(ctx.design));
