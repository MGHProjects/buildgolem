# Isla Dyson: la de Claude frente a la de los agentes (2026-11-13)

Mismo encargo, palabra por palabra:

> Crea una isla flotante para el mod dyson sphere program. No debe ser necesariamente enorme pero si tener buen espacio y dcoracion, debe tener multiple disparadores (las torretas que disparan los beams y sails del mod y únicamete 1 recibidor de energía con un bloque de energía debajo del POWAH (ender cell). Decoralo para que tenga algo que ver con el mod y pon un portal cuantico del AE2 por el que le llegarán objetos a las torretas.

- **Agentes**: el diseño `USqhTXwtGNR-` de producción (`agentes-se.png`).
- **Claude**: `isla_claude.mjs`, hecho con las mismas herramientas que tienen ahora los agentes: un `run_code` con `feature`, `building`, `route` y `part`, y después `render_design`, `review_design` y `validate` (`claude-se.png`, `claude-sw.png`, `claude-front.png`).

`isla_agente.mjs` y `dyson-*.png` son otra cosa: la prueba de las herramientas nuevas de la ronda anterior.

## Números (medidos hoy con el mismo código)
| | Agentes | Claude |
|---|---|---|
| Tamaño (x × alto × z) | 17 × 18 × 19 | 111 × 63 × 85 (isla de 69 × 55 y 2 islotes) |
| Bloques | 2 198 | 68 275 |
| Bloques por debajo de la superficie | capas cuadradas de piedra negra | 52 683: roca que se afina, estalactitas, menas, amatista y bayas brillantes colgando |
| Disparadores / receptor / Ender Cell debajo | 6 / 1 / sí | 6 / 1 / sí |
| Portal cuántico | 8 anillos + enlace | 8 anillos + enlace, el cable entra por un anillo de arista |
| Ancla espacial (el puente necesita cargadas sus dos puntas) | no | sí, dentro de la caseta «Nodo AE2» |
| Cables | 101, ninguno con fachada; 16 a la vista | 139, todos dentro de un bloque como fachada; 0 a la vista |
| Buses de exportación a las torretas | 6 | 6, cada uno debajo de su torreta |
| Objetos del mod a la vista | 0 | 2 (paquetes de vela y de rayo en pedestales junto al portal) |
| Validación | 0 errores | 0 errores |
| Revisión | 70: tejado plano, 66 luces encima de la cubierta, 16 cables a la vista, pirámide de cajas | 98: un aviso informativo de materiales |

## Qué hice yo que no hicieron los agentes
1. **Convertí el encargo en una lista** antes de empezar: isla flotante, buen espacio sin ser enorme, decoración del mod, varias torretas, un solo receptor con la Ender Cell debajo, y un portal cuántico que alimenta las torretas. Al final repasé cada punto contra la imagen y contra el recuento de bloques.
2. **Busqué los datos del mod antes de colocar nada**:
   - Qué gastan las torretas: los paquetes de vela y de rayo, y sus recetas.
   - Cuánto ocupan de verdad: los multibloques de 3×3×3 y de 3×6×3, sacados del jar.
   - Las reglas del puente cuántico:
     - el cable solo entra por los 4 anillos de arista;
     - lleva 32 canales, así que va con cable denso;
     - sus dos puntas tienen que estar cargadas.
   Los agentes gastaron unas 50 llamadas buscando un manual que DSP no tiene.
3. **Primero el terreno y después las máquinas.** Los agentes colocaron primero las máquinas (un hexágono de radio 7) y luego «rellenaron alrededor», y la isla salió del tamaño de la caja de las máquinas. Yo hice primero una isla grande e irregular con su parte de abajo, y le añadí dos islotes satélite.
4. **Una historia en el plano.** Se lee de norte a sur:
   - el portal y el nodo AE2, por donde llegan los objetos;
   - la red escondida bajo tierra;
   - la terraza en media luna con las 6 torretas mirando al cielo.

   El receptor está en el centro, en un estrado de tres escalones con un anillo de cobre. Al estrado llegan unos conductos de rejilla de cobre como si le llevaran la energía.
5. **La decoración explica el mod**:
   - un monumento a la esfera de Dyson: un sol de froglight dentro de tres anillos de varas, con velas de cristal azul colgadas del ecuador;
   - los paquetes que viajan por el portal, expuestos junto a él;
   - un observatorio con cúpula, antenas y campos de placas solares.

   Los agentes usaron hormigón cian y blanco, y torres y arcos añadidos para callar la revisión.
6. **La logística funciona.** Del anillo de abajo del portal sale cable denso, que baja bajo tierra. De ahí sale una rama a cada torreta, que sube hasta un bus de exportación justo debajo de ella, y otra rama va al ancla. Todo el cable va dentro de piedra, como fachada.
7. **Luz contra los monstruos**: farolas por toda la isla y los islotes, y faroles bajo los voladizos del arco. La revisión no encuentra ninguna celda a oscuras.
8. **Comprobé y corregí mis propios fallos.** No salí bien a la primera; lo que me salvó fue medir:
   - **Estrado con escalones a medias.** Mi función de anillos usaba coordenadas con decimales, así que faltaban escalones y 2 varas quedaban sueltas. Lo detectó la revisión («flotan»).
   - **Una torreta pisada.** Un campo de placas solares colocado después pisó una de las 6 torretas. Lo detectó la validación, que contó 5. Es justo lo que `plan_site` evita, y no lo usé. Añadí al código una comprobación final de que ninguna máquina ha sido pisada.
   - **Plantas dentro del multibloque.** La hierba y las flores de la isla quedaban dentro de la huella de 3×3×3 de las torretas, y en el juego impedirían que se formara el multibloque. Lo detectó la validación.

## Cambios en el código de esta ronda (sin desplegar)
- **`pad`** (`arch.js`) quita la hierba y las flores que haya encima, para que el multibloque quepa. Solo las plantas, para no borrar una máquina colocada antes.
- **Revisión** (`inspect.js`):
  - La hierba, la roca natural, las plantas y las piezas finas no cuentan como tejado.
  - Las azoteas planas que se piden con `building` no cuentan como «caja» (`FLATROOFS`).
  - Una escultura de luz (con luz encima o debajo) no cuenta como «luces sobre el tejado».
  - Corregido un fallo de este mismo cambio: `lantern` también atrapaba `sea_lantern`, y la isla de los agentes pasaba de 70 a 84 sin motivo. Lo cubre un test, que falla con el fallo y pasa con la corrección.

## Qué les falta todavía a los agentes (propuestas, sin hacer)
- **Avisar al pisar una máquina.** Que `run_code` avise si una pieza posterior pisa un bloque de mod ya colocado, con un aviso del tipo «el campo solar pisó em_railejector_controller en 78,61,56». A mí me pasó, y a un agente le pasaría igual.
- **Un recuento frente al encargo.** Que `run_code` devuelva cuántas máquinas de cada mod quedan, para comparar con lo pedido («múltiples», «únicamente 1»).

Sin comprobar en el juego: la orientación del cañón y del receptor, y si el mod forma los multibloques con lo que tienen alrededor.

## Segunda ronda: lo que vio el jugador (2026-11-13)
Ni mi isla ni la de los agentes estaban bien en cuatro cosas. Esto es lo que había detrás y cómo se arregló.

| Queja | Causa real | Arreglo |
|---|---|---|
| No hay cables hacia los disparadores | **Disparador:** según el jar (`DysonCubeProject`, registro de capacidades), coge objetos **y** energía solo por la cara de abajo del controlador. Los bloques de estructura solo pasan energía, y solo el de encima del controlador, que queda encerrado. **Diseños anteriores:** los dos tenían un bus de exportación de AE2 bajo cada disparador, que solo da objetos, así que no había energía. En el visor, además, la fachada lo tapaba y no se veía. | **Isla:** portal → cable denso enterrado → interfaz ME en el Nodo AE2 → tubería universal de Pipez (lleva objetos y FE) → la cara de abajo de cada disparador; la energía sale de la Ender Cell por la misma tubería (`claude-red.png`). **Herramientas:** `ber.js` guarda por qué cara entra cada cosa, y `edit_design` avisa si debajo de una máquina no hay lo que necesita. |
| Estructuras flotando | 94 varas del End de la esfera, todas mirando hacia arriba: en un anillo horizontal se tocan de lado y se ven sueltas. La revisión solo buscaba bloques sin ningún vecino. | **Isla:** armazón de cubo (el mod es Dyson Cube Project), con varas a lo largo de cada arista, nodos de cobre en las esquinas y una cruz que lo cuelga de la cadena (`claude-cubo.png`). **Validación:** busca grupos sueltos; una vara o una cadena solo une por su punta. |
| End rods mal colocadas | **Diseño:** era lo mismo de arriba. **Visor:** de cada variante del blockstate solo se usaba el giro `y`, así que una vara, una cadena o un tronco tumbados se pintaban de pie. | El giro `x` (y el `y` de los bloques sin `facing`) va en la referencia del modelo, `modelo@x90y90`, y el lector lo aplica para el visor y para `render_design`. |
| Faltan explicaciones y cámaras | Los agentes no podían poner ni vistas ni texto en «Cómo funciona». | **Herramientas:** ops `zone` (con `cut` para ver lo enterrado) y `explain`, que se guarda en texto plano y se pinta escapado. Sin vistas propias, el diseño trae una vista general que encuadra la obra. **Agentes:** arquitecto, diseñador y director las piden antes de entregar. **Isla:** 7 vistas y 5 secciones (cómo funciona, qué configurar, energía, carga de chunks y lo que no se ve). |
| Placas solares y Nodo AE2 «flotando» (sin bloque sólido debajo) | Se salían del borde de la isla, que es irregular y en el borde baja: tenían columnas sin nada debajo. Como seguían unidos a la isla, la detección de piezas sueltas no los veía. | **Validación:** en un diseño con terreno avisa de las «columnas de obra sobre el vacío» (el primer bloque de la columna es obra y no hay nada debajo). **Isla:** el script comprueba que hay isla bajo toda la huella, con margen y aleros, antes de colocar, y busca sitio si no la hay. Portal y nodo, 3 hacia el sur; cubo, 6 hacia el norte; placas y antena, donde caben. **Agentes:** misma regla en el arquitecto y en la skill. |

Sin comprobar en el juego:
- si Pipez saca la energía de la Ender Cell sin tocar la configuración de sus caras;
- el botón de suscripción a la esfera del receptor y de los disparadores (solo se sabe por el nombre de la clase);
- que el puente cuántico comparta la energía de AE2 entre las dos puntas.
