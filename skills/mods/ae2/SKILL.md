---
name: mods/ae2
description: Applied Energistics 2 (19.x, 1.21.1) con ExtendedAE y Applied Mekanistics: canales, cables y paneles, patrones, buses e interfaces. Datos verificados.
---
# AE2 19.x

## Red y canales
- Cable normal 8 canales; denso 32. Cada cara de un ME Controller da 32. Cada dispositivo (Drive, Pattern Provider, Interface, bus, terminal) usa 1.
- Sin controlador la red es ad hoc: 8 canales en total. Con más de 8 dispositivos hace falta un controlador (un solo multibloque por red, máx. 7×7×7), con energía de FE en él o en un Energy Acceptor.
- Inscriber, Charger, Crystal Assembler (ExtendedAE) y Molecular Assembler no usan canal.
- Los cables de colores distintos no se unen entre sí (el fluix o transparente se une con todos).
- **Ninguna pieza va sobre cable denso** (terminales, buses, paneles, P2P, Quartz Fiber): AE2 las rechaza. Al exportar, una celda con piezas lleva cable normal del mismo color (8 canales), así que no pongas piezas en un tramo que lleve más de 8 canales. Un P2P da sus 32 canales por su cara: ponlo en una celda de cable normal, mirando al denso.

## Cables y paneles en `edit_design`
- Cable: `{"op":"place",x,y,z,"cable":"ae2:fluix_covered_cable","block":"<fachada>"}`. Con `block`, la celda se ve como ese bloque (fachadas en las caras libres); sin `block`, el cable queda a la vista. Un cable nunca es `block`, y un bloque sin `cable` sustituye al cable.
- Panel: `{"op":"part",x,y,z,"side":"down","part":"ae2:cable_pattern_provider"}` en una celda de cable. Proveedores, interfaces y buses van en la cara que **toca** su máquina o inventario: `up` si está encima, `down` si está debajo, si no la dirección hacia ella. Terminales y monitores miran al pasillo.

## Bloque o panel
- Pattern Provider e Interface (también los de ExtendedAE) existen como **bloque** (`ae2:pattern_provider`, `ae2:interface`, `extendedae:ex_pattern_provider`) y como **panel** (`ae2:cable_pattern_provider`, `ae2:cable_interface`, `extendedae:ex_pattern_provider_part`).
- Bloque: empuja por todas sus caras (o por una, girado con la llave). Úsalo en el centro de varias máquinas, como un tronco con Molecular Assemblers en cruz.
- Panel: solo actúa por su cara y no ocupa celda propia. Úsalo en una fila de máquinas: el cable pasa por encima o por detrás y cada máquina lleva su panel.
- Buses, terminales, Quartz Fiber y túneles P2P solo existen como panel.

## Autocrafteo
- Patrón de crafteo (rejilla 3×3) en un Pattern Provider pegado a un Molecular Assembler.
- Patrón de procesado: entradas → salidas con cantidades. Con Applied Mekanistics los patrones pueden llevar químicos de Mekanism.
- Pattern Provider direccional (llave) empuja solo por su cara frontal; Blocking Mode espera a que la máquina se vacíe.
- Export Bus con Crafting Card pide fabricar lo que falte; Capacity Card añade filtros.
- ME Interface sin configurar: todo lo que recibe entra en la red. Storage Bus: expone un inventario o tanque como almacenamiento.

## ExtendedAE
- Tag Export Bus: filtro por etiqueta (`c:raw_materials/*`).
- Infinity Water Cell: agua infinita en un Drive.
- Crystal Assembler: procesadores e inscripciones por patrón.

## Applied Mekanistics
- Celdas de químicos (1k…256k). Particiona una celda por gas para que no se mezclen.
- Export/Import Bus y Pattern Providers mueven químicos como objetos.
