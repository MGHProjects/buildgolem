// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.LevelRenderer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.core.BlockPos;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.client.event.RenderLevelStageEvent;

/**
 * Dibuja el holograma: los bloques que faltan (mallas horneadas por sección, ver GhostMesh) y, encima, contornos solo
 * para lo que importa: el marco del diseño, el siguiente bloque, los que están mal (rojo) o girados (amarillo)
 * y, si se construye por capas, los huecos de la capa actual.
 */
final class Ghost {
    private static final int MAX_LAYER_BOXES = 3000;

    static void render(RenderLevelStageEvent e) {
        if (e.getStage() != RenderLevelStageEvent.Stage.AFTER_PARTICLES) return;   // la cámara ya está en la matriz de vista
        Projection p = Projection.active;
        Minecraft mc = Minecraft.getInstance();
        if (p == null || !p.visible || p.anchor == null || mc.level == null || mc.player == null) { if (p == null) GhostMesh.clear(); return; }
        if (p.dimension != null && !p.dimension.equals(mc.level.dimension().location().toString())) return;

        GhostMesh.render(e, p, mc.level);

        Vec3 cam = e.getCamera().getPosition();
        PoseStack ps = e.getPoseStack();
        ps.pushPose();
        ps.translate(-cam.x, -cam.y, -cam.z);
        MultiBufferSource.BufferSource buf = mc.renderBuffers().bufferSource();
        VertexConsumer lines = buf.getBuffer(RenderType.lines());
        // marco del diseño: dónde empieza y dónde acaba, con la esquina de anclaje marcada
        BlockPos sz = p.rotatedSize(), lo = p.anchor.offset(Math.min(0, rotSign(p).getX() * (sz.getX() - 1)), 0, Math.min(0, rotSign(p).getZ() * (sz.getZ() - 1)));
        LevelRenderer.renderLineBox(ps, lines, lo.getX(), lo.getY(), lo.getZ(), lo.getX() + sz.getX(), lo.getY() + sz.getY(), lo.getZ() + sz.getZ(), .56f, .82f, 1f, .55f);
        box(ps, lines, p.anchor, 1f, .76f, .1f, .9f);
        if (p.layer >= 0) {
            int y = p.anchor.getY() + p.layer;
            LevelRenderer.renderLineBox(ps, lines, lo.getX(), y, lo.getZ(), lo.getX() + sz.getX(), y + 1, lo.getZ() + sz.getZ(), 1f, .76f, .1f, .7f);
        }
        int range = LinkConfig.GHOST_RANGE.get(), r2 = range * range, layerBoxes = 0;
        BlockPos me = mc.player.blockPosition();
        for (int i = 0; i < p.entries.size(); i++) {
            byte s = p.status[i];
            if (s == Projection.WRONG || s == Projection.TURNED) {
                BlockPos pos = p.world(i);
                if (pos.distSqr(me) > r2) continue;
                if (s == Projection.WRONG) box(ps, lines, pos, 1f, .32f, .25f, 1f); else box(ps, lines, pos, 1f, .85f, .3f, 1f);
            } else if (s == Projection.MISSING && p.layer >= 0 && p.shown(i) && layerBoxes < MAX_LAYER_BOXES) {
                BlockPos pos = p.world(i);
                if (pos.distSqr(me) > r2) continue;
                layerBoxes++;
                box(ps, lines, pos, .56f, .82f, 1f, .6f);
            }
        }
        if (p.nextPos != null) box(ps, lines, p.nextPos, 1f, .76f, .1f, 1f);
        buf.endBatch(RenderType.lines());
        ps.popPose();
    }

    /** Hacia dónde crece el diseño en x y z desde el ancla, según el giro. */
    private static BlockPos rotSign(Projection p) { return new BlockPos(1, 1, 1).rotate(p.rotation); }

    private static void box(PoseStack ps, VertexConsumer lines, BlockPos p, float r, float g, float b, float a) {
        LevelRenderer.renderLineBox(ps, lines, p.getX() + .002, p.getY() + .002, p.getZ() + .002, p.getX() + .998, p.getY() + .998, p.getZ() + .998, r, g, b, a);
    }

    private Ghost() {}
}
