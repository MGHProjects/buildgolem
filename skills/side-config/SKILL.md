---
name: side-config
description: Reglas de entradas y salidas por lado, expulsión automática y conexión con redes de objetos.
---
# Lados de las máquinas

- Mekanism: cada cara se configura por separado para objetos, químicos, fluidos y energía (llave inglesa). Una cara puede ser entrada de objetos y de químicos a la vez, pero solo tiene un modo por tipo: dos químicos distintos (Chemical Infuser: Left y Right Input) van por dos caras.
- Metallurgic Infuser: el hueco Extra (infusión) va por una cara distinta de la entrada principal.
- La salida necesita Eject activado para empujar sola al vecino (otra máquina, una ME Interface, un Pattern Provider, una tubería).
- Electrolytic Separator: salidas 1 y 2; modo Dumping Excess para que no se pare si el destino está lleno.
- AE2: un Pattern Provider empuja por la cara que toca la máquina (el panel solo por su cara; el bloque por todas, o por una girado con la llave) y lo que la máquina expulsa hacia él entra en la red. Una ME Interface sin configurar mete en la red todo lo que recibe. Un Export Bus empuja a la cara que toca; con Crafting Card pide fabricar lo que falte.
- Escribe la configuración en la máquina con `{"op":"note"}` y nombra cada cara por lo que toca ("la cara que toca el proveedor") además de por su dirección: así sirve también en el lado espejo.
