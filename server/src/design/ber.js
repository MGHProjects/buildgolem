// Bloques que en el juego dibuja un renderizador propio del mod (BlockEntityRenderer) con varias piezas, y cuyo modelo de
// bloque está vacío (solo partícula): sin esto el visor y render_design los pintan como un cubito y los agentes creen que
// ocupan 1×1. Cada pieza es un modelo del jar, desplazado como lo hace el renderizador ("modelo@dx,dy,dz", en bloques).
// size/offset: la huella real del multibloque (el controlador va en el centro de abajo).
// Sacado del jar (javap de EMRailEjectorRender, RayReceiverRender y sus MultiblockStructure).
export const BER = {
  'dysoncubeproject:em_railejector_controller': {
    parts: ['dysoncubeproject:block/em_railejector_base', 'dysoncubeproject:block/em_railejector_gun@0,2.5,0'],
    size: [3, 3, 3], offset: [-1, 0, -1],
    note: 'Multibloque de 3×3×3: el controlador va en el centro de abajo y el mod llena el resto con bloques de estructura al colocarlo. Deja libre el 3×3 alrededor y 2 por encima; el cañón gira y dispara hacia el cielo. Objetos (paquetes de vela o de rayo) y energía (40 FE/t, guarda 400 000) entran SOLO por la cara de abajo del controlador: debajo, una tubería universal de Pipez o un Laser Node con carta de objetos y de energía. Un bus de exportación de AE2 solo mete objetos, sin energía.',
    io: { items: true, need: 'objetos y energía entran solo por la cara de abajo', ok: /universal_pipe|laser_node/, fix: 'pon debajo una tubería universal de Pipez (lleva objetos y FE) o un Laser Node, y llévale los paquetes (p. ej. de una interfaz de AE2) y la energía' },
  },
  'dysoncubeproject:ray_receiver_controller': {
    parts: ['dysoncubeproject:block/ray_receiver_base', 'dysoncubeproject:block/ray_receiver_plate@0,2,0', 'dysoncubeproject:block/ray_receiver_lens_stands@0,4,0', 'dysoncubeproject:block/ray_receiver_lens@0,4,0'],
    size: [3, 6, 3], offset: [-1, 0, -1],
    note: 'Multibloque de 3×6×3: el controlador en el centro de abajo; la plataforma y la lente suben 6. Necesita cielo abierto encima. La energía sale SOLO por la cara de abajo del controlador: la empuja sola al bloque de debajo (una batería como powah:ender_cell_*, o un cable de energía).',
    io: { need: 'la energía sale solo por abajo (la empuja al bloque de debajo)', ok: /cell|battery|capacitor|accumulator|energy|flux|cable|conduit|pipe|node/, fix: 'pon justo debajo una batería (p. ej. powah:ender_cell_*) o un cable de energía' },
  },
  'dysoncubeproject:multiblock_structure': {
    parts: [], size: [1, 1, 1], offset: [0, 0, 0],
    note: 'Lo pone el propio mod al colocar un controlador (no tiene receta): no lo coloques tú.',
  },
};
export const berOf = id => BER[id] || null;
