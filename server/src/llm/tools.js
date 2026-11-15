// Herramientas de los agentes. Todas trabajan sobre datos reales: el workspace del diseño y el propio diseño.
import { solve } from '../../../engine/process.js';
import { reader } from '../workspace/reader.js';
import { readSkill, listSkills, writeSkill } from './catalog.js';
import { decode, encode } from '../design/format.js';
import { validateModel, occupancy, touching, isCableCell, isMachine, ACTS_ON, SIDE_NAME } from '../design/validate.js';
import { PREFABS, expandPrefab, resolveStyle, layoutPositions, roofCells, roleOf, familyBase, familyVariant, colorName, mixPick, ROLES } from '../design/decor.js';
import { viewDesign, reviewDesign } from '../design/inspect.js';
import { STYLES, styleOf, canvas, memoryWorld, roof as archRoof, building, tree, lantern, pond, bridge, torii, pagoda, path as archPath, steps as archSteps, gardenWall, planSite, island, boulder, antenna, solar, dome, pad, routeCells } from '../design/arch.js';
import { searchQuests, loadQuests } from '../workspace/quests.js';
import { runCode } from '../design/sandbox.js';
import { berOf } from '../design/ber.js';
import { renderDesign } from '../design/render.js';
import { safeFetch } from '../security.js';
import { SEARCH } from '../config.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { wsDir } from '../workspace/importer.js';

const obj = (props, required = []) => ({ type: 'object', properties: props, required });
const S = d => ({ type: 'string', description: d }), N = d => ({ type: 'number', description: d }), XYZ = d => ({ type: 'array', items: { type: 'number' }, description: d });
const E = (values, d) => ({ type: 'string', enum: values, description: d });
// una operación de edit_design; con propiedades explícitas los modelos pequeños se equivocan mucho menos que con un objeto libre
const OP = obj({
  op: E(['place', 'fill', 'remove', 'part', 'note', 'room', 'copy', 'grid', 'prefab', 'arrange', 'display', 'roof', 'building', 'feature', 'route', 'zone', 'explain', 'freq']), x: N('x'), y: N('y'), z: N('z'), from: XYZ('[x,y,z]'), to: XYZ('[x,y,z]'),
  name: S('building: nombre (para las notas); zone: nombre de la vista; explain: título de la sección'), cut: N('zone: corte de capas (solo se ve hasta esa y): para enseñar lo que va bajo tierra'), estilo: E(Object.keys(STYLES), 'building, feature o roof: estilo de arquitectura'),
  theme: { type: 'object', description: 'building: materiales que cambian los del estilo (tema de un mod): base, baseTop, post, beam, infill, window, floor, ceiling, light, lining (forro interior), liningPillar, liningAccent, roof {stairs, slab, block, ridge, tip, gable}' },
  doors: { type: 'array', items: obj({ side: E(['north', 'south', 'east', 'west']), at: N('x o z del centro de la puerta (por defecto el centro del muro)'), width: N('ancho (3; 5 si el edificio es grande)'), height: N('alto') }), description: 'building: puertas' },
  base: N('building: alto del zócalo (1)'), pent: { type: 'boolean', description: 'building: tejado intermedio a media altura (en japonés y chino, por defecto si mide 9 o más)' },
  porch: E(['north', 'south', 'east', 'west'], 'building: porche con hastial sobre la puerta de ese lado'), ceiling: S('building: "artesonado", "liso" o un id'), lights: { type: 'boolean', description: 'building: luces dentro, en el desván y bajo el alero (true)' },
  type: E(['island', 'boulder', 'tree', 'pond', 'bridge', 'lantern', 'torii', 'pagoda', 'path', 'steps', 'wall', 'antenna', 'solar', 'dome', 'pad'], 'feature: pieza de exterior o de terreno'),
  rx: N('feature island: radio este-oeste'), rz: N('feature island: radio norte-sur'), seed: N('feature island o boulder: semilla (cambia la forma)'), top: S('feature island: bloque de arriba (grass_block)'),
  rock: { type: 'array', items: { type: 'string' }, description: 'feature island: rocas de arriba abajo' }, ores: { type: 'array', items: { type: 'string' }, description: 'feature island: menas en la cara de abajo' }, order: S('route: orden de los tramos, p. ej. xzy'), variant: S('feature tree: cerezo|roble|abeto|abedul|arce; lantern: toro|farola; bridge: mangrove|spruce|stone'),
  size: N('feature tree 1-3; pad: huella de la máquina (3)'), floors: N('feature pagoda: pisos (5)'), depth: N('feature pond: hondo (2); island: hondo de la roca'), r: N('feature boulder o dome: radio'),
  pitch: E(['curva', 'normal', 'suave', 'empinada'], 'roof o building: pendiente del tejado'), upturn: { type: 'boolean', description: 'roof: esquinas del alero levantadas' },
  block: S('id de bloque del modpack'), facing: E(['north', 'south', 'east', 'west'], 'hacia dónde mira la cara frontal'),
  cable: S('id de cable de AE2: la celda es un cable'), part: S('id de pieza de AE2'), text: S('note o explain: texto plano'),
  wall: S('room: bloque de pared'), floor: S('room: suelo'), roof: S('room: techo (sin él, sala abierta)'), frame: S('room: pilares y bordes'), glass: S('room: ventanas'), light: S('room: luces del techo'),
  door: E(['north', 'south', 'east', 'west'], 'room: lado de la puerta'), at: XYZ('copy: destino de la esquina "from"; grid: esquina noroeste de abajo'), step: XYZ('copy: desplazamiento entre copias'), times: N('copy: número de copias'), mirror: E(['x', 'z'], 'copy: reflejar en ese eje'),
  half: E(['bottom', 'top'], 'escalera invertida o losa arriba'), state: { type: 'object', description: 'propiedades del bloque, p. ej. {"hanging":"true"} o {"open":"true"}' },
  mix: { type: 'array', items: { type: 'string' }, description: 'fill: mezcla "id:peso", p. ej. ["minecraft:stone_bricks:70","minecraft:cracked_stone_bricks:30"]' }, edge: S('fill: bloque para el borde de la caja (alfombras, suelos con cenefa)'),
  legend: { type: 'object', description: 'grid: carácter → id o {block,facing,half,state}' }, layers: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'grid: capas de abajo arriba; cada capa, filas de norte a sur; cada carácter, de oeste a este. "." no toca, "_" aire' },
  prefab: E(Object.keys(PREFABS), 'prefab o arrange: pieza'), style: { type: 'object', description: 'materiales: base, trim, pillar, accent, stairs, slab, wall, light, chain, glass, display, plant, carpet' },
  height: N('prefab: alto (column, lamp_post) o largo de cadena (chandelier)'), width: N('prefab: ancho (bench, table, arch)'), item: S('display o prefab con expositor: id del objeto'), items: { type: 'array', items: { type: 'string' }, description: 'arrange: objetos para cada expositor, en orden' },
  side: E(['north', 'south', 'east', 'west', 'up', 'down'], 'part: cara de la celda de cable; display: pared a la que se cuelga el marco'), kind: E(['frame', 'stand'], 'display en una celda de aire: marco en la pared o soporte de armadura'),
  layout: E(['walls', 'row', 'grid', 'ring', 'corners'], 'arrange: reparto'), area: { type: 'array', items: { type: 'number' }, description: 'arrange: interior libre [x0,z0,x1,z1]' },
  spacing: N('arrange: distancia entre centros (3)'), margin: N('arrange: separación de la pared (1)'), sides: { type: 'array', items: { type: 'string' }, description: 'arrange walls: lados n/s/e/w' },
  shape: E(['gable', 'hip', 'irimoya', 'flat'], 'roof o building: dos aguas, cuatro aguas, irimoya (cuatro aguas abajo y hastial arriba) o plano'), overhang: N('roof o building: vuelo del alero'), axis: E(['x', 'z'], 'roof, building o torii: eje de la cumbrera (por defecto el lado largo)'),
  center: XYZ('arrange ring: centro'), radius: N('arrange ring: radio'), count: N('arrange: cuántas (opcional)'),
}, ['op']);

export const TOOL_DEFS = {
  ask_user: { description: 'Pregunta al jugador (una sola ronda, todas las preguntas juntas, con opciones). Después termina tu turno.', parameters: obj({ questions: { type: 'array', items: obj({ question: S('pregunta'), options: { type: 'array', items: { type: 'string' } } }, ['question']) } }, ['questions']) },
  read_skill: { description: 'Carga una skill (conocimiento) por nombre.', parameters: obj({ name: S('nombre de la skill, p. ej. mods/mekanism') }, ['name']) },
  consult_agent: { description: 'Encarga una tarea a otro agente y devuelve su respuesta. El agente solo ve "task".', parameters: obj({ agent: E(['mod-expert', 'optimizer', 'designer', 'architect', 'researcher', 'process-animator', 'validator', 'skill-writer']), task: S('brief completo: objetivo, condiciones, ids, cantidades, medidas y qué debe devolver') }, ['agent', 'task']) },
  search_blocks: { description: 'Busca bloques del modpack por texto, mod y/o rol. Agrupa cada familia (bloque + escaleras, losa, muro) con su color: así se elige la paleta de un tema (p. ej. mod "cataclysm" y rol "block").', parameters: obj({ query: S('texto (opcional si das mod o role)'), mod: S('id del mod'), role: E(['block', 'pillar', 'stairs', 'slab', 'wall', 'fence', 'glass', 'light', 'display', 'head', 'seat', 'table', 'storage', 'plant', 'carpet', 'door', 'trapdoor', 'chain', 'banner'], 'para qué sirve') }) },
  search_items: { description: 'Busca objetos del modpack (armas, botines de jefes, trofeos…) para exponerlos con display.', parameters: obj({ query: S('texto (opcional si das mod)'), mod: S('id del mod') }) },
  get_block: { description: 'Detalle de un bloque: tamaño real (celdas que ocupa), si es direccional y familia de tier.', parameters: obj({ id: S('id del bloque, ns:nombre') }, ['id']) },
  search_recipes: { description: 'Busca recetas reales (con cantidades) por salida, entrada, tipo o mod.', parameters: obj({ output: S('id (parcial) de la salida'), input: S('id (parcial) de una entrada'), type: S('tipo de receta'), mod: S('mod') }) },
  search_docs: { description: 'Busca en los manuales que traen los mods del modpack: cómo se monta un multibloque, qué necesita una máquina, cómo se conecta. Úsalo antes de colocar algo que no conoces bien.', parameters: obj({ query: S('palabras en inglés o un id, p. ej. "reactor multiblock" o powah:reactor_nitro'), mod: S('id del mod (opcional)') }, ['query']) },
  inspect_mod: { description: 'Todo lo de un mod en una llamada: bloques (con su tamaño real, si son multibloque o los dibuja el propio mod), objetos, piezas de modelo que usa su renderizador, recetas, páginas de manual, archivos de config y capítulos de misiones. Úsalo ANTES de buscar a ciegas: si el mod no trae manual, esto es lo que hay.', parameters: obj({ mod: S('id del mod, p. ej. dysoncubeproject') }, ['mod']) },
  get_config: { description: 'Lee la config de un mod: sin "file" lista archivos; con "file" devuelve su texto.', parameters: obj({ mod: S('id del mod'), file: S('archivo (opcional)') }, ['mod']) },
  calc: { description: 'Calcula una expresión aritmética exacta (+ - * / ^ ( ) ceil floor min max round).', parameters: obj({ expr: S('expresión') }, ['expr']) },
  get_design: { description: 'Resumen: tamaño, paleta (clave → id), recuento y piezas AE2 [x,y,z,id,side]. Con box lista los bloques de esa caja como [x,y,z,clave,facing n/s/e/w] (máx. 400).', parameters: obj({ box: XYZ('opcional [x0,y0,z0,x1,y1,z1]') }) },
  edit_design: { description: 'Edita el diseño. Coordenadas enteras ≥ 0: x hacia el este, y hacia arriba, z hacia el sur; el lienzo crece solo. Las ops van en orden y si una falla las demás siguen (mira "failed" y "notes" en la respuesta). '
    + 'place {x,y,z,block,facing} · fill {from,to,block,facing} (caja llena) · remove {from,to} o {x,y,z} · part {x,y,z,side,part} · note {x,y,z,text} (configuración de la máquina) · '
    + 'room {from,to,wall,floor,roof?,frame?,glass?,light?,door?} (sala: suelo, paredes con pilares cada 4, franja de ventanas, techo con luces y puerta de 1×2) · '
    + 'copy {from,to,at|step,times?,mirror?} (copia una caja con sus piezas a "at", o "times" veces cada "step"; mirror x|z la refleja y gira los facing). '
    + 'grid {at,legend,layers} (dibuja por capas: la forma más fiable para estatuas, fuentes, tronos o cualquier forma a medida) · '
    + 'prefab {prefab,x,y,z,facing,style,item?,height?,width?} (pieza hecha con el centro de abajo en x,y,z; ver read_skill decor) · '
    + 'arrange {prefab,layout,area|from,to|center,radius,y,spacing?,margin?,sides?,style,items?} (reparte copias simétricas mirando al centro y deja libres las puertas) · '
    + 'building {from,to,estilo,height?,shape?,doors?,porch?,pent?,base?,ceiling?,theme?,name?} (EDIFICIO COMPLETO hecho por código: zócalo, suelo, muros con pilares, vigas y ventanas, puertas con escalón, forro interior del tema, techo, tejado con alero y curva del estilo, luces dentro, en el desván y bajo el alero; from/to = esquinas de la línea de muros, from.y = el suelo del terreno; la respuesta da el interior y la altura donde se pisa para decorar dentro) · '
    + 'feature {type,...} (exterior por código: island {x,y=capa de la hierba,z,rx,rz,depth,seed,top,rock,ores} (isla flotante orgánica: contorno irregular, tierra y hierba arriba, roca que se afina abajo con estalactitas, menas y raíces) · boulder {x,y,z,r} · tree {x,y,z,variant,size} · pond {area,y=capa del agua,depth} · bridge {from,to,width} · lantern {x,y,z,variant} · torii {x,y,z,width,height,axis} · pagoda {x,y,z,floors} · path {from,to,block,edge} · steps {x,y,z,facing,width,count} · wall {from,to,height} · antenna {x,y,z,height} · solar {x,y,z,width,depth} · dome {x,y,z,r} · pad {x,y,z,size} (plataforma para una máquina)) · '
    + 'route {from,to,order?,cable?,block?} (ruta de cable por tramos rectos: con cable AE2 y block, el cable va dentro de ese bloque como fachada, invisible; con solo block, p. ej. un cable de energía de Powah, coloca ese bloque; métela por dentro del suelo o de la roca, no por fuera) · '
    + 'zone {name,to,from?,cut?} (vista de cámara del panel Vistas: to = a dónde mira, from = desde dónde (si falta, en diagonal a la distancia justa; r la cambia), cut = capa de corte para ver lo enterrado; una por zona y otra para la red de abajo) · '
    + 'freq {x,y,z,items:[objeto1,objeto2],text} (frecuencia de un Redstone Link: los dos objetos de su ranura, ya puestos en el NBT; text dice para qué es y sale en su ficha) · '
    + 'explain {name,text} (sección de «Cómo funciona y cómo montarlo» en texto plano: qué hace cada parte, qué configurar en el juego (buses, tuberías, filtros, caras), energía, carga de chunks y lo que no se ve en el diseño) · '
    + 'roof {from,to,shape,estilo|style,overhang?,pitch?} (tejado solo, sobre el rectángulo de las paredes; from.y = la capa de arriba de las paredes) · '
    + 'display {x,y,z,item} (objeto dentro del expositor que hay en x,y,z; en una celda de aire: kind frame con side = pared, o kind stand) · '
    + 'half top en place/fill: escalera invertida o losa arriba; state: propiedades (lantern colgado {"hanging":"true"}); mix y edge en fill. '
    + 'facing: hacia dónde mira la cara frontal (por defecto south). cable en place/fill: la celda es ese cable de AE2, tapado con fachadas de "block" o a la vista si no hay block; un cable nunca es block. '
    + 'part: pieza de AE2 en una cara de una celda de cable; proveedores, interfaces y buses van en la cara que TOCA la máquina (up/down si está encima o debajo).', parameters: obj({ ops: { type: 'array', items: OP } }, ['ops']) },
  view_design: { description: 'Mira el diseño en texto: planta (lo más alto de cada columna bajo el techo), una capa y, o alzados desde el sur (front) o el este (side). Úsalo tras construir para comprobar formas, simetría y huecos.', parameters: obj({ mode: E(['plan', 'layer', 'front', 'side'], 'vista (plan)'), y: N('layer: altura; plan: desde qué y'), box: { type: 'array', items: { type: 'number' }, description: 'opcional [x0,z0,x1,z1]' } }) },
  review_design: { description: 'Revisión de calidad con coordenadas y arreglos: zonas oscuras (aparecen monstruos), accesos y zonas encerradas, objetos tapados o inalcanzables, expositores vacíos, paredes planas, materiales, simetría, punto focal y altura. Hazla al terminar y corrige los error y warning.', parameters: obj({}) },
  plan_site: { description: 'Comprueba el plano de un conjunto ANTES de construir: volúmenes (edificios, patios, jardines, agua, caminos) con su rectángulo. Avisa si un edificio es una caja demasiado grande, si dos se pisan o sus aleros chocan, y dibuja la planta. Úsalo para todo lo grande.', parameters: obj({ volumes: { type: 'array', items: obj({ name: S('nombre'), kind: E(['edificio', 'patio', 'jardin', 'agua', 'camino']), rect: { type: 'array', items: { type: 'number' }, description: '[x0,z0,x1,z1]' }, height: N('alto de muros'), estilo: S('estilo') }, ['name', 'rect']) } }, ['volumes']) },
  search_quests: { description: 'Lee las misiones del modpack (FTB Quests): sin nada, la lista de capítulos con sus jefes; con chapter, las misiones de ese capítulo (objetos, jefes a matar, premios); con query, las misiones que la mencionan. Para saber qué es importante: trofeos, armas de jefes, progresión.', parameters: obj({ chapter: S('archivo o título del capítulo'), query: S('texto o id'), lang: S('idioma, p. ej. es_es') }) },
  run_code: { description: 'Ejecuta JavaScript en un sandbox (sin red ni archivos, 10 s) para construir con bucles y cálculos: lo mejor para formas grandes, curvas, repeticiones y conjuntos. API: set(x,y,z,id,state?) · del · get(x,y,z)→id|null · box(x0,y0,z0,x1,y1,z1,id,state?) · stair(x,y,z,id,low,{top,shape}) (low = lado del escalón bajo) · slab(x,y,z,id,top?) · log(x,y,z,id,axis) · show(x,y,z,item) (objeto en el expositor de esa celda) · building({...}) · roof({...}) · feature({type,...}) (mismos parámetros que en edit_design, también island) · route([x,y,z],[x,y,z],{cable,block,order}) (cable escondido con fachada) · part(x,y,z,side,part) (pieza de AE2 en una celda de cable, después de las rutas) · zone(nombre,[x,y,z] a dónde mira,{from,cut,r}) (vista de cámara) · explain(título,texto) (sección de «Cómo funciona») · freq(x,y,z,objeto1,objeto2,texto) (frecuencia de un Redstone Link, después de colocarlo) · print(...). Los ids se comprueban al final; la respuesta dice cuántos bloques puso, los fallos y lo impreso.', parameters: obj({ code: S('código JavaScript'), clear: { type: 'boolean', description: 'vaciar el diseño antes (false)' } }, ['code']) },
  render_design: { description: 'Imagen del diseño con sus texturas (isométrica desde una esquina, alzado o planta) para ver si queda bien: proporciones, tejados, colores, relieve. Si el modelo no admite imágenes, devuelve un resumen en texto.', parameters: obj({ view: E(['se', 'sw', 'ne', 'nw', 'front', 'back', 'left', 'right', 'top'], 'se: isométrica desde el sureste (por defecto)'), box: { type: 'array', items: { type: 'number' }, description: 'opcional [x0,y0,z0,x1,y1,z1]: solo esa parte (para ver un interior, quita el tejado con y1)' } }) },
  validate_design: { description: 'Comprueba solapes por tamaño real, piezas AE2 mal puestas o que no tocan su máquina y bloques flotantes.', parameters: obj({}) },
  set_process: { description: 'Guarda el grafo de proceso (nodos, aristas con caudal, cuello de botella) para animarlo.', parameters: obj({ graph: { type: 'object' } }, ['graph']) },
  web_search: { description: 'Busca en internet.', parameters: obj({ query: S('consulta') }, ['query']) },
  fetch_url: { description: 'Descarga el texto de una página web pública.', parameters: obj({ url: S('URL https') }, ['url']) },
  write_skill: { description: 'Guarda la skill de un mod para este workspace.', parameters: obj({ mod: S('id del mod'), markdown: S('contenido') }, ['mod', 'markdown']) },
};

// calculadora sin eval: números, + - * / ^, paréntesis y unas pocas funciones
export function calc(expr) {
  const src = String(expr).replace(/\s+/g, ''), FN = { ceil: Math.ceil, floor: Math.floor, round: Math.round, min: Math.min, max: Math.max, sqrt: Math.sqrt };
  let i = 0;
  const peek = () => src[i], eat = ch => (src[i] === ch ? (i++, true) : false);
  const num = () => { const m = src.slice(i).match(/^\d+(\.\d+)?(e[+-]?\d+)?/i); if (!m) throw new Error(`Esperaba un número en ${i}`); i += m[0].length; return +m[0]; };
  const atom = () => {
    if (eat('(')) { const v = add(); if (!eat(')')) throw new Error('Falta )'); return v; }
    if (eat('-')) return -atom();
    const fm = src.slice(i).match(/^[a-z]+/);
    if (fm) { const f = FN[fm[0]]; if (!f) throw new Error(`Función desconocida ${fm[0]}`); i += fm[0].length; if (!eat('(')) throw new Error('Falta ('); const args = [add()]; while (eat(',')) args.push(add()); if (!eat(')')) throw new Error('Falta )'); return f(...args); }
    return num();
  };
  const pow = () => { const b = atom(); return eat('^') ? b ** pow() : b; };
  const mul = () => { let v = pow(); for (;;) { if (eat('*')) v *= pow(); else if (eat('/')) v /= pow(); else return v; } };
  const add = () => { let v = mul(); for (;;) { if (eat('+')) v += mul(); else if (eat('-')) v -= mul(); else return v; } };
  const v = add();
  if (i < src.length) throw new Error(`Sobra "${src.slice(i)}"`);
  void peek;
  return v;
}

// estados por defecto de Minecraft: la variante que se dibuja cuando no se pide otra
const DEFAULT_STATE = new Set(['axis=y', 'half=bottom', 'half=lower', 'shape=straight', 'type=bottom', 'hanging=false', 'open=false', 'powered=false', 'lit=false', 'active=false', 'waterlogged=false']);
// tinte de bioma (el visor no lo pone solo: sin él la hierba y las hojas salen grises) y agua visible
const TINT = { grass_block: '#7fb238', short_grass: '#7fb238', tall_grass: '#7fb238', fern: '#7fb238', large_fern: '#7fb238', sugar_cane: '#91bd59', vine: '#59ae30', lily_pad: '#208030',
  oak_leaves: '#59ae30', jungle_leaves: '#59ae30', acacia_leaves: '#59ae30', dark_oak_leaves: '#59ae30', mangrove_leaves: '#59ae30', birch_leaves: '#80a755', spruce_leaves: '#619961' };
function dress(p) {
  const [ns, name] = p.id.split(':');
  if (ns === 'minecraft' && TINT[name]) p.tint = { 0: TINT[name] };
  if (p.id === 'minecraft:water') { delete p.model; p.all = 'minecraft:water_still'; p.glass = true; p.ctint = Object.fromEntries(['top', 'bottom', 'side', 'front', 'back'].map(f => [f, '#3f76e4'])); }
  // plantas planas que el índice mide mal (los pétalos salían de 2 de alto y chocaban con lo de encima)
  if (p.size?.some(v => v > 1) && /petals|flower|_grass$|fern|sapling|bush|carpet|lily|vine/.test(name)) { p.size = [1, 1, 1]; p.offset = [0, 0, 0]; }
  return p;
}

// building, feature y roof: piezas de arch.js sobre cualquier lienzo (el diseño en edit_design o el mundo de run_code)
function archOp(w, op, hasId) {
  // pasada en seco: si falta algún bloque en este modpack, no se toca nada y se dice cuáles
  if (!w.dry) {
    const dry = memoryWorld(); dry.dry = true;
    archOp(dry, op, hasId);
    const missing = [...new Set([...dry.cells.values()].map(c => c.id))].filter(i => !hasId(i));
    if (missing.length) throw new Error(`${op.op}: faltan en este modpack ${missing.slice(0, 6).join(', ')}; cambia el estilo o pásalos en theme`);
  }
  const kind = op.op, theme = op.theme && typeof op.theme === 'object' ? op.theme : {};
  for (const [k, v] of Object.entries(theme)) {
    if (k === 'roof' && v && typeof v === 'object') { for (const [rk, rv] of Object.entries(v)) if (typeof rv === 'string' && !hasId(rv)) throw new Error(`theme.roof.${rk}: no existe ${rv}; búscalo con search_blocks`); }
    else if (typeof v === 'string' && !hasId(v)) throw new Error(`theme.${k}: no existe ${v}; búscalo con search_blocks`);
  }
  if (op.estilo && !STYLES[op.estilo]) throw new Error(`estilo "${op.estilo}" no existe: ${Object.keys(STYLES).join(', ')}`);
  const S = styleOf(op.estilo || 'japones', theme, hasId), num = v => (v == null || v === '' ? undefined : +v);
  const pt = what => { const p = (op.at ?? [op.x, op.y, op.z]).map(Number); if (p.length !== 3 || p.some(n => !Number.isInteger(n))) throw new Error(`${what}: faltan x, y, z enteros`); return p; };
  if (kind === 'building') {
    const a = xyz(op.from, 'building from'), b = xyz(op.to, 'building to');
    const doors = (Array.isArray(op.doors) && op.doors.length ? op.doors : op.door ? [{ side: op.door }] : []).map(d => ({ side: FACING[String(d?.side || 'south').toLowerCase()] || 's', at: num(d?.at), width: num(d?.width), height: num(d?.height) }));
    const info = building(w, { x0: Math.min(a[0], b[0]), z0: Math.min(a[2], b[2]), x1: Math.max(a[0], b[0]), z1: Math.max(a[2], b[2]), y: a[1], base: num(op.base), height: num(op.height), roof: op.shape, over: num(op.overhang), doors,
      pent: op.pent, porch: op.porch ? FACING[String(op.porch).toLowerCase()] : undefined, ceiling: op.ceiling === 'liso' ? undefined : op.ceiling, lining: theme.lining, liningPillar: theme.liningPillar, liningAccent: theme.liningAccent,
      floor: theme.floor, baseBlock: theme.base, baseTop: theme.baseTop, lights: op.lights, axis: op.axis, pitch: op.pitch }, S);
    return `building${op.name ? ` "${op.name}"` : ''}: interior [${info.interior}] (x0,z0,x1,z1) · se pisa en y=${info.standY} · techo en y=${info.ceilingY} · tejado hasta y=${info.roofTop} · puertas: ${info.doors.map(d => `${SIDE_NAME[d.side]} ${d.cells}`).join(' / ')} · aleros [${info.eaves}]`;
  }
  if (kind === 'feature') {
    const t = op.type;
    if (t === 'tree') { const [x, y, z] = pt('tree'); tree(w, { x, y, z, kind: op.variant || S.tree, size: Math.max(1, Math.min(3, +op.size || 1)) }); }
    else if (t === 'lantern') { const [x, y, z] = pt('lantern'); lantern(w, { x, y, z, kind: op.variant || 'toro' }); }
    else if (t === 'pond') {
      if (!Array.isArray(op.area) || op.area.length !== 4) throw new Error('pond: falta area [x0,z0,x1,z1]');
      if (!Number.isInteger(+op.y)) throw new Error('pond: falta y (la capa de la superficie del agua)');
      pond(w, { area: op.area.map(Number), y: +op.y, depth: Math.max(1, Math.min(4, +op.depth || 2)) });
    } else if (t === 'bridge') bridge(w, { from: xyz(op.from, 'bridge from'), to: xyz(op.to, 'bridge to'), width: Math.max(1, +op.width || 3), wood: op.variant || S.bridge });
    else if (t === 'torii') { const [x, y, z] = pt('torii'); torii(w, { x, y, z, width: Math.max(5, +op.width || 9), height: Math.max(5, +op.height || 7), axis: op.axis === 'z' ? 'z' : 'x' }); }
    else if (t === 'pagoda') { const [x, y, z] = pt('pagoda'); pagoda(w, { x, y, z, floors: +op.floors || 5 }, S); }
    else if (t === 'path') archPath(w, { from: xyz(op.from, 'path from'), to: xyz(op.to, 'path to'), block: op.block || undefined, edge: op.edge === '' ? null : op.edge || undefined });
    else if (t === 'steps') { const [x, y, z] = pt('steps'); archSteps(w, { x, y, z, dir: FACING[String(op.facing || 'south').toLowerCase()] || 's', width: Math.max(1, +op.width || 5), count: Math.max(1, Math.min(12, +op.count || 3)), block: op.block || S.step }); }
    else if (t === 'wall') gardenWall(w, { from: xyz(op.from, 'wall from'), to: xyz(op.to, 'wall to'), height: Math.max(2, +op.height || 3) }, S);
    else if (t === 'island') {
      const [x, y, z] = pt('island'), rx = Math.max(4, Math.min(60, +op.rx || +op.radius || 16)), rz = Math.max(4, Math.min(60, +op.rz || rx)), dep = num(op.depth) ?? Math.round(Math.max(rx, rz) * 1.1);
      if (y - dep - 10 < 0) throw new Error(`island: no cabe por debajo; pon y ≥ ${dep + 10} para que quepan la roca y las estalactitas`);
      for (const id of [op.top, ...(op.rock || []), ...(op.ores || [])].filter(Boolean)) if (!hasId(String(id))) throw new Error(`island: no existe ${id}`);
      const info = island(w, { x, y, z, rx, rz, depth: num(op.depth), seed: +op.seed || 7, top: op.top || undefined, rock: op.rock?.length ? op.rock.map(String) : undefined, ores: op.ores?.length ? op.ores.map(String) : undefined });
      return `island: hierba en y=${info.top} (se pisa en y=${info.top + 1}), ${info.surface} celdas llanas arriba de ${info.cells}; la roca baja hasta y≈${info.bottom}`;
    }
    else if (t === 'boulder') { const [x, y, z] = pt('boulder'); boulder(w, { x, y, z, r: Math.max(1, Math.min(6, +op.r || 2)), block: op.block || undefined, seed: +op.seed || 3 }); }
    else if (t === 'antenna') { const [x, y, z] = pt('antenna'); antenna(w, { x, y, z, height: Math.max(4, Math.min(20, +op.height || 7)) }); }
    else if (t === 'solar') { const [x, y, z] = pt('solar'); solar(w, { x, y, z, width: Math.max(1, +op.width || 5), depth: Math.max(1, +op.depth || 3) }); }
    else if (t === 'dome') { const [x, y, z] = pt('dome'); dome(w, { x, y, z, r: Math.max(2, Math.min(16, +op.r || 4)), glass: op.block || undefined }); }
    else if (t === 'pad') { const [x, y, z] = pt('pad'); pad(w, { x, y, z, size: Math.max(1, +op.size || 3), block: op.block || undefined, edge: op.edge || undefined }); }
    else throw new Error('feature: type island, boulder, tree, pond, bridge, lantern, torii, pagoda, path, steps, wall, antenna, solar, dome o pad');
    return null;
  }
  // roof: con estilo, sus tejas; sin él, las escaleras de style (familia de base o trim)
  const a = xyz(op.from, 'roof from'), b = xyz(op.to, 'roof to');
  let mat;
  if (op.estilo) mat = S.roof;
  else {
    const st = op.style || {}, roles = resolveStyle({ base: st.base || st.trim || op.block, ...st, stairs: st.stairs || (/_stairs$/.test(op.block || '') ? op.block : undefined) }, hasId);
    if (!roles.S) throw new Error('roof: da estilo (japones, chino, medieval, moderno) o style.stairs, o un style.base con escaleras en su familia');
    roles.H ||= familyVariant(roles.S.replace(/_stairs$/, ''), 'slab', hasId) || roles.S;
    roles.B ||= roles.T || roles.S;
    mat = { stairs: roles.S, slab: roles.H, block: roles.B, ridge: roles.B, tip: roles.B, gable: roles.B };
  }
  const shape = op.shape || (op.estilo ? S.roofShape : 'gable');
  if (shape === 'flat') throw new Error('roof: el tejado plano va con building shape flat');
  const [x0, x1, z0, z1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[2], b[2]), Math.max(a[2], b[2])];
  const gable = shape === 'gable' ? -1 : shape === 'irimoya' ? Math.max(1, Math.floor(Math.min(x1 - x0, z1 - z0) / 4)) : null;
  const r = archRoof(w, { x0, z0, x1, z1, y: a[1], over: num(op.overhang) != null ? Math.max(0, Math.min(4, +op.overhang)) : op.estilo ? S.over : 1, mat, gable,
    pitch: op.pitch || (op.estilo ? S.pitch : 'normal'), upturn: op.upturn ?? (op.estilo ? S.upturn : false), axis: op.axis || null });
  return `roof: cumbrera en y=${r.top - 1}, aleros [${r.X0},${r.Z0},${r.X1},${r.Z1}]`;
}

const IDS = new WeakMap();
const idsOf = r => { if (!IDS.has(r)) IDS.set(r, new Map(r.blocks.map(b => [b.id, b]))); return IDS.get(r); };
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const brief = s => (JSON.stringify(s).length > 12_000 ? JSON.stringify(s).slice(0, 12_000) + '…(recortado)' : JSON.stringify(s));
const FACING = { north: 'n', south: 's', east: 'e', west: 'w', n: 'n', s: 's', e: 'e', w: 'w' };
const SIDE = { ...FACING, up: 'u', down: 'd', top: 'u', bottom: 'd', u: 'u', d: 'd' };
const AE2_CABLE = /^ae2:[a-z_]+_cable$/, PART_ID = /^(ae2|extendedae|expandedae|advanced_ae|appmek|megacells|merequester|appflux):[a-z0-9_]+$/;
// forma de bloque → su pieza de cable (los modelos piden a menudo la del bloque)
const PART_OF = { 'ae2:pattern_provider': 'ae2:cable_pattern_provider', 'ae2:interface': 'ae2:cable_interface', 'extendedae:ex_pattern_provider': 'extendedae:ex_pattern_provider_part', 'extendedae:ex_interface': 'extendedae:ex_interface_part' };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const xyz = (v, what) => {
  const p = (Array.isArray(v) ? v : []).map(Number);
  if (p.length !== 3 || p.some(n => !Number.isInteger(n) || n < 0 || n > 512)) throw new Error(`${what}: hacen falta 3 coordenadas enteras entre 0 y 512`);
  return p;
};

// ctx: { design (doc), workspaceId, userId, saveDesign(doc), runAgent(name, task), onAsk(questions) }
export async function runTool(name, args, ctx) {
  const ws = () => { if (!ctx.workspaceId) throw new Error('Este diseño no tiene workspace: crea uno con tu modpack y asígnalo al diseño'); return reader(ctx.workspaceId); };
  switch (name) {
    case 'ask_user': ctx.onAsk(args.questions || []); return 'Preguntas enviadas al jugador. Termina tu turno y espera su respuesta.';
    case 'read_skill': return readSkill(String(args.name), ctx.workspaceId) || `No existe la skill "${args.name}". Disponibles: ${Object.keys(listSkills(ctx.workspaceId)).join(', ')}`;
    case 'consult_agent': return await ctx.runAgent(String(args.agent), String(args.task));
    case 'search_blocks': {
      const r = ws(), words = String(args.query || '').toLowerCase().split(/\s+/).filter(Boolean), role = args.role, byId = idsOf(r);
      if (!words.length && !args.mod && !role) return 'Da query, mod o role.';
      const hits = r.blocks.filter(b => (!args.mod || b.id.startsWith(args.mod + ':')) && words.every(w => `${b.id} ${b.name} ${b.nameEs || ''}`.toLowerCase().includes(w)) && (!role || roleOf(b) === role));
      // una entrada por familia (el bloque y sus escaleras, losa, muro…), con su color: así se arma la paleta de un tema
      const fams = new Map();
      for (const b of hits) { const f = familyBase(b.id); (fams.get(f) ?? fams.set(f, []).get(f)).push(b); }
      const has = i => byId.has(i);
      const items = [...fams.entries()].slice(0, 25).map(([f, list]) => {
        const head = ['', 's', '_planks', '_block', '_bricks'].map(x => byId.get(f + x)).find(Boolean) || list[0], v = {};
        for (const kind of ['stairs', 'slab', 'wall', 'fence', 'pillar']) { const c = familyVariant(head.id, kind, has); if (c && c !== head.id) v[kind] = c; }
        return { id: head.id, name: head.nameEs || head.name, role: roleOf(head), color: colorName(r.color(head.textures?.[0] || '')) || undefined, ...v,
          size: head.size.some(x => x > 1) ? head.size : undefined, directional: head.facing || undefined, tier: head.tier?.tier };
      });
      return brief({ total: hits.length, families: fams.size, items });
    }
    case 'search_items': {
      const r = ws(), words = String(args.query || '').toLowerCase().split(/\s+/).filter(Boolean), byId = idsOf(r);
      if (!r.items.length) return 'Este workspace no tiene índice de objetos todavía (hay que reindexarlo). Usa search_blocks.';
      if (!words.length && !args.mod) return 'Da query o mod.';
      const hits = r.items.filter(i => (!args.mod || i.id.startsWith(args.mod + ':')) && words.every(w => `${i.id} ${i.name} ${i.nameEs || ''}`.toLowerCase().includes(w)));
      hits.sort((a, b) => byId.has(a.id) - byId.has(b.id));                 // primero los que no son bloques: armas, armaduras, botines
      return brief({ total: hits.length, items: hits.slice(0, 40).map(i => [i.id, i.nameEs || i.name, ...(byId.has(i.id) ? ['bloque'] : [])]) });
    }
    case 'get_block': {
      const r = ws(), b = r.blocks.find(x => x.id === args.id);
      if (!b) return `No existe ${args.id} en este modpack`;
      const family = b.tier ? r.blocks.filter(x => x.tier?.family === b.tier.family).map(x => x.id) : undefined;
      const ber = berOf(b.id);
      return brief({ id: b.id, name: b.nameEs || b.name, size: ber?.size || b.size, offset: (ber?.offset || b.offset)?.some(Boolean) ? (ber?.offset || b.offset) : undefined, directional: !!b.facing, tier: b.tier?.tier, family, multiblock: ber?.note });
    }
    case 'search_recipes': {
      const r = ws(), { output, input, type, mod } = args;
      const hits = r.recipes.filter(x => (!type || x.type.includes(type)) && (!mod || x.id.startsWith(mod + ':')) && (!output || x.out.some(o => o.includes(output))) && (!input || x.in.some(i => i.includes(input))));
      // sin el JSON (índices antiguos sin data/ en files.json) quedan al menos entradas y salidas
      return brief({ total: hits.length, items: hits.slice(0, 8).map(x => ({ id: x.id, type: x.type, recipe: r.json(x.path) ?? { in: x.in, out: x.out } })) });
    }
    case 'search_docs': {
      const words = String(args.query || '').toLowerCase().split(/[\s,]+/).filter(w => w.length > 1);
      const docs = ws().docs.filter(d => !args.mod || d.mod === args.mod);
      if (!docs.length) return args.mod ? `${args.mod} no trae manual en este modpack: usa la skill del mod o pregunta al jugador.` : 'Los mods de este modpack no traen manuales legibles.';
      const score = d => { const p = d.path.toLowerCase(), t = d.text.toLowerCase(); return words.reduce((s, w) => s + (p.includes(w) ? 3 : 0) + (t.includes(w) ? 1 : 0), 0); };
      const hits = docs.map(d => [d, score(d)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (!hits.length) return `Nada sobre "${args.query}" en los manuales. Prueba otras palabras en inglés o el id del bloque.`;
      return hits.map(([d]) => `## ${d.path}\n${d.text.slice(0, 3000)}`).join('\n\n');
    }
    case 'inspect_mod': {
      const r = ws(), ns = String(args.mod || '').toLowerCase().trim();
      if (!ns) return 'Falta mod';
      const blocks = r.blocks.filter(b => b.id.startsWith(ns + ':'));
      if (!blocks.length && !r.items.some(i => i.id.startsWith(ns + ':'))) {
        const near = [...new Set(r.blocks.map(b => b.id.split(':')[0]))].filter(n => n.includes(ns.slice(0, 5)) || ns.includes(n.slice(0, 5))).slice(0, 6);
        return `No hay ningún mod "${ns}" en este modpack.${near.length ? ` ¿Es alguno de estos? ${near.join(', ')}` : ''}`;
      }
      const models = r.models(blocks.slice(0, 120).map(b => b.model).filter(Boolean));
      const used = new Set(blocks.map(b => b.model));
      const parts = Object.keys(r.files).filter(f => f.startsWith(`assets/${ns}/models/block/`)).map(f => `${ns}:block/${f.slice(`assets/${ns}/models/block/`.length).replace(/\.json$/, '')}`).filter(m => !used.has(m));
      const recipes = r.recipes.filter(x => x.id.startsWith(ns + ':') || x.out.some(o => o.startsWith(ns + ':')));
      const docs = r.docs.filter(d => d.mod === ns).length;
      const cfgDir = join(wsDir(ctx.workspaceId), 'files', 'config');
      const cfg = existsSync(cfgDir) ? readdirSync(cfgDir, { recursive: true }).map(String).filter(f => /\.(toml|json5?|cfg)$/.test(f) && f.toLowerCase().includes(ns)).slice(0, 10) : [];
      const Q = loadQuests(wsDir(ctx.workspaceId)), chapters = Q ? Q.chapters.filter(c => c.file.includes(ns) || c.quests.some(q => q.tasks.some(t => (t.item || t.kill || '').startsWith(ns + ':')))).map(c => c.file).slice(0, 8) : [];
      return brief({
        mod: ns,
        blocks: blocks.slice(0, 80).map(b => {
          const ber = berOf(b.id), empty = !(models[b.model] || []).length;
          return { id: b.id, name: b.nameEs || b.name, size: ber?.size || b.size, directional: !!b.facing || undefined, multiblock: ber?.note, aspecto: ber ? 'lo dibuja el mod con piezas: el visor ya lo enseña así' : empty ? 'sin modelo de bloque (lo dibuja el mod en el juego; en el visor se ve como un cubo)' : undefined };
        }),
        items: r.items.filter(i => i.id.startsWith(ns + ':') && !blocks.some(b => b.id === i.id)).slice(0, 60).map(i => `${i.id} · ${i.nameEs || i.name}`),
        partModels: parts.length ? parts.slice(0, 30) : undefined,
        recipes: { total: recipes.length, outputs: [...new Set(recipes.flatMap(x => x.out))].slice(0, 15) },
        manual: docs ? `${docs} páginas: search_docs con mod "${ns}"` : 'sin manual en el pack: no lo busques más con search_docs',
        config: cfg.length ? cfg : undefined,
        quests: chapters.length ? chapters : undefined,
      });
    }
    case 'get_config': {
      if (!ctx.workspaceId) return 'Sin workspace';
      const dir = join(wsDir(ctx.workspaceId), 'files', 'config');
      if (!existsSync(dir)) return 'Este workspace no trae configs (súbelo con la carpeta config/).';
      const files = readdirSync(dir, { recursive: true }).map(String).filter(f => /\.(toml|json5?|cfg)$/.test(f) && f.toLowerCase().includes(String(args.mod).toLowerCase()));
      if (!args.file) return brief({ files: files.slice(0, 30) });
      if (!files.includes(args.file)) return 'Archivo no encontrado';
      return readFileSync(join(dir, args.file), 'utf8').slice(0, 12_000);
    }
    case 'calc': return String(calc(args.expr));
    case 'get_design': {
      const m = decode(ctx.design), counts = {};
      for (const b of m.BLOCKS) counts[b.t] = (counts[b.t] || 0) + 1;
      const box = Array.isArray(args.box) && args.box.length === 6 ? args.box : null;
      const inBox = b => box && b.x >= box[0] && b.y >= box[1] && b.z >= box[2] && b.x <= box[3] && b.y <= box[4] && b.z <= box[5];
      return brief({ title: m.TITLE, size: [m.WX ?? m.W, m.H, m.WZ ?? m.W], palette: Object.fromEntries(Object.entries(m.P).map(([k, v]) => [k, v.id])), counts,
        parts: m.TERMS?.length ? m.TERMS.filter(t => !box || inBox(t)).slice(0, 200).map(t => [t.x, t.y, t.z, m.P[t.t]?.id, SIDE_NAME[t.f]]) : undefined,
        blocks: box ? m.BLOCKS.filter(inBox).slice(0, 400).map(b => [b.x, b.y, b.z, b.t, b.f, ...(b.top ? ['top'] : [])]) : undefined,
        displays: m.DISPLAYS?.length ? m.DISPLAYS.slice(0, 60).map(d => [d.x, d.y, d.z, d.kind, d.item]) : undefined, process: m.PROCESS ? 'sí' : 'no' });
    }
    case 'edit_design': {
      const m = decode(ctx.design), r = ctx.workspaceId ? reader(ctx.workspaceId) : null, at = new Map(m.BLOCKS.map(b => [`${b.x},${b.y},${b.z}`, b]));
      const failed = [], notes = new Set(), undirected = new Set();
      const similar = id => {
        const w = id.split(':').pop().split('_').filter(x => x.length > 2);
        return (r?.blocks || []).map(b => [b.id, w.filter(x => b.id.includes(x)).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([i]) => i);
      };
      // el giro x de la variante (y el y si el bloque no se orienta con facing: ese lo pone el visor) va en la referencia: modelo@x90y90
      const turned = (blk, v) => { const g = (v.x ? `x${v.x}` : '') + (!blk.facing && v.y ? `y${v.y}` : ''); return g ? `${v.model}@${g}` : v.model; };
      // variante del blockstate con esas propiedades (farol colgado, trampilla abierta…): su modelo es lo que dibuja el visor
      const variant = (blk, props) => {
        const [ns, name] = blk.id.split(':'), bs = r?.json(`assets/${ns}/blockstates/${name}.json`);
        if (!bs?.variants) return null;
        const want = Object.entries(props).map(([k, v]) => `${k}=${v}`), ok = k => want.every(w => k.split(',').includes(w));
        const hit = Object.entries(bs.variants).find(([k]) => ok(k) && (!blk.facing || /(^|,)facing=north(,|$)/.test(k))) || Object.entries(bs.variants).find(([k]) => ok(k));
        if (!hit) return null;
        const v = Array.isArray(hit[1]) ? hit[1][0] : hit[1];
        // el frente del visor (f) es el lado de "facing", salvo en escaleras: su facing es el lado alto y f el escalón bajo
        return { model: turned(blk, v), yaw: blk.facing ? ((/_stairs$/.test(blk.id) ? 360 : 180) - (v.y || 0) + 360) % 360 : 0 };
      };
      const keyFor = (id, props) => {
        const pk = props && Object.keys(props).length ? JSON.stringify(props) : '';
        let k = Object.keys(m.P).find(k => m.P[k].id === id && !m.P[k].disp && (m.P[k].props ? JSON.stringify(m.P[k].props) : '') === pk);
        if (k) return k;
        const blk = r?.blocks.find(b => b.id === id);
        if (!blk) {
          if (PART_ID.test(id) && /cable_|_part$|_bus$|terminal|_plane$/.test(id)) throw new Error(`${id} es una pieza de AE2, no un bloque: va con {op:"part",x,y,z,side,part} en una celda de cable`);
          const near = similar(id);
          throw new Error(`No existe ${id} en este modpack.${near.length ? ` Parecidos: ${near.join(', ')}` : ' Búscalo con search_blocks.'}`);
        }
        let v = pk ? variant(blk, props) : defaultVariant(blk);
        if (pk && !v) {
          // un estado que el modelo no distingue (cama, cofre o multipart: el juego los dibuja aparte) sigue valiendo para el NBT
          const [ns, name] = id.split(':'), keys = Object.keys(r?.json(`assets/${ns}/blockstates/${name}.json`)?.variants || {});
          if (keys.some(k => k.includes('='))) { notes.add(`${id} no tiene el estado ${pk}: va con su estado normal`); return keyFor(id); }
          v = defaultVariant(blk);
        }
        k = id.split(':')[1].slice(0, 22) + (pk ? '_' + Object.values(props).join('_').slice(0, 10) : '');
        while (m.P[k]) k += '_';
        m.P[k] = dress({ n: blk.nameEs || blk.name, id, model: v?.model || blk.model, yaw: v ? v.yaw : blk.yaw, size: blk.size, offset: blk.offset, tier: blk.tier || undefined, dir: blk.facing || undefined, props: pk ? props : undefined });
        // bloque que dibuja el mod con piezas (multibloque): su forma y su huella reales
        const ber = berOf(id);
        if (ber) { if (ber.parts.length) m.P[k].model = ber.parts; m.P[k].size = ber.size; m.P[k].offset = ber.offset; notes.add(`${id}: ${ber.note}`); }
        return k;
      };
      // sin estado: la variante por defecto de Minecraft (escalera recta, tronco de pie, losa abajo…), no la primera del archivo
      const defaultVariant = blk => {
        const [ns, name] = blk.id.split(':'), bs = r?.json(`assets/${ns}/blockstates/${name}.json`), ent = bs?.variants ? Object.entries(bs.variants) : [];
        if (ent.length < 2) return null;
        const score = key => { const ps = key.split(','); return 2 * ps.filter(p => DEFAULT_STATE.has(p)).length + (blk.facing && ps.includes('facing=north') ? 3 : 0) - ps.filter(p => p.endsWith('=true')).length; };
        const [, val] = ent.reduce((a, b) => (score(b[0]) > score(a[0]) ? b : a)), v = Array.isArray(val) ? val[0] : val;
        return { model: turned(blk, v), yaw: blk.facing ? ((/_stairs$/.test(blk.id) ? 360 : 180) - (v.y || 0) + 360) % 360 : 0 };
      };
      // un bloque con orientación y estado: half top (escalera invertida, losa arriba) va en b.top; facing del estado, en f
      const STAIRLIKE = /_(stairs|slab)$/;
      const cellOf = (id, o = {}) => {
        const state = { ...(o.state && typeof o.state === 'object' ? o.state : {}) };
        let f = o.f ? FACING[String(o.f).toLowerCase()] : null, top = o.top || o.half === 'top';
        if (o.f && !f) throw new Error(`facing "${o.f}" no válido: north, south, east o west`);
        if (STAIRLIKE.test(id)) { if (state.half === 'top' || state.type === 'top') top = true; delete state.half; delete state.type; }
        if (state.facing && FACING[state.facing]) { f ||= /_stairs$/.test(id) ? OPP[FACING[state.facing]] : FACING[state.facing]; delete state.facing; }
        for (const [k, v] of Object.entries(state)) state[k] = String(v);
        const t = keyFor(id, state);
        if (!f && !state.facing && m.P[t].dir && !undirected.has(t)) { undirected.add(t); notes.add(`${id} es direccional y va sin facing, así que su frente mira al sur. Si debe mirar a otro lado, vuelve a colocarlo con facing.`); }
        return { t, f: f || 's', ...(top ? { top: true } : {}) };
      };
      let overwrote = 0;
      const put = (x, y, z, id, o) => {
        if (x < 0 || y < 0 || z < 0 || x > 512 || y > 512 || z > 512) throw new Error(`${x},${y},${z} fuera del lienzo (0..512)`);
        const k = `${x},${y},${z}`, c = cellOf(id, o);
        if (o?.count && at.has(k) && at.get(k).t !== c.t) overwrote++;
        at.set(k, { x, y, z, ...c }); n++;
      };
      const del = (x, y, z) => { if (at.delete(`${x},${y},${z}`)) n++; };
      const hasId = id => !!r && idsOf(r).has(id);
      // lienzo para las piezas de arquitectura: escribe en el diseño con las mismas comprobaciones que place
      let clipped = 0;
      m.FLATROOFS = m.FLATROOFS || [];
      const sink = canvas({
        flatRoofs: m.FLATROOFS,
        set(x, y, z, id, state) { if (id == null) return del(x, y, z); if (x < 0 || y < 0 || z < 0 || x > 512 || y > 512 || z > 512) { clipped++; return; } put(x, y, z, id, { state }); },
        del: (x, y, z) => del(x, y, z),
        has: (x, y, z) => at.has(`${x},${y},${z}`),
        get: (x, y, z) => { const b = at.get(`${x},${y},${z}`); return b ? m.P[b.t]?.id ?? null : null; },
      });
      // objeto expuesto: dentro del expositor de esa celda, o en una celda de aire como marco en la pared o soporte de armadura
      const HOLDS = new RegExp(`${ROLES.display.source}|shelf|case|rack|cabinet`), INSIDE = /shelf|case|cabinet|rack|display_table/;
      const addDisplay = (x, y, z, wanted, kindHint, side, facing) => {
        const list = [].concat(wanted ?? []).map(String).slice(0, kindHint === 'stand' ? 6 : 1), item = list[0] || '';
        for (const it of list) {
          if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(it)) throw new Error('display: falta item (id ns:nombre)');
          if (r && !r.items.some(i => i.id === it) && !hasId(it)) {
            const w = it.split(':').pop().split('_').filter(x => x.length > 2), near = r.items.filter(i => w.some(x => i.id.includes(x))).slice(0, 6).map(i => i.id);
            throw new Error(`No existe el objeto ${it}.${near.length ? ` Parecidos: ${near.join(', ')}` : ' Búscalo con search_items.'}`);
          }
        }
        if (!item) throw new Error('display: falta item (id ns:nombre)');
        const holder = at.get(`${x},${y},${z}`), hid = holder && m.P[holder.t]?.id;
        let kind, f = 's', inside;
        if (holder && kindHint !== 'frame' && kindHint !== 'stand') {
          if (!HOLDS.test(hid.split(':')[1])) throw new Error(`display: en ${x},${y},${z} hay ${hid}, que no expone objetos. Pon un expositor (search_blocks role display, p. ej. supplementaries:pedestal) o usa kind frame en una celda de aire junto a una pared`);
          kind = 'block'; inside = INSIDE.test(hid) || undefined; f = holder.f;
        } else if (kindHint === 'stand') {
          if (holder) throw new Error(`display stand: ${x},${y},${z} tiene que ser aire`);
          kind = 'stand'; f = FACING[String(facing || 's').toLowerCase()] || 's';
        } else {
          if (holder) throw new Error(`display frame: ${x},${y},${z} tiene que ser aire, delante de la pared`);
          const sd = FACING[String(side || '').toLowerCase()];
          if (!sd) throw new Error('display: esa celda está vacía; para un marco da side (la pared de la que cuelga: north, south, east o west), o kind stand para un soporte de armadura');
          const d = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[sd];
          if (!at.has(`${x + d[0]},${y},${z + d[1]}`)) throw new Error(`display frame: no hay pared al ${side} de ${x},${y},${z}`);
          kind = 'frame'; f = OPP[sd];
        }
        const [ns, name] = item.split(':'), dk = `d_${kind}_${name}`.slice(0, 40), info = r?.items.find(i => i.id === item);
        if (!m.P[dk]) m.P[dk] = { n: info?.nameEs || info?.name || item, id: item, disp: true, yaw: kind === 'frame' ? 180 : 0,
          model: kind === 'frame' ? ['minecraft:block/item_frame', `${ns}:item/${name}.flat`] : kind === 'stand' ? ['minecraft:item/armor_stand', `${ns}:item/${name}`] : `${ns}:item/${name}` };
        m.DISPLAYS = (m.DISPLAYS || []).filter(d => !(d.x === x && d.y === y && d.z === z));
        m.DISPLAYS.push({ x, y, z, t: dk, f, kind, item: kind === 'stand' && list.length > 1 ? list : item, ...(inside ? { inside } : {}) });
        if (kind === 'block' && !inside && at.has(`${x},${y + 1},${z}`)) notes.add(`El objeto de ${x},${y},${z} queda tapado por el bloque de encima: deja aire sobre el expositor`);
        if (hasId(item) && /head|skull|trophy/.test(item)) notes.add(`${item} también es un bloque: puedes ponerlo directamente con place`);
        n++;
      };
      const placePrefab = (name, p, f, op, roles, queue) => {
        for (const c of expandPrefab(name, p, f, { height: op.height, width: op.width }, roles)) {
          if (!c.id) { del(c.x, c.y, c.z); continue; }
          const hang = c.hang && /lantern|lamp/.test(c.id) ? { hanging: 'true' } : undefined;
          put(c.x, c.y, c.z, c.id, { f: c.f, top: c.top, state: hang, count: true });
          if (c.display && queue.length) addDisplay(c.x, c.y, c.z, queue.shift());
        }
      };
      // cable de AE2 a la vista (sin fachada): en el visor, un poste de fluix como el cable de los diseños de ejemplo
      const cableKey = () => {
        let k = Object.keys(m.P).find(k => m.P[k].id === 'ae2:cable_bus' && m.P[k].shape === 'post');
        if (k) return k;
        for (k = 'ae2_cable'; m.P[k]; k += '_');
        m.P[k] = { n: 'Cable de AE2', id: 'ae2:cable_bus', all: 'ae2:fluix_block', shape: 'post' };
        return k;
      };
      // pieza de cable (es un objeto, no un bloque): en el visor se dibuja como una placa con la textura de su forma de bloque
      const partKey = id => {
        let k = Object.keys(m.P).find(k => m.P[k].id === id);
        if (k) return k;
        const form = id.replace(':cable_', ':').replace(/_part$/, ''), blk = r?.blocks.find(b => b.id === form);
        k = 'p_' + id.split(':')[1].slice(0, 22);
        while (m.P[k]) k += '_';
        m.P[k] = { n: `${blk?.nameEs || blk?.name || id} (panel)`, id, panel: blk ? form : id };
        return k;
      };
      m.TERMS = m.TERMS || [];
      // los modelos pequeños mandan a veces una sola op, ops como texto JSON o el nombre de la op en otra clave
      let ops = args.ops ?? (args.op ? [args] : []);
      if (typeof ops === 'string') try { ops = JSON.parse(ops); } catch { throw new Error('ops tiene que ser una lista de objetos'); }
      if (!Array.isArray(ops)) ops = [ops];
      const box = (a, b) => { const lo = a.map((v, i) => Math.min(v, b[i])), hi = a.map((v, i) => Math.max(v, b[i])); if ((hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1) > 50_000) throw new Error('Caja demasiado grande (máx. 50 000 celdas)'); return [lo, hi]; };
      const within = (lo, hi) => ({ x, y, z }) => x >= lo[0] && y >= lo[1] && z >= lo[2] && x <= hi[0] && y <= hi[1] && z <= hi[2];
      let n = 0;
      if (args._kinds) m.KINDS = { ...(m.KINDS || {}), ...args._kinds };
      if (Array.isArray(args._flat) && args._flat.length) m.FLATROOFS = [...(m.FLATROOFS || []), ...args._flat];
      ops.slice(0, args._internal ? 400_000 : 2000).forEach((op, i) => {
        const kind = op?.op ?? op?.type ?? op?.action;
        try {
          const one = () => { const p = xyz(op.at ?? op.pos ?? [op.x, op.y, op.z], kind); return [p, p]; };
          if (kind === 'place' || kind === 'fill') {
            let block = op.block ? String(op.block) : null, cable = op.cable ? String(op.cable) : null;
            if (block && (block === 'ae2:cable_bus' || AE2_CABLE.test(block))) { cable ||= block === 'ae2:cable_bus' ? 'ae2:fluix_glass_cable' : block; block = null; } // un cable no es un bloque
            if (!block && !cable) throw new Error('falta block');
            if (cable && !AE2_CABLE.test(cable)) throw new Error(`cable: solo cables de AE2 (ae2:fluix_glass_cable, ae2:fluix_covered_cable, ae2:fluix_covered_dense_cable…), no ${cable}`);
            const o = { f: op.facing, half: op.half, state: op.state };
            const c = block ? cellOf(block, o) : { t: cableKey(), f: op.facing ? FACING[String(op.facing).toLowerCase()] || 's' : 's' };
            // cable tapado: la celda se ve como "block" y se exporta como ese cable con fachadas de "block" en las caras libres
            const col = cable?.slice(4).replace(/_(glass|covered|smart).*$/, '');
            const extra = cable ? { cable: true, cid: cable, col: col === 'fluix' ? undefined : col } : {};
            const [lo, hi] = kind === 'place' ? one() : box(xyz(op.from, 'from'), xyz(op.to, 'to'));
            // mezcla para texturas variadas y borde (cenefa de una alfombra, marco de un suelo)
            const mix = block && Array.isArray(op.mix) && op.mix.length ? op.mix.map(e => { const [, id, w] = String(e).match(/^(.+?)(?::(\d+(?:\.\d+)?))?$/) || []; return { c: cellOf(id, o), w: +w || 1 }; }) : null;
            const edge = block && op.edge && kind === 'fill' ? cellOf(String(op.edge), o) : null, flat = hi[1] === lo[1];
            const onEdge = (x, y, z) => x === lo[0] || x === hi[0] || z === lo[2] || z === hi[2] || (!flat && (y === lo[1] || y === hi[1]));
            const pickMix = mix && mix.map(e => ({ id: e.c, w: e.w }));
            for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
              const cell = edge && onEdge(x, y, z) ? edge : mix ? mixPick(pickMix, x, y, z) : c;
              at.set(`${x},${y},${z}`, { x, y, z, ...cell, ...extra }); n++;
            }
            if (!cable) m.TERMS = m.TERMS.filter(t => !within(lo, hi)(t)); // un bloque macizo se come las piezas que había en esa celda
          } else if (kind === 'remove') {
            const [lo, hi] = op.from ? box(xyz(op.from, 'from'), xyz(op.to ?? op.from, 'to')) : one(), inside = within(lo, hi);
            for (const [k, b] of [...at.entries()]) if (inside(b)) { at.delete(k); n++; }
            m.TERMS = m.TERMS.filter(t => !inside(t));
            if (m.DISPLAYS) m.DISPLAYS = m.DISPLAYS.filter(d => !inside(d));
          } else if (kind === 'part') {
            const raw = String(op.part ?? op.block ?? ''), id = PART_OF[raw] || raw, f = SIDE[String(op.side ?? op.facing ?? '').toLowerCase()];
            if (!PART_ID.test(id)) throw new Error(`part: ${raw} no es una pieza de AE2 ni de sus addons`);
            if (!f) throw new Error('part: side tiene que ser north, south, east, west, up o down: la cara de la celda que toca lo que alimenta');
            const [[x, y, z]] = one();
            if (!isCableCell(m, at.get(`${x},${y},${z}`))) throw new Error(`part: en ${x},${y},${z} no hay cable de AE2; ponlo antes con {op:"place",x:${x},y:${y},z:${z},cable:"ae2:fluix_glass_cable"} (con block para taparlo)`);
            m.TERMS = m.TERMS.filter(t => !(t.x === x && t.y === y && t.z === z && t.f === f));
            m.TERMS.push({ x, y, z, t: partKey(id), f });
            if (raw !== id) notes.add(`${raw} es la forma de bloque; como pieza de cable se usa ${id}`);
            n++;
          } else if (kind === 'room') {
            // sala completa en una op: suelo, paredes con pilares cada 4 (y en las esquinas), franja de ventanas, techo con luces y puerta
            const [lo, hi] = box(xyz(op.from, 'from'), xyz(op.to, 'to'));
            if (hi[0] - lo[0] < 2 || hi[1] - lo[1] < 2 || hi[2] - lo[2] < 2) throw new Error('room: mínimo 3×3×3');
            if (!op.wall) throw new Error('room: falta wall');
            m.KINDS = { ...(m.KINDS || {}), room: true };
            const K = id => (id ? keyFor(String(id)) : null);
            const wall = K(op.wall), floor = K(op.floor) || wall, frame = K(op.frame) || wall, roof = K(op.roof), glass = K(op.glass), light = K(op.light);
            const door = op.door ? FACING[String(op.door).toLowerCase()] : null;
            if (op.door && !door) throw new Error('room: door tiene que ser north, south, east o west');
            const put = (x, y, z, t) => { at.set(`${x},${y},${z}`, { x, y, z, t, f: 's' }); n++; };
            const cx = (lo[0] + hi[0]) >> 1, cz = (lo[2] + hi[2]) >> 1, top = roof ? hi[1] - 1 : hi[1];
            for (let x = lo[0]; x <= hi[0]; x++) for (let z = lo[2]; z <= hi[2]; z++) {
              put(x, lo[1], z, floor);
              const inner = x > lo[0] && x < hi[0] && z > lo[2] && z < hi[2];
              if (roof) put(x, hi[1], z, light && inner && (x - lo[0]) % 4 === 2 && (z - lo[2]) % 4 === 2 ? light : roof);
              if (inner) continue;
              for (let y = lo[1] + 1; y <= top; y++) {
                const ex = x === lo[0] || x === hi[0], ez = z === lo[2] || z === hi[2];
                const pillar = (ex && ez) || (ex ? (z - lo[2]) % 4 === 0 : (x - lo[0]) % 4 === 0);
                const doorway = door && y <= lo[1] + 2 && ((door === 'n' && z === lo[2] && x === cx) || (door === 's' && z === hi[2] && x === cx) || (door === 'w' && x === lo[0] && z === cz) || (door === 'e' && x === hi[0] && z === cz));
                if (doorway) { at.delete(`${x},${y},${z}`); continue; }
                put(x, y, z, pillar || y === top ? frame : glass && y > lo[1] + 1 ? glass : wall);
              }
            }
            m.TERMS = m.TERMS.filter(t => !(within(lo, hi)(t) && (t.x === lo[0] || t.x === hi[0] || t.z === lo[2] || t.z === hi[2] || t.y === lo[1])));
          } else if (kind === 'copy') {
            // repetir o reflejar un módulo ya hecho (máquina + cable + paneles + notas): menos ops y filas iguales de verdad
            const [lo, hi] = box(xyz(op.from, 'from'), xyz(op.to, 'to')), inside = within(lo, hi);
            const times = Math.min(Math.max(1, Math.floor(+op.times) || 1), 64), step = op.step ? op.step.map(Number) : null, dest = op.at ? xyz(op.at, 'at') : null;
            if (!step && !dest) throw new Error('copy: falta at (dónde va la esquina "from") o step (desplazamiento entre copias)');
            if (step && (step.length !== 3 || step.some(v => !Number.isInteger(v)))) throw new Error('copy: step tiene que ser [dx,dy,dz] enteros');
            const offset = k => (step || dest.map((v, i) => v - lo[i])).map(v => v * k);
            if ([1, times].some(k => lo.some((v, i) => v + offset(k)[i] < 0))) throw new Error('copy: la copia saldría a coordenadas negativas');
            const ax = op.mirror === 'x' ? 0 : op.mirror === 'z' ? 2 : -1, FLIP = { 0: { e: 'w', w: 'e' }, 2: { n: 's', s: 'n' } };
            const fl = f => (ax >= 0 && FLIP[ax][f]) || f;
            const srcB = [...at.values()].filter(inside), srcT = m.TERMS.filter(inside), srcD = (m.DISPLAYS || []).filter(inside);
            if (srcB.length * times > 100_000) throw new Error('copy: demasiados bloques');
            for (let k = 1; k <= times; k++) {
              const off = offset(k), mv = p => { const q = [p.x, p.y, p.z]; if (ax >= 0) q[ax] = lo[ax] + hi[ax] - q[ax]; return q.map((v, i) => v + off[i]); };
              for (const b of srcB) { const [x, y, z] = mv(b); at.set(`${x},${y},${z}`, { ...b, x, y, z, f: fl(b.f) }); n++; }
              for (const t of srcT) {
                const [x, y, z] = mv(t), f = fl(t.f);
                m.TERMS = m.TERMS.filter(o => !(o.x === x && o.y === y && o.z === z && o.f === f));
                m.TERMS.push({ ...t, x, y, z, f });
              }
              for (const d of srcD) { const [x, y, z] = mv(d); m.DISPLAYS = m.DISPLAYS.filter(o => !(o.x === x && o.y === y && o.z === z)); m.DISPLAYS.push({ ...d, x, y, z, f: fl(d.f) }); }
            }
          } else if (kind === 'grid') {
            const o = xyz(op.at ?? [op.x, op.y, op.z], 'grid at'), L = {};
            for (const [ch, v] of Object.entries(op.legend || {})) L[ch] = typeof v === 'string' ? { block: v } : v || {};
            const layers = (Array.isArray(op.layers) ? op.layers : []).map(l => (typeof l === 'string' ? l.split('|') : Array.isArray(l) ? l.map(String) : []));
            if (!layers.length) throw new Error('grid: falta layers (lista de capas; cada capa, lista de filas de norte a sur)');
            const bad = [...new Set(layers.flat().join('').split(''))].filter(ch => !'. _'.includes(ch) && !L[ch]?.block);
            if (bad.length) throw new Error(`grid: los caracteres ${bad.map(c => `"${c}"`).join(' ')} no están en legend (o les falta block)`);
            layers.forEach((rows, dy) => rows.forEach((row, dz) => [...row].forEach((ch, dx) => {
              if (ch === '.' || ch === ' ') return;
              const x = o[0] + dx, y = o[1] + dy, z = o[2] + dz;
              if (ch === '_') del(x, y, z); else put(x, y, z, L[ch].block, { f: L[ch].facing, half: L[ch].half, state: L[ch].state });
            })));
          } else if (kind === 'prefab') {
            const p = xyz(op.at ?? [op.x, op.y, op.z], 'prefab'), f = FACING[String(op.facing || 's').toLowerCase()] || 's', before = overwrote;
            placePrefab(String(op.prefab), p, f, op, resolveStyle(op.style || {}, hasId), op.item ? [op.item] : []);
            if (overwrote > before) notes.add(`prefab ${op.prefab} en ${p}: pisó ${overwrote - before} bloques que ya había`);
          } else if (kind === 'arrange') {
            const name = String(op.prefab), pf = PREFABS[name];
            if (!pf) throw new Error(`arrange: prefab "${name}" no existe: ${Object.keys(PREFABS).join(', ')}`);
            const r0 = (Math.max(pf.size[0], pf.size[2]) - 1) >> 1, y = op.y ?? op.from?.[1] ?? op.center?.[1];
            if (!Number.isInteger(+y)) throw new Error('arrange: falta y (la altura donde se apoyan: la capa de aire justo encima del suelo)');
            const area = Array.isArray(op.area) ? op.area.map(Number) : null, doors = [];
            if (area && op.layout === 'walls') {
              const [x0, z0, x1, z1] = [Math.min(area[0], area[2]) - 1, Math.min(area[1], area[3]) - 1, Math.max(area[0], area[2]) + 1, Math.max(area[1], area[3]) + 1];
              for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if ((x === x0 || x === x1 || z === z0 || z === z1) && !at.has(`${x},${+y},${z}`) && !at.has(`${x},${+y + 1},${z}`)) doors.push([x, z]);
            }
            const pos = layoutPositions({ layout: op.layout, area, y: +y, from: op.from && xyz(op.from, 'from'), to: op.to && xyz(op.to, 'to'), center: op.center && xyz(op.center, 'center'), radius: +op.radius, count: op.count && +op.count,
              spacing: Math.max(1, +op.spacing || 3), margin: Math.max(0, op.margin ?? 1), sides: Array.isArray(op.sides) ? op.sides.map(v => FACING[String(v).toLowerCase()]).filter(Boolean) : null, facing: op.facing ? FACING[String(op.facing).toLowerCase()] : undefined, r: r0, doors });
            if (!pos.length) throw new Error('arrange: no cabe ninguna; baja spacing o margin, o agranda area');
            if (pos.length > 200) throw new Error('arrange: más de 200 piezas; sube spacing');
            const queue = [...(Array.isArray(op.items) ? op.items : op.item ? [op.item] : [])], roles = resolveStyle(op.style || {}, hasId), before = overwrote;
            for (const [x, yy, z, f] of pos) placePrefab(name, [x, yy, z], f, op, roles, queue);
            notes.add(`arrange: ${pos.length} × ${name} (centro y frente): ${pos.slice(0, 16).map(([x, yy, z, f]) => `${x},${yy},${z} ${SIDE_NAME[f]}`).join(' · ')}${doors.length ? ` · puertas libres en ${doors.slice(0, 4).map(d => d.join(',')).join(' ')}` : ''}`);
            if (queue.length) notes.add(`arrange: sobraron ${queue.length} objetos sin expositor: ${queue.slice(0, 6).join(', ')}`);
            if (overwrote > before) notes.add(`arrange: pisó ${overwrote - before} bloques que ya había; mira view_design`);
          } else if (kind === 'roof' || kind === 'building' || kind === 'feature') {
            const note = archOp(sink, op, hasId);
            if (note) notes.add(note);
            m.OUTDOOR = true;
            m.KINDS = { ...(m.KINDS || {}), [kind === 'feature' ? (['island', 'boulder', 'pond'].includes(op.type) ? 'terrain' : 'exterior') : 'building']: true };
          } else if (kind === 'route') {
            const cells = routeCells(xyz(op.from, 'route from'), xyz(op.to, 'route to'), /^[xyz]{3}$/.test(op.order || '') ? op.order : 'xzy');
            if (cells.length > 2000) throw new Error('route: más de 2000 celdas');
            const cable = op.cable ? String(op.cable) : null, block = op.block ? String(op.block) : null;
            if (!cable && !block) throw new Error('route: falta cable (AE2) o block (otro cable)');
            if (cable && !AE2_CABLE.test(cable)) throw new Error(`route: cable solo de AE2 (ae2:fluix_covered_cable, ae2:fluix_covered_dense_cable…), no ${cable}; para otros cables usa block`);
            const col = cable?.slice(4).replace(/_(glass|covered|smart).*$/, '');
            for (const [x, y, z] of cells) {
              const c = block ? cellOf(block, {}) : { t: cableKey(), f: 's' };
              at.set(`${x},${y},${z}`, { x, y, z, ...c, ...(cable ? { cable: true, cid: cable, col: col === 'fluix' ? undefined : col } : {}) }); n++;
            }
            notes.add(`route: ${cells.length} celdas de ${cable || block}${cable && block ? ` tapado con ${block}` : ''}`);
          } else if (kind === 'display') {
            const [[x, y, z]] = one();
            addDisplay(x, y, z, op.kind === 'stand' && Array.isArray(op.items) ? op.items : op.item, op.kind, op.side, op.facing);
          } else if (kind === 'note') {
            const [[x, y, z]] = one(), b = at.get(`${x},${y},${z}`);
            if (!b) throw new Error(`note: no hay ningún bloque en ${x},${y},${z}`);
            b.gui = { title: m.P[b.t]?.n || b.t, settings: [esc(String(op.text).slice(0, 400))] }; n++;
          } else if (kind === 'zone') {
            // la cámara puede estar fuera del lienzo (delante o encima), así que sin xyz
            const pt = v => (Array.isArray(v) && v.length === 3 && v.every(Number.isFinite) ? v.map(Math.round) : null);
            const t = pt(op.to); if (!t) throw new Error('zone: to = [x,y,z] a donde mira');
            const r = Math.min(200, Math.max(6, Number(op.r) || 16)), p = pt(op.from) || [t[0] + r, t[1] + Math.round(r * 0.7), t[2] + r];
            const z = { n: String(op.name || 'Vista').slice(0, 60), p, t, ...(Number.isFinite(op.cut) ? { cut: Math.round(op.cut) } : {}) };
            m.ZONES = [...(m.ZONES || []).filter(o => o.n !== z.n), z]; n++;
          } else if (kind === 'freq') {
            const [[x, y, z]] = one(), b = at.get(`${x},${y},${z}`), it = Array.isArray(op.items) ? op.items.map(String) : [];
            if (!b || !/redstone_link/.test(m.P[b.t]?.id || '')) throw new Error(`freq: en ${x},${y},${z} no hay un Redstone Link`);
            if (it.length !== 2 || !it.every(i => /^[a-z0-9_.-]+:[a-z0-9_/.-]+$/.test(i))) throw new Error('freq: items tiene que ser [objeto1, objeto2] con ids ns:nombre');
            b.freq = it; b.gui = { title: `${m.P[b.t].props?.receiver === 'true' ? 'Receptor' : 'Emisor'} · ${it.map(i => i.split(':')[1]).join(' + ')}`, settings: [esc(String(op.text || '').slice(0, 300))] }; n++;
          } else if (kind === 'explain') {
            const title = String(op.name || '').trim().slice(0, 80), text = String(op.text || '').trim().slice(0, 2000);
            if (!text) throw new Error('explain: falta text');
            m.NOTES = [...(m.NOTES || []).filter(o => o.t !== title), { t: title, d: text }].slice(-14); n++;
          } else throw new Error(`op desconocida "${kind}": place, fill, remove, part, note, room, copy, grid, prefab, arrange, display o roof`);
        } catch (e) { failed.push({ i, op: kind, error: e.message }); }
      });
      m.BLOCKS = [...at.values()];
      // un panel que empuja (proveedor, interfaz, bus) mirando al aire o a otro cable no hace nada: si una sola cara libre
      // de su celda toca una máquina, se gira hacia ella; si hay varias o ninguna, lo dice validateModel con los lados posibles
      const owner = occupancy(m);
      for (const t of m.TERMS) {
        if (!ACTS_ON.test(m.P[t.t]?.id)) continue;
        const near = touching(m, owner, t);
        if (near.some(([f]) => f === t.f)) continue;
        const pick = near.filter(([f, b]) => isMachine(m.P[b.t]) && !m.TERMS.some(o => o !== t && o.x === t.x && o.y === t.y && o.z === t.z && o.f === f));
        if (pick.length !== 1) continue;
        notes.add(`${m.P[t.t].id} en ${t.x},${t.y},${t.z}: por ${SIDE_NAME[t.f]} no tocaba ninguna máquina; girado a ${SIDE_NAME[pick[0][0]]}, donde está ${m.P[pick[0][1].t].id}`);
        t.f = pick[0][0];
      }
      if (m.BLOCKS.length) { let mx = 0, my = 0, mz = 0; for (const b of m.BLOCKS) { if (b.x > mx) mx = b.x; if (b.y > my) my = b.y; if (b.z > mz) mz = b.z; } m.W = m.WX = mx + 1; m.WZ = mz + 1; m.H = my + 1; }
      // edificios y jardines: el visor no debe tratar los bordes como paredes de una sala (ocultaba la cumbrera y las fachadas)
      if (m.OUTDOOR) m.WALLS = { x0: -1, x1: m.WX, z0: -1, z1: m.WZ, top: 9999 };
      if (clipped) notes.add(`${clipped} bloques quedaban por debajo de 0 (aleros, escalones…) y no se pusieron: deja 3-4 de margen alrededor de la obra`);
      if (!m.FLATROOFS?.length) delete m.FLATROOFS;
      // máquinas que el mod solo alimenta por una cara: qué hay debajo (objetos y energía del disparador, salida del receptor)
      const io = new Map();
      for (const b of m.BLOCKS) {
        const spec = berOf(m.P[b.t]?.id)?.io; if (!spec) continue;
        const d = at.get(`${b.x},${b.y - 1},${b.z}`), did = d ? m.P[d.t]?.id || '' : '';
        const why = !d ? 'debajo no hay nada' : d.cable && spec.items ? (m.TERMS.some(t => t.x === d.x && t.y === d.y && t.z === d.z && t.f === 'u') ? 'el bus de AE2 de abajo mete objetos pero no energía' : 'debajo hay cable de AE2 sin nada que entre') : spec.ok.test(did) ? null : `debajo hay ${did}`;
        if (!why) continue;
        const k = `${m.P[b.t].n || m.P[b.t].id}: ${spec.need}; ${why}: ${spec.fix}`; io.set(k, [...(io.get(k) || []), `${b.x},${b.y},${b.z}`]);
      }
      for (const [k, at2] of io) notes.add(`${k} (${at2.slice(0, 6).join(' · ')})`);
      // sin vistas propias, una general que encuadre la obra (la del visor por defecto es para 16 × 16); la de un diseño nuevo no cuenta
      const own = (m.ZONES || []).filter(z => !z.auto && !(z.n === 'Vista general' && String(z.p) === '12,12,24' && String(z.t) === '8,0,8'));
      if (!own.length && m.BLOCKS.length) { const c = [m.WX / 2, m.H / 3, m.WZ / 2].map(Math.round), s = Math.max(m.WX, m.WZ, m.H); m.ZONES = [{ n: 'Vista general', auto: true, p: [Math.round(c[0] + s * 0.75), Math.round(c[1] + s * 0.65), Math.round(c[2] + s * 0.85)], t: c }]; }
      // explicaciones en texto plano → INFO (el visor lo pinta como HTML: todo escapado)
      if (m.NOTES?.length) m.INFO = m.NOTES.map(o => `<p>${o.t ? `<b>${esc(o.t)}.</b> ` : ''}${esc(o.d).replace(/\n/g, '<br>')}</p>`).join('');
      ctx.design = encode(m);
      ctx.saveDesign(ctx.design);
      const v = validateModel(m);
      return brief({ changed: n, blocks: m.BLOCKS.length, size: [m.WX, m.H, m.WZ], failed: failed.length ? failed.slice(0, 20) : undefined, notes: notes.size ? [...notes].slice(0, 12) : undefined,
        errors: v.errors.slice(0, 10), errorCount: v.errorCount > 10 ? v.errorCount : undefined, warnings: v.warnings.slice(0, 5) });
    }
    case 'plan_site': return brief(planSite(Array.isArray(args.volumes) ? args.volumes : []));
    case 'search_quests': {
      if (!ctx.workspaceId) return 'Este diseño no tiene modpack.';
      return brief(searchQuests(wsDir(ctx.workspaceId), { query: args.query, chapter: args.chapter, lang: args.lang || (ctx.lang === 'en' ? 'en_us' : 'es_es') }));
    }
    case 'run_code': {
      const m0 = decode(ctx.design), r = ctx.workspaceId ? reader(ctx.workspaceId) : null, hasId = id => !!r && idsOf(r).has(id);
      const seed = args.clear ? [] : m0.BLOCKS.map(b => ({ x: b.x, y: b.y, z: b.z, id: m0.P[b.t]?.id, keep: true }));
      const W = memoryWorld(seed), shows = [], printed = [], routes = [], kinds = {}, MAX = 300_000;
      W.flatRoofs = [];
      const I = v => { const n = Math.round(+v); if (!Number.isFinite(n)) throw new Error(`coordenada no válida: ${v}`); return n; };
      const guard = () => { if (W.cells.size > MAX) throw new Error(`más de ${MAX} bloques`); };
      const api = {
        set: (x, y, z, id, state) => { W.set(I(x), I(y), I(z), id == null ? null : String(id), state && typeof state === 'object' ? state : undefined); guard(); },
        del: (x, y, z) => W.del(I(x), I(y), I(z)),
        get: (x, y, z) => W.get(I(x), I(y), I(z)),
        box: (x0, y0, z0, x1, y1, z1, id, state) => { if (Math.abs(x1 - x0 + 1) * Math.abs(y1 - y0 + 1) * Math.abs(z1 - z0 + 1) > 200_000) throw new Error('box de más de 200 000 celdas'); W.box(I(x0), I(y0), I(z0), I(x1), I(y1), I(z1), id == null ? null : String(id), state); guard(); },
        stair: (x, y, z, id, low, o) => W.stair(I(x), I(y), I(z), String(id), FACING[String(low).toLowerCase()] || 'n', o || {}),
        slab: (x, y, z, id, top) => W.slab(I(x), I(y), I(z), String(id), !!top),
        log: (x, y, z, id, axis) => W.log(I(x), I(y), I(z), String(id), ['x', 'y', 'z'].includes(axis) ? axis : 'y'),
        show: (x, y, z, item) => { shows.push({ op: 'display', x: I(x), y: I(y), z: I(z), item: String(item) }); },
        building: o => { kinds.building = true; return archOp(W, { ...(o || {}), op: 'building' }, hasId); },
        feature: o => { kinds[['island', 'boulder', 'pond'].includes(o?.type) ? 'terrain' : 'exterior'] = true; return archOp(W, { ...(o || {}), op: 'feature' }, hasId); },
        route: (from, to, o = {}) => { routes.push({ op: 'route', from, to, ...(o || {}) }); },
        part: (x, y, z, side, part) => { routes.push({ op: 'part', x: I(x), y: I(y), z: I(z), side: String(side), part: String(part) }); },
        zone: (name, to, o = {}) => { routes.push({ op: 'zone', name: String(name), to, ...(o && typeof o === 'object' ? { from: o.from, cut: o.cut, r: o.r } : {}) }); },
        explain: (title, text) => { routes.push({ op: 'explain', name: String(title), text: String(text) }); },
        freq: (x, y, z, a, b2, text) => { routes.push({ op: 'freq', x: I(x), y: I(y), z: I(z), items: [String(a), String(b2)], text: String(text || '') }); },
        roof: o => archOp(W, { ...(o || {}), op: 'roof' }, hasId),
        print: (...a) => { if (printed.length < 200) printed.push(a.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ').slice(0, 300)); },
      };
      const res = await runCode(String(args.code || ''), api, { timeoutMs: 10_000 });
      if (res.error && !W.cells.size) return brief({ error: res.error, printed });
      const ops = [];
      if (args.clear && m0.BLOCKS.length) { ctx.design = encode({ ...m0, BLOCKS: [], TERMS: [], DISPLAYS: [] }); }
      const now = new Set();
      let outside = 0;
      for (const c of W.cells.values()) {
        const k = `${c.x},${c.y},${c.z}`; now.add(k);
        if (c.keep) continue;
        if (c.x < 0 || c.y < 0 || c.z < 0 || c.x > 512 || c.y > 512 || c.z > 512) { outside++; continue; }
        ops.push({ op: 'place', x: c.x, y: c.y, z: c.z, block: c.id, ...(c.state ? { state: c.state } : {}) });
      }
      if (!args.clear) for (const b of m0.BLOCKS) if (!now.has(`${b.x},${b.y},${b.z}`)) ops.push({ op: 'remove', x: b.x, y: b.y, z: b.z });
      const out = ops.length || shows.length || routes.length ? JSON.parse(await runTool('edit_design', { ops: [...ops, ...routes, ...shows], _internal: true, _kinds: kinds, _flat: W.flatRoofs }, ctx)) : {};
      const byErr = {};
      for (const f of out.failed || []) byErr[f.error] = (byErr[f.error] || 0) + 1;
      return brief({ error: res.error, placed: ops.filter(o => o.op === 'place').length, removed: ops.filter(o => o.op === 'remove').length, displays: shows.length, blocks: out.blocks, size: out.size,
        failed: Object.keys(byErr).length ? Object.entries(byErr).slice(0, 12).map(([e, n]) => `${n} × ${e}`) : undefined,
        notes: [...(outside ? [`${outside} bloques quedaban fuera del lienzo (coordenadas por debajo de 0, p. ej. el fondo de un estanque o un alero) y no se pusieron: sube o aparta la obra`] : []), ...(out.notes || [])],
        printed: printed.length ? printed.slice(-40) : undefined });
    }
    case 'render_design': {
      const m = decode(ctx.design);
      if (!m.BLOCKS.length) return 'El diseño está vacío.';
      const r = ctx.workspaceId ? reader(ctx.workspaceId) : null, box = Array.isArray(args.box) && args.box.length === 6 ? args.box.map(Number) : null;
      const img = renderDesign(m, r, { view: args.view || 'se', box });
      return { text: `Imagen ${img.width}×${img.height} (${args.view || 'se'}${box ? `, caja ${box}` : ''}): ${img.summary}`, image: { mime: 'image/png', data: img.png.toString('base64') } };
    }
    case 'validate_design': return brief(validateModel(decode(ctx.design)));
    case 'view_design': return viewDesign(decode(ctx.design), { mode: args.mode, y: args.y, box: Array.isArray(args.box) ? args.box.map(Number) : undefined });
    case 'review_design': return brief(reviewDesign(decode(ctx.design)));
    case 'set_process': {
      const g = args.graph;
      if (!g || !Array.isArray(g.nodes) || !Array.isArray(g.edges)) throw new Error('El grafo necesita nodes y edges');
      const ids = new Set(g.nodes.map(n => n.id));
      for (const e of g.edges) if (!ids.has(e.from) || !ids.has(e.to) || !(e.perUnit >= 0 || e.rate >= 0)) throw new Error(`Arista no válida (falta perUnit o rate): ${JSON.stringify(e).slice(0, 200)}`);
      if (JSON.stringify(g).length > 200_000) throw new Error('Grafo demasiado grande');
      const sol = solve(g);                                                     // el mismo cálculo que el simulador
      const m = decode(ctx.design); m.PROCESS = g; ctx.design = encode(m); ctx.saveDesign(ctx.design);
      const out = sol.edges.find(e => e.output) || sol.edges.at(-1), bott = sol.nodes.find(n => n.id === sol.bottleneck);
      return `Grafo guardado: ${g.nodes.length} nodos, ${g.edges.length} aristas.` + (sol.through != null
        ? ` Salida: ${+(out.rate * (out.fluid ? 1 : 60)).toFixed(2)} ${out.fluid ? 'mB/s' : '/min'}. Limita: ${bott?.id ?? 'ninguno'}. Capacidad por paso (unidades/s): ${sol.nodes.filter(n => n.rate).map(n => `${n.id}=${+n.cap.toFixed(3)}`).join(', ')}.`
        : ' Sin perUnit en los nodos: se usan los caudales escritos.');
    }
    case 'web_search': {
      const q = String(args.query).slice(0, 200);
      if (SEARCH.brave) {
        const j = await (await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8`, { headers: { 'x-subscription-token': SEARCH.brave, accept: 'application/json' } })).json();
        return brief((j.web?.results || []).map(x => ({ title: x.title, url: x.url, snippet: x.description })));
      }
      if (SEARCH.tavily) {
        const j = await (await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ api_key: SEARCH.tavily, query: q, max_results: 8 }) })).json();
        return brief((j.results || []).map(x => ({ title: x.title, url: x.url, snippet: x.content?.slice(0, 300) })));
      }
      return 'La búsqueda web no está configurada en este servidor. Pide al jugador enlaces concretos y usa fetch_url.';
    }
    case 'fetch_url': {
      const r = await safeFetch(String(args.url), { headers: { 'user-agent': 'BuildGolem research agent' } });
      const html = (await r.text()).slice(0, 400_000);
      return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 10_000);
    }
    case 'write_skill': writeSkill(ctx.workspaceId, String(args.mod), String(args.markdown)); return 'Skill guardada.';
    default: throw new Error(`Herramienta desconocida: ${name}`);
  }
}
