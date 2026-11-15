# Isla Dyson: qué falló con las herramientas nuevas y qué se ha cambiado (2026-11-13)

Encargo del jugador (diseño `USqhTXwtGNR-`): isla flotante para Dyson Sphere Program, con buen espacio y decoración del mod, varios disparadores, un solo receptor con una Ender Cell de Powah debajo, y un portal cuántico de AE2 por el que llegan los objetos.

## Qué falló (leído en la traza del turno)
| Causa | Efecto |
|---|---|
| El director mandó primero las máquinas (diseñador, hexágono de radio 7) y luego pidió al arquitecto «rellenar alrededor sin tocar ninguna celda» | La isla salió del tamaño de la caja de las máquinas (17 × 19) |
| No había pieza de terreno | El arquitecto hizo la isla con capas cuadradas: una pirámide escalonada, sin hierba ni nada debajo |
| La revisión era de edificios | En la isla daba «No se puede entrar» y «Tejado plano»: el agente añadió arcos y torres azules para quitar los avisos, y empobreció la paleta para bajar los «materiales» |
| Cables sin fachada | 54 de 101 cables (AE2 y Powah) a la vista |
| Los bloques de DSP no tienen modelo (los dibuja el mod con piezas) | Se veían como un cubito y el índice decía 1×1; en el juego son multibloques de 3×3×3 y 3×6×3 |
| DSP no trae manual | El investigador gastó unas 50 llamadas buscándolo |
| Nadie comparó la imagen con el encargo | El arquitecto y el director vieron la imagen y la dieron por buena |

## Qué se ha cambiado
- **Bloques que dibuja el mod** (`server/src/design/ber.js`): piezas y huella real sacadas del jar (javap de sus renderizadores). El lector de modelos acepta piezas desplazadas (`modelo@dx,dy,dz`). `get_block` dice el tamaño real y cómo colocarlo.
- **Terreno** (`arch.js`): `feature island` (contorno irregular, hierba y tierra llanas arriba, roca que se afina abajo con estalactitas, menas y raíces) y `boulder`. Piezas tecnológicas: `antenna`, `solar`, `dome`, `pad`. Estilo `tecnologico`.
- **Cables**: op `route` (y `route()`/`part()` en `run_code`) que mete el cable AE2 dentro de un bloque como fachada, o pasa cualquier otro cable por dentro.
- **Revisión según el tipo de obra** (edificio, sala, terreno): en terreno no pide puerta, tejado ni simetría. Avisa de cables a la vista y de la «pirámide de cajas». La paleta pasa a sugerencia. Cualquier sitio al aire libre cuenta como acceso. Resultado: la isla de los agentes baja a 52 y la hecha con las piezas nuevas sube a 96.
- **`inspect_mod`**: todo lo de un mod en una llamada (bloques con su huella, objetos, piezas de modelo, recetas, si tiene manual, config, misiones).
- **Agentes**: los encargos temáticos con pocas máquinas los lleva entero el arquitecto (terreno primero, máquinas después). Cables siempre escondidos. La revisión no manda sobre el encargo. Antes de responder, cada frase del jugador se comprueba contra la imagen. El investigador empieza por `inspect_mod`, con un tope de unas 10 llamadas.
- **Traza**: se guarda el modelo de cada turno y hasta 600 pasos.
- `run_code` señala la línea del error en el código del agente.

## Prueba
`isla_agente.mjs` hace el encargo por el mismo camino que un agente (un `run_code` de unas 40 líneas, `render_design` y `review_design`): isla de 65 × 51, 6 torretas en arco, receptor con la Ender Cell debajo, portal cuántico con camino y objetos del mod en pedestales, cúpula, antenas, placas solares, farolas y árboles. Todos los cables AE2 van escondidos. Revisión: un aviso real (2 celdas oscuras bajo las placas). Capturas en esta carpeta.

Sin comprobar: un turno real con un modelo, y en el juego la orientación del cañón y del receptor y si el mod forma el multibloque con lo que hay alrededor.
