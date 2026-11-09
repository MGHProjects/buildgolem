# BuildGolem

Diseñador de fábricas, bases y salas para modpacks de Minecraft, con IA que trabaja sobre los datos reales del modpack de cada usuario.

## Para quién

Jugadores de modpacks técnicos (ATM, Create, Mekanism, AE2, GregTech, etc.) que quieren planificar antes de construir: qué máquinas, cuántas, cómo se conectan, cuánto producen y cómo quedan, sin pasar horas en JEI y wikis.

## Qué hace (alcance de la versión 1)

| Área | Qué entra en la v1 | Estado |
|---|---|---|
| Cuentas | Registro con email y contraseña, sesiones seguras, idioma es/en | v1 |
| Claves de IA (BYOK) | Cada usuario guarda sus claves de proveedor (cifradas) y elige modelo | v1 |
| Tokens personales | `cmt_…` para el mod, la CLI o integraciones; revocables | v1 |
| Workspaces | Un modpack por workspace: zip de la instancia, `.mrpack` o proyecto de Modrinth | v1 |
| Indexador | Bloques, modelos, tamaño real (bounding), texturas bajo demanda, recetas, tags, configs, familias de tiers | v1 |
| Diseños | Crear, editar, duplicar; público, oculto con enlace o privado | v1 |
| Visor 3D | Motor actual (three.js) con fichas, patrones, cámaras, cortes, materiales | v1 |
| Tiers | Cambiar el tier de una familia (Basic → Ultimate) y ver el efecto en los números | v1 |
| Agentes | Orquestador, experto en mods, optimizador, diseñador, investigador, animador de procesos, validador, creador de skills | v1 |
| Animación de procesos | Grafo de flujo con tasas calculadas de recetas reales, animado sobre el diseño | v1 |
| Exportar | Estructura `.nbt` (Create Schematicannon / estructura vanilla) | v1 |
| Mod "BuildGolem Link" | Descargar un diseño con tu token y verlo como holograma / construirlo | v2 |
| Equipos y comentarios | Diseños compartidos para editar entre varios | v2 |

## Principios

1. **Datos reales o nada.** Los agentes no inventan bloques, recetas ni números: los sacan del workspace. Si falta un dato, lo dicen.
2. **Preguntar lo que cambia el diseño.** Antes de diseñar, el orquestador pregunta lo decisivo: de dónde sale la energía, si se conecta a una red existente, el espacio disponible y el nivel de progresión.
3. **Tamaño real de cada bloque.** El indexador mide el modelo (y los bounding blocks) para que un bloque de 2 de alto ocupe 2.
4. **Cualquier LLM.** Agentes y skills pensados para que modelos pequeños o gratuitos también den buenos resultados: herramientas pequeñas, protocolo JSON de reserva y validación tras cada paso.
5. **La clave es del usuario.** Cifrada, nunca vuelve al navegador, solo se usa al llamar al proveedor.

## Nombre

BuildGolem (craft + geometry). Comprobado el 2026-11-09: craftometry.com, .app y .gg libres por RDAP, sin proyectos en Modrinth y sin resultados en buscadores. Comprar el dominio lo hace el propietario.

## Riesgos abiertos

- **Texturas de mods**: muchas son All Rights Reserved. El dueño del workspace ve las texturas de sus propios archivos; los diseños públicos se ven con color medio por bloque hasta que el visitante importe el mismo modpack. Revisar con un abogado antes de abrir la galería con texturas.
- **CurseForge**: su API exige una clave aprobada por Overwolf y respeta el permiso de distribución de cada mod. Sin esa clave, el camino es subir la carpeta de la instancia.
- **Coste de cómputo**: los modpacks pesan GB. Cuota por usuario y limpieza de workspaces sin uso.
- **Marca**: no usar "Minecraft" en el nombre ni el logo (normas de marca de Mojang); indicar "no afiliado a Mojang".
