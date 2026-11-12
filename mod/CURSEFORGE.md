# Fichas para CurseForge

Textos en inglés listos para pegar en *Create Project* y en la subida de cada archivo.

Proyectos creados el 2026-11-12 (cuenta MikeGH26): **BuildGolem Link** (id 1799378) y **BuildGolem** (id 1799385), pendientes de aprobación. Cuando estén aprobados, añade en BuildGolem → Default Relations a BuildGolem Link como *Optional Dependency*. Los logos (512 × 512) están en `mod/logos/`; los jars, en `mod/build/libs/`.

---

## BuildGolem Link (solo cliente)

- **Name:** BuildGolem Link
- **Logo:** `logos/buildgolem_link_logo.png`
- **Class:** Mods
- **Main category:** Utility & QoL
- **Additional categories:** Map and Information
- **License:** MIT
- **Summary:**
  Project your BuildGolem factory designs as holograms in your world and build them layer by layer, with a live material list and build-all for operators.

**Description:**

```markdown
**BuildGolem Link** brings the factories you design on [buildgolem.dualix.io](https://buildgolem.dualix.io) into your world as a hologram you can build.

### What it does
- **Link your account** with a short code (you never type your password in the game) or browse the public gallery.
- **Hologram:** the design is drawn as see-through blocks, baked on the GPU, so thousands of blocks cost almost nothing. Wrong blocks are outlined in red; rotated or upside-down blocks, AE2 cables missing parts and unjoined monitors in yellow.
- **Layer by layer:** Page Up / Page Down, with the next missing block highlighted.
- **Move it precisely:** arrow keys in compass mode (up is always north) or relative to where you look, rotate in 90° steps, anchor at your feet or where you look.
- **Material list:** what is left to place against what you carry (and what your Builder Golems hold, if BuildGolem is installed). Click a block to show only that one.
- **Auto-place:** places the next missing block within reach if you carry it, facing the right way.
- **Build all (operators / cheats):** places everything with /fill and /setblock, including AE2 cable buses with their parts and facades and CC: Tweaked monitors joined into big screens. When it finishes it checks the whole build and tells you in chat if anything is missing. It can be undone.
- **Options screen:** HUD full / compact / hidden, its corner and size, arrow mode, hologram opacity and distance, placing pace.

### Requirements
- Minecraft 1.21.1, NeoForge 21.1.
- Client only: it works on any server without installing anything there.
- Pairs with **BuildGolem** (the Builder Golem) to have a golem build the hologram for you.

Keys: K menu · Page Up/Down layers · arrows move · Shift + arrows up/down. Everything else is in the K menu.
```

**File 1.4.0 · changelog:**

```
- AE2 cables are built with their cable, parts (pattern providers, interfaces, buses, terminals, P2P) and facades on every visible face, as in the web viewer. A cell with parts gets a normal cable instead of a dense one (AE2 does not allow parts on dense cables).
- Stairs keep their direction and upside-down half, hanging lanterns hang, end rods, wireless modems and wall sconces face the right way.
- CC: Tweaked monitors are joined into the big screens of the design.
- After Build all, the whole build is checked and the result is shown in chat. Cables without their cable and upside-down blocks now show in yellow.
- New Options screen (button in the K menu or /buildgolem options): HUD mode, corner and size, arrow mode, hologram opacity and distance, auto-place delay, commands per tick.
- The HUD hides with the hologram, while a menu is open and in another dimension, and never overlaps menus. New key (unbound) to cycle full / compact / hidden.
- Arrow keys default to compass mode: up is north and right is east whatever you look at. The old mode is still in Options.
- The material list counts the chests of your Builder Golems (needs BuildGolem 1.1.0 on the server).
- The K menu adapts to small and narrow screens.
- Build all never sends a command longer than the server accepts.
```

---

## BuildGolem (servidor y clientes)

- **Name:** BuildGolem
- **Logo:** `logos/buildgolem_logo.png`
- **Class:** Mods
- **Main category:** Utility & QoL
- **Additional categories:** Mobs, Technology › Automation
- **License:** MIT
- **Dependencies:** BuildGolem Link (optional, client: needed to copy a hologram into a Blueprint)
- **Summary:**
  A hard-hatted iron golem that builds your BuildGolem designs on its own, taking blocks from chests you assign. AE2 cables, parts and facades included.

**Description:**

```markdown
**BuildGolem** adds the **Builder Golem**: a short iron golem with a hard hat and a hi-vis vest that builds a design for you, at player pace, with the blocks you give it.

### How it works
1. Craft a **Golem Core** (Cyanotype Ingots, iron blocks and a Nether Star) and the **Builder Golem**, and wake it up on the ground.
2. Mark up to 5 chests with the **Chest Binder** and click your golem to hand them over.
3. With **BuildGolem Link**, place a hologram where you want to build and use a **Blank Blueprint** on it: you get a Blueprint of that exact placement.
4. Give the Blueprint to your golem. It walks to the chests, takes what that area needs and builds.

### A golem that thinks
- Picks the nearest missing block (lower layers first) and places everything within reach before walking.
- Keeps checking the whole build: if something breaks a block it already placed, it puts it back.
- Straightens blocks that face the wrong way without breaking them.
- Builds **AE2 cable buses** with their cable, parts and facades, and only adds parts to free faces.
- Fills its inventory with what the nearest work needs, from all its chests next to each other, in one trip.
- Never breaks anything: spots taken by other blocks are skipped. It respects land claims as if you were placing.
- Jumps to firm ground if it gets stuck for 4 seconds, and returns leftovers to a chest at the end.

### Personality
It reads its blueprint while it waits, shakes its head and scratches its helmet when it runs out of something, and celebrates with its arms up when the job is done. Hover near it to see what it is doing.

### Hard hat, hi-vis vest and the foreman
You can wear the **hard hat** (with headlamp, reflective band and a pencil) and the **hi-vis vest** (chest, 1 armor). With both on you are the **foreman**: your golems within 16 blocks work 25% faster and greet you when you arrive.

### Work Gear
Click your golem with a **Work Gear** (up to 3): it places faster (one block every 12 → 8 → 5 → 3 ticks), walks 20 % faster per gear and reaches further. Its helmet gets an amber beacon that spins and glows in the dark.

### Requirements
- Minecraft 1.21.1, NeoForge 21.1.
- Install it on the server and on every client. Copying holograms needs **BuildGolem Link** on the client.
- Only its owner (or an operator) can give it orders.
```

**File 1.2.0 · changelog:**

```
- Smarter building: nearest block first (lower layers first), everything within reach before walking, and it fills its inventory with what the nearest work needs, taking from every chest next to the one it visits.
- The hi-vis vest can be worn (chest, 1 armor) and the hard hat has a new design with headlamp, reflective band and pencil. With both on you are the foreman: your golems nearby work 25% faster and greet you.
- It also straightens upside-down stairs and lanterns that should hang.
- It keeps checking the build: blocks broken after being placed are placed again.
- Rotates blocks placed facing the wrong way, without breaking them.
- Builds AE2 cable buses with their parts and facades (needs BuildGolem Link 1.3.0 to copy them into the blueprint). The server only accepts which item goes on each face and which block each facade copies.
- New Work Gear upgrade (up to 3): faster placing, walking and reach, plus a spinning beacon on its helmet.
- Reactions and sounds: confused when it lacks materials, celebration when it finishes, sparks, block particles, chest sounds.
- New model details: tool pouch, hammer, pencil behind the ear.
- The material list of BuildGolem Link counts the chests of your golems.
```
