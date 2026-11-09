---
name: mods/ae2
description: Applied Energistics 2 (19.x, 1.21.1) con ExtendedAE y Applied Mekanistics: canales, patrones, buses e interfaces. Datos verificados.
---
# AE2 19.x

## Canales
- Cable normal 8 canales; denso 32. Cada cara de un controlador da 32. Cada dispositivo (Drive, Pattern Provider, Interface, bus, terminal) usa 1.
- Inscriber, Charger, Crystal Assembler (ExtendedAE) y Molecular Assembler no usan canal.
- Los cables de colores distintos no se unen entre sí (el fluix o transparente se une con todos).
- Las fachadas tapan un cable entero; una parte (bus, terminal) va en su cara y queda a la vista.

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
