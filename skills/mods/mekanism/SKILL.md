---
name: mods/mekanism
description: Mekanism 10.7 (1.21.1) con Generators y Mekanism More Machines: procesado ×5, químicos, fisión, turbina, SPS y antimateria. Datos verificados en los jars.
---
# Mekanism 10.7

## Procesado de minerales (por crudo / bloque de crudo / mena)
| Paso | Máquina | Receta real |
|---|---|---|
| ×5 disolución | Chemical Dissolution / Dissolving Factory | 3 crudos → 2000 mB slurry sucio (1 mB/t ácido sulfúrico) · 1 bloque de crudo → 6000 mB · 1 mena → 1000 mB |
| lavado | Chemical Washer / Washing Factory | 1 mB slurry + 5 mB agua → 1 mB limpio |
| cristalizado | Chemical Crystallizer | 200 mB → 1 cristal |
| ×4 inyección | Injection | 1 cristal → 1 fragmento (1 mB/t HCl) · 3 crudos → 8 fragmentos |
| ×3 purificación | Purification | 1 fragmento → 1 grumo (1 mB/t O₂) · 1 crudo → 2 grumos |
| triturado | Crusher | grumo → polvo sucio |
| ×2 enriquecido | Enrichment | polvo sucio → polvo · 3 crudos → 4 polvos |
| fundido | Energized Smelter | polvo → lingote |
Resultado ×5: 10 lingotes por 3 crudos.

## Factorías
Tiers basic / advanced / elite / ultimate = 3 / 5 / 7 / 9 procesos en paralelo. Mekanism More Machines (mekmm) añade factorías de disolución, lavado y cristalizado y tiers superiores (overclocked, quantum, dense, multiversal).

## Gases
- Separador electrolítico: agua → H₂ (salida 1) + O₂ (salida 2); salmuera → sodio + cloro.
- Infusor: H₂ + Cl₂ → HCl · O₂ + 2 SO₂ → 2 SO₃ · SO₃ + vapor → H₂SO₄ · HF + UO₂ → 2 UF₆.
- Oxidador: 1 azufre → 100 mB SO₂ · 1 yellow cake → 250 mB UO₂ · fragmento reprocesado → 2000 mB combustible.
- Rotary Condensentrator en modo Decondensentrating: agua → vapor.
- Thermal Evaporation: 10 agua → 1 salmuera; 4×4 de base, 3-18 de alto, calor por válvula (Resistive Heater).

## Nuclear
- Combustible: lingote de uranio → 2 yellow cake → UO₂; fluorita + H₂SO₄ → 1000 mB HF; UF₆ → combustible fisible 1:1 (Isotopic Centrifuge, 2 de alto).
- Reactor de fisión: multibloque cúbico de casing con columnas de Fission Fuel Assembly y un Control Rod Assembly encima; refrigera con agua (sale vapor) o sodio; puertos en modo Input / Output Coolant / Output Waste.
- Turbina industrial: anchura impar; rotor en el centro, Rotational Complex encima, capa completa de Pressure Dispersers a su altura, Electromagnetic Coils sobre el complejo (8 aspas por bobina en la config por defecto), Saturating Condensers devuelven agua, vents en las paredes por encima de los dispersores.
- Residuo: 10 mB → 1 mB plutonio (centrífuga) · 10 mB → 1 mB polonio (Solar Neutron Activator: **necesita ver el sol**, no funciona bajo tierra).
- Pellets (PRC): 1000 mB Pu/Po + 1000 mB agua + 1 polvo de fluorita → pellet + 1000 mB residuo gastado.
- SPS: 7×7×7, cada cara en octógono; 1000 mB polonio → 1 mB antimateria; 100 000 de energía por mB de entrada (config `sps`); energía por Supercharged Coil sobre un puerto.
- Antimateria: cristalizador 1000 mB → 1 pellet; Antiprotonic Nucleosynthesizer: objeto + antimateria (carbón + 4 mB → diamante).

## Reglas
- Metallurgic Infuser: entrada, Extra (infusión) y salida por caras distintas. Enriquecidos = 80 de infusión.
- Bloques de más de una celda: Isotopic Centrifuge, Solar Neutron Activator, Digital Miner, Seismic Vibrator, Modification Station.
- Mekanism Covers tapa Universal Cable, tuberías y tubos con cualquier bloque.
