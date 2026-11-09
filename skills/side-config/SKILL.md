---
name: side-config
description: Reglas de entradas y salidas por lado, expulsión automática y conexión con redes de objetos.
---
# Lados de las máquinas

- En Mekanism, cada cara se configura por separado para **objetos, químicos y fluidos** (pestaña de la llave inglesa). Una misma cara puede ser entrada de objetos y entrada de químicos a la vez.
- Una cara solo tiene un modo por tipo: si una máquina necesita dos químicos distintos en tanques distintos (Chemical Infuser: Left y Right Input), van por dos caras.
- El Metallurgic Infuser tiene un hueco **Extra** (infusión) aparte de la entrada: el objeto principal y el de infusión van por caras distintas.
- La salida necesita **Eject** activado para empujar sola al vecino (otra máquina, una ME Interface, una tubería).
- El Electrolytic Separator tiene salida 1 y 2 y modos Dumping / Dumping Excess: usa Dumping Excess para que no se pare si el destino está lleno.
- AE2: un Pattern Provider empuja por su cara frontal (modo direccional con la llave); lo que la máquina expulsa hacia él entra en la red. Una ME Interface sin configurar mete en la red todo lo que recibe.
- Un Export Bus empuja a la cara que toca; con Crafting Card pide fabricar lo que falte.

Describe siempre la cara por lo que toca ("la cara que toca la interfaz") además de por su dirección: así sirve también en el lado espejo.
