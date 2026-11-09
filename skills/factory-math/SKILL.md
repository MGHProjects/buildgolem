---
name: factory-math
description: Fórmulas para caudales, número de máquinas, cuellos de botella y energía.
---
# Matemáticas de fábrica

Unidades: 20 ticks = 1 segundo. Caudal en unidades por segundo (u/s); enséñalo también por minuto.

| Magnitud | Fórmula |
|---|---|
| Caudal de una máquina | `procesos × salida_por_operación × 20 / ticks_por_operación` |
| Ticks con mejoras de velocidad (Mekanism) | `ticks_base / (10 ^ (mejoras / 8))` (8 mejoras → ×10) |
| Máquinas necesarias | `ceil(caudal_objetivo / caudal_por_máquina)` |
| Caudal de una cadena | el mínimo de los caudales de sus pasos (cuello de botella) |
| Consumo por tick (químicos "per tick") | `cantidad_receta × multiplicador_de_mejoras`; por operación `× ticks` |
| Energía total | suma de `consumo_por_tick × máquinas` (FE/t o J/t, no mezclar) |

Método:
1. Escribe la cadena paso a paso con la receta real de cada paso.
2. Calcula el caudal de cada paso con `calc` y enseña la fórmula con los números.
3. Ajusta el número de máquinas del paso más lento primero.
4. Si dos opciones dan el mismo caudal, recomienda la más barata de construir.

Ejemplo verificado (Mekanism 10.7, ×5): 3 crudos → 2000 mB de slurry → 10 cristales (200 mB c/u) → 10 fragmentos → 10 grumos → 10 polvos → 10 lingotes. Es decir, 10/3 lingotes por crudo.
