// SPDX-License-Identifier: MIT
package io.dualix.buildgolem;

import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderGetter;
import net.minecraft.core.HolderLookup;
import net.minecraft.core.registries.Registries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.NbtUtils;
import net.minecraft.nbt.Tag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BedPart;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.DoubleBlockHalf;
import net.minecraft.world.level.block.state.properties.Property;
import net.minecraft.world.level.block.state.properties.SlabType;
import net.minecraft.world.level.saveddata.SavedData;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Un plano guardado en el mundo (data/buildgolem_plan_&lt;id&gt;.dat): posiciones absolutas y estado de cada bloque,
 * de abajo arriba. Lo crea el servidor al recibir la copia del holograma y lo leen los gólems que llevan ese plano.
 */
public final class Plan extends SavedData {
    /** Solo se copian las propiedades de forma y orientación: así un plano no puede pedir colmenas llenas, cultivos maduros ni agua gratis. */
    private static final Set<String> KEEP = Set.of("facing", "axis", "half", "type", "hinge", "shape", "rotation", "face", "attachment", "part",
        "orientation", "north", "east", "south", "west", "up", "down", "mode", "delay", "tilt");
    private static final Factory<Plan> FACTORY = new Factory<>(Plan::new, Plan::load);

    public String title = "", dimension = "";
    public BlockPos anchor = BlockPos.ZERO, size = BlockPos.ZERO;
    public long[] pos = new long[0];
    public int[] idx = new int[0];
    public final List<BlockState> palette = new ArrayList<>();

    public int count() { return pos.length; }

    public BlockPos pos(int i) { return BlockPos.of(pos[i]); }

    public BlockState state(int i) { return palette.get(idx[i]); }

    public static String key(UUID id) { return "buildgolem_plan_" + id; }

    /** El plano con ese id, o null si no existe en este mundo (p. ej. un plano traído de otro mundo). */
    public static Plan get(MinecraftServer server, UUID id) {
        Plan p = server.overworld().getDataStorage().computeIfAbsent(FACTORY, key(id));
        return p.pos.length == 0 ? null : p;
    }

    static void put(MinecraftServer server, UUID id, Plan plan) {
        server.overworld().getDataStorage().set(key(id), plan);
        plan.setDirty();
    }

    public static BlockState sanitize(BlockState s) {
        BlockState out = s.getBlock().defaultBlockState();
        for (Property<?> p : s.getProperties()) if (KEEP.contains(p.getName())) out = copy(out, s, p);
        if (out.hasProperty(BlockStateProperties.WATERLOGGED)) out = out.setValue(BlockStateProperties.WATERLOGGED, false);
        return out;
    }

    private static <T extends Comparable<T>> BlockState copy(BlockState to, BlockState from, Property<T> p) { return to.setValue(p, from.getValue(p)); }

    /** La otra mitad (puerta de arriba, cabecero de cama) la pone el objeto al colocar la de abajo: no gasta nada. */
    public static boolean free(BlockState s) {
        return s.hasProperty(BlockStateProperties.DOUBLE_BLOCK_HALF) && s.getValue(BlockStateProperties.DOUBLE_BLOCK_HALF) == DoubleBlockHalf.UPPER
            || s.hasProperty(BlockStateProperties.BED_PART) && s.getValue(BlockStateProperties.BED_PART) == BedPart.HEAD;
    }

    /** Cuántos objetos cuesta: una losa doble son dos. */
    public static int cost(BlockState s) {
        if (free(s)) return 0;
        return s.hasProperty(BlockStateProperties.SLAB_TYPE) && s.getValue(BlockStateProperties.SLAB_TYPE) == SlabType.DOUBLE ? 2 : 1;
    }

    private static Plan load(CompoundTag t, HolderLookup.Provider lookup) {
        Plan p = new Plan();
        p.title = t.getString("title");
        p.dimension = t.getString("dimension");
        p.anchor = BlockPos.of(t.getLong("anchor"));
        p.size = BlockPos.of(t.getLong("size"));
        HolderGetter<Block> blocks = lookup.lookupOrThrow(Registries.BLOCK);
        ListTag pal = t.getList("palette", Tag.TAG_COMPOUND);
        for (int i = 0; i < pal.size(); i++) p.palette.add(NbtUtils.readBlockState(blocks, pal.getCompound(i)));
        p.pos = t.getLongArray("pos");
        p.idx = t.getIntArray("idx");
        if (p.idx.length != p.pos.length) { p.pos = new long[0]; p.idx = new int[0]; }
        for (int v : p.idx) if (v < 0 || v >= p.palette.size()) { p.pos = new long[0]; p.idx = new int[0]; break; }
        return p;
    }

    @Override
    public CompoundTag save(CompoundTag t, HolderLookup.Provider lookup) {
        t.putString("title", title);
        t.putString("dimension", dimension);
        t.putLong("anchor", anchor.asLong());
        t.putLong("size", size.asLong());
        ListTag pal = new ListTag();
        for (BlockState s : palette) pal.add(NbtUtils.writeBlockState(s));
        t.put("palette", pal);
        t.putLongArray("pos", pos);
        t.putIntArray("idx", idx);
        return t;
    }
}
