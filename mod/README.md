# Mods de BuildGolem

Dos mods para NeoForge 1.21.1 (All the Mods 10), en dos jars:

| Mod | Carpeta | Dónde va | Qué hace |
| --- | --- | --- | --- |
| **BuildGolem Link** (`buildgolem_link`) | `link/` | solo cliente | Vincula tu cuenta, proyecta un diseño como holograma y te guía capa a capa. No registra nada: entra en cualquier servidor. |
| **BuildGolem** (`buildgolem`) | `golem/` | servidor y cada cliente | El Gólem constructor y sus objetos. Para copiar un holograma en un plano hace falta además BuildGolem Link en el cliente. |

## BuildGolem Link

- **Vincular la cuenta sin contraseña en el juego**: `K` → *Vincular cuenta*. El juego enseña un código y lo copia al portapapeles; *Abrir la web* lo lleva ya puesto a buildgolem.dualix.io/vincular. El mod recibe un token de **solo lectura** (se revoca en Ajustes → Tokens personales). Si venías de Craftometry Link 1.x, la cuenta vinculada se conserva.
- **Elegir un diseño**: tuyos o de la galería. Al cargarlo, su esquina queda en tus pies.
- **Holograma rápido**: los bloques que faltan se hornean en mallas por sección de 16³ (como el propio mundo), sin las caras tapadas; solo se rehace la sección donde cambia algo. Contornos solo para lo importante: siguiente bloque y capa (amarillo), bloque equivocado (rojo), bloque bueno pero girado (amarillo) y el marco del diseño.
- **Moverlo fácil**: flechas = adelante/atrás/izquierda/derecha según miras; Mayús + ↑/↓ = subir y bajar. En el menú: *Anclar en mis pies*, *Anclar donde miro*, *Centrar en mí*, *Girar 90°* y una cruceta.
- **Capas**: `Re Pág` / `Av Pág`. Una pulsación = una capa; si mantienes, repite a ritmo fijo y para al soltar. Al terminar una capa pasa sola a la siguiente (se puede apagar).
- **Auto-colocar**: pone el siguiente bloque que falta a tu alcance si lo llevas encima (en creativo, cualquiera), de abajo arriba y orientado. Aprende qué bloques se orientan al revés.
- **Construir todo** (con permisos de operador o trucos): `/fill` por tramos y `/setblock`, solo lo que falta o está mal, con **Deshacer**.
- **Materiales**: lo que falta contra tu inventario; clic en un bloque para ver solo ese; *Copiar lista*.
- Recuerda diseño, ancla, giro y capa **por mundo**.

Comandos (cliente): `/buildgolem` (menú), `designs`, `load <id>`, `here`, `look`, `center`, `rotate`, `layer <n>|all|up|down`, `auto`, `build [layer]`, `undo`, `stop`, `toggle`, `materials`, `clear`, `unlink`.

Teclas en *Opciones → Controles → BuildGolem*: menú (`K`), capas (`Re Pág`/`Av Pág`), mover (flechas, Mayús + ↑/↓) y, sin asignar, girar, auto-colocar y mostrar/ocultar.

Configuración en `config/buildgolem_link-client.toml` (servidor, token, `ghostRange`, `ghostOpacity`, `placeDelay`, `commandsPerTick`, `autoNextLayer`); la proyección guardada, en `config/buildgolem_link-projection.json`.

## BuildGolem: el Gólem constructor

Un gólem de hierro bajito (cabe por huecos de 1×2) con casco de obra y chaleco reflectante. Construye solo, a ritmo de jugador (un bloque cada 12 ticks más lo que camina), sacando los bloques de hasta 5 cofres.

**Fabricarlo** (caro a propósito):

1. *Polvo de cianotipo* ×2 = chatarra de netherita + 2 lapislázuli + 2 redstone + 2 fragmentos de amatista (sin forma).
2. *Lingote de cianotipo* = polvo en el **alto horno** (20 s).
3. *Núcleo de gólem* = 4 lingotes + 4 bloques de hierro + Estrella del Nether (lingotes en las esquinas, hierro en los lados, estrella en el centro).
4. *Casco de obra* (tinte amarillo y hierro; también te lo puedes poner) y *Chaleco reflectante* (lana naranja y polvo de piedra luminosa).
5. *Gólem constructor* = casco arriba, núcleo en el centro, chaleco abajo y 4 bloques de hierro.

**Usarlo**:

- Gólem constructor sobre el suelo → despierta y es tuyo (solo te obedece a ti y a los operadores).
- *Vinculador de cofres* (libro + cadena + polvo de cianotipo): clic en un cofre, barril o cualquier almacén para apuntarlo o quitarlo (hasta 5); agachado al aire lo vacías. Con él en la mano, sus cofres se ven recuadrados. Clic en el gólem para dárselos.
- *Plano en blanco* (3 papeles + tinte azul → 3): con un holograma de BuildGolem Link colocado, úsalo y copia el diseño tal cual está (sitio y giro). Sale un *Plano* con nombre, medidas y esquina. Clic en el gólem para dárselo.
- Mano vacía: pausa / sigue (y te dice qué le falta). Agachado con la mano vacía: lo recoges como objeto. Lingote de hierro: lo reparas.

**Cómo trabaja**: recorre el plano de abajo arriba; si no lleva el bloque, va al cofre que lo tenga y coge lo que necesitará pronto (18 huecos). Pone cada bloque como lo pondría su dueño: si una protección de terreno no se lo permite al dueño, no lo pone. Nunca rompe nada: un hueco ocupado por otro bloque se salta y se cuenta. Si se atasca, salta a un sitio firme junto al objetivo. Al terminar avisa al dueño y devuelve lo que sobra; luego repasa la obra cada 10 s y repone lo que falte. Encima de la cabeza enseña lo que hace ("Voy a por…", "Me falta…", "Construyendo · 42 %").

Del plano solo se copian forma y orientación de cada bloque (nada de colmenas llenas, cultivos maduros ni agua gratis); una losa doble cuesta dos losas y la mitad de arriba de puertas y camas no cuesta nada. La subida del plano va por trozos y el servidor la valida (tamaño, medidas ≤ 512, ≤ 262 144 bloques, cerca del jugador y con un plano en blanco en la mano). Los planos se guardan en el mundo: `data/buildgolem_plan_<id>.dat`.

## Compilar

Sin Gradle, con el JDK y la instalación de NeoForge 21.1.250 que deja CurseForge (Minecraft 1.21.1 usa nombres oficiales en tiempo de ejecución, no hace falta remapear). Desde `mod/`:

```bash
node tools/build.mjs link
```

```bash
node tools/build.mjs golem
```

Salen `build/libs/buildgolem_link-1.2.0+1.21.1.jar` y `build/libs/buildgolem-1.0.0+1.21.1.jar` (golem se compila contra las clases de link: compila link antes). Versiones comunes en `mod.properties`; id, nombre y versión de cada mod en `<carpeta>/module.properties`.

`node tools/textures.mjs` regenera las texturas (pixel art en mapas de caracteres y la textura 128×128 del gólem, a juego con `BuilderGolemModel.java`), los modelos de objeto y los iconos de la web (`web/public/mod`). `tools/NbtCheck.java` comprueba fuera del juego que un `.nbt` exportado por BuildGolem se lee con el `NbtIo` de Minecraft.

## Límites

- Los bloques de mods que no tienes instalados no se ven en el holograma (el chat avisa) y el servidor los quita del plano.
- Las partes de AE2 sobre cables (buses, terminales) no van en el `.nbt`; la web las lista en cada diseño.
- Auto-colocar usa las mismas acciones que un jugador; algunos servidores con anti-trampas pueden no permitirlo a ritmo alto (sube `placeDelay`).
- Construir todo y el gólem colocan bloques, no el contenido de las máquinas ni los patrones.
- El gólem trabaja en chunks cargados; no carga chunks por su cuenta.

Licencia MIT · MGH Projects.
