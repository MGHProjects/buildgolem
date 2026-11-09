// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.blaze3d.vertex.BufferBuilder;
import com.mojang.blaze3d.vertex.ByteBufferBuilder;
import com.mojang.blaze3d.vertex.DefaultVertexFormat;
import com.mojang.blaze3d.vertex.MeshData;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexBuffer;
import com.mojang.blaze3d.vertex.VertexConsumer;
import com.mojang.blaze3d.vertex.VertexFormat;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import it.unimi.dsi.fastutil.longs.Long2ObjectOpenHashMap;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.block.BlockRenderDispatcher;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.SectionPos;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.BlockAndTintGetter;
import net.minecraft.world.level.ColorResolver;
import net.minecraft.world.level.block.RenderShape;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.lighting.LevelLightEngine;
import net.minecraft.world.level.material.FluidState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.client.event.RenderLevelStageEvent;
import net.neoforged.neoforge.client.model.data.ModelData;
import org.joml.Matrix4f;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * El holograma "horneado" en la tarjeta gráfica, por secciones de 16³ como hace Minecraft con el mundo:
 * cada sección se tesela una vez (con las caras ocultas quitadas, contra otros fantasmas y contra el mundo real)
 * y se rehace solo cuando cambia algún bloque suyo. Dibujar miles de bloques cuesta lo mismo que dibujar unos pocos.
 */
final class GhostMesh {
    private static final class Section {
        final long key;
        final BlockPos origin;
        final AABB box;
        final IntArrayList idx = new IntArrayList();
        VertexBuffer vbo;
        boolean dirty = true;
        Section(long key) {
            this.key = key;
            origin = new BlockPos(SectionPos.x(key) << 4, SectionPos.y(key) << 4, SectionPos.z(key) << 4);
            box = new AABB(origin.getX(), origin.getY(), origin.getZ(), origin.getX() + 16, origin.getY() + 16, origin.getZ() + 16);
        }
        void close() { if (vbo != null) { vbo.close(); vbo = null; } }
    }

    private static final Long2ObjectOpenHashMap<Section> SECTIONS = new Long2ObjectOpenHashMap<>();
    private static final Long2ObjectOpenHashMap<BlockState> GHOSTS = new Long2ObjectOpenHashMap<>();
    private static Projection built;
    private static int builtVersion = -1;
    private static boolean failedOnce;

    /** El mundo que ve el teselador: los fantasmas donde faltan bloques y el mundo real en el resto (para quitar caras tapadas). */
    private record GhostLevel(ClientLevel level) implements BlockAndTintGetter {
        public float getShade(Direction d, boolean shade) { return level.getShade(d, shade); }
        public LevelLightEngine getLightEngine() { return level.getLightEngine(); }
        public int getBlockTint(BlockPos pos, ColorResolver r) { return level.getBlockTint(pos, r); }
        public BlockEntity getBlockEntity(BlockPos pos) { return null; }
        public BlockState getBlockState(BlockPos pos) { BlockState g = GHOSTS.get(pos.asLong()); return g != null ? g : level.getBlockState(pos); }
        public FluidState getFluidState(BlockPos pos) { return getBlockState(pos).getFluidState(); }
        public int getHeight() { return level.getHeight(); }
        public int getMinBuildHeight() { return level.getMinBuildHeight(); }
    }

    /** Translúcido y siempre iluminado: se ve igual de día, de noche y dentro de una cueva. */
    private record Tint(VertexConsumer to, int alpha) implements VertexConsumer {
        public VertexConsumer addVertex(float x, float y, float z) { to.addVertex(x, y, z); return this; }
        public VertexConsumer setColor(int r, int g, int b, int a) { to.setColor(r, g, b, a * alpha / 255); return this; }
        public VertexConsumer setUv(float u, float v) { to.setUv(u, v); return this; }
        public VertexConsumer setUv1(int u, int v) { to.setUv1(u, v); return this; }
        public VertexConsumer setUv2(int u, int v) { to.setUv2(240, 240); return this; }
        public VertexConsumer setNormal(float x, float y, float z) { to.setNormal(x, y, z); return this; }
    }

    static void clear() {
        for (Section s : SECTIONS.values()) s.close();
        SECTIONS.clear(); GHOSTS.clear(); built = null; builtVersion = -1;
    }

    /** Pone al día las secciones con la proyección (todo si cambió el ancla, el giro, la capa o el filtro; si no, solo lo marcado). */
    private static void sync(Projection p) {
        if (p != built || p.version != builtVersion) {
            clear();
            built = p; builtVersion = p.version;
            for (int i = 0; i < p.entries.size(); i++) {
                if (!p.shown(i)) continue;
                BlockPos w = p.world(i);
                SECTIONS.computeIfAbsent(SectionPos.asLong(w.getX() >> 4, w.getY() >> 4, w.getZ() >> 4), Section::new).idx.add(i);
                if (p.ghost(i)) GHOSTS.put(w.asLong(), p.want(i));   // si ya se comparó con el mundo; si no, llegan con la comparación
            }
            p.dirty.clear();
            return;
        }
        if (p.dirty.isEmpty()) return;
        // los fantasmas de una sección tapan caras de la vecina: se rehacen también las de alrededor
        for (long k : p.dirty) for (int dx = -1; dx <= 1; dx++) for (int dy = -1; dy <= 1; dy++) for (int dz = -1; dz <= 1; dz++) {
            Section s = SECTIONS.get(SectionPos.offset(k, dx, dy, dz));
            if (s != null) s.dirty = true;
        }
        for (long k : p.dirty) {
            Section s = SECTIONS.get(k);
            if (s == null) continue;
            for (int i : s.idx) {
                long pos = p.world(i).asLong();
                if (p.ghost(i)) GHOSTS.put(pos, p.want(i)); else GHOSTS.remove(pos);
            }
        }
        p.dirty.clear();
    }

    private static void rebuild(Section s, Projection p, ClientLevel level) {
        s.close(); s.dirty = false;
        Minecraft mc = Minecraft.getInstance();
        BlockRenderDispatcher br = mc.getBlockRenderer();
        GhostLevel world = new GhostLevel(level);
        RandomSource rand = RandomSource.create();
        PoseStack ps = new PoseStack();
        int alpha = (int) (LinkConfig.GHOST_ALPHA.get() * 2.55);
        try (ByteBufferBuilder bytes = new ByteBufferBuilder(Math.max(8192, s.idx.size() * 1536))) {
            BufferBuilder bb = new BufferBuilder(bytes, VertexFormat.Mode.QUADS, DefaultVertexFormat.BLOCK);
            VertexConsumer vc = new Tint(bb, alpha);
            for (int i : s.idx) {
                if (!p.ghost(i)) continue;
                BlockState st = p.want(i);
                if (st.getRenderShape() != RenderShape.MODEL) continue;
                BlockPos pos = p.world(i);
                ps.pushPose();
                ps.translate(pos.getX() - s.origin.getX(), pos.getY() - s.origin.getY(), pos.getZ() - s.origin.getZ());
                try {
                    br.getModelRenderer().tesselateBlock(world, br.getBlockModel(st), st, pos, ps, vc, true, rand, st.getSeed(pos), OverlayTexture.NO_OVERLAY, ModelData.EMPTY, null);
                } catch (RuntimeException ex) {
                    if (!failedOnce) { failedOnce = true; BuildGolemLink.LOG.warn("No se pudo dibujar {} en el holograma", st, ex); }
                }
                ps.popPose();
            }
            MeshData mesh = bb.build();
            if (mesh != null) {
                s.vbo = new VertexBuffer(VertexBuffer.Usage.STATIC);
                s.vbo.bind();
                s.vbo.upload(mesh);
                VertexBuffer.unbind();
            }
        }
    }

    /** Rehace como mucho unas pocas secciones por fotograma (las más cercanas primero) y dibuja todas las visibles. */
    static void render(RenderLevelStageEvent e, Projection p, ClientLevel level) {
        sync(p);
        Vec3 cam = e.getCamera().getPosition();
        List<Section> todo = new ArrayList<>();
        for (Section s : SECTIONS.values()) if (s.dirty) todo.add(s);
        if (!todo.isEmpty()) {
            todo.sort(Comparator.comparingDouble(s -> s.box.getCenter().distanceToSqr(cam)));
            long until = System.nanoTime() + 4_000_000L;      // como mucho ~4 ms por fotograma en rehacer
            for (Section s : todo) { rebuild(s, p, level); if (System.nanoTime() > until) break; }
        }
        double range = LinkConfig.GHOST_RANGE.get() + 16.0, r2 = range * range;
        RenderType rt = RenderType.translucent();
        rt.setupRenderState();
        var shader = RenderSystem.getShader();
        // como Minecraft con sus secciones: la vista es la de la cámara y el desplazamiento de cada sección va en ChunkOffset
        Matrix4f mv = new Matrix4f(e.getModelViewMatrix());
        for (Section s : SECTIONS.values()) {
            if (s.vbo == null || s.box.getCenter().distanceToSqr(cam) > r2 || !e.getFrustum().isVisible(s.box)) continue;
            if (shader.CHUNK_OFFSET != null) shader.CHUNK_OFFSET.set((float) (s.origin.getX() - cam.x), (float) (s.origin.getY() - cam.y), (float) (s.origin.getZ() - cam.z));
            s.vbo.bind();
            s.vbo.drawWithShader(mv, e.getProjectionMatrix(), shader);
        }
        if (shader.CHUNK_OFFSET != null) shader.CHUNK_OFFSET.set(0f, 0f, 0f);
        VertexBuffer.unbind();
        rt.clearRenderState();
    }

    private GhostMesh() {}
}
