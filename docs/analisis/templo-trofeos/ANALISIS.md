# Templo de los Trofeos: cómo lo generó Claude y en qué se diferencia de los agentes

Encargo, el mismo que recibieron los agentes el 2026-11-12 (diseño `rRkbPWsdreZR`, «Sala de logros»):

> Una sala de trofeos con pedestales para las armas de los jefes, objetos únicos de conseguir en el modpack, progresión de ores, etc. Básate en las misiones para ver qué es importante. Debe ser muy grande, al menos 50x50.
> → Superficie (edificio independiente)
> → Temático por ala (cada zona con los materiales de su mod: Cataclysm, Twilight, ATM…) pero además con decoración exterior japonesa/china

Este documento cuenta el proceso real, incluido lo que solo pude hacer yo, para compararlo con los agentes. El código del generador está en esta carpeta (`templo.mjs`, `arch.mjs`, `lib.mjs`, `sec.mjs`) y las capturas, en `capturas/`. Para ejecutarlo hacen falta, junto a `lib.mjs`, los índices `blocks-atm10a.json` e `items-atm10a.json` (copia de `index/` del workspace) y lanzarlo desde `server/` (`node …/templo.mjs --review`).

## 1. Resultado

| | Agentes (`rRkbPWsdreZR`) | Claude (Templo de los Trofeos) |
|---|---|---|
| Medidas | 56 × 20 × 65 | 63 × 35 × 85 (podio de 59 × 65) |
| Bloques | 11 623 | 32 692 |
| Objetos expuestos | 53 | 126 |
| Forma | una caja con tejado plano de losas y glowstone encima | recinto de templo: podio, sala principal con tejado irimoya, dos alas, portón con dos salas, patio con estanques y puentes, pagoda de 5 pisos y torii |
| Japonés | tatami, faroles de papel y bambú sueltos | tejados curvos con esquinas levantadas y remates dorados, pilares bermellón, yeso blanco con vigas oscuras, ménsulas, cerezos, estanques con nenúfares, puentes arqueados rojos, linternas de piedra, pagoda y torii |
| ATM | 4 objetos y un podio | sala entera: la Estrella ATM elevada en el centro, con sus 9 ingredientes en anillo; altar con el trofeo de ATM entre bloques de estrella; columnas de allthemodium, vibranium y unobtainium; 30 pedestales en las naves (metales, aleaciones, plantillas, estrellas previas, objetos creativos, herramientas y armaduras) |
| Cataclysm | 20 armas sueltas en pedestales de espada | 8 jefes por estación: arma, ojo y segundo trofeo sobre un plinto del material del jefe (ignitio, witherita, cursio…), más minijefes, altares de invocación, estatua de la diosa y forro interior de obsidiana |
| Twilight | 9 trofeos | 9 jefes en orden de progresión: trofeo sobre su pedestal y 2 recompensas, un portal del Crepúsculo de decoración, la mesa de desfabricar y armas de gigante |
| Progresión | 15 menas en fila | camino del portón a la Estrella: 11 escalones (carbón → unobtainium), cada uno con la mena y el lingote sobre un plinto de su bloque, para recorrerla andando |
| Otros jefes | — | portón: Wither, Dragón, Warden y Deeper Darker en una sala; Aether, Ice and Fire y Draconic en la otra |
| Nota de `review_design` | 91 | 64 (ver §5: la revisión puntúa al revés) |

## 2. Cómo lo generé, paso a paso

1. **Leí el resultado de los agentes** en la base de datos de producción, solo lectura.
   - Es una caja de 56 × 65 con el tejado de losas de roble oscuro y glowstone encima.
   - El turno se cortó por saldo agotado (402 de DeepSeek) y siguió tras «continúa».
   - Los pasos de los agentes (llamadas a herramientas) no se guardan: solo queda el mensaje final.
2. **Leí las misiones del modpack** (`config/ftbquests`, 67 capítulos, títulos en español).
   - Capítulo de la Estrella ATM: sus 9 ingredientes (`allthetweaks:*`), las estrellas previas y las recompensas creativas.
   - Capítulo de Cataclysm: 35 tareas de matar y el mapa jefe → estructura → ojo → arma, según los títulos («Herrería del Alma: Hogar de la Monstruosidad de Netherita»…).
   - Twilight, Aether, Deeper and Darker, Ice and Fire y Draconic: sus jefes y objetos.
   - **Los agentes no tienen ninguna herramienta que lea las misiones.** Su respuesta dice «me basé en las misiones», pero no pudieron hacerlo.
3. **Datos reales del pack del usuario (ATM10A).**
   - Índices de bloques (39 078) y objetos (43 117). Cada id del diseño se comprueba contra ellos: todos existen.
   - Busqué los mods de decoración que hay: Macaw's (tejados, faroles de papel), Chipped (farolillos rojos), Supplementaries y Handcrafted.
   - Busqué las familias de cada tema: obsidiana de Cataclysm, castillo de Twilight y piedra antigua de ATM.
4. **Muestrario en el visor antes de construir.**
   - Puse en el visor unos 60 bloques candidatos y los miré con capturas.
   - Los farolillos de papel de Macaw's y Chipped se ven bien. Los paneles de cristal no se ven. Los trofeos de Twilight salen como cubos marrones.
   - Así elegí solo materiales que se ven bien en el visor y en el juego.
5. **Piezas de arquitectura en código** (unas 160 líneas en `arch.mjs`):
   - Tejado cóncavo: los primeros anillos suben medio bloque (losa, escalera…) y luego uno entero. Lleva esquinas levantadas, esquinas exteriores con la forma de escalera correcta, irimoya (faldón a cuatro aguas abajo y hastial arriba), cumbrera con remates y sentido elegible.
   - Muro japonés: pilares cada 4, durmiente, viga intermedia y de cabeza, paños de yeso, banda de shoji y ménsulas bajo el alero.
   - Linterna de piedra, cerezo y pagoda.
   - Cada pieza se probó sola en un pabellón de prueba antes de usarla.
6. **Plan del conjunto** con coordenadas de cada volumen antes de colocar nada.
   - Partí de un tipo conocido: el recinto de templo (garan), con podio, sala principal al norte, alas a los lados, portón al sur, patio con eje y torii fuera.
   - Le di un relato: entras por el torii, cruzas el portón y subes por la progresión de menas hasta la Estrella.
   - Cada ala tiene su punto focal enfrente de la puerta.
7. **Iteraciones con capturas.** Unas 6 rondas de render desde 8 cámaras (general, entrada, patio, sala, cada ala, tejados), corrigiendo lo que se veía mal:
   - escaleras del revés;
   - cumbrera como muro macizo;
   - agua blanca y hierba gris;
   - puentes pesados;
   - huecos entre muro y tejado;
   - faroles fuera del alero;
   - salas con las vitrinas tapando la puerta;
   - desvanes oscuros, donde aparecerían monstruos;
   - puntas de alero sueltas.
8. **Comprobación final.**
   - `validate_design` sin colisiones.
   - Exportación a .nbt (102 KB, sin bloques omitidos) con los estados correctos: escaleras con facing, half y shape; troncos con eje; faroles colgados; botones en el suelo.
   - Luz en desvanes y aleros.
   - Lo que queda «a oscuras» son tejados de la pagoda y césped bajo un cerezo.

El paso de bloques al diseño usa la herramienta real de los agentes: `runTool('edit_design')` con ops `place` y `display`, en tandas de 2000. Lo distinto es cómo se decide qué bloque va en cada celda.

### Lo que hice y los agentes no pueden hacer

Lo pongo para que la comparación sea honesta.

- **Escribir y ejecutar código.** La geometría (curvas, anillos, simetría, coordenadas) la calculan funciones, no el modelo celda a celda.
- **Ver renders.** Los agentes solo tienen la planta ASCII y `review_design`.
- **Leer las misiones.** No hay herramienta para eso.
- **Corregir el motor.** Arreglé en local el giro de las escaleras en `tools.js` (sin desplegar). Además retoqué datos que `edit_design` no deja tocar: tinte de agua y hierba, `WALLS`, vistas de cámara (`ZONES`) y el tamaño de los pétalos.
- **Partir de un contraejemplo.** Vi antes el resultado malo.

## 3. Por qué salió mal lo de los agentes

| Causa | Qué pasó | Qué hice yo |
|---|---|---|
| Sin datos de misiones | Eligieron objetos «emblemáticos» a ojo; ATM se quedó en 4 piezas | Leer los capítulos y sacar la lista de jefes, armas e ingredientes |
| Programa metido en una caja | Una sola sala de 56 × 65 con todo dentro: sin escala, sin fachada, tejado imposible | Partir el programa en edificios de 13 a 41 de ancho, cada uno con su tejado, alrededor de un patio |
| Sin vocabulario de estilo | «Japonés» se quedó en tatami y farolillos; el tejado salió plano y con glowstone | Piezas de estilo en código: tejado curvo, irimoya, muros con estructura, ménsulas, torii, pagoda, tōrō |
| Geometría hecha por el LLM | Las escaleras miran todas igual y se mezclan materiales al azar | La geometría la calcula el código y el modelo decide a grandes rasgos (es la idea de Holodeck y VibeCraft; MineAnyBuild mide menos del 30 % de acierto espacial en LLM) |
| Sin ver el resultado | No pudieron notar que el visor dibujaba las escaleras del revés | Render, captura y corrección, en bucle |
| Revisión engañosa | 91/100 para la caja; ninguna alarma por tejado plano ni por fachada monótona | Juicio visual y comprobaciones funcionales (luz, colisiones, .nbt) |
| Fragilidad | Se quedó sin saldo a mitad del turno y lo retomó sin plan | — |

## 4. Fallos del motor encontrados

Afectan a cualquier diseño de los agentes.

| Fallo | Efecto | Estado |
|---|---|---|
| El giro de las escaleras con estado (`variant` en `tools.js`) suma 180° de más, porque el facing de una escalera es su lado alto | En el visor se ven del revés, con huecos en los tejados; en el juego están bien | **Corregido en local** (`server/src/llm/tools.js`), sin desplegar |
| Escalera sin estado: el índice toma la primera variante del blockstate (`stairs_inner`) | Toda escalera colocada sin `state` se ve como esquina interior | Pendiente: estado por defecto `shape: straight, half: bottom` |
| Tronco sin estado: el índice toma `log_horizontal` | Los pilares se ven tumbados en el visor, aunque en el juego salen de pie | Pendiente: `axis: y` por defecto |
| `edit_design` no pone `WALLS`, y el visor trata los bordes del diseño como paredes de sala | La capa más alta (cumbreras, remates) y las cuatro caras exteriores desaparecen al mirar desde fuera | Pendiente: `WALLS` lejano en diseños que no son una sala, o autowall solo en salas |
| Sin tinte de bioma | La hierba se ve gris y el agua blanca (el modelo de fluido no trae `tintindex`) | Pendiente: tinte por id y agua como cubo con tinte |
| Tamaño de `pink_petals` en el índice: 1×1×2 con desplazamiento | Colisiones falsas en `validate_design` | Pendiente: revisar `size`/`offset` del indexador para plantas planas |
| Estados que no cambian el modelo se pierden (`keyFor` descarta props sin variante) | No se puede fijar `persistent` en hojas, `face` en algunos bloques… | Pendiente: separar «estado exportado» de «modelo del visor» |
| La op `place` usa `facing` como f (lado bajo de la escalera), al revés que Minecraft | Confunde a los modelos | Pendiente: aceptar solo `state.facing` con significado de Minecraft, o documentarlo con ejemplos |
| Los pasos de los agentes no se guardan | No se puede analizar por qué falló un turno | Pendiente: guardar la traza de herramientas por turno |

## 5. `review_design` puntúa al revés

- Caja plana con glowstone: **91**. Templo: **64**.
- Lo que baja la nota del templo no son fallos:
  - desvanes «encerrados»;
  - pedestales de trofeo de Twilight «vacíos», porque el trofeo va encima, no dentro;
  - «104 materiales» en un recinto con cinco temas;
  - tejados de la pagoda contados como «suelo interior oscuro».
- Lo que no mira:
  - tejado plano en un edificio grande;
  - caja sin articular (huella enorme, una sola altura);
  - fachada sin relieve;
  - fuentes de luz feas a la vista (glowstone en el tejado);
  - escaleras que no siguen la pendiente;
  - legibilidad del estilo pedido.

## 6. Qué cambiaría si gana esta versión

Por orden de impacto:

1. **Kit de arquitectura en código, como ops de `edit_design`.** Es lo que decía el usuario con «necesitamos algo más aparte de agentes».
   - `building`: podio + muros con estructura (pilares, vigas, ventanas, puertas) + tejado (irimoya, cuatro aguas, dos aguas; curva, vuelo, esquinas, remates) + tejado intermedio + porche.
   - `roof`: sustituir el actual por el de `arch.mjs`.
   - Jardín: `pond` (con borde y nenúfares), `bridge`, `lantern` (tōrō), `tree` (cerezo, pino, arce), `pagoda`, `gate` (torii, portón), `path`.
   - **Estilos como datos**: japonés, medieval, gótico, moderno, industrial… Cada estilo con sus materiales por rol, proporciones y piezas típicas, para que el modelo diga «japonés» y el código ponga cómo.
2. **Etapa de plano del conjunto** (`plan_site` / `build_plan`).
   - El arquitecto escribe un JSON con volúmenes: rectángulo, alto, uso, estilo, eje y punto focal.
   - El código lo valida (solapes, separación, luz máxima por edificio, accesos) y lo construye.
   - Así el LLM decide relaciones, no coordenadas sueltas, y desaparece la «caja gigante».
3. **`search_quests`**: capítulos, tareas de matar y de objeto, títulos en el idioma del jugador.
   - Con eso salen listas de trofeos (jefe → arma, ojo, recompensa) y la progresión real.
4. **Arreglos del motor del §4**, empezando por el giro de escaleras (ya hecho) y los estados por defecto.
5. **Revisión nueva.**
   - Nota por zona.
   - Comprobaciones estéticas: tejado plano, caja sin articular, fachada monótona, luces a la vista, escaleras contra la pendiente.
   - Sin los falsos positivos del §5.
   - Desvanes: pedir luz, no avisar de «encerrado».
6. **Ver el resultado.**
   - Capturas del visor en el servidor (vistas fijas) para los modelos que ven imágenes.
   - Para los que no, alzados ASCII con la silueta del tejado.
7. **Skill de estilo japonés** (y otras): piezas, proporciones, paletas con ids comprobados y errores típicos. El arquitecto la precarga cuando el encargo lo pide.
8. **Guardar la traza** de herramientas de cada turno y presupuestar el turno, para no cortarse a mitad sin plan.

## 7. Lo que no está comprobado

- Construido en el juego con BuildGolem Link: no lo he probado.
- En el visor local los trofeos de Twilight y algunos bloques con renderizador propio (estatua de la diosa, altares) se ven como cubos. En el juego tienen su forma.
- El visor local usa el pack ATM10 de ejemplo. El diseño se comprobó contra el índice de bloques y objetos de ATM10A, pero los modelos los resuelve el servidor con el pack de cada uno.
- Coste: lleva bloques caros a propósito, porque es una sala de trofeos: 2 de netherita, 2 de unobtainium, 2 de diamante, etc. (plintos de la progresión) y 3 columnas de metales ATM.

## 8. Lo que ya se ha cambiado en los agentes (2026-11-12, sin desplegar)

Tras elegir el usuario el templo, y con su idea de que los agentes ejecuten código y vean el resultado:

| Cambio | Dónde |
|---|---|
| **`run_code`**: el agente escribe JavaScript que se ejecuta en un sandbox (QuickJS en WebAssembly: sin archivos, red ni procesos; 10 s y 128 MB). API: `set`, `box`, `stair`, `slab`, `log`, `get`, `show`, `building`, `feature`, `roof` y `print`. Lo que construye pasa por `edit_design` (ids, estados y expositores comprobados) | `server/src/design/sandbox.js`, `tools.js` |
| **`render_design`**: imagen PNG del diseño con los modelos y las texturas reales del pack (isométrica desde las 4 esquinas, alzados y planta, z-buffer), sin dependencias. Va al modelo como imagen (OpenAI y Anthropic). Si el modelo no admite imágenes, se reintenta sin ellas y se le dice que use `view_design`. La web enseña en el chat lo que está mirando el agente | `server/src/design/render.js`, `agent.js`, `providers.js`, `web/src/sim/Chat.jsx` |
| **Kit de arquitectura** en código: tejado curvo (irimoya, cuatro aguas, dos aguas; perfil curvo, 45°, suave, empinado; esquinas levantadas; cumbrera y remates), muros con estructura, `building` (zócalo, muros, puertas con escalón, forro del tema, artesonado, tejado, tejado intermedio, porche, luces dentro, en el desván y bajo el alero), jardín (`tree`, `pond`, `bridge`, `lantern`, `torii`, `pagoda`, `path`, `steps`, `wall`). Estilos como datos: japonés, chino, medieval y moderno, con `theme` para el mod | `server/src/design/arch.js`; ops `building` y `feature` en `edit_design` |
| **`plan_site`**: valida el plano del conjunto (cajas demasiado grandes, edificios que se pisan, aleros que chocan) y lo dibuja | `arch.js`, `tools.js` |
| **`search_quests`**: lee FTB Quests del pack (capítulos, misiones, jefes a matar, objetos y premios, con los títulos en el idioma del jugador) | `server/src/workspace/quests.js` |
| **Motor**: giro de escaleras con estado; variante por defecto de Minecraft (escalera recta, tronco de pie…) en vez de la primera del archivo; tinte de hierba y hojas; agua visible; plantas planas de 1×1×1; `WALLS` en exteriores para que el visor no oculte cumbreras ni fachadas | `tools.js` |
| **`review_design`**: tejado plano en edificio grande (error), volumen sin articular, luces a la vista en la cubierta; desvanes iluminados ya no penalizan; trofeos sobre su pedestal no son «expositores vacíos»; materiales por zonas de 16 × 16. Resultado: la caja de los agentes baja de 91 a 71 y el templo sube de 64 a 86 | `server/src/design/inspect.js` |
| **Traza de cada turno** guardada en el chat (herramientas, argumentos y resultados de los últimos 10 turnos) | `server/src/routes/agents.js` |
| **Agentes**: el arquitecto planifica, construye con código, se mira en imagen y revisa (40 pasos, precarga la skill `architecture`). El director pide estilo y misiones y mira la imagen al final. Diseñador y validador ven imágenes; el diseñador también ejecuta código | `agents/*.md`, `skills/architecture`, `skills/ask-constraints`, `skills/decor` |

Prueba: con unas 25 líneas de `run_code` usando el kit (`building` × 4, estanques, puentes, cerezos, faroles, escalinata, torii y pagoda) sale un recinto como el templo en 1,1 s, y `render_design` lo enseña en otro 1,1 s. Tests: 44/44.

Sin comprobar todavía: un turno real con un modelo (no hay claves en local), y en el juego, lo que construye el kit.
