---
name: decor
description: Cómo construir salas decoradas y temáticas con edit_design (prefab, arrange, grid, display), qué expositores usar para los objetos y recetas de salas (trofeos, museo, trono, biblioteca, gran salón) con paletas por mod.
---
# Decoración con edit_design

No coloques muebles bloque a bloque: usa piezas hechas (`prefab`) y repártelas con reglas (`arrange`). El código calcula las coordenadas, los giros y la simetría; tú decides qué va y dónde, a grandes rasgos.

## Coordenadas que necesitas
Si la sala es `room from [x0,y0,z0] to [x1,y1,z1]`:
- **Interior libre**: `area [x0+1, z0+1, x1-1, z1-1]`.
- **Altura de apoyo**: `y = y0+1` (la capa de aire justo encima del suelo). Alfombras y muebles van ahí, nunca en `y0`.
- **Bajo el techo**: `y = y1-1`. Ahí se ancla una lámpara colgante.
- **Centro**: `((x0+x1)/2, y0+1, (z0+z1)/2)`. Usa medidas impares para que sea exacto.

## Prefabs (`{op:"prefab", prefab, x, y, z, facing, style, item?}`)
`x,y,z` es el centro de abajo de la pieza. `facing` es hacia dónde mira su frente (hacia el pasillo o el centro).
| prefab | tamaño | qué es |
|---|---|---|
| pedestal | 1×2×1 | remate + expositor; `item` va dentro |
| pedestal_grand | 3×2×3 | plinto escalonado con el expositor en el centro: la pieza estrella |
| column / column_grand | 1×h / 3×h×3 | columna (`height`, 4 / 5) con basa y capitel |
| sconce | 1×2×1 | aplique: ménsula pegada a la pared + luz encima; el ancla es la celda junto a la pared |
| chandelier / chandelier_grand | 1 / 3×3 | lámpara colgante; el ancla es la celda bajo el techo y `height` es el largo de la cadena |
| lamp_post | 1×h | farola (`height` 4) |
| bench, table, planter, throne | | banco (`width`), mesa (`width` 1 o 3), jardinera, trono |
| arch | w×h en el muro | abre un hueco (`width`, `height`) con escaleras invertidas en las esquinas; ancla: centro de abajo del hueco |

`style` da los materiales: `base`, `trim` (remate, que contraste), `pillar`, `accent`, `light`, `display`. Lo que falta (`stairs`, `slab`, `wall`) se deduce de la familia de `trim` o `base`. Si la respuesta dice que falta algo, búscalo con `search_blocks` y pásalo en `style`.

## Arrange: reparto simétrico
`{op:"arrange", prefab, layout, area, y, spacing, margin, sides, style, items}`
- `walls`: a lo largo de las paredes, mirando al centro. Deja libres las puertas y las esquinas. `margin` es la distancia a la pared (0 = pegado) y `sides` los lados a usar (`["n","e","w"]` deja libre la pared de la puerta).
- `corners`: una en cada esquina del área (columnas, plantas).
- `grid`: en filas dentro del área. `row`: de `from` a `to`. `ring`: alrededor de `center` con `radius`.
- `items`: un objeto por expositor, en orden. La respuesta da la posición y el frente de cada pieza en `notes`: úsalas para todo lo que hagas después.

## Objetos expuestos (`display`)
- **En un expositor** (lo mejor, BuildGolem Link lo pone en el juego): `{op:"display", x,y,z, item}` en la celda del expositor. Busca expositores con `search_blocks` role `display`. Los fiables son `supplementaries:pedestal` (cualquier objeto, flotando encima), `supplementaries:item_shelf` (en la pared), los `bibliocraft:<color>_<madera>_display_case` y `bibliocraft:sword_pedestal` (espadas). Deja aire encima del pedestal.
- **Marco en la pared**: `{op:"display", x,y,z, item, kind:"frame", side:"north"}` en una celda de aire, con `side` hacia la pared. **Soporte de armadura**: `kind:"stand"`. Los dos se exportan en el .nbt, pero BuildGolem Link todavía no los coloca: si hay alternativa, usa pedestales.
- Los objetos salen de `search_items`. Trofeos que son bloques (cabezas, `twilightforest:*_trophy`, `allthetweaks:trophy_atm`) se ponen con `place` encima de un plinto, no con display.

## Formas a medida: `grid`
Para una estatua, una fuente, un trono especial o un emblema en el suelo, dibuja capas:
`{op:"grid", at:[x,y,z], legend:{"O":"cataclysm:obsidian_bricks","s":{"block":"cataclysm:obsidian_brick_stairs","facing":"north","half":"top"}}, layers:[["OOO","O.O","OOO"],["s.s","...","s.s"]]}`
`at` es la esquina noroeste de abajo. Cada capa va de abajo arriba, sus filas de norte a sur y los caracteres de oeste a este. `.` no toca la celda y `_` la deja vacía.

## Exteriores: tejados y volúmenes
- **Edificios enteros**: mejor `building` (zócalo, muros con estructura, puertas, tejado con alero y luces de una vez); ver la skill architecture.
- **Tejado suelto**: `{op:"roof", from:[x0,y,z0], to:[x1,y,z1], shape:"gable"|"hip"|"irimoya", estilo? | style:{base, stairs?}, overhang?, pitch?}`. El rectángulo es la línea de las paredes e `y` la capa de arriba de ellas. Con `estilo` usa sus tejas y su curva. `gable` rellena los hastiales.
- Tejado de un material más oscuro que las paredes, con alero de 1 y cumbrera visible. Si el tejado es largo, rómpelo con un segundo volumen perpendicular (otra `room` + `roof`, con `axis` cambiado).
- **Torre**: planta circular con `grid` (anillo de 7 o 9 de diámetro), almenas alternando bloque y aire en la última capa, o tejado `hip` sobre la planta cuadrada.
- **Casa**: base de piedra de 1-2 capas (zócalo), paredes de madera o ladrillo con vigas de tronco en esquinas y cada 4, ventanas hundidas, tejado `gable` con alero, chimenea y porche (`fill` de losas + `lamp_post`).

## Recetas de sala
**Sala de trofeos / museo** (15×11 interior, techo a 6):
1. `room` con door en un lado corto, `frame` = pilar del tema, sin `glass` (o vidriera de color en la pared del fondo).
2. Suelo con `fill` + `mix` + `edge` (cenefa) y alfombra de la puerta al fondo en `y0+1`.
3. `arrange pedestal walls` con `sides` las tres paredes sin puerta, `spacing 3`, `margin 1` e `items`.
4. `prefab pedestal_grand` en el fondo, en el eje de la puerta, con la pieza mejor. Luz encima (`chandelier`).
5. `arrange column corners margin 0`, `arrange sconce walls margin 0 spacing 4` en las paredes largas y `chandelier_grand` en el centro, a `y1-1` con height 1.
6. `review_design`: sin zonas oscuras, sin objetos tapados ni inalcanzables.

**Salón del trono**: eje largo de la puerta al trono; `throne` sobre una tarima de 3 escalones (`fill` con escaleras mirando a la puerta); columnas `column_grand` en dos filas (`arrange row`) a los lados del pasillo; alfombra central; estandartes o vidrieras detrás del trono.

**Biblioteca**: paredes de estanterías (`fill` con bookshelf o las de chipped/mcwfurnitures) con pilares cada 4; mesas `table width 3` en `grid` por el centro con `bench` a los lados; lámparas bajas (`lamp_post` height 3) entre mesas.

**Gran salón**: dos filas de `column_grand` (`arrange row`, spacing 4), `chandelier_grand` sobre el pasillo central, mesas largas a los lados y chimenea o trono al fondo.

## Paletas por tema (ATM10; compruébalas con search_blocks, el pack del jugador puede ser otro)
- **Cataclysm**: oscura `cataclysm:obsidian_bricks` + `polished_obsidian` + `obsidian_pillar` + `chiseled_obsidian_bricks`; marina `azure_seastone_bricks` + `polished_azure_seastone` + `azure_seastone_pillar` (con murales); acentos `ignitium_block`, `cursium_block`, `witherite_block`, `ancient_metal_block`, `black_steel_block`; luz `cataclysm:void_lantern_block`; `goddess_statue`. Trofeos: `gauntlet_of_guard`, `the_incinerator`, `infernal_forge`, `void_forge`, `meat_shredder`, `tidal_claws`, `the_annihilator`, `laser_gatling`, `soul_render`, `wither_assault_shoulder_weapon`, `ceraunus`, `astrape`, `bulwark_of_the_flame` y los ojos (`flame_eye`, `void_eye`, `storm_eye`…).
- **All the Mods**: `allthemodium:ancient_stone_bricks` (familia oscura) con acentos `allthemodium_block`, `vibranium_block`, `unobtainium_block`; trofeos `allthetweaks:atm_star` (objeto), `allthetweaks:trophy_atm` y `atm_star_block` (bloques).
- **Twilight Forest**: `twilightforest:castle_brick` (+ worn, cracked, mossy) y `dark_planks`; trofeos de jefe como bloques (`naga_trophy`, `lich_trophy`, `hydra_trophy`, `ur_ghast_trophy`… y sus `_wall_trophy`) sobre `twilightforest:trophy_pedestal`.
- **AE2 / tecnológico**: `ae2:smooth_sky_stone_block` + `sky_stone_brick` con `quartz_block` y acento `fluix_block`.
- **Ars Nouveau / mágico**: familia `ars_nouveau:sourcestone` (morado) y sus `gilded_`, `archwood_planks`; luces `sourcestone_sconce`, `source_lamp`.
- **Deep Dark**: `deeperdarker:gloomslate` y `sculk_stone` (familias), `echo_planks`; luz `gloomslate_light`.
- Vanilla siempre disponible: `deepslate_bricks`, `polished_blackstone_bricks`, `quartz_block`, `stone_bricks`, `dark_oak_planks`; luces `lantern` (cálida), `soul_lantern` (fría), `sea_lantern`, `end_rod`.
Tema de varios mods: un ala o una vitrina por mod con su propia paleta, unidas por el mismo suelo y la misma luz.
