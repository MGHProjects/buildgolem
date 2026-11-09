// Sala Mekanism — la sala bajo la base antigua (41 × 41 × 15), convertida en planta nuclear y de procesado de Mekanism. Visor: index.html?d=mekanism
// Mundo: suelo en y=31, hueco x 3973..4013 · z −13197..−13157, techo de roca en y=47, ascensor (elevatorid) en el centro (3993, 31, −13177).
// Aquí: x = mundo − 3972, y = mundo − 31, z = mundo + 13198 → interior 1..41, centro (21, 21), paredes en 0 y 42.
// Sin controlador: la sala cuelga de tu red AE2. Cada zona lleva su propio cable denso (≤ 32 canales) que llega por el suelo: ENTRADAS ME.
// Todos los cables van tapados: AE2 con fachadas, Universal Cable con Mekanism Covers.
// Comprobado en los jars (Mekanism 10.7.19 + Generators, mekmm 1.4.1, Applied Mekanistics 1.6.3, ExtendedAE 2.2.35) y en config/Mekanism:
//  · ×5: 3 crudos → 2000 mB slurry → 10 cristales → 10 fragmentos → 10 grumos → 10 polvos sucios → 10 polvos → 10 lingotes.
//  · Combustible: lingote de uranio → 2 yellow cake (enriquecedora) → 250 mB UO₂ c/u (oxidador); fluorita + H₂SO₄ → 1000 mB HF (disolución);
//    HF + UO₂ → 2 UF₆ (infusor); UF₆ → combustible fisible 1:1 (centrífuga isotópica). Reprocesado: pellet de plutonio + HCl → 4 fragmentos → 2000 mB.
//  · Residuo nuclear: 10 → 1 plutonio (centrífuga) · 10 → 1 polonio (Solar Neutron Activator: necesita ver el sol, canSeeSun → fuera de la sala).
//  · Pellets (PRC): 1000 mB Pu/Po + 1000 mB agua + 1 polvo de fluorita → pellet + 1000 mB de residuo gastado.
//  · SPS (config sps): 1000 mB de polonio → 1 mB de antimateria, 100 000 de energía por mB de entrada. Forma: 7×7×7 con la rejilla
//    ALLOWED_GRID de SPSValidator (cada cara es un octógono: esquinas vacías). Cristalizador: 1000 mB de antimateria → 1 pellet.
//  · Antiprotonic Nucleosynthesizer: objeto + antimateria (p. ej. carbón + 4 mB → diamante).

export const TITLE = 'Sala Mekanism · ATM10 Aeronautics';
export const SUB = 'Planta nuclear y de procesado · reactor de fisión, 2 turbinas, SPS · 4 líneas ×5 · simétrica · 41 × 41 × 15';
export const SKY = '#14171d';

// ── objetos, gases y fluidos ──
const IT = (n, icon, o = {}) => ({ n, icon, ...o });
const GAS = (n, tint) => IT(n, 'minecraft:water_still', { tint, fluid: true });
const MK = (id, n) => [`mekanism:${id}`, IT(n, `mekanism:item/${id}`)];
const MC = (id, n, tex = `minecraft:item/${id}`) => [`minecraft:${id}`, IT(n, tex)];
export const ITEMS = {
  ...Object.fromEntries([
    MK('enriched_iron', 'Hierro enriquecido'), MK('dust_steel', 'Polvo de acero'), MK('ingot_steel', 'Lingote de acero'),
    MK('alloy_infused', 'Aleación infundida'), MK('alloy_reinforced', 'Aleación reforzada'), MK('alloy_atomic', 'Aleación atómica'),
    MK('basic_control_circuit', 'Circuito básico'), MK('advanced_control_circuit', 'Circuito avanzado'), MK('elite_control_circuit', 'Circuito de élite'), MK('ultimate_control_circuit', 'Circuito definitivo'),
    MK('enriched_carbon', 'Carbono enriquecido'), MK('enriched_redstone', 'Redstone enriquecida'), MK('enriched_diamond', 'Diamante enriquecido'), MK('enriched_refined_obsidian', 'Obsidiana refinada enriquecida'),
    MK('dust_obsidian', 'Polvo de obsidiana'), MK('dust_refined_obsidian', 'Polvo de obsidiana refinada'), MK('ingot_osmium', 'Lingote de osmio'), MK('dust_sulfur', 'Polvo de azufre'),
    MK('ingot_uranium', 'Lingote de uranio'), MK('yellow_cake_uranium', 'Yellow cake'), MK('fluorite_gem', 'Fluorita'), MK('dust_fluorite', 'Polvo de fluorita'), MK('ingot_tin', 'Lingote de estaño'),
    MK('pellet_plutonium', 'Pellet de plutonio'), MK('pellet_polonium', 'Pellet de polonio'), MK('pellet_antimatter', 'Pellet de antimateria'), MK('reprocessed_fissile_fragment', 'Fragmento fisible reprocesado'),
    MK('upgrade_speed', 'Mejora de velocidad'), MK('upgrade_energy', 'Mejora de energía'),
    MC('raw_iron', 'Cualquier crudo (c:raw_materials)'), MC('iron_ingot', 'Lingote de hierro'), MC('copper_ingot', 'Lingote de cobre'), MC('coal', 'Carbón'), MC('redstone', 'Polvo de redstone'),
    MC('diamond', 'Diamante'), MC('emerald', 'Esmeralda'), MC('amethyst_shard', 'Fragmento de amatista'), MC('echo_shard', 'Fragmento de eco'), MC('golden_apple', 'Manzana dorada'),
    MC('enchanted_golden_apple', 'Manzana dorada encantada', 'minecraft:item/golden_apple'), MC('obsidian', 'Obsidiana', 'minecraft:obsidian'), MC('crying_obsidian', 'Obsidiana llorosa', 'minecraft:crying_obsidian'), MC('glass', 'Cristal', 'minecraft:glass'),
  ]),
  'mekanism:steel_casing': IT('Steel Casing', 'mekanism:steel_casing'),
  'minecraft:water': GAS('Agua', '#3f76e4'), 'mekanism:brine': GAS('Salmuera', '#e8e2c4'), 'mekanism:hydrogen': GAS('Hidrógeno', '#f2f2f2'), 'mekanism:oxygen': GAS('Oxígeno', '#6ce2ff'),
  'mekanism:chlorine': GAS('Cloro', '#cfe800'), 'mekanism:hydrogen_chloride': GAS('Cloruro de hidrógeno', '#a8f1e9'), 'mekanism:sulfur_dioxide': GAS('Dióxido de azufre', '#a99d90'),
  'mekanism:sulfur_trioxide': GAS('Trióxido de azufre', '#ce6c6c'), 'mekanism:water_vapor': GAS('Vapor de agua', '#c8c8c8'), 'mekanism:sulfuric_acid': GAS('Ácido sulfúrico', '#82802a'),
  'mekanism:uranium_oxide': GAS('Óxido de uranio', '#e1f573'), 'mekanism:hydrofluoric_acid': GAS('Ácido fluorhídrico', '#c6c29e'), 'mekanism:uranium_hexafluoride': GAS('Hexafluoruro de uranio', '#809960'),
  'mekanism:fissile_fuel': GAS('Combustible fisible', '#2e332b'), 'mekanism:nuclear_waste': GAS('Residuo nuclear', '#4f412a'), 'mekanism:spent_nuclear_waste': GAS('Residuo nuclear gastado', '#262015'),
  'mekanism:plutonium': GAS('Plutonio', '#1f919c'), 'mekanism:polonium': GAS('Polonio', '#1b9e7b'), 'mekanism:antimatter': GAS('Antimateria', '#a464b3'),
  'ae2:crafting_card': IT('Crafting Card', ['ae2:item/basic_card', 'ae2:item/card_crafting']),
  'ae2:capacity_card': IT('Capacity Card', ['ae2:item/basic_card', 'ae2:item/card_capacity']),
  'ae2:speed_card': IT('Acceleration Card', ['ae2:item/advanced_card', 'ae2:item/card_speed']),
  'extendedae:infinity_water_cell': IT('ME Infinity Water Cell (ExtendedAE)', 'extendedae:item/infinity_cell_water'),
};
const S = (id, n = 1) => [id, n], m = id => 'mekanism:' + id, mc = id => 'minecraft:' + id;
const pr = (name, inp, out) => ({ name, kind: 'processing', in: inp, out });
export const PATTERNS = {
  // taller de aleaciones (oeste)
  odust: pr('Polvo de obsidiana', [S(mc('obsidian'))], [S(m('dust_obsidian'), 4)]),
  fdust: pr('Polvo de fluorita', [S(m('fluorite_gem'))], [S(m('dust_fluorite'))]),
  eiron: pr('Hierro enriquecido', [S(mc('iron_ingot'))], [S(m('enriched_iron'))]),
  sdust: pr('Polvo de acero', [S(m('enriched_iron'))], [S(m('dust_steel'))]),
  infused: pr('Aleación infundida', [S(mc('copper_ingot'))], [S(m('alloy_infused'))]),
  cbasic: pr('Circuito básico', [S(m('ingot_osmium'))], [S(m('basic_control_circuit'))]),
  cadv: pr('Circuito avanzado', [S(m('basic_control_circuit'))], [S(m('advanced_control_circuit'))]),
  ecarbon: pr('Carbono enriquecido', [S(mc('coal'))], [S(m('enriched_carbon'))]),
  eredstone: pr('Redstone enriquecida', [S(mc('redstone'))], [S(m('enriched_redstone'))]),
  ediamond: pr('Diamante enriquecido', [S(mc('diamond'))], [S(m('enriched_diamond'))]),
  erob: pr('Obsidiana refinada enriquecida', [S(m('dust_refined_obsidian'))], [S(m('enriched_refined_obsidian'))]),
  steel: pr('Lingote de acero', [S(m('dust_steel'))], [S(m('ingot_steel'))]),
  reinforced: pr('Aleación reforzada', [S(m('alloy_infused'))], [S(m('alloy_reinforced'))]),
  celite: pr('Circuito de élite', [S(m('advanced_control_circuit'))], [S(m('elite_control_circuit'))]),
  rodust: pr('Polvo de obsidiana refinada', [S(m('dust_obsidian'))], [S(m('dust_refined_obsidian'))]),
  atomic: pr('Aleación atómica', [S(m('alloy_reinforced'))], [S(m('alloy_atomic'))]),
  cult: pr('Circuito definitivo', [S(m('elite_control_circuit'))], [S(m('ultimate_control_circuit'))]),
  casing: { name: 'Steel Casing', kind: 'crafting', out: [S(m('steel_casing'))],
    grid: [S(m('ingot_steel')), S(mc('glass')), S(m('ingot_steel')), S(mc('glass')), S(m('ingot_osmium')), S(mc('glass')), S(m('ingot_steel')), S(mc('glass')), S(m('ingot_steel'))] },
  // antimateria (este)
  apellet: pr('Pellet de antimateria', [S(m('antimatter'), 1000)], [S(m('pellet_antimatter'))]),
  agas: pr('Antimateria (de pellet)', [S(m('pellet_antimatter'))], [S(m('antimatter'), 1000)]),
  ndiamond: pr('Diamante (nucleosíntesis)', [S(mc('coal')), S(m('antimatter'), 4)], [S(mc('diamond'))]),
  nemerald: pr('Esmeralda (nucleosíntesis)', [S(mc('diamond')), S(m('antimatter'), 4)], [S(mc('emerald'))]),
  niron: pr('Hierro (nucleosíntesis)', [S(m('ingot_tin')), S(m('antimatter'), 1)], [S(mc('iron_ingot'))]),
  ncrying: pr('Obsidiana llorosa (nucleosíntesis)', [S(mc('obsidian')), S(m('antimatter'), 1)], [S(mc('crying_obsidian'))]),
  necho: pr('Fragmento de eco (nucleosíntesis)', [S(mc('amethyst_shard')), S(m('antimatter'), 2)], [S(mc('echo_shard'))]),
  napple: pr('Manzana encantada (nucleosíntesis)', [S(mc('golden_apple')), S(m('antimatter'), 3)], [S(mc('enchanted_golden_apple'))]),
  // combustible (suroeste)
  ycake: pr('Yellow cake', [S(m('ingot_uranium'))], [S(m('yellow_cake_uranium'), 2)]),
  uo2: pr('Óxido de uranio', [S(m('yellow_cake_uranium'))], [S(m('uranium_oxide'), 250)]),
  hf: pr('Ácido fluorhídrico', [S(m('fluorite_gem'))], [S(m('hydrofluoric_acid'), 1000)]),
  fissileA: pr('Combustible fisible', [S(m('uranium_hexafluoride'), 1000)], [S(m('fissile_fuel'), 1000)]),
  fissileB: pr('Combustible fisible (2.ª centrífuga)', [S(m('uranium_hexafluoride'), 1000)], [S(m('fissile_fuel'), 1000)]),
  frag: pr('Fragmentos reprocesados', [S(m('pellet_plutonium'))], [S(m('reprocessed_fissile_fragment'), 4)]),
  refuel: pr('Combustible reprocesado', [S(m('reprocessed_fissile_fragment'))], [S(m('fissile_fuel'), 2000)]),
  // residuos y pellets (sureste)
  pupellet: pr('Pellet de plutonio', [S(m('plutonium'), 1000), S(mc('water'), 1000), S(m('dust_fluorite'))], [S(m('pellet_plutonium')), S(m('spent_nuclear_waste'), 1000)]),
  popellet: pr('Pellet de polonio', [S(m('polonium'), 1000), S(mc('water'), 1000), S(m('dust_fluorite'))], [S(m('pellet_polonium')), S(m('spent_nuclear_waste'), 1000)]),
  puA: pr('Plutonio', [S(m('nuclear_waste'), 1000)], [S(m('plutonium'), 100)]),
  puB: pr('Plutonio (2.ª centrífuga)', [S(m('nuclear_waste'), 1000)], [S(m('plutonium'), 100)]),
};

// ── paleta ──
const MOD = (n, id, model, o = {}) => ({ n, id, model, yaw: 180, ...o });
const FAC = (kind, n, ns = 'mekanism') => MOD(`${n} · Ultimate`, `${ns}:ultimate_${kind}_factory`, `${ns}:block/factory/${kind}/ultimate`);
const G = (n, id, model, o = {}) => ({ n, id: 'mekanismgenerators:' + id, model: 'mekanismgenerators:block/' + model, ...o });
export const P = {
  // sala
  skysm:  { n: 'Ladrillos peq. de piedra del cielo (suelo actual)', id: 'ae2:sky_stone_small_brick', all: 'ae2:sky_stone_small_brick' },
  skys:   { n: 'Piedra del cielo lisa (círculo actual)', id: 'ae2:smooth_sky_stone_block', all: 'ae2:smooth_sky_stone_block' },
  skyb:   { n: 'Ladrillos de piedra del cielo (anillo actual)', id: 'ae2:sky_stone_brick', all: 'ae2:sky_stone_brick' },
  elev:   { n: 'Ascensor blanco (ya puesto)', id: 'elevatorid:elevator_white', model: 'elevatorid:block/elevator_white' },
  iron:   { n: 'Bloque de hierro industrial (Create)', id: 'create:industrial_iron_block', side: 'create:industrial_iron_block', top: 'create:industrial_iron_block_top' },
  steel:  { n: 'Bloque de acero', id: 'mekanism:block_steel', all: 'mekanism:block_steel' },
  osm:    { n: 'Bloque de osmio', id: 'mekanism:block_osmium', all: 'mekanism:block_osmium' },
  casing: { n: 'Steel Casing (decoración)', id: 'mekanism:steel_casing', all: 'mekanism:steel_casing' },
  sglass: { n: 'Structural Glass', id: 'mekanism:structural_glass', all: 'mekanism:structural_glass', cutout: true },
  lite:   { n: 'Bloque iluminante azul claro (Simply Light, siempre encendido)', id: 'simplylight:illuminant_light_blue_block_on', model: 'simplylight:block/illuminant_light_blue_block_on', glow: true },
  rod:    { n: 'Lámpara de varilla azul clara (Simply Light)', id: 'simplylight:rodlamp_light_blue', model: 'simplylight:block/rodlamp_light_blue', glow: true },
  // cables tapados
  fme:    { n: 'ME Dense Cable con fachada de hierro industrial', id: 'ae2:fluix_covered_dense_cable', side: 'create:industrial_iron_block', top: 'create:industrial_iron_block_top' },
  fuc:    { n: 'Ultimate Universal Cable con tapa de acero (Mekanism Covers)', id: 'mekanism:ultimate_universal_cable', all: 'mekanism:block_steel' },
  entry:  { n: 'ENTRADA ME · aquí llega un cable denso de tu controlador, por debajo', id: 'ae2:fluix_covered_dense_cable', all: 'ae2:part/cable/dense_smart/cyan', glow: true },
  eentry: { n: 'Entrada de energía (opcional) · tu cable llega por debajo', id: 'mekanism:ultimate_universal_cable', all: 'mekanism:block_steel' },
  // energía y multibloques
  icas:   { n: 'Induction Casing', id: 'mekanism:induction_casing', all: 'mekanism:induction_casing' },
  iport:  { n: 'Induction Port · entrada', id: 'mekanism:induction_port', all: 'mekanism:induction_port', glow: 'mekanism:induction_port_led' },
  iportO: { n: 'Induction Port · salida', id: 'mekanism:induction_port', all: 'mekanism:induction_port_output', glow: 'mekanism:induction_port_output_led' },
  icell:  { n: 'Ultimate Induction Cell', id: 'mekanism:ultimate_induction_cell', all: 'mekanism:ultimate_induction_cell', glow: 'mekanism:induction_cell_glow' },
  iprov:  { n: 'Ultimate Induction Provider', id: 'mekanism:ultimate_induction_provider', all: 'mekanism:ultimate_induction_provider', glow: 'mekanism:induction_provider_glow' },
  teb:    { n: 'Thermal Evaporation Block', id: 'mekanism:thermal_evaporation_block', side: 'mekanism:thermal_evaporation_block', top: 'mekanism:thermal_evaporation_block_top' },
  tec:    { n: 'Thermal Evaporation Controller', id: 'mekanism:thermal_evaporation_controller', front: 'mekanism:thermal_evaporation_controller', side: 'mekanism:thermal_evaporation_block', top: 'mekanism:thermal_evaporation_block_top', glow: { front: 'mekanism:thermal_evaporation_controller_on_led' } },
  tev:    { n: 'Thermal Evaporation Valve', id: 'mekanism:thermal_evaporation_valve', all: 'mekanism:thermal_evaporation_valve' },
  heat:   MOD('Resistive Heater', 'mekanism:resistive_heater', 'mekanism:block/resistive_heater'),
  fcas:   G('Fission Reactor Casing', 'fission_reactor_casing', 'fission/casing'),
  rglass: G('Reactor Glass', 'reactor_glass', 'reactor_glass', { cutout: true }),
  fpin:   G('Fission Reactor Port · Input', 'fission_reactor_port', 'fission/port_input'),
  fpcool: G('Fission Reactor Port · Output Coolant', 'fission_reactor_port', 'fission/port_output_coolant'),
  fpwaste:G('Fission Reactor Port · Output Waste', 'fission_reactor_port', 'fission/port_output_waste'),
  ffuel:  G('Fission Fuel Assembly', 'fission_fuel_assembly', 'fission/fuel_assembly'),
  frod:   G('Control Rod Assembly', 'control_rod_assembly', 'fission/control_rod_assembly'),
  tcas:   G('Turbine Casing', 'turbine_casing', 'turbine/casing'),
  tval:   G('Turbine Valve', 'turbine_valve', 'turbine/valve'),
  tvent:  G('Turbine Vent', 'turbine_vent', 'turbine/vent'),
  trot:   G('Turbine Rotor (2 aspas)', 'turbine_rotor', 'turbine/rotor'),
  tcpx:   G('Rotational Complex', 'rotational_complex', 'rotational_complex'),
  tcoil:  G('Electromagnetic Coil', 'electromagnetic_coil', 'electromagnetic_coil'),
  tcond:  G('Saturating Condenser', 'saturating_condenser', 'saturating_condenser'),
  tdisp:  MOD('Pressure Disperser', 'mekanism:pressure_disperser', 'mekanism:block/pressure_disperser', { yaw: 0 }),
  spsc:   MOD('SPS Casing', 'mekanism:sps_casing', 'mekanism:block/sps_casing', { yaw: 0 }),
  spsp:   MOD('SPS Port · entrada', 'mekanism:sps_port', 'mekanism:block/sps_port', { yaw: 0 }),
  spspo:  MOD('SPS Port · salida', 'mekanism:sps_port', 'mekanism:block/sps_port_output', { yaw: 0 }),
  scoil:  MOD('Supercharged Coil', 'mekanism:supercharged_coil', 'mekanism:block/supercharged_coil', { yaw: 0 }),
  // máquinas
  fdis: FAC('dissolving', 'Dissolving Factory (mekmm)', 'mekmm'), fwas: FAC('washing', 'Washing Factory (mekmm)', 'mekmm'), fcry: FAC('crystallizing', 'Crystallizing Factory (mekmm)', 'mekmm'),
  finj: FAC('injecting', 'Injecting Factory'), fpur: FAC('purifying', 'Purifying Factory'), fcru: FAC('crushing', 'Crushing Factory'), fenr: FAC('enriching', 'Enriching Factory'), fsme: FAC('smelting', 'Smelting Factory'),
  sep:  MOD('Electrolytic Separator', 'mekanism:electrolytic_separator', 'mekanism:block/electrolytic_separator', { yaw: 90 }),
  cinf: MOD('Chemical Infuser', 'mekanism:chemical_infuser', 'mekanism:block/chemical_infuser'),
  oxi:  MOD('Chemical Oxidizer', 'mekanism:chemical_oxidizer', 'mekanism:block/chemical_oxidizer'),
  rot:  MOD('Rotary Condensentrator', 'mekanism:rotary_condensentrator', 'mekanism:block/rotary_condensentrator'),
  diss: MOD('Chemical Dissolution Chamber', 'mekanism:chemical_dissolution_chamber', 'mekanism:block/chemical_dissolution_chamber'),
  cry:  MOD('Chemical Crystallizer', 'mekanism:chemical_crystallizer', 'mekanism:block/chemical_crystallizer'),
  inj:  MOD('Chemical Injection Chamber', 'mekanism:chemical_injection_chamber', 'mekanism:block/chemical_injection_chamber'),
  cent: MOD('Isotopic Centrifuge', 'mekanism:isotopic_centrifuge', 'mekanism:block/isotopic_centrifuge'),
  prc:  MOD('Pressurized Reaction Chamber', 'mekanism:pressurized_reaction_chamber', 'mekanism:block/pressurized_reaction_chamber'),
  nuc:  MOD('Antiprotonic Nucleosynthesizer', 'mekanism:antiprotonic_nucleosynthesizer', 'mekanism:block/antiprotonic_nucleosynthesizer'),
  barrel: MOD('Radioactive Waste Barrel', 'mekanism:radioactive_waste_barrel', 'mekanism:block/radioactive_waste_barrel'),
  ctank: MOD('Ultimate Chemical Tank', 'mekanism:ultimate_chemical_tank', 'mekanism:block/chemical_tank/ultimate'),
  minf: MOD('Metallurgic Infuser', 'mekanism:metallurgic_infuser', 'mekanism:block/metallurgic_infuser'),
  enr:  MOD('Enrichment Chamber', 'mekanism:enrichment_chamber', 'mekanism:block/enrichment_chamber'),
  cru:  MOD('Crusher', 'mekanism:crusher', 'mekanism:block/crusher'),
  sme:  MOD('Energized Smelter', 'mekanism:energized_smelter', 'mekanism:block/energized_smelter'),
  mol:  { n: 'Molecular Assembler', id: 'ae2:molecular_assembler', all: 'ae2:molecular_assembler', glow: 'ae2:molecular_assembler_lights', cutout: true },
  // AE2
  pp:     { n: 'Pattern Provider · direccional (llave), la cara clara mira a su máquina', id: 'ae2:pattern_provider', front: 'ae2:pattern_provider_alternate_front', side: 'ae2:pattern_provider_alternate', back: 'ae2:pattern_provider' },
  iface:  { n: 'ME Interface (sin configurar: lo que le expulsan entra en la red)', id: 'ae2:interface', all: 'ae2:interface' },
  ebus:   { n: 'ME Export Bus · parte en el cable', id: 'ae2:export_bus', model: ['ae2:part/export_bus_base', 'ae2:part/export_bus_on'], dim: 0.6, yaw: 180 },
  tbus:   { n: 'ME Tag Export Bus (ExtendedAE) · parte en el cable', id: 'extendedae:tag_export_bus', model: ['extendedae:part/tag_export_bus_base', 'ae2:part/export_bus_on'], dim: 0.6, yaw: 180 },
  ibus:   { n: 'ME Import Bus · parte en el cable', id: 'ae2:import_bus', model: ['ae2:part/import_bus_base', 'ae2:part/import_bus_on'], dim: 0.6, yaw: 180 },
  sbus:   { n: 'ME Storage Bus · parte en el cable', id: 'ae2:storage_bus', model: ['ae2:part/storage_bus_base', 'ae2:part/storage_bus_on'], dim: 0.6, yaw: 180 },
};

export const W = 43, WX = 43, WZ = 43, H = 17;
export const WALLS = { x0: 0, x1: 42, z0: 0, z1: 42, top: 16 };
const C = 21, TOP = 16, MX = x => 42 - x, MF = { e: 'w', w: 'e', n: 'n', s: 's' };
const blocks = new Map(), K = (x, y, z) => `${x},${y},${z}`;
const put = (x, y, z, t, f = 's', o = {}) => blocks.set(K(x, y, z), { x, y, z, t, f, ...o });
const get = (x, y, z) => blocks.get(K(x, y, z));
const range = (a, b) => Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => a + (b >= a ? i : -i));
export const TERMS = [];
const part = (x, y, z, t, f, gui) => TERMS.push({ x, y, z, t, f, gui });
// lado oeste y su espejo este: la misma función con la x y las caras e/o reflejadas
const SIDES = [{ k: 'W', X: x => x, F: f => f }, { k: 'E', X: MX, F: f => MF[f] }];
const each = fn => SIDES.forEach(fn);

// ── fichas ──
const UP = [S(m('upgrade_speed'), 8), S(m('upgrade_energy'), 8)];
const L = l => l.map(([c, q]) => `<b>${c}</b>: ${q}`);
const mek = (title, sides, extra = []) => ({ title, cards: UP, settings: ['Lados (pestaña de la llave inglesa del GUI; objetos, químicos y fluidos se configuran aparte):', ...L(sides), ...extra, 'Energía: el cable tapado de encima.'] });
const CH = (c, q) => [c, q];
const BACK = 'Cara de atrás (la del proveedor)', BUSB = 'Cara de atrás (la del bus)', TO_I = 'Cara que toca la ME Interface', TO_B = 'Cara que toca el cable con el bus';
const BUS = (title, items, why, extra = []) => ({ title, slots: items.map(it => ({ label: 'Filtro', item: it, hint: why })),
  cards: [S('ae2:speed_card', 4), ...(items.length > 1 ? [S('ae2:capacity_card', 2)] : [])], settings: extra });
const IFACE = { title: 'ME Interface', settings: ['Sin configurar: lo que le expulsan las máquinas de al lado entra en tu red.'] };
const PPG = (pats, target, push) => ({ patterns: pats, target, push });

// ── sala: suelo, paredes con pilastras y luces, esquinas achaflanadas, techo en rosetón ──
const dist = (x, z) => Math.hypot(x - C, z - C);
const plinth = (x, z) => (x <= 13 || x >= 29) && z >= 13 && z <= 29 || z >= 32 && x >= 9 && x <= 33 || z <= 10 || z >= 38 && (x <= 10 || x >= 32);
for (const x of range(1, 41)) for (const z of range(1, 41)) {
  const d = dist(x, z);
  put(x, 0, z, x === C && z === C ? 'elev' : d <= 5.5 ? 'skys' : d <= 6.6 ? 'skyb' : d > 7 && d <= 7.8 ? 'lite' : plinth(x, z) ? 'iron' : 'skysm');
  const ang = (Math.atan2(z - C, x - C) / Math.PI * 4 + 8) % 1, radial = d > 7 && (ang < 0.06 || ang > 0.94);
  put(x, TOP, z, Math.abs(d - 10.5) < 0.55 ? 'lite' : Math.abs(d - 7) < 0.5 || Math.abs(d - 15) < 0.5 || radial ? 'steel' : d < 2.2 ? 'lite' : 'iron');
}
const PIL = v => (v - C + 60) % 6 === 0;                               // pilastras cada 6, alineadas con el ascensor
for (const x of range(0, 42)) for (const z of range(0, 42)) {
  if (x > 0 && x < 42 && z > 0 && z < 42) continue;
  const pil = x === 0 || x === 42 ? PIL(z) || z === 0 || z === 42 : PIL(x);
  for (let y = 0; y <= TOP; y++) put(x, y, z, y === 0 || y === TOP ? 'iron' : pil ? (y === 13 ? 'lite' : 'steel') : y === 1 ? 'casing' : y >= 14 ? 'osm' : 'iron');
}
const CHAMF = [[1, 1], [1, 2], [2, 1], [1, 3], [2, 2], [3, 1]];         // chaflán de las 4 esquinas, de y 6 hacia arriba
for (const [a, b] of CHAMF) for (const [x, z] of [[a, b], [MX(a), b], [a, MX(b)], [MX(a), MX(b)]]) for (let y = 6; y < TOP; y++) put(x, y, z, a + b === 4 && y % 3 === 0 ? 'lite' : 'casing');

// ── red ME: entradas (cada una un cable denso de tu controlador, por el suelo) ──
export const ENTRIES = [];
const entry = (name, x, z, why) => { ENTRIES.push({ name, x, z }); put(x, 0, z, 'entry', 's', { gui: { title: `ENTRADA ME · ${name}`, settings: ['Aquí sube por el suelo un <b>cable denso</b> de tu controlador (hasta 32 canales).', why, 'Encima hay un cable denso con fachada: el tuyo se conecta a su cara de abajo.'] } }); };
const fme = (x, y, z) => put(x, y, z, 'fme', 's', { cable: 'z' });
// ── energía: Universal Cable tapado; anillo a y 5 pegado a las paredes ──
const fuc = (...cells) => cells.forEach(([x, y, z]) => put(x, y, z, 'fuc'));
for (const v of range(1, 41)) fuc([v, 5, 1], [v, 5, 41], [1, 5, v], [41, 5, v]);

// ── NORTE: reactor de fisión 7×7×11 en el centro, una turbina 7×7×13 a cada lado ──
const REACTOR = { title: 'Fission Reactor 7 × 7 × 11', settings: ['Dentro: 9 columnas de 8 Fission Fuel Assembly con un Control Rod Assembly encima (72 conjuntos).',
  'Refrigerante: <b>agua</b>. Sale como vapor por los puertos de los lados directo a las turbinas, y las turbinas devuelven el agua condensada al puerto de debajo.',
  'Empieza con <b>burn rate 1–2 mB/t</b> y súbelo poco a poco mirando que no baje el agua ni suba la temperatura.', 'El daño solo sube si se queda sin agua: no quites la Infinity Water Cell de tu red.'] };
for (const x of range(18, 24)) for (const z of range(2, 8)) for (const y of range(1, 11)) {
  const shell = x === 18 || x === 24 || z === 2 || z === 8 || y === 1 || y === 11;
  if (shell) put(x, y, z, z === 8 && x >= 20 && x <= 22 && y >= 3 && y <= 9 ? 'rglass' : 'fcas', 's', { gui: REACTOR });
  else if ((x - 19) % 2 === 0 && (z - 3) % 2 === 0) put(x, y, z, y === 10 ? 'frod' : 'ffuel', 's', { gui: REACTOR });
}
const TURB = { title: 'Industrial Turbine 7 × 7 × 13', settings: ['Rotor de 6 piezas (12 aspas) en el centro, Rotational Complex encima y una capa entera de Pressure Dispersers a su altura.',
  '2 Electromagnetic Coils sobre el complejo (8 aspas por bobina), 8 Saturating Condensers alrededor y Turbine Vents en las paredes de arriba.',
  'Recibe el vapor del reactor y le devuelve el agua por las válvulas pegadas a él; la energía sale por la válvula pegada a la matriz.'] };
each(s => {
  const x0 = s.k === 'W' ? 11 : 25, x1 = x0 + 6, cx = x0 + 3, cz = 5;
  for (const x of range(x0, x1)) for (const z of range(2, 8)) for (const y of range(1, 13)) {
    const edges = (x === x0 || x === x1) + (z === 2 || z === 8) + (y === 1 || y === 13);
    if (edges) put(x, y, z, edges === 1 && y >= 9 && y <= 12 ? 'tvent' : z === 8 && Math.abs(x - cx) <= 1 && y >= 2 && y <= 7 ? 'sglass' : 'tcas', 's', { gui: TURB });
    else if (x === cx && z === cz) { if (y <= 10) put(x, y, z, y <= 7 ? 'trot' : y === 8 ? 'tcpx' : 'tcoil', 's', { gui: TURB }); }
    else if (y === 8) put(x, y, z, 'tdisp', 's', { gui: TURB });
    else if (y === 9 && Math.abs(x - cx) <= 1 && Math.abs(z - cz) <= 1) put(x, y, z, 'tcond', 's', { gui: TURB });
  }
  put(s.X(17), 3, 5, 'tval', 's', { gui: { title: 'Turbine Valve · vapor', settings: ['Pegada al puerto Output Coolant del reactor: el vapor entra solo.'] } });
  put(s.X(17), 5, 5, 'tval', 's', { gui: { title: 'Turbine Valve · agua', settings: ['Pegada al puerto Input del reactor: le devuelve el agua condensada.'] } });
  put(s.X(11), 3, 4, 'tval', 's', { gui: { title: 'Turbine Valve · energía', settings: ['Pegada al Induction Port de entrada de su matriz: le pasa toda la energía que genera la turbina.'] } });
  put(s.X(18), 3, 5, 'fpcool', 's', { gui: { title: 'Fission Port · Output Coolant', settings: ['Configurator (shift + clic) hasta <b>Output Coolant</b>: empuja el vapor a la turbina de al lado.'] } });
  put(s.X(18), 5, 5, 'fpin', 's', { gui: { title: 'Fission Port · Input', settings: ['Modo <b>Input</b>: recibe el agua que devuelve la turbina.'] } });
});
put(19, 2, 8, 'fpin', 's', { gui: { title: 'Fission Port · Input (combustible y agua)', settings: ['Modo <b>Input</b>. El Export Bus de delante le mete combustible fisible y agua.'] } });
put(23, 2, 8, 'fpwaste', 's', { gui: { title: 'Fission Port · Output Waste', settings: ['Configurator hasta <b>Output Waste</b>: expulsa el residuo nuclear a la ME Interface de delante.'] } });
for (const x of range(19, 23)) fme(x, 1, 9);
fme(19, 2, 9);
part(19, 2, 9, 'ebus', 'n', BUS('ME Export Bus · combustible y agua → reactor', [S(m('fissile_fuel')), S(mc('water'))], 'con Crafting Card: si falta combustible lo fabrica',
  ['Lleva <b>Crafting Card</b> y 2 <b>Capacity Cards</b> para tener dos filtros: combustible fisible y agua.']));
put(23, 2, 9, 'iface', 's', { gui: { title: 'ME Interface · residuo nuclear', settings: ['Recibe el residuo del reactor y lo guarda en tu red (celda de químicos).'] } });
entry('Reactor', 21, 9, 'Bus de combustible y salida de residuo del reactor.');

// ── NORTE, esquinas: Induction Matrix 4×4×12 pegada a cada turbina y planta de evaporación 4×4×12 a su lado ──
const MAT = { title: 'Induction Matrix 4 × 4 × 12', settings: ['Dentro: 8 Ultimate Induction Providers abajo y 32 Ultimate Induction Cells encima; la cara sur es de Structural Glass.',
  'Entra la energía de su turbina (puerto pegado a ella) y, si quieres, la tuya por el puerto del suelo. Sale por el puerto de la cara norte al anillo.'] };
const TEP = { title: 'Thermal Evaporation Plant 4 × 4 × 12', settings: ['Agua → salmuera (10 → 1) para el cloro. Base llena, paredes huecas, arriba abierta.',
  'El Resistive Heater de la válvula del lado de la matriz la calienta: súbele el consumo hasta pasar de 100 °C de sobra.', 'Válvulas de la pared: una recibe agua y otra entrega la salmuera.'] };
each(s => {
  const [mx0, mx1] = [s.X(7), s.X(10)].sort((a, b) => a - b), [tx0, tx1] = [s.X(2), s.X(5)].sort((a, b) => a - b);
  for (const x of range(mx0, mx1)) for (const z of range(3, 6)) for (const y of range(1, 12)) {
    const shell = x === mx0 || x === mx1 || z === 3 || z === 6 || y === 1 || y === 12;
    put(x, y, z, !shell ? (y <= 3 ? 'iprov' : 'icell') : z === 6 && x > mx0 && x < mx1 && y > 1 && y < 12 ? 'sglass' : 'icas', 's', { gui: MAT });
  }
  put(s.X(10), 3, 4, 'iport', 's', { gui: { title: 'Induction Port · entrada (turbina)', settings: ['Modo Input. Pegado a la válvula de energía de la turbina.'] } });
  put(s.X(8), 1, 4, 'iport', 's', { gui: { title: 'Induction Port · entrada (tu cable)', settings: ['Modo Input. Si quieres meter energía de fuera, tu cable sube por el suelo hasta aquí.'] } });
  put(s.X(8), 0, 4, 'eentry', 's', { gui: { title: 'Entrada de energía (opcional)', settings: ['Tu cable de energía llega por debajo y toca el puerto de encima.'] } });
  put(s.X(8), 5, 3, 'iportO', 's', { gui: { title: 'Induction Port · salida', settings: ['Configurator hasta <b>Output</b>: alimenta el anillo de cable tapado de toda la sala.'] } });
  fuc([s.X(8), 5, 2]);
  for (const x of range(tx0, tx1)) for (const z of range(3, 6)) for (const y of range(1, 12))
    if (y === 1 || x === tx0 || x === tx1 || z === 3 || z === 6) put(x, y, z, 'teb', 's', { gui: TEP });
  put(s.X(3), 2, 6, 'tec', 's', { gui: TEP });
  put(s.X(2), 1, 4, 'tev', 's', { gui: TEP }); put(s.X(2), 1, 5, 'tev', 's', { gui: TEP }); put(s.X(5), 1, 4, 'tev', 's', { gui: TEP });
  put(s.X(6), 1, 4, 'heat', s.F('e'), { gui: { title: 'Resistive Heater', settings: ['Le pasa calor a la válvula de la planta de evaporación.', 'Energía: el cable tapado de encima.'] } });
  fuc([s.X(6), 2, 4], [s.X(6), 3, 4], [s.X(6), 4, 4], [s.X(6), 5, 4], [s.X(6), 5, 3], [s.X(6), 5, 2]);
  part(s.X(1), 1, 4, 'ebus', s.F('e'), BUS('ME Export Bus · agua → evaporación', [S(mc('water'))], 'de la Infinity Water Cell'));
  part(s.X(1), 1, 5, 'ibus', s.F('e'), BUS('ME Import Bus · salmuera ← evaporación', [S(m('brine'))], 'la saca de la válvula'));
});

// ── OESTE / ESTE exteriores: dos líneas ×5 por lado (4 en total), con su troncal pegada a la pared ──
const CHAIN = ['fdis', 'fwas', 'fcry', 'finj', 'fpur', 'fcru', 'fenr', 'fsme'];
const chainGui = t => {
  const IN_N = CH('Cara norte', 'Items · <b>Input</b> (lo expulsa la anterior)'), OUT_S = CH('Cara sur', 'Items · <b>Output</b> + <b>Eject</b> → la siguiente'), B = 'Cara de atrás (la del cable)';
  return mek(P[t].n, {
    fdis: [CH('Cara norte', 'Items · <b>Input</b> · crudos del Tag Export Bus'), CH(B, 'Químicos · <b>Input</b> · ácido sulfúrico'), CH('Cara sur', 'Químicos · <b>Output</b> + <b>Eject</b> → Washing')],
    fwas: [CH('Cara norte', 'Químicos · <b>Input</b> · slurry sucio'), CH(B, 'Fluidos · <b>Input</b> · agua'), CH('Cara sur', 'Químicos · <b>Output</b> + <b>Eject</b> → Crystallizing')],
    fcry: [CH('Cara norte', 'Químicos · <b>Input</b> · slurry limpio'), OUT_S],
    finj: [IN_N, CH(B, 'Químicos · <b>Input</b> · cloruro de hidrógeno'), OUT_S],
    fpur: [IN_N, CH(B, 'Químicos · <b>Input</b> · oxígeno'), OUT_S],
    fcru: [IN_N, OUT_S], fenr: [IN_N, OUT_S],
    fsme: [IN_N, CH('Cara sur', 'Items · <b>Output</b> + <b>Eject</b> → la ME Interface')],
  }[t], ['Botón <b>Auto-sort</b> encendido: reparte lo que entra entre sus 9 procesos.']);
};
const CHAIN_BUS = { fdis: m('sulfuric_acid'), fwas: mc('water'), finj: m('hydrogen_chloride'), fpur: m('oxygen') };
each(s => {
  // línea A pegada a la pared (máquinas en x 2, troncal en x 1) y línea B enfrente (máquinas en x 5, cable en x 6); pasillo de 2 entre ellas
  for (const [mx, cx, face] of [[2, 1, 'e'], [5, 6, 'w']]) {
    const X = s.X(mx), CXc = s.X(cx), F = s.F(face), toMachine = s.F(face === 'e' ? 'e' : 'w');
    CHAIN.forEach((t, i) => put(X, 1, 17 + i, t, F, { gui: chainGui(t) }));
    put(X, 1, 25, 'iface', 's', { gui: { title: 'ME Interface · salida de la línea', settings: ['Los lingotes que expulsa la Smelting Factory entran en tu red.'] } });
    fme(X, 1, 16);
    part(X, 1, 16, 'tbus', 's', BUS('ME Tag Export Bus · crudos → línea', [S(mc('raw_iron'))], 'filtro de etiqueta: c:raw_materials/*', ['Escribe el filtro <b>c:raw_materials/*</b>. Las 4 líneas se reparten los crudos solas.']));
    for (const z of range(15, 26)) fme(CXc, 1, z);
    CHAIN.forEach((t, i) => { if (CHAIN_BUS[t]) part(CXc, 1, 17 + i, 'ebus', toMachine, BUS(`ME Export Bus · ${ITEMS[CHAIN_BUS[t]].n} → ${P[t].n.split(' (')[0].split(' ·')[0]}`, [S(CHAIN_BUS[t])], 'entra por la cara de atrás')); });
    for (const z of range(16, 25)) fuc([X, 2, z]);
  }
  // arco de cable tapado que une la línea B con la troncal por encima del pasillo (norte); su gemelo del sur es solo de acero
  for (const y of range(2, 4)) { fme(s.X(1), y, 15); fme(s.X(6), y, 15); put(s.X(1), y, 27, 'steel'); put(s.X(6), y, 27, 'steel'); }
  put(s.X(6), 1, 27, 'steel');
  for (const x of range(2, 5)) { fme(s.X(x), 4, 15); put(s.X(x), 4, 27, 'steel'); }
  for (const z of range(3, 40)) if (!get(s.X(1), 1, z)) fme(s.X(1), 1, z);
  fuc([s.X(2), 3, C], [s.X(2), 4, C], [s.X(2), 5, C], [s.X(5), 3, C], [s.X(5), 4, C], [s.X(5), 5, C], [s.X(4), 5, C], [s.X(3), 5, C]);
});
entry('Líneas oeste', 1, C, 'Troncal de la pared oeste: 2 líneas ×5, planta de gases del suroeste y evaporación del noroeste.');
entry('Líneas este', 41, C, 'Troncal de la pared este: 2 líneas ×5, planta de gases del sureste y evaporación del noreste.');

// ── SUR, esquinas: plantas de gases (máquinas en z 40 mirando al norte, buses detrás en z 41) ──
const GASW = [
  ['sep', mc('water'), 'Electrolytic Separator · agua', [CH(BUSB, 'Fluidos · <b>Input</b> · agua'), CH(TO_I, 'Químicos · <b>Output</b> (los dos gases) + <b>Eject</b>')], ['Las dos salidas en <b>Dumping Excess</b>: si tu red se llena, tira lo que sobra y no se para.']],
  ['iface'],
  ['sep', mc('water'), 'Electrolytic Separator · agua', [CH(BUSB, 'Fluidos · <b>Input</b> · agua'), CH(TO_I, 'Químicos · <b>Output</b> (los dos gases) + <b>Eject</b>')], ['Las dos salidas en <b>Dumping Excess</b>.']],
  ['iface'],
  ['sep', m('brine'), 'Electrolytic Separator · salmuera', [CH(BUSB, 'Fluidos · <b>Input</b> · salmuera'), CH(TO_I, 'Químicos · <b>Output 2</b> (cloro) + <b>Eject</b>')], ['Salida 1 (sodio) en <b>Dumping</b>; salida 2 (cloro) en <b>Dumping Excess</b>.']],
  ['bus', [m('chlorine')]],
  ['cinf', m('hydrogen'), 'Chemical Infuser · HCl', [CH(BUSB, 'Químicos · <b>Left Input</b> · hidrógeno'), CH(TO_B, 'Químicos · <b>Right Input</b> · cloro'), CH(TO_I, 'Químicos · <b>Output</b> + <b>Eject</b>')], ['1 H₂ + 1 Cl₂ → 1 HCl.']],
  ['iface'],
];
const GASE = [
  ['oxi', m('dust_sulfur'), 'Chemical Oxidizer', [CH(BUSB, 'Items · <b>Input</b> · polvo de azufre'), CH(TO_I, 'Químicos · <b>Output</b> + <b>Eject</b>')], ['1 azufre → 100 mB de SO₂. El azufre lo metes tú en tu red.']],
  ['iface'],
  ['rot', mc('water'), 'Rotary Condensentrator', [CH(BUSB, 'Fluidos · <b>Input</b> · agua'), CH(TO_I, 'Químicos · <b>Output</b> + <b>Eject</b>')], ['Modo <b>Decondensentrating</b>: agua → vapor.']],
  ['iface'],
  ['cinf', m('oxygen'), 'Chemical Infuser · SO₃', [CH(BUSB, 'Químicos · <b>Left Input</b> · oxígeno'), CH(TO_B, 'Químicos · <b>Right Input</b> · dióxido de azufre'), CH(TO_I, 'Químicos · <b>Output</b> + <b>Eject</b>')], ['1 O₂ + 2 SO₂ → 2 SO₃.']],
  ['bus', [m('sulfur_dioxide'), m('water_vapor')]],
  ['cinf', m('sulfur_trioxide'), 'Chemical Infuser · H₂SO₄', [CH(BUSB, 'Químicos · <b>Left Input</b> · trióxido de azufre'), CH(TO_B, 'Químicos · <b>Right Input</b> · vapor de agua'), CH(TO_I, 'Químicos · <b>Output</b> + <b>Eject</b>')], ['1 SO₃ + 1 vapor → 1 H₂SO₄.']],
  ['iface'],
];
each(s => {
  (s.k === 'W' ? GASW : GASE).forEach(([t, a, b, c, d], i) => {
    const x = s.X(2 + i);
    if (t === 'iface') return put(x, 1, 40, 'iface', 's', { gui: IFACE });
    if (t === 'bus') {                                                // a la máquina de después (x + 1) y, si hay segundo gas, a la de antes
      fme(x, 1, 40);
      part(x, 1, 40, 'ebus', s.F('e'), BUS(`ME Export Bus · ${ITEMS[a[0]].n} → Chemical Infuser`, [S(a[0])], 'entra por su Right Input'));
      if (a[1]) part(x, 1, 40, 'ebus', s.F('w'), BUS(`ME Export Bus · ${ITEMS[a[1]].n} → Chemical Infuser`, [S(a[1])], 'entra por su Right Input'));
      return;
    }
    put(x, 1, 40, t, 'n', { gui: mek(b, c, d) });
    part(x, 1, 41, 'ebus', 'n', BUS(`ME Export Bus · ${ITEMS[a].n} → ${b.split(' · ')[0]}`, [S(a)], 'entra por la cara de atrás'));
  });
  for (const x of range(1, 9)) fme(s.X(x), 1, 41);
  fme(s.X(1), 1, 40);
  for (const i of range(0, 7)) fuc([s.X(2 + i), 2, 40]);
  fuc([s.X(5), 3, 40], [s.X(5), 4, 40], [s.X(5), 5, 40]);
});

// ── talleres interiores: máquina mirando al pasillo, su proveedor detrás y el cable con fachada detrás del proveedor ──
// z 14..28: M I M B M I M B M I M B M I M  (cada máquina expulsa a su ME Interface y, si lo necesita, recibe del bus de al lado)
const OI = CH(TO_I, 'Items · <b>Output</b> + <b>Eject</b>'), IB = CH(BACK, 'Items · <b>Input</b>');
const WS = {
  W: [ // aleaciones y circuitos
    ['cru', ['odust', 'fdust'], [IB, OI]],
    ['minf', ['eiron', 'sdust'], [IB, OI, CH(TO_B, 'Items · <b>Extra</b> (infusión): Carbono enriquecido')], 'enriched_carbon'],
    ['minf', ['infused', 'cbasic', 'cadv'], [IB, CH(TO_B, 'Items · <b>Extra</b>: Redstone enriquecida'), OI], 'enriched_redstone'],
    ['enr', ['ecarbon', 'eredstone', 'ediamond', 'erob'], [IB, OI]],
    ['sme', ['steel'], [IB, OI]],
    ['minf', ['reinforced', 'celite', 'rodust'], [IB, OI, CH(TO_B, 'Items · <b>Extra</b>: Diamante enriquecido')], 'enriched_diamond'],
    ['minf', ['atomic', 'cult'], [IB, CH(TO_B, 'Items · <b>Extra</b>: Obsidiana refinada enriquecida'), OI], 'enriched_refined_obsidian'],
    ['mol', ['casing']],
  ],
  E: [ // antimateria
    ['cry', ['apellet'], [CH(BACK, 'Químicos · <b>Input</b> · antimateria'), OI]],
    ['nuc', ['ndiamond']], ['nuc', ['nemerald']], ['nuc', ['niron']], ['nuc', ['ncrying']], ['nuc', ['necho']], ['nuc', ['napple']],
    ['oxi', ['agas'], [CH(BACK, 'Items · <b>Input</b> · pellet de antimateria'), CH(TO_I, 'Químicos · <b>Output</b> + <b>Eject</b>')]],
  ],
};
const NUC = [CH(BACK, 'Items · <b>Input</b> y Químicos · <b>Input</b> (el proveedor le da el objeto y la antimateria)'), OI];
each(s => {
  const MXc = s.X(11), PX = s.X(12), CXc = s.X(13), face = s.F('w');
  let mi = 0;
  for (const z of range(14, 28)) {
    const k = (z - 14) % 4;                                          // 0 y 2: máquina · 1: interfaz · 3: bus
    if (k === 0 || k === 2) {
      const [t, pats, sides, infuse] = WS[s.k][mi++];
      const gui = t === 'mol' ? { title: 'Molecular Assembler', settings: ['No se configura: devuelve el Steel Casing a su proveedor.'] }
        : t === 'nuc' ? mek(P.nuc.n, NUC, ['Patrón: objeto + antimateria → resultado. Copia el patrón a otro proveedor si quieres más en paralelo.'])
        : mek(P[t].n, sides, infuse ? [`Infusión por el bus de al lado (${ITEMS[m(infuse)].n}).`] : []);
      put(MXc, 1, z, t, face, { gui, infuse });
      put(PX, 1, z, 'pp', face, PPG(pats, [MXc, 1, z], s.k === 'W' ? 'el oeste' : 'el este'));
    } else if (k === 1) { put(MXc, 1, z, 'iface', 's', { gui: IFACE }); fme(PX, 1, z); }
    else { fme(MXc, 1, z); fme(PX, 1, z); }
    fme(CXc, 1, z);
    fuc([MXc, 2, z]);
  }
  for (const z of range(14, 28)) if ((z - 14) % 4 === 3) for (const [f, zz] of [['n', z - 1], ['s', z + 1]]) {
    const inf = get(MXc, 1, zz)?.infuse;
    if (inf) part(MXc, 1, z, 'ebus', f, BUS(`ME Export Bus · ${ITEMS[m(inf)].n} → infusor`, [S(m(inf))], 'con Crafting Card: si no queda, lo pide a la Enrichment Chamber', ['Lleva <b>Crafting Card</b>. Entra por la cara Extra del infusor.']));
  }
  fuc([MXc, 3, C], [MXc, 4, C], [MXc, 5, C], ...range(s.X(10), s.X(6)).map(x => [x, 5, C]));
  entry(s.k === 'W' ? 'Taller oeste' : 'Taller este', CXc, C, s.k === 'W' ? 'Taller de aleaciones y circuitos.' : 'Taller de antimateria: cristalizador, 6 nucleosintetizadores y oxidador.');
});

// ── SUR, centro: SPS 7×7×7 (octógono en cada cara) ──
const GRID = [[0, 0, 1, 1, 1, 0, 0], [0, 1, 2, 2, 2, 1, 0], [1, 2, 2, 2, 2, 2, 1], [1, 2, 2, 2, 2, 2, 1], [1, 2, 2, 2, 2, 2, 1], [0, 1, 2, 2, 2, 1, 0], [0, 0, 1, 1, 1, 0, 0]];
const SPS = { title: 'Supercritical Phase Shifter (SPS)', settings: ['Forma fija de 7 × 7 × 7: en cada cara, las 4 esquinas de 3 bloques quedan vacías (octógono).',
  '1000 mB de polonio → 1 mB de antimateria; cada mB de polonio pide 100 000 de energía (config de tu instancia).',
  'Puerto oeste: entra el polonio. Puerto este: sale la antimateria. Puerto de arriba: energía por el Supercharged Coil.'] };
for (const x of range(18, 24)) for (const y of range(1, 7)) for (const z of range(34, 40)) {
  const fx = x === 18 || x === 24, fy = y === 1 || y === 7, fz = z === 34 || z === 40;
  if (!fx && !fy && !fz) continue;
  if ((!fx || GRID[y - 1][z - 34]) && (!fy || GRID[x - 18][z - 34]) && (!fz || GRID[y - 1][x - 18])) put(x, y, z, 'spsc', 's', { gui: SPS });
}
put(18, 4, 37, 'spsp', 's', { gui: { title: 'SPS Port · polonio', settings: ['Modo entrada (el que trae). El Export Bus de al lado le mete el polonio de tu red.'] } });
put(24, 4, 37, 'spspo', 's', { gui: { title: 'SPS Port · antimateria', settings: ['Configurator hasta <b>Output</b>: expulsa la antimateria a la ME Interface de al lado.'] } });
put(21, 7, 37, 'spsp', 's', { gui: { title: 'SPS Port · energía', settings: ['Lleva encima el Supercharged Coil: por él entra la energía.'] } });
put(21, 8, 37, 'scoil', 's', { gui: { title: 'Supercharged Coil', settings: ['Pegado al puerto de arriba del SPS, mirando hacia arriba. Recibe la energía del cable tapado.'] } });
fuc([21, 9, 37], [21, 9, 38], [21, 9, 39], [21, 9, 40], [21, 9, 41], [21, 8, 41], [21, 7, 41], [21, 6, 41]);
for (const y of range(1, 4)) fme(17, y, 37);
part(17, 4, 37, 'ebus', 'e', BUS('ME Export Bus · polonio → SPS', [S(m('polonium'))], 'llega de tus Solar Neutron Activators de fuera'));
put(25, 4, 37, 'iface', 's', { gui: { title: 'ME Interface · antimateria', settings: ['Recibe la antimateria del SPS y la guarda en tu red.'] } });
for (const y of range(1, 3)) fme(25, y, 37);

// ── SUR, flancos: combustible (oeste) y residuos (este); fila delantera mira al norte, trasera al sur, troncal en medio ──
const ROWS = {
  W: { front: [['enr', ['ycake'], 'pp'], ['iface'], ['oxi', ['uo2'], 'pp'], ['bus', m('sulfuric_acid')], ['diss', ['hf'], 'pp'], ['iface'], ['cinf', null, 'bus', m('hydrofluoric_acid')]],
       back: [['cent', ['fissileA'], 'pp'], ['iface'], ['cent', ['fissileB'], 'pp'], ['bus', m('hydrogen_chloride')], ['inj', ['frag'], 'pp'], ['iface'], ['oxi', ['refuel'], 'pp']] },
  E: { front: [['barrel', null, 'bus', m('spent_nuclear_waste')], ['ctank', null, 'sbus', m('antimatter')], ['barrel', null, 'bus', m('spent_nuclear_waste')], ['ctank', null, 'sbus', m('polonium')],
               ['barrel', null, 'bus', m('spent_nuclear_waste')], ['ctank', null, 'sbus', m('plutonium')], ['barrel', null, 'bus', m('spent_nuclear_waste')]],
       back: [['prc', ['pupellet'], 'pp'], ['iface'], ['prc', ['popellet'], 'pp'], ['cable'], ['cent', ['puA'], 'pp'], ['iface'], ['cent', ['puB'], 'pp']] },
};
const SGUI = {
  enr: mek('Enrichment Chamber · yellow cake', [IB, OI]),
  oxi: mek('Chemical Oxidizer', [IB, CH(TO_I, 'Químicos · <b>Output</b> + <b>Eject</b>')]),
  diss: mek('Chemical Dissolution Chamber · HF', [CH(BACK, 'Items · <b>Input</b> · fluorita'), CH(TO_B, 'Químicos · <b>Input</b> · ácido sulfúrico'), CH(TO_I, 'Químicos · <b>Output</b> + <b>Eject</b>')]),
  cinf: mek('Chemical Infuser · UF₆', [CH(BUSB, 'Químicos · <b>Left Input</b> · ácido fluorhídrico'), CH('Cara del bus de al lado', 'Químicos · <b>Right Input</b> · óxido de uranio'), CH(TO_I, 'Químicos · <b>Output</b> + <b>Eject</b>')],
    ['Funciona sin parar mientras haya HF y UO₂: sus dos buses llevan Crafting Card y los piden cuando se acaban.']),
  cent: mek('Isotopic Centrifuge', [CH(BACK, 'Químicos · <b>Input</b>'), CH(TO_I, 'Químicos · <b>Output</b> + <b>Eject</b>')]),
  inj: mek('Chemical Injection Chamber · reprocesado', [CH(BACK, 'Items · <b>Input</b> · pellet de plutonio'), CH(TO_B, 'Químicos · <b>Input</b> · cloruro de hidrógeno'), OI]),
  prc: mek('Pressurized Reaction Chamber · pellets', [CH(BACK, 'Items, Fluidos y Químicos · <b>Input</b> (el proveedor le da polvo de fluorita, agua y Pu/Po)'), CH(TO_I, 'Items y Químicos · <b>Output</b> + <b>Eject</b> (pellet y residuo gastado)')]),
  barrel: { title: 'Radioactive Waste Barrel', settings: ['Recibe el residuo gastado por el Export Bus de detrás y lo deja decaer solo.'] },
  ctank: { title: 'Ultimate Chemical Tank', settings: ['Depósito a la vista: el Storage Bus de detrás lo pone dentro de tu red (prioridad alta y partición a su químico).'] },
};
each(s => {
  for (const [row, zM, zP, face] of [['front', 34, 35, 'n'], ['back', 38, 37, 's']]) ROWS[s.k][row].forEach(([t, pats, how, chem], i) => {
    const x = s.X(10 + i);
    if (t === 'iface') { put(x, 1, zM, 'iface', 's', { gui: IFACE }); fme(x, 1, zP); return; }
    if (t === 'cable') { fme(x, 1, zM); fme(x, 1, zP); return; }
    if (t === 'bus') {                                               // bus de lado hacia la máquina siguiente (hacia el SPS)
      fme(x, 1, zM); fme(x, 1, zP);
      part(x, 1, zM, 'ebus', s.F('e'), BUS(`ME Export Bus · ${ITEMS[pats].n} → ${SGUI[ROWS[s.k][row][i + 1][0]].title}`, [S(pats)], 'entra por la cara del bus'));
      return;
    }
    put(x, 1, zM, t, face, { gui: SGUI[t] });
    if (how === 'pp') { put(x, 1, zP, 'pp', face, PPG(pats, [x, 1, zM], face === 'n' ? 'el norte' : 'el sur')); return; }
    fme(x, 1, zP);
    part(x, 1, zP, how === 'sbus' ? 'sbus' : 'ebus', face, how === 'sbus' ? BUS(`ME Storage Bus · ${ITEMS[chem].n}`, [S(chem)], 'partición a este químico, prioridad alta')
      : BUS(`ME Export Bus · ${ITEMS[chem].n} → ${SGUI[t].title}`, [S(chem)], t === 'cinf' ? 'con Crafting Card' : 'lo deja decaer', t === 'cinf' ? ['Lleva <b>Crafting Card</b>.'] : []));
  });
  for (const i of range(0, 7)) fme(s.X(10 + i), 1, 36);
  for (const z of [34, 38]) for (const i of range(0, 6)) fuc([s.X(10 + i), 2, z]);
  fuc(...[[3, 34], [4, 34], [5, 34], [5, 35], [5, 36], [5, 37], [5, 38], [4, 38], [3, 38], [5, 39], [5, 40]].map(([y, z]) => [s.X(13), y, z]));
  entry(s.k === 'W' ? 'Combustible' : 'Residuos y SPS', s.X(13), 36, s.k === 'W' ? 'Cadena del combustible fisible y polonio al SPS.' : 'Barriles, depósitos, pellets, plutonio y antimateria del SPS.');
});
fme(17, 1, 34); fme(17, 1, 35);                                       // segundo bus del infusor de UF₆: óxido de uranio por el lado
part(17, 1, 34, 'ebus', 'w', BUS('ME Export Bus · óxido de uranio → Chemical Infuser · UF₆', [S(m('uranium_oxide'))], 'con Crafting Card', ['Lleva <b>Crafting Card</b>. Entra por su Right Input.']));

// ── luces: varillas de Simply Light delante de cada pilastra y colgando del rosetón ──
for (const v of range(1, 41)) if (PIL(v)) for (const [x, z] of [[1, v], [41, v], [v, 1], [v, 41]]) for (const y of range(8, 12)) if (!get(x, y, z)) put(x, y, z, 'rod');
for (const a of range(0, 7)) { const t = a * Math.PI / 4, x = Math.round(C + 10.5 * Math.cos(t)), z = Math.round(C + 10.5 * Math.sin(t)); for (const y of [14, 15]) if (!get(x, y, z)) put(x, y, z, 'rod'); }

// ── comprobaciones ──
const AE = new Set(['pp', 'iface', 'fme']);
const MEK = new Set(['fdis', 'fwas', 'fcry', 'finj', 'fpur', 'fcru', 'fenr', 'fsme', 'sep', 'cinf', 'oxi', 'rot', 'diss', 'cry', 'inj', 'cent', 'prc', 'nuc', 'minf', 'enr', 'cru', 'sme', 'heat', 'scoil']);
const D6 = [[1, 0, 0, 'e'], [-1, 0, 0, 'w'], [0, 1, 0, 'u'], [0, -1, 0, 'd'], [0, 0, 1, 's'], [0, 0, -1, 'n']];
const OPP = { e: 'w', w: 'e', u: 'd', d: 'u', s: 'n', n: 's' };
const partOn = (b, f) => TERMS.some(t => t.x === b.x && t.y === b.y && t.z === b.z && t.f === f);
const nb = b => D6.map(([dx, dy, dz, f]) => [get(b.x + dx, b.y + dy, b.z + dz), f]).filter(([n]) => n);
const aeLink = (b, n, f) => AE.has(n.t) && !partOn(b, f) && !partOn(n, OPP[f]);
const pwLink = (b, n) => n.t === 'fuc' || (b.t === 'fuc' && MEK.has(n.t));
function reach(start, link) { const seen = new Set([start]), q = [start]; while (q.length) { const b = q.pop(); for (const [n, f] of nb(b)) if (!seen.has(n) && link(b, n, f)) { seen.add(n); q.push(n); } } return seen; }
const all = [...blocks.values()];
for (const b of [...all, ...TERMS]) if (!P[b.t]) throw new Error(`Tipo ${b.t} sin paleta en ${b.x},${b.y},${b.z}`);
const STEP3 = { e: [1, 0, 0], w: [-1, 0, 0], s: [0, 0, 1], n: [0, 0, -1] };
const ahead = b => { const [dx, dy, dz] = STEP3[b.f]; return get(b.x + dx, b.y + dy, b.z + dz); };
const dev = b => b.t === 'pp' || b.t === 'iface';
const zones = ENTRIES.map(e => ({ ...e, set: reach(get(e.x, 1, e.z), aeLink) }));
for (const z of zones) {
  if (!AE.has(get(z.x, 1, z.z)?.t)) throw new Error(`La entrada ${z.name} no tiene cable encima`);
  z.ch = [...z.set].filter(dev).length + TERMS.filter(t => z.set.has(get(t.x, t.y, t.z))).length;
  if (z.ch > 32) throw new Error(`La zona ${z.name} pide ${z.ch} canales (máx. 32 por cable denso)`);
}
for (const a of zones) for (const b of zones) if (a !== b && [...a.set].some(x => b.set.has(x))) throw new Error(`Las zonas ${a.name} y ${b.name} se tocan`);
const loose = all.filter(b => AE.has(b.t) && !zones.some(z => z.set.has(b)));
if (loose.length) throw new Error(`Cable o dispositivo AE2 sin entrada: ${loose.slice(0, 3).map(b => `${b.t} ${b.x},${b.y},${b.z}`)}`);
for (const t of TERMS) {
  const a = ahead(t);
  if (get(t.x, t.y, t.z)?.t !== 'fme') throw new Error(`La parte de ${t.x},${t.y},${t.z} no está en un cable`);
  if (!a || !(MEK.has(a.t) || ['tev', 'fpin', 'spsp', 'barrel', 'ctank'].includes(a.t))) throw new Error(`El bus de ${t.x},${t.y},${t.z} no mira a una máquina (${a?.t})`);
}
const FITS = { cru: ['odust', 'fdust'], minf: ['eiron', 'sdust', 'infused', 'cbasic', 'cadv', 'reinforced', 'celite', 'rodust', 'atomic', 'cult'], enr: ['ecarbon', 'eredstone', 'ediamond', 'erob', 'ycake'],
  sme: ['steel'], mol: ['casing'], cry: ['apellet'], nuc: ['ndiamond', 'nemerald', 'niron', 'ncrying', 'necho', 'napple'], oxi: ['agas', 'uo2', 'refuel'], diss: ['hf'], cent: ['fissileA', 'fissileB', 'puA', 'puB'], inj: ['frag'], prc: ['pupellet', 'popellet'] };
const placed = [];
for (const b of all) if (b.t === 'pp') {
  const t = ahead(b);
  if (!FITS[t?.t] || K(...b.target) !== K(t.x, t.y, t.z)) throw new Error(`El Pattern Provider de ${b.x},${b.y},${b.z} no mira a su máquina`);
  for (const id of b.patterns) { if (!FITS[t.t].includes(id)) throw new Error(`El patrón ${id} no se puede hacer en ${t.t}`); placed.push(id); }
}
if (placed.sort().join() !== Object.keys(PATTERNS).sort().join()) throw new Error(`Cada patrón debe estar en un proveedor, una vez: ${Object.keys(PATTERNS).filter(k => !placed.includes(k))}`);
for (const [id, p] of Object.entries(PATTERNS)) for (const [i] of [...(p.grid || []), ...(p.in || []), ...p.out]) if (!ITEMS[i]) throw new Error(`Falta ${i} en ITEMS (patrón ${id})`);
const EJECT = ['cru', 'minf', 'enr', 'sme', 'sep', 'cinf', 'oxi', 'rot', 'diss', 'cry', 'inj', 'cent', 'prc', 'nuc'];
for (const b of all) if (EJECT.includes(b.t) && !nb(b).some(([n]) => n.t === 'iface')) throw new Error(`${b.t} en ${b.x},${b.y},${b.z} no tiene una ME Interface donde expulsar`);
const pw = new Set([...reach(get(8, 5, 3), pwLink), ...reach(get(34, 5, 3), pwLink)]);
const dark = all.filter(b => MEK.has(b.t) && !pw.has(b));
if (dark.length) throw new Error(`Sin energía: ${dark.slice(0, 3).map(b => `${b.t} ${b.x},${b.y},${b.z}`)}`);
for (const s of SIDES) {
  if (get(s.X(11), 3, 4)?.t !== 'tval' || get(s.X(10), 3, 4)?.t !== 'iport') throw new Error('Cada turbina debe tocar el puerto de entrada de su matriz');
  if (get(s.X(17), 3, 5)?.t !== 'tval' || get(s.X(18), 3, 5)?.t !== 'fpcool') throw new Error('El vapor del reactor debe entrar directo en la turbina');
}
const asym = all.filter(b => b.y > 0 && !get(MX(b.x), b.y, b.z));
if (asym.length > 12) throw new Error(`El diseño se ha vuelto asimétrico: ${asym.slice(0, 5).map(b => `${b.t} ${b.x},${b.y},${b.z}`)} (${asym.length})`);

const CHI = zones.map(z => `${z.name} ${z.ch}/32`).join(' · ');
export const STATS = { channels: Object.fromEntries(zones.map(z => [z.name, z.ch])), patterns: Object.keys(PATTERNS).length, asym: asym.length };
export const BLOCKS = all;
export const ZONES = [
  { n: 'Vista general', p: [21, 62, 34], t: [21, 0, 21] },
  { n: 'Reactor y turbinas (norte)', p: [21, 6, 18], t: [21, 5, 5] },
  { n: 'Líneas ×5 (pasillo oeste)', p: [3.5, 2.6, 31], t: [3.5, 1.4, 18] },
  { n: 'Taller de aleaciones', p: [8, 3.2, 31], t: [11, 1.2, 21] },
  { n: 'Taller de antimateria', p: [34, 3.2, 31], t: [31, 1.2, 21] },
  { n: 'SPS y química nuclear (sur)', p: [21, 6, 26], t: [21, 3, 36] },
  { n: 'Gases (suroeste)', p: [6, 3, 33], t: [5.5, 1.2, 40] },
  { n: 'Matriz y evaporación', p: [9, 6, 14], t: [6, 4, 5] },
  { n: 'Desde el ascensor', p: [21, 2.6, 21.5], t: [21, 2.5, 30] },
];
const ent = ENTRIES.map(e => `<li><b>${e.name}</b>: x ${e.x} · z ${e.z} (mundo x ${e.x + 3972} · z ${e.z - 13198})</li>`).join('');
export const INFO = `
<p><b>Sin controlador</b>: la sala cuelga de tu red AE2. Trae <b>${ENTRIES.length} cables densos</b> desde tu controlador, todos por el suelo, uno a cada <b>ENTRADA ME</b> (bloque cian del suelo). Canales: ${CHI}.</p>
<ul>${ent}</ul>
<p><b>Qué hace sola.</b> (1) <b>4 líneas ×5</b> (2 por lado) se reparten todo crudo que entre en tu red: 3 crudos → 10 lingotes. (2) <b>Reactor de fisión</b> de agua con <b>2 turbinas</b> pegadas: el vapor va directo, el agua vuelve y la energía entra en 2 Induction Matrix. (3) El <b>combustible</b> (uranio → yellow cake → UO₂ + HF → UF₆ → combustible) se fabrica solo cuando el reactor lo pide. (4) El <b>residuo</b> pasa a plutonio y a pellets; el <b>SPS</b> convierte polonio en antimateria para 6 <b>nucleosintetizadores</b>. (5) Dos plantas de gases, 2 de evaporación y el taller de aleaciones y circuitos.</p>
<p><b>Polonio:</b> el Solar Neutron Activator necesita <b>ver el sol</b> (lo comprueba el juego), así que dentro de la sala no funciona. Pon los que quieras fuera, con cielo y conectados a tu red: un Export Bus les manda residuo nuclear y lo que expulsan (polonio) entra por una ME Interface. El SPS lo coge de tu red.</p>
<p><b>Qué metes tú en tu red:</b> crudos, polvo de azufre, uranio, fluorita y, para el taller, hierro, cobre, osmio, carbón, redstone, diamantes y obsidiana. El agua sale de una <b>Infinity Water Cell</b> en uno de tus Drives (receta: 2 Quartz Glass, 3 cubos de agua, Cell Component 16k y 3 diamantes). Pon una celda de químicos particionada por cada gas.</p>
<ol>
<li><b>Cables tapados.</b> Los de AE2 llevan fachadas de hierro industrial; los Universal Cable, tapas de acero (Mekanism Covers). El anillo de energía va a y 5 por las paredes.</li>
<li><b>Lados.</b> Cada ficha dice qué entra por cada cara, nombrada por lo que toca (proveedor, bus, interfaz): vale igual en el lado este, que es el espejo.</li>
<li><b>Patrones.</b> ${STATS.patterns} patrones, en la sección <b>Patrones</b> o pasando el ratón por cada proveedor. Los que llevan químicos se codifican igual, arrastrando el gas desde JEI (Applied Mekanistics).</li>
<li><b>Reactor.</b> Llénalo de agua antes de encender, empieza con burn rate 1–2 mB/t y súbelo despacio.</li>
<li><b>Luz.</b> Varillas e iluminantes azul claro de Simply Light, siempre encendidos (sin redstone), y un rosetón de acero en el techo.</li>
</ol>`;
export const EXTRA_TEX = [...new Set([...Object.values(ITEMS).flatMap(i => [].concat(i.icon)), 'ae2:item/crafting_pattern', 'ae2:item/processing_pattern'])];
