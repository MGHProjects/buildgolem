# Dirección de diseño

Design Read: landing de producto y app creativa para jugadores de modpacks técnicos, con lenguaje de plano técnico (cotas, medidas, despiece), dial ENERGY 3 / RHYTHM 3 / MOTION 3 en la landing y ENERGY 2 / RHYTHM 2 / MOTION 1 en la app.

## Identidad: la obra del gólem

Pedidos explícitos del dueño (noviembre de 2026): estilo blueprint en toda la app, también en el simulador; y, al pasar a llamarse BuildGolem, todo alrededor del concepto: un gólem de hierro con casco de obra que construye lo que planificas. El plano es lo que entrega la app; el gólem, quien lo levanta.

- **Mascota**: el gólem (`web/src/golem/Golem.jsx`, dibujo propio en bloques): casco amarillo con amapola, chaleco reflectante, ojos cian. Poses con sentido: sujeta el plano (hero), martillea (cargando), lee el plano (vacíos y 404). Habla en bocadillo pixelado (`Bubble`, Pixelify Sans), una frase corta.
- **Papel**: tema claro = hierro (`#eceef0`, texto `#161b20`); tema oscuro = hierro oscuro (`#121518`, superficie `#191d21`). La tinta del plano (`#1d5a94` / `#6fa8dc`) queda para cotas, rejilla y el 3D. La rejilla (`.bp-paper`) solo en fondos de página, landing y bajo el modelo 3D, nunca dentro de tarjetas o formularios.
- **Acento**: un solo amarillo de obra `#FFC21A` (hondo `#c99200`, texto sobre claro `#855c00`, sobre oscuro `#ffd15c`): acción principal, cotas, cifras calculadas. Las rayas de obra (`.hazard`) solo marcan zonas de peligro o trabajo en curso. Rojo solo para cuello de botella y errores; verde solo para "verificado".
- **Mod**: la misma paleta en el juego (HUD y menús con barra amarilla, contornos amarillos) y en los objetos (pixel art de `mod/tools/textures.mjs`); la web enseña esas mismas texturas en la sección de los mods.
- **Motivos**: la cota (`.cota`, línea con remates y la medida real en mono) y el cajetín (`.cajetin`, el bloque de datos de una lámina) en tarjetas, simulador, acceso y landing. Los números que muestran salen siempre de los datos reales.
- **Tipografía**: Geist para la interfaz; Geist Mono solo para medidas, coordenadas y valores calculados; nunca en titulares. Pixelify Sans solo dentro de las ventanas tipo GUI del juego.
- **Forma**: radio 6 px en todo (botones, campos, tarjetas, paneles), botones macizos con borde inferior de 3 px como un bloque: piezas de obra, no pastillas. Bordes de 1 px en el color de línea; sombra solo en lo que flota sobre el 3D.
- **Iconos**: Phosphor, un solo juego. Los botones de solo icono llevan su nombre en tooltip y en `aria-label`.
- **3D**: siempre sobre cianotipo (`#0b1d31`) con rejilla de 1 bloque, en los dos temas: las texturas del juego se leen mejor sobre oscuro.

## Simulador

Barra superior (volver, título, medida, visibilidad y acciones), carril de herramientas a la izquierda con paneles (Proceso, Ficha, Vistas, Capas, Materiales, Patrones, Tiers), lienzo con los controles del proceso flotando abajo, agentes a la derecha (solo el dueño) y el cajetín como barra de estado. En móvil el panel y los agentes van por encima del lienzo.

## Movimiento (por qué se mueve cada cosa)

- Hero: la planta del Centro AE2 se dibuja sola (marco, estructura, máquinas, cotas, llamadas) con los datos reales del diseño (`web/scripts/blueprint.mjs`).
- Alzado: al bajar, el plano se levanta capa a capa del fondo del pozo al controlador y el número de capa cuenta con él.
- Sección del flujo: se fija y avanza paso a paso al hacer scroll, porque el proceso es una secuencia (importar → preguntar → calcular → exportar).
- Tiers: el número de procesos y el caudal se animan al cambiar de tier para que se vea el efecto.
- Mods: los pasos de fabricación del gólem entran en orden y cada objeto aparece con un rebote corto, porque es una cadena (polvo → lingote → núcleo → gólem).
- Simulador: los objetos viajan entre máquinas al ritmo del caudal real; cada máquina pulsa al terminar una operación. Pausa y velocidad en el panel.
- Con `prefers-reduced-motion` todo queda estático.
