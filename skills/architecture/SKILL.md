---
name: architecture
description: Cómo construir edificios, conjuntos, terreno e islas flotantes bonitos: plano, op building y feature (island, boulder, antenna, solar, dome, pad), estilos (japonés, chino, medieval, moderno, tecnológico) con tema de mod, máquinas y multibloques en su sitio, cables escondidos con route, run_code para lo grande y render_design para mirarlo.
---
# Arquitectura: el código pone la forma, tú decides qué va y dónde

Un LLM acierta menos del 30 % de la geometría que coloca a mano (MineAnyBuild). Por eso no se levantan muros, tejados ni árboles bloque a bloque. Usa las piezas hechas en código, que calculan anillos, curvas, pilares y simetría. Tu trabajo es el programa, el plano, el estilo y el tema.

## Método (en este orden)
1. **Programa y datos.** Qué piezas pide el jugador y qué va en cada una. Si dice «básate en las misiones», usa `search_quests` (sin nada para ver los capítulos; con `chapter` para los jefes, armas y premios). Objetos con `search_items` y bloques del tema con `search_blocks`.
2. **Plano del conjunto** con `plan_site`. Reparte el programa en volúmenes:
   - Edificio principal (el más alto, con el punto focal).
   - Alas o pabellones de 11 a 17 de fondo.
   - Patio o jardín entre ellos.
   - Entrada con un eje que se recorre: puerta → camino → edificio principal.
   - Nada de una caja gigante: ningún edificio de más de 41 de fondo. Deja 4 o más entre edificios para que no choquen los aleros.
   - Corrige lo que diga `plan_site` antes de construir.
3. **Construye.**
   - Una llamada de `run_code` con todo el conjunto (lo mejor para lo grande).
   - O `edit_design` con ops `building` y `feature`.
   - Las notas de `building` te dan el interior y la `y` donde se pisa: úsalos para decorar dentro con `prefab`, `arrange` y `display`.
4. **Mira el resultado** con `render_design`: desde `se` y `nw`, de frente (`front`) y por dentro (con `box` sin el tejado). Pregúntate:
   - ¿Se lee el estilo?
   - ¿Hay volúmenes de alturas distintas?
   - ¿Los tejados vuelan y tienen curva?
   - ¿Hay relieve?
   - ¿El punto focal se ve desde la entrada?
   - Si el modelo no ve imágenes, usa `view_design` en `front`/`side`.
5. **Revisa** con `review_design` y corrige los `error` y `warning`. Desvanes a oscuras: un farol cada 8.

## building
`{op:"building", name, from:[x0,y,z0], to:[x1,y,z1], estilo, height?, shape?, doors:[{side,width?,at?}], porch?, pent?, base?, ceiling?, theme?}`
- `from`/`to`: esquinas de la línea de muros. `y` es el suelo del terreno: el zócalo empieza ahí y se pisa en `y + base`.
- Hace todo:
  - zócalo y suelo;
  - muros con pilares, vigas, ventanas y ménsulas;
  - puertas con escalón;
  - techo (`ceiling: "artesonado"` para salas nobles);
  - tejado del estilo, con alero, curva y esquinas;
  - tejado intermedio en edificios altos (`pent`);
  - porche con hastial sobre la puerta (`porch`);
  - luces dentro, en el desván y bajo el alero.
- `shape`: `irimoya` (cuatro aguas abajo y hastial arriba, el templo japonés), `hip` (cuatro aguas), `gable` (dos aguas) o `flat` (moderno).
- `theme`: los materiales del mod sin perder el estilo. Lo que cambia:
  - `base` y `baseTop`: zócalo;
  - `floor`;
  - `lining`, `liningPillar` y `liningAccent`: forro interior;
  - `post`, `beam`, `infill`, `window` y `roof:{stairs,slab,block,ridge,tip,gable}`.

  Ejemplo: un ala de Cataclysm por fuera japonesa y por dentro de obsidiana: `theme:{base:"cataclysm:obsidian_bricks", lining:"cataclysm:obsidian_bricks", liningPillar:"cataclysm:obsidian_pillar", liningAccent:"cataclysm:chiseled_obsidian_bricks", floor:"cataclysm:polished_obsidian"}`.

## feature (exteriores)
| type | parámetros | qué es |
|---|---|---|
| tree | x,y,z, variant cerezo/roble/abeto/abedul/arce, size 1-3 | árbol con tronco, ramas y copa |
| pond | area [x0,z0,x1,z1], y (capa del agua), depth | estanque con borde de piedra y musgo, nenúfares |
| bridge | from, to (en línea), width, variant mangrove/spruce/stone | puente arqueado con barandilla y faroles |
| lantern | x,y,z, variant toro/farola | linterna de piedra o farola |
| torii | x,y,z (centro de abajo), width, height, axis | puerta de santuario |
| pagoda | x,y,z, floors | pagoda de 3 a 7 pisos: hito vertical |
| path | from, to, block, edge | camino con borde |
| steps | x,y,z (escalón de arriba), facing (hacia dónde baja), width, count | escalinata con zancas |
| wall | from, to, height | tapia con tejadillo |
| island | x, y (capa de la hierba), z, rx, rz, depth, seed, top, rock, ores | isla flotante orgánica: contorno irregular, hierba y tierra llanas arriba, roca que se afina abajo con estalactitas, menas y raíces. Deja `y` ≥ depth + 10 |
| boulder | x, y, z, r | roca o peñasco con musgo |
| antenna | x, y, z, height | mástil de varas del End con travesaños y pararrayos (da luz) |
| solar | x, y, z, width, depth | campo de placas solares |
| dome | x, y, z, r | cúpula de cristal con costillas de hierro |
| pad | x, y, z, size | plataforma para una máquina (huella + 1) con luces en las esquinas |

## Estilos
- **japones**: zócalo de piedra, pilares bermellón, yeso blanco, vigas oscuras, tejas de pizarra y tejado irimoya curvo con remates; farolillos de papel. Para templos, santuarios y casas tradicionales.
- **chino**: pilares y muros rojos, tejado de cobre verde con remates de oro, a cuatro aguas curvo. Para palacios y pabellones.
- **medieval**: zócalo de adoquín, entramado de abeto con paños claros, tejado a dos aguas de roble oscuro a 45°. Para posadas, granjas y aldeas.
- **moderno**: hormigón blanco y gris, ventanales, tejado plano con peto. Para museos, galerías y villas.
- **tecnologico**: zócalo de pizarra pulida, pilares de hierro, paños gris claro, ventanales cian, tejado plano. Para laboratorios, estaciones y bases de energía (Mekanism, AE2, DSP, Powah…).

## Máquinas, multibloques y cables
- Huella real: `get_block` / `inspect_mod`. Si trae `multiblock`, ocupa esa huella entera (p. ej. el EM Rail Ejector de DSP, 3×3×3; el Ray Receiver, 3×6×3) y el mod pone el resto: tú solo el controlador en el centro de abajo.
- Primero el sitio (`pad`, una sala, un claro en la isla), luego la máquina. Nunca la obra del tamaño de la caja de las máquinas: la obra manda y las máquinas entran en ella.
- Cables: `route {from,to,cable,block}` (o `route([..],[..],{cable,block})` en run_code). Con `block`, el cable va dentro de ese bloque como fachada: el suelo se ve normal. Mételos por la capa del suelo o por dentro de la roca. Cables de energía de otros mods (Powah…): `route` con `block` del cable, también por dentro.
- AE2: recubierto o denso, nunca de cristal a la vista salvo que lo pidan.
- **Por qué cara entra cada cosa**: `get_block` lo dice en `multiblock`. El EM Rail Ejector de DSP coge objetos (paquetes de vela o de rayo) y energía (40 FE/t) solo por la cara de abajo del controlador. El Ray Receiver empuja la energía solo hacia abajo. Para meter objetos y energía por la misma cara: tubería universal de Pipez (`pipez:universal_pipe`) o Laser Node. Un bus de exportación de AE2 solo mete objetos.
- **Automatización entera**: si el jugador dice de dónde llegan las cosas, el diseño lleva toda la cadena.
  - Por ejemplo: puente cuántico → cable denso → interfaz de AE2 con los paquetes en stock → tubería universal que los saca y los lleva bajo cada máquina. De la batería sale la energía, por la misma tubería.
  - Cada eslabón va en el diseño y en `explain`, con lo que hay que configurar en el juego.
- **Piezas finas** (varas del End, cadenas, barrotes): orientadas en el sentido de la línea (`facing` / `axis`), con un bloque de unión en cada giro de una curva. De lado no se unen y la revisión las da por sueltas.

## Vistas y explicación (siempre, antes de entregar)
- `zone(nombre, [x,y,z] a dónde mira, {from, cut, r})`: una por zona (la general, el punto focal, cada conjunto de máquinas) y otra con `cut` a la altura de la red enterrada para verla. Sin `from`, la cámara se pone en diagonal a `r` bloques (16).
- `explain(título, texto)`: sale en «Cómo funciona y cómo montarlo». Texto plano, frases cortas y coordenadas. Secciones:
  - Cómo funciona.
  - Qué configurar en el juego.
  - Energía.
  - Carga de chunks.
  - Lo que no se ve.

## run_code
JavaScript en un sandbox, sin red ni archivos, con 10 s de tope. Ideal para conjuntos grandes, repeticiones y formas a medida.
- **API:**
  - `set(x,y,z,id,state?)`, `del`, `get(x,y,z)` → id.
  - `box(x0,y0,z0,x1,y1,z1,id,state?)`.
  - `stair(x,y,z,id,low,{top,shape})`: `low` es hacia dónde baja el escalón. `slab(x,y,z,id,top?)` y `log(x,y,z,id,axis)`.
  - `show(x,y,z,item)`: el objeto en el expositor que hay en esa celda.
  - `building({...})`, `feature({...})` y `roof({...})`, con los mismos parámetros que en `edit_design` (devuelven la nota con el interior).
  - `route(from,to,{cable,block,order})`, `part(x,y,z,side,part)`, `zone(...)` y `explain(...)`.
  - `print(...)`.
- Los ids se comprueban al final; la respuesta dice qué falló.
- Deja 3 o 4 de margen alrededor (aleros y escalones): nada por debajo de 0.

```js
// templo: sala principal al norte, dos alas, portón al sur, patio con estanques, pagoda y torii fuera (≈ 63 × 83)
box(0, 0, 0, 62, 0, 82, 'minecraft:grass_block');
box(2, 1, 2, 60, 2, 66, 'minecraft:stone'); box(2, 3, 2, 60, 3, 66, 'minecraft:gravel');                  // podio
print(building({ name: 'Sala principal', from: [11, 4, 6], to: [51, 4, 26], estilo: 'japones', height: 11, base: 2, porch: 'south', ceiling: 'artesonado', doors: [{ side: 'south', width: 5 }] }));
print(building({ name: 'Ala oeste', from: [4, 4, 31], to: [16, 4, 59], estilo: 'japones', height: 8, doors: [{ side: 'east' }], theme: { base: 'cataclysm:obsidian_bricks', lining: 'cataclysm:obsidian_bricks' } }));
print(building({ name: 'Ala este', from: [46, 4, 31], to: [58, 4, 59], estilo: 'japones', height: 8, doors: [{ side: 'west' }] }));
print(building({ name: 'Portón', from: [21, 4, 57], to: [41, 4, 65], estilo: 'japones', height: 7, base: 0, doors: [{ side: 'north', width: 5 }, { side: 'south', width: 5 }] }));
feature({ type: 'path', from: [29, 3, 27], to: [33, 3, 66] });
feature({ type: 'pond', area: [19, 33, 25, 53], y: 3 }); feature({ type: 'bridge', from: [19, 4, 45], to: [25, 4, 45] });
for (const [x, z] of [[21, 31], [41, 31]]) feature({ type: 'tree', x, y: 4, z });
feature({ type: 'steps', x: 31, y: 3, z: 67, facing: 'south', width: 9, count: 3 });
feature({ type: 'torii', x: 31, y: 1, z: 76, width: 11, height: 8 }); feature({ type: 'pagoda', x: 12, y: 1, z: 74 });
```
Después decora cada interior con lo que diga su nota (`interior [x0,z0,x1,z1]`, `se pisa en y=…`), con `prefab`/`arrange`/`display` o con más `run_code`.

## Recetas de conjunto
- **Isla flotante con máquinas** (p. ej. de un mod de energía):
  - `feature island` grande (rx/rz 20-30) con `y` alto.
  - Nada se sale del borde: el contorno es irregular y en el borde la hierba baja. Antes de colocar algo, mira con `get(x, y-1, z)` que haya isla bajo toda su huella (aleros incluidos) y deja 2-3 de margen. Si no la hay, muévelo hacia dentro.
  - Arriba, claros con `pad` para cada máquina repartidos sin simetría rígida (en arco, en racimo, a distintas alturas con escalones), un camino entre ellas, y la máquina principal en el punto focal.
  - Decoración del tema: antenas, placas solares, una cúpula de laboratorio, luces de varas del End, los objetos del mod en pedestales.
  - Cables y tuberías por dentro de la roca con `route`, hasta la cara de cada máquina por la que entra lo que necesita.
  - Una vista por zona, otra con `cut` para la red de abajo y `explain` con la configuración.
  - Por debajo, la isla ya trae estalactitas y menas: añade, si pega, una cascada (agua en el borde) o cristales del mod.
- **Templo o santuario (japonés/chino)**:
  - Podio de 2-3.
  - Sala principal al fondo del eje (irimoya, `pent`, porche, artesonado).
  - Alas a los lados, portón en el eje.
  - Patio con camino central, estanques con puente, cerezos y tōrō.
  - Fuera, torii y pagoda a un lado (asimétrica, como en Hōryū-ji).
- **Castillo**: muralla (`wall` alto o `building` estrecho y largo) con torres en las esquinas (`building` 7 × 7 alto con `hip`), torre del homenaje en el centro, patio de armas, puerta con escalinata.
- **Aldea medieval**: casas de 7-11 × 9-13 (`medieval`, `gable`) a lo largo de un camino curvo, plaza con pozo, granja y árboles; cada casa con un giro o tamaño distinto.
- **Mansión o villa**: cuerpo central más alto con porche y dos alas más bajas, jardín delantero simétrico con camino y estanque.
- **Museo o galería (moderno)**: volúmenes rectangulares de alturas distintas unidos por un vestíbulo acristalado, patio con agua.
- **Sala de trofeos**: cada tema en su edificio o ala, con su forro interior. La pieza estrella en la sala principal sobre un estrado, rodeada de las piezas de su receta. La progresión, en un camino que se recorre.

## Errores típicos (los que salieron en la caja de 56 × 65)
- Todo dentro de un solo volumen con tejado plano: se ve una caja. Parte el programa en volúmenes y usa tejados con pendiente.
- Luces a la vista sobre el tejado (glowstone): faroles colgados bajo el alero y luces dentro.
- «Japonés» puesto solo con tatami y farolillos: el estilo lo dan el tejado curvo, la estructura de pilares y vigas, el zócalo y el jardín.
- Decir que te basas en las misiones sin leerlas: usa `search_quests`.
