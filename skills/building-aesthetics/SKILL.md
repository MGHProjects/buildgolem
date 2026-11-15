---
name: building-aesthetics
description: Reglas de arquitectura e interiorismo en Minecraft para que una sala o edificio se vea bien hecho: proporciones, paleta, relieve, luz, simetría y punto focal.
---
# Estética de construcción

Una construcción buena se reconoce por cinco cosas: proporción, paleta corta, relieve, luz y un punto focal. Compruébalas todas con `view_design` y `review_design` antes de terminar.

## Proporciones (en bloques)
| Espacio | Mínimo | Cómodo | Altura libre |
|---|---|---|---|
| Pasillo | 2 de ancho | 3 | 3 |
| Habitación | 5×6 | 7×9 | 3-4 |
| Sala de exposición o trofeos | 11×9 | 15×11 o más | 5-6 |
| Gran salón o trono | 15×20 | 21×25 | 7-9 |
- Medidas impares (11, 13, 15…) dan un centro exacto para la pieza estrella y la simetría.
- Entre piezas expuestas deja 2 bloques de aire: se camina entre ellas y cada una se ve sola.

## Paleta: 3-5 materiales (60-30-10)
- **60 % principal**: paredes y suelo (ladrillos, piedra pulida del tema).
- **30 % secundario**: estructura (pilares, zócalo, cornisa, marcos). Contraste claro con el principal: claro sobre oscuro o al revés.
- **10 % acento**: luces, metales nobles, cristal de color, alfombra.
- Saca la paleta del tema con `search_blocks` (mod + role block): cada familia trae su color y sus escaleras, losa y muro. Las escaleras, losas y muros de la misma familia dan relieve sin añadir materiales.
- Superficies grandes, nunca de un solo bloque: `fill` con `mix` (p. ej. 70 % ladrillo, 20 % agrietado, 10 % cincelado) y `edge` para la cenefa del suelo.

## Relieve: ninguna pared plana
- Pilar del material secundario cada 3-5 bloques y en cada esquina (`room` ya pone pilares con `frame`).
- **Zócalo** (fila de abajo) y **cornisa** (fila de arriba) del material secundario; la cornisa queda mejor con escaleras invertidas (`half: top`) mirando hacia dentro.
- Ventanas y huecos hundidos 1 bloque, con arco (`prefab arch`) o con escaleras invertidas en las esquinas de arriba.
- Techo: vigas de pilar o losa cada 3-4 bloques, o un techo un bloque más alto en el centro.

## Luz
- Ningún suelo interior con luz 0: ahí aparecen monstruos. Una luz cada 5-6 bloques.
- Luz en capas: una lámpara grande en el centro (`chandelier_grand`), apliques en las paredes (`sconce`) y luz escondida (bajo alfombras, tras cristal, en el suelo con losas encima).
- El objeto estrella lleva luz propia encima o al lado.
- La luz cálida (faroles, velas) da un tono acogedor; la fría (faroles de almas, end rods, linternas marinas), uno místico o tecnológico. Elige una según el tema.

## Composición
- **Un eje de simetría** a lo largo del lado largo, de la puerta al fondo. Lo de un lado se repite en espejo al otro: `arrange` lo hace solo.
- **Punto focal** al final del eje, frente a la puerta: la pieza más importante, más alta y más iluminada (plinto `pedestal_grand`, trono o estatua).
- **Recorrido**: alfombra o camino de otro material de la puerta al punto focal.
- **Ritmo**: el mismo intervalo (3 o 4) para pilares, pedestales y luces. Si el ritmo cambia, que sea a propósito.
- Las esquinas vacías se ven sin terminar: columna, planta o luz.

## Errores típicos
- Suelo y paredes del mismo bloque sin contraste, o más de 6 materiales sin orden.
- Una alfombra o un mueble en la capa del suelo, en vez de encima (y + 1).
- Objetos expuestos contra la pared sin aire alrededor, o tapados por un bloque encima.
- Luces colgantes tan bajas que tapan el objeto de debajo o la cabeza (deja 3 de aire sobre el suelo en los pasos).
- Todo cuadrado: rompe la caja con chaflanes, plintos escalonados, arcos y techos a distinta altura.

Parte de estas reglas (proporciones, 60-30-10, pilares en las esquinas) adaptan las skills de VibeCraft (amenti-labs/vibecraft, licencia MIT).
