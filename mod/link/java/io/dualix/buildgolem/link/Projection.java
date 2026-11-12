// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import it.unimi.dsi.fastutil.longs.LongOpenHashSet;
import net.minecraft.client.Minecraft;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.HolderGetter;
import net.minecraft.core.SectionPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.NbtAccounter;
import net.minecraft.nbt.NbtIo;
import net.minecraft.nbt.NbtUtils;
import net.minecraft.nbt.Tag;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.DyeColor;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.RenderShape;
import net.minecraft.world.level.block.Rotation;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.DirectionProperty;
import net.minecraft.world.level.block.state.properties.Property;
import net.neoforged.fml.loading.FMLPaths;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * El diseño proyectado en el mundo: sus bloques (relativos a la esquina), el ancla, el giro, la capa y un filtro por bloque.
 * Cada pocos ticks se compara con el mundo: estado de cada bloque, el siguiente que falta y qué secciones hay que redibujar.
 */
public final class Projection {
    /** nbt: datos del bloque (cables de AE2 con sus piezas y fachadas); null en un bloque normal. */
    public record Entry(BlockPos rel, BlockState state, String name, CompoundTag nbt) {}
    public record Material(String name, Item item, Block block, int need, int have) {
        public int missing() { return Math.max(0, need - have); }
    }
    public static final byte UNKNOWN = 0, PLACED = 1, MISSING = 2, WRONG = 3, TURNED = 4, PARTIAL = 5;   // TURNED: el bloque es el bueno pero mira a otro lado (o está boca abajo, o sin colgar…); PARTIAL: le faltan piezas o datos (cable, panel, fachada, pantalla unida)
    private static final DirectionProperty[] FACINGS = { BlockStateProperties.HORIZONTAL_FACING, BlockStateProperties.FACING, BlockStateProperties.FACING_HOPPER };
    /** Además de hacia dónde mira, lo que dice cómo está puesto un bloque. El resto (forma de una escalera, luz, conexiones) lo calcula el juego. */
    private static final Property<?>[] ORIENT = { BlockStateProperties.AXIS, BlockStateProperties.HORIZONTAL_AXIS, BlockStateProperties.HALF, BlockStateProperties.HANGING,
        BlockStateProperties.SLAB_TYPE, BlockStateProperties.ROTATION_16, BlockStateProperties.ORIENTATION, BlockStateProperties.ATTACH_FACE };

    public static Projection active;
    /** Lo que hay en los cofres del gólem (lo rellena el mod del gólem, si está): se suma a lo que llevas encima. */
    public static Map<Item, Integer> extraStock = Map.of();
    public static int stockVersion;
    /** Pide al servidor el contenido de los cofres del gólem; null sin el mod del gólem. */
    public static Runnable stockRefresh;

    public final String id, title;
    public final List<Entry> entries;
    public final int sizeX, sizeY, sizeZ;
    public final Set<String> missingMods;
    public BlockPos anchor;
    public String dimension;
    public Rotation rotation = Rotation.NONE;
    public int layer = -1;                       // capa relativa (0 = la de abajo); −1 = todas
    public boolean visible = true;
    public Block filter;                         // solo este bloque (desde la lista de materiales); null = todos
    public int version;                          // sube con cada cambio de ancla, giro, capa o filtro: las mallas se rehacen

    public final byte[] status;
    public int placed, wrong, turned, partial, total, layerPlaced, layerTotal;
    public int nextIndex = -1;
    public BlockPos nextPos;
    /** Secciones (16³ del mundo) con algún bloque que cambió de estado desde la última comparación. */
    public final LongOpenHashSet dirty = new LongOpenHashSet();
    private BlockState[] rotated, display;
    private CompoundTag[] rotatedNbt;
    private int scans;

    private Projection(String id, String title, List<Entry> entries, int sx, int sy, int sz, Set<String> missingMods) {
        this.id = id; this.title = title; this.entries = entries; this.sizeX = sx; this.sizeY = sy; this.sizeZ = sz; this.missingMods = missingMods;
        this.status = new byte[entries.size()];
        setRotation(Rotation.NONE);
    }

    /** Lee el .nbt de estructura que exporta BuildGolem. Los bloques de mods que no tienes quedan como aire y se avisan. */
    public static Projection fromNbt(String id, String title, byte[] data) throws IOException {
        CompoundTag tag = NbtIo.readCompressed(new ByteArrayInputStream(data), NbtAccounter.create(64L << 20));
        HolderGetter<Block> blocks = BuiltInRegistries.BLOCK.asLookup();
        ListTag palette = tag.getList("palette", Tag.TAG_COMPOUND);
        List<BlockState> states = new ArrayList<>();
        List<String> names = new ArrayList<>();
        Set<String> missing = new LinkedHashSet<>();
        for (int i = 0; i < palette.size(); i++) {
            CompoundTag p = palette.getCompound(i);
            String name = p.getString("Name");
            BlockState s = NbtUtils.readBlockState(blocks, p);
            if (s.isAir() && !name.endsWith(":air")) missing.add(name.contains(":") ? name.substring(0, name.indexOf(':')) : name);
            states.add(s); names.add(name);
        }
        ListTag list = tag.getList("blocks", Tag.TAG_COMPOUND);
        List<Entry> entries = new ArrayList<>(list.size());
        for (int i = 0; i < list.size(); i++) {
            CompoundTag b = list.getCompound(i);
            ListTag pos = b.getList("pos", Tag.TAG_INT);
            int st = b.getInt("state");
            if (st < 0 || st >= states.size() || states.get(st).isAir()) continue;
            CompoundTag nbt = b.contains("nbt", Tag.TAG_COMPOUND) ? b.getCompound("nbt").copy() : null;
            if (nbt != null) { nbt.remove("id"); if (nbt.isEmpty()) nbt = null; }
            entries.add(new Entry(new BlockPos(pos.getInt(0), pos.getInt(1), pos.getInt(2)), states.get(st), names.get(st), nbt));
        }
        entries.sort(Comparator.comparingInt((Entry e) -> e.rel().getY()).thenComparingInt(e -> e.rel().getZ()).thenComparingInt(e -> e.rel().getX()));
        ListTag size = tag.getList("size", Tag.TAG_INT);
        return new Projection(id, title, entries, size.getInt(0), size.getInt(1), size.getInt(2), missing);
    }

    public void setRotation(Rotation r) {
        rotation = r;
        rotated = new BlockState[entries.size()];
        display = new BlockState[rotated.length];
        rotatedNbt = new CompoundTag[rotated.length];
        for (int i = 0; i < rotated.length; i++) {
            Entry e = entries.get(i);
            rotated[i] = e.state().rotate(r);
            rotatedNbt[i] = e.nbt() == null ? null : rotateNbt(e.nbt(), r);
            display[i] = bus(i) ? displayFor(rotatedNbt[i]) : rotated[i];
        }
        changed();
    }

    private static String cap(String s) { return Character.toUpperCase(s.charAt(0)) + s.substring(1); }

    /** Gira las piezas de un cable: las claves son las caras ("north", "facadeNorth") y las fachadas llevan un bloque que también gira. */
    static CompoundTag rotateNbt(CompoundTag in, Rotation r) {
        CompoundTag out = new CompoundTag();
        for (String k : in.getAllKeys()) {
            boolean facade = k.startsWith("facade") && k.length() > 6;
            Direction d = Direction.byName(facade ? k.substring(6).toLowerCase(java.util.Locale.ROOT) : k);
            Tag v = in.get(k).copy();
            if (d == null) { out.put(k, v); continue; }
            String side = r.rotate(d).getName();
            if (facade && v instanceof CompoundTag c) {
                BlockState fs = NbtUtils.readBlockState(BuiltInRegistries.BLOCK.asLookup(), c);
                if (!fs.isAir()) v = NbtUtils.writeBlockState(fs.rotate(r));
            }
            out.put(facade ? "facade" + cap(side) : side, v);
        }
        return out;
    }

    /** Qué se enseña en el holograma por un cable: el bloque de su fachada o, sin ella, cristal del color del cable. */
    private static BlockState displayFor(CompoundTag nbt) {
        for (String k : nbt.getAllKeys()) if (k.startsWith("facade")) {
            BlockState fs = NbtUtils.readBlockState(BuiltInRegistries.BLOCK.asLookup(), nbt.getCompound(k));
            if (!fs.isAir() && fs.getRenderShape() == RenderShape.MODEL) return fs;
        }
        String cable = nbt.getCompound("cable").getString("id");
        String color = cable.substring(cable.indexOf(':') + 1).replaceAll("_(glass|covered|smart|dense).*$", "");
        DyeColor dye = DyeColor.byName(color, DyeColor.PURPLE);
        return BuiltInRegistries.BLOCK.get(ResourceLocation.withDefaultNamespace(dye.getName() + "_stained_glass")).defaultBlockState();
    }

    public static Item item(String id) {
        ResourceLocation rl = ResourceLocation.tryParse(id);
        return rl == null ? Items.AIR : BuiltInRegistries.ITEM.get(rl);
    }

    /** El item de una clave de las piezas: la fachada es siempre el item de fachada; el resto, su id. */
    public static Item partItem(CompoundTag nbt, String key) {
        return key.startsWith("facade") ? item("ae2:facade") : item(nbt.getCompound(key).getString("id"));
    }

    /** Algo de la colocación cambió: hay que volver a comparar y a dibujar todo. */
    public void changed() { version++; fresh = true; java.util.Arrays.fill(status, UNKNOWN); }

    /** Hay que comparar con el mundo cuanto antes (acaba de cambiar algo). */
    public boolean fresh = true;

    public BlockState want(int i) { return rotated[i]; }

    /** Datos del bloque ya girados: piezas de un cable de AE2 o datos propios (una pantalla de CC unida a sus vecinas); null en un bloque normal. */
    public CompoundTag nbt(int i) { return rotatedNbt[i]; }

    /** ¿Es un cable de AE2 (sus datos son piezas por cara)? Si no, sus datos son del propio bloque. */
    public boolean bus(int i) { return rotatedNbt[i] != null && rotatedNbt[i].contains("cable"); }

    /** Lo que se dibuja en el holograma. */
    public BlockState show(int i) { return display[i]; }

    /** El item con el que se pone a mano: el bloque o, en un cable, el propio cable. */
    public Item itemFor(int i) {
        return bus(i) ? item(rotatedNbt[i].getCompound("cable").getString("id")) : rotated[i].getBlock().asItem();
    }

    public Component label(int i) {
        Item it = itemFor(i);
        return it == Items.AIR ? rotated[i].getBlock().getName() : it.getDescription();
    }

    /**
     * Lo que le falta en el mundo a un bloque con datos; todo si el bloque no está. Vacío = completo.
     * En un cable solo cuentan las caras libres: una cara con otra pieza se deja como está (cambiarla destruiría la que hay).
     * En otro bloque (una pantalla de CC) cuenta cada dato con otro valor.
     */
    public CompoundTag missingNbt(Level level, int i) {
        CompoundTag want = rotatedNbt[i], out = new CompoundTag();
        if (want == null) return out;
        BlockPos pos = world(i);
        if (!level.getBlockState(pos).is(rotated[i].getBlock())) return want;
        try {
            BlockEntity be = level.getBlockEntity(pos);
            if (be == null) return out;
            CompoundTag have = be.saveWithoutMetadata(level.registryAccess());
            if (!bus(i)) { for (String k : want.getAllKeys()) if (!want.get(k).equals(have.get(k))) out.put(k, want.get(k).copy()); return out; }
            // sin nada dentro: el cliente aún no recibió los datos del cable, no se puede saber; con piezas pero sin cable, el cable falta
            if (!have.contains("cable") && have.getAllKeys().stream().noneMatch(k -> k.startsWith("facade") || Direction.byName(k) != null)) return out;
            for (String k : want.getAllKeys()) if (!have.contains(k)) out.put(k, want.get(k).copy());
        } catch (RuntimeException ex) { return new CompoundTag(); }
        return out;
    }

    public BlockPos world(int i) { return anchor.offset(entries.get(i).rel().rotate(rotation)); }

    public int y(int i) { return entries.get(i).rel().getY(); }

    /** Tamaño en el mundo con el giro aplicado (x y z). */
    public BlockPos rotatedSize() { return rotation == Rotation.CLOCKWISE_90 || rotation == Rotation.COUNTERCLOCKWISE_90 ? new BlockPos(sizeZ, sizeY, sizeX) : new BlockPos(sizeX, sizeY, sizeZ); }

    /** ¿Entra en lo que se enseña ahora (capa y filtro)? */
    public boolean shown(int i) { return (layer < 0 || y(i) == layer) && (filter == null || rotated[i].is(filter)); }

    public boolean ghost(int i) { return status[i] == MISSING && shown(i); }

    public boolean done(int i) { return status[i] == PLACED || status[i] == TURNED; }

    public static DirectionProperty facingProp(BlockState s) {
        for (DirectionProperty p : FACINGS) if (s.hasProperty(p)) return p;
        return null;
    }

    public static Direction facing(BlockState s) { DirectionProperty p = facingProp(s); return p == null ? null : s.getValue(p); }

    static byte classify(BlockState world, BlockState want) {
        if (world.is(want.getBlock())) {
            DirectionProperty p = facingProp(want);
            if (p != null && world.hasProperty(p) && world.getValue(p) != want.getValue(p)) return TURNED;
            for (Property<?> o : ORIENT) if (want.hasProperty(o) && world.hasProperty(o) && !world.getValue(o).equals(want.getValue(o))) return TURNED;
            return PLACED;
        }
        return !world.isAir() && !world.canBeReplaced() ? WRONG : MISSING;
    }

    /** Compara con el mundo (solo chunks cargados), marca las secciones que cambiaron y busca el siguiente bloque que falta. */
    public void scan(Level level, BlockPos player) {
        int p = 0, w = 0, t = 0, pa = 0, lp = 0, lt = 0;
        boolean nbtRound = fresh || ++scans % 8 == 0;                 // leer las piezas de cada cable es caro: no en todas las pasadas
        double best = Double.MAX_VALUE;
        nextIndex = -1; nextPos = null;
        BlockPos.MutableBlockPos m = new BlockPos.MutableBlockPos();
        for (int i = 0; i < entries.size(); i++) {
            BlockPos rel = entries.get(i).rel().rotate(rotation);
            m.set(anchor.getX() + rel.getX(), anchor.getY() + rel.getY(), anchor.getZ() + rel.getZ());
            if (!level.isLoaded(m)) continue;
            BlockState here = level.getBlockState(m);
            byte s = classify(here, rotated[i]);
            if (s == PLACED && rotatedNbt[i] != null)                // una pantalla de CC también tiene que tener sus bordes unidos (estado entero)
                s = !nbtRound && (status[i] == PLACED || status[i] == PARTIAL) ? status[i]
                    : missingNbt(level, i).isEmpty() && (bus(i) || here.equals(rotated[i])) ? PLACED : PARTIAL;
            if (s != status[i]) { status[i] = s; dirty.add(SectionPos.asLong(m.getX() >> 4, m.getY() >> 4, m.getZ() >> 4)); }
            if (s == PLACED) p++; else if (s == WRONG) w++; else if (s == TURNED) t++; else if (s == PARTIAL) pa++;
            boolean inLayer = layer >= 0 && y(i) == layer;
            if (inLayer) { lt++; if (s == PLACED) lp++; }
            if (s == MISSING && shown(i)) {
                double d = m.distSqr(player);
                if (d < best) { best = d; nextIndex = i; nextPos = m.immutable(); }
            }
        }
        placed = p; wrong = w; turned = t; partial = pa; total = entries.size(); layerPlaced = lp; layerTotal = lt;
        fresh = false;
    }

    public boolean layerDone() { return layer >= 0 && layerTotal > 0 && layerPlaced == layerTotal; }

    private static int have(Inventory inv, Item item) {
        if (item == Items.AIR) return 0;
        int have = extraStock.getOrDefault(item, 0);
        for (int s = 0; s < inv.getContainerSize(); s++) if (inv.getItem(s).is(item)) have += inv.getItem(s).getCount();
        return have;
    }

    /** Lo que falta por poner, agrupado por bloque (o por pieza, en los cables), contra lo que llevas y lo que hay en los cofres del gólem. */
    public List<Material> materials(Inventory inv) {
        Map<Block, int[]> need = new LinkedHashMap<>();
        Map<Item, int[]> parts = new LinkedHashMap<>();
        Level level = Minecraft.getInstance().level;
        for (int i = 0; i < entries.size(); i++) {
            if (done(i)) continue;
            CompoundTag nbt = rotatedNbt[i];
            if (!bus(i)) { if (status[i] != PARTIAL) need.computeIfAbsent(rotated[i].getBlock(), k -> new int[1])[0]++; continue; }
            if (status[i] == PARTIAL && level != null) nbt = missingNbt(level, i);
            for (String k : nbt.getAllKeys()) { Item it = partItem(nbt, k); if (it != Items.AIR) parts.computeIfAbsent(it, x -> new int[1])[0]++; }
        }
        List<Material> out = new ArrayList<>();
        for (var en : need.entrySet()) {
            Item item = en.getKey().asItem();
            out.add(new Material(en.getKey().getName().getString(), item, en.getKey(), en.getValue()[0], have(inv, item)));
        }
        for (var en : parts.entrySet()) out.add(new Material(en.getKey().getDescription().getString(), en.getKey(), null, en.getValue()[0], have(inv, en.getKey())));
        out.sort(Comparator.comparingInt(Material::missing).reversed().thenComparing(Material::name));
        return out;
    }

    // ── guardar y recuperar la proyección por mundo, para seguir construyendo otro día ──
    private static Path file() { return FMLPaths.CONFIGDIR.get().resolve("buildgolem_link-projection.json"); }

    public static String worldKey() {
        Minecraft mc = Minecraft.getInstance();
        if (mc.getSingleplayerServer() != null) return "sp:" + mc.getSingleplayerServer().getWorldData().getLevelName();
        return mc.getCurrentServer() != null ? "mp:" + mc.getCurrentServer().ip : "?";
    }

    public void save() {
        if (anchor == null) return;
        JsonObject j = new JsonObject();
        j.addProperty("id", id); j.addProperty("title", title); j.addProperty("world", worldKey()); j.addProperty("dimension", dimension);
        j.addProperty("x", anchor.getX()); j.addProperty("y", anchor.getY()); j.addProperty("z", anchor.getZ());
        j.addProperty("rotation", rotation.name()); j.addProperty("layer", layer);
        try { Files.writeString(file(), j.toString(), StandardCharsets.UTF_8); } catch (IOException ex) { BuildGolemLink.LOG.warn("No se pudo guardar la proyección", ex); }
    }

    public static void forget() { try { Files.deleteIfExists(file()); } catch (IOException ignored) { /* nada que borrar */ } }

    public static JsonObject saved() {
        try {
            if (!Files.exists(file())) return null;
            JsonObject j = JsonParser.parseString(Files.readString(file(), StandardCharsets.UTF_8)).getAsJsonObject();
            return worldKey().equals(j.get("world").getAsString()) ? j : null;
        } catch (Exception ex) { return null; }
    }

    public void restore(JsonObject j) {
        anchor = new BlockPos(j.get("x").getAsInt(), j.get("y").getAsInt(), j.get("z").getAsInt());
        dimension = j.has("dimension") && !j.get("dimension").isJsonNull() ? j.get("dimension").getAsString() : null;
        setRotation(Rotation.valueOf(j.get("rotation").getAsString()));
        layer = j.get("layer").getAsInt();
    }
}
