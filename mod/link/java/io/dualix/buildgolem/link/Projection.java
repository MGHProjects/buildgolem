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
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Rotation;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.DirectionProperty;
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
    public record Entry(BlockPos rel, BlockState state, String name) {}
    public record Material(String name, Item item, Block block, int need, int have) {
        public int missing() { return Math.max(0, need - have); }
    }
    public static final byte UNKNOWN = 0, PLACED = 1, MISSING = 2, WRONG = 3, TURNED = 4;   // TURNED: el bloque es el bueno pero mira a otro lado
    private static final DirectionProperty[] FACINGS = { BlockStateProperties.HORIZONTAL_FACING, BlockStateProperties.FACING, BlockStateProperties.FACING_HOPPER };

    public static Projection active;

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
    public int placed, wrong, turned, total, layerPlaced, layerTotal;
    public int nextIndex = -1;
    public BlockPos nextPos;
    /** Secciones (16³ del mundo) con algún bloque que cambió de estado desde la última comparación. */
    public final LongOpenHashSet dirty = new LongOpenHashSet();
    private BlockState[] rotated;

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
            entries.add(new Entry(new BlockPos(pos.getInt(0), pos.getInt(1), pos.getInt(2)), states.get(st), names.get(st)));
        }
        entries.sort(Comparator.comparingInt((Entry e) -> e.rel().getY()).thenComparingInt(e -> e.rel().getZ()).thenComparingInt(e -> e.rel().getX()));
        ListTag size = tag.getList("size", Tag.TAG_INT);
        return new Projection(id, title, entries, size.getInt(0), size.getInt(1), size.getInt(2), missing);
    }

    public void setRotation(Rotation r) {
        rotation = r;
        rotated = new BlockState[entries.size()];
        for (int i = 0; i < rotated.length; i++) rotated[i] = entries.get(i).state().rotate(r);
        changed();
    }

    /** Algo de la colocación cambió: hay que volver a comparar y a dibujar todo. */
    public void changed() { version++; fresh = true; java.util.Arrays.fill(status, UNKNOWN); }

    /** Hay que comparar con el mundo cuanto antes (acaba de cambiar algo). */
    public boolean fresh = true;

    public BlockState want(int i) { return rotated[i]; }

    public BlockPos world(int i) { return anchor.offset(entries.get(i).rel().rotate(rotation)); }

    public int y(int i) { return entries.get(i).rel().getY(); }

    /** Tamaño en el mundo con el giro aplicado (x y z). */
    public BlockPos rotatedSize() { return rotation == Rotation.CLOCKWISE_90 || rotation == Rotation.COUNTERCLOCKWISE_90 ? new BlockPos(sizeZ, sizeY, sizeX) : new BlockPos(sizeX, sizeY, sizeZ); }

    /** ¿Entra en lo que se enseña ahora (capa y filtro)? */
    public boolean shown(int i) { return (layer < 0 || y(i) == layer) && (filter == null || rotated[i].is(filter)); }

    public boolean ghost(int i) { return status[i] == MISSING && shown(i); }

    public static DirectionProperty facingProp(BlockState s) {
        for (DirectionProperty p : FACINGS) if (s.hasProperty(p)) return p;
        return null;
    }

    public static Direction facing(BlockState s) { DirectionProperty p = facingProp(s); return p == null ? null : s.getValue(p); }

    static byte classify(BlockState world, BlockState want) {
        if (world.is(want.getBlock())) {
            DirectionProperty p = facingProp(want);
            return p != null && world.hasProperty(p) && world.getValue(p) != want.getValue(p) ? TURNED : PLACED;
        }
        return !world.isAir() && !world.canBeReplaced() ? WRONG : MISSING;
    }

    /** Compara con el mundo (solo chunks cargados), marca las secciones que cambiaron y busca el siguiente bloque que falta. */
    public void scan(Level level, BlockPos player) {
        int p = 0, w = 0, t = 0, lp = 0, lt = 0;
        double best = Double.MAX_VALUE;
        nextIndex = -1; nextPos = null;
        BlockPos.MutableBlockPos m = new BlockPos.MutableBlockPos();
        for (int i = 0; i < entries.size(); i++) {
            BlockPos rel = entries.get(i).rel().rotate(rotation);
            m.set(anchor.getX() + rel.getX(), anchor.getY() + rel.getY(), anchor.getZ() + rel.getZ());
            if (!level.isLoaded(m)) continue;
            byte s = classify(level.getBlockState(m), rotated[i]);
            if (s != status[i]) { status[i] = s; dirty.add(SectionPos.asLong(m.getX() >> 4, m.getY() >> 4, m.getZ() >> 4)); }
            if (s == PLACED) p++; else if (s == WRONG) w++; else if (s == TURNED) t++;
            boolean inLayer = layer >= 0 && y(i) == layer;
            if (inLayer) { lt++; if (s == PLACED) lp++; }
            if (s == MISSING && shown(i)) {
                double d = m.distSqr(player);
                if (d < best) { best = d; nextIndex = i; nextPos = m.immutable(); }
            }
        }
        placed = p; wrong = w; turned = t; total = entries.size(); layerPlaced = lp; layerTotal = lt;
        fresh = false;
    }

    public boolean layerDone() { return layer >= 0 && layerTotal > 0 && layerPlaced == layerTotal; }

    /** Lo que falta por poner, agrupado por bloque, contra lo que llevas en el inventario. */
    public List<Material> materials(Inventory inv) {
        Map<Block, int[]> need = new LinkedHashMap<>();
        for (int i = 0; i < entries.size(); i++) if (status[i] != PLACED && status[i] != TURNED) need.computeIfAbsent(rotated[i].getBlock(), k -> new int[1])[0]++;
        List<Material> out = new ArrayList<>();
        for (var en : need.entrySet()) {
            Item item = en.getKey().asItem();
            int have = 0;
            if (item != Items.AIR) for (int s = 0; s < inv.getContainerSize(); s++) if (inv.getItem(s).is(item)) have += inv.getItem(s).getCount();
            out.add(new Material(en.getKey().getName().getString(), item, en.getKey(), en.getValue()[0], have));
        }
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
